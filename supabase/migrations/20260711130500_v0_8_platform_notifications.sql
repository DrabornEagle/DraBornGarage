create or replace function public.notify_platform_report_event()
returns trigger language plpgsql security definer set search_path=public as $$
declare v_workshop text; v_title text; v_body text; v_type text; x record;
begin
  begin
    select name into v_workshop from public.workshops where id=new.workshop_id;
    if tg_op='INSERT' and new.status='pending' then
      perform public.notify_platform_admins(new.workshop_id,'platform','platform_payment_reported','Yeni platform ödeme bildirimi',v_workshop||' • '||to_char(new.amount,'FM999999990.00')||' TL • '||to_char(new.payment_date,'DD.MM.YYYY'),'urgent','platform_payment_report',new.id,jsonb_build_object('target_tab','team','target_section','platform','payment_report_id',new.id),'platform-report:'||new.id||':admins:pending',now(),new.demo_batch_id,null);
    elsif tg_op='UPDATE' and old.status is distinct from new.status and new.status in ('approved','rejected','cancelled') then
      v_type:='platform_payment_'||new.status;
      v_title:=case new.status when 'approved' then 'Platform ödemen onaylandı' when 'rejected' then 'Platform ödemen reddedildi' else 'Platform ödeme bildirimi iptal edildi' end;
      v_body:=v_workshop||' • '||to_char(new.amount,'FM999999990.00')||' TL'||case when new.admin_note is null then '' else ' • '||new.admin_note end;
      perform public.enqueue_user_notification(new.reported_by,new.workshop_id,'platform',v_type,v_title,v_body,case when new.status='approved' then 'high' else 'urgent' end,'platform_payment_report',new.id,jsonb_build_object('target_tab','team','target_section','platform','payment_report_id',new.id,'status',new.status),new.reported_by||':platform-report:'||new.id||':'||new.status,now(),new.demo_batch_id,null);
      perform public.notify_workshop_owners(new.workshop_id,'platform',v_type,v_title,v_body,case when new.status='approved' then 'high' else 'urgent' end,'platform_payment_report',new.id,jsonb_build_object('target_tab','team','target_section','platform','payment_report_id',new.id,'status',new.status),'platform-report:'||new.id||':'||new.status,now(),new.demo_batch_id,null);
    end if;
    for x in select statement_id from public.platform_payment_allocations where payment_report_id=new.id loop perform public.notification_schedule_platform_statement(x.statement_id); end loop;
  exception when others then raise warning 'Platform payment notification skipped: %',sqlerrm; end;
  return new;
end; $$;

drop trigger if exists platform_payment_report_notifications_after_change on public.platform_payment_reports;
create trigger platform_payment_report_notifications_after_change
after insert or update of status,admin_note,reviewed_at on public.platform_payment_reports
for each row execute function public.notify_platform_report_event();

create or replace function public.notify_platform_statement_from_charge()
returns trigger language plpgsql security definer set search_path=public as $$
declare r record; v_workshop uuid; v_date date;
begin
  begin
    if tg_op='DELETE' then v_workshop:=old.workshop_id; v_date:=old.charge_date; else v_workshop:=new.workshop_id; v_date:=new.charge_date; end if;
    for r in select id from public.platform_fee_statements where workshop_id=v_workshop and v_date between cycle_start and cycle_end loop
      perform public.notification_schedule_platform_statement(r.id);
    end loop;
  exception when others then raise warning 'Platform charge notification skipped: %',sqlerrm; end;
  if tg_op='DELETE' then return old; else return new; end if;
end; $$;

drop trigger if exists platform_charge_notifications_after_change on public.platform_fee_charges;
create trigger platform_charge_notifications_after_change
after insert or update of amount,voided_at,charge_date or delete on public.platform_fee_charges
for each row execute function public.notify_platform_statement_from_charge();

create or replace function public.notify_platform_statement_event()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  begin perform public.notification_schedule_platform_statement(new.id); exception when others then raise warning 'Platform statement notification skipped: %',sqlerrm; end;
  return new;
end; $$;

drop trigger if exists platform_statement_notifications_after_change on public.platform_fee_statements;
create trigger platform_statement_notifications_after_change
after insert or update of due_date,cycle_start,cycle_end on public.platform_fee_statements
for each row execute function public.notify_platform_statement_event();

revoke all on function public.notify_platform_report_event() from public,anon,authenticated;
revoke all on function public.notify_platform_statement_from_charge() from public,anon,authenticated;
revoke all on function public.notify_platform_statement_event() from public,anon,authenticated;
