-- DraBornGarage v0.8.6
-- Normal users stay in the customer shell, can choose a workshop for motor linking,
-- book appointments without an approved customer link, and enter QR/tracking codes manually.

alter table public.customer_claims
  alter column customer_id drop not null,
  alter column motorcycle_id drop not null;

alter table public.customer_claims
  add column if not exists submitted_brand text,
  add column if not exists submitted_model text;

create or replace function public.customer_request_workshop_motor_link(
  p_workshop_id uuid,
  p_plate text,
  p_brand text,
  p_model text,
  p_phone text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_plate text := public.normalize_plate(p_plate);
  claim_id uuid;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if not exists (select 1 from public.workshops where id = p_workshop_id and is_active) then
    raise exception 'İşletme bulunamadı veya aktif değil';
  end if;
  if length(normalized_plate) < 5 then raise exception 'Geçerli plaka girin'; end if;
  if length(trim(coalesce(p_brand, ''))) < 2 then raise exception 'Motosiklet markası gerekli'; end if;
  if length(trim(coalesce(p_model, ''))) < 1 then raise exception 'Motosiklet modeli gerekli'; end if;

  update public.profiles
  set account_mode = 'customer',
      customer_plate = normalized_plate,
      customer_motorcycle_brand = trim(p_brand),
      customer_motorcycle_model = trim(p_model),
      phone = coalesce(nullif(trim(p_phone), ''), phone),
      updated_at = now()
  where id = auth.uid();

  select cc.id into claim_id
  from public.customer_claims cc
  where cc.user_id = auth.uid()
    and cc.workshop_id = p_workshop_id
    and cc.status = 'pending'
    and cc.submitted_plate = normalized_plate
  order by cc.created_at desc
  limit 1;

  if claim_id is null then
    insert into public.customer_claims(
      user_id, workshop_id, customer_id, motorcycle_id, method, status,
      submitted_plate, submitted_phone, submitted_brand, submitted_model
    ) values (
      auth.uid(), p_workshop_id, null, null, 'mechanic_approval', 'pending',
      normalized_plate, nullif(public.normalize_phone(p_phone), ''), trim(p_brand), trim(p_model)
    ) returning id into claim_id;
  else
    update public.customer_claims
    set submitted_phone = nullif(public.normalize_phone(p_phone), ''),
        submitted_brand = trim(p_brand),
        submitted_model = trim(p_model),
        expires_at = now() + interval '30 days',
        updated_at = now()
    where id = claim_id;
  end if;

  return claim_id;
end;
$$;

create or replace function public.customer_get_claims()
returns table(
  id uuid,
  workshop_id uuid,
  workshop_name text,
  motorcycle_id uuid,
  brand text,
  model text,
  plate text,
  method text,
  status text,
  created_at timestamptz,
  reviewed_at timestamptz,
  review_note text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    cc.id,
    cc.workshop_id,
    w.name,
    cc.motorcycle_id,
    coalesce(m.brand, cc.submitted_brand, p.customer_motorcycle_brand, 'Motosiklet'),
    coalesce(m.model, cc.submitted_model, p.customer_motorcycle_model, ''),
    coalesce(m.plate, cc.submitted_plate, p.customer_plate),
    cc.method,
    case when cc.status = 'pending' and cc.expires_at < now() then 'expired' else cc.status end,
    cc.created_at,
    cc.reviewed_at,
    cc.review_note
  from public.customer_claims cc
  join public.workshops w on w.id = cc.workshop_id
  join public.profiles p on p.id = cc.user_id
  left join public.motorcycles m on m.id = cc.motorcycle_id
  where cc.user_id = auth.uid()
  order by cc.created_at desc;
$$;

create or replace function public.staff_get_customer_claims(p_workshop_id uuid)
returns table(
  id uuid,
  user_id uuid,
  claimant_name text,
  claimant_phone text,
  customer_id uuid,
  customer_name text,
  motorcycle_id uuid,
  brand text,
  model text,
  plate text,
  method text,
  status text,
  submitted_phone text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_workshop_owner(p_workshop_id) and not public.is_workshop_worker(p_workshop_id) then
    raise exception 'Eşleşme taleplerini görme yetkiniz yok';
  end if;
  return query
  select
    cc.id,
    cc.user_id,
    p.full_name,
    p.phone,
    cc.customer_id,
    coalesce(c.full_name, p.full_name),
    cc.motorcycle_id,
    coalesce(m.brand, cc.submitted_brand, p.customer_motorcycle_brand, 'Motosiklet'),
    coalesce(m.model, cc.submitted_model, p.customer_motorcycle_model, ''),
    coalesce(m.plate, cc.submitted_plate, p.customer_plate),
    cc.method,
    case when cc.status = 'pending' and cc.expires_at < now() then 'expired' else cc.status end,
    cc.submitted_phone,
    cc.created_at
  from public.customer_claims cc
  join public.profiles p on p.id = cc.user_id
  left join public.customers c on c.id = cc.customer_id
  left join public.motorcycles m on m.id = cc.motorcycle_id
  where cc.workshop_id = p_workshop_id
  order by (cc.status = 'pending') desc, cc.created_at desc;
end;
$$;

create or replace function public.staff_review_customer_claim(
  p_claim_id uuid,
  p_approve boolean,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.customer_claims%rowtype;
  profile_rec public.profiles%rowtype;
  target_customer_id uuid;
  target_motorcycle_id uuid;
  normalized_plate text;
begin
  select * into rec from public.customer_claims where id = p_claim_id for update;
  if rec.id is null then raise exception 'Eşleşme talebi bulunamadı'; end if;
  if not public.is_workshop_owner(rec.workshop_id) and not public.is_workshop_worker(rec.workshop_id) then
    raise exception 'Bu talebi onaylama yetkiniz yok';
  end if;
  if rec.status <> 'pending' then raise exception 'Bu talep daha önce sonuçlandırılmış'; end if;

  if p_approve then
    select * into profile_rec from public.profiles where id = rec.user_id;
    normalized_plate := public.normalize_plate(coalesce(rec.submitted_plate, profile_rec.customer_plate));

    target_customer_id := rec.customer_id;
    target_motorcycle_id := rec.motorcycle_id;

    if target_motorcycle_id is null then
      select m.id, m.customer_id into target_motorcycle_id, target_customer_id
      from public.motorcycles m
      where m.workshop_id = rec.workshop_id
        and public.normalize_plate(m.plate) = normalized_plate
      order by m.created_at desc
      limit 1;
    end if;

    if target_customer_id is null then
      select c.id into target_customer_id
      from public.customers c
      where c.workshop_id = rec.workshop_id
        and (
          c.created_by = rec.user_id
          or (profile_rec.phone is not null and public.normalize_phone(c.phone) = public.normalize_phone(profile_rec.phone))
        )
      order by c.created_at desc
      limit 1;
    end if;

    if target_customer_id is null then
      insert into public.customers(workshop_id, full_name, phone, note, created_by)
      values (rec.workshop_id, profile_rec.full_name, profile_rec.phone, 'Uygulama motor eşleştirme talebi', rec.user_id)
      returning id into target_customer_id;
    end if;

    if target_motorcycle_id is null then
      insert into public.motorcycles(workshop_id, customer_id, brand, model, plate, note, created_by)
      values (
        rec.workshop_id,
        target_customer_id,
        coalesce(nullif(trim(rec.submitted_brand), ''), profile_rec.customer_motorcycle_brand, 'Motosiklet'),
        coalesce(nullif(trim(rec.submitted_model), ''), profile_rec.customer_motorcycle_model, 'Model'),
        normalized_plate,
        'Uygulama üzerinden işletme eşleştirmesi',
        rec.user_id
      ) returning id into target_motorcycle_id;
    end if;

    update public.customer_claims
    set customer_id = target_customer_id,
        motorcycle_id = target_motorcycle_id,
        status = 'approved',
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        review_note = nullif(trim(p_note), ''),
        updated_at = now()
    where id = p_claim_id;

    perform public.approve_customer_link(rec.user_id, target_customer_id, rec.workshop_id, 'mechanic_approval', auth.uid());
  else
    update public.customer_claims
    set status = 'rejected',
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        review_note = nullif(trim(p_note), ''),
        updated_at = now()
    where id = p_claim_id;
  end if;

  return jsonb_build_object('status', case when p_approve then 'approved' else 'rejected' end);
end;
$$;

create or replace function public.customer_search_appointment_workshops(p_query text)
returns table(id uuid, name text, phone text, address text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  normalized_query text := trim(coalesce(p_query, ''));
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if char_length(normalized_query) < 2 then raise exception 'Arama için en az 2 karakter gerekli'; end if;

  return query
  select w.id, w.name, w.phone, w.address
  from public.workshops w
  where w.is_active
    and w.appointments_enabled
    and w.name ilike '%' || replace(replace(normalized_query, '%', ''), '_', '') || '%'
  order by
    case when lower(w.name) = lower(normalized_query) then 0
         when lower(w.name) like lower(normalized_query) || '%' then 1
         else 2 end,
    w.name
  limit 25;
end;
$$;

create or replace function public.customer_get_appointment_mechanics(p_workshop_id uuid)
returns table(mechanic_id uuid, full_name text, availability_status text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  return query
  select wm.user_id, p.full_name, wm.availability_status::text
  from public.workshop_members wm
  join public.profiles p on p.id = wm.user_id
  join public.workshops w on w.id = wm.workshop_id and w.is_active and w.appointments_enabled
  where wm.workshop_id = p_workshop_id
    and wm.is_active
    and wm.role in ('mechanic'::public.member_role, 'owner_mechanic'::public.member_role)
    and wm.availability_status <> 'off'
  order by p.full_name;
end;
$$;

create or replace function public.customer_create_open_appointment(
  p_workshop_id uuid,
  p_mechanic_id uuid,
  p_brand text,
  p_model text,
  p_plate text,
  p_service_title text,
  p_customer_note text,
  p_scheduled_start timestamptz,
  p_scheduled_end timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_rec public.profiles%rowtype;
  target_customer_id uuid;
  target_motorcycle_id uuid;
  new_id uuid;
  auto_confirm boolean;
  new_status text;
  normalized_plate text := public.normalize_plate(p_plate);
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if length(trim(coalesce(p_service_title, ''))) < 3 then raise exception 'Yapılacak işlem en az 3 karakter olmalı'; end if;
  if length(normalized_plate) < 5 then raise exception 'Geçerli plaka gerekli'; end if;
  if length(trim(coalesce(p_brand, ''))) < 2 or length(trim(coalesce(p_model, ''))) < 1 then
    raise exception 'Motosiklet marka ve modeli gerekli';
  end if;

  select * into profile_rec from public.profiles where id = auth.uid();
  if profile_rec.id is null then raise exception 'Kullanıcı profili bulunamadı'; end if;

  if not exists (
    select 1 from public.workshop_members wm
    where wm.workshop_id = p_workshop_id
      and wm.user_id = p_mechanic_id
      and wm.is_active
      and wm.role in ('mechanic'::public.member_role, 'owner_mechanic'::public.member_role)
  ) then raise exception 'Seçilen Usta bu işletmede aktif değil'; end if;

  if not public.appointment_slot_available(p_workshop_id, p_mechanic_id, p_scheduled_start, p_scheduled_end, null) then
    raise exception 'Seçilen saat artık müsait değil';
  end if;

  select appointment_auto_confirm into auto_confirm
  from public.workshops
  where id = p_workshop_id and is_active and appointments_enabled;
  if auto_confirm is null then raise exception 'İşletmede randevu sistemi kapalı'; end if;

  select m.id, m.customer_id into target_motorcycle_id, target_customer_id
  from public.motorcycles m
  where m.workshop_id = p_workshop_id
    and public.normalize_plate(m.plate) = normalized_plate
  order by m.created_at desc
  limit 1;

  if target_customer_id is null then
    select c.id into target_customer_id
    from public.customers c
    where c.workshop_id = p_workshop_id
      and (
        c.created_by = auth.uid()
        or (profile_rec.phone is not null and public.normalize_phone(c.phone) = public.normalize_phone(profile_rec.phone))
      )
    order by c.created_at desc
    limit 1;
  end if;

  if target_customer_id is null then
    insert into public.customers(workshop_id, full_name, phone, note, created_by)
    values (p_workshop_id, profile_rec.full_name, profile_rec.phone, 'Uygulama üzerinden randevu oluşturan kullanıcı', auth.uid())
    returning id into target_customer_id;
  end if;

  if target_motorcycle_id is null then
    insert into public.motorcycles(workshop_id, customer_id, brand, model, plate, note, created_by)
    values (p_workshop_id, target_customer_id, trim(p_brand), trim(p_model), normalized_plate, 'Randevu sırasında oluşturuldu', auth.uid())
    returning id into target_motorcycle_id;
  end if;

  new_status := case when auto_confirm then 'confirmed' else 'pending' end;

  insert into public.appointments(
    workshop_id, customer_id, motorcycle_id, mechanic_id, service_title, customer_note,
    scheduled_start, scheduled_end, status, source, requested_by, created_by,
    confirmed_by, confirmed_at
  ) values (
    p_workshop_id, target_customer_id, target_motorcycle_id, p_mechanic_id,
    trim(p_service_title), nullif(trim(p_customer_note), ''),
    p_scheduled_start, p_scheduled_end, new_status, 'customer', auth.uid(), auth.uid(),
    case when auto_confirm then auth.uid() else null end,
    case when auto_confirm then now() else null end
  ) returning id into new_id;

  insert into public.appointment_events(appointment_id, workshop_id, actor_id, event_type, new_status, new_start, note)
  values (new_id, p_workshop_id, auth.uid(), 'created', new_status, p_scheduled_start, 'Bağlantı gerektirmeyen müşteri randevu talebi oluşturuldu');

  return new_id;
end;
$$;

create or replace function public.customer_get_my_appointments()
returns table(
  id uuid,
  workshop_id uuid,
  workshop_name text,
  customer_id uuid,
  motorcycle_id uuid,
  brand text,
  model text,
  plate text,
  mechanic_id uuid,
  mechanic_name text,
  service_title text,
  customer_note text,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  status text,
  source text,
  cancellation_reason text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select distinct
    a.id, a.workshop_id, w.name, a.customer_id, a.motorcycle_id,
    m.brand, m.model, m.plate, a.mechanic_id, p.full_name,
    a.service_title, a.customer_note, a.scheduled_start, a.scheduled_end,
    a.status, a.source, a.cancellation_reason, a.created_at
  from public.appointments a
  join public.workshops w on w.id = a.workshop_id
  join public.motorcycles m on m.id = a.motorcycle_id
  join public.profiles p on p.id = a.mechanic_id
  where a.requested_by = auth.uid()
     or exists (
       select 1 from public.customer_links cl
       where cl.customer_id = a.customer_id
         and cl.workshop_id = a.workshop_id
         and cl.user_id = auth.uid()
         and cl.status = 'approved'
     )
  order by a.scheduled_start desc;
$$;

create or replace function public.customer_cancel_appointment(
  p_appointment_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare rec record;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;

  select a.* into rec
  from public.appointments a
  where a.id = p_appointment_id
    and (
      a.requested_by = auth.uid()
      or exists (
        select 1 from public.customer_links cl
        where cl.customer_id = a.customer_id
          and cl.workshop_id = a.workshop_id
          and cl.user_id = auth.uid()
          and cl.status = 'approved'
      )
    );

  if rec.id is null then raise exception 'Randevu bulunamadı'; end if;
  if rec.status not in ('pending','confirmed') then raise exception 'Bu randevu artık iptal edilemez'; end if;
  if rec.scheduled_start <= now() then raise exception 'Başlangıç saati geçmiş randevu iptal edilemez'; end if;

  update public.appointments
  set status = 'cancelled', cancelled_by = auth.uid(), cancelled_at = now(), cancellation_reason = nullif(trim(p_reason), '')
  where id = p_appointment_id;

  insert into public.appointment_events(appointment_id, workshop_id, actor_id, event_type, old_status, new_status, old_start, new_start, note)
  values (rec.id, rec.workshop_id, auth.uid(), 'cancelled', rec.status, 'cancelled', rec.scheduled_start, rec.scheduled_start, nullif(trim(p_reason), ''));
end;
$$;

create or replace function public.customer_claim_by_qr(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_input text := upper(trim(coalesce(p_token, '')));
  parsed_token uuid;
  rec record;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if length(normalized_input) < 6 then raise exception 'QR veya manuel kod geçersiz'; end if;

  begin
    parsed_token := normalized_input::uuid;
  exception when others then
    parsed_token := null;
  end;

  select wo.customer_id, wo.workshop_id, wo.motorcycle_id, w.name as workshop_name, m.plate
  into rec
  from public.work_orders wo
  join public.workshops w on w.id = wo.workshop_id and w.is_active
  join public.motorcycles m on m.id = wo.motorcycle_id
  where (parsed_token is not null and wo.claim_token = parsed_token)
     or upper(wo.tracking_code) = normalized_input
  order by wo.created_at desc
  limit 1;

  if rec.customer_id is null then raise exception 'QR veya manuel servis kodu bulunamadı'; end if;
  perform public.approve_customer_link(auth.uid(), rec.customer_id, rec.workshop_id, 'qr', null);
  insert into public.customer_claims(user_id, workshop_id, customer_id, motorcycle_id, method, status, submitted_plate, reviewed_at)
  values (auth.uid(), rec.workshop_id, rec.customer_id, rec.motorcycle_id, 'qr', 'approved', public.normalize_plate(rec.plate), now());
  update public.profiles set account_mode = 'customer', updated_at = now() where id = auth.uid();
  return jsonb_build_object('linked_count', 1, 'workshop', rec.workshop_name);
end;
$$;

revoke all on function public.customer_request_workshop_motor_link(uuid, text, text, text, text) from public, anon;
revoke all on function public.customer_search_appointment_workshops(text) from public, anon;
revoke all on function public.customer_create_open_appointment(uuid, uuid, text, text, text, text, text, timestamptz, timestamptz) from public, anon;
revoke all on function public.customer_get_my_appointments() from public, anon;

grant execute on function public.customer_request_workshop_motor_link(uuid, text, text, text, text) to authenticated, service_role;
grant execute on function public.customer_search_appointment_workshops(text) to authenticated, service_role;
grant execute on function public.customer_create_open_appointment(uuid, uuid, text, text, text, text, text, timestamptz, timestamptz) to authenticated, service_role;
grant execute on function public.customer_get_my_appointments() to authenticated, service_role;
