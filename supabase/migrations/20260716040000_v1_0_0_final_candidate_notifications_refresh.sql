-- DraBornGarage v1.0.0 Final Candidate notification channels and closed-app test
begin;

alter table public.notification_preferences drop constraint if exists notification_preferences_sound_check;
alter table public.notification_preferences add constraint notification_preferences_sound_check
check (notification_sound = any (array['system_loud','garage_chime','garage_pulse','garage_alert','silent']::text[]));

create or replace function public.notification_channel_id(p_sound text)
returns text language sql immutable as $$
  select case p_sound
    when 'garage_chime' then 'draborngarage-appointment-chime-v4'
    when 'garage_pulse' then 'draborngarage-workshop-pulse-v4'
    when 'garage_alert' then 'draborngarage-urgent-alert-v4'
    when 'silent' then 'draborngarage-silent-v4'
    else 'draborngarage-system-loud-v4'
  end;
$$;

create or replace function public.notification_sound_file(p_sound text)
returns text language sql immutable as $$
  select case p_sound
    when 'garage_chime' then 'garage_chime.wav'
    when 'garage_pulse' then 'garage_pulse.wav'
    when 'garage_alert' then 'garage_alert.wav'
    when 'silent' then null
    else 'default'
  end;
$$;

create or replace function public.notification_schedule_closed_app_test(p_delay_seconds integer default 45)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_user uuid:=auth.uid();
  v_delay integer:=greatest(20,least(coalesce(p_delay_seconds,45),120));
  v_id uuid;
begin
  if v_user is null then raise exception 'Oturum gerekli'; end if;
  v_id:=public.enqueue_user_notification(
    v_user,null,'system','closed_app_push_test',
    'DraBornGarage kapalı uygulama testi',
    'Bu bildirimi uygulama tamamen kapalıyken görüyorsan FCM V1 bağlantısı başarıyla çalışıyor.',
    'urgent','profile',v_user,
    jsonb_build_object('target_tab','settings','target_section','notifications','closed_app_test',true),
    v_user::text||':closed-app-test:'||extract(epoch from date_trunc('minute',now()))::bigint::text,
    now()+make_interval(secs=>v_delay),null,null
  );
  return jsonb_build_object('scheduled',v_id is not null,'notification_id',v_id,'deliver_at',now()+make_interval(secs=>v_delay),'delay_seconds',v_delay);
end;
$$;

revoke all on function public.notification_schedule_closed_app_test(integer) from public,anon;
grant execute on function public.notification_schedule_closed_app_test(integer) to authenticated;

commit;
