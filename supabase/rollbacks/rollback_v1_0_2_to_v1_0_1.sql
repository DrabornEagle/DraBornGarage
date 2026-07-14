-- DraBornGarage v1.0.2 RC -> v1.0.1 RC rollback

revoke all on function public.owner_review_workshop_access_request(uuid,boolean,text) from authenticated;
revoke all on function public.owner_grant_workshop_access(uuid,uuid,boolean,boolean) from authenticated;
revoke all on function public.submit_workshop_access_request(uuid,boolean,boolean,text) from authenticated;
revoke all on function public.owner_search_users(uuid,text) from authenticated;
revoke all on function public.owner_get_workshop_access_requests(uuid) from authenticated;
revoke all on function public.public_search_workshops_for_registration(text) from anon,authenticated;

drop function if exists public.owner_review_workshop_access_request(uuid,boolean,text);
drop function if exists public.owner_grant_workshop_access(uuid,uuid,boolean,boolean);
drop function if exists public.submit_workshop_access_request(uuid,boolean,boolean,text);
drop function if exists public.owner_search_users(uuid,text);
drop function if exists public.owner_get_workshop_access_requests(uuid);
drop function if exists public.public_search_workshops_for_registration(text);
drop table if exists public.workshop_access_requests;

create or replace function public.create_default_platform_settings_for_workshop()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare v_default numeric(12,2);
begin
  select default_fee_per_order into v_default from public.platform_global_settings where id=1;
  insert into public.workshop_platform_settings(workshop_id,fee_per_order)
  values(new.id,coalesce(v_default,20)) on conflict(workshop_id) do nothing;
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path=public
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
    if char_length(trim(coalesce(new.raw_user_meta_data ->> 'business_name', ''))) < 2 then raise exception 'İşletme adı zorunludur'; end if;
    if char_length(trim(coalesce(new.raw_user_meta_data ->> 'business_tax_office', ''))) < 2 then raise exception 'Vergi Dairesi zorunludur'; end if;
    if length(normalized_tax) not in (10, 11) then raise exception 'Vergi Numarası 10 veya 11 haneli olmalıdır'; end if;

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

revoke all on function public.create_default_platform_settings_for_workshop() from public,anon,authenticated;
revoke all on function public.handle_new_user() from public,anon,authenticated;
