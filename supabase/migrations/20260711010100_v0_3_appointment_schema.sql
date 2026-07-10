alter table public.workshops
  add column if not exists timezone text not null default 'Europe/Istanbul',
  add column if not exists appointments_enabled boolean not null default true,
  add column if not exists appointment_auto_confirm boolean not null default false,
  add column if not exists appointment_booking_days integer not null default 30,
  add column if not exists appointment_min_notice_minutes integer not null default 60;

alter table public.workshops drop constraint if exists workshops_appointment_booking_days_check;
alter table public.workshops add constraint workshops_appointment_booking_days_check check (appointment_booking_days between 1 and 180);
alter table public.workshops drop constraint if exists workshops_appointment_min_notice_minutes_check;
alter table public.workshops add constraint workshops_appointment_min_notice_minutes_check check (appointment_min_notice_minutes between 0 and 1440);

create table if not exists public.mechanic_working_hours (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  mechanic_id uuid not null references public.profiles(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  is_working boolean not null default true,
  start_time time not null default '09:00',
  end_time time not null default '18:00',
  break_start time,
  break_end time,
  slot_minutes integer not null default 60 check (slot_minutes between 15 and 240),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(workshop_id, mechanic_id, day_of_week),
  check (end_time > start_time),
  check ((break_start is null and break_end is null) or (break_start is not null and break_end is not null and break_end > break_start and break_start >= start_time and break_end <= end_time))
);

create table if not exists public.mechanic_time_off (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  mechanic_id uuid not null references public.profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_by uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  motorcycle_id uuid not null references public.motorcycles(id) on delete restrict,
  mechanic_id uuid not null references public.profiles(id) on delete restrict,
  service_title text not null,
  customer_note text,
  staff_note text,
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  status text not null default 'pending' check (status in ('pending','confirmed','arrived','converted','cancelled','no_show')),
  source text not null default 'staff' check (source in ('customer','mechanic','owner','admin')),
  requested_by uuid references public.profiles(id) on delete set null,
  created_by uuid not null default auth.uid() references public.profiles(id) on delete restrict,
  confirmed_by uuid references public.profiles(id) on delete set null,
  confirmed_at timestamptz,
  arrived_at timestamptz,
  converted_at timestamptz,
  cancelled_by uuid references public.profiles(id) on delete set null,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (scheduled_end > scheduled_start)
);

alter table public.work_orders add column if not exists appointment_id uuid references public.appointments(id) on delete set null;
create unique index if not exists idx_work_orders_appointment_unique on public.work_orders(appointment_id) where appointment_id is not null;

create table if not exists public.appointment_events (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  workshop_id uuid not null references public.workshops(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (event_type in ('created','confirmed','rescheduled','arrived','converted','cancelled','no_show','note')),
  old_status text,
  new_status text,
  old_start timestamptz,
  new_start timestamptz,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_appointments_workshop_date on public.appointments(workshop_id, scheduled_start);
create index if not exists idx_appointments_mechanic_date on public.appointments(mechanic_id, scheduled_start);
create index if not exists idx_appointments_customer_date on public.appointments(customer_id, scheduled_start desc);
create index if not exists idx_appointments_status on public.appointments(workshop_id, status, scheduled_start);
create index if not exists idx_mechanic_hours_lookup on public.mechanic_working_hours(workshop_id, mechanic_id, day_of_week);
create index if not exists idx_mechanic_time_off_lookup on public.mechanic_time_off(workshop_id, mechanic_id, starts_at, ends_at);
create index if not exists idx_appointment_events_appointment on public.appointment_events(appointment_id, created_at);
create index if not exists idx_appointment_events_workshop on public.appointment_events(workshop_id, created_at desc);

create trigger mechanic_working_hours_updated_at before update on public.mechanic_working_hours for each row execute function public.set_updated_at();
create trigger mechanic_time_off_updated_at before update on public.mechanic_time_off for each row execute function public.set_updated_at();
create trigger appointments_updated_at before update on public.appointments for each row execute function public.set_updated_at();

alter table public.mechanic_working_hours enable row level security;
alter table public.mechanic_time_off enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_events enable row level security;

create policy mechanic_hours_staff_select on public.mechanic_working_hours for select to authenticated using (public.is_admin() or public.is_workshop_member(workshop_id));
create policy mechanic_time_off_staff_select on public.mechanic_time_off for select to authenticated using (public.is_admin() or public.is_workshop_member(workshop_id));
create policy appointments_staff_select on public.appointments for select to authenticated using (public.is_admin() or public.is_workshop_member(workshop_id));
create policy appointment_events_staff_select on public.appointment_events for select to authenticated using (public.is_admin() or public.is_workshop_member(workshop_id));

create or replace function public.seed_mechanic_working_hours()
returns trigger language plpgsql security definer set search_path = public as $$
declare d integer;
begin
  if new.is_active and new.role in ('mechanic'::public.member_role, 'owner_mechanic'::public.member_role) then
    for d in 0..6 loop
      insert into public.mechanic_working_hours(workshop_id, mechanic_id, day_of_week, is_working, start_time, end_time, slot_minutes)
      values (new.workshop_id, new.user_id, d, d <> 0, '09:00', '18:00', 60)
      on conflict (workshop_id, mechanic_id, day_of_week) do nothing;
    end loop;
  end if;
  return new;
end;
$$;

create trigger seed_mechanic_working_hours_trigger after insert or update of role, is_active on public.workshop_members for each row execute function public.seed_mechanic_working_hours();

insert into public.mechanic_working_hours(workshop_id, mechanic_id, day_of_week, is_working, start_time, end_time, slot_minutes)
select wm.workshop_id, wm.user_id, d.day_of_week, d.day_of_week <> 0, '09:00'::time, '18:00'::time, 60
from public.workshop_members wm cross join generate_series(0,6) as d(day_of_week)
where wm.is_active and wm.role in ('mechanic'::public.member_role, 'owner_mechanic'::public.member_role)
on conflict (workshop_id, mechanic_id, day_of_week) do nothing;

create extension if not exists btree_gist with schema extensions;
alter table public.appointments add constraint appointments_no_active_overlap exclude using gist (
  mechanic_id with =,
  tstzrange(scheduled_start, scheduled_end, '[)') with &&
) where (status in ('pending','confirmed','arrived'));
