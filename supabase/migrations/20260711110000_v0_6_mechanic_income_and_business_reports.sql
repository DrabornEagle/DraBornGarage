create index if not exists idx_services_workshop_mechanic_completed
  on public.work_order_services(workshop_id, mechanic_id, completed_at desc, created_at desc);
create index if not exists idx_parts_workshop_mechanic_used
  on public.work_order_parts(workshop_id, mechanic_id, used_at desc);
create index if not exists idx_payments_workshop_receiver_paid
  on public.payments(workshop_id, received_by, paid_at desc);
create index if not exists idx_orders_workshop_mechanic_arrived
  on public.work_orders(workshop_id, assigned_mechanic_id, arrived_at desc);

create or replace function public.staff_get_personal_report(
  p_workshop_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_timezone text;
  v_summary jsonb;
  v_hourly jsonb;
  v_daily jsonb;
  v_jobs jsonb;
begin
  if v_user_id is null then raise exception 'Oturum gerekli'; end if;
  if p_from is null or p_to is null or p_from >= p_to then raise exception 'Geçerli rapor tarih aralığı gerekli'; end if;
  if p_to - p_from > interval '3660 days' then raise exception 'Rapor aralığı en fazla 10 yıl olabilir'; end if;

  if not exists (
    select 1 from public.workshop_members wm
    where wm.workshop_id=p_workshop_id and wm.user_id=v_user_id and wm.is_active
      and wm.role in ('mechanic','owner_mechanic')
  ) then raise exception 'Kişisel usta raporuna erişim yetkiniz yok'; end if;

  select coalesce(timezone,'Europe/Istanbul') into v_timezone from public.workshops where id=p_workshop_id;

  with my_orders as (
    select distinct wo.*
    from public.work_orders wo
    where wo.workshop_id=p_workshop_id
      and wo.arrived_at>=p_from and wo.arrived_at<p_to
      and (
        wo.assigned_mechanic_id=v_user_id
        or exists(select 1 from public.work_order_services s where s.work_order_id=wo.id and s.mechanic_id=v_user_id)
      )
  ), my_services as (
    select s.* from public.work_order_services s
    join my_orders wo on wo.id=s.work_order_id
    where s.mechanic_id=v_user_id
  ), my_parts as (
    select p.* from public.work_order_parts p
    join my_orders wo on wo.id=p.work_order_id
    where p.mechanic_id=v_user_id or (p.mechanic_id is null and wo.assigned_mechanic_id=v_user_id)
  )
  select jsonb_build_object(
    'order_count',(select count(*) from my_orders),
    'active_order_count',(select count(*) from my_orders where status not in ('completed','delivered','cancelled')),
    'completed_order_count',(select count(*) from my_orders where status in ('completed','delivered')),
    'service_count',(select count(*) from my_services),
    'completed_service_count',(select count(*) from my_services where completed),
    'recorded_amount',coalesce((select sum(price) from my_services where completed),0),
    'parts_count',coalesce((select sum(quantity) from my_parts),0),
    'parts_amount',coalesce((select sum(total_price) from my_parts),0),
    'cash_collected',coalesce((select sum(amount) from public.payments where workshop_id=p_workshop_id and received_by=v_user_id and payment_method='cash' and paid_at>=p_from and paid_at<p_to),0),
    'transfer_collected',coalesce((select sum(amount) from public.payments where workshop_id=p_workshop_id and received_by=v_user_id and payment_method='transfer' and paid_at>=p_from and paid_at<p_to),0),
    'open_receivable_amount',coalesce((select sum(greatest(0,total_amount-amount_received)) from my_orders where receivable_status='open'),0),
    'period_from',p_from,
    'period_to',p_to,
    'timezone',v_timezone
  ) into v_summary;

  with hours as (select generate_series(0,23) as hour_value), my_orders as (
    select distinct wo.id,wo.arrived_at
    from public.work_orders wo
    where wo.workshop_id=p_workshop_id and wo.arrived_at>=p_from and wo.arrived_at<p_to
      and (wo.assigned_mechanic_id=v_user_id or exists(select 1 from public.work_order_services s where s.work_order_id=wo.id and s.mechanic_id=v_user_id))
  ), counts as (
    select extract(hour from arrived_at at time zone v_timezone)::int as hour_value,count(*)::int as order_count
    from my_orders group by 1
  )
  select jsonb_agg(jsonb_build_object('hour',h.hour_value,'order_count',coalesce(c.order_count,0)) order by h.hour_value)
  into v_hourly from hours h left join counts c using(hour_value);

  with days as (
    select generate_series((p_from at time zone v_timezone)::date,((p_to-interval '1 second') at time zone v_timezone)::date,interval '1 day')::date as day_value
  ), my_orders as (
    select distinct wo.id,wo.arrived_at
    from public.work_orders wo
    where wo.workshop_id=p_workshop_id and wo.arrived_at>=p_from and wo.arrived_at<p_to
      and (wo.assigned_mechanic_id=v_user_id or exists(select 1 from public.work_order_services s where s.work_order_id=wo.id and s.mechanic_id=v_user_id))
  ), order_counts as (
    select (arrived_at at time zone v_timezone)::date day_value,count(*)::int order_count from my_orders group by 1
  ), service_totals as (
    select (wo.arrived_at at time zone v_timezone)::date day_value,coalesce(sum(s.price) filter(where s.completed),0) recorded_amount
    from my_orders wo left join public.work_order_services s on s.work_order_id=wo.id and s.mechanic_id=v_user_id
    group by 1
  )
  select jsonb_agg(jsonb_build_object('date',d.day_value,'order_count',coalesce(o.order_count,0),'recorded_amount',coalesce(s.recorded_amount,0)) order by d.day_value)
  into v_daily from days d left join order_counts o using(day_value) left join service_totals s using(day_value);

  with my_orders as (
    select distinct wo.*
    from public.work_orders wo
    where wo.workshop_id=p_workshop_id and wo.arrived_at>=p_from and wo.arrived_at<p_to
      and (wo.assigned_mechanic_id=v_user_id or exists(select 1 from public.work_order_services s where s.work_order_id=wo.id and s.mechanic_id=v_user_id))
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'work_order_id',wo.id,
    'arrived_at',wo.arrived_at,
    'started_at',wo.started_at,
    'completed_at',wo.completed_at,
    'delivered_at',wo.delivered_at,
    'status',wo.status::text,
    'complaint',wo.complaint,
    'customer_name',c.full_name,
    'brand',m.brand,
    'model',m.model,
    'plate',m.plate,
    'recorded_amount',coalesce((select sum(s.price) from public.work_order_services s where s.work_order_id=wo.id and s.mechanic_id=v_user_id and s.completed),0),
    'services',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'title',s.title,'description',s.description,'price',s.price,'completed',s.completed,'started_at',s.started_at,'completed_at',s.completed_at) order by s.created_at) from public.work_order_services s where s.work_order_id=wo.id and s.mechanic_id=v_user_id),'[]'::jsonb),
    'parts',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'part_name',p.part_name,'quantity',p.quantity,'unit_price',p.unit_price,'total_price',p.total_price,'used_at',p.used_at) order by p.used_at) from public.work_order_parts p where p.work_order_id=wo.id and (p.mechanic_id=v_user_id or (p.mechanic_id is null and wo.assigned_mechanic_id=v_user_id))),'[]'::jsonb)
  ) order by wo.arrived_at desc),'[]'::jsonb)
  into v_jobs
  from my_orders wo join public.customers c on c.id=wo.customer_id join public.motorcycles m on m.id=wo.motorcycle_id;

  return jsonb_build_object('summary',v_summary,'hourly_arrivals',coalesce(v_hourly,'[]'::jsonb),'daily_trend',coalesce(v_daily,'[]'::jsonb),'jobs',coalesce(v_jobs,'[]'::jsonb));
end;
$$;

create or replace function public.owner_get_business_report(
  p_workshop_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_timezone text;
  v_summary jsonb;
  v_mechanics jsonb;
  v_hourly jsonb;
  v_daily jsonb;
  v_top_services jsonb;
  v_recent_orders jsonb;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if p_from is null or p_to is null or p_from>=p_to then raise exception 'Geçerli rapor tarih aralığı gerekli'; end if;
  if p_to-p_from>interval '3660 days' then raise exception 'Rapor aralığı en fazla 10 yıl olabilir'; end if;
  if not (public.is_admin() or public.is_workshop_owner(p_workshop_id)) then raise exception 'İşletme raporuna erişim yetkiniz yok'; end if;

  select coalesce(timezone,'Europe/Istanbul') into v_timezone from public.workshops where id=p_workshop_id;

  with period_orders as (
    select * from public.work_orders where workshop_id=p_workshop_id and arrived_at>=p_from and arrived_at<p_to
  )
  select jsonb_build_object(
    'order_count',count(*),
    'active_order_count',count(*) filter(where status not in ('completed','delivered','cancelled')),
    'completed_order_count',count(*) filter(where status in ('completed','delivered')),
    'cancelled_order_count',count(*) filter(where status='cancelled'),
    'total_recorded_amount',coalesce(sum(total_amount),0),
    'labor_amount',coalesce(sum(labor_amount),0),
    'parts_amount',coalesce(sum(parts_amount),0),
    'amount_received_on_orders',coalesce(sum(amount_received),0),
    'period_cash_collected',coalesce((select sum(amount) from public.payments where workshop_id=p_workshop_id and payment_method='cash' and paid_at>=p_from and paid_at<p_to),0),
    'period_transfer_collected',coalesce((select sum(amount) from public.payments where workshop_id=p_workshop_id and payment_method='transfer' and paid_at>=p_from and paid_at<p_to),0),
    'current_open_receivable',coalesce((select sum(greatest(0,total_amount-amount_received)) from public.work_orders where workshop_id=p_workshop_id and receivable_status='open'),0),
    'period_open_receivable',coalesce(sum(greatest(0,total_amount-amount_received)) filter(where receivable_status='open'),0),
    'customer_count',count(distinct customer_id),
    'motorcycle_count',count(distinct motorcycle_id),
    'period_from',p_from,
    'period_to',p_to,
    'timezone',v_timezone
  ) into v_summary from period_orders;

  with mechanics as (
    select wm.user_id,wm.role,wm.is_active,p.full_name,p.phone
    from public.workshop_members wm join public.profiles p on p.id=wm.user_id
    where wm.workshop_id=p_workshop_id and wm.role in ('mechanic','owner_mechanic')
  ), period_orders as (
    select * from public.work_orders where workshop_id=p_workshop_id and arrived_at>=p_from and arrived_at<p_to
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'user_id',m.user_id,
    'full_name',m.full_name,
    'phone',m.phone,
    'role',m.role::text,
    'is_active',m.is_active,
    'order_count',(select count(distinct wo.id) from period_orders wo where wo.assigned_mechanic_id=m.user_id or exists(select 1 from public.work_order_services s where s.work_order_id=wo.id and s.mechanic_id=m.user_id)),
    'active_order_count',(select count(distinct wo.id) from period_orders wo where wo.status not in ('completed','delivered','cancelled') and (wo.assigned_mechanic_id=m.user_id or exists(select 1 from public.work_order_services s where s.work_order_id=wo.id and s.mechanic_id=m.user_id))),
    'service_count',(select count(*) from public.work_order_services s join period_orders wo on wo.id=s.work_order_id where s.mechanic_id=m.user_id),
    'completed_service_count',(select count(*) from public.work_order_services s join period_orders wo on wo.id=s.work_order_id where s.mechanic_id=m.user_id and s.completed),
    'recorded_amount',coalesce((select sum(s.price) from public.work_order_services s join period_orders wo on wo.id=s.work_order_id where s.mechanic_id=m.user_id and s.completed),0),
    'parts_count',coalesce((select sum(p.quantity) from public.work_order_parts p join period_orders wo on wo.id=p.work_order_id where p.mechanic_id=m.user_id or (p.mechanic_id is null and wo.assigned_mechanic_id=m.user_id)),0),
    'cash_collected',coalesce((select sum(pay.amount) from public.payments pay where pay.workshop_id=p_workshop_id and pay.received_by=m.user_id and pay.payment_method='cash' and pay.paid_at>=p_from and pay.paid_at<p_to),0),
    'transfer_collected',coalesce((select sum(pay.amount) from public.payments pay where pay.workshop_id=p_workshop_id and pay.received_by=m.user_id and pay.payment_method='transfer' and pay.paid_at>=p_from and pay.paid_at<p_to),0)
  ) order by coalesce((select sum(s.price) from public.work_order_services s join period_orders wo on wo.id=s.work_order_id where s.mechanic_id=m.user_id and s.completed),0) desc,m.full_name),'[]'::jsonb)
  into v_mechanics from mechanics m;

  with hours as (select generate_series(0,23) hour_value), counts as (
    select extract(hour from arrived_at at time zone v_timezone)::int hour_value,count(*)::int order_count,coalesce(sum(total_amount),0) recorded_amount
    from public.work_orders where workshop_id=p_workshop_id and arrived_at>=p_from and arrived_at<p_to group by 1
  )
  select jsonb_agg(jsonb_build_object('hour',h.hour_value,'order_count',coalesce(c.order_count,0),'recorded_amount',coalesce(c.recorded_amount,0)) order by h.hour_value)
  into v_hourly from hours h left join counts c using(hour_value);

  with days as (
    select generate_series((p_from at time zone v_timezone)::date,((p_to-interval '1 second') at time zone v_timezone)::date,interval '1 day')::date day_value
  ), totals as (
    select (arrived_at at time zone v_timezone)::date day_value,count(*)::int order_count,coalesce(sum(total_amount),0) recorded_amount,coalesce(sum(amount_received),0) received_amount
    from public.work_orders where workshop_id=p_workshop_id and arrived_at>=p_from and arrived_at<p_to group by 1
  )
  select jsonb_agg(jsonb_build_object('date',d.day_value,'order_count',coalesce(t.order_count,0),'recorded_amount',coalesce(t.recorded_amount,0),'received_amount',coalesce(t.received_amount,0)) order by d.day_value)
  into v_daily from days d left join totals t using(day_value);

  with period_orders as (select id from public.work_orders where workshop_id=p_workshop_id and arrived_at>=p_from and arrived_at<p_to), grouped as (
    select s.title,count(*)::int service_count,coalesce(sum(s.price) filter(where s.completed),0) recorded_amount
    from public.work_order_services s join period_orders wo on wo.id=s.work_order_id group by s.title order by service_count desc,recorded_amount desc limit 10
  )
  select coalesce(jsonb_agg(to_jsonb(grouped) order by service_count desc,recorded_amount desc),'[]'::jsonb) into v_top_services from grouped;

  select coalesce(jsonb_agg(jsonb_build_object(
    'work_order_id',wo.id,'arrived_at',wo.arrived_at,'status',wo.status::text,'customer_name',c.full_name,'brand',m.brand,'model',m.model,'plate',m.plate,'complaint',wo.complaint,
    'mechanic_id',wo.assigned_mechanic_id,'mechanic_name',pr.full_name,'total_amount',wo.total_amount,'amount_received',wo.amount_received,'remaining_amount',greatest(0,wo.total_amount-wo.amount_received),'payment_status',wo.payment_status::text,'receivable_status',wo.receivable_status::text,
    'services',coalesce((select jsonb_agg(jsonb_build_object('title',s.title,'price',s.price,'completed',s.completed,'mechanic_id',s.mechanic_id,'mechanic_name',sp.full_name) order by s.created_at) from public.work_order_services s left join public.profiles sp on sp.id=s.mechanic_id where s.work_order_id=wo.id),'[]'::jsonb),
    'parts',coalesce((select jsonb_agg(jsonb_build_object('part_name',p.part_name,'quantity',p.quantity,'total_price',p.total_price) order by p.used_at) from public.work_order_parts p where p.work_order_id=wo.id),'[]'::jsonb)
  ) order by wo.arrived_at desc),'[]'::jsonb)
  into v_recent_orders
  from (select * from public.work_orders where workshop_id=p_workshop_id and arrived_at>=p_from and arrived_at<p_to order by arrived_at desc limit 100) wo
  join public.customers c on c.id=wo.customer_id join public.motorcycles m on m.id=wo.motorcycle_id left join public.profiles pr on pr.id=wo.assigned_mechanic_id;

  return jsonb_build_object('summary',v_summary,'mechanics',coalesce(v_mechanics,'[]'::jsonb),'hourly_arrivals',coalesce(v_hourly,'[]'::jsonb),'daily_trend',coalesce(v_daily,'[]'::jsonb),'top_services',coalesce(v_top_services,'[]'::jsonb),'recent_orders',coalesce(v_recent_orders,'[]'::jsonb));
end;
$$;

create or replace function public.create_v06_demo_data(p_workshop_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_root uuid:=public.resolve_demo_root_workshop(p_workshop_id);
  v_batch uuid;
  v_timezone text;
  v_count int;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if not (public.is_admin() or public.is_workshop_owner(v_root)) then raise exception 'Demo yetkisi yok'; end if;
  select id into v_batch from public.demo_batches where workshop_id=v_root order by created_at desc limit 1;
  if v_batch is null then raise exception 'Önce temel demo verilerini yükleyin'; end if;
  select coalesce(timezone,'Europe/Istanbul') into v_timezone from public.workshops where id=v_root;

  with ranked as (
    select id,row_number() over(order by created_at) rn from public.work_orders where workshop_id=v_root and demo_batch_id=v_batch
  ), planned as (
    select id,rn,case rn
      when 1 then (current_date-12)+time '10:10'
      when 2 then (current_date-3)+time '16:30'
      when 3 then (current_date-1)+time '14:20'
      when 4 then current_date+time '11:40'
      else current_date+time '09:15' end local_time
    from ranked
  )
  update public.work_orders wo
  set arrived_at=(p.local_time at time zone v_timezone),
      started_at=case when wo.started_at is not null then (p.local_time+interval '25 minutes') at time zone v_timezone else null end,
      completed_at=case when wo.completed_at is not null then (p.local_time+interval '2 hours') at time zone v_timezone else null end,
      delivered_at=case when wo.delivered_at is not null then (p.local_time+interval '3 hours') at time zone v_timezone else null end
  from planned p where wo.id=p.id;

  update public.work_order_services s
  set mechanic_id=coalesce(s.mechanic_id,wo.assigned_mechanic_id),
      started_at=coalesce(s.started_at,wo.arrived_at+interval '30 minutes'),
      completed_at=case when s.completed then coalesce(s.completed_at,wo.arrived_at+interval '90 minutes') else null end,
      created_at=wo.arrived_at+interval '20 minutes'
  from public.work_orders wo where wo.id=s.work_order_id and wo.demo_batch_id=v_batch and wo.workshop_id=v_root;

  update public.work_order_parts p set mechanic_id=coalesce(p.mechanic_id,wo.assigned_mechanic_id),used_at=wo.arrived_at+interval '60 minutes'
  from public.work_orders wo where wo.id=p.work_order_id and wo.demo_batch_id=v_batch and wo.workshop_id=v_root;

  update public.payments pay set paid_at=wo.arrived_at+interval '3 hours'
  from public.work_orders wo where wo.id=pay.work_order_id and wo.demo_batch_id=v_batch and wo.workshop_id=v_root;

  select count(*) into v_count from public.work_orders where workshop_id=v_root and demo_batch_id=v_batch;
  return jsonb_build_object('v06_ready',true,'batch_id',v_batch,'orders',v_count,'periods',jsonb_build_array('today','week','month'));
end;
$$;

revoke execute on function public.staff_get_personal_report(uuid,timestamptz,timestamptz) from public,anon;
revoke execute on function public.owner_get_business_report(uuid,timestamptz,timestamptz) from public,anon;
revoke execute on function public.create_v06_demo_data(uuid) from public,anon;
grant execute on function public.staff_get_personal_report(uuid,timestamptz,timestamptz) to authenticated;
grant execute on function public.owner_get_business_report(uuid,timestamptz,timestamptz) to authenticated;
grant execute on function public.create_v06_demo_data(uuid) to authenticated;
