begin;

-- v0.4 demo and customer RPCs
drop function if exists public.create_v04_demo_data(uuid);
drop function if exists public.customer_respond_extra_request(uuid, boolean, text);
drop function if exists public.customer_get_service_detail(uuid);
drop function if exists public.customer_get_services(uuid);

-- v0.4 staff RPCs
drop function if exists public.staff_delete_work_order_part(uuid);
drop function if exists public.staff_add_work_order_part(uuid, text, numeric, numeric, uuid);
drop function if exists public.staff_delete_work_order_service(uuid);
drop function if exists public.staff_set_work_order_service_state(uuid, text);
drop function if exists public.staff_add_work_order_service(uuid, text, text, numeric, uuid);
drop function if exists public.staff_delete_work_order_note(uuid);
drop function if exists public.staff_add_work_order_note(uuid, text, text, text);
drop function if exists public.staff_update_work_order_details(uuid, text, text);
drop function if exists public.staff_decide_extra_request(uuid, boolean, text, text);
drop function if exists public.staff_create_extra_request(uuid, text, text, numeric, numeric, text);
drop function if exists public.can_manage_work_order_v04(uuid);

-- v0.4 event and total triggers
drop trigger if exists work_order_status_event_after_update on public.work_orders;
drop function if exists public.log_work_order_status_event();
drop trigger if exists extra_request_totals_after_change on public.work_order_extra_requests;

-- Restore v0.3.1 total calculation before removing v0.4 tables
create or replace function public.recalculate_work_order_totals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid := coalesce(new.work_order_id, old.work_order_id);
  labor_total numeric(12,2);
  part_total numeric(12,2);
begin
  select coalesce(sum(price), 0) into labor_total
  from public.work_order_services where work_order_id = target_id;

  select coalesce(sum(total_price), 0) into part_total
  from public.work_order_parts where work_order_id = target_id;

  update public.work_orders
  set labor_amount = labor_total,
      parts_amount = part_total,
      total_amount = labor_total + part_total,
      payment_status = case
        when amount_received <= 0 then 'unpaid'::public.payment_status
        when labor_total + part_total > 0 and amount_received >= labor_total + part_total then 'paid'::public.payment_status
        else 'partial'::public.payment_status
      end
  where id = target_id;

  return coalesce(new, old);
end;
$$;

-- Remove links from existing service and part tables first
alter table public.work_order_services
  drop column if exists extra_request_id,
  drop column if exists started_at,
  drop column if exists completed_at;

alter table public.work_order_parts
  drop column if exists extra_request_id,
  drop column if exists used_at;

-- Remove v0.4 tables
drop table if exists public.work_order_extra_request_events cascade;
drop table if exists public.work_order_events cascade;
drop table if exists public.work_order_notes cascade;
drop table if exists public.work_order_extra_requests cascade;

-- Restore v0.3.1 work-order timestamps
create or replace function public.set_work_order_timestamps()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status in ('repair_started'::public.work_order_status, 'in_progress'::public.work_order_status)
    and old.status is distinct from new.status and new.started_at is null then new.started_at = now(); end if;
  if new.status in ('ready'::public.work_order_status, 'completed'::public.work_order_status)
    and old.status is distinct from new.status and new.completed_at is null then new.completed_at = now(); end if;
  if new.status = 'delivered'::public.work_order_status
    and old.status is distinct from new.status and new.delivered_at is null then new.delivered_at = now(); end if;
  if old.status is distinct from new.status then new.queue_updated_at = now(); end if;
  return new;
end;
$$;

alter table public.work_orders
  drop column if exists testing_started_at,
  drop column if exists ready_at;

-- Restore v0.3.1 status RPC
create or replace function public.update_work_order_status(p_work_order_id uuid, p_status public.work_order_status)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare target_workshop uuid;
begin
  select workshop_id into target_workshop from public.work_orders where id = p_work_order_id;
  if target_workshop is null then raise exception 'İş emri bulunamadı'; end if;
  if not public.is_workshop_owner(target_workshop)
     and not public.is_workshop_worker(target_workshop)
     and not (public.is_workshop_apprentice(target_workshop) and p_status in ('precheck', 'parts_waiting', 'testing')) then
    raise exception 'Servis durumunu değiştirme yetkiniz yok';
  end if;
  update public.work_orders set status = p_status where id = p_work_order_id;
end;
$$;

-- Restore v0.3.1 customer service summary
create function public.customer_get_services(p_workshop_id uuid)
returns table(
  id uuid,
  workshop_id uuid,
  workshop_name text,
  motorcycle_id uuid,
  brand text,
  model text,
  plate text,
  status text,
  service_type text,
  complaint text,
  price_type text,
  estimated_price_min numeric,
  estimated_price_max numeric,
  quoted_price numeric,
  total_amount numeric,
  amount_received numeric,
  remaining_amount numeric,
  payment_status text,
  arrived_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  delivered_at timestamptz,
  service_items jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    wo.id,
    wo.workshop_id,
    w.name,
    wo.motorcycle_id,
    m.brand,
    m.model,
    m.plate,
    wo.status::text,
    wo.service_type::text,
    wo.complaint,
    wo.price_type::text,
    wo.estimated_price_min,
    wo.estimated_price_max,
    wo.quoted_price,
    wo.total_amount,
    wo.amount_received,
    greatest(0, wo.total_amount - wo.amount_received),
    wo.payment_status::text,
    wo.arrived_at,
    wo.started_at,
    wo.completed_at,
    wo.delivered_at,
    coalesce((
      select jsonb_agg(jsonb_build_object('title', s.title, 'price', s.price, 'completed', s.completed) order by s.created_at)
      from public.work_order_services s
      where s.work_order_id = wo.id
    ), '[]'::jsonb)
  from public.work_orders wo
  join public.workshops w on w.id = wo.workshop_id
  join public.motorcycles m on m.id = wo.motorcycle_id
  join public.customer_links cl on cl.customer_id = wo.customer_id
    and cl.workshop_id = wo.workshop_id
    and cl.user_id = auth.uid()
    and cl.status = 'approved'
  where wo.workshop_id = p_workshop_id
  order by wo.arrived_at desc;
$$;

revoke execute on function public.customer_get_services(uuid) from public, anon;
grant execute on function public.customer_get_services(uuid) to authenticated;

-- Remove v0.4 enum types
drop type if exists public.work_note_visibility;
drop type if exists public.extra_approval_method;
drop type if exists public.extra_work_status;

commit;
