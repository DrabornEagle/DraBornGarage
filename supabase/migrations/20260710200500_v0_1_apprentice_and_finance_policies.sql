create or replace view public.apprentice_work_queue
with (security_invoker = true)
as
select
  wo.id,
  wo.workshop_id,
  wo.motorcycle_id,
  wo.assigned_mechanic_id,
  wo.status,
  wo.service_type,
  wo.customer_waiting_status,
  wo.queue_position,
  wo.complaint,
  wo.notes,
  wo.arrived_at,
  wo.started_at,
  wo.completed_at,
  m.brand,
  m.model,
  m.plate
from public.work_orders wo
join public.motorcycles m on m.id = wo.motorcycle_id;

grant select on public.apprentice_work_queue to authenticated;

create or replace function public.get_apprentice_queue(p_workshop_id uuid)
returns table (
  id uuid,
  workshop_id uuid,
  assigned_mechanic_id uuid,
  status public.work_order_status,
  service_type public.service_type,
  customer_waiting_status public.customer_waiting_status,
  queue_position integer,
  complaint text,
  notes text,
  arrived_at timestamptz,
  brand text,
  model text,
  plate text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    wo.id,
    wo.workshop_id,
    wo.assigned_mechanic_id,
    wo.status,
    wo.service_type,
    wo.customer_waiting_status,
    wo.queue_position,
    wo.complaint,
    wo.notes,
    wo.arrived_at,
    m.brand,
    m.model,
    m.plate
  from public.work_orders wo
  join public.motorcycles m on m.id = wo.motorcycle_id
  where wo.workshop_id = p_workshop_id
    and public.is_workshop_member(p_workshop_id)
  order by coalesce(wo.queue_position, 999999), wo.arrived_at;
$$;

revoke execute on function public.get_apprentice_queue(uuid) from public, anon;
grant execute on function public.get_apprentice_queue(uuid) to authenticated;

drop policy if exists services_insert on public.work_order_services;
create policy services_insert on public.work_order_services for insert to authenticated
with check (
  public.is_workshop_owner(workshop_id)
  or (public.is_workshop_worker(workshop_id) and mechanic_id = (select auth.uid()))
);

drop policy if exists services_update on public.work_order_services;
create policy services_update on public.work_order_services for update to authenticated
using (public.is_workshop_owner(workshop_id) or (public.is_workshop_worker(workshop_id) and mechanic_id = (select auth.uid())))
with check (public.is_workshop_owner(workshop_id) or (public.is_workshop_worker(workshop_id) and mechanic_id = (select auth.uid())));

drop policy if exists services_delete on public.work_order_services;
create policy services_delete on public.work_order_services for delete to authenticated
using (public.is_workshop_owner(workshop_id) or (public.is_workshop_worker(workshop_id) and mechanic_id = (select auth.uid())));

drop policy if exists work_order_parts_insert on public.work_order_parts;
create policy work_order_parts_insert on public.work_order_parts for insert to authenticated
with check (
  public.is_workshop_owner(workshop_id)
  or (public.is_workshop_worker(workshop_id) and (mechanic_id = (select auth.uid()) or public.can_access_work_order(work_order_id)))
);

drop policy if exists work_order_parts_update on public.work_order_parts;
create policy work_order_parts_update on public.work_order_parts for update to authenticated
using (public.is_workshop_owner(workshop_id) or (public.is_workshop_worker(workshop_id) and mechanic_id = (select auth.uid())))
with check (public.is_workshop_owner(workshop_id) or (public.is_workshop_worker(workshop_id) and mechanic_id = (select auth.uid())));

drop policy if exists work_order_parts_delete on public.work_order_parts;
create policy work_order_parts_delete on public.work_order_parts for delete to authenticated
using (public.is_workshop_owner(workshop_id) or (public.is_workshop_worker(workshop_id) and mechanic_id = (select auth.uid())));

drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments for select to authenticated
using (
  public.is_workshop_owner(workshop_id)
  or received_by = (select auth.uid())
  or (public.is_workshop_worker(workshop_id) and public.can_access_work_order(work_order_id))
);

drop policy if exists payments_insert on public.payments;
create policy payments_insert on public.payments for insert to authenticated
with check (
  (public.is_workshop_owner(workshop_id) or public.is_workshop_worker(workshop_id))
  and public.can_access_work_order(work_order_id)
  and received_by = (select auth.uid())
  and payment_method in ('cash'::public.payment_method, 'transfer'::public.payment_method)
);

drop policy if exists payments_update on public.payments;
create policy payments_update on public.payments for update to authenticated
using (public.is_workshop_owner(workshop_id) or (public.is_workshop_worker(workshop_id) and received_by = (select auth.uid())))
with check (public.is_workshop_owner(workshop_id) or (public.is_workshop_worker(workshop_id) and received_by = (select auth.uid())));

drop policy if exists payments_delete on public.payments;
create policy payments_delete on public.payments for delete to authenticated
using (public.is_workshop_owner(workshop_id) or (public.is_workshop_worker(workshop_id) and received_by = (select auth.uid())));
