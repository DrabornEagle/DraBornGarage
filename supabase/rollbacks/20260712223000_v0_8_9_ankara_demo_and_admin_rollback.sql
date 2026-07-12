-- DraBornGarage v0.8.9 rollback — Ankara demo metinlerini geri alır.
-- Ana handle_new_user fonksiyonu korunur; yalnız ek Admin güvence trigger'ı kaldırılır.

drop trigger if exists zz_ensure_primary_admin_profile on auth.users;
drop function if exists public.ensure_primary_admin_profile();

update public.workshops
set name = case name
      when 'Çankaya Moto Garage • Demo' then 'Lara Moto Garage • Demo'
      when 'Keçiören Scooter Servis • Demo' then 'Konyaaltı Scooter Servis • Demo'
      else name
    end,
    address = case address
      when 'Çankaya / Ankara' then 'Muratpaşa / Lara'
      when 'Keçiören / Ankara' then 'Konyaaltı / Antalya'
      else address
    end,
    phone = case phone
      when '0312 555 10 10' then '0242 555 10 10'
      when '0312 555 20 20' then '0242 555 20 20'
      else phone
    end
where name in ('Çankaya Moto Garage • Demo', 'Keçiören Scooter Servis • Demo')
   or address in ('Çankaya / Ankara', 'Keçiören / Ankara');

update public.customers
set full_name = case full_name
  when 'Çankaya Demo Müşteri' then 'Lara Demo Müşteri'
  when 'Keçiören Demo Müşteri' then 'Konyaaltı Demo Müşteri'
  else full_name
end
where full_name in ('Çankaya Demo Müşteri', 'Keçiören Demo Müşteri');

update public.motorcycles
set plate = case plate
  when '06 CNY 707' then '07 LRA 707'
  when '06 KEC 250' then '07 KNY 250'
  else plate
end
where plate in ('06 CNY 707', '06 KEC 250');

do $$
declare
  v_oid oid;
  v_def text;
begin
  select p.oid into v_oid
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'create_demo_data'
    and p.prokind = 'f'
  order by p.oid desc
  limit 1;

  if v_oid is not null then
    v_def := pg_get_functiondef(v_oid);
    v_def := replace(v_def, 'Çankaya Moto Garage • Demo', 'Lara Moto Garage • Demo');
    v_def := replace(v_def, 'Çankaya / Ankara', 'Muratpaşa / Lara');
    v_def := replace(v_def, '0312 555 10 10', '0242 555 10 10');
    v_def := replace(v_def, 'Keçiören Scooter Servis • Demo', 'Konyaaltı Scooter Servis • Demo');
    v_def := replace(v_def, 'Keçiören / Ankara', 'Konyaaltı / Antalya');
    v_def := replace(v_def, '0312 555 20 20', '0242 555 20 20');
    v_def := replace(v_def, 'Çankaya Demo Müşteri', 'Lara Demo Müşteri');
    v_def := replace(v_def, 'Keçiören Demo Müşteri', 'Konyaaltı Demo Müşteri');
    v_def := replace(v_def, '06 CNY 707', '07 LRA 707');
    v_def := replace(v_def, '06 KEC 250', '07 KNY 250');
    execute v_def;
  end if;
end;
$$;
