create index if not exists idx_appointments_requested_by on public.appointments(requested_by) where requested_by is not null;
create index if not exists idx_appointments_created_by on public.appointments(created_by);
create index if not exists idx_appointments_confirmed_by on public.appointments(confirmed_by) where confirmed_by is not null;
create index if not exists idx_appointments_cancelled_by on public.appointments(cancelled_by) where cancelled_by is not null;
create index if not exists idx_appointment_events_actor on public.appointment_events(actor_id) where actor_id is not null;
create index if not exists idx_mechanic_time_off_created_by on public.mechanic_time_off(created_by);
