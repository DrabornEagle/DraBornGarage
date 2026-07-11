-- DraBornGarage v0.8.3 rollback to v0.8.2.
-- Run only when intentionally reverting the database feature.

drop function if exists public.staff_link_registered_customer_by_plate(uuid, uuid, text);
drop function if exists public.staff_find_registered_customer_by_plate(uuid, text);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, account_mode)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    case when new.raw_user_meta_data ->> 'account_mode' = 'customer' then 'customer' else 'staff' end
  )
  on conflict (id) do update
  set full_name = excluded.full_name,
      phone = coalesce(excluded.phone, public.profiles.phone),
      account_mode = excluded.account_mode,
      updated_at = now();
  return new;
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

drop function if exists public.create_workshop(text, text, text, text, text);
create function public.create_workshop(p_name text, p_phone text default null, p_address text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if char_length(trim(p_name)) < 2 then raise exception 'İşletme adı çok kısa'; end if;
  insert into public.workshops(name, phone, address, created_by)
  values (trim(p_name), nullif(trim(p_phone), ''), nullif(trim(p_address), ''), auth.uid()) returning id into new_id;
  insert into public.workshop_members(workshop_id, user_id, role) values (new_id, auth.uid(), 'owner_mechanic');
  return new_id;
end; $$;

drop function if exists public.admin_create_workshop(text, text, text, text, text);
create function public.admin_create_workshop(p_name text, p_phone text default null, p_address text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  if not public.is_admin() then raise exception 'Bu işlem yalnızca Admin tarafından yapılabilir'; end if;
  if char_length(trim(p_name)) < 2 then raise exception 'İşletme adı çok kısa'; end if;
  insert into public.workshops(name, phone, address, created_by)
  values (trim(p_name), nullif(trim(p_phone), ''), nullif(trim(p_address), ''), auth.uid()) returning id into new_id;
  return new_id;
end; $$;

drop function if exists public.update_workshop_details(uuid, text, text, text, text, text);
create function public.update_workshop_details(p_workshop_id uuid, p_name text, p_phone text default null, p_address text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_workshop_owner(p_workshop_id) then raise exception 'İşletme düzenleme yetkiniz yok'; end if;
  update public.workshops set name=trim(p_name), phone=nullif(trim(p_phone), ''), address=nullif(trim(p_address), ''), updated_at=now() where id=p_workshop_id;
end; $$;

revoke all on function public.create_workshop(text, text, text) from public, anon;
revoke all on function public.admin_create_workshop(text, text, text) from public, anon;
revoke all on function public.update_workshop_details(uuid, text, text, text) from public, anon;
grant execute on function public.create_workshop(text, text, text) to authenticated, service_role;
grant execute on function public.admin_create_workshop(text, text, text) to authenticated, service_role;
grant execute on function public.update_workshop_details(uuid, text, text, text) to authenticated, service_role;

drop index if exists public.idx_profiles_customer_plate_normalized;
alter table public.profiles drop column if exists customer_motorcycle_model;
alter table public.profiles drop column if exists customer_motorcycle_brand;
alter table public.profiles drop column if exists customer_plate;
alter table public.workshops drop column if exists tax_number;
alter table public.workshops drop column if exists tax_office;
