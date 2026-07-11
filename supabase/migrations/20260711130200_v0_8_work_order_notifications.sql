create or replace function public.notify_work_order_event()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  v_customer text;
  v_vehicle text;
  v_type text;
  v_title text;
  v_body text;
  v_priority text:='normal';
begin
  begin
    select c.full_name,m.brand||' '||m.model||case when m.plate is null then '' else ' • '||m.plate end
    into v_customer,v_vehicle
    from public.customers c join public.motorcycles m on m.id=new.motorcycle_id
    where c.id=new.customer_id;

    if tg_op='INSERT' then
      perform public.notify_customer_users(new.customer_id,new.workshop_id,'service','service_received','Motor servise alındı',v_vehicle||' için servis kaydı açıldı.','high','work_order',new.id,jsonb_build_object('target_tab','services','work_order_id',new.id),'work-order:'||new.id||':customer:created',now(),new.demo_batch_id,null);
      perform public.notify_workshop_owners(new.workshop_id,'service','new_service','Yeni servis kaydı',v_customer||' • '||v_vehicle||' • '||new.complaint,'high','work_order',new.id,jsonb_build_object('target_tab','orders','work_order_id',new.id),'work-order:'||new.id||':owners:created',now(),new.demo_batch_id,null);
      if new.assigned_mechanic_id is not null then
        perform public.enqueue_user_notification(new.assigned_mechanic_id,new.workshop_id,'service','service_assigned','Yeni servis sana atandı',v_customer||' • '||v_vehicle,'high','work_order',new.id,jsonb_build_object('target_tab','orders','work_order_id',new.id),new.assigned_mechanic_id||':work-order:'||new.id||':assigned',now(),new.demo_batch_id,null);
      end if;
      return new;
    end if;

    if old.assigned_mechanic_id is distinct from new.assigned_mechanic_id and new.assigned_mechanic_id is not null then
      perform public.enqueue_user_notification(new.assigned_mechanic_id,new.workshop_id,'service','service_assigned','Servis sana atandı',v_customer||' • '||v_vehicle,'high','work_order',new.id,jsonb_build_object('target_tab','orders','work_order_id',new.id),new.assigned_mechanic_id||':work-order:'||new.id||':assigned:'||extract(epoch from now())::bigint,now(),new.demo_batch_id,null);
    end if;

    if old.status is distinct from new.status then
      select x.notification_type,x.title,x.body,x.priority into v_type,v_title,v_body,v_priority
      from (values
        ('opened'::public.work_order_status,'service_received','Servis kaydı açıldı',' için servis kaydı oluşturuldu.','normal'),
        ('received','service_received','Motor teslim alındı',' işletme tarafından teslim alındı.','high'),
        ('queued','service_queued','Motor sıraya alındı',' atölye sırasına alındı.','normal'),
        ('waiting','service_queued','Motor sırada bekliyor',' servis sırasını bekliyor.','normal'),
        ('precheck','service_precheck','Ön kontrol başladı',' için ön kontrol yapılıyor.','normal'),
        ('price_entered','price_entered','Servis ücreti girildi',' için fiyat bilgisi hazır.','high'),
        ('approval_waiting','approval_waiting','Müşteri onayı bekleniyor',' için fiyat onayı bekleniyor.','urgent'),
        ('repair_started','repair_started','Tamire başlandı',' için tamir işlemi başladı.','normal'),
        ('in_progress','repair_started','Tamir devam ediyor',' üzerinde çalışma devam ediyor.','normal'),
        ('extra_approval_waiting','extra_approval_waiting','Ek işlem onayı bekleniyor',' için ek işlem talebi var.','urgent'),
        ('parts_waiting','parts_waiting','Parça bekleniyor',' için gerekli parça bekleniyor.','high'),
        ('testing','testing','Motor test ediliyor',' son kontrol ve test aşamasında.','normal'),
        ('ready','ready','Motor hazır',' teslimata hazır.','urgent'),
        ('completed','ready','Servis tamamlandı',' için servis işlemleri tamamlandı.','high'),
        ('delivered','delivered','Motor teslim edildi',' teslim edildi.','high'),
        ('cancelled','service_cancelled','Servis iptal edildi',' servis kaydı iptal edildi.','high')
      ) as x(status,notification_type,title,body,priority)
      where x.status=new.status;
      if v_type is not null then
        perform public.notify_customer_users(new.customer_id,new.workshop_id,'service',v_type,v_title,v_vehicle||v_body,v_priority,'work_order',new.id,jsonb_build_object('target_tab','services','work_order_id',new.id,'status',new.status),'work-order:'||new.id||':customer:status:'||new.status||':'||extract(epoch from now())::bigint,now(),new.demo_batch_id,null);
      end if;
    end if;

    if old.quoted_price is distinct from new.quoted_price and new.quoted_price is not null then
      perform public.notify_customer_users(new.customer_id,new.workshop_id,'payments','price_updated','Fiyat bilgisi güncellendi',v_vehicle||' • '||to_char(new.quoted_price,'FM999999990.00')||' TL','high','work_order',new.id,jsonb_build_object('target_tab','services','work_order_id',new.id),'work-order:'||new.id||':price:'||extract(epoch from now())::bigint,now(),new.demo_batch_id,null);
    end if;
    if old.amount_received is distinct from new.amount_received or old.payment_status is distinct from new.payment_status then
      perform public.notify_customer_users(new.customer_id,new.workshop_id,'payments','payment_updated','Ödeme bilgisi güncellendi',v_vehicle||' • alınan '||to_char(coalesce(new.amount_received,0),'FM999999990.00')||' TL','normal','work_order',new.id,jsonb_build_object('target_tab','services','work_order_id',new.id),'work-order:'||new.id||':payment:'||extract(epoch from now())::bigint,now(),new.demo_batch_id,null);
    end if;
    if old.receivable_status is distinct from new.receivable_status or old.debt_promised_date is distinct from new.debt_promised_date then perform public.notification_schedule_receivable(new.id); end if;
  exception when others then raise warning 'Notification trigger skipped: %',sqlerrm;
  end;
  return new;
end; $$;

drop trigger if exists work_order_notifications_after_change on public.work_orders;
create trigger work_order_notifications_after_change
after insert or update of status,assigned_mechanic_id,quoted_price,amount_received,payment_status,receivable_status,debt_promised_date
on public.work_orders for each row execute function public.notify_work_order_event();
revoke all on function public.notify_work_order_event() from public,anon,authenticated;
