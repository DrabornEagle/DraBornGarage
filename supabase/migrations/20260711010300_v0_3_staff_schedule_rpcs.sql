create or replace function public.staff_get_appointment_mechanics(p_workshop_id uuid)
returns table(mechanic_id uuid, full_name text, role text, availability_status text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() and not public.is_workshop_member(p_workshop_id) then raise exception 'Takvim yetkiniz yok'; end if;
  return query select wm.user_id,p.full_name,wm.role::text,wm.availability_status from public.workshop_members wm join public.profiles p on p.id=wm.user_id where wm.workshop_id=p_workshop_id and wm.is_active and wm.role in ('mechanic'::public.member_role,'owner_mechanic'::public.member_role) order by p.full_name;
end;
$$;

create or replace function public.staff_get_working_hours(p_workshop_id uuid,p_mechanic_id uuid)
returns table(id uuid,mechanic_id uuid,mechanic_name text,day_of_week smallint,is_working boolean,start_time time,end_time time,break_start time,break_end time,slot_minutes integer)
language plpgsql stable security definer set search_path=public as $$
begin
  if not public.is_admin() and not public.is_workshop_member(p_workshop_id) then raise exception 'Çalışma saatlerini görme yetkiniz yok'; end if;
  return query select h.id,h.mechanic_id,p.full_name,h.day_of_week,h.is_working,h.start_time,h.end_time,h.break_start,h.break_end,h.slot_minutes from public.mechanic_working_hours h join public.profiles p on p.id=h.mechanic_id where h.workshop_id=p_workshop_id and h.mechanic_id=p_mechanic_id order by h.day_of_week;
end;
$$;

create or replace function public.staff_upsert_working_hours(p_workshop_id uuid,p_mechanic_id uuid,p_day_of_week integer,p_is_working boolean,p_start_time time,p_end_time time,p_break_start time default null,p_break_end time default null,p_slot_minutes integer default 60)
returns uuid language plpgsql security definer set search_path=public as $$
declare result_id uuid;
begin
  if not public.can_manage_mechanic_schedule(p_workshop_id,p_mechanic_id) then raise exception 'Bu ustanın çalışma saatlerini değiştirme yetkiniz yok'; end if;
  if p_day_of_week not between 0 and 6 then raise exception 'Geçersiz gün'; end if;
  if p_end_time<=p_start_time then raise exception 'Bitiş saati başlangıçtan sonra olmalı'; end if;
  if p_slot_minutes not between 15 and 240 then raise exception 'Randevu süresi 15-240 dakika arasında olmalı'; end if;
  if (p_break_start is null)<>(p_break_end is null) then raise exception 'Mola başlangıç ve bitiş birlikte girilmeli'; end if;
  if p_break_start is not null and (p_break_end<=p_break_start or p_break_start<p_start_time or p_break_end>p_end_time) then raise exception 'Mola saatleri çalışma aralığında olmalı'; end if;
  insert into public.mechanic_working_hours(workshop_id,mechanic_id,day_of_week,is_working,start_time,end_time,break_start,break_end,slot_minutes)
  values(p_workshop_id,p_mechanic_id,p_day_of_week,p_is_working,p_start_time,p_end_time,p_break_start,p_break_end,p_slot_minutes)
  on conflict(workshop_id,mechanic_id,day_of_week) do update set is_working=excluded.is_working,start_time=excluded.start_time,end_time=excluded.end_time,break_start=excluded.break_start,break_end=excluded.break_end,slot_minutes=excluded.slot_minutes,updated_at=now()
  returning id into result_id;
  return result_id;
end;
$$;

create or replace function public.staff_get_time_off(p_workshop_id uuid,p_mechanic_id uuid)
returns table(id uuid,mechanic_id uuid,mechanic_name text,starts_at timestamptz,ends_at timestamptz,reason text,created_at timestamptz)
language plpgsql stable security definer set search_path=public as $$
begin
  if not public.is_admin() and not public.is_workshop_member(p_workshop_id) then raise exception 'Kapalı zamanları görme yetkiniz yok'; end if;
  return query select t.id,t.mechanic_id,p.full_name,t.starts_at,t.ends_at,t.reason,t.created_at from public.mechanic_time_off t join public.profiles p on p.id=t.mechanic_id where t.workshop_id=p_workshop_id and t.mechanic_id=p_mechanic_id and t.ends_at>=now()-interval '30 days' order by t.starts_at;
end;
$$;

create or replace function public.staff_add_time_off(p_workshop_id uuid,p_mechanic_id uuid,p_starts_at timestamptz,p_ends_at timestamptz,p_reason text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare result_id uuid;
begin
  if not public.can_manage_mechanic_schedule(p_workshop_id,p_mechanic_id) then raise exception 'Bu usta için kapalı zaman ekleme yetkiniz yok'; end if;
  if p_ends_at<=p_starts_at then raise exception 'Bitiş zamanı başlangıçtan sonra olmalı'; end if;
  insert into public.mechanic_time_off(workshop_id,mechanic_id,starts_at,ends_at,reason,created_by) values(p_workshop_id,p_mechanic_id,p_starts_at,p_ends_at,nullif(trim(p_reason),''),auth.uid()) returning id into result_id;
  return result_id;
end;
$$;

create or replace function public.staff_delete_time_off(p_time_off_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare rec record;
begin
  select * into rec from public.mechanic_time_off where id=p_time_off_id;
  if rec.id is null then raise exception 'Kapalı zaman kaydı bulunamadı'; end if;
  if not public.can_manage_mechanic_schedule(rec.workshop_id,rec.mechanic_id) then raise exception 'Bu kaydı silme yetkiniz yok'; end if;
  delete from public.mechanic_time_off where id=p_time_off_id;
end;
$$;

create or replace function public.staff_update_appointment_settings(p_workshop_id uuid,p_enabled boolean,p_auto_confirm boolean,p_booking_days integer,p_min_notice_minutes integer,p_timezone text default 'Europe/Istanbul')
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_admin() and not public.is_workshop_owner(p_workshop_id) then raise exception 'Randevu ayarlarını değiştirme yetkiniz yok'; end if;
  if p_booking_days not between 1 and 180 then raise exception 'Rezervasyon günü 1-180 arasında olmalı'; end if;
  if p_min_notice_minutes not between 0 and 1440 then raise exception 'Minimum bildirim 0-1440 dakika arasında olmalı'; end if;
  if not exists(select 1 from pg_timezone_names where name=p_timezone) then raise exception 'Geçersiz saat dilimi'; end if;
  update public.workshops set appointments_enabled=p_enabled,appointment_auto_confirm=p_auto_confirm,appointment_booking_days=p_booking_days,appointment_min_notice_minutes=p_min_notice_minutes,timezone=p_timezone,updated_at=now() where id=p_workshop_id;
end;
$$;

revoke execute on function public.staff_get_appointment_mechanics(uuid) from public,anon;
revoke execute on function public.staff_get_working_hours(uuid,uuid) from public,anon;
revoke execute on function public.staff_upsert_working_hours(uuid,uuid,integer,boolean,time,time,time,time,integer) from public,anon;
revoke execute on function public.staff_get_time_off(uuid,uuid) from public,anon;
revoke execute on function public.staff_add_time_off(uuid,uuid,timestamptz,timestamptz,text) from public,anon;
revoke execute on function public.staff_delete_time_off(uuid) from public,anon;
revoke execute on function public.staff_update_appointment_settings(uuid,boolean,boolean,integer,integer,text) from public,anon;
grant execute on function public.staff_get_appointment_mechanics(uuid) to authenticated;
grant execute on function public.staff_get_working_hours(uuid,uuid) to authenticated;
grant execute on function public.staff_upsert_working_hours(uuid,uuid,integer,boolean,time,time,time,time,integer) to authenticated;
grant execute on function public.staff_get_time_off(uuid,uuid) to authenticated;
grant execute on function public.staff_add_time_off(uuid,uuid,timestamptz,timestamptz,text) to authenticated;
grant execute on function public.staff_delete_time_off(uuid) to authenticated;
grant execute on function public.staff_update_appointment_settings(uuid,boolean,boolean,integer,integer,text) to authenticated;
