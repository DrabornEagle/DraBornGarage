-- DraBornGarage v0.8.9 — Ankara demo metinleri ve ana Admin güvence katmanı

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, role, is_driver, admin_role, is_active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'phone',
    'user',
    false,
    case when lower(new.email) = 'draborneagle@gmail.com' then 'admin' else null end,
    true
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    phone = excluded.phone,
    admin_role = excluded.admin_role,
    is_active = true;

  if lower(new.email) = 'draborneagle@gmail.com' then
    update public.profiles set admin_role = 'admin', is_active = true where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

update public.workshops set
  name = case name when 'Lara Moto Garage • Demo' then 'Çankaya Moto Garage • Demo' when 'Konyaaltı Scooter Servis • Demo' then 'Keçiören Scooter Servis • Demo' else name end,
  address = case address when 'Muratpaşa / Lara' then 'Çankaya / Ankara' when 'Konyaaltı / Antalya' then 'Keçiören / Ankara' else address end,
  phone = case phone when '0242 555 10 10' then '0312 555 10 10' when '0242 555 20 20' then '0312 555 20 20' else phone end
where name in ('Lara Moto Garage • Demo', 'Konyaaltı Scooter Servis • Demo')
   or address in ('Muratpaşa / Lara', 'Konyaaltı / Antalya');

update public.customers set full_name = case full_name
  when 'Lara Demo Müşteri' then 'Çankaya Demo Müşteri'
  when 'Konyaaltı Demo Müşteri' then 'Keçiören Demo Müşteri'
  else full_name end
where full_name in ('Lara Demo Müşteri', 'Konyaaltı Demo Müşteri');

update public.motorcycles set plate = case plate
  when '07 LRA 707' then '06 CNY 707'
  when '07 KNY 250' then '06 KEC 250'
  else plate end
where plate in ('07 LRA 707', '07 KNY 250');

do $$
declare
  v_oid oid;
  v_def text;
begin
  select p.oid into v_oid
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'create_demo_data' and p.prokind = 'f'
  order by p.oid desc limit 1;

  if v_oid is not null then
    v_def := pg_get_functiondef(v_oid);
    v_def := replace(v_def, 'Lara Moto Garage • Demo', 'Çankaya Moto Garage • Demo');
    v_def := replace(v_def, 'Muratpaşa / Lara', 'Çankaya / Ankara');
    v_def := replace(v_def, '0242 555 10 10', '0312 555 10 10');
    v_def := replace(v_def, 'Konyaaltı Scooter Servis • Demo', 'Keçiören Scooter Servis • Demo');
    v_def := replace(v_def, 'Konyaaltı / Antalya', 'Keçiören / Ankara');
    v_def := replace(v_def, '0242 555 20 20', '0312 555 20 20');
    v_def := replace(v_def, 'Lara Demo Müşteri', 'Çankaya Demo Müşteri');
    v_def := replace(v_def, 'Konyaaltı Demo Müşteri', 'Keçiören Demo Müşteri');
    v_def := replace(v_def, '07 LRA 707', '06 CNY 707');
    v_def := replace(v_def, '07 KNY 250', '06 KEC 250');
    execute v_def;
  end if;
end;
$$;
