-- DraBornGarage v1.0.3 RC
-- İşletme/Usta kayıtlarının ilk girişte müşteri ekranı yerine başvuru merkezine yönlendirilmesi.

create or replace function public.customer_get_workshop_access_requests()
returns table(
  id uuid,
  workshop_id uuid,
  workshop_name text,
  workshop_phone text,
  workshop_address text,
  request_business_panel boolean,
  request_mechanic_panel boolean,
  source text,
  status text,
  applicant_note text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  review_note text
)
language sql
security definer
set search_path=public
as $$
  select
    r.id,
    r.workshop_id,
    w.name as workshop_name,
    w.phone as workshop_phone,
    w.address as workshop_address,
    r.request_business_panel,
    r.request_mechanic_panel,
    r.source,
    r.status,
    r.applicant_note,
    r.submitted_at,
    r.reviewed_at,
    r.review_note
  from public.workshop_access_requests r
  join public.workshops w on w.id=r.workshop_id
  where r.user_id=auth.uid()
  order by r.submitted_at desc;
$$;

revoke all on function public.customer_get_workshop_access_requests() from public,anon;
grant execute on function public.customer_get_workshop_access_requests() to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare
  requested_mode text := coalesce(new.raw_user_meta_data ->> 'requested_account_mode',new.raw_user_meta_data ->> 'account_mode','customer');
  primary_admin boolean := lower(coalesce(new.email,''))='draborneagle@gmail.com';
  normalized_tax text := regexp_replace(coalesce(new.raw_user_meta_data ->> 'business_tax_number',''),'[^0-9]','','g');
  join_existing boolean := coalesce((new.raw_user_meta_data ->> 'join_existing_workshop')::boolean,false);
  request_mechanic boolean := coalesce((new.raw_user_meta_data ->> 'request_mechanic_panel')::boolean,false);
  existing_workshop uuid;
  access_request_id uuid;
begin
  insert into public.profiles(
    id,full_name,phone,is_admin,account_mode,
    customer_plate,customer_motorcycle_brand,customer_motorcycle_model
  ) values(
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name',split_part(coalesce(new.email,''),'@',1)),
    nullif(new.raw_user_meta_data ->> 'phone',''),
    primary_admin,
    case when primary_admin or requested_mode='staff' then 'staff' else 'customer' end,
    case when requested_mode='customer' then nullif(public.normalize_plate(new.raw_user_meta_data ->> 'customer_plate'),'') else null end,
    case when requested_mode='customer' then nullif(trim(new.raw_user_meta_data ->> 'customer_motorcycle_brand'),'') else null end,
    case when requested_mode='customer' then nullif(trim(new.raw_user_meta_data ->> 'customer_motorcycle_model'),'') else null end
  )
  on conflict(id) do update set
    full_name=excluded.full_name,
    phone=coalesce(excluded.phone,public.profiles.phone),
    is_admin=primary_admin or public.profiles.is_admin,
    account_mode=case when primary_admin or requested_mode='staff' then 'staff' else public.profiles.account_mode end,
    customer_plate=coalesce(excluded.customer_plate,public.profiles.customer_plate),
    customer_motorcycle_brand=coalesce(excluded.customer_motorcycle_brand,public.profiles.customer_motorcycle_brand),
    customer_motorcycle_model=coalesce(excluded.customer_motorcycle_model,public.profiles.customer_motorcycle_model),
    updated_at=now();

  if requested_mode='staff' and not primary_admin then
    if join_existing then
      begin
        existing_workshop := nullif(new.raw_user_meta_data ->> 'existing_workshop_id','')::uuid;
      exception when others then
        raise exception 'Seçilen işletme bilgisi geçersiz';
      end;
      if existing_workshop is null or not exists(select 1 from public.workshops where id=existing_workshop and is_active) then
        raise exception 'Seçilen işletme bulunamadı veya aktif değil';
      end if;

      insert into public.workshop_access_requests(
        workshop_id,user_id,request_business_panel,request_mechanic_panel,source,status,
        applicant_note,submitted_at,updated_at
      ) values(
        existing_workshop,new.id,true,request_mechanic,'registration','pending',
        case when request_mechanic then 'Kayıt sırasında işletme + Usta erişimi istendi' else 'Kayıt sırasında işletme erişimi istendi' end,
        now(),now()
      )
      on conflict(workshop_id,user_id) do update set
        request_business_panel=true,
        request_mechanic_panel=excluded.request_mechanic_panel,
        source='registration',status='pending',applicant_note=excluded.applicant_note,
        submitted_at=now(),reviewed_at=null,reviewed_by=null,review_note=null,updated_at=now()
      returning id into access_request_id;

      insert into public.user_notifications(
        user_id,workshop_id,category,notification_type,priority,entity_type,entity_id,
        title,body,data,dedupe_key
      )
      select wm.user_id,existing_workshop,'system','workshop_partner_registration','high',
        'workshop_access_request',access_request_id,'Yeni işletme erişim başvurusu',
        coalesce(new.raw_user_meta_data ->> 'full_name',split_part(coalesce(new.email,''),'@',1))||
        case when request_mechanic then ' işletme ve Usta paneli için onay bekliyor.' else ' işletme paneli için onay bekliyor.' end,
        jsonb_build_object('target_tab','team','target_section','access_requests','request_id',access_request_id,'workshop_id',existing_workshop),
        'partner-registration:'||access_request_id::text||':'||wm.user_id::text
      from public.workshop_members wm
      where wm.workshop_id=existing_workshop and wm.is_active and wm.role in ('owner','owner_mechanic')
      on conflict(user_id,dedupe_key) where dedupe_key is not null do update set
        read_at=null,archived_at=null,deliver_at=now(),updated_at=now(),
        push_attempted_at=null,push_sent_at=null,push_error=null;
    else
      if char_length(trim(coalesce(new.raw_user_meta_data ->> 'business_name','')))<2 then raise exception 'İşletme adı zorunludur'; end if;
      if char_length(trim(coalesce(new.raw_user_meta_data ->> 'business_tax_office','')))<2 then raise exception 'Vergi Dairesi zorunludur'; end if;
      if length(normalized_tax) not in (10,11) then raise exception 'Vergi Numarası 10 veya 11 haneli olmalıdır'; end if;

      insert into public.business_applications(
        user_id,business_name,business_phone,business_address,
        tax_office,tax_number,status,submitted_at,updated_at
      ) values(
        new.id,trim(new.raw_user_meta_data ->> 'business_name'),
        nullif(trim(new.raw_user_meta_data ->> 'business_phone'),''),
        nullif(trim(new.raw_user_meta_data ->> 'business_address'),''),
        trim(new.raw_user_meta_data ->> 'business_tax_office'),normalized_tax,'pending',now(),now()
      )
      on conflict(user_id) do update set
        business_name=excluded.business_name,business_phone=excluded.business_phone,
        business_address=excluded.business_address,tax_office=excluded.tax_office,
        tax_number=excluded.tax_number,status='pending',reviewed_at=null,reviewed_by=null,
        review_note=null,workshop_id=null,submitted_at=now(),updated_at=now();
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public,anon,authenticated;

update public.profiles p
set account_mode='staff',updated_at=now()
where not coalesce(p.is_admin,false)
  and p.account_mode='customer'
  and (
    exists(
      select 1 from public.workshop_access_requests r
      where r.user_id=p.id and r.source='registration'
    )
    or exists(
      select 1 from public.business_applications b
      where b.user_id=p.id
    )
  );
