from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)


# ---------------------------------------------------------------------------
# Version metadata
# ---------------------------------------------------------------------------
package_path = ROOT / "package.json"
package = json.loads(package_path.read_text())
package["version"] = "1.1.4"
package_path.write_text(json.dumps(package, ensure_ascii=False, indent=2) + "\n")

lock_path = ROOT / "package-lock.json"
lock = json.loads(lock_path.read_text())
lock["version"] = "1.1.4"
if "" in lock.get("packages", {}):
    lock["packages"][""]["version"] = "1.1.4"
lock_path.write_text(json.dumps(lock, ensure_ascii=False, indent=2) + "\n")

app_path = ROOT / "app.json"
app = json.loads(app_path.read_text())
app["expo"]["version"] = "1.1.4"
app["expo"]["android"]["versionCode"] = 1
app["expo"]["ios"]["buildNumber"] = "1"
for plugin in app["expo"].get("plugins", []):
    if isinstance(plugin, list) and plugin and plugin[0] == "expo-notifications":
        plugin[1]["defaultChannel"] = "draborngarage-system-default-v7"
app_path.write_text(json.dumps(app, ensure_ascii=False, indent=2) + "\n")


# ---------------------------------------------------------------------------
# Push registration: valid RFC 4122 UUID + clean v1.1.4 context filename
# ---------------------------------------------------------------------------
old_context = ROOT / "src/notifications/NotificationContextV113.tsx"
context = old_context.read_text(encoding="utf-8")
context = replace_once(
    context,
    "const DEVICE_ID_STORAGE_KEY = '@draborngarage/push-device-id';\n",
    "const DEVICE_ID_STORAGE_KEY = '@draborngarage/push-device-uuid-v114';\nconst LEGACY_DEVICE_ID_STORAGE_KEY = '@draborngarage/push-device-id';\nconst UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;\n",
    "push device constants",
)
context = replace_once(
    context,
    "async function getDeviceId() {\n  let id = await AsyncStorage.getItem(DEVICE_ID_STORAGE_KEY);\n  if (!id) {\n    id = `garage-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;\n    await AsyncStorage.setItem(DEVICE_ID_STORAGE_KEY, id);\n  }\n  return id;\n}\n",
    "function createUuidV4() {\n  const bytes = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));\n  bytes[6] = (bytes[6] & 0x0f) | 0x40;\n  bytes[8] = (bytes[8] & 0x3f) | 0x80;\n  const hex = bytes.map((value) => value.toString(16).padStart(2, '0'));\n  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;\n}\n\nasync function getDeviceId() {\n  let id = await AsyncStorage.getItem(DEVICE_ID_STORAGE_KEY);\n  if (!id || !UUID_V4_PATTERN.test(id)) {\n    id = createUuidV4();\n    await AsyncStorage.setItem(DEVICE_ID_STORAGE_KEY, id);\n    await AsyncStorage.removeItem(LEGACY_DEVICE_ID_STORAGE_KEY);\n  }\n  return id;\n}\n",
    "valid UUID generator",
)
context = replace_once(
    context,
    "  if (raw.includes('ERR_NOTIF_DEVICE_ID')) {\n    return `${stage}: uygulama kurulum kimliği oluşturulamadı`;\n  }\n",
    "  if (raw.includes('ERR_NOTIF_DEVICE_ID') || raw.includes('Invalid UUID')) {\n    return `${stage}: geçerli uygulama kurulum kimliği oluşturulamadı`;\n  }\n",
    "UUID readable error",
)
context = replace_once(
    context,
    "    if (patch.notification_sound) await previewNotificationSound(patch.notification_sound);\n",
    "",
    "single sound preview",
)
write("src/notifications/NotificationContextV114.tsx", context)
old_context.unlink()
write("src/notifications/NotificationContext.tsx", "export * from './NotificationContextV114';\n")


# ---------------------------------------------------------------------------
# Android notification channels v7 (fresh user-controlled channel settings)
# ---------------------------------------------------------------------------
permissions_path = "src/notifications/notificationPermissions.ts"
permissions = read(permissions_path)
for old, new in [
    ("draborngarage-system-default-v6", "draborngarage-system-default-v7"),
    ("draborngarage-appointment-chime-v6", "draborngarage-appointment-chime-v7"),
    ("draborngarage-workshop-pulse-v6", "draborngarage-workshop-pulse-v7"),
    ("draborngarage-urgent-alert-v6", "draborngarage-urgent-alert-v7"),
    ("draborngarage-classic-bell-v6", "draborngarage-classic-bell-v7"),
    ("draborngarage-siren-v6", "draborngarage-siren-v7"),
    ("draborngarage-turbo-v6", "draborngarage-turbo-v7"),
    ("draborngarage-metal-v6", "draborngarage-metal-v7"),
    ("draborngarage-digital-v6", "draborngarage-digital-v7"),
    ("draborngarage-retro-v6", "draborngarage-retro-v7"),
    ("draborngarage-silent-v6", "draborngarage-silent-v7"),
    ("@draborngarage/notification-intro-v111", "@draborngarage/notification-intro-v114"),
]:
    permissions = permissions.replace(old, new)
legacy_marker = "  'draborngarage-silent-v5',\n];"
legacy_v6 = "  'draborngarage-silent-v5',\n  'draborngarage-system-default-v6',\n  'draborngarage-appointment-chime-v6',\n  'draborngarage-workshop-pulse-v6',\n  'draborngarage-urgent-alert-v6',\n  'draborngarage-classic-bell-v6',\n  'draborngarage-siren-v6',\n  'draborngarage-turbo-v6',\n  'draborngarage-metal-v6',\n  'draborngarage-digital-v6',\n  'draborngarage-retro-v6',\n  'draborngarage-silent-v6',\n];"
permissions = replace_once(permissions, legacy_marker, legacy_v6, "legacy v6 channels")
write(permissions_path, permissions)


# ---------------------------------------------------------------------------
# Notification Center: sound preview, collapsible main categories, safe volume UX
# ---------------------------------------------------------------------------
center_path = "src/notifications/NotificationCenterScreen.tsx"
center = read(center_path)
center = replace_once(
    center,
    "import { Alert, Modal, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';",
    "import { Alert, Linking, Modal, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';",
    "notification center Linking import",
)
center = replace_once(
    center,
    "    sendTestNotification,\n    sendClosedAppTestNotification,",
    "    sendTestNotification,\n    previewNotificationSound,\n    sendClosedAppTestNotification,",
    "notification preview hook",
)
center = replace_once(
    center,
    "  const [saving, setSaving] = useState(false);",
    "  const [saving, setSaving] = useState(false);\n  const [soundSectionOpen, setSoundSectionOpen] = useState(false);\n  const [preferencesSectionOpen, setPreferencesSectionOpen] = useState(false);",
    "notification accordion state",
)
center = replace_once(
    center,
    "  const selectSound = async (sound: NotificationSoundKey) => {\n    setSaving(true);\n    const error = await updatePreferences({ notification_sound: sound });\n    setSaving(false);\n    if (error) Alert.alert('Bildirim sesi kaydedilemedi', error);\n  };",
    "  const selectSound = async (sound: NotificationSoundKey) => {\n    setSaving(true);\n    const previewed = await previewNotificationSound(sound);\n    const error = await updatePreferences({ notification_sound: sound });\n    setSaving(false);\n    if (error) return Alert.alert('Bildirim sesi kaydedilemedi', error);\n    if (!previewed) Alert.alert('Ses seçildi', 'Bildirim izni veya Android kanal sesi kapalı olduğu için önizleme çalmadı. Android bildirim ayarından sesi açabilirsin.');\n  };",
    "sound selection preview",
)
permission_buttons = "            {permissionStatus !== 'granted' && <PrimaryButton title=\"Telefon Bildirimlerini Aç\" onPress={enableLocal} loading={saving} />}\n            {permissionStatus === 'granted' && <><PrimaryButton title=\"Test Bildirimi Gönder\" onPress={testLocal} loading={saving} secondary /><PrimaryButton title=\"Kapalı Uygulama Bildirim Testi\" onPress={testClosedApp} loading={saving} secondary /></>}"
volume_block = permission_buttons + "\n\n            <GlassCard style={[styles.infoCard, { borderColor: `${colors.orange}35` }]}>\n              <Ionicons name=\"volume-high\" size={23} color={colors.orange} />\n              <Text style={[styles.infoText, { color: colors.textMuted }]}>DraBornGarage telefonun genel ses seviyesini habersiz değiştirmez. Kritik kanallar en yüksek Android önem düzeyi ve güçlü titreşim kullanır; duyulabilir ses seviyesi kullanıcı kontrolündedir.</Text>\n            </GlassCard>\n            <PrimaryButton title=\"Android Bildirim Ses Ayarını Aç\" onPress={() => Linking.openSettings()} secondary />"
center = replace_once(center, permission_buttons, volume_block, "safe Android volume controls")
center = replace_once(
    center,
    "            <Text style={[styles.sectionTitle, { color: colors.text }]}>Bildirim sesi</Text>",
    "            <SettingsCategoryHeader title=\"Bildirim Sesi\" subtitle=\"Seç, kaydet ve anında dinle\" icon=\"musical-notes\" open={soundSectionOpen} onPress={() => setSoundSectionOpen((value) => !value)} />\n            {soundSectionOpen && <>",
    "sound category header",
)
center = replace_once(
    center,
    "            {pushStatus !== 'registered' && pushStatus !== 'expo_go' && <PrimaryButton title=\"Telefonu Push Sistemine Kaydet\" onPress={enablePush} loading={saving} secondary />}\n\n            <Text style={[styles.sectionTitle, { color: colors.text }]}>Bildirim tercihleri</Text>",
    "            {pushStatus !== 'registered' && pushStatus !== 'expo_go' && <PrimaryButton title=\"Telefonu Push Sistemine Kaydet\" onPress={enablePush} loading={saving} secondary />}\n            </>}\n\n            <SettingsCategoryHeader title=\"Bildirim Tercihleri\" subtitle=\"Servis, randevu, ödeme ve hatırlatma ayarları\" icon=\"options\" open={preferencesSectionOpen} onPress={() => setPreferencesSectionOpen((value) => !value)} />\n            {preferencesSectionOpen && <>",
    "preferences category header",
)
center = replace_once(
    center,
    "            </GlassCard>\n\n            <GlassCard style={[styles.infoCard, { borderColor: `${colors.cyan}35` }]}",
    "            </GlassCard>\n            </>}\n\n            <GlassCard style={[styles.infoCard, { borderColor: `${colors.cyan}35` }]}",
    "preferences category close",
)
center = replace_once(
    center,
    "function TabButton({ active, label, icon, badge, onPress }:",
    "function SettingsCategoryHeader({ title, subtitle, icon, open, onPress }: { title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap; open: boolean; onPress: () => void }) {\n  const { colors } = useTheme();\n  return <AnimatedPressable onPress={onPress} style={[styles.categoryHeader, { backgroundColor: colors.card, borderColor: open ? `${colors.primary}58` : colors.border }]}>\n    <View style={[styles.categoryIcon, { backgroundColor: `${colors.primary}16` }]}><Ionicons name={icon} size={22} color={colors.primary} /></View>\n    <View style={styles.copy}><Text style={[styles.categoryTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.categorySubtitle, { color: colors.textMuted }]}>{subtitle}</Text></View>\n    <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={21} color={open ? colors.primary : colors.textMuted} />\n  </AnimatedPressable>;\n}\n\nfunction TabButton({ active, label, icon, badge, onPress }:",
    "notification category component",
)
center = replace_once(
    center,
    "  page: { flex: 1, paddingHorizontal: 16, overflow: 'hidden' },",
    "  page: { flex: 1, paddingHorizontal: 16, overflow: 'hidden' },\n  categoryHeader: { minHeight: 76, borderWidth: 1, borderRadius: 20, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },\n  categoryIcon: { width: 47, height: 47, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },\n  categoryTitle: { fontSize: 16, fontWeight: '900' },\n  categorySubtitle: { fontSize: 11.5, lineHeight: 16, marginTop: 3 },",
    "notification category styles",
)
write(center_path, center)


# ---------------------------------------------------------------------------
# Settings visibility and stale release labels
# ---------------------------------------------------------------------------
settings_path = "src/screens/SettingsScreen.tsx"
settings = read(settings_path)
settings = replace_once(
    settings,
    "  const isOwner = isAdmin || membership?.role === 'owner' || membership?.role === 'owner_mechanic';\n  const canConfigureReadyPayment = membership?.role === 'mechanic' || membership?.role === 'owner_mechanic';",
    "  const staffRole = membership?.role ?? '';\n  const isOwnerOrMechanic = ['owner', 'owner_mechanic', 'mechanic'].includes(staffRole);\n  const showCustomerViewSwitch = !isAdmin && !isOwnerOrMechanic;\n  const canConfigureReadyPayment = membership?.role === 'mechanic' || membership?.role === 'owner_mechanic';",
    "settings role visibility",
)
settings = settings.replace("if (!workshop || !isOwner) return setDemo(EMPTY_DEMO);", "if (!workshop || !isAdmin) return setDemo(EMPTY_DEMO);")
settings = settings.replace("}, [workshop, isOwner]);", "}, [workshop, isAdmin]);")
customer_switch = "    <AnimatedPressable onPress={async () => { const error = await setAccountMode('customer'); if (error) Alert.alert('Geçiş yapılamadı', error); }} style={[styles.modeCard, { backgroundColor: `${colors.cyan}11`, borderColor: `${colors.cyan}40` }]}><View style={[styles.modeIcon, { backgroundColor: `${colors.cyan}18` }]}><AnimatedMotorcycleIcon size={31} color={colors.cyan} /></View><View style={styles.copy}><Text style={[styles.modeTitle, { color: colors.text }]}>Müşteri görünümüne geç</Text><Text style={[styles.modeText, { color: colors.textMuted }]}>Randevu, ek işlem onayı, motor, servis ve müşteri bildirimlerini test et.</Text></View><Ionicons name=\"chevron-forward\" size={20} color={colors.cyan} /></AnimatedPressable>"
settings = replace_once(settings, customer_switch, "    {showCustomerViewSwitch && " + customer_switch.strip() + "}", "customer view role gate")
settings = replace_once(settings, "    {isOwner && <SettingsAccordion title=\"Pilot Test Atölyesi\"", "    {isAdmin && <SettingsAccordion title=\"Pilot Test Atölyesi\"", "admin-only pilot workshop")
settings = replace_once(
    settings,
    "    <ScreenHeader eyebrow=\"PİLOT VE YAYIN\" title=\"Ayarlar\" subtitle=\"Tema, bildirim, rol güvenliği, pilot test ve Google Play hazırlığı.\" />",
    "    <ScreenHeader eyebrow=\"AYARLAR VE YAYIN\" title=\"Ayarlar\" subtitle=\"Tema, bildirim, rol güvenliği ve Google Play hazırlığı.\" />",
    "settings header",
)
old_app = "    <SettingsAccordion title=\"Uygulama\" subtitle={`${APP_VERSION_LABEL} • Google Play Final Adayı`} icon=\"information-circle\" accent={colors.green} open={openSection === 'app'} onToggle={() => toggleSection('app')}>\n      <GlassCard style={styles.info}><Info icon=\"layers\" label=\"Sürüm\" value={`${APP_VERSION_LABEL} • Google Play Final Adayı`} /><Info icon=\"shield-checkmark\" label=\"Motor Hazır kuralı\" value=\"Ücret isteğe bağlı • Tahsilat veya borç tutarı Net Fiyat olabilir\" /><Info icon=\"key\" label=\"İmza güvenliği\" value=\"Kalıcı DraBornGarage production upload keystore\" /><Info icon=\"archive\" label=\"Bu sürüm öncesi yedek\" value=\"backup/v1.0.8-production-before-v1.0.0-final-20260716\" /><Info icon=\"refresh\" label=\"Geri alma\" value=\"Kod ve veritabanıyla v1.0.8 Production\" /><Info icon=\"phone-portrait\" label=\"Test yöntemi\" value=\"Gerçek keystore imzalı Production APK\" /><Info icon=\"storefront\" label=\"Mağaza durumu\" value=\"Son cihaz testleri • sonraki adım v1.0 Final AAB\" /></GlassCard>\n    </SettingsAccordion>"
new_app = "    <SettingsAccordion title=\"Uygulama\" subtitle={`${APP_VERSION_LABEL} • Google Play Öncesi Test Adayı`} icon=\"information-circle\" accent={colors.green} open={openSection === 'app'} onToggle={() => toggleSection('app')}>\n      <GlassCard style={styles.info}><Info icon=\"layers\" label=\"Sürüm\" value={`${APP_VERSION_LABEL} • Google Play Öncesi Test Adayı`} /><Info icon=\"shield-checkmark\" label=\"Motor Hazır kuralı\" value=\"Ücret isteğe bağlı • Tahsilat veya borç tutarı Net Fiyat olabilir\" /><Info icon=\"key\" label=\"İmza güvenliği\" value=\"Kalıcı DraBornGarage production upload keystore\" /><Info icon=\"archive\" label=\"Bu sürüm öncesi yedek\" value=\"backup/v1.1.3-before-v1.1.4-20260716\" /><Info icon=\"refresh\" label=\"Geri alma\" value=\"Kod ve veritabanıyla v1.1.3\" /><Info icon=\"phone-portrait\" label=\"Test yöntemi\" value=\"Gerçek keystore imzalı Production APK\" /><Info icon=\"storefront\" label=\"Mağaza durumu\" value=\"Push cihaz testi ve Play Console beyanları bekleniyor\" /></GlassCard>\n    </SettingsAccordion>"
settings = replace_once(settings, old_app, new_app, "current app release card")
write(settings_path, settings)


# ---------------------------------------------------------------------------
# Customer lists: first 4, then 10 more per tap
# ---------------------------------------------------------------------------
memory_path = "src/screens/CustomerMemoryScreen.tsx"
memory = read(memory_path)
memory = replace_once(memory, "type ScreenMode = 'memory' | 'management';", "type ScreenMode = 'memory' | 'management';\nconst INITIAL_CUSTOMER_COUNT = 4;\nconst CUSTOMER_PAGE_INCREMENT = 10;", "memory pagination constants")
memory = replace_once(memory, "  const [query, setQuery] = useState('');", "  const [query, setQuery] = useState('');\n  const [visibleCustomerCount, setVisibleCustomerCount] = useState(INITIAL_CUSTOMER_COUNT);", "memory pagination state")
memory = replace_once(memory, "  useEffect(() => { setMode(initialTab === 'claims' ? 'management' : 'memory'); }, [initialTab]);", "  useEffect(() => { setMode(initialTab === 'claims' ? 'management' : 'memory'); }, [initialTab]);\n  useEffect(() => { setVisibleCustomerCount(INITIAL_CUSTOMER_COUNT); }, [query, workshop?.id]);", "memory pagination reset")
memory = replace_once(memory, "  }, [query, customers, motorcycles]);", "  }, [query, customers, motorcycles]);\n  const displayedCustomers = visibleCustomers.slice(0, visibleCustomerCount);\n  const remainingCustomers = Math.max(0, visibleCustomers.length - displayedCustomers.length);", "memory displayed customers")
memory = replace_once(memory, "    {visibleCustomers.map((customer) => {", "    {displayedCustomers.map((customer) => {", "memory paged map")
memory = replace_once(
    memory,
    "    {visibleCustomers.length === 0 && <GlassCard style={styles.empty}",
    "    {remainingCustomers > 0 && <AnimatedPressable onPress={() => setVisibleCustomerCount((count) => count + CUSTOMER_PAGE_INCREMENT)} style={[styles.moreButton, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}45` }]}><Ionicons name=\"chevron-down-circle\" size={21} color={colors.primary} /><Text style={[styles.moreButtonText, { color: colors.primary }]}>Daha Fazla • {Math.min(CUSTOMER_PAGE_INCREMENT, remainingCustomers)} müşteri göster</Text></AnimatedPressable>}\n\n    {visibleCustomers.length === 0 && <GlassCard style={styles.empty}",
    "memory more button",
)
memory = replace_once(memory, "  empty: { alignItems: 'center', gap: 8, paddingVertical: 30 },", "  moreButton: { minHeight: 52, borderWidth: 1, borderRadius: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },\n  moreButtonText: { fontSize: 13, fontWeight: '900' },\n  empty: { alignItems: 'center', gap: 8, paddingVertical: 30 },", "memory more styles")
write(memory_path, memory)

customers_path = "src/screens/CustomersScreen.tsx"
customers = read(customers_path)
customers = replace_once(customers, "type Tab = 'customers' | 'claims';", "type Tab = 'customers' | 'claims';\nconst INITIAL_CUSTOMER_COUNT = 4;\nconst CUSTOMER_PAGE_INCREMENT = 10;", "customers pagination constants")
customers = replace_once(customers, "  const [query, setQuery] = useState('');", "  const [query, setQuery] = useState('');\n  const [visibleCustomerCount, setVisibleCustomerCount] = useState(INITIAL_CUSTOMER_COUNT);", "customers pagination state")
customers = replace_once(customers, "  useEffect(() => { setTab(initialTab); }, [initialTab]);", "  useEffect(() => { setTab(initialTab); }, [initialTab]);\n  useEffect(() => { setVisibleCustomerCount(INITIAL_CUSTOMER_COUNT); }, [query, workshop?.id, tab]);", "customers pagination reset")
customers = replace_once(customers, "  const pendingClaims = claims.filter((item) => item.status === 'pending');", "  const displayedCustomers = visible.slice(0, visibleCustomerCount);\n  const remainingCustomers = Math.max(0, visible.length - displayedCustomers.length);\n  const pendingClaims = claims.filter((item) => item.status === 'pending');", "customers displayed list")
customers = replace_once(customers, "      {visible.map((customer) => {", "      {displayedCustomers.map((customer) => {", "customers paged map")
customers = replace_once(
    customers,
    "      {visible.length === 0 && <GlassCard style={styles.empty}",
    "      {remainingCustomers > 0 && <AnimatedPressable onPress={() => setVisibleCustomerCount((count) => count + CUSTOMER_PAGE_INCREMENT)} style={[styles.moreButton, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}45` }]}><Ionicons name=\"chevron-down-circle\" size={21} color={colors.primary} /><Text style={[styles.moreButtonText, { color: colors.primary }]}>Daha Fazla • {Math.min(CUSTOMER_PAGE_INCREMENT, remainingCustomers)} müşteri göster</Text></AnimatedPressable>}\n      {visible.length === 0 && <GlassCard style={styles.empty}",
    "customers more button",
)
customers = replace_once(customers, "empty: { alignItems: 'center', gap: 8, paddingVertical: 28 },", "moreButton: { minHeight: 52, borderWidth: 1, borderRadius: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, moreButtonText: { fontSize: 13, fontWeight: '900' }, empty: { alignItems: 'center', gap: 8, paddingVertical: 28 },", "customers more styles")
write(customers_path, customers)


# ---------------------------------------------------------------------------
# Supabase channel migration + rollback
# ---------------------------------------------------------------------------
migration = """-- DraBornGarage v1.1.4\n-- Fresh Android v7 channel identifiers for reliable user-controlled sound behavior.\nbegin;\n\ncreate or replace function public.notification_channel_id(p_sound text)\nreturns text\nlanguage sql\nimmutable\nset search_path=public\nas $$\n  select case p_sound\n    when 'garage_chime' then 'draborngarage-appointment-chime-v7'\n    when 'garage_pulse' then 'draborngarage-workshop-pulse-v7'\n    when 'garage_alert' then 'draborngarage-urgent-alert-v7'\n    when 'garage_bell' then 'draborngarage-classic-bell-v7'\n    when 'garage_siren' then 'draborngarage-siren-v7'\n    when 'garage_turbo' then 'draborngarage-turbo-v7'\n    when 'garage_metal' then 'draborngarage-metal-v7'\n    when 'garage_digital' then 'draborngarage-digital-v7'\n    when 'garage_retro' then 'draborngarage-retro-v7'\n    when 'silent' then 'draborngarage-silent-v7'\n    else 'draborngarage-system-default-v7'\n  end;\n$$;\n\nrevoke all on function public.notification_channel_id(text) from public,anon,authenticated;\ncommit;\n"""
rollback = migration.replace("v1.1.4", "v1.1.4 rollback").replace("-v7", "-v6")
write("supabase/migrations/20260716230000_v1_1_4_notification_channels_v7.sql", migration)
write("supabase/rollback/20260716230000_v1_1_4_notification_channels_v7_rollback.sql", rollback)


# ---------------------------------------------------------------------------
# README, handoff and Google Play checklist
# ---------------------------------------------------------------------------
readme = read("README.md")
readme = readme.replace("**v1.1.3 — Expo SDK 54 Push Token Modülü Düzeltmesi**", "**v1.1.4 — Yayın Öncesi Bildirim, Rol ve Liste Düzenlemesi**")
readme = readme.replace("`v1.1.0`, `v1.1.1`, `v1.1.2`, ardından `v1.1.3`…", "`v1.1.0`, `v1.1.1`, `v1.1.2`, `v1.1.3`, ardından `v1.1.4`…")
insert_marker = "## v1.1.3 düzeltmeleri\n"
v114_section = "## v1.1.4 düzeltmeleri\n\n- Expo servisinin kabul ettiği RFC 4122 UUID biçiminde kalıcı cihaz kimliği oluşturulur; eski geçersiz `garage-...` kimliği temizlenir.\n- Android bildirim kanalları v7 kimlikleriyle oluşturulur; yüksek önem ve güçlü titreşim korunur.\n- Ses seçildiğinde seçilen kanal anında önizlenir.\n- Bildirim Sesi ve Bildirim Tercihleri ana açılır/kapanır kategorilere dönüştürülür.\n- Telefonun genel ses seviyesi habersiz değiştirilmez; kullanıcı doğrudan Android bildirim ayarına yönlendirilir.\n- Pilot Test Atölyesi yalnız Admin’e görünür; işletme sahibi ve usta hesaplarında Müşteri Görünümüne Geç kartı gösterilmez.\n- Müşteri Hafızası ve Müşteriler ekranı ilk 4 kaydı gösterir; her Daha Fazla dokunuşunda 10 kayıt daha açılır.\n- Güncel geri alma noktası `backup/v1.1.3-before-v1.1.4-20260716` olarak tanımlanır.\n\n"
readme = replace_once(readme, insert_marker, v114_section + insert_marker, "README v1.1.4 section")
write("README.md", readme)

handoff_path = "docs/PROJECT_HANDOFF_V0.8.2.md"
handoff = read(handoff_path)
handoff = handoff.replace("**Güncel geliştirme sürümü:** `v1.1.3`", "**Güncel geliştirme sürümü:** `v1.1.4`")
handoff = handoff.replace("içerik v1.1.3 ile günceldir", "içerik v1.1.4 ile günceldir")
handoff = handoff.replace("`v1.1.0`, `v1.1.1`, `v1.1.2`, `v1.1.3`", "`v1.1.0`, `v1.1.1`, `v1.1.2`, `v1.1.3`, `v1.1.4`")
handoff = handoff.replace("## v1.1.3 — Push token modülü düzeltmesi", "## v1.1.4 — Yayın öncesi son düzenlemeler\n\n- Geçersiz cihaz kimliği yerine RFC 4122 UUID v4 kullanılır.\n- Android bildirim kanalları v7’ye taşınır; ses seçimi anında önizlenir.\n- Bildirim Sesi ve Bildirim Tercihleri açılır/kapanır ana kategorilerdir.\n- Telefon sesini zorla yükseltmek yerine Android bildirim ayarına açık kullanıcı yönlendirmesi sunulur.\n- Pilot Test Atölyesi yalnız Admin’e görünür.\n- İşletme sahibi ve usta hesaplarında Müşteri Görünümüne Geç gösterilmez.\n- Müşteri listeleri 4 kayıtla başlar ve her dokunuşta 10 kayıt daha açılır.\n- Geri alma dalı: `backup/v1.1.3-before-v1.1.4-20260716`.\n\n## v1.1.3 — Push token modülü düzeltmesi")
handoff = handoff.replace("## v1.1.3 Termux yedek + kurulum", "## v1.1.4 Termux yedek + kurulum")
handoff = handoff.replace('KURULAN_SURUM="v1.1.3"', 'KURULAN_SURUM="v1.1.4"')
handoff = handoff.replace('YEDEKLENEN_SURUM="v1.1.2"', 'YEDEKLENEN_SURUM="v1.1.3"')
handoff = handoff.replace("oluşturulan `v1.1.2` yedek klasörünü", "oluşturulan `v1.1.3` yedek klasörünü")
write(handoff_path, handoff)

policy_path = "docs/GOOGLE_PLAY_POLICY_CHECKLIST.md"
policy = read(policy_path)
policy = policy.replace("**Geliştirme sürümü:** v1.1.0", "**Geliştirme sürümü:** v1.1.4")
policy = policy.replace("- Platform bedeli kullanıcı ödemesi olarak uygulama içinde tahsil edilmez; işletme ile Admin arasındaki kayıt/takip akışıdır.", "- Platform bedeli kullanıcı ödemesi olarak uygulama içinde tahsil edilmez; işletme ile Admin arasındaki kayıt/takip akışıdır.\n- Uygulama telefonun genel bildirim sesini habersiz veya zorla yükseltmez; ses düzeyi ve kanal davranışı Android kullanıcı ayarına bırakılır.\n- Pilot test araçları yalnız Admin rolüne görünür; üretim kullanıcılarının iş akışından gizlenir.")
policy = policy.replace("Aşağıdakiler tamamlanmadan production AAB yüklenmez:", "**Kod tarafı yayın öncesi hazırdır; ancak aşağıdaki fiziksel cihaz ve Play Console adımları tamamlanmadan production AAB yüklenmez:**")
policy = policy.replace("2. Release APK kurulduktan sonra Bildirim Merkezi’nde push cihaz kaydı durumunun **Kayıtlı** görünmesi.", "2. v1.1.4 Release APK kurulduktan sonra Bildirim Merkezi’nde push cihaz kaydı durumunun **Kayıtlı** görünmesi ve Supabase’te en az bir etkin token oluşması.")
write(policy_path, policy)

print("DraBornGarage v1.1.4 patch applied")
