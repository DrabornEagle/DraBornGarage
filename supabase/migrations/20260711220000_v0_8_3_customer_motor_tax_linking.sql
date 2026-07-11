-- DraBornGarage v0.8.3
-- Customer registration motorcycle, workshop tax identity and plate-based staff linking.

alter table public.profiles add column if not exists customer_plate text;
alter table public.profiles add column if not exists customer_motorcycle_brand text;
alter table public.profiles add column if not exists customer_motorcycle_model text;
alter table public.workshops add column if not exists tax_office text;
alter table public.workshops add column if not exists tax_number text;

create index if not exists idx_profiles_customer_plate_normalized
  on public.profiles (public.normalize_plate(customer_plate))
  where customer_plate is not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, full_name, phone, account_mode,
    customer_plate, customer_motorcycle_brand, customer_motorcycle_model
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    case when new.raw_user_meta_data ->> 'account_mode' = 'customer' then 'customer' else 'staff' end,
    case when new.raw_user_meta_data ->> 'account_mode' = 'customer' then nullif(public.normalize_plate(new.raw_user_meta_data ->> 'customer_plate'), '') else null end,
    case when new.raw_user_meta_data ->> 'account_mode' = 'customer' then nullif(trim(new.raw_user_meta_data ->> 'customer_motorcycle_brand'), '') else null end,
    case when new.raw_user_meta_data ->> 'account_mode' = 'customer' then nullif(trim(new.raw_user_meta_data ->> 'customer_motorcycle_model'), '') else null end
  )
  on conflict (id) do update
  set full_name = excluded.full_name,
      phone = coalesce(excluded.phone, public.profiles.phone),
      account_mode = excluded.account_mode,
      customer_plate = coalesce(excluded.customer_plate, public.profiles.customer_plate),
      customer_motorcycle_brand = coalesce(excluded.customer_motorcycle_brand, public.profiles.customer_motorcycle_brand),
      customer_motorcycle_model = coalesce(excluded.customer_motorcycle_model, public.profiles.customer_motorcycle_model),
      updated_at = now();
  return new;
end;
$$;

-- Replace workshop creation RPCs with required tax information.
drop function if exists public.create_workshop(text, text, text);
create function public.create_workshop(
  p_name text,
  p_phone text default null,
  p_address text default null,
  p_tax_office text default null,
  p_tax_number text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  normalized_tax text := regexp_replace(coalesce(p_tax_number, ''), '[^0-9]', '', 'g');
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if char_length(trim(p_name)) < 2 then raise exception 'İşletme adı çok kısa'; end if;
  if char_length(trim(coalesce(p_tax_office, ''))) < 2 then raise exception 'Vergi Dairesi zorunludur'; end if;
  if length(normalized_tax) not in (10, 11) then raise exception 'Vergi Numarası 10 veya 11 haneli olmalıdır'; end if;

  insert into public.workshops(name, phone, address, tax_office, tax_number, created_by)
  values (trim(p_name), nullif(trim(p_phone), ''), nullif(trim(p_address), ''), trim(p_tax_office), normalized_tax, auth.uid())
  returning id into new_id;

  insert into public.workshop_members(workshop_id, user_id, role)
  values (new_id, auth.uid(), 'owner_mechanic');

  return new_id;
end;
$$;

drop function if exists public.admin_create_workshop(text, text, text);
create function public.admin_create_workshop(
  p_name text,
  p_phone text default null,
  p_address text default null,
  p_tax_office text default null,
  p_tax_number text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  normalized_tax text := regexp_replace(coalesce(p_tax_number, ''), '[^0-9]', '', 'g');
begin
  if not public.is_admin() then raise exception 'Bu işlem yalnızca Admin tarafından yapılabilir'; end if;
  if char_length(trim(p_name)) < 2 then raise exception 'İşletme adı çok kısa'; end if;
  if char_length(trim(coalesce(p_tax_office, ''))) < 2 then raise exception 'Vergi Dairesi zorunludur'; end if;
  if length(normalized_tax) not in (10, 11) then raise exception 'Vergi Numarası 10 veya 11 haneli olmalıdır'; end if;

  insert into public.workshops(name, phone, address, tax_office, tax_number, created_by)
  values (trim(p_name), nullif(trim(p_phone), ''), nullif(trim(p_address), ''), trim(p_tax_office), normalized_tax, auth.uid())
  returning id into new_id;
  return new_id;
end;
$$;

drop function if exists public.update_workshop_details(uuid, text, text, text);
create function public.update_workshop_details(
  p_workshop_id uuid,
  p_name text,
  p_phone text default null,
  p_address text default null,
  p_tax_office text default null,
  p_tax_number text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_tax text := regexp_replace(coalesce(p_tax_number, ''), '[^0-9]', '', 'g');
begin
  if not public.is_workshop_owner(p_workshop_id) then raise exception 'İşletme düzenleme yetkiniz yok'; end if;
  if char_length(trim(p_name)) < 2 then raise exception 'İşletme adı çok kısa'; end if;
  if char_length(trim(coalesce(p_tax_office, ''))) < 2 then raise exception 'Vergi Dairesi zorunludur'; end if;
  if length(normalized_tax) not in (10, 11) then raise exception 'Vergi Numarası 10 veya 11 haneli olmalıdır'; end if;
  update public.workshops
  set name = trim(p_name),
      phone = nullif(trim(p_phone), ''),
      address = nullif(trim(p_address), ''),
      tax_office = trim(p_tax_office),
      tax_number = normalized_tax,
      updated_at = now()
  where id = p_workshop_id;
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
  normalized_plate text := public.normalize_plate(p_plate);
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if length(normalized_plate) < 5 then raise exception 'Geçerli plaka girin'; end if;

  update public.profiles
  set account_mode = 'customer', customer_plate = normalized_plate, updated_at = now()
  where id = auth.uid();

  for rec in
    select distinct c.id as customer_id, c.workshop_id, m.id as motorcycle_id
    from public.motorcycles m
    join public.customers c on c.id = m.customer_id and c.workshop_id = m.workshop_id
    join public.workshops w on w.id = c.workshop_id and w.is_active
    where public.normalize_plate(m.plate) = normalized_plate
  loop
    if not exists (
      select 1 from public.customer_claims cc
      where cc.user_id = auth.uid() and cc.motorcycle_id = rec.motorcycle_id and cc.status = 'pending'
    ) then
      insert into public.customer_claims(user_id, workshop_id, customer_id, motorcycle_id, method, status, submitted_plate, submitted_phone)
      values (auth.uid(), rec.workshop_id, rec.customer_id, rec.motorcycle_id, 'mechanic_approval', 'pending', normalized_plate, nullif(public.normalize_phone(p_phone), ''));
      request_count := request_count + 1;
    end if;
  end loop;

  if request_count = 0 and not exists (
    select 1 from public.customer_claims where user_id = auth.uid() and submitted_plate = normalized_plate and status = 'pending'
  ) then
    raise exception 'Bu plakaya ait aktif işletme kaydı bulunamadı. Usta önce motoru işletmeye kaydetsin veya plakayla hesabınızı eşleştirsin.';
  end if;

  return jsonb_build_object('request_count', request_count, 'status', 'pending');
end;
$$;

create or replace function public.staff_find_registered_customer_by_plate(p_workshop_id uuid, p_plate text)
returns table(
  user_id uuid,
  full_name text,
  phone text,
  registered_plate text,
  registered_brand text,
  registered_model text,
  already_linked boolean,
  workshop_customer_id uuid,
  workshop_customer_name text,
  workshop_motorcycle_id uuid
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare normalized_plate text := public.normalize_plate(p_plate);
begin
  if not public.is_workshop_owner(p_workshop_id) and not public.is_workshop_worker(p_workshop_id) then
    raise exception 'Müşteri hesabı arama yetkiniz yok';
  end if;
  if length(normalized_plate) < 5 then raise exception 'Geçerli plaka girin'; end if;

  return query
  select
    p.id,
    p.full_name,
    p.phone,
    p.customer_plate,
    coalesce(p.customer_motorcycle_brand, 'Marka belirtilmedi'),
    coalesce(p.customer_motorcycle_model, 'Model belirtilmedi'),
    exists (
      select 1 from public.customer_links cl
      where cl.user_id = p.id and cl.workshop_id = p_workshop_id and cl.status = 'approved'
    ),
    existing.customer_id,
    existing.customer_name,
    existing.motorcycle_id
  from public.profiles p
  left join lateral (
    select c.id as customer_id, c.full_name as customer_name, m.id as motorcycle_id
    from public.motorcycles m
    join public.customers c on c.id = m.customer_id and c.workshop_id = m.workshop_id
    where m.workshop_id = p_workshop_id and public.normalize_plate(m.plate) = normalized_plate
    order by m.created_at desc
    limit 1
  ) existing on true
  where p.account_mode = 'customer'
    and public.normalize_plate(p.customer_plate) = normalized_plate
  order by p.full_name;
end;
$$;

create or replace function public.staff_link_registered_customer_by_plate(p_workshop_id uuid, p_user_id uuid, p_plate text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_plate text := public.normalize_plate(p_plate);
  account_rec record;
  customer_id_value uuid;
  motorcycle_id_value uuid;
  claim_id_value uuid;
begin
  if not public.is_workshop_owner(p_workshop_id) and not public.is_workshop_worker(p_workshop_id) then
    raise exception 'Müşteri hesabı eşleştirme yetkiniz yok';
  end if;
  if length(normalized_plate) < 5 then raise exception 'Geçerli plaka girin'; end if;

  select id, full_name, phone, customer_motorcycle_brand, customer_motorcycle_model
  into account_rec
  from public.profiles
  where id = p_user_id
    and account_mode = 'customer'
    and public.normalize_plate(customer_plate) = normalized_plate;

  if account_rec.id is null then raise exception 'Bu plakaya ait müşteri hesabı bulunamadı'; end if;

  select c.id, m.id
  into customer_id_value, motorcycle_id_value
  from public.motorcycles m
  join public.customers c on c.id = m.customer_id and c.workshop_id = m.workshop_id
  where m.workshop_id = p_workshop_id and public.normalize_plate(m.plate) = normalized_plate
  order by m.created_at desc
  limit 1;

  if customer_id_value is null then
    insert into public.customers(workshop_id, full_name, phone, note, created_by)
    values (p_workshop_id, account_rec.full_name, account_rec.phone, 'Müşteri hesabından plaka ile oluşturuldu', auth.uid())
    returning id into customer_id_value;

    insert into public.motorcycles(workshop_id, customer_id, brand, model, plate, created_by)
    values (
      p_workshop_id,
      customer_id_value,
      coalesce(nullif(trim(account_rec.customer_motorcycle_brand), ''), 'Belirtilmedi'),
      coalesce(nullif(trim(account_rec.customer_motorcycle_model), ''), 'Belirtilmedi'),
      normalized_plate,
      auth.uid()
    )
    returning id into motorcycle_id_value;
  end if;

  update public.customer_claims
  set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), review_note = 'Usta plaka ile doğrudan eşleştirdi', updated_at = now()
  where user_id = p_user_id and motorcycle_id = motorcycle_id_value and status = 'pending'
  returning id into claim_id_value;

  if claim_id_value is null then
    insert into public.customer_claims(
      user_id, workshop_id, customer_id, motorcycle_id, method, status,
      submitted_plate, reviewed_by, reviewed_at, review_note
    )
    values (
      p_user_id, p_workshop_id, customer_id_value, motorcycle_id_value,
      'staff_manual', 'approved', normalized_plate, auth.uid(), now(), 'Usta plaka ile doğrudan eşleştirdi'
    )
    returning id into claim_id_value;
  end if;

  perform public.approve_customer_link(p_user_id, customer_id_value, p_workshop_id, 'staff_manual', auth.uid());
  update public.profiles set account_mode = 'customer', customer_plate = normalized_plate, updated_at = now() where id = p_user_id;

  return jsonb_build_object(
    'status', 'approved',
    'customer_id', customer_id_value,
    'motorcycle_id', motorcycle_id_value,
    'claim_id', claim_id_value
  );
end;
$$;

revoke all on function public.create_workshop(text, text, text, text, text) from public, anon;
revoke all on function public.admin_create_workshop(text, text, text, text, text) from public, anon;
revoke all on function public.update_workshop_details(uuid, text, text, text, text, text) from public, anon;
revoke all on function public.staff_find_registered_customer_by_plate(uuid, text) from public, anon;
revoke all on function public.staff_link_registered_customer_by_plate(uuid, uuid, text) from public, anon;
grant execute on function public.create_workshop(text, text, text, text, text) to authenticated, service_role;
grant execute on function public.admin_create_workshop(text, text, text, text, text) to authenticated, service_role;
grant execute on function public.update_workshop_details(uuid, text, text, text, text, text) to authenticated, service_role;
grant execute on function public.staff_find_registered_customer_by_plate(uuid, text) to authenticated, service_role;
grant execute on function public.staff_link_registered_customer_by_plate(uuid, uuid, text) to authenticated, service_role;
