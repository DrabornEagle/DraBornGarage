from pathlib import Path

path = Path('src/notifications/NotificationContextV101.tsx')
text = path.read_text(encoding='utf-8')

def replace_once(old: str, new: str, label: str) -> None:
    global text
    if old not in text:
        if new in text:
            return
        raise SystemExit(f'Patch target missing: {label}')
    text = text.replace(old, new, 1)

replace_once(
    "  const pushStatusRef = useRef<PushRegistrationStatus>('idle');\n  const unreadCountRef = useRef(0);",
    "  const pushStatusRef = useRef<PushRegistrationStatus>('idle');\n  const unreadCountRef = useRef(0);\n  const receivedSystemNotificationIdsRef = useRef<Set<string>>(new Set());",
    'received notification ref',
)

replace_once(
    "  const presentDueNotifications = useCallback(async (items: GarageNotification[], nextPreferences: NotificationPreferences, badge: number) => {\n    if (!session?.user || !nextPreferences.local_notifications_enabled) return;\n    if (!IS_EXPO_GO && pushStatusRef.current === 'registered') return;\n    try {",
    "  const presentDueNotifications = useCallback(async (items: GarageNotification[], nextPreferences: NotificationPreferences, badge: number) => {\n    if (!session?.user || !nextPreferences.local_notifications_enabled) return;\n    try {\n      // Uzaktan push kayıtlıysa önce FCM/Expo bildiriminin gelmesi için kısa süre bekle.\n      // Gelmezse uygulama açıkken yerel Android bildirimi güvenli yedek olarak gösterilir.\n      if (!IS_EXPO_GO && pushStatusRef.current === 'registered') {\n        await new Promise((resolve) => setTimeout(resolve, 1400));\n      }",
    'remove unsafe registered push early return',
)

replace_once(
    "      const due = items.filter((item) => isDue(item) && !item.read_at).slice(0, 12);",
    "      const recentCutoff = Date.now() - 24 * 60 * 60 * 1000;\n      const due = items.filter((item) => {\n        const deliveryTime = new Date(item.deliver_at).getTime();\n        return isDue(item) && !item.read_at && Number.isFinite(deliveryTime) && deliveryTime >= recentCutoff;\n      }).slice(0, 12);",
    'recent due filter',
)

replace_once(
    "      for (const item of due.reverse()) {\n        if (nextDelivered.includes(item.id)) continue;\n        await Notifications.scheduleNotificationAsync({",
    "      for (const item of due.reverse()) {\n        if (nextDelivered.includes(item.id)) continue;\n        if (receivedSystemNotificationIdsRef.current.has(item.id)) {\n          nextDelivered.push(item.id);\n          continue;\n        }\n        await Notifications.scheduleNotificationAsync({",
    'remote/local dedupe',
)

replace_once(
    "  useEffect(() => {\n    mountedRef.current = true;\n    ensureAndroidChannels().catch(() => undefined);\n    Notifications.getPermissionsAsync().then((status) => mountedRef.current && setPermissionStatus(status.status)).catch(() => undefined);\n    return () => { mountedRef.current = false; };\n  }, []);",
    "  useEffect(() => {\n    mountedRef.current = true;\n    ensureAndroidChannels().catch(() => undefined);\n    Notifications.getPermissionsAsync().then((status) => mountedRef.current && setPermissionStatus(status.status)).catch(() => undefined);\n    const receivedListener = Notifications.addNotificationReceivedListener((notification) => {\n      const data = notification.request.content.data || {};\n      const notificationId = typeof data.notificationId === 'string'\n        ? data.notificationId\n        : typeof data.notification_id === 'string'\n          ? data.notification_id\n          : null;\n      if (!notificationId) return;\n      const ids = receivedSystemNotificationIdsRef.current;\n      ids.add(notificationId);\n      while (ids.size > 350) {\n        const oldest = ids.values().next().value;\n        if (typeof oldest !== 'string') break;\n        ids.delete(oldest);\n      }\n    });\n    return () => {\n      mountedRef.current = false;\n      receivedListener.remove();\n    };\n  }, []);",
    'received notification listener',
)

path.write_text(text, encoding='utf-8')

migration = Path('supabase/migrations/20260715213000_v1_0_7_push_delivery_hardening.sql')
migration.parent.mkdir(parents=True, exist_ok=True)
migration.write_text("""-- DraBornGarage v1.0.7 phone notification delivery hardening

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
  if p_expo_push_token is null or p_expo_push_token !~ '^Expo(nent)?PushToken\\[[^]]+\\]$' then
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
""", encoding='utf-8')

print('v1.0.7 push fallback patch applied')
