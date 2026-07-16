-- DraBornGarage v1.1.4 rollback
-- Fresh Android v7 channel identifiers for reliable user-controlled sound behavior.
begin;

create or replace function public.notification_channel_id(p_sound text)
returns text
language sql
immutable
set search_path=public
as $$
  select case p_sound
    when 'garage_chime' then 'draborngarage-appointment-chime-v6'
    when 'garage_pulse' then 'draborngarage-workshop-pulse-v6'
    when 'garage_alert' then 'draborngarage-urgent-alert-v6'
    when 'garage_bell' then 'draborngarage-classic-bell-v6'
    when 'garage_siren' then 'draborngarage-siren-v6'
    when 'garage_turbo' then 'draborngarage-turbo-v6'
    when 'garage_metal' then 'draborngarage-metal-v6'
    when 'garage_digital' then 'draborngarage-digital-v6'
    when 'garage_retro' then 'draborngarage-retro-v6'
    when 'silent' then 'draborngarage-silent-v6'
    else 'draborngarage-system-default-v6'
  end;
$$;

revoke all on function public.notification_channel_id(text) from public,anon,authenticated;
commit;
