create or replace function public.create_v08_demo_data(p_workshop_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_root uuid:=public.resolve_demo_root_workshop(p_workshop_id); v_batch uuid; v_user uuid:=auth.uid();
  v_order uuid; v_appointment uuid; v_statement uuid; v_count integer:=0; v_id uuid;
begin
  if v_user is null then raise exception 'Oturum gerekli'; end if;
  if not public.is_workshop_owner(v_root) and not public.is_admin() then raise exception 'Demo bildirimlerini yalnız Admin veya işletme sahibi hazırlayabilir'; end if;
  select id into v_batch from public.demo_batches where workshop_id=v_root order by created_at desc limit 1;
  if v_batch is null then raise exception 'Önce temel demo verilerini yükleyin'; end if;
  select id into v_order from public.work_orders where workshop_id=v_root and demo_batch_id=v_batch order by created_at limit 1;
  select id into v_appointment from public.appointments where workshop_id=v_root order by created_at desc limit 1;
  select id into v_statement from public.platform_fee_statements where workshop_id=v_root order by cycle_start desc limit 1;
  insert into public.notification_preferences(user_id) values(v_user) on conflict(user_id) do nothing;

  v_id:=public.enqueue_user_notification(v_user,v_root,'service','service_received','Demo • Motor teslim alındı','Honda PCX 125 • 31 ABC 123 işletme tarafından teslim alındı.','high','work_order',v_order,jsonb_build_object('target_tab','orders','work_order_id',v_order),'v08-demo:'||v_batch||':service-received',now()-interval '12 minutes',v_batch,null); if v_id is not null then v_count:=v_count+1; end if;
  v_id:=public.enqueue_user_notification(v_user,v_root,'payments','price_updated','Demo • Fiyat bilgisi güncellendi','Honda PCX 125 için belirtilen ücret 2.450,00 TL.','high','work_order',v_order,jsonb_build_object('target_tab','orders','work_order_id',v_order),'v08-demo:'||v_batch||':price-updated',now()-interval '10 minutes',v_batch,null); if v_id is not null then v_count:=v_count+1; end if;
  v_id:=public.enqueue_user_notification(v_user,v_root,'service','approval_waiting','Demo • Müşteri onayı bekleniyor','Ek işlem ve fiyat onayı bekleniyor.','urgent','work_order',v_order,jsonb_build_object('target_tab','orders','work_order_id',v_order),'v08-demo:'||v_batch||':approval',now()-interval '8 minutes',v_batch,null); if v_id is not null then v_count:=v_count+1; end if;
  v_id:=public.enqueue_user_notification(v_user,v_root,'service','parts_waiting','Demo • Parça bekleniyor','Sipariş edilen fren balatası bekleniyor.','high','work_order',v_order,jsonb_build_object('target_tab','orders','work_order_id',v_order),'v08-demo:'||v_batch||':parts',now()-interval '6 minutes',v_batch,null); if v_id is not null then v_count:=v_count+1; end if;
  v_id:=public.enqueue_user_notification(v_user,v_root,'service','ready','Demo • Motor hazır','Servis işlemleri tamamlandı; motor teslimata hazır.','urgent','work_order',v_order,jsonb_build_object('target_tab','orders','work_order_id',v_order),'v08-demo:'||v_batch||':ready',now()-interval '4 minutes',v_batch,null); if v_id is not null then v_count:=v_count+1; end if;
  v_id:=public.enqueue_user_notification(v_user,v_root,'customer_links','customer_claim_pending','Demo • Yeni eşleştirme talebi','Müşteri motorunu hesabına bağlamak için onay bekliyor.','high','customer_claim',null,jsonb_build_object('target_tab','customers'),'v08-demo:'||v_batch||':claim',now()-interval '3 minutes',v_batch,null); if v_id is not null then v_count:=v_count+1; end if;
  v_id:=public.enqueue_user_notification(v_user,v_root,'platform','platform_payment_approved','Demo • Platform ödemen onaylandı','20,00 TL ödeme bildirimi Admin tarafından onaylandı.','high','platform_payment_report',null,jsonb_build_object('target_tab','team','target_section','platform'),'v08-demo:'||v_batch||':platform-approved',now()-interval '2 minutes',v_batch,null); if v_id is not null then v_count:=v_count+1; end if;
  v_id:=public.enqueue_user_notification(v_user,v_root,'appointments','appointment_reminder_2h','Demo • Randevuya 2 saat kaldı','Bugün 15:30 • Yağ bakımı randevusu.','urgent','appointment',v_appointment,jsonb_build_object('target_tab','appointments','appointment_id',v_appointment),'v08-demo:'||v_batch||':appointment-future',now()+interval '2 hours',v_batch,'2h'); if v_id is not null then v_count:=v_count+1; end if;
  v_id:=public.enqueue_user_notification(v_user,v_root,'receivables','receivable_due','Demo • Alacak ödeme günü','Müşteri ödeme sözü yarın sabah.','high','work_order',v_order,jsonb_build_object('target_tab','receivables','work_order_id',v_order),'v08-demo:'||v_batch||':receivable-future',now()+interval '1 day',v_batch,null); if v_id is not null then v_count:=v_count+1; end if;
  v_id:=public.enqueue_user_notification(v_user,v_root,'platform','platform_due','Demo • Platform ödeme günü','Aylık platform hizmet bedeli için son ödeme yaklaşıyor.','high','platform_statement',v_statement,jsonb_build_object('target_tab','team','target_section','platform','statement_id',v_statement),'v08-demo:'||v_batch||':platform-future',now()+interval '2 days',v_batch,null); if v_id is not null then v_count:=v_count+1; end if;
  update public.user_notifications set read_at=coalesce(read_at,now()-interval '1 minute') where user_id=v_user and dedupe_key='v08-demo:'||v_batch||':price-updated';
  perform public.notification_refresh_reminders();
  return jsonb_build_object('v08_ready',true,'workshop_id',v_root,'batch_id',v_batch,'created_or_refreshed',v_count,'due_count',(select count(*) from public.user_notifications where user_id=v_user and demo_batch_id=v_batch and archived_at is null and deliver_at<=now()),'upcoming_count',(select count(*) from public.user_notifications where user_id=v_user and demo_batch_id=v_batch and archived_at is null and deliver_at>now()));
end; $$;

revoke execute on function public.create_v08_demo_data(uuid) from public,anon;
grant execute on function public.create_v08_demo_data(uuid) to authenticated;
