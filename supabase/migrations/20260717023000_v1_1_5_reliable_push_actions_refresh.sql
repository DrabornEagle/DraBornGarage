-- DraBornGarage v1.1.5
-- Reliable Expo push receipt tracking, Turkish voice channels, five-minute
-- appointment action reminders and insert-time work-order timestamps.
begin;

alter table public.notification_preferences drop constraint if exists notification_preferences_sound_check;
alter table public.notification_preferences add constraint notification_preferences_sound_check
check (notification_sound = any (array[
  'system_loud','garage_chime','garage_pulse','garage_alert','garage_bell',
  'garage_siren','garage_turbo','garage_metal','garage_digital','garage_retro',
  'turkish_voice','silent'
]::text[]));

create or replace function public.notification_channel_id(p_sound text, p_category text)
returns text
language sql
immutable
set search_path=public
as $$
  select case
    when p_sound = 'turkish_voice' and p_category = 'appointments' then 'draborngarage-voice-appointment-v8'
    when p_sound = 'turkish_voice' and p_category = 'customer_links' then 'draborngarage-voice-customer-link-v8'
    when p_sound = 'turkish_voice' and p_category = 'service' then 'draborngarage-voice-service-v8'
    when p_sound = 'turkish_voice' and p_category in ('payments','receivables','platform') then 'draborngarage-voice-payment-v8'
    when p_sound = 'turkish_voice' then 'draborngarage-voice-generic-v8'
    when p_sound = 'garage_chime' then 'draborngarage-appointment-chime-v7'
    when p_sound = 'garage_pulse' then 'draborngarage-workshop-pulse-v7'
    when p_sound = 'garage_alert' then 'draborngarage-urgent-alert-v7'
    when p_sound = 'garage_bell' then 'draborngarage-classic-bell-v7'
    when p_sound = 'garage_siren' then 'draborngarage-siren-v7'
    when p_sound = 'garage_turbo' then 'draborngarage-turbo-v7'
    when p_sound = 'garage_metal' then 'draborngarage-metal-v7'
    when p_sound = 'garage_digital' then 'draborngarage-digital-v7'
    when p_sound = 'garage_retro' then 'draborngarage-retro-v7'
    when p_sound = 'silent' then 'draborngarage-silent-v7'
    else 'draborngarage-system-default-v7'
  end;
$$;

create or replace function public.notification_channel_id(p_sound text)
returns text
language sql
immutable
set search_path=public
as $$ select public.notification_channel_id(p_sound,null); $$;

create or replace function public.notification_sound_file(p_sound text, p_category text)
returns text
language sql
immutable
set search_path=public
as $$
  select case
    when p_sound = 'turkish_voice' and p_category = 'appointments' then 'garage_voice_appointment.wav'
    when p_sound = 'turkish_voice' and p_category = 'customer_links' then 'garage_voice_customer_link.wav'
    when p_sound = 'turkish_voice' and p_category = 'service' then 'garage_voice_service.wav'
    when p_sound = 'turkish_voice' and p_category in ('payments','receivables','platform') then 'garage_voice_payment.wav'
    when p_sound = 'turkish_voice' then 'garage_voice_generic.wav'
    when p_sound = 'garage_chime' then 'garage_chime.wav'
    when p_sound = 'garage_pulse' then 'garage_pulse.wav'
    when p_sound = 'garage_alert' then 'garage_alert.wav'
    when p_sound = 'garage_bell' then 'garage_bell.wav'
    when p_sound = 'garage_siren' then 'garage_siren.wav'
    when p_sound = 'garage_turbo' then 'garage_turbo.wav'
    when p_sound = 'garage_metal' then 'garage_metal.wav'
    when p_sound = 'garage_digital' then 'garage_digital.wav'
    when p_sound = 'garage_retro' then 'garage_retro.wav'
    when p_sound = 'silent' then null
    else 'default'
  end;
$$;

create or replace function public.notification_sound_file(p_sound text)
returns text
language sql
immutable
set search_path=public
as $$ select public.notification_sound_file(p_sound,null); $$;

create table if not exists public.notification_push_requests (
  request_id bigint primary key,
  notification_id uuid not null references public.user_notifications(id) on delete cascade,
  token_id uuid references public.notification_push_tokens(id) on delete set null,
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  status text not null default 'pending' check (status in ('pending','ok','error')),
  expo_ticket_id text,
  error_code text,
  error_message text,
  response jsonb
);

create index if not exists notification_push_requests_pending_idx
on public.notification_push_requests(processed_at,requested_at)
where processed_at is null;
create index if not exists notification_push_requests_notification_idx
on public.notification_push_requests(notification_id,requested_at desc);

alter table public.notification_push_requests enable row level security;
revoke all on table public.notification_push_requests from public,anon,authenticated;

create or replace function public.notification_send_push(p_notification_id uuid)
returns integer
language plpgsql
security definer
set search_path=public,net
as $$
declare
  v_notification public.user_notifications%rowtype;
  v_sound text := 'garage_chime';
  v_push_enabled boolean := true;
  v_sound_file text;
  v_channel_id text;
  v_badge integer := 1;
  v_payload jsonb;
  v_data jsonb;
  v_count integer := 0;
  v_request_id bigint;
  v_token record;
begin
  select * into v_notification
  from public.user_notifications
  where id = p_notification_id
  for update;

  if not found
     or v_notification.archived_at is not null
     or v_notification.read_at is not null
     or v_notification.deliver_at > now() + interval '5 seconds'
     or v_notification.push_sent_at is not null then
    return 0;
  end if;

  select coalesce(p.notification_sound,'garage_chime'),coalesce(p.push_notifications_enabled,true)
  into v_sound,v_push_enabled
  from public.notification_preferences p
  where p.user_id = v_notification.user_id;

  if not v_push_enabled then
    update public.user_notifications
    set push_attempted_at=now(),push_error='Push bildirimleri kullanıcı tarafından kapatıldı'
    where id=p_notification_id;
    return 0;
  end if;

  select count(*)::integer into v_badge
  from public.user_notifications
  where user_id=v_notification.user_id
    and archived_at is null and read_at is null and deliver_at<=now();

  v_sound_file:=public.notification_sound_file(v_sound,v_notification.category);
  v_channel_id:=public.notification_channel_id(v_sound,v_notification.category);
  v_data:=coalesce(v_notification.data,'{}'::jsonb)||jsonb_build_object(
    'source','draborngarage',
    'notificationId',v_notification.id,
    'notification_id',v_notification.id,
    'notificationType',v_notification.notification_type,
    'notification_type',v_notification.notification_type,
    'entityId',v_notification.entity_id,
    'entity_id',v_notification.entity_id,
    'workshopId',v_notification.workshop_id,
    'workshop_id',v_notification.workshop_id,
    'targetTab',v_notification.data->>'target_tab',
    'targetSection',v_notification.data->>'target_section'
  );

  for v_token in
    select id,expo_push_token
    from public.notification_push_tokens
    where user_id=v_notification.user_id and enabled
  loop
    v_payload:=jsonb_build_object(
      'to',v_token.expo_push_token,
      'title',v_notification.title,
      'body',v_notification.body,
      'priority',case when v_notification.priority in ('urgent','high') then 'high' else 'default' end,
      'badge',greatest(v_badge,1),
      'channelId',v_channel_id,
      'data',v_data,
      'ttl',86400
    );
    if v_sound_file is not null then
      v_payload:=v_payload||jsonb_build_object('sound',v_sound_file);
    end if;

    v_request_id:=net.http_post(
      url:='https://exp.host/--/api/v2/push/send',
      headers:=jsonb_build_object('Content-Type','application/json','Accept','application/json','Accept-Encoding','gzip, deflate'),
      body:=v_payload,
      timeout_milliseconds:=5000
    );

    insert into public.notification_push_requests(request_id,notification_id,token_id)
    values(v_request_id,p_notification_id,v_token.id)
    on conflict(request_id) do nothing;
    v_count:=v_count+1;
  end loop;

  update public.user_notifications
  set push_attempted_at=now(),
      push_error=case when v_count>0 then 'Expo teslim yanıtı bekleniyor' else 'Kayıtlı Expo push cihazı bulunamadı' end
  where id=p_notification_id;
  return v_count;
exception when others then
  update public.user_notifications
  set push_attempted_at=now(),push_error=left(sqlerrm,500)
  where id=p_notification_id;
  return 0;
end;
$$;

create or replace function public.notification_reconcile_push_requests(p_limit integer default 250)
returns integer
language plpgsql
security definer
set search_path=public,net
as $$
declare
  r record;
  v_payload jsonb;
  v_ticket jsonb;
  v_status text;
  v_error_code text;
  v_error_message text;
  v_processed integer:=0;
begin
  for r in
    select q.request_id,q.notification_id,h.status_code,h.content
    from public.notification_push_requests q
    join net._http_response h on h.id=q.request_id
    where q.processed_at is null
    order by q.requested_at
    limit greatest(1,least(coalesce(p_limit,250),1000))
  loop
    v_payload:=null;v_ticket:=null;v_status:='error';v_error_code:=null;v_error_message:=null;
    begin
      v_payload:=r.content::jsonb;
      v_ticket:=v_payload->'data';
      if jsonb_typeof(v_ticket)='array' then v_ticket:=v_ticket->0; end if;
      if r.status_code between 200 and 299 and v_ticket->>'status'='ok' then
        v_status:='ok';
      else
        v_error_code:=coalesce(v_ticket#>>'{details,error}',v_ticket->>'status','HTTP_'||r.status_code::text);
        v_error_message:=coalesce(v_ticket->>'message',v_payload->>'message','Expo push teslimatı başarısız');
      end if;
    exception when others then
      v_error_code:='INVALID_RESPONSE';
      v_error_message:=left(sqlerrm,500);
    end;

    update public.notification_push_requests
    set processed_at=now(),status=v_status,
        expo_ticket_id=case when v_status='ok' then v_ticket->>'id' else null end,
        error_code=v_error_code,error_message=v_error_message,response=v_payload
    where request_id=r.request_id;

    if v_status='ok' then
      update public.user_notifications
      set push_sent_at=coalesce(push_sent_at,now()),push_error=null
      where id=r.notification_id;
    elsif not exists(
      select 1 from public.notification_push_requests q
      where q.notification_id=r.notification_id and q.status='ok'
    ) then
      update public.user_notifications
      set push_error=left(concat_ws(' • ',v_error_code,v_error_message),500)
      where id=r.notification_id and push_sent_at is null;
    end if;
    v_processed:=v_processed+1;
  end loop;
  return v_processed;
end;
$$;

create or replace function public.notification_dispatch_due_pushes(p_limit integer default 120)
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare v_row record;v_total integer:=0;
begin
  perform public.notification_reconcile_push_requests(250);
  for v_row in
    select id from public.user_notifications
    where archived_at is null
      and read_at is null
      and deliver_at<=now()
      and deliver_at>=now()-interval '24 hours'
      and push_sent_at is null
      and (push_attempted_at is null or push_attempted_at<now()-interval '30 minutes')
    order by priority desc,deliver_at
    limit greatest(1,least(coalesce(p_limit,120),500))
  loop
    v_total:=v_total+public.notification_send_push(v_row.id);
  end loop;
  return v_total;
end;
$$;

create or replace function public.notification_get_push_health()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare v_user uuid:=auth.uid();r record;
begin
  if v_user is null then raise exception 'Oturum gerekli'; end if;
  select q.status,q.error_code,q.error_message,q.requested_at,q.processed_at
  into r
  from public.notification_push_requests q
  join public.user_notifications n on n.id=q.notification_id
  where n.user_id=v_user
  order by q.requested_at desc
  limit 1;
  if not found then return jsonb_build_object('status','unknown'); end if;
  return jsonb_build_object(
    'status',r.status,'error_code',r.error_code,'error_message',r.error_message,
    'requested_at',r.requested_at,'processed_at',r.processed_at
  );
end;
$$;

revoke all on function public.notification_get_push_health() from public,anon;
grant execute on function public.notification_get_push_health() to authenticated;

create or replace function public.notification_enqueue_pending_appointment_actions()
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare
  r record;
  v_count integer:=0;
  v_bucket bigint:=floor(extract(epoch from now())/300)::bigint;
  v_body text;
begin
  for r in
    select a.id,a.workshop_id,a.mechanic_id,a.scheduled_start,a.service_title,
           coalesce(w.timezone,'Europe/Istanbul') as timezone,
           c.full_name as customer_name,m.brand,m.model,m.plate
    from public.appointments a
    join public.workshops w on w.id=a.workshop_id
    join public.customers c on c.id=a.customer_id
    join public.motorcycles m on m.id=a.motorcycle_id
    where a.status='pending'
      and a.source='customer'
      and a.mechanic_id is not null
      and a.created_at<=now()-interval '4 minutes 30 seconds'
      and a.scheduled_start>now()-interval '2 hours'
  loop
    v_body:=format('%s • %s %s%s • %s • %s',
      r.customer_name,r.brand,r.model,
      case when r.plate is null then '' else ' • '||r.plate end,
      r.service_title,
      to_char(r.scheduled_start at time zone r.timezone,'DD.MM.YYYY HH24:MI')
    );
    if public.enqueue_user_notification(
      r.mechanic_id,r.workshop_id,'appointments','appointment_action_required',
      'Randevu onayı bekliyor',v_body,'urgent','appointment',r.id,
      jsonb_build_object(
        'target_tab','appointments','appointment_id',r.id,
        'scheduled_start',r.scheduled_start,'action_required',true
      ),
      r.mechanic_id::text||':appointment:'||r.id::text||':action:'||v_bucket::text,
      now(),null,'appointment_action'
    ) is not null then v_count:=v_count+1; end if;
  end loop;
  return v_count;
end;
$$;

create or replace function public.notification_archive_appointment_actions()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if old.status='pending' and new.status<>'pending' then
    update public.user_notifications
    set archived_at=coalesce(archived_at,now())
    where entity_type='appointment'
      and entity_id=new.id
      and notification_type='appointment_action_required'
      and archived_at is null;
  end if;
  return new;
end;
$$;

drop trigger if exists appointment_action_notifications_after_status on public.appointments;
create trigger appointment_action_notifications_after_status
after update of status on public.appointments
for each row execute function public.notification_archive_appointment_actions();

create or replace function public.set_work_order_timestamps()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if tg_op='INSERT' then
    if new.status in ('repair_started'::public.work_order_status,'in_progress'::public.work_order_status)
       and new.started_at is null then
      new.started_at=now();
    end if;
    if new.status='testing'::public.work_order_status and new.testing_started_at is null then
      new.testing_started_at=now();
    end if;
    if new.status in ('ready'::public.work_order_status,'completed'::public.work_order_status) then
      new.ready_at=coalesce(new.ready_at,now());
      new.completed_at=coalesce(new.completed_at,now());
    end if;
    if new.status='delivered'::public.work_order_status and new.delivered_at is null then
      new.delivered_at=now();
    end if;
    new.queue_updated_at=coalesce(new.queue_updated_at,now());
    return new;
  end if;

  if new.status in ('repair_started'::public.work_order_status,'in_progress'::public.work_order_status)
     and old.status is distinct from new.status and new.started_at is null then
    new.started_at=now();
  end if;
  if new.status='testing'::public.work_order_status
     and old.status is distinct from new.status and new.testing_started_at is null then
    new.testing_started_at=now();
  end if;
  if new.status in ('ready'::public.work_order_status,'completed'::public.work_order_status)
     and old.status is distinct from new.status then
    new.ready_at=coalesce(new.ready_at,now());
    new.completed_at=coalesce(new.completed_at,now());
  end if;
  if new.status='delivered'::public.work_order_status
     and old.status is distinct from new.status and new.delivered_at is null then
    new.delivered_at=now();
  end if;
  if old.status is distinct from new.status then
    new.queue_updated_at=now();
  end if;
  return new;
end;
$$;

drop trigger if exists work_order_status_timestamps_insert on public.work_orders;
create trigger work_order_status_timestamps_insert
before insert on public.work_orders
for each row execute function public.set_work_order_timestamps();

-- Replace the recurring jobs idempotently.
do $$
declare r record;
begin
  for r in select jobid from cron.job where jobname in (
    'draborngarage-push-reconcile','draborngarage-appointment-action-reminders'
  ) loop
    perform cron.unschedule(r.jobid);
  end loop;
end;
$$;

select cron.schedule(
  'draborngarage-push-reconcile','* * * * *',
  $job$select public.notification_reconcile_push_requests(250);$job$
);
select cron.schedule(
  'draborngarage-appointment-action-reminders','* * * * *',
  $job$select public.notification_enqueue_pending_appointment_actions();$job$
);

select public.notification_enqueue_pending_appointment_actions();

revoke all on function public.notification_reconcile_push_requests(integer) from public,anon,authenticated;
revoke all on function public.notification_enqueue_pending_appointment_actions() from public,anon,authenticated;
revoke all on function public.notification_send_push(uuid) from public,anon,authenticated;

commit;
