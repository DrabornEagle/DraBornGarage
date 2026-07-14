-- DraBornGarage v0.9.1 -> v0.9.0 rollback
-- Removes native push delivery and sound preferences while preserving v0.9 privacy/account-deletion objects.

do $$
declare v_jobid bigint;
begin
  for v_jobid in select jobid from cron.job where jobname='draborngarage-push-dispatch' loop
    perform cron.unschedule(v_jobid);
  end loop;
exception when others then
  raise notice 'Push cron cleanup skipped: %', sqlerrm;
end;
$$;

drop trigger if exists user_notifications_push_after_insert on public.user_notifications;
drop function if exists public.notification_dispatch_push_after_insert();
drop function if exists public.notification_send_push(uuid);
drop function if exists public.notification_dispatch_due_pushes(integer);
drop function if exists public.notification_register_push_token(text,text,text,text);
drop function if exists public.notification_disable_push_token(text);
drop function if exists public.notification_sound_file(text);
drop function if exists public.notification_channel_id(text);

drop table if exists public.notification_push_tokens;

alter table public.user_notifications
  drop column if exists push_attempted_at,
  drop column if exists push_sent_at,
  drop column if exists push_error;

alter table public.notification_preferences
  drop constraint if exists notification_preferences_sound_check,
  drop column if exists notification_sound,
  drop column if exists push_notifications_enabled;

drop function if exists public.notification_update_preferences(boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,text,boolean);

create function public.notification_update_preferences(
  p_local_notifications_enabled boolean,
  p_service_updates boolean,
  p_appointment_reminders boolean,
  p_appointment_reminder_24h boolean,
  p_appointment_reminder_2h boolean,
  p_payment_updates boolean,
  p_receivable_reminders boolean,
  p_platform_reminders boolean,
  p_customer_link_updates boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Oturum gerekli'; end if;

  insert into public.notification_preferences(
    user_id, local_notifications_enabled, service_updates, appointment_reminders,
    appointment_reminder_24h, appointment_reminder_2h, payment_updates,
    receivable_reminders, platform_reminders, customer_link_updates
  ) values (
    v_user, coalesce(p_local_notifications_enabled,true), coalesce(p_service_updates,true),
    coalesce(p_appointment_reminders,true), coalesce(p_appointment_reminder_24h,true),
    coalesce(p_appointment_reminder_2h,true), coalesce(p_payment_updates,true),
    coalesce(p_receivable_reminders,true), coalesce(p_platform_reminders,true),
    coalesce(p_customer_link_updates,true)
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
    updated_at=now();

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
      'updated_at',updated_at
    )
    from public.notification_preferences where user_id=v_user
  );
end;
$$;

revoke all on function public.notification_update_preferences(boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean) from public,anon;
grant execute on function public.notification_update_preferences(boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean) to authenticated;

-- pg_net and pg_cron are removed only when no other project feature depends on them.
do $$
begin
  if not exists(select 1 from cron.job) then
    drop extension if exists pg_cron;
  end if;
exception when others then
  raise notice 'pg_cron extension retained: %', sqlerrm;
end;
$$;

-- pg_net may be shared by future functions; keep it installed safely after rollback.
