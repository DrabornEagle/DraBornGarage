-- DraBornGarage v1.1.7 rollback
-- Restores v1.1.6 function behavior and v9 voice channel mapping.
-- Tokens disabled by the safety cleanup remain disabled intentionally.
begin;

create or replace function public.notification_register_push_token(
  p_expo_push_token text,
  p_device_id text default null,
  p_platform text default 'unknown',
  p_app_version text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  v_user uuid:=auth.uid();
  v_id uuid;
begin
  if v_user is null then raise exception 'Oturum gerekli'; end if;
  if p_expo_push_token is null or p_expo_push_token !~ '^Expo(nent)?PushToken\[[^]]+\]$' then
    raise exception 'Geçersiz Expo push tokenı';
  end if;

  if nullif(trim(p_device_id),'') is not null then
    update public.notification_push_tokens
    set enabled=false,updated_at=now()
    where user_id=v_user
      and device_id=trim(p_device_id)
      and expo_push_token<>trim(p_expo_push_token);
  end if;

  insert into public.notification_push_tokens(
    user_id,expo_push_token,device_id,platform,app_version,enabled,last_seen_at
  ) values(
    v_user,
    trim(p_expo_push_token),
    nullif(trim(p_device_id),''),
    case when p_platform in ('android','ios') then p_platform else 'unknown' end,
    nullif(trim(p_app_version),''),
    true,
    now()
  )
  on conflict(expo_push_token) do update
  set user_id=excluded.user_id,
      device_id=excluded.device_id,
      platform=excluded.platform,
      app_version=excluded.app_version,
      enabled=true,
      updated_at=now(),
      last_seen_at=now()
  returning id into v_id;

  update public.user_notifications
  set push_attempted_at=null,push_sent_at=null,push_error=null,updated_at=now()
  where user_id=v_user
    and archived_at is null
    and read_at is null
    and deliver_at between now()-interval '24 hours' and now()
    and (push_sent_at is null or push_error is not null);

  update public.user_notifications
  set push_attempted_at=coalesce(push_attempted_at,now()),
      push_error=coalesce(push_error,'Telefon bildirimi için 24 saatlik gönderim süresi geçti'),
      updated_at=now()
  where user_id=v_user
    and archived_at is null
    and read_at is null
    and deliver_at<now()-interval '24 hours'
    and push_sent_at is null;

  perform public.notification_dispatch_due_pushes(120);
  return jsonb_build_object('id',v_id,'registered',true,'retried_recent_notifications',true);
end;
$$;

create or replace function public.notification_send_push(p_notification_id uuid)
returns integer
language plpgsql
security definer
set search_path=public,net
as $$
declare
  v_notification public.user_notifications%rowtype;
  v_sound text:='garage_chime';
  v_push_enabled boolean:=true;
  v_sound_file text;
  v_channel_id text;
  v_badge integer:=1;
  v_payload jsonb;
  v_data jsonb;
  v_count integer:=0;
  v_request_id bigint;
  v_token record;
begin
  select * into v_notification from public.user_notifications where id=p_notification_id for update;
  if not found or v_notification.archived_at is not null or v_notification.read_at is not null or v_notification.deliver_at>now()+interval '5 seconds' or v_notification.push_sent_at is not null then return 0; end if;
  select coalesce(p.notification_sound,'garage_chime'),coalesce(p.push_notifications_enabled,true)
  into v_sound,v_push_enabled from public.notification_preferences p where p.user_id=v_notification.user_id;
  if not v_push_enabled then
    update public.user_notifications set push_attempted_at=now(),push_error='Push bildirimleri kullanıcı tarafından kapatıldı' where id=p_notification_id;
    return 0;
  end if;
  select count(*)::integer into v_badge from public.user_notifications
  where user_id=v_notification.user_id and archived_at is null and read_at is null and deliver_at<=now();
  v_sound_file:=public.notification_sound_file(v_sound,v_notification.category);
  v_channel_id:=public.notification_channel_id(v_sound,v_notification.category);
  v_data:=coalesce(v_notification.data,'{}'::jsonb)||jsonb_build_object(
    'source','draborngarage','notificationId',v_notification.id,'notification_id',v_notification.id,
    'notificationType',v_notification.notification_type,'notification_type',v_notification.notification_type,
    'entityId',v_notification.entity_id,'entity_id',v_notification.entity_id,
    'workshopId',v_notification.workshop_id,'workshop_id',v_notification.workshop_id,
    'targetTab',v_notification.data->>'target_tab','targetSection',v_notification.data->>'target_section'
  );
  for v_token in select id,expo_push_token from public.notification_push_tokens where user_id=v_notification.user_id and enabled loop
    v_payload:=jsonb_build_object(
      'to',v_token.expo_push_token,'title',v_notification.title,'body',v_notification.body,
      'priority',case when v_notification.priority in ('urgent','high') then 'high' else 'default' end,
      'badge',greatest(v_badge,1),'channelId',v_channel_id,'data',v_data,'ttl',86400
    );
    if v_sound_file is not null then v_payload:=v_payload||jsonb_build_object('sound',v_sound_file); end if;
    v_request_id:=net.http_post(
      url:='https://exp.host/--/api/v2/push/send',
      headers:=jsonb_build_object('Content-Type','application/json','Accept','application/json','Accept-Encoding','gzip, deflate'),
      body:=v_payload,timeout_milliseconds:=5000
    );
    insert into public.notification_push_requests(request_id,notification_id,token_id)
    values(v_request_id,p_notification_id,v_token.id) on conflict(request_id) do nothing;
    v_count:=v_count+1;
  end loop;
  update public.user_notifications set push_attempted_at=now(),
    push_error=case when v_count>0 then 'Expo teslim yanıtı bekleniyor' else 'Kayıtlı Expo push cihazı bulunamadı' end
  where id=p_notification_id;
  return v_count;
exception when others then
  update public.user_notifications set push_attempted_at=now(),push_error=left(sqlerrm,500) where id=p_notification_id;
  return 0;
end;
$$;

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
  v_user uuid:=auth.uid();
  v_sound text;
begin
  if v_user is null then raise exception 'Oturum gerekli'; end if;
  v_sound:=case when p_notification_sound=any(array[
    'system_loud','garage_chime','garage_pulse','garage_alert','garage_bell',
    'garage_siren','garage_turbo','garage_metal','garage_digital','garage_retro','silent'
  ]::text[]) then p_notification_sound else 'system_loud' end;

  insert into public.notification_preferences(
    user_id,local_notifications_enabled,service_updates,appointment_reminders,
    appointment_reminder_24h,appointment_reminder_2h,payment_updates,
    receivable_reminders,platform_reminders,customer_link_updates,
    notification_sound,push_notifications_enabled
  ) values(
    v_user,coalesce(p_local_notifications_enabled,true),coalesce(p_service_updates,true),
    coalesce(p_appointment_reminders,true),coalesce(p_appointment_reminder_24h,true),
    coalesce(p_appointment_reminder_2h,true),coalesce(p_payment_updates,true),
    coalesce(p_receivable_reminders,true),coalesce(p_platform_reminders,true),
    coalesce(p_customer_link_updates,true),v_sound,coalesce(p_push_notifications_enabled,true)
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
    update public.user_notifications set archived_at=now(),updated_at=now()
    where user_id=v_user and category='appointments' and deliver_at>now() and archived_at is null;
  end if;
  if not coalesce(p_receivable_reminders,true) then
    update public.user_notifications set archived_at=now(),updated_at=now()
    where user_id=v_user and category='receivables' and deliver_at>now() and archived_at is null;
  end if;
  if not coalesce(p_platform_reminders,true) then
    update public.user_notifications set archived_at=now(),updated_at=now()
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
    ) from public.notification_preferences where user_id=v_user
  );
end;
$$;

create or replace function public.notification_channel_id(p_sound text,p_category text)
returns text
language sql
immutable
set search_path=public
as $$
select case
when p_sound='turkish_voice' and p_category='appointments' then 'draborngarage-voice-appointment-v9'
when p_sound='turkish_voice' and p_category='customer_links' then 'draborngarage-voice-customer-link-v9'
when p_sound='turkish_voice' and p_category='service' then 'draborngarage-voice-service-v9'
when p_sound='turkish_voice' and p_category in ('payments','receivables','platform') then 'draborngarage-voice-payment-v9'
when p_sound='turkish_voice' then 'draborngarage-voice-generic-v9'
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

commit;
