-- DraBornGarage v0.8.12
-- Birincil yönetici e-postası her kayıt/eposta güncellemesinde otomatik Admin olur.

create or replace function public.ensure_primary_admin_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(trim(coalesce(new.email, ''))) = 'draborneagle@gmail.com' then
    insert into public.profiles (id, full_name, is_admin, account_mode)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1), 'DraBornEagle'),
      true,
      'staff'
    )
    on conflict (id) do update
    set is_admin = true,
        account_mode = 'staff',
        updated_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists zz_ensure_primary_admin_profile on auth.users;
create trigger zz_ensure_primary_admin_profile
after insert or update of email on auth.users
for each row execute function public.ensure_primary_admin_profile();

update public.profiles p
set is_admin = true,
    account_mode = 'staff',
    updated_at = now()
from auth.users u
where u.id = p.id
  and lower(trim(coalesce(u.email, ''))) = 'draborneagle@gmail.com';
