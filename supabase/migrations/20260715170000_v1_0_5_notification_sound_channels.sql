-- DraBornGarage v1.0.5 notification sound/channel upgrade
alter table public.notification_preferences drop constraint if exists notification_preferences_sound_check;
alter table public.notification_preferences alter column notification_sound set default 'system_loud';

update public.notification_preferences
set notification_sound = 'system_loud', updated_at = now()
where notification_sound in ('garage_chime', 'garage_pulse', 'garage_alert');

alter table public.notification_preferences add constraint notification_preferences_sound_check
check (notification_sound = any (array['system_loud', 'garage_chime', 'garage_pulse', 'garage_alert', 'silent']::text[]));

create or replace function public.notification_channel_id(p_sound text)
returns text
language sql
immutable
as $$
  select case
    when p_sound = 'silent' then 'draborngarage-silent-v3'
    else 'draborngarage-system-loud-v3'
  end;
$$;

create or replace function public.notification_sound_file(p_sound text)
returns text
language sql
immutable
as $$
  select case when p_sound = 'silent' then null else 'default' end;
$$;
