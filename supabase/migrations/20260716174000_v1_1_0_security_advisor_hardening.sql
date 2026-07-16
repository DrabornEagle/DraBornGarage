-- DraBornGarage v1.1.0
-- Security-advisor hardening after the platform fee and notification migrations.
begin;

create or replace function public.notification_channel_id(p_sound text)
returns text
language sql
immutable
set search_path=public
as $$
  select case p_sound
    when 'garage_chime' then 'draborngarage-appointment-chime-v5'
    when 'garage_pulse' then 'draborngarage-workshop-pulse-v5'
    when 'garage_alert' then 'draborngarage-urgent-alert-v5'
    when 'garage_bell' then 'draborngarage-classic-bell-v5'
    when 'garage_siren' then 'draborngarage-siren-v5'
    when 'garage_turbo' then 'draborngarage-turbo-v5'
    when 'garage_metal' then 'draborngarage-metal-v5'
    when 'garage_digital' then 'draborngarage-digital-v5'
    when 'garage_retro' then 'draborngarage-retro-v5'
    when 'silent' then 'draborngarage-silent-v5'
    else 'draborngarage-system-default-v5'
  end;
$$;

create or replace function public.notification_sound_file(p_sound text)
returns text
language sql
immutable
set search_path=public
as $$
  select case p_sound
    when 'system_loud' then 'default'
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

revoke all on function public.notification_channel_id(text) from public,anon,authenticated;
revoke all on function public.notification_sound_file(text) from public,anon,authenticated;

-- Trigger-only helpers must never be exposed as REST RPC endpoints.
revoke all on function public.notification_dispatch_push_after_insert() from public,anon,authenticated;
revoke all on function public.sync_linked_profile_odometer() from public,anon,authenticated;
revoke all on function public.sync_motorcycle_odometer_from_work_order() from public,anon,authenticated;
revoke all on function public.sync_new_user_customer_odometer() from public,anon,authenticated;
revoke all on function public.work_order_note_author_snapshot() from public,anon,authenticated;

-- Signed-in customer/staff RPCs remain available to authenticated users only.
revoke all on function public.customer_create_appointment(uuid,uuid,uuid,text,text,timestamptz,timestamptz,integer) from public,anon;
grant execute on function public.customer_create_appointment(uuid,uuid,uuid,text,text,timestamptz,timestamptz,integer) to authenticated;
revoke all on function public.customer_create_open_appointment(uuid,uuid,text,text,text,text,text,timestamptz,timestamptz,integer) from public,anon;
grant execute on function public.customer_create_open_appointment(uuid,uuid,text,text,text,text,text,timestamptz,timestamptz,integer) to authenticated;
revoke all on function public.staff_open_receivable(uuid,date,text,text,numeric) from public,anon;
grant execute on function public.staff_open_receivable(uuid,date,text,text,numeric) to authenticated;

commit;
