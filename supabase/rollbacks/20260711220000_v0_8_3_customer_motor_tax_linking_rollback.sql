-- DraBornGarage v0.8.3 rollback to v0.8.2.
-- Run only when intentionally reverting the database feature.

drop function if exists public.staff_link_registered_customer_by_plate(uuid, uuid, text);
drop function if exists public.staff_find_registered_customer_by_plate(uuid, text);

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

grant execute on function public.create_workshop(text, text, text) to authenticated, service_role;
grant execute on function public.admin_create_workshop(text, text, text) to authenticated, service_role;
grant execute on function public.update_workshop_details(uuid, text, text, text) to authenticated, service_role;

drop index if exists public.idx_profiles_customer_plate_normalized;
alter table public.profiles drop column if exists customer_motorcycle_model;
alter table public.profiles drop column if exists customer_motorcycle_brand;
alter table public.profiles drop column if exists customer_plate;
alter table public.workshops drop column if exists tax_number;
alter table public.workshops drop column if exists tax_office;
