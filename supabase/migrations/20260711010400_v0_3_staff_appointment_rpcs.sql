create or replace function public.staff_get_appointments(p_workshop_id uuid,p_from timestamptz,p_to timestamptz,p_mechanic_id uuid default null)
returns table(id uuid,workshop_id uuid,customer_id uuid,customer_name text,customer_phone text,motorcycle_id uuid,brand text,model text,plate text,mechanic_id uuid,mechanic_name text,service_title text,customer_note text,staff_note text,scheduled_start timestamptz,scheduled_end timestamptz,status text,source text,cancellation_reason text,work_order_id uuid,created_at timestamptz)
language plpgsql stable security definer set search_path=public as $$
declare can_view_all boolean;
begin
  if not public.is_admin() and not public.is_workshop_member(p_workshop_id) then raise exception 'Randevuları görme yetkiniz yok'; end if;
  can_view_all:=public.is_admin() or public.is_workshop_owner(p_workshop_id);
  return query select a.id,a.workshop_id,a.customer_id,c.full_name,c.phone,a.motorcycle_id,m.brand,m.model,m.plate,a.mechanic_id,p.full_name,a.service_title,a.customer_note,a.staff_note,a.scheduled_start,a.scheduled_end,a.status,a.source,a.cancellation_reason,wo.id,a.created_at
  from public.appointments a join public.customers c on c.id=a.customer_id join public.motorcycles m on m.id=a.motorcycle_id join public.profiles p on p.id=a.mechanic_id left join public.work_orders wo on wo.appointment_id=a.id
  where a.workshop_id=p_workshop_id and a.scheduled_start>=p_from and a.scheduled_start<p_to and (can_view_all or a.mechanic_id=auth.uid()) and (p_mechanic_id is null or a.mechanic_id=p_mechanic_id) order by a.scheduled_start;
end;
$$;

create or replace function public.staff_create_appointment(p_workshop_id uuid,p_customer_id uuid,p_motorcycle_id uuid,p_mechanic_id uuid,p_service_title text,p_customer_note text,p_staff_note text,p_scheduled_start timestamptz,p_scheduled_end timestamptz)
returns uuid language plpgsql security definer set search_path=public as $$
declare new_id uuid; source_value text;
begin
  if not public.is_admin() and not public.is_workshop_member(p_workshop_id) then raise exception 'Randevu oluşturma yetkiniz yok'; end if;
  if not public.is_admin() and not public.is_workshop_owner(p_workshop_id) and auth.uid()<>p_mechanic_id then raise exception 'Usta yalnız kendi takvimine randevu ekleyebilir'; end if;
  if length(trim(coalesce(p_service_title,'')))<3 then raise exception 'Yapılacak işlem en az 3 karakter olmalı'; end if;
  if not exists(select 1 from public.motorcycles m where m.id=p_motorcycle_id and m.customer_id=p_customer_id and m.workshop_id=p_workshop_id) then raise exception 'Müşteri ve motosiklet eşleşmiyor'; end if;
  if not public.appointment_slot_available(p_workshop_id,p_mechanic_id,p_scheduled_start,p_scheduled_end,null) then raise exception 'Seçilen saat artık müsait değil'; end if;
  source_value:=case when public.is_admin() then 'admin' when public.is_workshop_owner(p_workshop_id) then 'owner' else 'mechanic' end;
  insert into public.appointments(workshop_id,customer_id,motorcycle_id,mechanic_id,service_title,customer_note,staff_note,scheduled_start,scheduled_end,status,source,requested_by,created_by,confirmed_by,confirmed_at)
  values(p_workshop_id,p_customer_id,p_motorcycle_id,p_mechanic_id,trim(p_service_title),nullif(trim(p_customer_note),''),nullif(trim(p_staff_note),''),p_scheduled_start,p_scheduled_end,'confirmed',source_value,auth.uid(),auth.uid(),auth.uid(),now()) returning id into new_id;
  insert into public.appointment_events(appointment_id,workshop_id,actor_id,event_type,new_status,new_start,note) values(new_id,p_workshop_id,auth.uid(),'created','confirmed',p_scheduled_start,'Personel randevusu oluşturuldu');
  return new_id;
end;
$$;

create or replace function public.staff_reschedule_appointment(p_appointment_id uuid,p_mechanic_id uuid,p_scheduled_start timestamptz,p_scheduled_end timestamptz,p_note text default null)
returns void language plpgsql security definer set search_path=public as $$
declare rec record;
begin
  select * into rec from public.appointments where id=p_appointment_id;
  if rec.id is null then raise exception 'Randevu bulunamadı'; end if;
  if not public.is_admin() and not public.is_workshop_owner(rec.workshop_id) and not(public.is_workshop_worker(rec.workshop_id) and auth.uid()=rec.mechanic_id) then raise exception 'Randevuyu değiştirme yetkiniz yok'; end if;
  if not public.is_admin() and not public.is_workshop_owner(rec.workshop_id) and p_mechanic_id<>auth.uid() then raise exception 'Usta randevuyu başka ustaya aktaramaz'; end if;
  if rec.status not in('pending','confirmed') then raise exception 'Bu randevu yeniden planlanamaz'; end if;
  if not public.appointment_slot_available(rec.workshop_id,p_mechanic_id,p_scheduled_start,p_scheduled_end,rec.id) then raise exception 'Seçilen yeni saat müsait değil'; end if;
  update public.appointments set mechanic_id=p_mechanic_id,scheduled_start=p_scheduled_start,scheduled_end=p_scheduled_end,status='confirmed',confirmed_by=auth.uid(),confirmed_at=now(),staff_note=coalesce(nullif(trim(p_note),''),staff_note) where id=p_appointment_id;
  insert into public.appointment_events(appointment_id,workshop_id,actor_id,event_type,old_status,new_status,old_start,new_start,note) values(rec.id,rec.workshop_id,auth.uid(),'rescheduled',rec.status,'confirmed',rec.scheduled_start,p_scheduled_start,nullif(trim(p_note),''));
end;
$$;

create or replace function public.staff_set_appointment_status(p_appointment_id uuid,p_status text,p_note text default null)
returns void language plpgsql security definer set search_path=public as $$
declare rec record;
begin
  select * into rec from public.appointments where id=p_appointment_id;
  if rec.id is null then raise exception 'Randevu bulunamadı'; end if;
  if not public.is_admin() and not public.is_workshop_owner(rec.workshop_id) and not(public.is_workshop_worker(rec.workshop_id) and auth.uid()=rec.mechanic_id) then raise exception 'Randevu durumunu değiştirme yetkiniz yok'; end if;
  if p_status not in('confirmed','arrived','cancelled','no_show') then raise exception 'Geçersiz randevu durumu'; end if;
  if rec.status in('converted','cancelled','no_show') then raise exception 'Bu randevu artık değiştirilemez'; end if;
  update public.appointments set status=p_status,confirmed_by=case when p_status='confirmed' then auth.uid() else confirmed_by end,confirmed_at=case when p_status='confirmed' then now() else confirmed_at end,arrived_at=case when p_status='arrived' then now() else arrived_at end,cancelled_by=case when p_status in('cancelled','no_show') then auth.uid() else cancelled_by end,cancelled_at=case when p_status in('cancelled','no_show') then now() else cancelled_at end,cancellation_reason=case when p_status in('cancelled','no_show') then nullif(trim(p_note),'') else cancellation_reason end where id=p_appointment_id;
  insert into public.appointment_events(appointment_id,workshop_id,actor_id,event_type,old_status,new_status,old_start,new_start,note) values(rec.id,rec.workshop_id,auth.uid(),case when p_status='confirmed' then 'confirmed' when p_status='arrived' then 'arrived' when p_status='no_show' then 'no_show' else 'cancelled' end,rec.status,p_status,rec.scheduled_start,rec.scheduled_start,nullif(trim(p_note),''));
end;
$$;

create or replace function public.staff_convert_appointment_to_work_order(p_appointment_id uuid,p_waiting_status public.customer_waiting_status default 'left_vehicle'::public.customer_waiting_status,p_odometer integer default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare rec record; order_id uuid;
begin
  select * into rec from public.appointments where id=p_appointment_id;
  if rec.id is null then raise exception 'Randevu bulunamadı'; end if;
  if not public.is_admin() and not public.is_workshop_owner(rec.workshop_id) and not(public.is_workshop_worker(rec.workshop_id) and auth.uid()=rec.mechanic_id) then raise exception 'Randevuyu servise dönüştürme yetkiniz yok'; end if;
  if rec.status not in('pending','confirmed','arrived') then raise exception 'Bu randevu servise dönüştürülemez'; end if;
  select id into order_id from public.work_orders where appointment_id=rec.id;
  if order_id is not null then return order_id; end if;
  insert into public.work_orders(workshop_id,customer_id,motorcycle_id,assigned_mechanic_id,complaint,notes,odometer_in,arrived_at,service_type,customer_waiting_status,status,appointment_id,created_by)
  values(rec.workshop_id,rec.customer_id,rec.motorcycle_id,rec.mechanic_id,rec.service_title,concat_ws(E'\n',nullif(rec.customer_note,''),nullif(rec.staff_note,'')),p_odometer,now(),'appointment'::public.service_type,p_waiting_status,'queued'::public.work_order_status,rec.id,auth.uid()) returning id into order_id;
  update public.appointments set status='converted',converted_at=now(),arrived_at=coalesce(arrived_at,now()) where id=rec.id;
  insert into public.appointment_events(appointment_id,workshop_id,actor_id,event_type,old_status,new_status,old_start,new_start,note) values(rec.id,rec.workshop_id,auth.uid(),'converted',rec.status,'converted',rec.scheduled_start,rec.scheduled_start,'Randevu servis kaydına dönüştürüldü');
  return order_id;
end;
$$;

create or replace function public.staff_get_appointment_events(p_appointment_id uuid)
returns table(id uuid,event_type text,actor_name text,old_status text,new_status text,old_start timestamptz,new_start timestamptz,note text,created_at timestamptz)
language plpgsql stable security definer set search_path=public as $$
declare target_workshop uuid;
begin
  select workshop_id into target_workshop from public.appointments where id=p_appointment_id;
  if target_workshop is null then raise exception 'Randevu bulunamadı'; end if;
  if not public.is_admin() and not public.is_workshop_member(target_workshop) then raise exception 'Randevu geçmişini görme yetkiniz yok'; end if;
  return query select e.id,e.event_type,p.full_name,e.old_status,e.new_status,e.old_start,e.new_start,e.note,e.created_at from public.appointment_events e left join public.profiles p on p.id=e.actor_id where e.appointment_id=p_appointment_id order by e.created_at;
end;
$$;

revoke execute on function public.staff_get_appointments(uuid,timestamptz,timestamptz,uuid) from public,anon;
revoke execute on function public.staff_create_appointment(uuid,uuid,uuid,uuid,text,text,text,timestamptz,timestamptz) from public,anon;
revoke execute on function public.staff_reschedule_appointment(uuid,uuid,timestamptz,timestamptz,text) from public,anon;
revoke execute on function public.staff_set_appointment_status(uuid,text,text) from public,anon;
revoke execute on function public.staff_convert_appointment_to_work_order(uuid,public.customer_waiting_status,integer) from public,anon;
revoke execute on function public.staff_get_appointment_events(uuid) from public,anon;
grant execute on function public.staff_get_appointments(uuid,timestamptz,timestamptz,uuid) to authenticated;
grant execute on function public.staff_create_appointment(uuid,uuid,uuid,uuid,text,text,text,timestamptz,timestamptz) to authenticated;
grant execute on function public.staff_reschedule_appointment(uuid,uuid,timestamptz,timestamptz,text) to authenticated;
grant execute on function public.staff_set_appointment_status(uuid,text,text) to authenticated;
grant execute on function public.staff_convert_appointment_to_work_order(uuid,public.customer_waiting_status,integer) to authenticated;
grant execute on function public.staff_get_appointment_events(uuid) to authenticated;
