-- DraBornGarage v0.8.9 — Ankara demo metinleri ve ana Admin güvence katmanı
-- Bu migration mevcut DraBornGarage profiles şemasıyla uyumludur.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_mode text := coalesce(new.raw_user_meta_data ->> 'requested_account_mode', new.raw_user_meta_data ->> 'account_mode', 'customer');
  primary_admin boolean := lower(coalesce(new.email, '')) = 'draborneagle@gmail.com';
  normalized_tax text := regexp_replace(coalesce(new.raw_user_meta_data ->> 'business_tax_number', ''), '[^0-9]', '', 'g');
begin
  insert into public.profiles (
    id, full_name, phone, is_admin, account_mode,
    customer_plate, customer_motorcycle_brand, customer_motorcycle_model
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    primary_admin,
    case when primary_admin then 'staff' else 'customer' end,
    case when requested_mode = 'customer' then nullif(public.normalize_plate(new.raw_user_meta_data ->> 'customer_plate'), '') else null end,
    case when requested_mode = 'customer' then nullif(trim(new.raw_user_meta_data ->> 'customer_motorcycle_brand'), '') else null end,
    case when requested_mode = 'customer' then nullif(trim(new.raw_user_meta_data ->> 'customer_motorcycle_model'), '') else null end
  )
  on conflict (id) do update
  set full_name = excluded.full_name,
      phone = coalesce(excluded.phone, public.profiles.phone),
      is_admin = primary_admin or public.profiles.is_admin,
      account_mode = case when primary_admin then 'staff' else public.profiles.account_mode end,
      customer_plate = coalesce(excluded.customer_plate, public.profiles.customer_plate),
      customer_motorcycle_brand = coalesce(excluded.customer_motorcycle_brand, public.profiles.customer_motorcycle_brand),
      customer_motorcycle_model = coalesce(excluded.customer_motorcycle_model, public.profiles.customer_motorcycle_model),
      updated_at = now();

  if requested_mode = 'staff' and not primary_admin then
    if char_length(trim(coalesce(new.raw_user_meta_data ->> 'business_name', ''))) < 2 then
      raise exception 'İşletme adı zorunludur';
    end if;
    if char_length(trim(coalesce(new.raw_user_meta_data ->> 'business_tax_office', ''))) < 2 then
      raise exception 'Vergi Dairesi zorunludur';
    end if;
    if length(normalized_tax) not in (10, 11) then
      raise exception 'Vergi Numarası 10 veya 11 haneli olmalıdır';
    end if;

    insert into public.business_applications (
      user_id, business_name, business_phone, business_address,
      tax_office, tax_number, status, submitted_at, updated_at
    )
    values (
      new.id,
      trim(new.raw_user_meta_data ->> 'business_name'),
      nullif(trim(new.raw_user_meta_data ->> 'business_phone'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'business_address'), ''),
      trim(new.raw_user_meta_data ->> 'business_tax_office'),
      normalized_tax,
      'pending', now(), now()
    )
    on conflict (user_id) do update
    set business_name = excluded.business_name,
        business_phone = excluded.business_phone,
        business_address = excluded.business_address,
        tax_office = excluded.tax_office,
        tax_number = excluded.tax_number,
        status = 'pending',
        reviewed_at = null,
        reviewed_by = null,
        review_note = null,
        workshop_id = null,
        submitted_at = now(),
        updated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Ana e-posta için ikinci güvence katmanı. on_auth_user_created sonrasında çalışır.
create or replace function public.ensure_primary_admin_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(coalesce(new.email, '')) = 'draborneagle@gmail.com' then
    update public.profiles
    set is_admin = true,
        account_mode = 'staff',
        updated_at = now()
    where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists zz_ensure_primary_admin_profile on auth.users;
create trigger zz_ensure_primary_admin_profile
after insert or update of email on auth.users
for each row execute function public.ensure_primary_admin_profile();

update public.workshops
set name = case name
      when 'Lara Moto Garage • Demo' then 'Çankaya Moto Garage • Demo'
      when 'Konyaaltı Scooter Servis • Demo' then 'Keçiören Scooter Servis • Demo'
      else name
    end,
    address = case address
      when 'Muratpaşa / Lara' then 'Çankaya / Ankara'
      when 'Konyaaltı / Antalya' then 'Keçiören / Ankara'
      else address
    end,
    phone = case phone
      when '0242 555 10 10' then '0312 555 10 10'
      when '0242 555 20 20' then '0312 555 20 20'
      else phone
    end
where name in ('Lara Moto Garage • Demo', 'Konyaaltı Scooter Servis • Demo')
   or address in ('Muratpaşa / Lara', 'Konyaaltı / Antalya');

update public.customers
set full_name = case full_name
  when 'Lara Demo Müşteri' then 'Çankaya Demo Müşteri'
  when 'Konyaaltı Demo Müşteri' then 'Keçiören Demo Müşteri'
  else full_name
end
where full_name in ('Lara Demo Müşteri', 'Konyaaltı Demo Müşteri');

update public.motorcycles
set plate = case plate
  when '07 LRA 707' then '06 CNY 707'
  when '07 KNY 250' then '06 KEC 250'
  else plate
end
where plate in ('07 LRA 707', '07 KNY 250');

-- Demo üretim fonksiyonundaki kullanıcıya görünen Antalya metinlerini Ankara ile değiştir.
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
