begin;

alter table public.motorcycles
  add column if not exists staff_note text,
  add column if not exists next_service_note text,
  add column if not exists next_service_due_km integer,
  add column if not exists next_service_due_date date;

alter table public.motorcycles
  drop constraint if exists motorcycles_next_service_due_km_check;

alter table public.motorcycles
  add constraint motorcycles_next_service_due_km_check
  check (next_service_due_km is null or next_service_due_km >= 0);

create index if not exists work_orders_motorcycle_arrived_idx
  on public.work_orders (motorcycle_id, arrived_at desc);

create index if not exists work_order_services_order_completed_idx
  on public.work_order_services (work_order_id, completed_at desc);

create or replace function public.notification_channel_id(p_sound text)
returns text
language sql
immutable
as $function$
  select case p_sound
    when 'garage_pulse' then 'draborngarage-pulse-v2'
    when 'garage_alert' then 'draborngarage-alert-v2'
    when 'silent' then 'draborngarage-silent-v2'
    else 'draborngarage-chime-v2'
  end;
$function$;

create or replace function public.notification_register_push_token(
  p_expo_push_token text,
  p_device_id text default null,
  p_platform text default 'unknown',
  p_app_version text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user uuid := auth.uid();
  v_id uuid;
begin
  if v_user is null then
    raise exception 'Oturum gerekli';
  end if;

  if p_expo_push_token is null
     or p_expo_push_token !~ '^Expo(nent)?PushToken\[[^]]+\]$' then
    raise exception 'Geçersiz Expo push tokenı';
  end if;

  if nullif(trim(p_device_id), '') is not null then
    update public.notification_push_tokens
       set enabled = false,
           updated_at = now()
     where user_id = v_user
       and device_id = trim(p_device_id)
       and expo_push_token <> trim(p_expo_push_token);
  end if;

  insert into public.notification_push_tokens(
    user_id,
    expo_push_token,
    device_id,
    platform,
    app_version,
    enabled,
    last_seen_at
  ) values (
    v_user,
    trim(p_expo_push_token),
    nullif(trim(p_device_id), ''),
    case when p_platform in ('android', 'ios') then p_platform else 'unknown' end,
    nullif(trim(p_app_version), ''),
    true,
    now()
  )
  on conflict (expo_push_token) do update
     set user_id = excluded.user_id,
         device_id = excluded.device_id,
         platform = excluded.platform,
         app_version = excluded.app_version,
         enabled = true,
         updated_at = now(),
         last_seen_at = now()
  returning id into v_id;

  -- Cihaz ilk kez kaydolduğunda daha önce "token yok" diye başarısız olan
  -- okunmamış bildirimleri hemen tekrar dağıtılabilir hâle getir.
  update public.user_notifications
     set push_attempted_at = null,
         push_sent_at = null,
         push_error = null,
         updated_at = now()
   where user_id = v_user
     and archived_at is null
     and read_at is null
     and deliver_at <= now()
     and (push_sent_at is null or push_error is not null);

  perform public.notification_dispatch_due_pushes(120);

  return jsonb_build_object(
    'id', v_id,
    'registered', true,
    'retried_due_notifications', true
  );
end;
$function$;

revoke all on function public.notification_register_push_token(text, text, text, text) from public;
grant execute on function public.notification_register_push_token(text, text, text, text) to authenticated;

commit;
