create or replace function public.notify_extra_request_event()
returns trigger language plpgsql security definer set search_path=public as $$
declare r record; v_title text; v_type text;
begin
  begin
    select wo.customer_id,wo.demo_batch_id,c.full_name customer_name,m.brand||' '||m.model||case when m.plate is null then '' else ' • '||m.plate end vehicle
    into r from public.work_orders wo join public.customers c on c.id=wo.customer_id join public.motorcycles m on m.id=wo.motorcycle_id where wo.id=new.work_order_id;
    if tg_op='INSERT' and new.status='pending' then
      perform public.notify_customer_users(r.customer_id,new.workshop_id,'service','extra_approval_waiting','Ek işlem onayın bekleniyor',r.vehicle||' • '||new.title||' • '||to_char(new.total_amount,'FM999999990.00')||' TL','urgent','extra_request',new.id,jsonb_build_object('target_tab','services','work_order_id',new.work_order_id,'extra_request_id',new.id),'extra-request:'||new.id||':customer:pending',now(),r.demo_batch_id,null);
    elsif tg_op='UPDATE' and old.status is distinct from new.status and new.status in ('approved','rejected','cancelled') then
      v_type:='extra_request_'||new.status;
      v_title:=case new.status when 'approved' then 'Ek işlem onaylandı' when 'rejected' then 'Ek işlem reddedildi' else 'Ek işlem iptal edildi' end;
      perform public.notify_customer_users(r.customer_id,new.workshop_id,'service',v_type,v_title,r.vehicle||' • '||new.title||' • '||to_char(new.total_amount,'FM999999990.00')||' TL','high','extra_request',new.id,jsonb_build_object('target_tab','services','work_order_id',new.work_order_id,'extra_request_id',new.id,'status',new.status),'extra-request:'||new.id||':customer:'||new.status,now(),r.demo_batch_id,null);
      if new.requested_by is not null then perform public.enqueue_user_notification(new.requested_by,new.workshop_id,'service',v_type,v_title,r.customer_name||' • '||r.vehicle||' • '||new.title,'high','extra_request',new.id,jsonb_build_object('target_tab','orders','work_order_id',new.work_order_id),new.requested_by||':extra-request:'||new.id||':'||new.status,now(),r.demo_batch_id,null); end if;
      if new.mechanic_id is not null and new.mechanic_id is distinct from new.requested_by then perform public.enqueue_user_notification(new.mechanic_id,new.workshop_id,'service',v_type,v_title,r.customer_name||' • '||r.vehicle||' • '||new.title,'high','extra_request',new.id,jsonb_build_object('target_tab','orders','work_order_id',new.work_order_id),new.mechanic_id||':extra-request:'||new.id||':'||new.status,now(),r.demo_batch_id,null); end if;
    end if;
  exception when others then raise warning 'Extra request notification skipped: %',sqlerrm; end;
  return new;
end; $$;

drop trigger if exists extra_request_notifications_after_change on public.work_order_extra_requests;
create trigger extra_request_notifications_after_change after insert or update of status on public.work_order_extra_requests for each row execute function public.notify_extra_request_event();

create or replace function public.notify_appointment_event()
returns trigger language plpgsql security definer set search_path=public as $$
declare r record; v_body text; v_title text; v_type text; v_priority text:='normal';
begin
  begin
    select coalesce(w.timezone,'Europe/Istanbul') timezone,c.full_name customer_name,m.brand||' '||m.model||case when m.plate is null then '' else ' • '||m.plate end vehicle
    into r from public.workshops w join public.customers c on c.id=new.customer_id join public.motorcycles m on m.id=new.motorcycle_id where w.id=new.workshop_id;
    v_body:=r.vehicle||' • '||new.service_title||' • '||to_char(new.scheduled_start at time zone r.timezone,'DD.MM.YYYY HH24:MI');
    if tg_op='INSERT' then
      perform public.notify_customer_users(new.customer_id,new.workshop_id,'appointments','appointment_created',case when new.status='confirmed' then 'Randevun onaylandı' else 'Randevu talebin alındı' end,v_body,'high','appointment',new.id,jsonb_build_object('target_tab','appointments','appointment_id',new.id,'status',new.status),'appointment:'||new.id||':customer:created',now(),null,null);
      perform public.enqueue_user_notification(new.mechanic_id,new.workshop_id,'appointments','new_appointment','Yeni randevu',r.customer_name||' • '||v_body,'high','appointment',new.id,jsonb_build_object('target_tab','appointments','appointment_id',new.id),new.mechanic_id||':appointment:'||new.id||':created',now(),null,null);
      if new.source='customer' then perform public.notify_workshop_owners(new.workshop_id,'appointments','new_customer_appointment','Yeni müşteri randevusu',r.customer_name||' • '||v_body,'high','appointment',new.id,jsonb_build_object('target_tab','appointments','appointment_id',new.id),'appointment:'||new.id||':owners:created',now(),null,null); end if;
    else
      if old.scheduled_start is distinct from new.scheduled_start then
        perform public.notify_customer_users(new.customer_id,new.workshop_id,'appointments','appointment_rescheduled','Randevu saatin değişti',v_body,'high','appointment',new.id,jsonb_build_object('target_tab','appointments','appointment_id',new.id),'appointment:'||new.id||':rescheduled:'||extract(epoch from new.scheduled_start)::bigint,now(),null,null);
        perform public.enqueue_user_notification(new.mechanic_id,new.workshop_id,'appointments','appointment_rescheduled','Randevu saati değişti',r.customer_name||' • '||v_body,'high','appointment',new.id,jsonb_build_object('target_tab','appointments','appointment_id',new.id),new.mechanic_id||':appointment:'||new.id||':rescheduled:'||extract(epoch from new.scheduled_start)::bigint,now(),null,null);
      end if;
      if old.status is distinct from new.status then
        v_type:=case new.status when 'confirmed' then 'appointment_confirmed' when 'cancelled' then 'appointment_cancelled' when 'arrived' then 'appointment_arrived' when 'converted' then 'appointment_converted' when 'no_show' then 'appointment_no_show' else null end;
        v_title:=case new.status when 'confirmed' then 'Randevun onaylandı' when 'cancelled' then 'Randevu iptal edildi' when 'arrived' then 'Randevuya giriş yapıldı' when 'converted' then 'Randevu servis kaydına dönüştü' when 'no_show' then 'Randevu gerçekleşmedi' else null end;
        v_priority:=case when new.status in ('confirmed','cancelled','no_show') then 'high' else 'normal' end;
        if v_type is not null then
          perform public.notify_customer_users(new.customer_id,new.workshop_id,'appointments',v_type,v_title,v_body,v_priority,'appointment',new.id,jsonb_build_object('target_tab','appointments','appointment_id',new.id,'status',new.status),'appointment:'||new.id||':customer:status:'||new.status,now(),null,null);
          perform public.enqueue_user_notification(new.mechanic_id,new.workshop_id,'appointments',v_type,v_title,r.customer_name||' • '||v_body,v_priority,'appointment',new.id,jsonb_build_object('target_tab','appointments','appointment_id',new.id,'status',new.status),new.mechanic_id||':appointment:'||new.id||':status:'||new.status,now(),null,null);
        end if;
      end if;
    end if;
    perform public.notification_schedule_appointment(new.id);
  exception when others then raise warning 'Appointment notification skipped: %',sqlerrm; end;
  return new;
end; $$;

drop trigger if exists appointment_notifications_after_change on public.appointments;
create trigger appointment_notifications_after_change after insert or update of status,scheduled_start,scheduled_end,mechanic_id on public.appointments for each row execute function public.notify_appointment_event();

revoke all on function public.notify_extra_request_event() from public,anon,authenticated;
revoke all on function public.notify_appointment_event() from public,anon,authenticated;
