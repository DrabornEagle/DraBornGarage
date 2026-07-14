-- DraBornGarage v0.9.5
-- Align mechanic dashboard/report amounts with completed work orders and repair stale service completion flags.

create or replace function public.mechanic_order_recorded_amount(
  p_work_order_id uuid,
  p_mechanic_id uuid
)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  with target_order as (
    select id, assigned_mechanic_id, status, coalesce(labor_amount, 0)::numeric as labor_amount
    from public.work_orders
    where id = p_work_order_id
  ), all_services as (
    select coalesce(sum(price), 0)::numeric as amount
    from public.work_order_services
    where work_order_id = p_work_order_id
  ), mechanic_services as (
    select
      coalesce(sum(price), 0)::numeric as all_amount,
      coalesce(sum(price) filter (where completed), 0)::numeric as completed_amount
    from public.work_order_services
    where work_order_id = p_work_order_id
      and mechanic_id = p_mechanic_id
  )
  select coalesce(case
    when o.status in ('ready','completed','delivered') then
      m.all_amount
      + case
          when o.assigned_mechanic_id = p_mechanic_id
            then greatest(o.labor_amount - a.amount, 0)
          else 0
        end
    else m.completed_amount
  end, 0)
  from target_order o
  cross join all_services a
  cross join mechanic_services m;
$$;

create or replace function public.mechanic_order_service_count(
  p_work_order_id uuid,
  p_mechanic_id uuid,
  p_completed_only boolean default false
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  with target_order as (
    select assigned_mechanic_id, status, coalesce(labor_amount, 0) as labor_amount
    from public.work_orders
    where id = p_work_order_id
  ), counts as (
    select
      count(*)::integer as all_count,
      count(*) filter (where completed)::integer as completed_count
    from public.work_order_services
    where work_order_id = p_work_order_id
      and mechanic_id = p_mechanic_id
  )
  select coalesce(case
    when coalesce(p_completed_only, false) then
      case
        when o.status in ('ready','completed','delivered') then
          c.all_count + case when c.all_count = 0 and o.assigned_mechanic_id = p_mechanic_id and o.labor_amount > 0 then 1 else 0 end
        else c.completed_count
      end
    else
      c.all_count + case when c.all_count = 0 and o.status in ('ready','completed','delivered') and o.assigned_mechanic_id = p_mechanic_id and o.labor_amount > 0 then 1 else 0 end
  end, 0)
  from target_order o
  cross join counts c;
$$;

create or replace function public.sync_completed_order_services()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status
     and new.status in ('ready','completed','delivered') then
    update public.work_order_services
    set completed = true,
        started_at = coalesce(started_at, new.started_at, new.completed_at, new.ready_at, now()),
        completed_at = coalesce(completed_at, new.completed_at, new.ready_at, now())
    where work_order_id = new.id
      and completed is not true;
  end if;
  return new;
end;
$$;

drop trigger if exists work_order_complete_service_rows on public.work_orders;
create trigger work_order_complete_service_rows
after update of status on public.work_orders
for each row execute function public.sync_completed_order_services();

-- Repair historical rows where the whole motorcycle was already ready/completed/delivered.
update public.work_order_services s
set completed = true,
    started_at = coalesce(s.started_at, wo.started_at, wo.completed_at, wo.ready_at, wo.delivered_at, now()),
    completed_at = coalesce(s.completed_at, wo.completed_at, wo.ready_at, wo.delivered_at, now())
from public.work_orders wo
where wo.id = s.work_order_id
  and wo.status in ('ready','completed','delivered')
  and s.completed is not true;

-- Patch the existing report RPCs while preserving their response contracts.
do $$
declare
  v_sql text;
  v_old text;
  v_new text;
begin
  select pg_get_functiondef(p.oid)
  into v_sql
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'staff_get_personal_report'
  order by p.oid desc
  limit 1;

  if v_sql is null then raise exception 'staff_get_personal_report bulunamadı'; end if;

  v_sql := replace(v_sql,
    $old$status in ('completed','delivered')$old$,
    $new$status in ('ready','completed','delivered')$new$
  );

  v_old := $old$'service_count',(select count(*) from my_services),
    'completed_service_count',(select count(*) from my_services where completed),
    'recorded_amount',coalesce((select sum(price) from my_services where completed),0),$old$;
  v_new := $new$'service_count',coalesce((select sum(public.mechanic_order_service_count(id,v_user_id,false)) from my_orders),0),
    'completed_service_count',coalesce((select sum(public.mechanic_order_service_count(id,v_user_id,true)) from my_orders),0),
    'recorded_amount',coalesce((select sum(public.mechanic_order_recorded_amount(id,v_user_id)) from my_orders),0),$new$;
  if position(v_old in v_sql) = 0 then raise exception 'Kişisel rapor özet kalıbı bulunamadı'; end if;
  v_sql := replace(v_sql, v_old, v_new);

  v_old := $old$service_totals as (
    select (wo.arrived_at at time zone v_timezone)::date day_value,coalesce(sum(s.price) filter(where s.completed),0) recorded_amount
    from my_orders wo left join public.work_order_services s on s.work_order_id=wo.id and s.mechanic_id=v_user_id
    group by 1
  )$old$;
  v_new := $new$service_totals as (
    select (wo.arrived_at at time zone v_timezone)::date day_value,
           coalesce(sum(public.mechanic_order_recorded_amount(wo.id,v_user_id)),0) recorded_amount
    from my_orders wo
    group by 1
  )$new$;
  if position(v_old in v_sql) = 0 then raise exception 'Kişisel günlük rapor kalıbı bulunamadı'; end if;
  v_sql := replace(v_sql, v_old, v_new);

  v_old := $old$'recorded_amount',coalesce((select sum(s.price) from public.work_order_services s where s.work_order_id=wo.id and s.mechanic_id=v_user_id and s.completed),0),$old$;
  v_new := $new$'recorded_amount',public.mechanic_order_recorded_amount(wo.id,v_user_id),$new$;
  if position(v_old in v_sql) = 0 then raise exception 'Kişisel iş tutarı kalıbı bulunamadı'; end if;
  v_sql := replace(v_sql, v_old, v_new);

  execute v_sql;
end;
$$;

do $$
declare
  v_sql text;
  v_old text;
  v_new text;
begin
  select pg_get_functiondef(p.oid)
  into v_sql
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'owner_get_business_report'
  order by p.oid desc
  limit 1;

  if v_sql is null then raise exception 'owner_get_business_report bulunamadı'; end if;

  v_sql := replace(v_sql,
    $old$status in ('completed','delivered')$old$,
    $new$status in ('ready','completed','delivered')$new$
  );

  v_old := $old$'service_count',(select count(*) from public.work_order_services s join period_orders wo on wo.id=s.work_order_id where s.mechanic_id=m.user_id),
    'completed_service_count',(select count(*) from public.work_order_services s join period_orders wo on wo.id=s.work_order_id where s.mechanic_id=m.user_id and s.completed),
    'recorded_amount',coalesce((select sum(s.price) from public.work_order_services s join period_orders wo on wo.id=s.work_order_id where s.mechanic_id=m.user_id and s.completed),0),$old$;
  v_new := $new$'service_count',coalesce((select sum(public.mechanic_order_service_count(wo.id,m.user_id,false)) from period_orders wo where wo.assigned_mechanic_id=m.user_id or exists(select 1 from public.work_order_services s where s.work_order_id=wo.id and s.mechanic_id=m.user_id)),0),
    'completed_service_count',coalesce((select sum(public.mechanic_order_service_count(wo.id,m.user_id,true)) from period_orders wo where wo.assigned_mechanic_id=m.user_id or exists(select 1 from public.work_order_services s where s.work_order_id=wo.id and s.mechanic_id=m.user_id)),0),
    'recorded_amount',coalesce((select sum(public.mechanic_order_recorded_amount(wo.id,m.user_id)) from period_orders wo where wo.assigned_mechanic_id=m.user_id or exists(select 1 from public.work_order_services s where s.work_order_id=wo.id and s.mechanic_id=m.user_id)),0),$new$;
  if position(v_old in v_sql) = 0 then raise exception 'İşletme Usta özet kalıbı bulunamadı'; end if;
  v_sql := replace(v_sql, v_old, v_new);

  v_old := $old$coalesce((select sum(s.price) from public.work_order_services s join period_orders wo on wo.id=s.work_order_id where s.mechanic_id=m.user_id and s.completed),0) desc,m.full_name$old$;
  v_new := $new$coalesce((select sum(public.mechanic_order_recorded_amount(wo.id,m.user_id)) from period_orders wo where wo.assigned_mechanic_id=m.user_id or exists(select 1 from public.work_order_services s where s.work_order_id=wo.id and s.mechanic_id=m.user_id)),0) desc,m.full_name$new$;
  if position(v_old in v_sql) = 0 then raise exception 'İşletme Usta sıralama kalıbı bulunamadı'; end if;
  v_sql := replace(v_sql, v_old, v_new);

  execute v_sql;
end;
$$;

revoke all on function public.mechanic_order_recorded_amount(uuid,uuid) from public, anon, authenticated;
revoke all on function public.mechanic_order_service_count(uuid,uuid,boolean) from public, anon, authenticated;
revoke all on function public.sync_completed_order_services() from public, anon, authenticated;

grant execute on function public.staff_get_personal_report(uuid,timestamptz,timestamptz) to authenticated;
grant execute on function public.owner_get_business_report(uuid,timestamptz,timestamptz) to authenticated;
