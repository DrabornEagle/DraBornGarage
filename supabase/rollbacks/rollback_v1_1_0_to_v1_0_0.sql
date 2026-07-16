-- Conservative rollback for DraBornGarage v1.1.0.
-- Historical percentage charge rows are preserved. Future charges return to fixed 50 TL.
begin;
update public.platform_global_settings set default_fee_mode='fixed',default_fee_per_order=50 where id=1;
update public.workshop_platform_settings set fee_mode='fixed',fee_per_order=50;
update public.notification_preferences set notification_sound='system_loud' where notification_sound not in ('system_loud','garage_chime','garage_pulse','garage_alert','silent');
alter table public.notification_preferences drop constraint if exists notification_preferences_sound_check;
alter table public.notification_preferences add constraint notification_preferences_sound_check check (notification_sound = any (array['system_loud','garage_chime','garage_pulse','garage_alert','silent']::text[]));
commit;
