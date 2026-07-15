-- DraBornGarage v1.0.7 phone notification delivery hardening

create or replace function public.notification_dispatch_due_pushes(p_limit integer default 120)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_row record; v_total integer := 0;
begin
  for v_row in
    select id from public.user_notifications
    where archived_at is null
      and read_at is null
      and deliver_at <= now()
      and deliver_at >= now() - interval '24 hours'
      and push_sent_at is null
      and (push_attempted_at is null or push_attempted_at < now() - interval '15 minutes')
    order by priority desc, deliver_at
    limit greatest(1,least(coalesce(p_limit,120),500))
  loop
    v_total := v_total + public.notification_send_push(v_row.id);
  end loop;
  return v_total;
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
  if p_expo_push_token is null or p_expo_push_token !~ '^Expo(nent)?PushToken\[[^]]+\]$' then
    raise exception 'Geçersiz Expo push tokenı';
  end if;

  if nullif(trim(p_device_id), '') is not null then
    update public.notification_push_tokens
       set enabled=false, updated_at=now()
     where user_id=v_user and device_id=trim(p_device_id) and expo_push_token<>trim(p_expo_push_token);
  end if;

  insert into public.notification_push_tokens(user_id,expo_push_token,device_id,platform,app_version,enabled,last_seen_at)
  values(
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
  set push_attempted_at=null, push_sent_at=null, push_error=null, updated_at=now()
  where user_id=v_user
    and archived_at is null
    and read_at is null
    and deliver_at between now() - interval '24 hours' and now()
    and (push_sent_at is null or push_error is not null);

  update public.user_notifications
  set push_attempted_at=coalesce(push_attempted_at,now()),
      push_error=coalesce(push_error,'Telefon bildirimi için 24 saatlik gönderim süresi geçti'),
      updated_at=now()
  where user_id=v_user
    and archived_at is null
    and read_at is null
    and deliver_at < now() - interval '24 hours'
    and push_sent_at is null;

  perform public.notification_dispatch_due_pushes(120);
  return jsonb_build_object('id',v_id,'registered',true,'retried_recent_notifications',true);
end;
$$;

grant execute on function public.notification_dispatch_due_pushes(integer) to authenticated;
grant execute on function public.notification_register_push_token(text,text,text,text) to authenticated;
