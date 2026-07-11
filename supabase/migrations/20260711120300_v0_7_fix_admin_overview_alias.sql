create or replace function public.admin_get_platform_overview()
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  rec_workshop record;
  v_items jsonb;
  v_summary jsonb;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if not public.is_admin() then raise exception 'Yalnız Admin platform genel görünümünü açabilir'; end if;
  for rec_workshop in select workshop_id from public.workshop_platform_settings loop
    perform public.platform_ensure_statements(rec_workshop.workshop_id);
    perform public.platform_sync_eligible_orders(rec_workshop.workshop_id);
  end loop;

  with statement_balances as (
    select st.workshop_id,st.id,st.due_date,
      coalesce((select sum(c.amount) from public.platform_fee_charges c where c.workshop_id=st.workshop_id and c.voided_at is null and c.charge_date between st.cycle_start and st.cycle_end),0)::numeric charge_amount,
      coalesce((select sum(a.amount) from public.platform_payment_allocations a join public.platform_payment_reports r on r.id=a.payment_report_id where a.statement_id=st.id and r.status='approved'),0)::numeric approved_amount,
      coalesce((select sum(a.amount) from public.platform_payment_allocations a join public.platform_payment_reports r on r.id=a.payment_report_id where a.statement_id=st.id and r.status='pending'),0)::numeric pending_amount
    from public.platform_fee_statements st
  ), workshop_totals as (
    select ws.id,ws.name,ws.is_active,s.is_enabled,s.fee_per_order,s.billing_cycle,s.weekly_due_day,s.monthly_due_day,s.starts_on,
      coalesce(sum(sb.charge_amount),0)::numeric total_charged,
      coalesce(sum(sb.approved_amount),0)::numeric total_approved,
      coalesce(sum(sb.pending_amount),0)::numeric total_pending,
      coalesce(sum(greatest(sb.charge_amount-sb.approved_amount,0)),0)::numeric total_outstanding,
      min(sb.due_date) filter(where greatest(sb.charge_amount-sb.approved_amount,0)>0) oldest_due_date,
      count(*) filter(where greatest(sb.charge_amount-sb.approved_amount,0)>0 and sb.due_date<current_date)::int overdue_period_count
    from public.workshops ws
    join public.workshop_platform_settings s on s.workshop_id=ws.id
    left join statement_balances sb on sb.workshop_id=ws.id
    group by ws.id,ws.name,ws.is_active,s.is_enabled,s.fee_per_order,s.billing_cycle,s.weekly_due_day,s.monthly_due_day,s.starts_on
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'workshop_id',id,'workshop_name',name,'workshop_active',is_active,'is_enabled',is_enabled,'fee_per_order',fee_per_order,'billing_cycle',billing_cycle::text,
    'weekly_due_day',weekly_due_day,'monthly_due_day',monthly_due_day,'starts_on',starts_on,
    'total_charged',total_charged,'total_approved',total_approved,'total_pending',total_pending,'total_outstanding',total_outstanding,
    'oldest_due_date',oldest_due_date,'overdue_period_count',overdue_period_count,
    'status',case when not is_enabled and total_charged=0 then 'disabled' when total_outstanding<=0 then 'paid' when total_pending>0 then 'payment_reported' when total_approved>0 then 'partially_paid' when oldest_due_date<current_date then 'overdue' when oldest_due_date=current_date then 'due_today' else 'open' end
  ) order by total_outstanding desc,name),'[]'::jsonb)
  into v_items from workshop_totals;

  with data as (
    select item from jsonb_array_elements(v_items) item
  ) select jsonb_build_object(
    'business_count',count(*),
    'enabled_business_count',count(*) filter(where (item->>'is_enabled')::boolean),
    'overdue_business_count',count(*) filter(where item->>'status'='overdue'),
    'pending_report_business_count',count(*) filter(where item->>'status'='payment_reported'),
    'total_charged',coalesce(sum((item->>'total_charged')::numeric),0),
    'total_approved',coalesce(sum((item->>'total_approved')::numeric),0),
    'total_pending',coalesce(sum((item->>'total_pending')::numeric),0),
    'total_outstanding',coalesce(sum((item->>'total_outstanding')::numeric),0)
  ) into v_summary from data;

  return jsonb_build_object('summary',coalesce(v_summary,'{}'::jsonb),'businesses',coalesce(v_items,'[]'::jsonb));
end; $$;

revoke execute on function public.admin_get_platform_overview() from public,anon;
grant execute on function public.admin_get_platform_overview() to authenticated;
