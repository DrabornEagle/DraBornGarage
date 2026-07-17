from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    (ROOT / path).write_text(content, encoding="utf-8")


def replace_once(path: str, old: str, new: str) -> None:
    content = read(path)
    count = content.count(old)
    if count != 1:
        raise RuntimeError(f"{path}: expected exactly one match, found {count}: {old[:100]!r}")
    write(path, content.replace(old, new, 1))


# Version metadata. Android versionCode intentionally remains 1 until the first Play package.
replace_once('package.json', '"version": "1.1.6"', '"version": "1.1.7"')
replace_once('app.json', '"version": "1.1.6"', '"version": "1.1.7"')

# One delivery transport at a time: native APK uses remote push, Expo Go/local-only mode uses schedules.
replace_once(
    'src/notifications/NotificationContextV101.tsx',
    "  { key: 'turkish_voice', label: 'Türkçe Sesli Uyarı', subtitle: 'Yavaş, net ve kategoriye özel Türkçe konuşma', icon: 'musical-notes' },",
    "  { key: 'turkish_voice', label: 'Doğal Türkçe Sesli Uyarı', subtitle: 'Türkiye Türkçesiyle doğal kadın sesi', icon: 'musical-notes' },",
)
replace_once(
    'src/notifications/NotificationContextV101.tsx',
    "  const syncFutureSchedules = useCallback(async (items: GarageNotification[], nextPreferences: NotificationPreferences, badge: number) => {\n    try {\n      const permission = await Notifications.getPermissionsAsync();",
    "  const syncFutureSchedules = useCallback(async (items: GarageNotification[], nextPreferences: NotificationPreferences, badge: number) => {\n    try {\n      if (!IS_EXPO_GO && nextPreferences.push_notifications_enabled) {\n        await cancelGarageSchedules();\n        return;\n      }\n      const permission = await Notifications.getPermissionsAsync();",
)
replace_once(
    'src/notifications/NotificationContextV101.tsx',
    "  const presentDueNotifications = useCallback(async (items: GarageNotification[], nextPreferences: NotificationPreferences, badge: number) => {\n    if (!session?.user || !nextPreferences.local_notifications_enabled) return;\n    try {",
    "  const presentDueNotifications = useCallback(async (items: GarageNotification[], nextPreferences: NotificationPreferences, badge: number) => {\n    if (!session?.user || !nextPreferences.local_notifications_enabled) return;\n    if (!IS_EXPO_GO && nextPreferences.push_notifications_enabled) return;\n    try {",
)
replace_once(
    'src/notifications/NotificationContextV101.tsx',
    "    await cancelGarageSchedules();\n    await Notifications.dismissAllNotificationsAsync().catch(() => undefined);\n    await Notifications.setBadgeCountAsync(0).catch(() => false);\n    await Notifications.clearLastNotificationResponseAsync().catch(() => undefined);\n    if (session?.user) await AsyncStorage.removeItem(`${DELIVERED_STORAGE_PREFIX}${session.user.id}`);",
    "    await cancelGarageSchedules();\n    const notificationApi = Notifications as typeof Notifications & Record<string, unknown>;\n    const dismissAll = notificationApi.dismissAllNotificationsAsync as (() => Promise<void>) | undefined;\n    if (typeof dismissAll === 'function') {\n      await Promise.resolve(dismissAll()).catch(() => undefined);\n    }\n    await Notifications.setBadgeCountAsync(0).catch(() => false);\n    const clearLastResponse = notificationApi.clearLastNotificationResponseAsync as (() => Promise<void>) | undefined;\n    if (typeof clearLastResponse === 'function') {\n      await Promise.resolve(clearLastResponse()).catch(() => undefined);\n    }\n    if (session?.user) await AsyncStorage.removeItem(`${DELIVERED_STORAGE_PREFIX}${session.user.id}`);",
)

# Move the destructive action out of Settings and into the All tab beside the feed controls.
replace_once(
    'src/notifications/NotificationCenterScreen.tsx',
    "    Alert.alert('Bütün bildirimler temizlensin mi?', 'Okunmuş, okunmamış ve planlanmış mevcut bildirimler Bildirim Merkezi’nden kaldırılacak.', [",
    "    Alert.alert('Tüm bildirimler silinsin mi?', 'Okunmuş, okunmamış ve planlanmış mevcut bildirimler Bildirim Merkezi’nden ve telefon bildirim alanından kaldırılacak.', [",
)
replace_once(
    'src/notifications/NotificationCenterScreen.tsx',
    "        text: 'Bütününü Temizle',",
    "        text: 'Tümünü Sil',",
)
replace_once(
    'src/notifications/NotificationCenterScreen.tsx',
    "\n            <AnimatedPressable onPress={clearEverything} style={[styles.clearAllButton, { backgroundColor: `${colors.red}10`, borderColor: `${colors.red}45` }]}>\n              <Ionicons name=\"trash-bin\" size={21} color={colors.red} />\n              <View style={styles.copy}><Text style={[styles.clearAllTitle, { color: colors.red }]}>Bütün Bildirimleri Temizle</Text><Text style={[styles.clearAllText, { color: colors.textMuted }]}>Bildirim Merkezi geçmişini ve mevcut planlı bildirimleri kaldır.</Text></View>\n            </AnimatedPressable>\n",
    "\n",
)
replace_once(
    'src/notifications/NotificationCenterScreen.tsx',
    "          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>\n            {tab === 'unread' && unreadCount > 0 && (",
    "          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>\n            {tab === 'all' && notifications.length > 0 && (\n              <AnimatedPressable onPress={clearEverything} style={[styles.markAll, { backgroundColor: `${colors.red}12`, borderColor: `${colors.red}35` }]}>\n                <Ionicons name=\"trash-outline\" size={19} color={colors.red} />\n                <Text style={[styles.markAllText, { color: colors.red }]}>Tümünü Sil</Text>\n              </AnimatedPressable>\n            )}\n\n            {tab === 'unread' && unreadCount > 0 && (",
)

# Android notification channels are immutable, so the natural voice gets fresh v10 channel IDs.
permissions_path = 'src/notifications/notificationPermissions.ts'
content = read(permissions_path)
for kind in ('APPOINTMENT', 'CUSTOMER_LINK', 'SERVICE', 'PAYMENT', 'GENERIC'):
    content = content.replace(
        f"export const VOICE_{kind}_CHANNEL_ID = 'draborngarage-voice-{kind.lower().replace('_', '-')}-v9';",
        f"export const VOICE_{kind}_CHANNEL_ID = 'draborngarage-voice-{kind.lower().replace('_', '-')}-v10';",
    )
old_legacy = "  'draborngarage-voice-generic-v8',\n];"
new_legacy = "  'draborngarage-voice-generic-v8',\n  'draborngarage-voice-appointment-v9',\n  'draborngarage-voice-customer-link-v9',\n  'draborngarage-voice-service-v9',\n  'draborngarage-voice-payment-v9',\n  'draborngarage-voice-generic-v9',\n];"
if old_legacy not in content:
    raise RuntimeError('notificationPermissions.ts: v8 legacy channel anchor not found')
content = content.replace(old_legacy, new_legacy, 1)
content = content.replace("name: 'Türkçe Ses • Randevu'", "name: 'Doğal Türkçe Ses • Randevu'")
content = content.replace("name: 'Türkçe Ses • Müşteri Talebi'", "name: 'Doğal Türkçe Ses • Müşteri Talebi'")
content = content.replace("name: 'Türkçe Ses • Servis'", "name: 'Doğal Türkçe Ses • Servis'")
content = content.replace("name: 'Türkçe Ses • Ödeme'", "name: 'Doğal Türkçe Ses • Ödeme'")
content = content.replace("name: 'Türkçe Sesli Uyarı'", "name: 'Doğal Türkçe Sesli Uyarı'")
write(permissions_path, content)

# README and handoff metadata.
replace_once(
    'README.md',
    '**v1.1.5 — Gerçek Push Teslimi, Aksiyon Popup ve Canlı Yenileme**',
    '**v1.1.7 — Tekil Push Teslimi, Güvenli Toplu Silme ve Doğal Türkçe Ses**',
)
replace_once(
    'README.md',
    '- Geliştirme/test sürümleri: `v1.1.0`, `v1.1.1`, `v1.1.2`, `v1.1.3`, `v1.1.4`, ardından `v1.1.5`…',
    '- Geliştirme/test sürümleri: `v1.1.0`–`v1.1.7`; ilk Play AAB alınana kadar Android `versionCode=1` korunur.',
)
replace_once(
    'README.md',
    '## v1.1.6 düzeltmeleri',
    "## v1.1.7 düzeltmeleri\n\n- Her kullanıcı/platform için yalnız en güncel push tokenı aktif tutulur; aynı hareketin birden fazla kez gelmesi engellenir.\n- Native APK’da remote push açıkken aynı kaydın yerel yedek bildirim olarak ikinci kez gösterilmesi durdurulur.\n- Toplu silme native yöntemleri cihazda yoksa hata vermeden güvenli biçimde atlanır.\n- **Tümünü Sil** Ayarlar’dan kaldırılarak Bildirimler → Tümü sekmesine taşındı.\n- `turkish_voice` Supabase tercih listesine eklendi ve seçim kalıcı hale getirildi.\n- Türkiye Türkçesi `tr-TR-EmelNeural` doğal kadın sesiyle yeni konuşma dosyaları üretildi; ses kanalları v10’a taşındı.\n- Yedek dalı: `backup/v1.1.6-before-v1.1.7-20260717`.\n\n## v1.1.6 düzeltmeleri",
)

handoff_path = ROOT / 'docs/PROJECT_HANDOFF_V1.1.7.md'
handoff_path.write_text("""# DraBornGarage v1.1.7 — Teslim ve Devam Belgesi

**Tarih:** 17 Temmuz 2026  
**Geliştirme sürümü:** `v1.1.7`  
**Android test versionCode:** `1`

## Kapsam

- Aynı bildirimi çoğaltan eski push tokenları kullanıcı ve platform bazında pasifleştirilir.
- Push gönderimi her platformda yalnız en güncel etkin tokena yapılır.
- Native push açıkken yerel anlık/yaklaşan yedek bildirimler kapatılarak çift teslim engellenir.
- Toplu silme native API desteği olmayan cihazlarda hata üretmez.
- **Tümünü Sil** yalnız Bildirimler → Tümü sekmesinde gösterilir.
- Türkçe ses tercihi Supabase tarafından kabul edilir.
- Konuşma dosyaları Türkiye Türkçesi doğal kadın sesiyle yenilenir ve Android kanalları v10 olur.

## Yedek

- `backup/v1.1.6-before-v1.1.7-20260717`

## Termux

```bash
cd "$HOME"
KURULAN_SURUM="v1.1.7"
YEDEKLENEN_SURUM="v1.1.6"
TARIH="$(date +%Y%m%d-%H%M%S)"
ENV_YEDEGI="$HOME/DraBornGarage-env-backup-${TARIH}"
[ -f "$HOME/DraBornGarage/.env" ] && cp "$HOME/DraBornGarage/.env" "$ENV_YEDEGI"
[ -d "$HOME/DraBornGarage" ] && mv "$HOME/DraBornGarage" "$HOME/DraBornGarage-${YEDEKLENEN_SURUM}-local-backup-${TARIH}"
curl -L --fail --retry 10 --retry-delay 3 --connect-timeout 30 --max-time 900 \\
  "https://github.com/DrabornEagle/DraBornGarage/archive/refs/heads/main.zip" \\
  -o "$HOME/DraBornGarage-${KURULAN_SURUM}.zip"
unzip -o "$HOME/DraBornGarage-${KURULAN_SURUM}.zip" -d "$HOME"
mv "$HOME/DraBornGarage-main" "$HOME/DraBornGarage"
rm -f "$HOME/DraBornGarage-${KURULAN_SURUM}.zip"
[ -f "$ENV_YEDEGI" ] && cp "$ENV_YEDEGI" "$HOME/DraBornGarage/.env"
cd "$HOME/DraBornGarage"
npm ci --no-audit --no-fund
npm run typecheck
npx expo start -c --go
```
""", encoding='utf-8')

print('v1.1.7 notification hotfix staged successfully')
