-- DraBornGarage v0.8.4
-- Admin-approved business applications, protected staff access and automatic primary admin.

create table if not exists public.business_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  business_name text not null,
  business_phone text,
  business_address text,
  tax_office text not null,
  tax_number text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  review_note text,
  workshop_id uuid references public.workshops(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_business_applications_status_submitted on public.business_applications(status, submitted_at desc);
create index if not exists idx_business_applications_reviewed_by on public.business_applications(reviewed_by);
create index if not exists idx_business_applications_workshop on public.business_applications(workshop_id);

alter table public.business_applications enable row level security;
drop policy if exists business_applications_select_self on public.business_applications;
create policy business_applications_select_self on public.business_applications for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists business_applications_select_admin on public.business_applications;
create policy business_applications_select_admin on public.business_applications for select to authenticated using (public.is_admin());

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
    if char_length(trim(coalesce(new.raw_user_meta_data ->> 'business_name', ''))) < 2 then raise exception 'İşletme adı zorunludur'; end if;
    if char_length(trim(coalesce(new.raw_user_meta_data ->> 'business_tax_office', ''))) < 2 then raise exception 'Vergi Dairesi zorunludur'; end if;
    if length(normalized_tax) not in (10, 11) then raise exception 'Vergi Numarası 10 veya 11 haneli olmalıdır'; end if;

    insert into public.business_applications(
      user_id, business_name, business_phone, business_address, tax_office, tax_number, status, submitted_at, updated_at
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

create or replace function public.set_profile_account_mode(p_mode text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if p_mode not in ('staff', 'customer') then raise exception 'Geçersiz hesap görünümü'; end if;
  if p_mode = 'staff' and not public.is_admin() and not exists (
    select 1 from public.workshop_members wm where wm.user_id = auth.uid() and wm.is_active
  ) then
    raise exception 'İşletme veya personel paneli için Admin onayı ya da aktif işletme üyeliği gerekir';
  end if;
  update public.profiles set account_mode = p_mode, updated_at = now() where id = auth.uid();
end;
$$;

create or replace function public.create_workshop(
  p_name text,
  p_phone text default null,
  p_address text default null,
  p_tax_office text default null,
  p_tax_number text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Yeni işletme yalnız Admin onayıyla oluşturulabilir'; end if;
  return public.admin_create_workshop(p_name, p_phone, p_address, p_tax_office, p_tax_number);
end;
$$;

create or replace function public.admin_get_business_applications()
returns table(
  id uuid,
  user_id uuid,
  applicant_name text,
  applicant_email text,
  applicant_phone text,
  business_name text,
  business_phone text,
  business_address text,
  tax_office text,
  tax_number text,
  status text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  review_note text,
  workshop_id uuid
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select ba.id, ba.user_id, p.full_name, u.email::text, p.phone, ba.business_name, ba.business_phone,
         ba.business_address, ba.tax_office, ba.tax_number, ba.status, ba.submitted_at,
         ba.reviewed_at, ba.review_note, ba.workshop_id
  from public.business_applications ba
  join public.profiles p on p.id = ba.user_id
  left join auth.users u on u.id = ba.user_id
  where public.is_admin()
  order by case ba.status when 'pending' then 0 when 'approved' then 1 else 2 end, ba.submitted_at desc;
$$;

create or replace function public.admin_review_business_application(
  p_application_id uuid,
  p_approve boolean,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  application_record public.business_applications%rowtype;
  new_workshop_id uuid;
begin
  if not public.is_admin() then raise exception 'Bu işlem yalnızca Admin tarafından yapılabilir'; end if;

  select * into application_record from public.business_applications where id = p_application_id for update;
  if application_record.id is null then raise exception 'Başvuru bulunamadı'; end if;
  if application_record.status <> 'pending' then raise exception 'Başvuru daha önce sonuçlandırılmış'; end if;

  if p_approve then
    insert into public.workshops(name, phone, address, tax_office, tax_number, created_by, is_active)
    values (
      application_record.business_name,
      application_record.business_phone,
      application_record.business_address,
      application_record.tax_office,
      application_record.tax_number,
      application_record.user_id,
      true
    ) returning id into new_workshop_id;

    insert into public.workshop_members(workshop_id, user_id, role, is_active)
    values (new_workshop_id, application_record.user_id, 'owner_mechanic', true)
    on conflict (workshop_id, user_id) do update set role = 'owner_mechanic', is_active = true;

    update public.profiles set account_mode = 'staff', updated_at = now() where id = application_record.user_id;
    update public.business_applications
    set status = 'approved', workshop_id = new_workshop_id, reviewed_at = now(), reviewed_by = auth.uid(), review_note = nullif(trim(p_note), ''), updated_at = now()
    where id = p_application_id;
  else
    update public.business_applications
    set status = 'rejected', reviewed_at = now(), reviewed_by = auth.uid(), review_note = nullif(trim(p_note), ''), updated_at = now()
    where id = p_application_id;
  end if;

  return new_workshop_id;
end;
$$;

revoke all on table public.business_applications from anon;
revoke all on function public.admin_get_business_applications() from public, anon;
revoke all on function public.admin_review_business_application(uuid, boolean, text) from public, anon;
grant select on table public.business_applications to authenticated, service_role;
grant execute on function public.admin_get_business_applications() to authenticated, service_role;
grant execute on function public.admin_review_business_application(uuid, boolean, text) to authenticated, service_role;
