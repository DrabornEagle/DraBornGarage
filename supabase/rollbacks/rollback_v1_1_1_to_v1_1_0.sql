-- DraBornGarage v1.1.1 conservative rollback
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

revoke all on function public.notification_channel_id(text) from public,anon,authenticated;
commit;
