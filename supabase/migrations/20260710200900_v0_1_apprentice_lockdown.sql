drop policy if exists work_orders_select on public.work_orders;
create policy work_orders_select on public.work_orders for select to authenticated
using (
  public.is_workshop_owner(workshop_id)
  or (
    public.is_workshop_worker(workshop_id)
    and (assigned_mechanic_id = (select auth.uid()) or created_by = (select auth.uid()))
  )
);

drop policy if exists work_orders_insert on public.work_orders;
create policy work_orders_insert on public.work_orders for insert to authenticated
with check (
  (public.is_workshop_owner(workshop_id) or public.is_workshop_worker(workshop_id))
  and created_by = (select auth.uid())
);

drop policy if exists work_orders_update on public.work_orders;
create policy work_orders_update on public.work_orders for update to authenticated
using (
  public.is_workshop_owner(workshop_id)
  or (
    public.is_workshop_worker(workshop_id)
    and (assigned_mechanic_id = (select auth.uid()) or created_by = (select auth.uid()))
  )
)
with check (public.is_workshop_owner(workshop_id) or public.is_workshop_worker(workshop_id));

drop policy if exists customers_select on public.customers;
create policy customers_select on public.customers for select to authenticated
using (public.is_workshop_owner(workshop_id) or public.is_workshop_worker(workshop_id));

drop policy if exists customers_insert on public.customers;
create policy customers_insert on public.customers for insert to authenticated
with check ((public.is_workshop_owner(workshop_id) or public.is_workshop_worker(workshop_id)) and created_by = (select auth.uid()));

drop policy if exists customers_update on public.customers;
create policy customers_update on public.customers for update to authenticated
using (public.is_workshop_owner(workshop_id) or public.is_workshop_worker(workshop_id))
with check (public.is_workshop_owner(workshop_id) or public.is_workshop_worker(workshop_id));

drop policy if exists motorcycles_select on public.motorcycles;
create policy motorcycles_select on public.motorcycles for select to authenticated
using (public.is_workshop_owner(workshop_id) or public.is_workshop_worker(workshop_id));

drop policy if exists motorcycles_insert on public.motorcycles;
create policy motorcycles_insert on public.motorcycles for insert to authenticated
with check ((public.is_workshop_owner(workshop_id) or public.is_workshop_worker(workshop_id)) and created_by = (select auth.uid()));

drop policy if exists motorcycles_update on public.motorcycles;
create policy motorcycles_update on public.motorcycles for update to authenticated
using (public.is_workshop_owner(workshop_id) or public.is_workshop_worker(workshop_id))
with check (public.is_workshop_owner(workshop_id) or public.is_workshop_worker(workshop_id));

drop policy if exists parts_select on public.parts;
create policy parts_select on public.parts for select to authenticated
using (public.is_workshop_owner(workshop_id) or public.is_workshop_worker(workshop_id));

drop policy if exists work_order_parts_select on public.work_order_parts;
create policy work_order_parts_select on public.work_order_parts for select to authenticated
using (
  public.is_workshop_owner(workshop_id)
  or (public.is_workshop_worker(workshop_id) and (mechanic_id = (select auth.uid()) or public.can_access_work_order(work_order_id)))
);
