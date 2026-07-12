-- DraBornGarage v0.8.6 rollback to v0.8.5 schema/function behavior.
-- Customer/motorcycle/appointment records created while v0.8.6 was active are not deleted.

-- Pending workshop-only claims cannot exist in the old non-null schema.
delete from public.customer_claims
where customer_id is null or motorcycle_id is null;

alter table public.customer_claims
  alter column customer_id set not null,
  alter column motorcycle_id set not null;

alter table public.customer_claims
  drop column if exists submitted_brand,
  drop column if exists submitted_model;

drop function if exists public.customer_request_workshop_motor_link(uuid, text, text, text, text);
drop function if exists public.customer_search_appointment_workshops(text);
drop function if exists public.customer_create_open_appointment(uuid, uuid, text, text, text, text, text, timestamptz, timestamptz);
drop function if exists public.customer_get_my_appointments();

create or replace function public.customer_get_claims()
returns table(
  id uuid, workshop_id uuid, workshop_name text, motorcycle_id uuid,
  brand text, model text, plate text, method text, status text,
  created_at timestamptz, reviewed_at timestamptz, review_note text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    cc.id, cc.workshop_id, w.name, cc.motorcycle_id,
    m.brand, m.model, m.plate, cc.method,
    case when cc.status = 'pending' and cc.expires_at < now() then 'expired' else cc.status end,
    cc.created_at, cc.reviewed_at, cc.review_note
  from public.customer_claims cc
  join public.workshops w on w.id = cc.workshop_id
  join public.motorcycles m on m.id = cc.motorcycle_id
  where cc.user_id = auth.uid()
  order by cc.created_at desc;
$$;

create or replace function public.staff_get_customer_claims(p_workshop_id uuid)
returns table(
  id uuid, user_id uuid, claimant_name text, claimant_phone text,
  customer_id uuid, customer_name text, motorcycle_id uuid,
  brand text, model text, plate text, method text, status text,
  submitted_phone text, created_at timestamptz
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
    cc.id, cc.user_id, p.full_name, p.phone,
    cc.customer_id, c.full_name, cc.motorcycle_id,
    m.brand, m.model, m.plate, cc.method,
    case when cc.status = 'pending' and cc.expires_at < now() then 'expired' else cc.status end,
    cc.submitted_phone, cc.created_at
  from public.customer_claims cc
  join public.profiles p on p.id = cc.user_id
  join public.customers c on c.id = cc.customer_id
  join public.motorcycles m on m.id = cc.motorcycle_id
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
declare rec record;
begin
  select * into rec from public.customer_claims where id = p_claim_id;
  if rec.id is null then raise exception 'Eşleşme talebi bulunamadı'; end if;
  if not public.is_workshop_owner(rec.workshop_id) and not public.is_workshop_worker(rec.workshop_id) then
    raise exception 'Bu talebi onaylama yetkiniz yok';
  end if;
  if rec.status <> 'pending' then raise exception 'Bu talep daha önce sonuçlandırılmış'; end if;

  update public.customer_claims
  set status = case when p_approve then 'approved' else 'rejected' end,
      reviewed_by = auth.uid(), reviewed_at = now(),
      review_note = nullif(trim(p_note), ''), updated_at = now()
  where id = p_claim_id;

  if p_approve then
    perform public.approve_customer_link(rec.user_id, rec.customer_id, rec.workshop_id, 'mechanic_approval', auth.uid());
  end if;

  return jsonb_build_object('status', case when p_approve then 'approved' else 'rejected' end);
end;
$$;

create or replace function public.customer_get_appointment_mechanics(p_workshop_id uuid)
returns table(mechanic_id uuid, full_name text, availability_status text)
language sql
stable
security definer
set search_path = public
as $$
  select wm.user_id, p.full_name, wm.availability_status
  from public.workshop_members wm
  join public.profiles p on p.id = wm.user_id
  join public.workshops w on w.id = wm.workshop_id and w.is_active and w.appointments_enabled
  where wm.workshop_id = p_workshop_id
    and wm.is_active
    and wm.role in ('mechanic'::public.member_role, 'owner_mechanic'::public.member_role)
    and wm.availability_status <> 'off'
    and exists (
      select 1 from public.customer_links cl
      where cl.user_id = auth.uid()
        and cl.workshop_id = p_workshop_id
        and cl.status = 'approved'
    )
  order by p.full_name;
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
  select a.* into rec
  from public.appointments a
  join public.customer_links cl on cl.customer_id = a.customer_id
    and cl.workshop_id = a.workshop_id
    and cl.user_id = auth.uid()
    and cl.status = 'approved'
  where a.id = p_appointment_id;

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
  parsed_token uuid;
  rec record;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  begin parsed_token := trim(p_token)::uuid; exception when others then raise exception 'QR bağlantısı geçersiz'; end;

  select wo.customer_id, wo.workshop_id, wo.motorcycle_id, w.name as workshop_name, m.plate
  into rec
  from public.work_orders wo
  join public.workshops w on w.id = wo.workshop_id and w.is_active
  join public.motorcycles m on m.id = wo.motorcycle_id
  where wo.claim_token = parsed_token
  order by wo.created_at desc
  limit 1;

  if rec.customer_id is null then raise exception 'QR bağlantısı bulunamadı'; end if;
  perform public.approve_customer_link(auth.uid(), rec.customer_id, rec.workshop_id, 'qr', null);
  insert into public.customer_claims(user_id, workshop_id, customer_id, motorcycle_id, method, status, submitted_plate, reviewed_at)
  values (auth.uid(), rec.workshop_id, rec.customer_id, rec.motorcycle_id, 'qr', 'approved', public.normalize_plate(rec.plate), now());
  update public.profiles set account_mode = 'customer', updated_at = now() where id = auth.uid();
  return jsonb_build_object('linked_count', 1, 'workshop', rec.workshop_name);
end;
$$;
