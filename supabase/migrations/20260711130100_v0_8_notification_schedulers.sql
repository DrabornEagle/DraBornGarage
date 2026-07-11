create or replace function public.notification_schedule_receivable(p_work_order_id uuid)
returns integer language plpgsql security definer set search_path=public as $$
declare r record; v_due_at timestamptz; v_overdue_at timestamptz; v_count integer:=0; v_body text; v_owner_body text;
begin
  perform public.notification_archive_entity('work_order',p_work_order_id,array['receivable_due','receivable_overdue'],true);
  select wo.id,wo.workshop_id,wo.customer_id,wo.receivable_status,wo.debt_promised_date,
         wo.total_amount,wo.amount_received,wo.demo_batch_id,coalesce(w.timezone,'Europe/Istanbul') as timezone,
         w.name as workshop_name,c.full_name as customer_name,m.brand,m.model,m.plate
  into r from public.work_orders wo
  join public.workshops w on w.id=wo.workshop_id
  join public.customers c on c.id=wo.customer_id
  join public.motorcycles m on m.id=wo.motorcycle_id where wo.id=p_work_order_id;
  if not found or r.receivable_status<>'open' or r.debt_promised_date is null then return 0; end if;
  v_due_at:=(r.debt_promised_date+time '09:00') at time zone r.timezone;
  v_overdue_at:=((r.debt_promised_date+1)+time '09:00') at time zone r.timezone;
  v_body:=format('%s %s%s için kalan %s TL borcun ödeme günü geldi.',r.brand,r.model,case when r.plate is null then '' else ' • '||r.plate end,to_char(greatest(coalesce(r.total_amount,0)-coalesce(r.amount_received,0),0),'FM999999990.00'));
  v_owner_body:=format('%s • %s %s%s • kalan %s TL.',r.customer_name,r.brand,r.model,case when r.plate is null then '' else ' • '||r.plate end,to_char(greatest(coalesce(r.total_amount,0)-coalesce(r.amount_received,0),0),'FM999999990.00'));
  v_count:=v_count+public.notify_customer_users(r.customer_id,r.workshop_id,'receivables','receivable_due','Borç ödeme günü',v_body,'high','work_order',r.id,jsonb_build_object('target_tab','services','work_order_id',r.id,'due_date',r.debt_promised_date),'receivable:'||r.id||':due:'||r.debt_promised_date,v_due_at,r.demo_batch_id,null);
  v_count:=v_count+public.notify_customer_users(r.customer_id,r.workshop_id,'receivables','receivable_overdue','Borç ödemesi gecikti',replace(v_body,'ödeme günü geldi','ödeme tarihi geçti'),'urgent','work_order',r.id,jsonb_build_object('target_tab','services','work_order_id',r.id,'due_date',r.debt_promised_date),'receivable:'||r.id||':overdue:'||r.debt_promised_date,v_overdue_at,r.demo_batch_id,null);
  v_count:=v_count+public.notify_workshop_owners(r.workshop_id,'receivables','receivable_due','Alacak ödeme günü',v_owner_body,'high','work_order',r.id,jsonb_build_object('target_tab','receivables','work_order_id',r.id,'due_date',r.debt_promised_date),'receivable-owner:'||r.id||':due:'||r.debt_promised_date,v_due_at,r.demo_batch_id,null);
  v_count:=v_count+public.notify_workshop_owners(r.workshop_id,'receivables','receivable_overdue','Alacak gecikti',v_owner_body,'urgent','work_order',r.id,jsonb_build_object('target_tab','receivables','work_order_id',r.id,'due_date',r.debt_promised_date),'receivable-owner:'||r.id||':overdue:'||r.debt_promised_date,v_overdue_at,r.demo_batch_id,null);
  return v_count;
end; $$;

create or replace function public.notification_schedule_appointment(p_appointment_id uuid)
returns integer language plpgsql security definer set search_path=public as $$
declare r record; v_24h timestamptz; v_2h timestamptz; v_count integer:=0; v_body text;
begin
  perform public.notification_archive_entity('appointment',p_appointment_id,array['appointment_reminder_24h','appointment_reminder_2h'],true);
  select a.*,w.name as workshop_name,coalesce(w.timezone,'Europe/Istanbul') as timezone,c.full_name as customer_name,
         m.brand,m.model,m.plate,p.full_name as mechanic_name
  into r from public.appointments a
  join public.workshops w on w.id=a.workshop_id
  join public.customers c on c.id=a.customer_id
  join public.motorcycles m on m.id=a.motorcycle_id
  join public.profiles p on p.id=a.mechanic_id where a.id=p_appointment_id;
  if not found or r.status not in ('pending','confirmed') or r.scheduled_start<=now() then return 0; end if;
  v_24h:=r.scheduled_start-interval '24 hours'; v_2h:=r.scheduled_start-interval '2 hours';
  v_body:=format('%s %s%s • %s • %s',r.brand,r.model,case when r.plate is null then '' else ' • '||r.plate end,r.service_title,to_char(r.scheduled_start at time zone r.timezone,'DD.MM.YYYY HH24:MI'));
  if v_24h>now() then
    v_count:=v_count+public.notify_customer_users(r.customer_id,r.workshop_id,'appointments','appointment_reminder_24h','Randevuna 24 saat kaldı',v_body,'high','appointment',r.id,jsonb_build_object('target_tab','appointments','appointment_id',r.id,'scheduled_start',r.scheduled_start),'appointment:'||r.id||':24h:'||extract(epoch from r.scheduled_start)::bigint,v_24h,null,'24h');
    if public.enqueue_user_notification(r.mechanic_id,r.workshop_id,'appointments','appointment_reminder_24h','Yarınki randevu',r.customer_name||' • '||v_body,'high','appointment',r.id,jsonb_build_object('target_tab','appointments','appointment_id',r.id,'scheduled_start',r.scheduled_start),r.mechanic_id||':appointment:'||r.id||':24h:'||extract(epoch from r.scheduled_start)::bigint,v_24h,null,'24h') is not null then v_count:=v_count+1; end if;
  end if;
  if v_2h>now() then
    v_count:=v_count+public.notify_customer_users(r.customer_id,r.workshop_id,'appointments','appointment_reminder_2h','Randevuna 2 saat kaldı',v_body,'urgent','appointment',r.id,jsonb_build_object('target_tab','appointments','appointment_id',r.id,'scheduled_start',r.scheduled_start),'appointment:'||r.id||':2h:'||extract(epoch from r.scheduled_start)::bigint,v_2h,null,'2h');
    if public.enqueue_user_notification(r.mechanic_id,r.workshop_id,'appointments','appointment_reminder_2h','Randevuya 2 saat kaldı',r.customer_name||' • '||v_body,'urgent','appointment',r.id,jsonb_build_object('target_tab','appointments','appointment_id',r.id,'scheduled_start',r.scheduled_start),r.mechanic_id||':appointment:'||r.id||':2h:'||extract(epoch from r.scheduled_start)::bigint,v_2h,null,'2h') is not null then v_count:=v_count+1; end if;
  end if;
  return v_count;
end; $$;

create or replace function public.notification_schedule_platform_statement(p_statement_id uuid)
returns integer language plpgsql security definer set search_path=public as $$
declare r record; v_due_at timestamptz; v_overdue_at timestamptz; v_count integer:=0; v_body text;
begin
  perform public.notification_archive_entity('platform_statement',p_statement_id,array['platform_due','platform_overdue'],true);
  select st.id,st.workshop_id,st.cycle_start,st.cycle_end,st.due_date,w.name as workshop_name,coalesce(w.timezone,'Europe/Istanbul') as timezone,
         coalesce((select sum(c.amount) from public.platform_fee_charges c where c.workshop_id=st.workshop_id and c.voided_at is null and c.charge_date between st.cycle_start and st.cycle_end),0)::numeric as charge_amount,
         coalesce((select sum(a.amount) from public.platform_payment_allocations a join public.platform_payment_reports pr on pr.id=a.payment_report_id where a.statement_id=st.id and pr.status='approved'),0)::numeric as approved_amount
  into r from public.platform_fee_statements st join public.workshops w on w.id=st.workshop_id where st.id=p_statement_id;
  if not found or greatest(r.charge_amount-r.approved_amount,0)<=0 then return 0; end if;
  v_due_at:=(r.due_date+time '09:00') at time zone r.timezone; v_overdue_at:=((r.due_date+1)+time '09:00') at time zone r.timezone;
  v_body:=format('%s • %s–%s dönemi • kalan %s TL',r.workshop_name,to_char(r.cycle_start,'DD.MM.YYYY'),to_char(r.cycle_end,'DD.MM.YYYY'),to_char(greatest(r.charge_amount-r.approved_amount,0),'FM999999990.00'));
  v_count:=v_count+public.notify_workshop_owners(r.workshop_id,'platform','platform_due','Platform ödeme günü geldi',v_body,'high','platform_statement',r.id,jsonb_build_object('target_tab','team','target_section','platform','statement_id',r.id,'due_date',r.due_date),'platform-statement:'||r.id||':due:'||r.due_date,v_due_at,null,null);
  v_count:=v_count+public.notify_workshop_owners(r.workshop_id,'platform','platform_overdue','Platform ödemesi gecikti',v_body,'urgent','platform_statement',r.id,jsonb_build_object('target_tab','team','target_section','platform','statement_id',r.id,'due_date',r.due_date),'platform-statement:'||r.id||':overdue:'||r.due_date,v_overdue_at,null,null);
  v_count:=v_count+public.notify_platform_admins(r.workshop_id,'platform','platform_due','İşletmenin platform ödeme günü',v_body,'high','platform_statement',r.id,jsonb_build_object('target_tab','team','target_section','platform','statement_id',r.id,'due_date',r.due_date),'platform-statement:'||r.id||':due:'||r.due_date,v_due_at,null,null);
  v_count:=v_count+public.notify_platform_admins(r.workshop_id,'platform','platform_overdue','İşletmenin platform ödemesi gecikti',v_body,'urgent','platform_statement',r.id,jsonb_build_object('target_tab','team','target_section','platform','statement_id',r.id,'due_date',r.due_date),'platform-statement:'||r.id||':overdue:'||r.due_date,v_overdue_at,null,null);
  return v_count;
end; $$;

revoke all on function public.notification_schedule_receivable(uuid) from public,anon,authenticated;
revoke all on function public.notification_schedule_appointment(uuid) from public,anon,authenticated;
revoke all on function public.notification_schedule_platform_statement(uuid) from public,anon,authenticated;
