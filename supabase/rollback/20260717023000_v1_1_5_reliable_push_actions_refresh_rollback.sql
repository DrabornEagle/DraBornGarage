-- DraBornGarage v1.1.5 rollback
begin;

do $$
declare r record;
begin
  for r in select jobid from cron.job where jobname in (
    'draborngarage-push-reconcile','draborngarage-appointment-action-reminders'
  ) loop
    perform cron.unschedule(r.jobid);
  end loop;
end;
$$;

drop trigger if exists appointment_action_notifications_after_status on public.appointments;
drop function if exists public.notification_archive_appointment_actions();
drop function if exists public.notification_enqueue_pending_appointment_actions();
drop function if exists public.notification_get_push_health();
drop function if exists public.notification_reconcile_push_requests(integer);
drop table if exists public.notification_push_requests;

drop trigger if exists work_order_status_timestamps_insert on public.work_orders;

alter table public.notification_preferences drop constraint if exists notification_preferences_sound_check;
alter table public.notification_preferences add constraint notification_preferences_sound_check
check (notification_sound = any (array[
  'system_loud','garage_chime','garage_pulse','garage_alert','garage_bell',
  'garage_siren','garage_turbo','garage_metal','garage_digital','garage_retro','silent'
]::text[]));

-- v1.1.4 channel helpers remain available for existing APKs.
create or replace function public.notification_channel_id(p_sound text)
returns text language sql immutable set search_path=public as $$
  select case p_sound
    when 'garage_chime' then 'draborngarage-appointment-chime-v7'
    when 'garage_pulse' then 'draborngarage-workshop-pulse-v7'
    when 'garage_alert' then 'draborngarage-urgent-alert-v7'
    when 'garage_bell' then 'draborngarage-classic-bell-v7'
    when 'garage_siren' then 'draborngarage-siren-v7'
    when 'garage_turbo' then 'draborngarage-turbo-v7'
    when 'garage_metal' then 'draborngarage-metal-v7'
    when 'garage_digital' then 'draborngarage-digital-v7'
    when 'garage_retro' then 'draborngarage-retro-v7'
    when 'silent' then 'draborngarage-silent-v7'
    else 'draborngarage-system-default-v7'
  end;
$$;

create or replace function public.notification_sound_file(p_sound text)
returns text language sql immutable set search_path=public as $$
  select case p_sound
    when 'garage_chime' then 'garage_chime.wav'
    when 'garage_pulse' then 'garage_pulse.wav'
    when 'garage_alert' then 'garage_alert.wav'
    when 'garage_bell' then 'garage_bell.wav'
    when 'garage_siren' then 'garage_siren.wav'
    when 'garage_turbo' then 'garage_turbo.wav'
    when 'garage_metal' then 'garage_metal.wav'
    when 'garage_digital' then 'garage_digital.wav'
    when 'garage_retro' then 'garage_retro.wav'
    when 'silent' then null
    else 'default'
  end;
$$;

commit;
