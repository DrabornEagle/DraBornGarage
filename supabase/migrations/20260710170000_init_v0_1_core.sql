-- DraBornGarage v0.1 - core database, auth helpers and row-level security
create extension if not exists pgcrypto;

create type public.member_role as enum ('owner', 'mechanic');
create type public.work_order_status as enum ('waiting', 'in_progress', 'completed', 'delivered', 'cancelled');
create type public.payment_status as enum ('unpaid', 'partial', 'paid');
create type public.payment_method as enum ('cash', 'card', 'transfer', 'other');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workshops (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  phone text,
  address text,
  logo_url text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workshop_members (
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.member_role not null default 'mechanic',
  is_active boolean not null default true,
  joined_at timestamptz not null default now(),
  primary key (workshop_id, user_id)
);

create table public.workshop_invites (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  code text not null unique,
  role public.member_role not null,
  created_by uuid not null references public.profiles(id),
  expires_at timestamptz,
  used_by uuid references public.profiles(id),
  used_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 120),
  phone text,
  note text,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.motorcycles (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  brand text not null,
  model text not null,
  year integer check (year is null or year between 1950 and 2100),
  plate text,
  vin text,
  color text,
  odometer integer check (odometer is null or odometer >= 0),
  note text,
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.work_orders (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  customer_id uuid not null references public.customers(id),
  motorcycle_id uuid not null references public.motorcycles(id),
  assigned_mechanic_id uuid references public.profiles(id),
  status public.work_order_status not null default 'waiting',
  payment_status public.payment_status not null default 'unpaid',
  complaint text not null,
  diagnosis text,
  notes text,
  odometer_in integer check (odometer_in is null or odometer_in >= 0),
  arrived_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  delivered_at timestamptz,
  labor_amount numeric(12,2) not null default 0 check (labor_amount >= 0),
  parts_amount numeric(12,2) not null default 0 check (parts_amount >= 0),
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  amount_received numeric(12,2) not null default 0 check (amount_received >= 0),
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.work_order_services (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  workshop_id uuid references public.workshops(id) on delete cascade,
  mechanic_id uuid not null,
  title text not null,
  description text,
  price numeric(12,2) not null default 0 check (price >= 0),
  completed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint work_order_services_mechanic_id_fkey foreign key (mechanic_id) references public.profiles(id)
);

create table public.parts (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  name text not null,
  sku text,
  unit text not null default 'adet',
  stock_quantity numeric(12,2) not null default 0,
  purchase_price numeric(12,2) not null default 0 check (purchase_price >= 0),
  sale_price numeric(12,2) not null default 0 check (sale_price >= 0),
  low_stock_threshold numeric(12,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workshop_id, sku)
);

create table public.work_order_parts (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  workshop_id uuid references public.workshops(id) on delete cascade,
  part_id uuid references public.parts(id) on delete set null,
  mechanic_id uuid references public.profiles(id),
  part_name text not null,
  quantity numeric(12,2) not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  total_price numeric(12,2) generated always as (quantity * unit_price) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  workshop_id uuid references public.workshops(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  payment_method public.payment_method not null default 'cash',
  received_by uuid not null default auth.uid() references public.profiles(id),
  note text,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index idx_members_user on public.workshop_members(user_id) where is_active;
create index idx_customers_workshop on public.customers(workshop_id, created_at desc);
create index idx_motorcycles_workshop on public.motorcycles(workshop_id, customer_id);
create index idx_work_orders_workshop_status on public.work_orders(workshop_id, status, arrived_at desc);
create index idx_work_orders_mechanic on public.work_orders(assigned_mechanic_id, arrived_at desc);
create index idx_services_mechanic on public.work_order_services(mechanic_id, created_at desc);
create index idx_services_work_order on public.work_order_services(work_order_id);
create index idx_parts_work_order on public.work_order_parts(work_order_id);
create index idx_payments_workshop on public.payments(workshop_id, paid_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger workshops_updated_at before update on public.workshops for each row execute function public.set_updated_at();
create trigger customers_updated_at before update on public.customers for each row execute function public.set_updated_at();
create trigger motorcycles_updated_at before update on public.motorcycles for each row execute function public.set_updated_at();
create trigger work_orders_updated_at before update on public.work_orders for each row execute function public.set_updated_at();
create trigger services_updated_at before update on public.work_order_services for each row execute function public.set_updated_at();
create trigger parts_updated_at before update on public.parts for each row execute function public.set_updated_at();
create trigger work_order_parts_updated_at before update on public.work_order_parts for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
