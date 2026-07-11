create or replace function public.admin_update_platform_global_settings(
  p_default_fee_per_order numeric,
  p_bank_name text,
  p_account_holder text,
  p_iban text,
  p_payment_note text
)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if not public.is_admin() then raise exception 'Yalnız Admin platform ödeme bilgilerini değiştirebilir'; end if;
  if p_default_fee_per_order is null or p_default_fee_per_order<0 or p_default_fee_per_order>100000 then raise exception 'Geçerli varsayılan işlem bedeli girin'; end if;
  if nullif(trim(coalesce(p_iban,'')),'') is not null and length(regexp_replace(p_iban,'\s','','g')) not between 10 and 34 then raise exception 'IBAN uzunluğu geçersiz'; end if;

  insert into public.platform_global_settings(id,default_fee_per_order,bank_name,account_holder,iban,payment_note,updated_by)
  values(1,p_default_fee_per_order,nullif(trim(p_bank_name),''),nullif(trim(p_account_holder),''),upper(nullif(trim(p_iban),'')),nullif(trim(p_payment_note),''),auth.uid())
  on conflict(id) do update set
    default_fee_per_order=excluded.default_fee_per_order,
    bank_name=excluded.bank_name,
    account_holder=excluded.account_holder,
    iban=excluded.iban,
    payment_note=excluded.payment_note,
    updated_by=auth.uid(),
    updated_at=now();

  return (select to_jsonb(g) from public.platform_global_settings g where id=1);
end; $$;

create or replace function public.admin_update_workshop_platform_settings(
  p_workshop_id uuid,
  p_fee_per_order numeric,
  p_billing_cycle text,
  p_weekly_due_day integer,
  p_monthly_due_day integer,
  p_starts_on date,
  p_is_enabled boolean
)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_old public.workshop_platform_settings%rowtype;
  v_reports int;
  v_cycle public.platform_billing_cycle;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if not public.is_admin() then raise exception 'Yalnız Admin işletme platform bedelini değiştirebilir'; end if;
  if not exists(select 1 from public.workshops where id=p_workshop_id) then raise exception 'İşletme bulunamadı'; end if;
  if p_fee_per_order is null or p_fee_per_order<0 or p_fee_per_order>100000 then raise exception 'İşlem başı bedel geçersiz'; end if;
  if p_billing_cycle not in ('weekly','monthly') then raise exception 'Ödeme periyodu haftalık veya aylık olmalıdır'; end if;
  if p_weekly_due_day not between 1 and 7 then raise exception 'Haftalık ödeme günü geçersiz'; end if;
  if not (p_monthly_due_day=0 or p_monthly_due_day between 1 and 28) then raise exception 'Aylık ödeme günü 1-28 veya son gün olmalıdır'; end if;
  if p_starts_on is null or p_starts_on<date '2020-01-01' or p_starts_on>current_date+365 then raise exception 'Başlangıç tarihi geçersiz'; end if;
  v_cycle:=p_billing_cycle::public.platform_billing_cycle;

  select * into v_old from public.workshop_platform_settings where workshop_id=p_workshop_id;
  select count(*) into v_reports from public.platform_payment_reports where workshop_id=p_workshop_id and status in ('pending','approved');

  if found and v_reports>0 and (v_old.billing_cycle<>v_cycle or v_old.starts_on<>p_starts_on) then
    raise exception 'Ödeme geçmişi bulunan işletmede periyot veya başlangıç tarihi değiştirilemez';
  end if;

  if v_reports=0 and found and (v_old.billing_cycle<>v_cycle or v_old.starts_on<>p_starts_on) then
    delete from public.platform_fee_statements where workshop_id=p_workshop_id;
    delete from public.platform_fee_charges where workshop_id=p_workshop_id and charge_date<p_starts_on;
  end if;

  insert into public.workshop_platform_settings(workshop_id,fee_per_order,billing_cycle,weekly_due_day,monthly_due_day,starts_on,is_enabled,updated_by)
  values(p_workshop_id,p_fee_per_order,v_cycle,p_weekly_due_day,p_monthly_due_day,p_starts_on,coalesce(p_is_enabled,false),auth.uid())
  on conflict(workshop_id) do update set
    fee_per_order=excluded.fee_per_order,
    billing_cycle=excluded.billing_cycle,
    weekly_due_day=excluded.weekly_due_day,
    monthly_due_day=excluded.monthly_due_day,
    starts_on=excluded.starts_on,
    is_enabled=excluded.is_enabled,
    updated_by=auth.uid(),
    updated_at=now();

  perform public.platform_ensure_statements(p_workshop_id);
  perform public.platform_sync_eligible_orders(p_workshop_id);

  return (select to_jsonb(s) from public.workshop_platform_settings s where workshop_id=p_workshop_id);
end; $$;

create or replace function public.platform_get_dashboard(p_workshop_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  s public.workshop_platform_settings%rowtype;
  v_current_start date;
  v_summary jsonb;
  v_periods jsonb;
  v_reports jsonb;
  v_charges jsonb;
  v_global jsonb;
  v_current record;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if not public.is_workshop_owner(p_workshop_id) then raise exception 'Platform ödeme ekranına erişim yetkiniz yok'; end if;

  select * into s from public.workshop_platform_settings where workshop_id=p_workshop_id;
  if not found then
    insert into public.workshop_platform_settings(workshop_id,fee_per_order)
    select p_workshop_id,default_fee_per_order from public.platform_global_settings where id=1
    on conflict(workshop_id) do nothing;
    select * into s from public.workshop_platform_settings where workshop_id=p_workshop_id;
  end if;

  perform public.platform_ensure_statements(p_workshop_id);
  perform public.platform_sync_eligible_orders(p_workshop_id);
  select cycle_start into v_current_start from public.platform_period_values(s.billing_cycle,current_date,s.weekly_due_day,s.monthly_due_day);

  with balances as (
    select st.id,st.cycle_start,st.cycle_end,st.due_date,
      coalesce((select sum(c.amount) from public.platform_fee_charges c where c.workshop_id=p_workshop_id and c.voided_at is null and c.charge_date between st.cycle_start and st.cycle_end),0)::numeric as charge_amount,
      coalesce((select sum(a.amount) from public.platform_payment_allocations a join public.platform_payment_reports r on r.id=a.payment_report_id where a.statement_id=st.id and r.status='approved'),0)::numeric as approved_amount,
      coalesce((select sum(a.amount) from public.platform_payment_allocations a join public.platform_payment_reports r on r.id=a.payment_report_id where a.statement_id=st.id and r.status='pending'),0)::numeric as pending_amount
    from public.platform_fee_statements st where st.workshop_id=p_workshop_id
  ), enriched as (
    select *,greatest(charge_amount-approved_amount,0)::numeric as remaining_amount,
      case
        when greatest(charge_amount-approved_amount,0)<=0 and charge_amount>0 then 'paid'
        when pending_amount>0 then 'payment_reported'
        when approved_amount>0 then 'partially_paid'
        when greatest(charge_amount-approved_amount,0)>0 and current_date>due_date then 'overdue'
        when greatest(charge_amount-approved_amount,0)>0 and current_date=due_date then 'due_today'
        else 'open'
      end as display_status
    from balances
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',id,'cycle_start',cycle_start,'cycle_end',cycle_end,'due_date',due_date,
    'charge_amount',charge_amount,'approved_amount',approved_amount,'pending_amount',pending_amount,
    'remaining_amount',remaining_amount,'status',display_status
  ) order by cycle_start desc),'[]'::jsonb)
  into v_periods from (select * from enriched order by cycle_start desc limit 36) q;

  with balances as (
    select st.id,st.cycle_start,st.cycle_end,st.due_date,
      coalesce((select sum(c.amount) from public.platform_fee_charges c where c.workshop_id=p_workshop_id and c.voided_at is null and c.charge_date between st.cycle_start and st.cycle_end),0)::numeric as charge_amount,
      coalesce((select sum(a.amount) from public.platform_payment_allocations a join public.platform_payment_reports r on r.id=a.payment_report_id where a.statement_id=st.id and r.status='approved'),0)::numeric as approved_amount,
      coalesce((select sum(a.amount) from public.platform_payment_allocations a join public.platform_payment_reports r on r.id=a.payment_report_id where a.statement_id=st.id and r.status='pending'),0)::numeric as pending_amount
    from public.platform_fee_statements st where st.workshop_id=p_workshop_id
  ), totals as (
    select
      coalesce(sum(charge_amount),0)::numeric total_charged,
      coalesce(sum(approved_amount),0)::numeric total_approved,
      coalesce(sum(pending_amount),0)::numeric total_pending,
      coalesce(sum(greatest(charge_amount-approved_amount,0)),0)::numeric total_outstanding,
      coalesce(sum(greatest(charge_amount-approved_amount-pending_amount,0)),0)::numeric available_to_report,
      coalesce(sum(greatest(charge_amount-approved_amount,0)) filter(where cycle_start<v_current_start),0)::numeric carryover_amount,
      min(due_date) filter(where greatest(charge_amount-approved_amount,0)>0) oldest_due_date,
      count(*)::int period_count
    from balances
  ), current_period as (
    select * from balances where cycle_start=v_current_start limit 1
  )
  select jsonb_build_object(
    'total_charged',t.total_charged,
    'total_approved',t.total_approved,
    'total_pending',t.total_pending,
    'total_outstanding',t.total_outstanding,
    'available_to_report',t.available_to_report,
    'credit_balance',greatest(t.total_approved-t.total_charged,0),
    'carryover_amount',t.carryover_amount,
    'oldest_due_date',t.oldest_due_date,
    'period_count',t.period_count,
    'charge_count',(select count(*) from public.platform_fee_charges where workshop_id=p_workshop_id and voided_at is null),
    'current_statement_id',cp.id,
    'current_cycle_start',cp.cycle_start,
    'current_cycle_end',cp.cycle_end,
    'current_due_date',cp.due_date,
    'current_period_charge',coalesce(cp.charge_amount,0),
    'current_period_approved',coalesce(cp.approved_amount,0),
    'current_period_pending',coalesce(cp.pending_amount,0),
    'current_period_remaining',greatest(coalesce(cp.charge_amount,0)-coalesce(cp.approved_amount,0),0),
    'status',case
      when not s.is_enabled and t.total_charged=0 then 'disabled'
      when t.total_outstanding<=0 then 'paid'
      when t.total_pending>0 then 'payment_reported'
      when t.total_approved>0 then 'partially_paid'
      when t.oldest_due_date<current_date then 'overdue'
      when t.oldest_due_date=current_date then 'due_today'
      else 'open'
    end
  ) into v_summary
  from totals t left join current_period cp on true;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',r.id,'amount',r.amount,'payment_date',r.payment_date,'note',r.note,'receipt_path',r.receipt_path,
    'status',r.status::text,'admin_note',r.admin_note,'reported_by',r.reported_by,'reported_by_name',p.full_name,
    'reviewed_by',r.reviewed_by,'reviewed_by_name',rp.full_name,'reviewed_at',r.reviewed_at,'created_at',r.created_at,
    'allocations',coalesce((select jsonb_agg(jsonb_build_object('statement_id',a.statement_id,'amount',a.amount,'cycle_start',st.cycle_start,'cycle_end',st.cycle_end,'due_date',st.due_date) order by st.cycle_start) from public.platform_payment_allocations a join public.platform_fee_statements st on st.id=a.statement_id where a.payment_report_id=r.id),'[]'::jsonb)
  ) order by r.created_at desc),'[]'::jsonb)
  into v_reports
  from (select * from public.platform_payment_reports where workshop_id=p_workshop_id order by created_at desc limit 100) r
  join public.profiles p on p.id=r.reported_by
  left join public.profiles rp on rp.id=r.reviewed_by;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',c.id,'work_order_id',c.work_order_id,'fee_per_order',c.fee_per_order,'amount',c.amount,'charge_date',c.charge_date,
    'source_status',c.source_status::text,'charged_at',c.charged_at,'voided_at',c.voided_at,
    'customer_name',cu.full_name,'brand',m.brand,'model',m.model,'plate',m.plate,'complaint',wo.complaint
  ) order by c.charge_date desc,c.charged_at desc),'[]'::jsonb)
  into v_charges
  from (select * from public.platform_fee_charges where workshop_id=p_workshop_id order by charge_date desc,charged_at desc limit 100) c
  join public.work_orders wo on wo.id=c.work_order_id
  join public.customers cu on cu.id=wo.customer_id
  join public.motorcycles m on m.id=wo.motorcycle_id;

  select jsonb_build_object('default_fee_per_order',default_fee_per_order,'bank_name',bank_name,'account_holder',account_holder,'iban',iban,'payment_note',payment_note,'updated_at',updated_at)
  into v_global from public.platform_global_settings where id=1;

  return jsonb_build_object(
    'is_admin',public.is_admin(),
    'settings',jsonb_build_object('workshop_id',s.workshop_id,'fee_per_order',s.fee_per_order,'billing_cycle',s.billing_cycle::text,'weekly_due_day',s.weekly_due_day,'monthly_due_day',s.monthly_due_day,'starts_on',s.starts_on,'is_enabled',s.is_enabled,'updated_at',s.updated_at),
    'global_settings',coalesce(v_global,'{}'::jsonb),
    'summary',coalesce(v_summary,'{}'::jsonb),
    'periods',coalesce(v_periods,'[]'::jsonb),
    'payment_reports',coalesce(v_reports,'[]'::jsonb),
    'charges',coalesce(v_charges,'[]'::jsonb)
  );
end; $$;

create or replace function public.owner_report_platform_payment(
  p_workshop_id uuid,
  p_amount numeric,
  p_payment_date date,
  p_note text,
  p_receipt_path text
)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_available numeric(12,2);
  v_remaining numeric(12,2);
  v_allocate numeric(12,2);
  v_report_id uuid;
  rec record;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if not public.is_workshop_owner(p_workshop_id) then raise exception 'Ödeme bildirme yetkiniz yok'; end if;
  if p_amount is null or p_amount<=0 or p_amount>10000000 then raise exception 'Geçerli ödeme tutarı girin'; end if;
  if p_payment_date is null or p_payment_date>current_date+1 or p_payment_date<date '2020-01-01' then raise exception 'Ödeme tarihi geçersiz'; end if;
  if length(coalesce(p_note,''))>2000 then raise exception 'Açıklama çok uzun'; end if;
  if p_receipt_path is not null and (length(p_receipt_path)>500 or p_receipt_path not like p_workshop_id::text||'/%') then raise exception 'Dekont yolu geçersiz'; end if;

  perform pg_advisory_xact_lock(hashtextextended(p_workshop_id::text,0));
  perform public.platform_ensure_statements(p_workshop_id);
  perform public.platform_sync_eligible_orders(p_workshop_id);

  with balances as (
    select st.id,
      coalesce((select sum(c.amount) from public.platform_fee_charges c where c.workshop_id=p_workshop_id and c.voided_at is null and c.charge_date between st.cycle_start and st.cycle_end),0)::numeric as charge_amount,
      coalesce((select sum(a.amount) from public.platform_payment_allocations a join public.platform_payment_reports r on r.id=a.payment_report_id where a.statement_id=st.id and r.status in ('approved','pending')),0)::numeric as reserved_amount
    from public.platform_fee_statements st where st.workshop_id=p_workshop_id
  ) select coalesce(sum(greatest(charge_amount-reserved_amount,0)),0) into v_available from balances;

  if p_amount>v_available+0.009 then raise exception 'Bildirilen tutar kalan platform borcunu aşıyor. Kullanılabilir tutar: % TL',v_available; end if;

  insert into public.platform_payment_reports(workshop_id,reported_by,amount,payment_date,note,receipt_path,status)
  values(p_workshop_id,auth.uid(),round(p_amount,2),p_payment_date,nullif(trim(p_note),''),nullif(trim(p_receipt_path),''),'pending')
  returning id into v_report_id;

  v_remaining:=round(p_amount,2);
  for rec in
    select st.id,st.cycle_start,
      greatest(
        coalesce((select sum(c.amount) from public.platform_fee_charges c where c.workshop_id=p_workshop_id and c.voided_at is null and c.charge_date between st.cycle_start and st.cycle_end),0)
        -coalesce((select sum(a.amount) from public.platform_payment_allocations a join public.platform_payment_reports r on r.id=a.payment_report_id where a.statement_id=st.id and r.status in ('approved','pending')),0),0
      )::numeric as available_amount
    from public.platform_fee_statements st
    where st.workshop_id=p_workshop_id
    order by st.cycle_start
  loop
    exit when v_remaining<=0.009;
    if rec.available_amount>0 then
      v_allocate:=least(v_remaining,rec.available_amount);
      insert into public.platform_payment_allocations(payment_report_id,statement_id,amount)
      values(v_report_id,rec.id,v_allocate);
      v_remaining:=v_remaining-v_allocate;
    end if;
  end loop;

  if v_remaining>0.009 then raise exception 'Ödeme dönemlere dağıtılamadı'; end if;
  return jsonb_build_object('payment_report_id',v_report_id,'amount',round(p_amount,2),'status','pending');
end; $$;

create or replace function public.admin_review_platform_payment(
  p_payment_report_id uuid,
  p_approve boolean,
  p_admin_note text
)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r public.platform_payment_reports%rowtype;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if not public.is_admin() then raise exception 'Yalnız Admin ödeme bildirimini inceleyebilir'; end if;
  if length(coalesce(p_admin_note,''))>2000 then raise exception 'Admin notu çok uzun'; end if;

  select * into r from public.platform_payment_reports where id=p_payment_report_id for update;
  if not found then raise exception 'Ödeme bildirimi bulunamadı'; end if;
  if r.status<>'pending' then raise exception 'Yalnız bekleyen ödeme bildirimi incelenebilir'; end if;

  perform pg_advisory_xact_lock(hashtextextended(r.workshop_id::text,0));
  update public.platform_payment_reports set
    status=case when p_approve then 'approved'::public.platform_payment_report_status else 'rejected'::public.platform_payment_report_status end,
    admin_note=nullif(trim(p_admin_note),''),reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now()
  where id=p_payment_report_id;

  return jsonb_build_object('payment_report_id',p_payment_report_id,'status',case when p_approve then 'approved' else 'rejected' end,'workshop_id',r.workshop_id);
end; $$;

create or replace function public.owner_cancel_platform_payment_report(p_payment_report_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare r public.platform_payment_reports%rowtype;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  select * into r from public.platform_payment_reports where id=p_payment_report_id for update;
  if not found then raise exception 'Ödeme bildirimi bulunamadı'; end if;
  if not public.is_workshop_owner(r.workshop_id) then raise exception 'Ödeme bildirimini iptal etme yetkiniz yok'; end if;
  if r.status<>'pending' then raise exception 'Yalnız bekleyen ödeme bildirimi iptal edilebilir'; end if;
  update public.platform_payment_reports set status='cancelled',reviewed_at=now(),updated_at=now() where id=p_payment_report_id;
  return jsonb_build_object('payment_report_id',p_payment_report_id,'status','cancelled');
end; $$;

create or replace function public.admin_get_platform_overview()
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  w record;
  v_items jsonb;
  v_summary jsonb;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if not public.is_admin() then raise exception 'Yalnız Admin platform genel görünümünü açabilir'; end if;
  for w in select workshop_id from public.workshop_platform_settings loop
    perform public.platform_ensure_statements(w.workshop_id);
    perform public.platform_sync_eligible_orders(w.workshop_id);
  end loop;

  with statement_balances as (
    select st.workshop_id,st.id,st.due_date,
      coalesce((select sum(c.amount) from public.platform_fee_charges c where c.workshop_id=st.workshop_id and c.voided_at is null and c.charge_date between st.cycle_start and st.cycle_end),0)::numeric charge_amount,
      coalesce((select sum(a.amount) from public.platform_payment_allocations a join public.platform_payment_reports r on r.id=a.payment_report_id where a.statement_id=st.id and r.status='approved'),0)::numeric approved_amount,
      coalesce((select sum(a.amount) from public.platform_payment_allocations a join public.platform_payment_reports r on r.id=a.payment_report_id where a.statement_id=st.id and r.status='pending'),0)::numeric pending_amount
    from public.platform_fee_statements st
  ), workshop_totals as (
    select w.id,w.name,w.is_active,s.is_enabled,s.fee_per_order,s.billing_cycle,s.weekly_due_day,s.monthly_due_day,s.starts_on,
      coalesce(sum(sb.charge_amount),0)::numeric total_charged,
      coalesce(sum(sb.approved_amount),0)::numeric total_approved,
      coalesce(sum(sb.pending_amount),0)::numeric total_pending,
      coalesce(sum(greatest(sb.charge_amount-sb.approved_amount,0)),0)::numeric total_outstanding,
      min(sb.due_date) filter(where greatest(sb.charge_amount-sb.approved_amount,0)>0) oldest_due_date,
      count(*) filter(where greatest(sb.charge_amount-sb.approved_amount,0)>0 and sb.due_date<current_date)::int overdue_period_count
    from public.workshops w
    join public.workshop_platform_settings s on s.workshop_id=w.id
    left join statement_balances sb on sb.workshop_id=w.id
    group by w.id,w.name,w.is_active,s.is_enabled,s.fee_per_order,s.billing_cycle,s.weekly_due_day,s.monthly_due_day,s.starts_on
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

create or replace function public.create_v07_demo_data(p_workshop_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_root uuid:=public.resolve_demo_root_workshop(p_workshop_id);
  v_batch uuid;
  v_timezone text;
  v_result jsonb;
  v_report uuid;
  v_demo_count int;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if not public.is_workshop_owner(v_root) then raise exception 'Demo yetkisi yok'; end if;
  select id into v_batch from public.demo_batches where workshop_id=v_root order by created_at desc limit 1;
  if v_batch is null then raise exception 'Önce temel demo verilerini yükleyin'; end if;
  select coalesce(timezone,'Europe/Istanbul') into v_timezone from public.workshops where id=v_root;

  if public.is_admin() then
    update public.platform_global_settings set
      bank_name=coalesce(bank_name,'DraBorn Demo Banka'),
      account_holder=coalesce(account_holder,'DraBornGarage Platform'),
      iban=coalesce(iban,'TR00 0000 0000 0000 0000 0000 00'),
      payment_note=coalesce(payment_note,'Açıklamaya işletme adı ve dönem bilgisini yazın.'),
      updated_by=auth.uid(),updated_at=now()
    where id=1;
  end if;

  update public.workshop_platform_settings set
    fee_per_order=20,billing_cycle='monthly',monthly_due_day=1,weekly_due_day=1,
    starts_on=(date_trunc('month',current_date)-interval '1 month')::date,is_enabled=true,updated_by=auth.uid(),updated_at=now()
  where workshop_id=v_root;

  if not exists(select 1 from public.platform_payment_reports where workshop_id=v_root and status in ('pending','approved')) then
    delete from public.platform_fee_statements where workshop_id=v_root;
  end if;

  with ranked as (
    select id,row_number() over(order by created_at) rn from public.work_orders where workshop_id=v_root and demo_batch_id=v_batch order by created_at limit 5
  )
  update public.work_orders wo set
    status=case when r.rn=1 then 'delivered'::public.work_order_status when r.rn=2 then 'completed'::public.work_order_status when r.rn=3 then 'ready'::public.work_order_status else wo.status end,
    arrived_at=case when r.rn=1 then ((date_trunc('month',current_date)-interval '10 days')::date+time '10:20') at time zone v_timezone when r.rn=2 then ((date_trunc('month',current_date)::date+2)+time '14:30') at time zone v_timezone when r.rn=3 then (current_date+time '11:15') at time zone v_timezone else wo.arrived_at end,
    completed_at=case when r.rn in (1,2) then (case when r.rn=1 then ((date_trunc('month',current_date)-interval '10 days')::date+time '12:20') at time zone v_timezone else ((date_trunc('month',current_date)::date+2)+time '16:15') at time zone v_timezone end) else wo.completed_at end,
    ready_at=case when r.rn=3 then (current_date+time '13:30') at time zone v_timezone else wo.ready_at end,
    delivered_at=case when r.rn=1 then ((date_trunc('month',current_date)-interval '10 days')::date+time '13:00') at time zone v_timezone else wo.delivered_at end
  from ranked r where wo.id=r.id;

  perform public.platform_ensure_statements(v_root);
  perform public.platform_sync_eligible_orders(v_root);

  select count(*) into v_demo_count from public.platform_payment_reports where workshop_id=v_root and demo_batch_id=v_batch;
  if v_demo_count=0 then
    v_result:=public.owner_report_platform_payment(v_root,10,current_date-5,'v0.7 demo • onaylanmış kısmi platform ödemesi',null);
    v_report:=(v_result->>'payment_report_id')::uuid;
    update public.platform_payment_reports set status='approved',admin_note='Demo Admin onayı',reviewed_by=auth.uid(),reviewed_at=now(),demo_batch_id=v_batch where id=v_report;

    v_result:=public.owner_report_platform_payment(v_root,20,current_date,'v0.7 demo • Admin onayı bekleyen ödeme',null);
    v_report:=(v_result->>'payment_report_id')::uuid;
    update public.platform_payment_reports set demo_batch_id=v_batch where id=v_report;

    v_result:=public.owner_report_platform_payment(v_root,5,current_date-2,'v0.7 demo • reddedilmiş ödeme bildirimi',null);
    v_report:=(v_result->>'payment_report_id')::uuid;
    update public.platform_payment_reports set status='rejected',admin_note='Demo • dekont okunamadı',reviewed_by=auth.uid(),reviewed_at=now(),demo_batch_id=v_batch where id=v_report;
  end if;

  return jsonb_build_object('v07_ready',true,'workshop_id',v_root,'batch_id',v_batch,'charge_count',(select count(*) from public.platform_fee_charges where workshop_id=v_root and voided_at is null),'payment_report_count',(select count(*) from public.platform_payment_reports where workshop_id=v_root and demo_batch_id=v_batch));
end; $$;

revoke execute on function public.admin_update_platform_global_settings(numeric,text,text,text,text) from public,anon;
revoke execute on function public.admin_update_workshop_platform_settings(uuid,numeric,text,integer,integer,date,boolean) from public,anon;
revoke execute on function public.platform_get_dashboard(uuid) from public,anon;
revoke execute on function public.owner_report_platform_payment(uuid,numeric,date,text,text) from public,anon;
revoke execute on function public.admin_review_platform_payment(uuid,boolean,text) from public,anon;
revoke execute on function public.owner_cancel_platform_payment_report(uuid) from public,anon;
revoke execute on function public.admin_get_platform_overview() from public,anon;
revoke execute on function public.create_v07_demo_data(uuid) from public,anon;

grant execute on function public.admin_update_platform_global_settings(numeric,text,text,text,text) to authenticated;
grant execute on function public.admin_update_workshop_platform_settings(uuid,numeric,text,integer,integer,date,boolean) to authenticated;
grant execute on function public.platform_get_dashboard(uuid) to authenticated;
grant execute on function public.owner_report_platform_payment(uuid,numeric,date,text,text) to authenticated;
grant execute on function public.admin_review_platform_payment(uuid,boolean,text) to authenticated;
grant execute on function public.owner_cancel_platform_payment_report(uuid) to authenticated;
grant execute on function public.admin_get_platform_overview() to authenticated;
grant execute on function public.create_v07_demo_data(uuid) to authenticated;
