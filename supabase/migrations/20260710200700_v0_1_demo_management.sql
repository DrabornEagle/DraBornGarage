create or replace function public.resolve_demo_root_workshop(p_workshop_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select db.workshop_id
      from public.workshops w
      join public.demo_batches db on db.id = w.demo_batch_id
      where w.id = p_workshop_id
      limit 1
    ),
    p_workshop_id
  );
$$;

create or replace function public.demo_data_status(p_workshop_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with root as (
    select public.resolve_demo_root_workshop(p_workshop_id) as id
  )
  select jsonb_build_object(
    'active', exists(select 1 from public.demo_batches db where db.workshop_id = root.id),
    'batch_id', (select db.id from public.demo_batches db where db.workshop_id = root.id order by db.created_at desc limit 1),
    'created_at', (select db.created_at from public.demo_batches db where db.workshop_id = root.id order by db.created_at desc limit 1),
    'customer_count', (select count(*) from public.customers c where c.demo_batch_id in (select db.id from public.demo_batches db where db.workshop_id = root.id)),
    'work_order_count', (select count(*) from public.work_orders wo where wo.demo_batch_id in (select db.id from public.demo_batches db where db.workshop_id = root.id)),
    'workshop_count', (select count(*) from public.workshops w where w.demo_batch_id in (select db.id from public.demo_batches db where db.workshop_id = root.id))
  )
  from root
  where public.is_workshop_owner(root.id) or public.is_admin();
$$;

create or replace function public.clear_demo_data(p_workshop_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  root_workshop uuid := public.resolve_demo_root_workshop(p_workshop_id);
  deleted_orders integer := 0;
  deleted_customers integer := 0;
  deleted_workshops integer := 0;
  deleted_batches integer := 0;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if not public.is_workshop_owner(root_workshop) and not public.is_admin() then
    raise exception 'Demo verilerini yalnızca Admin veya işletme sahibi yönetebilir';
  end if;

  delete from public.workshops
  where demo_batch_id in (select id from public.demo_batches where workshop_id = root_workshop);
  get diagnostics deleted_workshops = row_count;

  delete from public.work_orders
  where demo_batch_id in (select id from public.demo_batches where workshop_id = root_workshop);
  get diagnostics deleted_orders = row_count;

  delete from public.customers
  where demo_batch_id in (select id from public.demo_batches where workshop_id = root_workshop);
  get diagnostics deleted_customers = row_count;

  delete from public.demo_batches where workshop_id = root_workshop;
  get diagnostics deleted_batches = row_count;

  return jsonb_build_object(
    'root_workshop_id', root_workshop,
    'deleted_workshops', deleted_workshops,
    'deleted_work_orders', deleted_orders,
    'deleted_customers', deleted_customers,
    'deleted_batches', deleted_batches
  );
end;
$$;

revoke execute on function public.resolve_demo_root_workshop(uuid) from public, anon;
grant execute on function public.resolve_demo_root_workshop(uuid) to authenticated;
