from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding='utf-8')


def replace_one(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    return text.replace(old, new, 1)


def regex_one(text: str, pattern: str, replacement: str, label: str, flags: int = 0) -> str:
    updated, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f'{label}: expected one regex match, found {count}')
    return updated


# ---------------------------------------------------------------------------
# Version and dependency metadata
# ---------------------------------------------------------------------------
package_path = ROOT / 'package.json'
package = json.loads(package_path.read_text())
package['version'] = '1.1.6'
package.setdefault('dependencies', {})['expo-network'] = '~8.0.8'
package_path.write_text(json.dumps(package, ensure_ascii=False, indent=2) + '\n')

lock_path = ROOT / 'package-lock.json'
lock = json.loads(lock_path.read_text())
lock['version'] = '1.1.6'
if '' in lock.get('packages', {}):
    lock['packages']['']['version'] = '1.1.6'
lock_path.write_text(json.dumps(lock, ensure_ascii=False, indent=2) + '\n')

app_path = ROOT / 'app.json'
app = json.loads(app_path.read_text())
app['expo']['version'] = '1.1.6'
app['expo']['android']['versionCode'] = 1
app['expo']['ios']['buildNumber'] = '1'
app_path.write_text(json.dumps(app, ensure_ascii=False, indent=2) + '\n')


# ---------------------------------------------------------------------------
# Push registration: network diagnostics, airplane-mode warning, retry/backoff
# ---------------------------------------------------------------------------
old_context_path = ROOT / 'src/notifications/NotificationContextV115.tsx'
context = old_context_path.read_text(encoding='utf-8')
context = replace_one(
    context,
    "import * as Notifications from 'expo-notifications';\n",
    "import * as Notifications from 'expo-notifications';\nimport * as Network from 'expo-network';\n",
    'expo-network import',
)
context = replace_one(
    context,
    "const DEVICE_ID_STORAGE_KEY = '@draborngarage/push-device-uuid-v115';",
    "const DEVICE_ID_STORAGE_KEY = '@draborngarage/push-device-uuid-v116';",
    'v1.1.6 device storage key',
)
context = replace_one(
    context,
    "  if (raw.includes('undefined is not a function')) {\n    return `${stage}: native bildirim köprüsündeki gerekli fonksiyon bulunamadı`;\n  }\n  return `${stage}: ${raw}`;",
    "  if (raw.includes('undefined is not a function')) {\n    return `${stage}: native bildirim köprüsündeki gerekli fonksiyon bulunamadı`;\n  }\n  if (raw.includes('AIRPLANE_MODE_ENABLED')) {\n    return `${stage}: Uçak modu açık. İlk FCM cihaz kaydı için uçak modunu kapat, interneti açık bırak ve yeniden dene.`;\n  }\n  if (raw.includes('NETWORK_OFFLINE')) {\n    return `${stage}: internet bağlantısı kullanılamıyor. Wi-Fi veya mobil veriyi kontrol et.`;\n  }\n  if (raw.includes('SERVICE_NOT_AVAILABLE')) {\n    return `${stage}: Google Play Hizmetleri FCM servisine şu an ulaşılamıyor. Uçak modunu kapat, Google Play Hizmetlerini güncelle ve birkaç saniye sonra tekrar dene.`;\n  }\n  return `${stage}: ${raw}`;",
    'readable network errors',
)
helper_marker = "async function getDeviceId() {\n  let id = await AsyncStorage.getItem(DEVICE_ID_STORAGE_KEY);\n  if (!id || !UUID_V4_PATTERN.test(id)) {\n    id = createUuidV4();\n    await AsyncStorage.setItem(DEVICE_ID_STORAGE_KEY, id);\n    await AsyncStorage.removeItem(LEGACY_DEVICE_ID_STORAGE_KEY);\n  }\n  return id;\n}\n"
helper_replacement = helper_marker + "\nfunction wait(milliseconds: number) {\n  return new Promise((resolve) => setTimeout(resolve, milliseconds));\n}\n\nfunction isTransientFcmError(error: unknown) {\n  const raw = error instanceof Error ? error.message : String(error || '');\n  return raw.includes('SERVICE_NOT_AVAILABLE')\n    || raw.includes('INTERNAL_SERVER_ERROR')\n    || raw.includes('TIMEOUT')\n    || raw.includes('NETWORK_ERROR')\n    || raw.includes('ExecutionException');\n}\n\nasync function getDevicePushTokenWithRetry() {\n  const delays = [0, 1800, 4200, 8500];\n  let lastError: unknown = new Error('FCM tokenı alınamadı');\n  for (const delay of delays) {\n    if (delay > 0) await wait(delay);\n    try {\n      const result = await getDevicePushTokenAsync();\n      const raw = (result as { data?: unknown }).data;\n      if (typeof raw !== 'string' || raw.trim().length < 20) throw new Error('Geçerli Android FCM tokenı alınamadı');\n      return result;\n    } catch (error) {\n      lastError = error;\n      if (!isTransientFcmError(error)) throw error;\n    }\n  }\n  throw lastError;\n}\n"
context = replace_one(context, helper_marker, helper_replacement, 'FCM retry helpers')
context = replace_one(
    context,
    "        stage = 'Android FCM tokenı alınamadı';\n        const devicePushToken = await getDevicePushTokenAsync();\n        const rawDeviceToken = (devicePushToken as { data?: unknown }).data;\n        if (typeof rawDeviceToken !== 'string' || rawDeviceToken.trim().length < 20) {\n          throw new Error('Geçerli Android FCM tokenı alınamadı');\n        }\n",
    "        stage = 'Telefon bağlantısı doğrulanamadı';\n        const network = await Network.getNetworkStateAsync();\n        if (!network.isConnected || network.isInternetReachable === false) throw new Error('NETWORK_OFFLINE');\n        if (Platform.OS === 'android') {\n          const airplaneMode = await Network.isAirplaneModeEnabledAsync();\n          if (airplaneMode) throw new Error('AIRPLANE_MODE_ENABLED');\n        }\n\n        stage = 'Android FCM tokenı alınamadı';\n        const devicePushToken = await getDevicePushTokenWithRetry();\n",
    'network-aware FCM registration',
)
context = replace_one(
    context,
    "    const listener = AppState.addEventListener('change', (state) => {\n      if (state === 'active') { void registerPushNotifications(); void refreshPushHealth(); }\n    });\n    return () => listener.remove();",
    "    const listener = AppState.addEventListener('change', (state) => {\n      if (state === 'active') { void registerPushNotifications(); void refreshPushHealth(); }\n    });\n    const networkListener = Network.addNetworkStateListener((state) => {\n      if (state.isConnected && state.isInternetReachable !== false && AppState.currentState === 'active') {\n        void registerPushNotifications();\n      }\n    });\n    const retryTimer = setInterval(() => {\n      if (AppState.currentState === 'active' && pushStatus !== 'registered') void registerPushNotifications();\n    }, 60000);\n    return () => { listener.remove(); networkListener.remove(); clearInterval(retryTimer); };",
    'network listener and retry timer',
)
context = context.replace("NotificationContextV115", "NotificationContextV116")
write('src/notifications/NotificationContextV116.tsx', context)
old_context_path.unlink()
write('src/notifications/NotificationContext.tsx', "export * from './NotificationContextV116';\n")


# ---------------------------------------------------------------------------
# Base center: stop duplicate legacy native registration + clear all API
# ---------------------------------------------------------------------------
base_path = 'src/notifications/NotificationContextV101.tsx'
base = read(base_path)
base = replace_one(
    base,
    "  { key: 'turkish_voice', label: 'Türkçe Sesli Uyarı', subtitle: 'Bildirim türüne göre Türkçe konuşan sabit uyarı', icon: 'musical-notes' },",
    "  { key: 'turkish_voice', label: 'Türkçe Sesli Uyarı', subtitle: 'Yavaş, net ve kategoriye özel Türkçe konuşma', icon: 'musical-notes' },",
    'clear Turkish voice subtitle',
)
base = replace_one(
    base,
    "  deleteNotification: (notificationId: string) => Promise<void>;\n",
    "  deleteNotification: (notificationId: string) => Promise<void>;\n  clearAllNotifications: () => Promise<number>;\n",
    'clear all context interface',
)
base = replace_one(base, "    registerPushNotifications();\n    const channel", "    if (NATIVE_PUSH_ENABLED) registerPushNotifications();\n    const channel", 'guard initial legacy registration')
base = replace_one(base, "        registerPushNotifications();\n        refresh();", "        if (NATIVE_PUSH_ENABLED) registerPushNotifications();\n        refresh();", 'guard foreground legacy registration')
insert_after_delete = "  const deleteNotification = useCallback(async (notificationId: string) => {\n    await supabase.rpc('notification_delete', { p_notification_id: notificationId });\n    setNotifications((items) => items.filter((item) => item.id !== notificationId));\n    setUpcoming((items) => items.filter((item) => item.id !== notificationId));\n    await Notifications.cancelScheduledNotificationAsync(`draborngarage-${notificationId}`).catch(() => undefined);\n    await refresh();\n  }, [refresh]);\n"
clear_impl = insert_after_delete + "\n  const clearAllNotifications = useCallback(async () => {\n    const { data, error } = await supabase.rpc('notification_clear_all');\n    if (error) throw error;\n    setNotifications([]);\n    setUpcoming([]);\n    setUnreadCount(0);\n    setUpcomingCount(0);\n    await cancelGarageSchedules();\n    await Notifications.dismissAllNotificationsAsync().catch(() => undefined);\n    await Notifications.setBadgeCountAsync(0).catch(() => false);\n    await Notifications.clearLastNotificationResponseAsync().catch(() => undefined);\n    if (session?.user) await AsyncStorage.removeItem(`${DELIVERED_STORAGE_PREFIX}${session.user.id}`);\n    return Number(data || 0);\n  }, [cancelGarageSchedules, session?.user]);\n"
base = replace_one(base, insert_after_delete, clear_impl, 'clear all implementation')
base = replace_one(
    base,
    "    openCenter: () => setOpen(true), closeCenter: () => setOpen(false), refresh, markRead, markAllRead, archive, deleteNotification,\n",
    "    openCenter: () => setOpen(true), closeCenter: () => setOpen(false), refresh, markRead, markAllRead, archive, deleteNotification, clearAllNotifications,\n",
    'clear all provider value',
)
base = replace_one(
    base,
    "refresh, markRead, markAllRead, archive, deleteNotification, openNotification",
    "refresh, markRead, markAllRead, archive, deleteNotification, clearAllNotifications, openNotification",
    'clear all provider dependency',
)
write(base_path, base)


# ---------------------------------------------------------------------------
# Notification Center: clear all + first 4 / 10 more pagination
# ---------------------------------------------------------------------------
center_path = 'src/notifications/NotificationCenterScreen.tsx'
center = read(center_path)
center = replace_one(center, "import React, { useMemo, useState } from 'react';", "import React, { useEffect, useMemo, useState } from 'react';", 'notification useEffect import')
center = replace_one(center, "type CenterTab = 'all' | 'unread' | 'upcoming' | 'settings';", "type CenterTab = 'all' | 'unread' | 'upcoming' | 'settings';\nconst INITIAL_NOTIFICATION_COUNT = 4;\nconst NOTIFICATION_PAGE_INCREMENT = 10;", 'notification pagination constants')
center = replace_one(center, "    deleteNotification,\n    openNotification,", "    deleteNotification,\n    clearAllNotifications,\n    openNotification,", 'clear all hook')
center = replace_one(center, "  const [preferencesSectionOpen, setPreferencesSectionOpen] = useState(false);", "  const [preferencesSectionOpen, setPreferencesSectionOpen] = useState(false);\n  const [visibleNotificationCount, setVisibleNotificationCount] = useState(INITIAL_NOTIFICATION_COUNT);", 'notification count state')
center = replace_one(
    center,
    "  const visible = useMemo(() => {\n    if (tab === 'upcoming') return upcoming;\n    const sourceItems = tab === 'unread' ? notifications.filter((item) => !item.read_at) : notifications;\n    return [...sourceItems].sort((a, b) => new Date(b.deliver_at).getTime() - new Date(a.deliver_at).getTime());\n  }, [tab, notifications, upcoming]);\n",
    "  const visible = useMemo(() => {\n    if (tab === 'upcoming') return upcoming;\n    const sourceItems = tab === 'unread' ? notifications.filter((item) => !item.read_at) : notifications;\n    return [...sourceItems].sort((a, b) => new Date(b.deliver_at).getTime() - new Date(a.deliver_at).getTime());\n  }, [tab, notifications, upcoming]);\n  const displayedNotifications = tab === 'all' ? visible.slice(0, visibleNotificationCount) : visible;\n  const remainingNotifications = tab === 'all' ? Math.max(0, visible.length - displayedNotifications.length) : 0;\n\n  useEffect(() => { setVisibleNotificationCount(INITIAL_NOTIFICATION_COUNT); }, [tab]);\n",
    'notification paged list',
)
clear_handler_marker = "  const testClosedApp = async () => {\n    setSaving(true);\n    const ok = await sendClosedAppTestNotification();\n    setSaving(false);\n    Alert.alert(ok ? 'Kapalı uygulama testi planlandı' : 'Push testi planlanamadı', ok\n      ? 'Uygulamayı şimdi tamamen kapat. Yaklaşık 45–90 saniye içinde telefon bildirim alanına yüksek öncelikli test bildirimi gelmeli.'\n      : 'Cihaz push kaydı veya FCM V1 bağlantısı henüz hazır değil. Bildirim ayarını açık tutup tekrar dene.');\n  };\n"
clear_handler = clear_handler_marker + "\n  const clearEverything = () => {\n    Alert.alert('Bütün bildirimler temizlensin mi?', 'Okunmuş, okunmamış ve planlanmış mevcut bildirimler Bildirim Merkezi’nden kaldırılacak.', [\n      { text: 'Vazgeç', style: 'cancel' },\n      {\n        text: 'Bütününü Temizle',\n        style: 'destructive',\n        onPress: async () => {\n          setSaving(true);\n          try {\n            const count = await clearAllNotifications();\n            setVisibleNotificationCount(INITIAL_NOTIFICATION_COUNT);\n            Alert.alert('Bildirimler temizlendi', `${count} bildirim kaldırıldı.`);\n          } catch (error) {\n            Alert.alert('Bildirimler temizlenemedi', error instanceof Error ? error.message : 'Bilinmeyen hata');\n          } finally {\n            setSaving(false);\n          }\n        },\n      },\n    ]);\n  };\n"
center = replace_one(center, clear_handler_marker, clear_handler, 'clear all screen handler')
center = replace_one(
    center,
    "            <GlassCard style={[styles.infoCard, { borderColor: `${colors.cyan}35` }]}>",
    "            <AnimatedPressable onPress={clearEverything} style={[styles.clearAllButton, { backgroundColor: `${colors.red}10`, borderColor: `${colors.red}45` }]}>\n              <Ionicons name=\"trash-bin\" size={21} color={colors.red} />\n              <View style={styles.copy}><Text style={[styles.clearAllTitle, { color: colors.red }]}>Bütün Bildirimleri Temizle</Text><Text style={[styles.clearAllText, { color: colors.textMuted }]}>Bildirim Merkezi geçmişini ve mevcut planlı bildirimleri kaldır.</Text></View>\n            </AnimatedPressable>\n\n            <GlassCard style={[styles.infoCard, { borderColor: `${colors.cyan}35` }]}>",
    'clear all settings button',
)
center = replace_one(center, ") : visible.map((item) => (", ") : displayedNotifications.map((item) => (", 'displayed notification map')
center = replace_one(
    center,
    "            ))}\n          </ScrollView>",
    "            ))}\n            {remainingNotifications > 0 && (\n              <AnimatedPressable onPress={() => setVisibleNotificationCount((count) => count + NOTIFICATION_PAGE_INCREMENT)} style={[styles.moreButton, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}45` }]}>\n                <Ionicons name=\"chevron-down-circle\" size={21} color={colors.primary} />\n                <Text style={[styles.moreButtonText, { color: colors.primary }]}>Daha Fazla • {Math.min(NOTIFICATION_PAGE_INCREMENT, remainingNotifications)} bildirim göster</Text>\n              </AnimatedPressable>\n            )}\n          </ScrollView>",
    'notification more button',
)
style_marker = "  page: { flex: 1, paddingHorizontal: 16, overflow: 'hidden' },"
style_replacement = style_marker + "\n  clearAllButton: { minHeight: 72, borderWidth: 1, borderRadius: 20, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },\n  clearAllTitle: { fontSize: 15, fontWeight: '900' },\n  clearAllText: { fontSize: 11.5, lineHeight: 16, marginTop: 3 },\n  moreButton: { minHeight: 52, borderWidth: 1, borderRadius: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },\n  moreButtonText: { fontSize: 13, fontWeight: '900' },"
center = replace_one(center, style_marker, style_replacement, 'notification clear and more styles')
write(center_path, center)


# ---------------------------------------------------------------------------
# Fresh Turkish voice channels and clearer speech generator
# ---------------------------------------------------------------------------
permissions_path = 'src/notifications/notificationPermissions.ts'
permissions = read(permissions_path)
for old, new in [
    ('draborngarage-voice-appointment-v8', 'draborngarage-voice-appointment-v9'),
    ('draborngarage-voice-customer-link-v8', 'draborngarage-voice-customer-link-v9'),
    ('draborngarage-voice-service-v8', 'draborngarage-voice-service-v9'),
    ('draborngarage-voice-payment-v8', 'draborngarage-voice-payment-v9'),
    ('draborngarage-voice-generic-v8', 'draborngarage-voice-generic-v9'),
    ('@draborngarage/notification-intro-v115', '@draborngarage/notification-intro-v116'),
]:
    permissions = permissions.replace(old, new)
legacy_end = "  'draborngarage-silent-v6',\n];"
legacy_voice = "  'draborngarage-silent-v6',\n  'draborngarage-voice-appointment-v8',\n  'draborngarage-voice-customer-link-v8',\n  'draborngarage-voice-service-v8',\n  'draborngarage-voice-payment-v8',\n  'draborngarage-voice-generic-v8',\n];"
permissions = replace_one(permissions, legacy_end, legacy_voice, 'legacy Turkish voice channels')
permissions = permissions.replace('Randevu geldi. Lütfen kontrol edin.', 'Yeni randevu var. Lütfen kontrol edin.')
permissions = permissions.replace('Müşteri bağlantı talebi geldi. Lütfen kontrol edin.', 'Yeni müşteri bağlantı talebi var. Lütfen kontrol edin.')
permissions = permissions.replace('Servis bildirimi geldi. Lütfen kontrol edin.', 'Yeni servis bildirimi var. Lütfen kontrol edin.')
permissions = permissions.replace('Ödeme bildirimi geldi. Lütfen kontrol edin.', 'Yeni ödeme bildirimi var. Lütfen kontrol edin.')
permissions = permissions.replace('DraBornGarage bildirimi geldi. Lütfen kontrol edin.', 'Yeni bildirim var. Lütfen kontrol edin.')
write(permissions_path, permissions)

voice_script = r'''#!/usr/bin/env bash
set -euo pipefail

OUT="assets/sounds"
mkdir -p "$OUT"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

make_voice() {
  local filename="$1"
  local phrase="$2"
  local raw="$TMP/${filename%.wav}-raw.wav"
  espeak -v tr -s 120 -p 40 -a 190 -g 7 -w "$raw" "$phrase"
  ffmpeg -y -loglevel error -i "$raw" \
    -af "adelay=120,highpass=f=105,lowpass=f=7600,acompressor=threshold=-21dB:ratio=2.4:attack=8:release=140,loudnorm=I=-15:TP=-1.3:LRA=6,apad=pad_dur=0.22,aresample=44100" \
    -ar 44100 -ac 1 -c:a pcm_s16le "$OUT/$filename"
}

make_voice garage_voice_appointment.wav "Yeni randevu var. Lütfen kontrol edin."
make_voice garage_voice_customer_link.wav "Yeni müşteri bağlantı talebi var. Lütfen kontrol edin."
make_voice garage_voice_service.wav "Yeni servis bildirimi var. Lütfen kontrol edin."
make_voice garage_voice_payment.wav "Yeni ödeme bildirimi var. Lütfen kontrol edin."
make_voice garage_voice_generic.wav "Yeni bildirim var. Lütfen kontrol edin."

for file in "$OUT"/garage_voice_*.wav; do
  test -s "$file"
  echo "Generated $file ($(stat -c%s "$file") bytes)"
done
'''
write('scripts/generate_turkish_voice_sounds.sh', voice_script)


# ---------------------------------------------------------------------------
# Supabase migration/rollback
# ---------------------------------------------------------------------------
migration = """-- DraBornGarage v1.1.6\n-- Clear all current notifications and move Turkish voice channels to v9.\nbegin;\n\ncreate or replace function public.notification_clear_all()\nreturns integer\nlanguage plpgsql\nsecurity definer\nset search_path=public\nas $$\ndeclare\n  v_user uuid:=auth.uid();\n  v_count integer:=0;\nbegin\n  if v_user is null then raise exception 'Oturum gerekli'; end if;\n  delete from public.notification_push_requests r\n  using public.user_notifications n\n  where r.notification_id=n.id and n.user_id=v_user;\n  update public.user_notifications\n  set archived_at=coalesce(archived_at,now()), read_at=coalesce(read_at,now()), push_error='Kullanıcı tarafından temizlendi', updated_at=now()\n  where user_id=v_user and archived_at is null;\n  get diagnostics v_count=row_count;\n  return v_count;\nend;\n$$;\n\nrevoke all on function public.notification_clear_all() from public,anon;\ngrant execute on function public.notification_clear_all() to authenticated;\n\ncreate or replace function public.notification_channel_id(p_sound text,p_category text)\nreturns text\nlanguage sql\nimmutable\nset search_path=public\nas $$\nselect case\nwhen p_sound='turkish_voice' and p_category='appointments' then 'draborngarage-voice-appointment-v9'\nwhen p_sound='turkish_voice' and p_category='customer_links' then 'draborngarage-voice-customer-link-v9'\nwhen p_sound='turkish_voice' and p_category='service' then 'draborngarage-voice-service-v9'\nwhen p_sound='turkish_voice' and p_category in ('payments','receivables','platform') then 'draborngarage-voice-payment-v9'\nwhen p_sound='turkish_voice' then 'draborngarage-voice-generic-v9'\nwhen p_sound='garage_chime' then 'draborngarage-appointment-chime-v7'\nwhen p_sound='garage_pulse' then 'draborngarage-workshop-pulse-v7'\nwhen p_sound='garage_alert' then 'draborngarage-urgent-alert-v7'\nwhen p_sound='garage_bell' then 'draborngarage-classic-bell-v7'\nwhen p_sound='garage_siren' then 'draborngarage-siren-v7'\nwhen p_sound='garage_turbo' then 'draborngarage-turbo-v7'\nwhen p_sound='garage_metal' then 'draborngarage-metal-v7'\nwhen p_sound='garage_digital' then 'draborngarage-digital-v7'\nwhen p_sound='garage_retro' then 'draborngarage-retro-v7'\nwhen p_sound='silent' then 'draborngarage-silent-v7'\nelse 'draborngarage-system-default-v7' end;\n$$;\n\nrevoke all on function public.notification_channel_id(text,text) from public,anon,authenticated;\ncommit;\n"""
rollback = migration.replace('v1.1.6', 'v1.1.6 rollback').replace('draborngarage-voice-appointment-v9', 'draborngarage-voice-appointment-v8').replace('draborngarage-voice-customer-link-v9', 'draborngarage-voice-customer-link-v8').replace('draborngarage-voice-service-v9', 'draborngarage-voice-service-v8').replace('draborngarage-voice-payment-v9', 'draborngarage-voice-payment-v8').replace('draborngarage-voice-generic-v9', 'draborngarage-voice-generic-v8')
rollback = rollback.replace("create or replace function public.notification_clear_all()", "drop function if exists public.notification_clear_all();\n\n-- Previous channel mapping follows.\ncreate or replace function public.notification_clear_all_unused()")
write('supabase/migrations/20260717113000_v1_1_6_notification_cleanup_push_retry.sql', migration)
write('supabase/rollback/20260717113000_v1_1_6_notification_cleanup_push_retry_rollback.sql', rollback)


# ---------------------------------------------------------------------------
# README / handoff
# ---------------------------------------------------------------------------
readme = read('README.md')
readme = readme.replace('**v1.1.5 — Gerçek Push Teslim Doğrulaması, Aksiyon Popup ve Türkçe Ses**', '**v1.1.6 — FCM Yeniden Deneme, Bildirim Temizleme ve Net Türkçe Ses**')
readme = readme.replace('`v1.1.0`, `v1.1.1`, `v1.1.2`, `v1.1.3`, ardından `v1.1.4`…', '`v1.1.0` ile başlayan geliştirme çizgisi `v1.1.6` ile devam eder.')
section = "## v1.1.6 düzeltmeleri\n\n- `SERVICE_NOT_AVAILABLE` için bağlantı ve uçak modu kontrolü eklendi.\n- FCM cihaz tokenı kademeli beklemeyle dört kez yeniden denenir; bağlantı geri geldiğinde kayıt otomatik tekrarlanır.\n- Bildirim Ayarlarına Bütün Bildirimleri Temizle eklendi.\n- Tümü sekmesi ilk 4 bildirimi gösterir; her Daha Fazla dokunuşunda 10 bildirim daha açılır.\n- Türkçe konuşma cümleleri kısaltıldı, hız düşürüldü ve ses temizleme/normalizasyon uygulandı.\n- Türkçe ses kanalları v9'a taşındı.\n- Yedek dalı: `backup/v1.1.5-before-v1.1.6-20260717`.\n\n"
marker = '## v1.1.5 düzeltmeleri\n'
readme = replace_one(readme, marker, section + marker, 'README v1.1.6 section')
write('README.md', readme)

handoff_path = 'docs/PROJECT_HANDOFF_V0.8.2.md'
handoff = read(handoff_path)
handoff = handoff.replace('**Güncel geliştirme sürümü:** `v1.1.5`', '**Güncel geliştirme sürümü:** `v1.1.6`')
handoff = handoff.replace('içerik v1.1.5 ile günceldir', 'içerik v1.1.6 ile günceldir')
handoff = handoff.replace('## v1.1.5 — Gerçek push teslimi, aksiyon popup ve Türkçe ses', '## v1.1.6 — FCM yeniden deneme, bildirim temizleme ve net Türkçe ses\n\n- FCM kayıt öncesi internet ve uçak modu kontrol edilir.\n- Geçici `SERVICE_NOT_AVAILABLE` hatalarında kademeli yeniden deneme yapılır.\n- Bağlantı geri geldiğinde ve uygulama öne çıktığında push kaydı otomatik tekrarlanır.\n- Bildirim Ayarlarında bütün mevcut bildirimleri temizleme seçeneği bulunur.\n- Tümü listesi 4 kayıtla başlar ve her dokunuşta 10 kayıt daha gösterir.\n- Türkçe sesler daha kısa, yavaş ve normalize edilmiş biçimde yeniden üretildi.\n- Geri alma dalı: `backup/v1.1.5-before-v1.1.6-20260717`.\n\n## v1.1.5 — Gerçek push teslimi, aksiyon popup ve Türkçe ses')
handoff = handoff.replace('## v1.1.5 Termux yedek + kurulum', '## v1.1.6 Termux yedek + kurulum')
handoff = handoff.replace('KURULAN_SURUM="v1.1.5"', 'KURULAN_SURUM="v1.1.6"')
handoff = handoff.replace('YEDEKLENEN_SURUM="v1.1.4"', 'YEDEKLENEN_SURUM="v1.1.5"')
write(handoff_path, handoff)

print('DraBornGarage v1.1.6 patch applied')
