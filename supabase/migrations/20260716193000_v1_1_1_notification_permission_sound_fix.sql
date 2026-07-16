-- DraBornGarage v1.1.1
-- Fix notification sound persistence and move Android delivery to clean v6 channels.
begin;

alter table public.notification_preferences
  drop constraint if exists notification_preferences_sound_check;

alter table public.notification_preferences
  add constraint notification_preferences_sound_check
  check (notification_sound = any (array[
    'system_loud',
    'garage_chime',
    'garage_pulse',
    'garage_alert',
    'garage_bell',
    'garage_siren',
    'garage_turbo',
    'garage_metal',
    'garage_digital',
    'garage_retro',
    'silent'
  ]::text[]));

create or replace function public.notification_update_preferences(
  p_local_notifications_enabled boolean,
  p_service_updates boolean,
  p_appointment_reminders boolean,
  p_appointment_reminder_24h boolean,
  p_appointment_reminder_2h boolean,
  p_payment_updates boolean,
  p_receivable_reminders boolean,
  p_platform_reminders boolean,
  p_customer_link_updates boolean,
  p_notification_sound text default 'system_loud',
  p_push_notifications_enabled boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user uuid := auth.uid();
  v_sound text;
begin
  if v_user is null then raise exception 'Oturum gerekli'; end if;

  v_sound := case
    when p_notification_sound = any (array[
      'system_loud','garage_chime','garage_pulse','garage_alert','garage_bell',
      'garage_siren','garage_turbo','garage_metal','garage_digital','garage_retro','silent'
    ]::text[]) then p_notification_sound
    else 'system_loud'
  end;

  insert into public.notification_preferences(
    user_id,
    local_notifications_enabled,
    service_updates,
    appointment_reminders,
    appointment_reminder_24h,
    appointment_reminder_2h,
    payment_updates,
    receivable_reminders,
    platform_reminders,
    customer_link_updates,
    notification_sound,
    push_notifications_enabled
  )
  values(
    v_user,
    coalesce(p_local_notifications_enabled,true),
    coalesce(p_service_updates,true),
    coalesce(p_appointment_reminders,true),
    coalesce(p_appointment_reminder_24h,true),
    coalesce(p_appointment_reminder_2h,true),
    coalesce(p_payment_updates,true),
    coalesce(p_receivable_reminders,true),
    coalesce(p_platform_reminders,true),
    coalesce(p_customer_link_updates,true),
    v_sound,
    coalesce(p_push_notifications_enabled,true)
  )
  on conflict(user_id) do update set
    local_notifications_enabled=excluded.local_notifications_enabled,
    service_updates=excluded.service_updates,
    appointment_reminders=excluded.appointment_reminders,
    appointment_reminder_24h=excluded.appointment_reminder_24h,
    appointment_reminder_2h=excluded.appointment_reminder_2h,
    payment_updates=excluded.payment_updates,
    receivable_reminders=excluded.receivable_reminders,
    platform_reminders=excluded.platform_reminders,
    customer_link_updates=excluded.customer_link_updates,
    notification_sound=excluded.notification_sound,
    push_notifications_enabled=excluded.push_notifications_enabled,
    updated_at=now();

  if not coalesce(p_appointment_reminders,true) then
    update public.user_notifications
    set archived_at=now(),updated_at=now()
    where user_id=v_user and category='appointments' and deliver_at>now() and archived_at is null;
  end if;
  if not coalesce(p_receivable_reminders,true) then
    update public.user_notifications
    set archived_at=now(),updated_at=now()
    where user_id=v_user and category='receivables' and deliver_at>now() and archived_at is null;
  end if;
  if not coalesce(p_platform_reminders,true) then
    update public.user_notifications
    set archived_at=now(),updated_at=now()
    where user_id=v_user and category='platform' and deliver_at>now() and archived_at is null;
  end if;

  perform public.notification_refresh_reminders();

  return (
    select jsonb_build_object(
      'local_notifications_enabled',local_notifications_enabled,
      'service_updates',service_updates,
      'appointment_reminders',appointment_reminders,
      'appointment_reminder_24h',appointment_reminder_24h,
      'appointment_reminder_2h',appointment_reminder_2h,
      'payment_updates',payment_updates,
      'receivable_reminders',receivable_reminders,
      'platform_reminders',platform_reminders,
      'customer_link_updates',customer_link_updates,
      'notification_sound',notification_sound,
      'push_notifications_enabled',push_notifications_enabled,
      'updated_at',updated_at
    )
    from public.notification_preferences
    where user_id=v_user
  );
end;
$$;

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

revoke all on function public.notification_update_preferences(boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,text,boolean) from public,anon;
grant execute on function public.notification_update_preferences(boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,text,boolean) to authenticated;
revoke all on function public.notification_channel_id(text) from public,anon,authenticated;

commit;
