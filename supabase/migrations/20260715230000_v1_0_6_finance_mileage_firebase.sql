-- DraBornGarage v1.0.6: optional price, collection-derived net price, mileage flows

alter table public.profiles
  add column if not exists customer_motorcycle_odometer integer;

alter table public.appointments
  add column if not exists odometer integer;

alter table public.profiles drop constraint if exists profiles_customer_motorcycle_odometer_check;
alter table public.profiles add constraint profiles_customer_motorcycle_odometer_check
  check (customer_motorcycle_odometer is null or customer_motorcycle_odometer >= 0);

alter table public.appointments drop constraint if exists appointments_odometer_check;
alter table public.appointments add constraint appointments_odometer_check
  check (odometer is null or odometer >= 0);

create or replace function public.sync_new_user_customer_odometer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_odometer integer;
begin
  begin
    v_odometer := nullif(regexp_replace(coalesce(new.raw_user_meta_data ->> 'customer_motorcycle_odometer',''), '[^0-9]', '', 'g'), '')::integer;
  exception when others then
    v_odometer := null;
  end;
  update public.profiles
  set customer_motorcycle_odometer = v_odometer,
      updated_at = now()
  where id = new.id and v_odometer is not null;
  return new;
end;
$$;

drop trigger if exists zz_draborngarage_customer_odometer on auth.users;
create trigger zz_draborngarage_customer_odometer
after insert on auth.users
for each row execute function public.sync_new_user_customer_odometer();

update public.profiles p
set customer_motorcycle_odometer = nullif(regexp_replace(coalesce(u.raw_user_meta_data ->> 'customer_motorcycle_odometer',''), '[^0-9]', '', 'g'), '')::integer
from auth.users u
where u.id = p.id
  and p.customer_motorcycle_odometer is null
  and nullif(regexp_replace(coalesce(u.raw_user_meta_data ->> 'customer_motorcycle_odometer',''), '[^0-9]', '', 'g'), '') is not null;

create or replace function public.sync_linked_profile_odometer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plate text;
  v_odometer integer;
begin
  if new.status = 'approved' then
    select customer_plate, customer_motorcycle_odometer
    into v_plate, v_odometer
    from public.profiles
    where id = new.user_id;

    if v_odometer is not null and nullif(public.normalize_plate(v_plate), '') is not null then
      update public.motorcycles m
      set odometer = v_odometer
      where m.workshop_id = new.workshop_id
        and m.customer_id = new.customer_id
        and public.normalize_plate(m.plate) = public.normalize_plate(v_plate);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists zz_sync_linked_profile_odometer on public.customer_links;
create trigger zz_sync_linked_profile_odometer
after insert or update of status on public.customer_links
for each row execute function public.sync_linked_profile_odometer();

create or replace function public.update_work_order_status(p_work_order_id uuid, p_status public.work_order_status)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_workshop uuid;
begin
  select workshop_id into target_workshop
  from public.work_orders
  where id = p_work_order_id;

  if target_workshop is null then raise exception 'İş emri bulunamadı'; end if;

  if not public.is_admin()
     and not public.is_workshop_owner(target_workshop)
     and not (public.is_workshop_worker(target_workshop) and public.can_access_work_order(p_work_order_id))
     and not (public.is_workshop_apprentice(target_workshop) and p_status in ('precheck','parts_waiting','testing')) then
    raise exception 'Servis durumunu değiştirme yetkiniz yok';
  end if;

  if p_status in ('repair_started','testing','ready','completed','delivered')
     and exists (select 1 from public.work_order_extra_requests where work_order_id=p_work_order_id and status='pending') then
    raise exception 'Bekleyen ek işlem onayı sonuçlanmadan bu aşamaya geçilemez';
  end if;

  if p_status = 'extra_approval_waiting'
     and not exists (select 1 from public.work_order_extra_requests where work_order_id=p_work_order_id and status='pending') then
    raise exception 'Onay bekleyen ek işlem bulunamadı';
  end if;

  update public.work_orders set status=p_status where id=p_work_order_id;
end;
$$;

create or replace function public.validate_work_order_price()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.price_type = 'fixed'::public.price_type and new.quoted_price is not null then
    if new.quoted_price <= 0 then raise exception 'Net ücret sıfırdan büyük olmalıdır'; end if;
    new.price_entered_at := coalesce(new.price_entered_at, now());
  elsif new.price_type = 'estimated'::public.price_type
    and new.estimated_price_min is not null and new.estimated_price_max is not null then
    if new.estimated_price_min <= 0 then raise exception 'Tahmini alt fiyat sıfırdan büyük olmalıdır'; end if;
    if new.estimated_price_max < new.estimated_price_min then raise exception 'Tahmini üst fiyat alt fiyattan küçük olamaz'; end if;
    new.price_entered_at := coalesce(new.price_entered_at, now());
  end if;
  return new;
end;
$$;

create or replace function public.staff_record_payment(
  p_work_order_id uuid,
  p_amount numeric,
  p_method text,
  p_note text default null,
  p_paid_at timestamptz default now(),
  p_collection_source text default 'service'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.work_orders%rowtype;
  v_id uuid;
  v_remaining numeric(12,2);
begin
  if not public.can_manage_receivable(p_work_order_id) then raise exception 'Tahsilat kaydetme yetkiniz yok'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Geçerli tahsilat tutarı girin'; end if;
  if p_method not in ('cash','transfer') then raise exception 'Yalnız Nakit veya IBAN kullanılabilir'; end if;
  if p_collection_source not in ('service','receivable') then raise exception 'Geçersiz tahsilat kaynağı'; end if;

  select * into v_order from public.work_orders where id=p_work_order_id for update;
  if not found then raise exception 'Servis kaydı bulunamadı'; end if;

  if coalesce(v_order.total_amount,0) <= 0 then
    update public.work_orders
    set price_type='fixed'::public.price_type,
        quoted_price=p_amount,
        estimated_price_min=null,
        estimated_price_max=null,
        price_entered_at=coalesce(price_entered_at,now())
    where id=p_work_order_id;
    perform public.refresh_work_order_totals(p_work_order_id);
    select * into v_order from public.work_orders where id=p_work_order_id for update;
  end if;

  v_remaining := greatest(0, v_order.total_amount-v_order.amount_received);
  if p_amount > v_remaining then raise exception 'Tahsilat kalan borçtan fazla olamaz. Kalan: %', v_remaining; end if;

  insert into public.payments(work_order_id,workshop_id,amount,payment_method,received_by,note,paid_at,collection_source)
  values(p_work_order_id,v_order.workshop_id,p_amount,p_method::public.payment_method,auth.uid(),nullif(trim(p_note),''),coalesce(p_paid_at,now()),p_collection_source)
  returning id into v_id;

  if v_order.status <> 'delivered'::public.work_order_status then
    perform public.update_work_order_status(p_work_order_id,'delivered'::public.work_order_status);
  end if;
  return v_id;
end;
$$;

drop function if exists public.staff_open_receivable(uuid,date,text,text);
create function public.staff_open_receivable(
  p_work_order_id uuid,
  p_due_date date,
  p_staff_note text default null,
  p_customer_note text default null,
  p_amount numeric default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.work_orders%rowtype;
  v_old public.receivable_status;
begin
  if not public.can_manage_receivable(p_work_order_id) then raise exception 'Alacak kaydını yönetme yetkiniz yok'; end if;
  select * into v_order from public.work_orders where id=p_work_order_id for update;
  if not found then raise exception 'Servis kaydı bulunamadı'; end if;

  if coalesce(v_order.total_amount,0) <= 0 then
    if p_amount is null or p_amount <= 0 then raise exception 'Borç tutarı girin'; end if;
    update public.work_orders
    set price_type='fixed'::public.price_type,
        quoted_price=p_amount,
        estimated_price_min=null,
        estimated_price_max=null,
        price_entered_at=coalesce(price_entered_at,now())
    where id=p_work_order_id;
    perform public.refresh_work_order_totals(p_work_order_id);
    select * into v_order from public.work_orders where id=p_work_order_id for update;
  end if;

  if v_order.total_amount <= v_order.amount_received then raise exception 'Bu serviste kalan borç bulunmuyor'; end if;
  v_old := v_order.receivable_status;

  update public.work_orders
  set receivable_status='open',
      debt_promised_date=p_due_date,
      debt_written_at=coalesce(debt_written_at,now()),
      debt_closed_at=null,
      debt_note=nullif(trim(p_staff_note),''),
      debt_customer_note=nullif(trim(p_customer_note),'')
  where id=p_work_order_id;

  if nullif(trim(p_staff_note),'') is not null then
    insert into public.receivable_notes(work_order_id,workshop_id,author_id,visibility,note)
    values(p_work_order_id,v_order.workshop_id,auth.uid(),'staff',trim(p_staff_note));
  end if;
  if nullif(trim(p_customer_note),'') is not null then
    insert into public.receivable_notes(work_order_id,workshop_id,author_id,visibility,note)
    values(p_work_order_id,v_order.workshop_id,auth.uid(),'customer',trim(p_customer_note));
  end if;

  insert into public.receivable_events(work_order_id,workshop_id,actor_id,event_type,old_status,new_status,note)
  values(p_work_order_id,v_order.workshop_id,auth.uid(),case when v_old='not_set' then 'receivable_opened' else 'receivable_updated' end,v_old,'open',concat_ws(' • ',case when p_due_date is not null then 'Söz tarihi: '||p_due_date::text end,nullif(trim(p_staff_note),'')));

  if v_order.status <> 'delivered'::public.work_order_status then
    perform public.update_work_order_status(p_work_order_id,'delivered'::public.work_order_status);
  end if;
end;
$$;

drop function if exists public.customer_create_appointment(uuid,uuid,uuid,text,text,timestamptz,timestamptz);
create function public.customer_create_appointment(
  p_workshop_id uuid,
  p_motorcycle_id uuid,
  p_mechanic_id uuid,
  p_service_title text,
  p_customer_note text,
  p_scheduled_start timestamptz,
  p_scheduled_end timestamptz,
  p_odometer integer default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_customer uuid;
  new_id uuid;
  auto_confirm boolean;
  new_status text;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if length(trim(coalesce(p_service_title,''))) < 3 then raise exception 'Yapılacak işlem en az 3 karakter olmalı'; end if;
  if p_odometer is not null and p_odometer < 0 then raise exception 'Kilometre geçersiz'; end if;

  select m.customer_id into target_customer
  from public.motorcycles m
  join public.customer_links cl on cl.customer_id=m.customer_id and cl.workshop_id=m.workshop_id and cl.user_id=auth.uid() and cl.status='approved'
  where m.id=p_motorcycle_id and m.workshop_id=p_workshop_id;
  if target_customer is null then raise exception 'Bu motor hesabınıza bağlı değil'; end if;
  if not public.appointment_slot_available(p_workshop_id,p_mechanic_id,p_scheduled_start,p_scheduled_end,null) then raise exception 'Seçilen saat artık müsait değil'; end if;

  select appointment_auto_confirm into auto_confirm from public.workshops where id=p_workshop_id and is_active and appointments_enabled;
  if auto_confirm is null then raise exception 'İşletmede randevu sistemi kapalı'; end if;
  new_status := case when auto_confirm then 'confirmed' else 'pending' end;

  if p_odometer is not null then
    update public.motorcycles set odometer=p_odometer where id=p_motorcycle_id;
    update public.profiles set customer_motorcycle_odometer=p_odometer,updated_at=now() where id=auth.uid();
  end if;

  insert into public.appointments(workshop_id,customer_id,motorcycle_id,mechanic_id,service_title,customer_note,scheduled_start,scheduled_end,status,source,requested_by,created_by,confirmed_by,confirmed_at,odometer)
  values(p_workshop_id,target_customer,p_motorcycle_id,p_mechanic_id,trim(p_service_title),nullif(trim(p_customer_note),''),p_scheduled_start,p_scheduled_end,new_status,'customer',auth.uid(),auth.uid(),case when auto_confirm then auth.uid() else null end,case when auto_confirm then now() else null end,p_odometer)
  returning id into new_id;

  insert into public.appointment_events(appointment_id,workshop_id,actor_id,event_type,new_status,new_start,note)
  values(new_id,p_workshop_id,auth.uid(),'created',new_status,p_scheduled_start,'Müşteri randevu talebi oluşturdu');
  return new_id;
end;
$$;

drop function if exists public.customer_create_open_appointment(uuid,uuid,text,text,text,text,text,timestamptz,timestamptz);
create function public.customer_create_open_appointment(
  p_workshop_id uuid,
  p_mechanic_id uuid,
  p_brand text,
  p_model text,
  p_plate text,
  p_service_title text,
  p_customer_note text,
  p_scheduled_start timestamptz,
  p_scheduled_end timestamptz,
  p_odometer integer default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_rec public.profiles%rowtype;
  target_customer_id uuid;
  target_motorcycle_id uuid;
  new_id uuid;
  auto_confirm boolean;
  new_status text;
  normalized_plate text := public.normalize_plate(p_plate);
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if length(trim(coalesce(p_service_title,''))) < 3 then raise exception 'Yapılacak işlem en az 3 karakter olmalı'; end if;
  if length(normalized_plate) < 5 then raise exception 'Geçerli plaka gerekli'; end if;
  if length(trim(coalesce(p_brand,''))) < 2 or length(trim(coalesce(p_model,''))) < 1 then raise exception 'Motosiklet marka ve modeli gerekli'; end if;
  if p_odometer is not null and p_odometer < 0 then raise exception 'Kilometre geçersiz'; end if;

  select * into profile_rec from public.profiles where id=auth.uid();
  if profile_rec.id is null then raise exception 'Kullanıcı profili bulunamadı'; end if;
  if not exists(select 1 from public.workshop_members wm where wm.workshop_id=p_workshop_id and wm.user_id=p_mechanic_id and wm.is_active and wm.role in ('mechanic','owner_mechanic')) then raise exception 'Seçilen Usta bu işletmede aktif değil'; end if;
  if not public.appointment_slot_available(p_workshop_id,p_mechanic_id,p_scheduled_start,p_scheduled_end,null) then raise exception 'Seçilen saat artık müsait değil'; end if;

  select appointment_auto_confirm into auto_confirm from public.workshops where id=p_workshop_id and is_active and appointments_enabled;
  if auto_confirm is null then raise exception 'İşletmede randevu sistemi kapalı'; end if;

  select m.id,m.customer_id into target_motorcycle_id,target_customer_id
  from public.motorcycles m where m.workshop_id=p_workshop_id and public.normalize_plate(m.plate)=normalized_plate
  order by m.created_at desc limit 1;

  if target_customer_id is null then
    select c.id into target_customer_id from public.customers c
    where c.workshop_id=p_workshop_id and (c.created_by=auth.uid() or (profile_rec.phone is not null and public.normalize_phone(c.phone)=public.normalize_phone(profile_rec.phone)))
    order by c.created_at desc limit 1;
  end if;
  if target_customer_id is null then
    insert into public.customers(workshop_id,full_name,phone,note,created_by)
    values(p_workshop_id,profile_rec.full_name,profile_rec.phone,'Uygulama üzerinden randevu oluşturan kullanıcı',auth.uid())
    returning id into target_customer_id;
  end if;

  if target_motorcycle_id is null then
    insert into public.motorcycles(workshop_id,customer_id,brand,model,plate,odometer,note,created_by)
    values(p_workshop_id,target_customer_id,trim(p_brand),trim(p_model),normalized_plate,p_odometer,'Randevu sırasında oluşturuldu',auth.uid())
    returning id into target_motorcycle_id;
  elsif p_odometer is not null then
    update public.motorcycles set odometer=p_odometer where id=target_motorcycle_id;
  end if;

  if p_odometer is not null then
    update public.profiles set customer_motorcycle_odometer=p_odometer,updated_at=now() where id=auth.uid();
  end if;

  new_status := case when auto_confirm then 'confirmed' else 'pending' end;
  insert into public.appointments(workshop_id,customer_id,motorcycle_id,mechanic_id,service_title,customer_note,scheduled_start,scheduled_end,status,source,requested_by,created_by,confirmed_by,confirmed_at,odometer)
  values(p_workshop_id,target_customer_id,target_motorcycle_id,p_mechanic_id,trim(p_service_title),nullif(trim(p_customer_note),''),p_scheduled_start,p_scheduled_end,new_status,'customer',auth.uid(),auth.uid(),case when auto_confirm then auth.uid() else null end,case when auto_confirm then now() else null end,p_odometer)
  returning id into new_id;

  insert into public.appointment_events(appointment_id,workshop_id,actor_id,event_type,new_status,new_start,note)
  values(new_id,p_workshop_id,auth.uid(),'created',new_status,p_scheduled_start,'Bağlantı gerektirmeyen müşteri randevu talebi oluşturuldu');
  return new_id;
end;
$$;

create or replace function public.staff_convert_appointment_to_work_order(
  p_appointment_id uuid,
  p_waiting_status public.customer_waiting_status default 'left_vehicle',
  p_odometer integer default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  order_id uuid;
  v_odometer integer;
begin
  select * into rec from public.appointments where id=p_appointment_id;
  if rec.id is null then raise exception 'Randevu bulunamadı'; end if;
  if not public.is_admin() and not public.is_workshop_owner(rec.workshop_id) and not (public.is_workshop_worker(rec.workshop_id) and auth.uid()=rec.mechanic_id) then raise exception 'Randevuyu servise dönüştürme yetkiniz yok'; end if;
  if rec.status not in ('pending','confirmed','arrived') then raise exception 'Bu randevu servise dönüştürülemez'; end if;
  select id into order_id from public.work_orders where appointment_id=rec.id;
  if order_id is not null then return order_id; end if;

  v_odometer := coalesce(p_odometer,rec.odometer);
  insert into public.work_orders(workshop_id,customer_id,motorcycle_id,assigned_mechanic_id,complaint,notes,odometer_in,arrived_at,service_type,customer_waiting_status,status,appointment_id,created_by)
  values(rec.workshop_id,rec.customer_id,rec.motorcycle_id,rec.mechanic_id,rec.service_title,concat_ws(E'\n',nullif(rec.customer_note,''),nullif(rec.staff_note,'')),v_odometer,now(),'appointment',p_waiting_status,'queued',rec.id,auth.uid())
  returning id into order_id;

  update public.appointments set status='converted',converted_at=now(),arrived_at=coalesce(arrived_at,now()) where id=rec.id;
  insert into public.appointment_events(appointment_id,workshop_id,actor_id,event_type,old_status,new_status,old_start,new_start,note)
  values(rec.id,rec.workshop_id,auth.uid(),'converted',rec.status,'converted',rec.scheduled_start,rec.scheduled_start,'Randevu servis kaydına dönüştürüldü');
  return order_id;
end;
$$;

grant execute on function public.staff_record_payment(uuid,numeric,text,text,timestamptz,text) to authenticated;
grant execute on function public.staff_open_receivable(uuid,date,text,text,numeric) to authenticated;
grant execute on function public.customer_create_appointment(uuid,uuid,uuid,text,text,timestamptz,timestamptz,integer) to authenticated;
grant execute on function public.customer_create_open_appointment(uuid,uuid,text,text,text,text,text,timestamptz,timestamptz,integer) to authenticated;
grant execute on function public.staff_convert_appointment_to_work_order(uuid,public.customer_waiting_status,integer) to authenticated;
