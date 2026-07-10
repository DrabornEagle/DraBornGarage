create or replace function public.normalize_phone(p_value text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when length(regexp_replace(coalesce(p_value, ''), '[^0-9]', '', 'g')) >= 10
      then right(regexp_replace(coalesce(p_value, ''), '[^0-9]', '', 'g'), 10)
    else regexp_replace(coalesce(p_value, ''), '[^0-9]', '', 'g')
  end;
$$;

create or replace function public.normalize_plate(p_value text)
returns text
language sql
immutable
set search_path = public
as $$
  select upper(regexp_replace(coalesce(p_value, ''), '[^A-Za-z0-9ÇĞİÖŞÜçğıöşü]', '', 'g'));
$$;

create or replace function public.is_customer_linked(p_customer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.customer_links cl
    where cl.user_id = auth.uid()
      and cl.customer_id = p_customer_id
      and cl.status = 'approved'
  );
$$;

create or replace function public.is_customer_workshop(p_workshop_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.customer_links cl
    where cl.user_id = auth.uid()
      and cl.workshop_id = p_workshop_id
      and cl.status = 'approved'
  );
$$;

create or replace function public.set_profile_account_mode(p_mode text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if p_mode not in ('staff', 'customer') then raise exception 'Geçersiz hesap görünümü'; end if;
  update public.profiles set account_mode = p_mode, updated_at = now() where id = auth.uid();
end;
$$;

create or replace function public.approve_customer_link(
  p_user_id uuid,
  p_customer_id uuid,
  p_workshop_id uuid,
  p_method text,
  p_approved_by uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare link_id uuid;
begin
  insert into public.customer_links(user_id, customer_id, workshop_id, status, method, approved_by, approved_at)
  values (p_user_id, p_customer_id, p_workshop_id, 'approved', p_method, p_approved_by, now())
  on conflict (user_id, customer_id) do update
  set workshop_id = excluded.workshop_id,
      status = 'approved',
      method = excluded.method,
      approved_by = excluded.approved_by,
      approved_at = now(),
      updated_at = now()
  returning id into link_id;
  return link_id;
end;
$$;

create or replace function public.customer_claim_by_phone(p_plate text, p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  linked_count integer := 0;
  workshop_names text[] := '{}';
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if length(public.normalize_plate(p_plate)) < 5 then raise exception 'Geçerli plaka girin'; end if;
  if length(public.normalize_phone(p_phone)) < 10 then raise exception 'Geçerli telefon numarası girin'; end if;

  for rec in
    select distinct c.id as customer_id, c.workshop_id, m.id as motorcycle_id, w.name as workshop_name
    from public.motorcycles m
    join public.customers c on c.id = m.customer_id and c.workshop_id = m.workshop_id
    join public.workshops w on w.id = c.workshop_id and w.is_active
    where public.normalize_plate(m.plate) = public.normalize_plate(p_plate)
      and public.normalize_phone(c.phone) = public.normalize_phone(p_phone)
  loop
    perform public.approve_customer_link(auth.uid(), rec.customer_id, rec.workshop_id, 'phone', null);
    insert into public.customer_claims(user_id, workshop_id, customer_id, motorcycle_id, method, status, submitted_plate, submitted_phone, reviewed_at)
    values (auth.uid(), rec.workshop_id, rec.customer_id, rec.motorcycle_id, 'phone', 'approved', public.normalize_plate(p_plate), public.normalize_phone(p_phone), now());
    linked_count := linked_count + 1;
    workshop_names := array_append(workshop_names, rec.workshop_name);
  end loop;

  if linked_count = 0 then raise exception 'Plaka ve telefon bilgileri eşleşmedi'; end if;
  update public.profiles set account_mode = 'customer', updated_at = now() where id = auth.uid();
  return jsonb_build_object('linked_count', linked_count, 'workshops', workshop_names);
end;
$$;

create or replace function public.customer_claim_by_tracking_code(p_code text, p_plate text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare rec record;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  select wo.customer_id, wo.workshop_id, wo.motorcycle_id, w.name as workshop_name, m.plate
  into rec
  from public.work_orders wo
  join public.workshops w on w.id = wo.workshop_id and w.is_active
  join public.motorcycles m on m.id = wo.motorcycle_id
  where upper(wo.tracking_code) = upper(trim(p_code))
    and (nullif(public.normalize_plate(p_plate), '') is null or public.normalize_plate(m.plate) = public.normalize_plate(p_plate))
  order by wo.created_at desc
  limit 1;

  if rec.customer_id is null then raise exception 'Servis takip kodu veya plaka hatalı'; end if;
  perform public.approve_customer_link(auth.uid(), rec.customer_id, rec.workshop_id, 'tracking_code', null);
  insert into public.customer_claims(user_id, workshop_id, customer_id, motorcycle_id, method, status, submitted_plate, reviewed_at)
  values (auth.uid(), rec.workshop_id, rec.customer_id, rec.motorcycle_id, 'tracking_code', 'approved', public.normalize_plate(coalesce(p_plate, rec.plate)), now());
  update public.profiles set account_mode = 'customer', updated_at = now() where id = auth.uid();
  return jsonb_build_object('linked_count', 1, 'workshop', rec.workshop_name);
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

create or replace function public.customer_request_mechanic_approval(p_plate text, p_phone text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  request_count integer := 0;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if length(public.normalize_plate(p_plate)) < 5 then raise exception 'Geçerli plaka girin'; end if;

  for rec in
    select distinct c.id as customer_id, c.workshop_id, m.id as motorcycle_id
    from public.motorcycles m
    join public.customers c on c.id = m.customer_id and c.workshop_id = m.workshop_id
    join public.workshops w on w.id = c.workshop_id and w.is_active
    where public.normalize_plate(m.plate) = public.normalize_plate(p_plate)
  loop
    if not exists (
      select 1 from public.customer_claims cc
      where cc.user_id = auth.uid() and cc.motorcycle_id = rec.motorcycle_id and cc.status = 'pending'
    ) then
      insert into public.customer_claims(user_id, workshop_id, customer_id, motorcycle_id, method, status, submitted_plate, submitted_phone)
      values (auth.uid(), rec.workshop_id, rec.customer_id, rec.motorcycle_id, 'mechanic_approval', 'pending', public.normalize_plate(p_plate), nullif(public.normalize_phone(p_phone), ''));
      request_count := request_count + 1;
    end if;
  end loop;

  if request_count = 0 and not exists (
    select 1 from public.customer_claims where user_id = auth.uid() and submitted_plate = public.normalize_plate(p_plate) and status = 'pending'
  ) then
    raise exception 'Bu plakaya ait aktif işletme kaydı bulunamadı';
  end if;
  update public.profiles set account_mode = 'customer', updated_at = now() where id = auth.uid();
  return jsonb_build_object('request_count', request_count, 'status', 'pending');
end;
$$;

create or replace function public.customer_unlink(p_link_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.customer_links
  set status = 'revoked', updated_at = now()
  where id = p_link_id and user_id = auth.uid();
  if not found then raise exception 'Bağlantı bulunamadı'; end if;
end;
$$;

revoke execute on function public.approve_customer_link(uuid, uuid, uuid, text, uuid) from public, anon, authenticated;
revoke execute on function public.set_profile_account_mode(text) from public, anon;
revoke execute on function public.customer_claim_by_phone(text, text) from public, anon;
revoke execute on function public.customer_claim_by_tracking_code(text, text) from public, anon;
revoke execute on function public.customer_claim_by_qr(text) from public, anon;
revoke execute on function public.customer_request_mechanic_approval(text, text) from public, anon;
revoke execute on function public.customer_unlink(uuid) from public, anon;
grant execute on function public.set_profile_account_mode(text) to authenticated;
grant execute on function public.customer_claim_by_phone(text, text) to authenticated;
grant execute on function public.customer_claim_by_tracking_code(text, text) to authenticated;
grant execute on function public.customer_claim_by_qr(text) to authenticated;
grant execute on function public.customer_request_mechanic_approval(text, text) to authenticated;
grant execute on function public.customer_unlink(uuid) to authenticated;
