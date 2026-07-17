-- Roll back DraBornGarage v1.1.8 signup links and mechanic report ownership.

drop trigger if exists zz_apply_customer_registration_link on public.profiles;
drop function if exists public.apply_customer_registration_link_after_profile();
drop function if exists public.public_validate_customer_registration_link(text);
drop function if exists public.staff_create_customer_registration_link(uuid);
drop function if exists public.customer_registration_link_id(text);
drop table if exists public.customer_registration_links;

-- Restore the v1.1.7 / v0.9.5 itemized labor calculation.
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

revoke all on function public.mechanic_order_recorded_amount(uuid,uuid) from public, anon, authenticated;
