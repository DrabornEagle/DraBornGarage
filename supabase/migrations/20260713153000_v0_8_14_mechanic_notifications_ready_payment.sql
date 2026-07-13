-- DraBornGarage v0.8.14
-- Owner+Mechanic accounts receive operational notifications only through the Mechanic role.
-- Fixed quoted prices participate in work-order totals and receivables.

create or replace function public.notify_workshop_owners(
  p_workshop_id uuid,
  p_category text,
  p_notification_type text,
  p_title text,
  p_body text,
  p_priority text default 'normal',
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_data jsonb default '{}'::jsonb,
  p_dedupe_suffix text default null,
  p_deliver_at timestamptz default now(),
  p_demo_batch_id uuid default null,
  p_preference_subtype text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_count integer := 0;
  v_key text;
begin
  for r in
    select distinct wm.user_id
    from public.workshop_members wm
    where wm.workshop_id = p_workshop_id
      and wm.is_active
      and wm.role = 'owner'::public.member_role
  loop
    v_key := case when p_dedupe_suffix is null then null else r.user_id::text || ':' || p_dedupe_suffix end;
    if public.enqueue_user_notification(
      r.user_id, p_workshop_id, p_category, p_notification_type, p_title, p_body,
      p_priority, p_entity_type, p_entity_id, p_data, v_key, p_deliver_at,
      p_demo_batch_id, p_preference_subtype
    ) is not null then
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;

-- Remove unread business-side duplicates from accounts that also have the Mechanic role.
delete from public.user_notifications n
using public.workshop_members wm
where wm.user_id = n.user_id
  and wm.workshop_id = n.workshop_id
  and wm.is_active
  and wm.role = 'owner_mechanic'::public.member_role
  and n.read_at is null
  and n.notification_type in (
    'new_service',
    'new_customer_appointment',
    'platform_due',
    'platform_overdue',
    'receivable_due',
    'receivable_overdue'
  );

create or replace function public.compute_work_order_totals(p_work_order_id uuid)
returns table(labor_amount numeric, parts_amount numeric, total_amount numeric)
language sql
stable
security definer
set search_path = public
as $$
  with order_values as (
    select
      case when wo.price_type = 'fixed'::public.price_type then coalesce(wo.quoted_price, 0) else 0 end as fixed_quote
    from public.work_orders wo
    where wo.id = p_work_order_id
  ), regular_values as (
    select
      coalesce((
        select sum(s.price)
        from public.work_order_services s
        where s.work_order_id = p_work_order_id
          and s.extra_request_id is null
      ), 0) as service_total,
      coalesce((
        select sum(p.total_price)
        from public.work_order_parts p
        where p.work_order_id = p_work_order_id
          and p.extra_request_id is null
      ), 0) as part_total
  ), extra_values as (
    select
      coalesce(sum(x.labor_amount) filter (where x.status = 'approved'::public.extra_request_status), 0) as extra_labor,
      coalesce(sum(x.parts_amount) filter (where x.status = 'approved'::public.extra_request_status), 0) as extra_parts
    from public.work_order_extra_requests x
    where x.work_order_id = p_work_order_id
  )
  select
    r.service_total
      + greatest(o.fixed_quote - (r.service_total + r.part_total), 0)
      + e.extra_labor as labor_amount,
    r.part_total + e.extra_parts as parts_amount,
    greatest(o.fixed_quote, r.service_total + r.part_total)
      + e.extra_labor + e.extra_parts as total_amount
  from order_values o
  cross join regular_values r
  cross join extra_values e;
$$;

create or replace function public.refresh_work_order_totals(p_work_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_labor numeric(12,2) := 0;
  v_parts numeric(12,2) := 0;
  v_total numeric(12,2) := 0;
begin
  select c.labor_amount, c.parts_amount, c.total_amount
  into v_labor, v_parts, v_total
  from public.compute_work_order_totals(p_work_order_id) c;

  update public.work_orders
  set labor_amount = coalesce(v_labor, 0),
      parts_amount = coalesce(v_parts, 0),
      total_amount = coalesce(v_total, 0)
  where id = p_work_order_id;

  perform public.sync_work_order_financial_state(p_work_order_id);
end;
$$;

create or replace function public.recalculate_work_order_totals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid := coalesce(new.work_order_id, old.work_order_id);
begin
  perform public.refresh_work_order_totals(target_id);
  return coalesce(new, old);
end;
$$;

create or replace function public.refresh_work_order_totals_after_quote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.refresh_work_order_totals(new.id);
  return new;
end;
$$;

drop trigger if exists work_order_quote_totals_after_change on public.work_orders;
create trigger work_order_quote_totals_after_change
after insert or update of price_type, quoted_price, estimated_price_min, estimated_price_max
on public.work_orders
for each row execute function public.refresh_work_order_totals_after_quote();

-- Backfill existing records, including appointment-created services with a fixed quote but zero total.
do $$
declare
  r record;
begin
  for r in select id from public.work_orders loop
    perform public.refresh_work_order_totals(r.id);
  end loop;
end;
$$;
