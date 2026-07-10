create or replace function public.admin_create_workshop(p_name text, p_phone text default null, p_address text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare new_id uuid;
begin
  if not public.is_admin() then raise exception 'Bu işlem yalnızca Admin tarafından yapılabilir'; end if;
  if char_length(trim(p_name)) < 2 then raise exception 'İşletme adı çok kısa'; end if;
  insert into public.workshops(name, phone, address, created_by)
  values (trim(p_name), nullif(trim(p_phone), ''), nullif(trim(p_address), ''), auth.uid())
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.admin_set_workshop_active(p_workshop_id uuid, p_is_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Bu işlem yalnızca Admin tarafından yapılabilir'; end if;
  update public.workshops set is_active = p_is_active, updated_at = now() where id = p_workshop_id;
  if not found then raise exception 'İşletme bulunamadı'; end if;
end;
$$;

create or replace function public.update_workshop_details(p_workshop_id uuid, p_name text, p_phone text default null, p_address text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_workshop_owner(p_workshop_id) then raise exception 'İşletme düzenleme yetkiniz yok'; end if;
  update public.workshops
  set name = trim(p_name), phone = nullif(trim(p_phone), ''), address = nullif(trim(p_address), ''), updated_at = now()
  where id = p_workshop_id;
end;
$$;

create or replace function public.set_staff_active(p_workshop_id uuid, p_user_id uuid, p_is_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare target_role public.member_role;
begin
  if not public.is_workshop_owner(p_workshop_id) then raise exception 'Personel yönetme yetkiniz yok'; end if;
  select role into target_role from public.workshop_members where workshop_id = p_workshop_id and user_id = p_user_id;
  if target_role is null then raise exception 'Personel bulunamadı'; end if;
  if target_role in ('owner'::public.member_role, 'owner_mechanic'::public.member_role) and not public.is_admin() then
    raise exception 'İşletme sahibi pasifleştirme işlemi Admin onayı gerektirir';
  end if;
  update public.workshop_members set is_active = p_is_active where workshop_id = p_workshop_id and user_id = p_user_id;
end;
$$;

create or replace function public.set_staff_role(p_workshop_id uuid, p_user_id uuid, p_role public.member_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare old_role public.member_role;
begin
  if not public.is_workshop_owner(p_workshop_id) then raise exception 'Personel rolü değiştirme yetkiniz yok'; end if;
  select role into old_role from public.workshop_members where workshop_id = p_workshop_id and user_id = p_user_id;
  if old_role is null then raise exception 'Personel bulunamadı'; end if;
  if (old_role in ('owner'::public.member_role, 'owner_mechanic'::public.member_role)
      or p_role in ('owner'::public.member_role, 'owner_mechanic'::public.member_role))
      and not public.is_admin() then
    raise exception 'İşletme sahibi rolü değişikliği Admin onayı gerektirir';
  end if;
  update public.workshop_members set role = p_role where workshop_id = p_workshop_id and user_id = p_user_id;
end;
$$;

create or replace function public.set_staff_availability(p_workshop_id uuid, p_user_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('available', 'busy', 'off') then raise exception 'Geçersiz müsaitlik durumu'; end if;
  if auth.uid() <> p_user_id and not public.is_workshop_owner(p_workshop_id) then
    raise exception 'Müsaitlik düzenleme yetkiniz yok';
  end if;
  update public.workshop_members set availability_status = p_status
  where workshop_id = p_workshop_id and user_id = p_user_id and is_active;
end;
$$;

revoke execute on function public.admin_create_workshop(text, text, text) from public, anon;
revoke execute on function public.admin_set_workshop_active(uuid, boolean) from public, anon;
revoke execute on function public.update_workshop_details(uuid, text, text, text) from public, anon;
revoke execute on function public.set_staff_active(uuid, uuid, boolean) from public, anon;
revoke execute on function public.set_staff_role(uuid, uuid, public.member_role) from public, anon;
revoke execute on function public.set_staff_availability(uuid, uuid, text) from public, anon;
grant execute on function public.admin_create_workshop(text, text, text) to authenticated;
grant execute on function public.admin_set_workshop_active(uuid, boolean) to authenticated;
grant execute on function public.update_workshop_details(uuid, text, text, text) to authenticated;
grant execute on function public.set_staff_active(uuid, uuid, boolean) to authenticated;
grant execute on function public.set_staff_role(uuid, uuid, public.member_role) to authenticated;
grant execute on function public.set_staff_availability(uuid, uuid, text) to authenticated;
