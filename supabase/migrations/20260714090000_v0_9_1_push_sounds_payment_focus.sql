-- DraBornGarage v0.8.17
-- Custom notification sound preferences, Expo push delivery and direct Admin payment approval focus.

create extension if not exists pg_net;
create extension if not exists pg_cron;

alter table public.notification_preferences
  add column if not exists notification_sound text not null default 'garage_chime',
  add column if not exists push_notifications_enabled boolean not null default true;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'notification_preferences_sound_check'
      and conrelid = 'public.notification_preferences'::regclass
  ) then
    alter table public.notification_preferences
      add constraint notification_preferences_sound_check
      check (notification_sound in ('garage_chime','garage_pulse','garage_alert','silent'));
  end if;
end;
$$;

alter table public.user_notifications
  add column if not exists push_attempted_at timestamptz,
  add column if not exists push_sent_at timestamptz,
  add column if not exists push_error text;

create table if not exists public.notification_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null unique,
  device_id text,
  platform text not null default 'unknown' check (platform in ('android','ios','unknown')),
  app_version text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists notification_push_tokens_user_enabled_idx
  on public.notification_push_tokens(user_id, enabled);

alter table public.notification_push_tokens enable row level security;

drop policy if exists notification_push_tokens_select_own on public.notification_push_tokens;
create policy notification_push_tokens_select_own
on public.notification_push_tokens for select
to authenticated
using (user_id = auth.uid());

drop policy if exists notification_push_tokens_insert_own on public.notification_push_tokens;
create policy notification_push_tokens_insert_own
on public.notification_push_tokens for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists notification_push_tokens_update_own on public.notification_push_tokens;
create policy notification_push_tokens_update_own
on public.notification_push_tokens for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists notification_push_tokens_delete_own on public.notification_push_tokens;
create policy notification_push_tokens_delete_own
on public.notification_push_tokens for delete
to authenticated
using (user_id = auth.uid());

create or replace function public.notification_sound_file(p_sound text)
returns text
language sql
immutable
as $$
  select case p_sound
    when 'garage_pulse' then 'garage_pulse.wav'
    when 'garage_alert' then 'garage_alert.wav'
    when 'silent' then null
    else 'garage_chime.wav'
  end;
$$;

create or replace function public.notification_channel_id(p_sound text)
returns text
language sql
immutable
as $$
  select case p_sound
    when 'garage_pulse' then 'draborngarage-pulse-v1'
    when 'garage_alert' then 'draborngarage-alert-v1'
    when 'silent' then 'draborngarage-silent-v1'
    else 'draborngarage-chime-v1'
  end;
$$;

create or replace function public.notification_send_push(p_notification_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
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

  select coalesce(p.notification_sound, 'garage_chime'), coalesce(p.push_notifications_enabled, true)
  into v_sound, v_push_enabled
  from public.notification_preferences p
  where p.user_id = v_notification.user_id;

  if not v_push_enabled then
    update public.user_notifications
    set push_attempted_at = now(), push_error = 'Push bildirimleri kullanıcı tarafından kapatıldı'
    where id = p_notification_id;
    return 0;
  end if;

  select count(*)::integer into v_badge
  from public.user_notifications
  where user_id = v_notification.user_id
    and archived_at is null
    and read_at is null
    and deliver_at <= now();

  v_sound_file := public.notification_sound_file(v_sound);
  v_channel_id := public.notification_channel_id(v_sound);
  v_data := coalesce(v_notification.data, '{}'::jsonb) || jsonb_build_object(
    'source', 'draborngarage',
    'notificationId', v_notification.id,
    'notification_id', v_notification.id,
    'notificationType', v_notification.notification_type,
    'notification_type', v_notification.notification_type,
    'entityId', v_notification.entity_id,
    'entity_id', v_notification.entity_id,
    'workshopId', v_notification.workshop_id,
    'workshop_id', v_notification.workshop_id,
    'targetTab', v_notification.data->>'target_tab',
    'targetSection', v_notification.data->>'target_section'
  );

  for v_token in
    select expo_push_token
    from public.notification_push_tokens
    where user_id = v_notification.user_id and enabled
  loop
    v_payload := jsonb_build_object(
      'to', v_token.expo_push_token,
      'title', v_notification.title,
      'body', v_notification.body,
      'priority', case when v_notification.priority in ('urgent','high') then 'high' else 'default' end,
      'badge', greatest(v_badge, 1),
      'channelId', v_channel_id,
      'data', v_data,
      'ttl', 86400
    );
    if v_sound_file is not null then
      v_payload := v_payload || jsonb_build_object('sound', v_sound_file);
    end if;

    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Accept', 'application/json',
        'Accept-Encoding', 'gzip, deflate'
      ),
      body := v_payload,
      timeout_milliseconds := 5000
    );
    v_count := v_count + 1;
  end loop;

  update public.user_notifications
  set push_attempted_at = now(),
      push_sent_at = case when v_count > 0 then now() else push_sent_at end,
      push_error = case when v_count > 0 then null else 'Kayıtlı Expo push cihazı bulunamadı' end
  where id = p_notification_id;

  return v_count;
exception when others then
  update public.user_notifications
  set push_attempted_at = now(), push_error = left(sqlerrm, 500)
  where id = p_notification_id;
  return 0;
end;
$$;

create or replace function public.notification_dispatch_due_pushes(p_limit integer default 120)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_total integer := 0;
begin
  for v_row in
    select id
    from public.user_notifications
    where archived_at is null
      and read_at is null
      and deliver_at <= now()
      and push_sent_at is null
      and (push_attempted_at is null or push_attempted_at < now() - interval '15 minutes')
    order by priority desc, deliver_at
    limit greatest(1, least(coalesce(p_limit, 120), 500))
  loop
    v_total := v_total + public.notification_send_push(v_row.id);
  end loop;
  return v_total;
end;
$$;

create or replace function public.notification_dispatch_push_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.deliver_at <= now() + interval '5 seconds' then
    perform public.notification_send_push(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists user_notifications_push_after_insert on public.user_notifications;
create trigger user_notifications_push_after_insert
after insert on public.user_notifications
for each row execute function public.notification_dispatch_push_after_insert();

do $$
declare v_jobid bigint;
begin
  for v_jobid in select jobid from cron.job where jobname = 'draborngarage-push-dispatch' loop
    perform cron.unschedule(v_jobid);
  end loop;
  perform cron.schedule(
    'draborngarage-push-dispatch',
    '* * * * *',
    'select public.notification_dispatch_due_pushes(120);'
  );
exception when others then
  raise notice 'Push cron schedule skipped: %', sqlerrm;
end;
$$;

create or replace function public.notification_register_push_token(
  p_expo_push_token text,
  p_device_id text default null,
  p_platform text default 'unknown',
  p_app_version text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_id uuid;
begin
  if v_user is null then raise exception 'Oturum gerekli'; end if;
  if p_expo_push_token is null or p_expo_push_token !~ '^Expo(nent)?PushToken\\[[^]]+\\]$' then
    raise exception 'Geçersiz Expo push tokenı';
  end if;

  if nullif(trim(p_device_id), '') is not null then
    update public.notification_push_tokens
    set enabled = false, updated_at = now()
    where user_id = v_user
      and device_id = trim(p_device_id)
      and expo_push_token <> trim(p_expo_push_token);
  end if;

  insert into public.notification_push_tokens(user_id, expo_push_token, device_id, platform, app_version, enabled, last_seen_at)
  values (
    v_user,
    trim(p_expo_push_token),
    nullif(trim(p_device_id), ''),
    case when p_platform in ('android','ios') then p_platform else 'unknown' end,
    nullif(trim(p_app_version), ''),
    true,
    now()
  )
  on conflict(expo_push_token) do update set
    user_id = excluded.user_id,
    device_id = excluded.device_id,
    platform = excluded.platform,
    app_version = excluded.app_version,
    enabled = true,
    updated_at = now(),
    last_seen_at = now()
  returning id into v_id;

  perform public.notification_dispatch_due_pushes(40);
  return jsonb_build_object('id', v_id, 'registered', true);
end;
$$;

create or replace function public.notification_disable_push_token(p_expo_push_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notification_push_tokens
  set enabled = false, updated_at = now()
  where user_id = auth.uid() and expo_push_token = p_expo_push_token;
end;
$$;

drop function if exists public.notification_update_preferences(boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean,boolean);
create function public.notification_update_preferences(
  p_local_notifications_enabled boolean,
  p_service_updates boolean,
  p_appointment_reminders boolean,
  p_appointment_reminder_24h boolean,
  p_appointment_reminder_2h boolean,
  p_payment_updates boolean,
  p_receivable_reminders boolean,
  p_platform_reminders boolean,
  p_customer_link_updates boolean,
  p_notification_sound text default 'garage_chime',
  p_push_notifications_enabled boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_user uuid := auth.uid(); v_sound text;
begin
  if v_user is null then raise exception 'Oturum gerekli'; end if;
  v_sound := case when p_notification_sound in ('garage_chime','garage_pulse','garage_alert','silent') then p_notification_sound else 'garage_chime' end;

  insert into public.notification_preferences(
    user_id, local_notifications_enabled, service_updates, appointment_reminders,
    appointment_reminder_24h, appointment_reminder_2h, payment_updates, receivable_reminders,
    platform_reminders, customer_link_updates, notification_sound, push_notifications_enabled
  ) values(
    v_user, coalesce(p_local_notifications_enabled,true), coalesce(p_service_updates,true), coalesce(p_appointment_reminders,true),
    coalesce(p_appointment_reminder_24h,true), coalesce(p_appointment_reminder_2h,true), coalesce(p_payment_updates,true), coalesce(p_receivable_reminders,true),
    coalesce(p_platform_reminders,true), coalesce(p_customer_link_updates,true), v_sound, coalesce(p_push_notifications_enabled,true)
  )
  on conflict(user_id) do update set
    local_notifications_enabled = excluded.local_notifications_enabled,
    service_updates = excluded.service_updates,
    appointment_reminders = excluded.appointment_reminders,
    appointment_reminder_24h = excluded.appointment_reminder_24h,
    appointment_reminder_2h = excluded.appointment_reminder_2h,
    payment_updates = excluded.payment_updates,
    receivable_reminders = excluded.receivable_reminders,
    platform_reminders = excluded.platform_reminders,
    customer_link_updates = excluded.customer_link_updates,
    notification_sound = excluded.notification_sound,
    push_notifications_enabled = excluded.push_notifications_enabled,
    updated_at = now();

  if not coalesce(p_appointment_reminders,true) then
    update public.user_notifications set archived_at=now(), updated_at=now()
    where user_id=v_user and category='appointments' and deliver_at>now() and archived_at is null;
  end if;
  if not coalesce(p_receivable_reminders,true) then
    update public.user_notifications set archived_at=now(), updated_at=now()
    where user_id=v_user and category='receivables' and deliver_at>now() and archived_at is null;
  end if;
  if not coalesce(p_platform_reminders,true) then
    update public.user_notifications set archived_at=now(), updated_at=now()
    where user_id=v_user and category='platform' and deliver_at>now() and archived_at is null;
  end if;

  perform public.notification_refresh_reminders();

  return (
    select jsonb_build_object(
      'local_notifications_enabled', local_notifications_enabled,
      'service_updates', service_updates,
      'appointment_reminders', appointment_reminders,
      'appointment_reminder_24h', appointment_reminder_24h,
      'appointment_reminder_2h', appointment_reminder_2h,
      'payment_updates', payment_updates,
      'receivable_reminders', receivable_reminders,
      'platform_reminders', platform_reminders,
      'customer_link_updates', customer_link_updates,
      'notification_sound', notification_sound,
      'push_notifications_enabled', push_notifications_enabled,
      'updated_at', updated_at
    ) from public.notification_preferences where user_id=v_user
  );
end;
$$;

create or replace function public.notification_get_center(p_limit integer default 100)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_preferences jsonb;
  v_feed jsonb;
  v_upcoming jsonb;
  v_counts jsonb;
  v_unread integer;
  v_upcoming_count integer;
begin
  if v_user is null then raise exception 'Oturum gerekli'; end if;
  if p_limit is null or p_limit < 1 or p_limit > 250 then p_limit := 100; end if;

  insert into public.notification_preferences(user_id) values(v_user) on conflict(user_id) do nothing;
  perform public.notification_refresh_reminders();

  select jsonb_build_object(
    'local_notifications_enabled', local_notifications_enabled,
    'service_updates', service_updates,
    'appointment_reminders', appointment_reminders,
    'appointment_reminder_24h', appointment_reminder_24h,
    'appointment_reminder_2h', appointment_reminder_2h,
    'payment_updates', payment_updates,
    'receivable_reminders', receivable_reminders,
    'platform_reminders', platform_reminders,
    'customer_link_updates', customer_link_updates,
    'notification_sound', notification_sound,
    'push_notifications_enabled', push_notifications_enabled,
    'updated_at', updated_at
  ) into v_preferences
  from public.notification_preferences where user_id=v_user;

  select count(*)::integer into v_unread
  from public.user_notifications
  where user_id=v_user and archived_at is null and read_at is null and deliver_at<=now();

  select count(*)::integer into v_upcoming_count
  from public.user_notifications
  where user_id=v_user and archived_at is null and deliver_at>now();

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',n.id,
    'workshop_id',n.workshop_id,
    'workshop_name',w.name,
    'category',n.category,
    'notification_type',n.notification_type,
    'priority',n.priority,
    'entity_type',n.entity_type,
    'entity_id',n.entity_id,
    'title',n.title,
    'body',n.body,
    'data',n.data,
    'deliver_at',n.deliver_at,
    'read_at',n.read_at,
    'created_at',n.created_at
  ) order by case n.priority when 'urgent' then 1 when 'high' then 2 when 'normal' then 3 else 4 end,n.deliver_at desc),'[]'::jsonb)
  into v_feed
  from (
    select * from public.user_notifications
    where user_id=v_user and archived_at is null and deliver_at<=now()
    order by case priority when 'urgent' then 1 when 'high' then 2 when 'normal' then 3 else 4 end,deliver_at desc
    limit p_limit
  ) n
  left join public.workshops w on w.id=n.workshop_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',n.id,
    'workshop_id',n.workshop_id,
    'workshop_name',w.name,
    'category',n.category,
    'notification_type',n.notification_type,
    'priority',n.priority,
    'entity_type',n.entity_type,
    'entity_id',n.entity_id,
    'title',n.title,
    'body',n.body,
    'data',n.data,
    'deliver_at',n.deliver_at,
    'read_at',n.read_at,
    'created_at',n.created_at
  ) order by n.deliver_at),'[]'::jsonb)
  into v_upcoming
  from (
    select * from public.user_notifications
    where user_id=v_user and archived_at is null and deliver_at>now()
    order by deliver_at
    limit 80
  ) n
  left join public.workshops w on w.id=n.workshop_id;

  select coalesce(jsonb_object_agg(category,total),'{}'::jsonb)
  into v_counts
  from (
    select category,count(*)::integer as total
    from public.user_notifications
    where user_id=v_user and archived_at is null and read_at is null and deliver_at<=now()
    group by category
  ) q;

  return jsonb_build_object(
    'notifications',coalesce(v_feed,'[]'::jsonb),
    'upcoming',coalesce(v_upcoming,'[]'::jsonb),
    'preferences',coalesce(v_preferences,'{}'::jsonb),
    'unread_count',coalesce(v_unread,0),
    'upcoming_count',coalesce(v_upcoming_count,0),
    'category_counts',coalesce(v_counts,'{}'::jsonb),
    'server_time',now()
  );
end;
$$;

create or replace function public.notify_platform_report_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_workshop text; v_title text; v_body text; v_type text; x record;
begin
  begin
    select name into v_workshop from public.workshops where id=new.workshop_id;
    if tg_op='INSERT' and new.status='pending' then
      perform public.notify_platform_admins(
        new.workshop_id,
        'platform',
        'platform_payment_reported',
        'İşletmeden ödeme geldi',
        v_workshop||' • ₺'||to_char(new.amount,'FM999999990.00')||' ödeme bildirdi • Admin onayı bekliyor',
        'urgent',
        'platform_payment_report',
        new.id,
        jsonb_build_object(
          'target_tab','team',
          'target_section','platform',
          'target_subsection','paymentReports',
          'payment_report_id',new.id,
          'focus_payment_report_id',new.id,
          'workshop_id',new.workshop_id,
          'amount',new.amount,
          'payment_date',new.payment_date
        ),
        'platform-report:'||new.id||':admins:pending',
        now(),
        new.demo_batch_id,
        null
      );
    elsif tg_op='UPDATE' and old.status is distinct from new.status and new.status in ('approved','rejected','cancelled') then
      v_type:='platform_payment_'||new.status;
      v_title:=case new.status when 'approved' then 'Platform ödemen onaylandı' when 'rejected' then 'Platform ödemen reddedildi' else 'Platform ödeme bildirimi iptal edildi' end;
      v_body:=v_workshop||' • '||to_char(new.amount,'FM999999990.00')||' TL'||case when new.admin_note is null then '' else ' • '||new.admin_note end;
      perform public.enqueue_user_notification(
        new.reported_by,new.workshop_id,'platform',v_type,v_title,v_body,case when new.status='approved' then 'high' else 'urgent' end,
        'platform_payment_report',new.id,jsonb_build_object('target_tab','team','target_section','platform','target_subsection','paymentReports','payment_report_id',new.id,'workshop_id',new.workshop_id,'status',new.status),
        new.reported_by||':platform-report:'||new.id||':'||new.status,now(),new.demo_batch_id,null
      );
      perform public.notify_workshop_owners(
        new.workshop_id,'platform',v_type,v_title,v_body,case when new.status='approved' then 'high' else 'urgent' end,
        'platform_payment_report',new.id,jsonb_build_object('target_tab','team','target_section','platform','target_subsection','paymentReports','payment_report_id',new.id,'workshop_id',new.workshop_id,'status',new.status),
        'platform-report:'||new.id||':'||new.status,now(),new.demo_batch_id,null
      );
    end if;
    for x in select statement_id from public.platform_payment_allocations where payment_report_id=new.id loop
      perform public.notification_schedule_platform_statement(x.statement_id);
    end loop;
  exception when others then raise warning 'DraBornGarage notification platform report trigger skipped: %',sqlerrm;
  end;
  return new;
end;
$$;

update public.user_notifications n
set title = 'İşletmeden ödeme geldi',
    body = w.name||' • ₺'||to_char(r.amount,'FM999999990.00')||' ödeme bildirdi • Admin onayı bekliyor',
    data = coalesce(n.data,'{}'::jsonb) || jsonb_build_object(
      'target_tab','team',
      'target_section','platform',
      'target_subsection','paymentReports',
      'payment_report_id',r.id,
      'focus_payment_report_id',r.id,
      'workshop_id',r.workshop_id,
      'amount',r.amount,
      'payment_date',r.payment_date
    )
from public.platform_payment_reports r
join public.workshops w on w.id=r.workshop_id
where n.notification_type='platform_payment_reported'
  and n.entity_id=r.id
  and n.read_at is null
  and r.status='pending';
