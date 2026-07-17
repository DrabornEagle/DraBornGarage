-- DraBornGarage v1.1.6 rollback
-- Remove bulk notification cleanup RPC and restore Turkish voice channel v8 mapping.
begin;

drop function if exists public.notification_clear_all();

create or replace function public.notification_channel_id(p_sound text,p_category text)
returns text
language sql
immutable
set search_path=public
as $$
select case
when p_sound='turkish_voice' and p_category='appointments' then 'draborngarage-voice-appointment-v8'
when p_sound='turkish_voice' and p_category='customer_links' then 'draborngarage-voice-customer-link-v8'
when p_sound='turkish_voice' and p_category='service' then 'draborngarage-voice-service-v8'
when p_sound='turkish_voice' and p_category in ('payments','receivables','platform') then 'draborngarage-voice-payment-v8'
when p_sound='turkish_voice' then 'draborngarage-voice-generic-v8'
when p_sound='garage_chime' then 'draborngarage-appointment-chime-v7'
when p_sound='garage_pulse' then 'draborngarage-workshop-pulse-v7'
when p_sound='garage_alert' then 'draborngarage-urgent-alert-v7'
when p_sound='garage_bell' then 'draborngarage-classic-bell-v7'
when p_sound='garage_siren' then 'draborngarage-siren-v7'
when p_sound='garage_turbo' then 'draborngarage-turbo-v7'
when p_sound='garage_metal' then 'draborngarage-metal-v7'
when p_sound='garage_digital' then 'draborngarage-digital-v7'
when p_sound='garage_retro' then 'draborngarage-retro-v7'
when p_sound='silent' then 'draborngarage-silent-v7'
else 'draborngarage-system-default-v7' end;
$$;

revoke all on function public.notification_channel_id(text,text) from public,anon,authenticated;
commit;
