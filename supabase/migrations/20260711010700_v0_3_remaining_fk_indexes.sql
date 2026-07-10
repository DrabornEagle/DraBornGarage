create index if not exists idx_appointments_motorcycle_id on public.appointments(motorcycle_id);
create index if not exists idx_mechanic_time_off_mechanic_id on public.mechanic_time_off(mechanic_id);
create index if not exists idx_mechanic_working_hours_mechanic_id on public.mechanic_working_hours(mechanic_id);
