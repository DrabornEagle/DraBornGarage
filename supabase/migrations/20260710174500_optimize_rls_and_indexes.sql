-- Cover foreign keys used by deletes, joins and owner/mechanic filters.
create index if not exists idx_workshops_created_by on public.workshops(created_by);
create index if not exists idx_invites_workshop on public.workshop_invites(workshop_id);
create index if not exists idx_invites_created_by on public.workshop_invites(created_by);
create index if not exists idx_invites_used_by on public.workshop_invites(used_by) where used_by is not null;
create index if not exists idx_customers_created_by on public.customers(created_by);
create index if not exists idx_motorcycles_customer on public.motorcycles(customer_id);
create index if not exists idx_motorcycles_created_by on public.motorcycles(created_by);
create index if not exists idx_work_orders_customer on public.work_orders(customer_id);
create index if not exists idx_work_orders_motorcycle on public.work_orders(motorcycle_id);
create index if not exists idx_work_orders_created_by on public.work_orders(created_by);
create index if not exists idx_services_workshop on public.work_order_services(workshop_id);
create index if not exists idx_work_order_parts_workshop on public.work_order_parts(workshop_id);
create index if not exists idx_work_order_parts_part on public.work_order_parts(part_id) where part_id is not null;
create index if not exists idx_work_order_parts_mechanic on public.work_order_parts(mechanic_id) where mechanic_id is not null;
create index if not exists idx_payments_work_order on public.payments(work_order_id);
create index if not exists idx_payments_received_by on public.payments(received_by);

-- Cache auth.uid() once per statement instead of re-evaluating it for every row.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
using (id = (select auth.uid()) or public.shares_workshop(id));

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists customers_insert on public.customers;
create policy customers_insert on public.customers for insert to authenticated
with check (public.is_workshop_member(workshop_id) and created_by = (select auth.uid()));

drop policy if exists motorcycles_insert on public.motorcycles;
create policy motorcycles_insert on public.motorcycles for insert to authenticated
with check (public.is_workshop_member(workshop_id) and created_by = (select auth.uid()));

drop policy if exists work_orders_select on public.work_orders;
create policy work_orders_select on public.work_orders for select to authenticated
using (public.is_workshop_owner(workshop_id) or assigned_mechanic_id = (select auth.uid()) or created_by = (select auth.uid()));

drop policy if exists work_orders_insert on public.work_orders;
create policy work_orders_insert on public.work_orders for insert to authenticated
with check (public.is_workshop_member(workshop_id) and created_by = (select auth.uid()));

drop policy if exists work_orders_update on public.work_orders;
create policy work_orders_update on public.work_orders for update to authenticated
using (public.is_workshop_owner(workshop_id) or assigned_mechanic_id = (select auth.uid()) or created_by = (select auth.uid()))
with check (public.is_workshop_member(workshop_id));

drop policy if exists services_select on public.work_order_services;
create policy services_select on public.work_order_services for select to authenticated
using (public.is_workshop_owner(workshop_id) or mechanic_id = (select auth.uid()));

drop policy if exists services_insert on public.work_order_services;
create policy services_insert on public.work_order_services for insert to authenticated
with check (public.is_workshop_owner(workshop_id) or mechanic_id = (select auth.uid()));

drop policy if exists services_update on public.work_order_services;
create policy services_update on public.work_order_services for update to authenticated
using (public.is_workshop_owner(workshop_id) or mechanic_id = (select auth.uid()))
with check (public.is_workshop_owner(workshop_id) or mechanic_id = (select auth.uid()));

drop policy if exists services_delete on public.work_order_services;
create policy services_delete on public.work_order_services for delete to authenticated
using (public.is_workshop_owner(workshop_id) or mechanic_id = (select auth.uid()));

drop policy if exists work_order_parts_select on public.work_order_parts;
create policy work_order_parts_select on public.work_order_parts for select to authenticated
using (public.is_workshop_owner(workshop_id) or mechanic_id = (select auth.uid()) or public.can_access_work_order(work_order_id));

drop policy if exists work_order_parts_insert on public.work_order_parts;
create policy work_order_parts_insert on public.work_order_parts for insert to authenticated
with check (public.is_workshop_owner(workshop_id) or mechanic_id = (select auth.uid()) or public.can_access_work_order(work_order_id));

drop policy if exists work_order_parts_update on public.work_order_parts;
create policy work_order_parts_update on public.work_order_parts for update to authenticated
using (public.is_workshop_owner(workshop_id) or mechanic_id = (select auth.uid()))
with check (public.is_workshop_owner(workshop_id) or mechanic_id = (select auth.uid()));

drop policy if exists work_order_parts_delete on public.work_order_parts;
create policy work_order_parts_delete on public.work_order_parts for delete to authenticated
using (public.is_workshop_owner(workshop_id) or mechanic_id = (select auth.uid()));

drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments for select to authenticated
using (public.is_workshop_owner(workshop_id) or received_by = (select auth.uid()) or public.can_access_work_order(work_order_id));

drop policy if exists payments_insert on public.payments;
create policy payments_insert on public.payments for insert to authenticated
with check (public.is_workshop_member(workshop_id) and (public.can_access_work_order(work_order_id) or public.is_workshop_owner(workshop_id)) and received_by = (select auth.uid()));

drop policy if exists payments_update on public.payments;
create policy payments_update on public.payments for update to authenticated
using (public.is_workshop_owner(workshop_id) or received_by = (select auth.uid()))
with check (public.is_workshop_owner(workshop_id) or received_by = (select auth.uid()));

drop policy if exists payments_delete on public.payments;
create policy payments_delete on public.payments for delete to authenticated
using (public.is_workshop_owner(workshop_id) or received_by = (select auth.uid()));
