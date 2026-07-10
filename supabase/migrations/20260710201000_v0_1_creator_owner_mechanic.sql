create or replace function public.create_workshop(p_name text, p_phone text default null, p_address text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if char_length(trim(p_name)) < 2 then raise exception 'İşletme adı çok kısa'; end if;

  insert into public.workshops(name, phone, address, created_by)
  values (trim(p_name), nullif(trim(p_phone), ''), nullif(trim(p_address), ''), auth.uid())
  returning id into new_id;

  insert into public.workshop_members(workshop_id, user_id, role)
  values (new_id, auth.uid(), 'owner_mechanic');

  return new_id;
end;
$$;
