begin;

-- v0.3 public RPCs and helpers
drop function if exists public.staff_get_appointment_events(uuid);
drop function if exists public.staff_convert_appointment_to_work_order(uuid, public.customer_waiting_status, integer);
drop function if exists public.staff_set_appointment_status(uuid, text, text);
drop function if exists public.staff_reschedule_appointment(uuid, uuid, timestamptz, timestamptz, text);
drop function if exists public.staff_create_appointment(uuid, uuid, uuid, uuid, text, text, text, timestamptz, timestamptz);
drop function if exists public.staff_get_appointments(uuid, timestamptz, timestamptz, uuid);
drop function if exists public.staff_update_appointment_settings(uuid, boolean, boolean, integer, integer, text);
drop function if exists public.staff_delete_time_off(uuid);
drop function if exists public.staff_add_time_off(uuid, uuid, timestamptz, timestamptz, text);
drop function if exists public.staff_get_time_off(uuid, uuid);
drop function if exists public.staff_upsert_working_hours(uuid, uuid, integer, boolean, time, time, time, time, integer);
drop function if exists public.staff_get_working_hours(uuid, uuid);
drop function if exists public.staff_get_appointment_mechanics(uuid);
drop function if exists public.customer_cancel_appointment(uuid, text);
drop function if exists public.customer_create_appointment(uuid, uuid, uuid, text, text, timestamptz, timestamptz);
drop function if exists public.customer_get_appointments(uuid);
drop function if exists public.customer_get_appointment_mechanics(uuid);
drop function if exists public.appointment_get_available_slots(uuid, uuid, date, uuid);
drop function if exists public.appointment_slot_available(uuid, uuid, timestamptz, timestamptz, uuid);
drop function if exists public.can_manage_mechanic_schedule(uuid, uuid);

-- Default-hours trigger must be removed before its function
drop trigger if exists seed_mechanic_working_hours_trigger on public.workshop_members;
drop function if exists public.seed_mechanic_working_hours();

-- Remove the work-order reference before deleting appointment tables
drop index if exists public.idx_work_orders_appointment_unique;
alter table public.work_orders drop column if exists appointment_id;

-- v0.3 appointment data and schedules
drop table if exists public.appointment_events cascade;
drop table if exists public.appointments cascade;
drop table if exists public.mechanic_time_off cascade;
drop table if exists public.mechanic_working_hours cascade;

-- Return workshops to v0.2 shape
alter table public.workshops drop constraint if exists workshops_appointment_booking_days_check;
alter table public.workshops drop constraint if exists workshops_appointment_min_notice_minutes_check;
alter table public.workshops
  drop column if exists timezone,
  drop column if exists appointments_enabled,
  drop column if exists appointment_auto_confirm,
  drop column if exists appointment_booking_days,
  drop column if exists appointment_min_notice_minutes;

-- btree_gist can be shared by future modules, so it is intentionally kept installed.
commit;
