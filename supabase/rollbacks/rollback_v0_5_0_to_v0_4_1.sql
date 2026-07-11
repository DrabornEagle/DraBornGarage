begin;

-- v0.5 demo and customer receivable RPCs
drop function if exists public.create_v05_demo_data(uuid);
drop function if exists public.customer_get_receivables(uuid);

-- v0.5 staff receivable RPCs
drop function if exists public.staff_get_receivable_detail(uuid);
drop function if exists public.staff_get_receivable_summary(uuid);
drop function if exists public.staff_get_receivables(uuid,text,text);
drop function if exists public.staff_create_receivable_reminder(uuid,text);
drop function if exists public.staff_delete_receivable_note(uuid);
drop function if exists public.staff_add_receivable_note(uuid,text,text);
drop function if exists public.staff_reopen_receivable(uuid,date,text);
drop function if exists public.staff_cancel_receivable(uuid,text);
drop function if exists public.staff_record_payment(uuid,numeric,text,text,timestamptz,text);
drop function if exists public.staff_open_receivable(uuid,date,text,text);
drop function if exists public.can_manage_receivable(uuid);

-- Remove v0.5 payment event trigger before dropping its tables/types
drop trigger if exists receivable_payment_event_after_change on public.payments;
drop function if exists public.log_receivable_payment_event();

-- Restore v0.4.1 payment recalculation
create or replace function public.recalculate_work_order_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid := coalesce(new.work_order_id, old.work_order_id);
  received numeric(12,2);
  total_due numeric(12,2);
begin
  select coalesce(sum(amount), 0) into received
  from public.payments
  where work_order_id = target_id;

  select total_amount into total_due
  from public.work_orders
  where id = target_id;

  update public.work_orders
  set amount_received = received,
      payment_status = case
        when received <= 0 then 'unpaid'::public.payment_status
        when total_due > 0 and received >= total_due then 'paid'::public.payment_status
        else 'partial'::public.payment_status
      end
  where id = target_id;

  return coalesce(new, old);
end;
$$;

-- Restore v0.4.1 work-order total recalculation
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
  select coalesce(sum(price), 0)
  into labor_total
  from public.work_order_services
  where work_order_id = target_id
    and extra_request_id is null;

  select labor_total + coalesce(sum(labor_amount), 0)
  into labor_total
  from public.work_order_extra_requests
  where work_order_id = target_id
    and status = 'approved';

  select coalesce(sum(total_price), 0)
  into part_total
  from public.work_order_parts
  where work_order_id = target_id
    and extra_request_id is null;

  select part_total + coalesce(sum(parts_amount), 0)
  into part_total
  from public.work_order_extra_requests
  where work_order_id = target_id
    and status = 'approved';

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

-- Restore v0.4.1 customer service list signature
drop function if exists public.customer_get_services(uuid);

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
  testing_started_at timestamptz,
  ready_at timestamptz,
  completed_at timestamptz,
  delivered_at timestamptz,
  pending_approval_count integer,
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
    wo.testing_started_at,
    wo.ready_at,
    wo.completed_at,
    wo.delivered_at,
    (select count(*)::integer from public.work_order_extra_requests x where x.work_order_id = wo.id and x.status = 'pending'),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'title', s.title,
        'description', s.description,
        'price', s.price,
        'completed', s.completed,
        'started_at', s.started_at,
        'completed_at', s.completed_at,
        'extra_request_id', s.extra_request_id
      ) order by s.created_at)
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

-- Restore v0.4.1 customer service detail
create or replace function public.customer_get_service_detail(p_work_order_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not exists (
    select 1
    from public.work_orders wo
    join public.customer_links cl on cl.customer_id = wo.customer_id
      and cl.workshop_id = wo.workshop_id
      and cl.user_id = auth.uid()
      and cl.status = 'approved'
    where wo.id = p_work_order_id
  ) then
    raise exception 'Servis kaydı bulunamadı';
  end if;

  select jsonb_build_object(
    'id', wo.id,
    'workshop_id', wo.workshop_id,
    'workshop_name', w.name,
    'motorcycle_id', wo.motorcycle_id,
    'brand', m.brand,
    'model', m.model,
    'plate', m.plate,
    'status', wo.status::text,
    'service_type', wo.service_type::text,
    'complaint', wo.complaint,
    'diagnosis', wo.diagnosis,
    'price_type', wo.price_type::text,
    'estimated_price_min', wo.estimated_price_min,
    'estimated_price_max', wo.estimated_price_max,
    'quoted_price', wo.quoted_price,
    'labor_amount', wo.labor_amount,
    'parts_amount', wo.parts_amount,
    'total_amount', wo.total_amount,
    'amount_received', wo.amount_received,
    'remaining_amount', greatest(0, wo.total_amount - wo.amount_received),
    'payment_status', wo.payment_status::text,
    'arrived_at', wo.arrived_at,
    'started_at', wo.started_at,
    'testing_started_at', wo.testing_started_at,
    'ready_at', wo.ready_at,
    'completed_at', wo.completed_at,
    'delivered_at', wo.delivered_at,
    'services', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'title', s.title,
        'description', s.description,
        'price', s.price,
        'completed', s.completed,
        'started_at', s.started_at,
        'completed_at', s.completed_at,
        'extra_request_id', s.extra_request_id,
        'included_in_total', s.extra_request_id is null
      ) order by s.created_at)
      from public.work_order_services s
      where s.work_order_id = wo.id
    ), '[]'::jsonb),
    'parts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'part_name', p.part_name,
        'quantity', p.quantity,
        'unit_price', p.unit_price,
        'total_price', p.total_price,
        'used_at', p.used_at,
        'extra_request_id', p.extra_request_id,
        'included_in_total', p.extra_request_id is null
      ) order by p.created_at)
      from public.work_order_parts p
      where p.work_order_id = wo.id
    ), '[]'::jsonb),
    'extra_requests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', x.id,
        'title', x.title,
        'description', x.description,
        'labor_amount', x.labor_amount,
        'parts_amount', x.parts_amount,
        'total_amount', x.total_amount,
        'status', x.status::text,
        'approval_method', x.approval_method::text,
        'response_note', x.response_note,
        'responded_at', x.responded_at,
        'created_at', x.created_at,
        'can_respond', x.status = 'pending'
      ) order by x.created_at desc)
      from public.work_order_extra_requests x
      where x.work_order_id = wo.id
    ), '[]'::jsonb),
    'notes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', n.id,
        'category', n.category,
        'note', n.note,
        'author_name', pr.full_name,
        'created_at', n.created_at
      ) order by n.created_at desc)
      from public.work_order_notes n
      left join public.profiles pr on pr.id = n.author_id
      where n.work_order_id = wo.id and n.visibility = 'customer'
    ), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id,
        'event_type', e.event_type,
        'old_status', e.old_status::text,
        'new_status', e.new_status::text,
        'note', e.note,
        'created_at', e.created_at
      ) order by e.created_at)
      from public.work_order_events e
      where e.work_order_id = wo.id
        and e.event_type in ('status_changed','extra_created','extra_approved','extra_rejected')
    ), '[]'::jsonb)
  ) into result
  from public.work_orders wo
  join public.workshops w on w.id = wo.workshop_id
  join public.motorcycles m on m.id = wo.motorcycle_id
  where wo.id = p_work_order_id;

  return result;
end;
$$;

revoke execute on function public.customer_get_services(uuid) from public, anon;
revoke execute on function public.customer_get_service_detail(uuid) from public, anon;
grant execute on function public.customer_get_services(uuid) to authenticated;
grant execute on function public.customer_get_service_detail(uuid) to authenticated;

-- Drop v0.5 helper after restored triggers no longer use it
drop function if exists public.sync_work_order_financial_state(uuid);

-- Remove v0.5 tables and columns. This deletes only v0.5 debt metadata/audit records.
drop table if exists public.receivable_events cascade;
drop table if exists public.receivable_notes cascade;

alter table public.payments
  drop column if exists collection_source;

alter table public.work_orders
  drop column if exists receivable_status,
  drop column if exists debt_promised_date,
  drop column if exists debt_written_at,
  drop column if exists debt_closed_at,
  drop column if exists debt_note,
  drop column if exists debt_customer_note,
  drop column if exists last_payment_at;

drop type if exists public.receivable_visibility;
drop type if exists public.receivable_status;

commit;
