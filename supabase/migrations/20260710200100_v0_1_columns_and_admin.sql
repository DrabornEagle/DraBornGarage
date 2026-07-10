alter table public.profiles
  add column if not exists is_admin boolean not null default false;

alter table public.workshops
  add column if not exists is_active boolean not null default true,
  add column if not exists demo_batch_id uuid references public.demo_batches(id) on delete set null;

alter table public.workshop_members
  add column if not exists availability_status text not null default 'available'
    check (availability_status in ('available', 'busy', 'off')),
  add column if not exists staff_note text;

alter table public.work_orders
  add column if not exists service_type public.service_type not null default 'dropoff',
  add column if not exists customer_waiting_status public.customer_waiting_status not null default 'left_vehicle',
  add column if not exists queue_position integer,
  add column if not exists price_type public.price_type,
  add column if not exists estimated_price_min numeric(12,2) check (estimated_price_min is null or estimated_price_min >= 0),
  add column if not exists estimated_price_max numeric(12,2) check (estimated_price_max is null or estimated_price_max >= 0),
  add column if not exists quoted_price numeric(12,2) check (quoted_price is null or quoted_price >= 0),
  add column if not exists price_entered_at timestamptz,
  add column if not exists queue_updated_at timestamptz not null default now();

create index if not exists idx_workshops_active on public.workshops(is_active, created_at desc);
create index if not exists idx_workshops_demo_batch on public.workshops(demo_batch_id) where demo_batch_id is not null;
create index if not exists idx_members_role on public.workshop_members(workshop_id, role, is_active);
create index if not exists idx_work_orders_queue on public.work_orders(workshop_id, queue_position, arrived_at) where status not in ('delivered', 'cancelled');
create index if not exists idx_work_orders_service_type on public.work_orders(workshop_id, service_type, arrived_at desc);

-- Initial private platform bootstrap: the oldest profile becomes the first Admin.
update public.profiles
set is_admin = true
where id = (select id from public.profiles order by created_at asc limit 1);

update public.workshop_members
set role = 'owner_mechanic'::public.member_role
where user_id = (select id from public.profiles order by created_at asc limit 1)
  and role = 'owner'::public.member_role;
