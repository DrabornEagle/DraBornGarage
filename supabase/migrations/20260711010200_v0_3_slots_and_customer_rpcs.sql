create or replace function public.can_manage_mechanic_schedule(p_workshop_id uuid, p_mechanic_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or public.is_workshop_owner(p_workshop_id) or (auth.uid() = p_mechanic_id and public.is_workshop_worker(p_workshop_id));
$$;

create or replace function public.appointment_slot_available(
  p_workshop_id uuid, p_mechanic_id uuid, p_start timestamptz, p_end timestamptz, p_exclude_appointment_id uuid default null
)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare tz text; local_start timestamp; local_end timestamp; schedule_rec record;
begin
  if p_end <= p_start then return false; end if;
  select timezone into tz from public.workshops where id = p_workshop_id and is_active and appointments_enabled;
  if tz is null then return false; end if;
  if not exists (select 1 from public.workshop_members wm where wm.workshop_id = p_workshop_id and wm.user_id = p_mechanic_id and wm.is_active and wm.role in ('mechanic'::public.member_role, 'owner_mechanic'::public.member_role) and wm.availability_status <> 'off') then return false; end if;
  local_start := p_start at time zone tz; local_end := p_end at time zone tz;
  if local_start::date <> local_end::date then return false; end if;
  select * into schedule_rec from public.mechanic_working_hours h where h.workshop_id = p_workshop_id and h.mechanic_id = p_mechanic_id and h.day_of_week = extract(dow from local_start)::int;
  if schedule_rec.id is null or not schedule_rec.is_working then return false; end if;
  if local_start::time < schedule_rec.start_time or local_end::time > schedule_rec.end_time then return false; end if;
  if schedule_rec.break_start is not null and local_start::time < schedule_rec.break_end and local_end::time > schedule_rec.break_start then return false; end if;
  if exists (select 1 from public.mechanic_time_off t where t.workshop_id = p_workshop_id and t.mechanic_id = p_mechanic_id and tstzrange(t.starts_at, t.ends_at, '[)') && tstzrange(p_start, p_end, '[)')) then return false; end if;
  if exists (select 1 from public.appointments a where a.workshop_id = p_workshop_id and a.mechanic_id = p_mechanic_id and a.status in ('pending','confirmed','arrived') and (p_exclude_appointment_id is null or a.id <> p_exclude_appointment_id) and tstzrange(a.scheduled_start, a.scheduled_end, '[)') && tstzrange(p_start, p_end, '[)')) then return false; end if;
  return true;
end;
$$;

create or replace function public.appointment_get_available_slots(p_workshop_id uuid, p_mechanic_id uuid, p_date date, p_exclude_appointment_id uuid default null)
returns table(slot_start timestamptz, slot_end timestamptz, slot_label text)
language plpgsql stable security definer set search_path = public as $$
declare w record; h record; local_start timestamp; local_last timestamp; candidate timestamp;
begin
  select timezone, appointment_booking_days, appointment_min_notice_minutes, appointments_enabled into w from public.workshops where id = p_workshop_id and is_active;
  if w.timezone is null or not w.appointments_enabled then return; end if;
  if p_date < (now() at time zone w.timezone)::date or p_date > (now() at time zone w.timezone)::date + w.appointment_booking_days then return; end if;
  select * into h from public.mechanic_working_hours where workshop_id = p_workshop_id and mechanic_id = p_mechanic_id and day_of_week = extract(dow from p_date)::int and is_working;
  if h.id is null then return; end if;
  local_start := p_date + h.start_time; local_last := p_date + h.end_time - make_interval(mins => h.slot_minutes);
  for candidate in select generate_series(local_start, local_last, make_interval(mins => h.slot_minutes)) loop
    slot_start := candidate at time zone w.timezone; slot_end := (candidate + make_interval(mins => h.slot_minutes)) at time zone w.timezone;
    if slot_start >= now() + make_interval(mins => w.appointment_min_notice_minutes) and public.appointment_slot_available(p_workshop_id, p_mechanic_id, slot_start, slot_end, p_exclude_appointment_id) then slot_label := to_char(candidate, 'HH24:MI'); return next; end if;
  end loop;
end;
$$;

create or replace function public.customer_get_appointment_mechanics(p_workshop_id uuid)
returns table(mechanic_id uuid, full_name text, availability_status text)
language sql stable security definer set search_path = public as $$
  select wm.user_id, p.full_name, wm.availability_status from public.workshop_members wm join public.profiles p on p.id = wm.user_id join public.workshops w on w.id = wm.workshop_id and w.is_active and w.appointments_enabled
  where wm.workshop_id = p_workshop_id and wm.is_active and wm.role in ('mechanic'::public.member_role, 'owner_mechanic'::public.member_role) and wm.availability_status <> 'off'
  and exists (select 1 from public.customer_links cl where cl.user_id = auth.uid() and cl.workshop_id = p_workshop_id and cl.status = 'approved') order by p.full_name;
$$;

create or replace function public.customer_get_appointments(p_workshop_id uuid)
returns table(id uuid, workshop_id uuid, workshop_name text, customer_id uuid, motorcycle_id uuid, brand text, model text, plate text, mechanic_id uuid, mechanic_name text, service_title text, customer_note text, scheduled_start timestamptz, scheduled_end timestamptz, status text, source text, cancellation_reason text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select distinct a.id, a.workshop_id, w.name, a.customer_id, a.motorcycle_id, m.brand, m.model, m.plate, a.mechanic_id, p.full_name, a.service_title, a.customer_note, a.scheduled_start, a.scheduled_end, a.status, a.source, a.cancellation_reason, a.created_at
  from public.appointments a join public.workshops w on w.id=a.workshop_id join public.motorcycles m on m.id=a.motorcycle_id join public.profiles p on p.id=a.mechanic_id
  join public.customer_links cl on cl.customer_id=a.customer_id and cl.workshop_id=a.workshop_id and cl.user_id=auth.uid() and cl.status='approved'
  where a.workshop_id=p_workshop_id order by a.scheduled_start desc;
$$;

create or replace function public.customer_create_appointment(p_workshop_id uuid, p_motorcycle_id uuid, p_mechanic_id uuid, p_service_title text, p_customer_note text, p_scheduled_start timestamptz, p_scheduled_end timestamptz)
returns uuid language plpgsql security definer set search_path = public as $$
declare target_customer uuid; new_id uuid; auto_confirm boolean; new_status text;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if length(trim(coalesce(p_service_title,''))) < 3 then raise exception 'Yapılacak işlem en az 3 karakter olmalı'; end if;
  select m.customer_id into target_customer from public.motorcycles m join public.customer_links cl on cl.customer_id=m.customer_id and cl.workshop_id=m.workshop_id and cl.user_id=auth.uid() and cl.status='approved' where m.id=p_motorcycle_id and m.workshop_id=p_workshop_id;
  if target_customer is null then raise exception 'Bu motor hesabınıza bağlı değil'; end if;
  if not public.appointment_slot_available(p_workshop_id,p_mechanic_id,p_scheduled_start,p_scheduled_end,null) then raise exception 'Seçilen saat artık müsait değil'; end if;
  select appointment_auto_confirm into auto_confirm from public.workshops where id=p_workshop_id and is_active and appointments_enabled;
  if auto_confirm is null then raise exception 'İşletmede randevu sistemi kapalı'; end if;
  new_status := case when auto_confirm then 'confirmed' else 'pending' end;
  insert into public.appointments(workshop_id,customer_id,motorcycle_id,mechanic_id,service_title,customer_note,scheduled_start,scheduled_end,status,source,requested_by,created_by,confirmed_by,confirmed_at)
  values(p_workshop_id,target_customer,p_motorcycle_id,p_mechanic_id,trim(p_service_title),nullif(trim(p_customer_note),''),p_scheduled_start,p_scheduled_end,new_status,'customer',auth.uid(),auth.uid(),case when auto_confirm then auth.uid() else null end,case when auto_confirm then now() else null end) returning id into new_id;
  insert into public.appointment_events(appointment_id,workshop_id,actor_id,event_type,new_status,new_start,note) values(new_id,p_workshop_id,auth.uid(),'created',new_status,p_scheduled_start,'Müşteri randevu talebi oluşturdu');
  return new_id;
end;
$$;

create or replace function public.customer_cancel_appointment(p_appointment_id uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare rec record;
begin
  select a.* into rec from public.appointments a join public.customer_links cl on cl.customer_id=a.customer_id and cl.workshop_id=a.workshop_id and cl.user_id=auth.uid() and cl.status='approved' where a.id=p_appointment_id;
  if rec.id is null then raise exception 'Randevu bulunamadı'; end if;
  if rec.status not in ('pending','confirmed') then raise exception 'Bu randevu artık iptal edilemez'; end if;
  if rec.scheduled_start <= now() then raise exception 'Başlangıç saati geçmiş randevu iptal edilemez'; end if;
  update public.appointments set status='cancelled',cancelled_by=auth.uid(),cancelled_at=now(),cancellation_reason=nullif(trim(p_reason),'') where id=p_appointment_id;
  insert into public.appointment_events(appointment_id,workshop_id,actor_id,event_type,old_status,new_status,old_start,new_start,note) values(rec.id,rec.workshop_id,auth.uid(),'cancelled',rec.status,'cancelled',rec.scheduled_start,rec.scheduled_start,nullif(trim(p_reason),''));
end;
$$;

revoke execute on function public.can_manage_mechanic_schedule(uuid,uuid) from public,anon,authenticated;
revoke execute on function public.appointment_slot_available(uuid,uuid,timestamptz,timestamptz,uuid) from public,anon,authenticated;
revoke execute on function public.appointment_get_available_slots(uuid,uuid,date,uuid) from public,anon;
revoke execute on function public.customer_get_appointment_mechanics(uuid) from public,anon;
revoke execute on function public.customer_get_appointments(uuid) from public,anon;
revoke execute on function public.customer_create_appointment(uuid,uuid,uuid,text,text,timestamptz,timestamptz) from public,anon;
revoke execute on function public.customer_cancel_appointment(uuid,text) from public,anon;
grant execute on function public.appointment_get_available_slots(uuid,uuid,date,uuid) to authenticated;
grant execute on function public.customer_get_appointment_mechanics(uuid) to authenticated;
grant execute on function public.customer_get_appointments(uuid) to authenticated;
grant execute on function public.customer_create_appointment(uuid,uuid,uuid,text,text,timestamptz,timestamptz) to authenticated;
grant execute on function public.customer_cancel_appointment(uuid,text) to authenticated;
