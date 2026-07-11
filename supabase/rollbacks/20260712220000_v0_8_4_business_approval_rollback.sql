-- DraBornGarage v0.8.4 schema rollback to v0.8.3.
-- Deleted users and operational data cannot be restored by this rollback.

drop function if exists public.admin_review_business_application(uuid, boolean, text);
drop function if exists public.admin_get_business_applications();
drop table if exists public.business_applications;

create or replace function public.set_profile_account_mode(p_mode text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if p_mode not in ('staff', 'customer') then raise exception 'Geçersiz hesap görünümü'; end if;
  update public.profiles set account_mode = p_mode, updated_at = now() where id = auth.uid();
end; $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone, account_mode, customer_plate, customer_motorcycle_brand, customer_motorcycle_model)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    case when new.raw_user_meta_data ->> 'account_mode' = 'customer' then 'customer' else 'staff' end,
    case when new.raw_user_meta_data ->> 'account_mode' = 'customer' then nullif(public.normalize_plate(new.raw_user_meta_data ->> 'customer_plate'), '') else null end,
    case when new.raw_user_meta_data ->> 'account_mode' = 'customer' then nullif(trim(new.raw_user_meta_data ->> 'customer_motorcycle_brand'), '') else null end,
    case when new.raw_user_meta_data ->> 'account_mode' = 'customer' then nullif(trim(new.raw_user_meta_data ->> 'customer_motorcycle_model'), '') else null end
  )
  on conflict (id) do update set full_name=excluded.full_name, phone=coalesce(excluded.phone,public.profiles.phone), account_mode=excluded.account_mode, customer_plate=coalesce(excluded.customer_plate,public.profiles.customer_plate), customer_motorcycle_brand=coalesce(excluded.customer_motorcycle_brand,public.profiles.customer_motorcycle_brand), customer_motorcycle_model=coalesce(excluded.customer_motorcycle_model,public.profiles.customer_motorcycle_model), updated_at=now();
  return new;
end; $$;

create or replace function public.create_workshop(p_name text, p_phone text default null, p_address text default null, p_tax_office text default null, p_tax_number text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid; normalized_tax text := regexp_replace(coalesce(p_tax_number,''),'[^0-9]','','g');
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if char_length(trim(p_name)) < 2 then raise exception 'İşletme adı çok kısa'; end if;
  if char_length(trim(coalesce(p_tax_office,''))) < 2 then raise exception 'Vergi Dairesi zorunludur'; end if;
  if length(normalized_tax) not in (10,11) then raise exception 'Vergi Numarası 10 veya 11 haneli olmalıdır'; end if;
  insert into public.workshops(name,phone,address,tax_office,tax_number,created_by) values(trim(p_name),nullif(trim(p_phone),''),nullif(trim(p_address),''),trim(p_tax_office),normalized_tax,auth.uid()) returning id into new_id;
  insert into public.workshop_members(workshop_id,user_id,role) values(new_id,auth.uid(),'owner_mechanic');
  return new_id;
end; $$;
