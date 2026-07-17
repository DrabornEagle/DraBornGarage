-- DraBornGarage v1.1.8
-- The mechanic selected on the work order owns both the recorded amount and service count.
-- Stale or incorrectly attributed work_order_services rows cannot move a job to another mechanic report.

create or replace function public.mechanic_order_service_count(
  p_work_order_id uuid,
  p_mechanic_id uuid,
  p_completed_only boolean default false
)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  with target_order as (
    select
      wo.id,
      wo.assigned_mechanic_id,
      wo.status,
      coalesce(wo.total_amount, 0) as total_amount,
      coalesce(wo.labor_amount, 0) as labor_amount
    from public.work_orders wo
    where wo.id = p_work_order_id
  ), service_counts as (
    select
      count(*)::integer as all_count,
      count(*) filter (where s.completed)::integer as completed_count
    from public.work_order_services s
    where s.work_order_id = p_work_order_id
  )
  select coalesce(case
    when o.assigned_mechanic_id is distinct from p_mechanic_id then 0
    when coalesce(p_completed_only, false) then
      case
        when o.status in ('ready','completed','delivered')
          then greatest(c.all_count, case when o.total_amount > 0 or o.labor_amount > 0 then 1 else 0 end)
        else c.completed_count
      end
    else greatest(c.all_count, case when o.status in ('ready','completed','delivered') and (o.total_amount > 0 or o.labor_amount > 0) then 1 else 0 end)
  end, 0)::integer
  from target_order o
  cross join service_counts c;
$$;

comment on function public.mechanic_order_service_count(uuid,uuid,boolean) is
  'Counts one work order only for its selected mechanic; service rows cannot transfer report ownership.';

revoke all on function public.mechanic_order_service_count(uuid,uuid,boolean) from public, anon, authenticated;
