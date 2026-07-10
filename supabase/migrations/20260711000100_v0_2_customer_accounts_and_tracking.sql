alter table public.profiles
  add column if not exists account_mode text not null default 'staff'
  check (account_mode in ('staff', 'customer'));

alter table public.work_orders
  add column if not exists tracking_code text,
  add column if not exists claim_token uuid default gen_random_uuid();

create or replace function public.generate_tracking_code()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  generated text;
begin
  loop
    generated := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from public.work_orders where tracking_code = generated);
  end loop;
  return generated;
end;
$$;

update public.work_orders
set tracking_code = public.generate_tracking_code()
where tracking_code is null;

update public.work_orders
set claim_token = gen_random_uuid()
where claim_token is null;

alter table public.work_orders
  alter column tracking_code set default public.generate_tracking_code(),
  alter column tracking_code set not null,
  alter column claim_token set default gen_random_uuid(),
  alter column claim_token set not null;

create unique index if not exists idx_work_orders_tracking_code_unique on public.work_orders(tracking_code);
create unique index if not exists idx_work_orders_claim_token_unique on public.work_orders(claim_token);

create table if not exists public.customer_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  status text not null default 'approved' check (status in ('approved', 'pending', 'rejected', 'revoked')),
  method text not null check (method in ('phone', 'tracking_code', 'qr', 'mechanic_approval', 'staff_manual')),
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, customer_id)
);

create table if not exists public.customer_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  motorcycle_id uuid not null references public.motorcycles(id) on delete cascade,
  method text not null check (method in ('phone', 'tracking_code', 'qr', 'mechanic_approval', 'staff_manual')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'expired', 'cancelled')),
  submitted_plate text,
  submitted_phone text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_customer_links_user on public.customer_links(user_id, status, workshop_id);
create index if not exists idx_customer_links_customer on public.customer_links(customer_id, status);
create index if not exists idx_customer_links_workshop on public.customer_links(workshop_id, status);
create index if not exists idx_customer_claims_user on public.customer_claims(user_id, status, created_at desc);
create index if not exists idx_customer_claims_workshop on public.customer_claims(workshop_id, status, created_at desc);
create index if not exists idx_customer_claims_motorcycle on public.customer_claims(motorcycle_id, status);

alter table public.customer_links enable row level security;
alter table public.customer_claims enable row level security;

create trigger customer_links_updated_at
before update on public.customer_links
for each row execute function public.set_updated_at();

create trigger customer_claims_updated_at
before update on public.customer_claims
for each row execute function public.set_updated_at();
