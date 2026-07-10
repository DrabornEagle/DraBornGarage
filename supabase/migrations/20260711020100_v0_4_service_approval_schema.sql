do $$ begin
  create type public.extra_work_status as enum ('pending','approved','rejected','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.extra_approval_method as enum ('app','in_person','phone','whatsapp','staff_rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.work_note_visibility as enum ('staff','customer');
exception when duplicate_object then null; end $$;

alter table public.work_orders
  add column if not exists testing_started_at timestamptz,
  add column if not exists ready_at timestamptz;

create table if not exists public.work_order_extra_requests (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  requested_by uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  mechanic_id uuid references public.profiles(id) on delete set null,
  title text not null,
  description text,
  labor_amount numeric(12,2) not null default 0 check (labor_amount >= 0),
  parts_amount numeric(12,2) not null default 0 check (parts_amount >= 0),
  total_amount numeric(12,2) generated always as (labor_amount + parts_amount) stored,
  status public.extra_work_status not null default 'pending',
  approval_method public.extra_approval_method,
  resume_status public.work_order_status not null,
  response_note text,
  responded_by uuid references public.profiles(id) on delete set null,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (labor_amount + parts_amount > 0)
);

create unique index if not exists idx_extra_requests_one_pending_per_order
  on public.work_order_extra_requests(work_order_id)
  where status = 'pending';

create table if not exists public.work_order_extra_request_events (
  id uuid primary key default gen_random_uuid(),
  extra_request_id uuid not null references public.work_order_extra_requests(id) on delete cascade,
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (event_type in ('created','approved','rejected','cancelled')),
  method public.extra_approval_method,
  old_status public.extra_work_status,
  new_status public.extra_work_status not null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.work_order_notes (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  visibility public.work_note_visibility not null default 'staff',
  category text not null default 'general' check (category in ('general','diagnosis','test','customer_update','internal')),
  note text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (length(trim(note)) >= 2)
);

create table if not exists public.work_order_events (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (event_type in ('status_changed','service_added','service_started','service_completed','service_deleted','part_added','part_deleted','note_added','note_deleted','extra_created','extra_approved','extra_rejected')),
  old_status public.work_order_status,
  new_status public.work_order_status,
  note text,
  created_at timestamptz not null default now()
);

alter table public.work_order_services
  add column if not exists extra_request_id uuid references public.work_order_extra_requests(id) on delete set null,
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz;

alter table public.work_order_parts
  add column if not exists extra_request_id uuid references public.work_order_extra_requests(id) on delete set null,
  add column if not exists used_at timestamptz not null default now();

create index if not exists idx_extra_requests_order on public.work_order_extra_requests(work_order_id, created_at desc);
create index if not exists idx_extra_requests_workshop_status on public.work_order_extra_requests(workshop_id, status, created_at desc);
create index if not exists idx_extra_requests_requested_by on public.work_order_extra_requests(requested_by);
create index if not exists idx_extra_requests_mechanic on public.work_order_extra_requests(mechanic_id) where mechanic_id is not null;
create index if not exists idx_extra_requests_responded_by on public.work_order_extra_requests(responded_by) where responded_by is not null;
create index if not exists idx_extra_events_request on public.work_order_extra_request_events(extra_request_id, created_at);
create index if not exists idx_extra_events_order on public.work_order_extra_request_events(work_order_id, created_at);
create index if not exists idx_extra_events_actor on public.work_order_extra_request_events(actor_id) where actor_id is not null;
create index if not exists idx_work_order_notes_order on public.work_order_notes(work_order_id, created_at desc);
create index if not exists idx_work_order_notes_author on public.work_order_notes(author_id);
create index if not exists idx_work_order_events_order on public.work_order_events(work_order_id, created_at desc);
create index if not exists idx_work_order_events_actor on public.work_order_events(actor_id) where actor_id is not null;
create index if not exists idx_work_order_services_extra on public.work_order_services(extra_request_id) where extra_request_id is not null;
create index if not exists idx_work_order_parts_extra on public.work_order_parts(extra_request_id) where extra_request_id is not null;

create trigger work_order_extra_requests_updated_at before update on public.work_order_extra_requests for each row execute function public.set_updated_at();
create trigger work_order_notes_updated_at before update on public.work_order_notes for each row execute function public.set_updated_at();

alter table public.work_order_extra_requests enable row level security;
alter table public.work_order_extra_request_events enable row level security;
alter table public.work_order_notes enable row level security;
alter table public.work_order_events enable row level security;

create policy extra_requests_staff_select on public.work_order_extra_requests for select to authenticated
using (public.is_admin() or public.is_workshop_member(workshop_id));
create policy extra_request_events_staff_select on public.work_order_extra_request_events for select to authenticated
using (public.is_admin() or public.is_workshop_member(workshop_id));
create policy work_order_notes_staff_select on public.work_order_notes for select to authenticated
using (public.is_admin() or public.is_workshop_member(workshop_id));
create policy work_order_events_staff_select on public.work_order_events for select to authenticated
using (public.is_admin() or public.is_workshop_member(workshop_id));
