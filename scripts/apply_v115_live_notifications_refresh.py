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
# Version and native packages
# ---------------------------------------------------------------------------
package_path = ROOT / "package.json"
package = json.loads(package_path.read_text())
package["version"] = "1.1.5"
package.setdefault("dependencies", {})["expo-audio"] = "~1.1.1"
package_path.write_text(json.dumps(package, ensure_ascii=False, indent=2) + "\n")

app_path = ROOT / "app.json"
app = json.loads(app_path.read_text())
expo = app["expo"]
expo["version"] = "1.1.5"
expo["android"]["versionCode"] = 1
expo["ios"]["buildNumber"] = "1"
plugins = expo.setdefault("plugins", [])
if not any((isinstance(item, str) and item == "expo-audio") or (isinstance(item, list) and item and item[0] == "expo-audio") for item in plugins):
    plugins.append(["expo-audio", {"microphonePermission": False, "recordAudioAndroid": False, "enableBackgroundPlayback": False, "enableBackgroundRecording": False}])
for plugin in plugins:
    if isinstance(plugin, list) and plugin and plugin[0] == "expo-notifications":
        sounds = plugin[1].setdefault("sounds", [])
        for filename in [
            "garage_voice_appointment.wav",
            "garage_voice_customer_link.wav",
            "garage_voice_service.wav",
            "garage_voice_payment.wav",
            "garage_voice_generic.wav",
        ]:
            path = f"./assets/sounds/{filename}"
            if path not in sounds:
                sounds.append(path)
app_path.write_text(json.dumps(app, ensure_ascii=False, indent=2) + "\n")


# ---------------------------------------------------------------------------
# Notification sound type and category-aware base handling
# ---------------------------------------------------------------------------
types_path = "src/notifications/types.ts"
types = read(types_path)
types = replace_once(types, "  | 'garage_retro'\n  | 'silent';", "  | 'garage_retro'\n  | 'turkish_voice'\n  | 'silent';", "voice sound type")
write(types_path, types)

permissions_path = "src/notifications/notificationPermissions.ts"
permissions = read(permissions_path)
permissions = replace_once(
    permissions,
    "export const SILENT_NOTIFICATION_CHANNEL_ID = 'draborngarage-silent-v7';\nexport const NOTIFICATION_INTRO_STORAGE_KEY = '@draborngarage/notification-intro-v114';",
    "export const SILENT_NOTIFICATION_CHANNEL_ID = 'draborngarage-silent-v7';\nexport const VOICE_APPOINTMENT_CHANNEL_ID = 'draborngarage-voice-appointment-v8';\nexport const VOICE_CUSTOMER_LINK_CHANNEL_ID = 'draborngarage-voice-customer-link-v8';\nexport const VOICE_SERVICE_CHANNEL_ID = 'draborngarage-voice-service-v8';\nexport const VOICE_PAYMENT_CHANNEL_ID = 'draborngarage-voice-payment-v8';\nexport const VOICE_GENERIC_CHANNEL_ID = 'draborngarage-voice-generic-v8';\nexport const NOTIFICATION_INTRO_STORAGE_KEY = '@draborngarage/notification-intro-v115';",
    "voice channel constants",
)
permissions = replace_once(
    permissions,
    "    [RETRO_NOTIFICATION_CHANNEL_ID, { ...common, name: 'Retro Oyun', description: 'Klasik oyun konsolu tarzında melodi.', sound: 'garage_retro.wav', vibrationPattern: [0, 100, 60, 100, 60, 320] }],\n    [SILENT_NOTIFICATION_CHANNEL_ID,",
    "    [RETRO_NOTIFICATION_CHANNEL_ID, { ...common, name: 'Retro Oyun', description: 'Klasik oyun konsolu tarzında melodi.', sound: 'garage_retro.wav', vibrationPattern: [0, 100, 60, 100, 60, 320] }],\n    [VOICE_APPOINTMENT_CHANNEL_ID, { ...common, name: 'Türkçe Ses • Randevu', description: 'Randevu geldi. Lütfen kontrol edin.', sound: 'garage_voice_appointment.wav', vibrationPattern: [0, 240, 90, 240, 90, 520] }],\n    [VOICE_CUSTOMER_LINK_CHANNEL_ID, { ...common, name: 'Türkçe Ses • Müşteri Talebi', description: 'Müşteri bağlantı talebi geldi. Lütfen kontrol edin.', sound: 'garage_voice_customer_link.wav', vibrationPattern: [0, 240, 90, 240, 90, 520] }],\n    [VOICE_SERVICE_CHANNEL_ID, { ...common, name: 'Türkçe Ses • Servis', description: 'Servis bildirimi geldi. Lütfen kontrol edin.', sound: 'garage_voice_service.wav', vibrationPattern: [0, 240, 90, 240, 90, 520] }],\n    [VOICE_PAYMENT_CHANNEL_ID, { ...common, name: 'Türkçe Ses • Ödeme', description: 'Ödeme bildirimi geldi. Lütfen kontrol edin.', sound: 'garage_voice_payment.wav', vibrationPattern: [0, 240, 90, 240, 90, 520] }],\n    [VOICE_GENERIC_CHANNEL_ID, { ...common, name: 'Türkçe Sesli Uyarı', description: 'DraBornGarage bildirimi geldi. Lütfen kontrol edin.', sound: 'garage_voice_generic.wav', vibrationPattern: [0, 240, 90, 240, 90, 520] }],\n    [SILENT_NOTIFICATION_CHANNEL_ID,",
    "voice channel definitions",
)
write(permissions_path, permissions)

base_path = "src/notifications/NotificationContextV101.tsx"
base = read(base_path)
base = replace_once(
    base,
    "import { ALERT_NOTIFICATION_CHANNEL_ID, BELL_NOTIFICATION_CHANNEL_ID, CHIME_NOTIFICATION_CHANNEL_ID, DIGITAL_NOTIFICATION_CHANNEL_ID, ensureDraBornNotificationChannels, METAL_NOTIFICATION_CHANNEL_ID, PULSE_NOTIFICATION_CHANNEL_ID, requestDeviceNotificationPermission, RETRO_NOTIFICATION_CHANNEL_ID, SILENT_NOTIFICATION_CHANNEL_ID, SIREN_NOTIFICATION_CHANNEL_ID, SYSTEM_NOTIFICATION_CHANNEL_ID, TURBO_NOTIFICATION_CHANNEL_ID } from './notificationPermissions';",
    "import { ALERT_NOTIFICATION_CHANNEL_ID, BELL_NOTIFICATION_CHANNEL_ID, CHIME_NOTIFICATION_CHANNEL_ID, DIGITAL_NOTIFICATION_CHANNEL_ID, ensureDraBornNotificationChannels, METAL_NOTIFICATION_CHANNEL_ID, PULSE_NOTIFICATION_CHANNEL_ID, requestDeviceNotificationPermission, RETRO_NOTIFICATION_CHANNEL_ID, SILENT_NOTIFICATION_CHANNEL_ID, SIREN_NOTIFICATION_CHANNEL_ID, SYSTEM_NOTIFICATION_CHANNEL_ID, TURBO_NOTIFICATION_CHANNEL_ID, VOICE_APPOINTMENT_CHANNEL_ID, VOICE_CUSTOMER_LINK_CHANNEL_ID, VOICE_GENERIC_CHANNEL_ID, VOICE_PAYMENT_CHANNEL_ID, VOICE_SERVICE_CHANNEL_ID } from './notificationPermissions';",
    "base voice imports",
)
base = replace_once(
    base,
    "  { key: 'garage_retro', label: 'Retro Oyun', subtitle: 'Klasik oyun konsolu melodisi', icon: 'musical-notes' },\n  { key: 'silent',",
    "  { key: 'garage_retro', label: 'Retro Oyun', subtitle: 'Klasik oyun konsolu melodisi', icon: 'musical-notes' },\n  { key: 'turkish_voice', label: 'Türkçe Sesli Uyarı', subtitle: 'Bildirim türüne göre Türkçe konuşan sabit uyarı', icon: 'musical-notes' },\n  { key: 'silent',",
    "voice option",
)
old_sound_helpers = """function soundFile(sound: NotificationSoundKey): string | false {
  if (sound === 'silent') return false;
  if (sound === 'system_loud') return 'default';
  const files: Partial<Record<NotificationSoundKey, string>> = {
    garage_chime: 'garage_chime.wav',
    garage_pulse: 'garage_pulse.wav',
    garage_alert: 'garage_alert.wav',
    garage_bell: 'garage_bell.wav',
    garage_siren: 'garage_siren.wav',
    garage_turbo: 'garage_turbo.wav',
    garage_metal: 'garage_metal.wav',
    garage_digital: 'garage_digital.wav',
    garage_retro: 'garage_retro.wav',
  };
  return files[sound] ?? 'default';
}

function channelId(sound: NotificationSoundKey) {
  const channels: Record<NotificationSoundKey, string> = {
    system_loud: SYSTEM_NOTIFICATION_CHANNEL_ID,
    garage_chime: CHIME_NOTIFICATION_CHANNEL_ID,
    garage_pulse: PULSE_NOTIFICATION_CHANNEL_ID,
    garage_alert: ALERT_NOTIFICATION_CHANNEL_ID,
    garage_bell: BELL_NOTIFICATION_CHANNEL_ID,
    garage_siren: SIREN_NOTIFICATION_CHANNEL_ID,
    garage_turbo: TURBO_NOTIFICATION_CHANNEL_ID,
    garage_metal: METAL_NOTIFICATION_CHANNEL_ID,
    garage_digital: DIGITAL_NOTIFICATION_CHANNEL_ID,
    garage_retro: RETRO_NOTIFICATION_CHANNEL_ID,
    silent: SILENT_NOTIFICATION_CHANNEL_ID,
  };
  return channels[sound];
}
"""
new_sound_helpers = """function voiceKind(item?: Pick<GarageNotification, 'category'> | null) {
  if (item?.category === 'appointments') return 'appointment';
  if (item?.category === 'customer_links') return 'customer_link';
  if (item?.category === 'service') return 'service';
  if (item && ['payments', 'receivables', 'platform'].includes(item.category)) return 'payment';
  return 'generic';
}

function soundFile(sound: NotificationSoundKey, item?: Pick<GarageNotification, 'category'> | null): string | false {
  if (sound === 'silent') return false;
  if (sound === 'system_loud') return 'default';
  if (sound === 'turkish_voice') {
    const kind = voiceKind(item);
    return kind === 'appointment' ? 'garage_voice_appointment.wav'
      : kind === 'customer_link' ? 'garage_voice_customer_link.wav'
        : kind === 'service' ? 'garage_voice_service.wav'
          : kind === 'payment' ? 'garage_voice_payment.wav'
            : 'garage_voice_generic.wav';
  }
  const files: Partial<Record<NotificationSoundKey, string>> = {
    garage_chime: 'garage_chime.wav', garage_pulse: 'garage_pulse.wav', garage_alert: 'garage_alert.wav',
    garage_bell: 'garage_bell.wav', garage_siren: 'garage_siren.wav', garage_turbo: 'garage_turbo.wav',
    garage_metal: 'garage_metal.wav', garage_digital: 'garage_digital.wav', garage_retro: 'garage_retro.wav',
  };
  return files[sound] ?? 'default';
}

function channelId(sound: NotificationSoundKey, item?: Pick<GarageNotification, 'category'> | null) {
  if (sound === 'turkish_voice') {
    const kind = voiceKind(item);
    return kind === 'appointment' ? VOICE_APPOINTMENT_CHANNEL_ID
      : kind === 'customer_link' ? VOICE_CUSTOMER_LINK_CHANNEL_ID
        : kind === 'service' ? VOICE_SERVICE_CHANNEL_ID
          : kind === 'payment' ? VOICE_PAYMENT_CHANNEL_ID
            : VOICE_GENERIC_CHANNEL_ID;
  }
  const channels: Record<Exclude<NotificationSoundKey, 'turkish_voice'>, string> = {
    system_loud: SYSTEM_NOTIFICATION_CHANNEL_ID, garage_chime: CHIME_NOTIFICATION_CHANNEL_ID,
    garage_pulse: PULSE_NOTIFICATION_CHANNEL_ID, garage_alert: ALERT_NOTIFICATION_CHANNEL_ID,
    garage_bell: BELL_NOTIFICATION_CHANNEL_ID, garage_siren: SIREN_NOTIFICATION_CHANNEL_ID,
    garage_turbo: TURBO_NOTIFICATION_CHANNEL_ID, garage_metal: METAL_NOTIFICATION_CHANNEL_ID,
    garage_digital: DIGITAL_NOTIFICATION_CHANNEL_ID, garage_retro: RETRO_NOTIFICATION_CHANNEL_ID,
    silent: SILENT_NOTIFICATION_CHANNEL_ID,
  };
  return channels[sound];
}
"""
base = replace_once(base, old_sound_helpers, new_sound_helpers, "category-aware sound helpers")
base = base.replace("sound: soundFile(nextPreferences.notification_sound),", "sound: soundFile(nextPreferences.notification_sound, item),")
base = base.replace("channelId: Platform.OS === 'android' ? channelId(nextPreferences.notification_sound) : undefined,", "channelId: Platform.OS === 'android' ? channelId(nextPreferences.notification_sound, item) : undefined,")
base = base.replace("? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: channelId(nextPreferences.notification_sound) }", "? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: channelId(nextPreferences.notification_sound, item) }")
base = replace_once(
    base,
    "    const appState = AppState.addEventListener('change', (state) => {\n      if (state === 'active') {\n        registerPushNotifications();\n        refresh();\n      }\n    });",
    "    const appState = AppState.addEventListener('change', (state) => {\n      if (state === 'active') {\n        registerPushNotifications();\n        refresh();\n      }\n    });\n    const activePoll = setInterval(() => {\n      if (AppState.currentState === 'active') refresh();\n    }, 20000);",
    "active notification polling",
)
base = replace_once(
    base,
    "      appState.remove();\n      tokenListener?.remove();",
    "      appState.remove();\n      clearInterval(activePoll);\n      tokenListener?.remove();",
    "poll cleanup",
)
write(base_path, base)


# ---------------------------------------------------------------------------
# v1.1.5 wrapper: direct audio preview and push delivery truth
# ---------------------------------------------------------------------------
wrapper = read("src/notifications/NotificationContextV114.tsx")
wrapper = replace_once(wrapper, "import Constants from 'expo-constants';", "import Constants from 'expo-constants';\nimport { createAudioPlayer } from 'expo-audio';\nimport * as Haptics from 'expo-haptics';", "audio preview imports")
wrapper = replace_once(
    wrapper,
    "  TURBO_NOTIFICATION_CHANNEL_ID,\n} from './notificationPermissions';",
    "  TURBO_NOTIFICATION_CHANNEL_ID,\n  VOICE_GENERIC_CHANNEL_ID,\n} from './notificationPermissions';",
    "wrapper voice import",
)
wrapper = wrapper.replace("@draborngarage/push-device-uuid-v114", "@draborngarage/push-device-uuid-v115")
wrapper = replace_once(
    wrapper,
    "    garage_retro: 'garage_retro.wav',\n  };",
    "    garage_retro: 'garage_retro.wav',\n    turkish_voice: 'garage_voice_generic.wav',\n  };",
    "wrapper voice sound file",
)
wrapper = replace_once(
    wrapper,
    "    garage_retro: RETRO_NOTIFICATION_CHANNEL_ID,\n    silent: SILENT_NOTIFICATION_CHANNEL_ID,",
    "    garage_retro: RETRO_NOTIFICATION_CHANNEL_ID,\n    turkish_voice: VOICE_GENERIC_CHANNEL_ID,\n    silent: SILENT_NOTIFICATION_CHANNEL_ID,",
    "wrapper voice channel",
)
wrapper = replace_once(
    wrapper,
    "  const [pushError, setPushError] = useState<string | null>(null);",
    "  const [pushError, setPushError] = useState<string | null>(null);\n  const [pushDeliveryError, setPushDeliveryError] = useState<string | null>(null);",
    "push delivery state",
)
old_preview = """  const previewNotificationSound = useCallback(async (sound: NotificationSoundKey) => {
    try {
      await ensureDraBornNotificationChannels();
      const permission = await Notifications.getPermissionsAsync();
      if (permission.status !== 'granted') return false;
      const option = NOTIFICATION_SOUND_OPTIONS.find((item) => item.key === sound);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: option?.label || 'Bildirim sesi seçildi',
          body: sound === 'silent' ? 'Sessiz bildirim önizlemesi.' : 'Seçtiğin bildirim sesi aktif.',
          sound: soundFile(sound),
          data: { source: 'draborngarage', soundPreview: true },
        },
        trigger: Platform.OS === 'android'
          ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: channelId(sound) }
          : null,
      });
      return true;
    } catch {
      return false;
    }
  }, []);
"""
new_preview = """  const previewNotificationSound = useCallback(async (sound: NotificationSoundKey) => {
    try {
      if (sound === 'silent') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return true;
      }
      const sources: Partial<Record<NotificationSoundKey, number>> = {
        garage_chime: require('../../assets/sounds/garage_chime.wav'),
        garage_pulse: require('../../assets/sounds/garage_pulse.wav'),
        garage_alert: require('../../assets/sounds/garage_alert.wav'),
        garage_bell: require('../../assets/sounds/garage_bell.wav'),
        garage_siren: require('../../assets/sounds/garage_siren.wav'),
        garage_turbo: require('../../assets/sounds/garage_turbo.wav'),
        garage_metal: require('../../assets/sounds/garage_metal.wav'),
        garage_digital: require('../../assets/sounds/garage_digital.wav'),
        garage_retro: require('../../assets/sounds/garage_retro.wav'),
        turkish_voice: require('../../assets/sounds/garage_voice_generic.wav'),
      };
      const source = sources[sound];
      if (source) {
        const player = createAudioPlayer(source, { downloadFirst: true });
        player.volume = 1;
        player.play();
        setTimeout(() => player.remove(), sound === 'turkish_voice' ? 6000 : 3500);
        return true;
      }
      await ensureDraBornNotificationChannels();
      const permission = await Notifications.getPermissionsAsync();
      if (permission.status !== 'granted') return false;
      await Notifications.scheduleNotificationAsync({
        content: { title: 'Telefonun Varsayılan Sesi', body: 'Android sistem bildirim sesi önizlemesi.', sound: soundFile(sound), data: { source: 'draborngarage', soundPreview: true } },
        trigger: Platform.OS === 'android'
          ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: channelId(sound) }
          : null,
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  const refreshPushHealth = useCallback(async () => {
    if (!session?.user) return setPushDeliveryError(null);
    const { data, error } = await supabase.rpc('notification_get_push_health');
    if (error) return;
    const health = data as { status?: string; error_code?: string | null; error_message?: string | null } | null;
    setPushDeliveryError(health?.status === 'error' ? [health.error_code, health.error_message].filter(Boolean).join(' • ') : null);
  }, [session?.user]);
"""
wrapper = replace_once(wrapper, old_preview, new_preview, "direct sound preview")
wrapper = replace_once(
    wrapper,
    "        setPushError(null);\n        return true;",
    "        setPushError(null);\n        void refreshPushHealth();\n        return true;",
    "refresh health after registration",
)
wrapper = wrapper.replace("  }, [base.preferences.push_notifications_enabled, fail, pushStatus, session?.user]);", "  }, [base.preferences.push_notifications_enabled, fail, pushStatus, refreshPushHealth, session?.user]);")
wrapper = replace_once(
    wrapper,
    "      if (state === 'active') void registerPushNotifications();",
    "      if (state === 'active') { void registerPushNotifications(); void refreshPushHealth(); }",
    "active push health",
)
wrapper = replace_once(
    wrapper,
    "  }, [base.preferences.push_notifications_enabled, registerPushNotifications, session?.user]);",
    "  }, [base.preferences.push_notifications_enabled, refreshPushHealth, registerPushNotifications, session?.user]);",
    "wrapper effect dependencies",
)
wrapper = replace_once(
    wrapper,
    "    pushError,\n    updatePreferences,",
    "    pushError,\n    pushDeliveryError,\n    updatePreferences,",
    "wrapper health return",
)
wrapper = replace_once(
    wrapper,
    "  }), [base, previewNotificationSound, pushError, pushStatus, registerPushNotifications, requestLocalNotifications, sendClosedAppTestNotification, updatePreferences]);",
    "  }), [base, previewNotificationSound, pushDeliveryError, pushError, pushStatus, registerPushNotifications, requestLocalNotifications, sendClosedAppTestNotification, updatePreferences]);",
    "wrapper health memo",
)
write("src/notifications/NotificationContextV115.tsx", wrapper)
(ROOT / "src/notifications/NotificationContextV114.tsx").unlink()
write("src/notifications/NotificationContext.tsx", "export * from './NotificationContextV115';\n")

center_path = "src/notifications/NotificationCenterScreen.tsx"
center = read(center_path)
center = replace_once(center, "    pushError,\n    closeCenter,", "    pushError,\n    pushDeliveryError,\n    closeCenter,", "center delivery error")
center = replace_once(
    center,
    "            {pushError && <GlassCard style={styles.permissionCard}",
    "            {pushDeliveryError && <GlassCard style={styles.permissionCard}><Ionicons name=\"cloud-offline\" size={24} color={colors.red} /><View style={styles.copy}><Text style={[styles.cardTitle, { color: colors.text }]}>Kapalı uygulama sunucu teslimi hazır değil</Text><Text style={[styles.cardText, { color: colors.textMuted }]}>{pushDeliveryError}</Text></View></GlassCard>}\n            {pushError && <GlassCard style={styles.permissionCard}",
    "center push delivery card",
)
write(center_path, center)


# ---------------------------------------------------------------------------
# App popup and notification navigation focus
# ---------------------------------------------------------------------------
app_tsx = read("App.tsx")
app_tsx = replace_once(app_tsx, "import { NotificationProvider } from './src/notifications/NotificationContext';", "import { NotificationProvider } from './src/notifications/NotificationContext';\nimport { NotificationActionPopup } from './src/notifications/NotificationActionPopup';", "popup import")
app_tsx = replace_once(app_tsx, "              <AppRoot />\n              <NotificationCenterScreen />", "              <AppRoot />\n              <NotificationActionPopup />\n              <NotificationCenterScreen />", "popup render")
write("App.tsx", app_tsx)

shell_path = "src/AppShellV102.tsx"
shell = read(shell_path)
shell = replace_once(
    shell,
    "  const [customerNavigationKey, setCustomerNavigationKey] = useState(0);",
    "  const [customerNavigationKey, setCustomerNavigationKey] = useState(0);\n  const [appointmentFocusId, setAppointmentFocusId] = useState<string | undefined>();\n  const [appointmentNavigationKey, setAppointmentNavigationKey] = useState(0);",
    "appointment navigation state",
)
shell = replace_once(
    shell,
    "      if (target === 'customers' && navigationTarget.targetSection === 'claims' && allowedForBusiness) {",
    "      if (target === 'appointments' && allowedForBusiness) {\n        const data = navigationTarget.data || {};\n        const appointmentId = typeof data.appointment_id === 'string' ? data.appointment_id : typeof data.entity_id === 'string' ? data.entity_id : undefined;\n        setAppointmentFocusId(appointmentId);\n        setAppointmentNavigationKey((value) => value + 1);\n      }\n      if (target === 'customers' && navigationTarget.targetSection === 'claims' && allowedForBusiness) {",
    "appointment navigation target",
)
shell = replace_once(shell, "        ? <AppointmentsScreen />", "        ? <AppointmentsScreen key={`appointments-${appointmentNavigationKey}`} focusAppointmentId={appointmentFocusId} />", "focused appointments screen")
write(shell_path, shell)


# ---------------------------------------------------------------------------
# Reports order
# ---------------------------------------------------------------------------
reports_path = "src/components/ReportsDashboard.tsx"
reports = read(reports_path)
old_modes = """      <ModeButton active={viewMode === 'business'} title="İşletme Raporu" subtitle="Toplam gelir ve tüm Ustalar" icon="business" accent={colors.primary} onPress={() => setViewMode('business')} />
      <ModeButton active={viewMode === 'personal'} title="Usta Raporu" subtitle="Yalnız kendi işlerin" icon="person" accent={colors.cyan} onPress={() => setViewMode('personal')} />"""
new_modes = """      <ModeButton active={viewMode === 'personal'} title="Usta Raporu" subtitle="Yalnız kendi işlerin" icon="person" accent={colors.cyan} onPress={() => setViewMode('personal')} />
      <ModeButton active={viewMode === 'business'} title="İşletme Raporu" subtitle="Toplam gelir ve tüm Ustalar" icon="business" accent={colors.primary} onPress={() => setViewMode('business')} />"""
reports = replace_once(reports, old_modes, new_modes, "report card order")
write(reports_path, reports)


# ---------------------------------------------------------------------------
# Deterministic data refresh and insert-time repair start
# ---------------------------------------------------------------------------
new_order_path = "src/screens/NewWorkOrderScreen.tsx"
new_order = read(new_order_path)
new_order = replace_once(new_order, "import { supabase } from '../lib/supabase';", "import { supabase } from '../lib/supabase';\nimport { emitDataRefresh } from '../lib/dataRefreshEvents';", "new order refresh import")
new_order = replace_once(
    new_order,
    "      status: startImmediately ? 'repair_started' : priceComplete ? 'price_entered' : 'queued',\n    }).select('id').single();",
    "      status: startImmediately ? 'repair_started' : priceComplete ? 'price_entered' : 'queued',\n      started_at: startImmediately ? new Date().toISOString() : null,\n    }).select('id').single();",
    "work order started_at",
)
new_order = replace_once(
    new_order,
    "    setSaving(false);\n    Alert.alert('Servis kaydı hazır',",
    "    setSaving(false);\n    emitDataRefresh(['work_orders','customers','motorcycles','reports']);\n    Alert.alert('Servis kaydı hazır',",
    "new order refresh emit",
)
write(new_order_path, new_order)

appointments_path = "src/screens/AppointmentsScreen.tsx"
appointments = read(appointments_path)
appointments = replace_once(appointments, "import { supabase } from '../lib/supabase';", "import { supabase } from '../lib/supabase';\nimport { emitDataRefresh, useDataRefresh } from '../lib/dataRefreshEvents';", "appointment refresh import")
appointments = replace_once(appointments, "export function AppointmentsScreen() {", "export function AppointmentsScreen({ focusAppointmentId }: { focusAppointmentId?: string }) {", "appointment focus prop")
appointments = replace_once(
    appointments,
    "  useEffect(() => { loadHistory(); }, [loadHistory]);",
    "  useEffect(() => { loadHistory(); }, [loadHistory]);\n  useDataRefresh(['appointments','customers','motorcycles'], () => Promise.all([loadBase(), loadAppointments(), loadAttention(), loadHistory()]));\n  useEffect(() => {\n    if (!focusAppointmentId) return;\n    const focused = attentionAppointments.find((item) => item.id === focusAppointmentId);\n    if (!focused) return;\n    setTab('calendar');\n    setDate(new Date(focused.scheduled_start));\n    if (isOwner) setFilterMechanic(focused.mechanic_id);\n  }, [attentionAppointments, focusAppointmentId, isOwner]);",
    "appointment focus effect",
)
appointments = replace_once(
    appointments,
    "    {tab === 'calendar' && <CalendarTab dates={dates}",
    "    {tab === 'calendar' && <CalendarTab focusAppointmentId={focusAppointmentId} dates={dates}",
    "calendar focus prop",
)
appointments = replace_once(
    appointments,
    "function CalendarTab({ dates, date, setDate, mechanics, filterMechanic, setFilterMechanic, isOwner, stats, appointments, reload, onEdit, attentionAppointments, historyAppointments, showHistory, setShowHistory }: { dates:",
    "function CalendarTab({ focusAppointmentId, dates, date, setDate, mechanics, filterMechanic, setFilterMechanic, isOwner, stats, appointments, reload, onEdit, attentionAppointments, historyAppointments, showHistory, setShowHistory }: { focusAppointmentId?: string; dates:",
    "calendar focus signature",
)
appointments = replace_once(
    appointments,
    "    {appointments.length === 0 ? <GlassCard style={styles.empty}",
    "    {appointments.length === 0 ? <GlassCard style={styles.empty}",
    "calendar empty anchor",
)
appointments = appointments.replace(
    ": appointments.map((item) => <StaffAppointmentCard key={item.id} item={item} reload={reload} onEdit={() => onEdit(item)} />)",
    ": [...appointments].sort((a, b) => a.id === focusAppointmentId ? -1 : b.id === focusAppointmentId ? 1 : 0).map((item) => <StaffAppointmentCard key={item.id} item={item} focused={item.id === focusAppointmentId} reload={reload} onEdit={() => onEdit(item)} />)",
)
appointments = replace_once(
    appointments,
    "function StaffAppointmentCard({ item, reload, onEdit }: { item: Appointment; reload: () => Promise<void>; onEdit: () => void }) {",
    "function StaffAppointmentCard({ item, focused = false, reload, onEdit }: { item: Appointment; focused?: boolean; reload: () => Promise<void>; onEdit: () => void }) {",
    "focused appointment card signature",
)
appointments = replace_once(
    appointments,
    "  return <GlassCard style={styles.appointmentCard}>",
    "  return <GlassCard style={[styles.appointmentCard, focused && { borderWidth: 2, borderColor: colors.orange }]}>",
    "focused appointment card style",
)
appointments = replace_once(
    appointments,
    "if (result.error) return Alert.alert('Randevu kaydedilemedi', result.error.message); Alert.alert(editing ? 'Randevu yeniden planlandı' : 'Randevu oluşturuldu'); onSaved();",
    "if (result.error) return Alert.alert('Randevu kaydedilemedi', result.error.message); emitDataRefresh(['appointments','reports']); Alert.alert(editing ? 'Randevu yeniden planlandı' : 'Randevu oluşturuldu'); onSaved();",
    "appointment save refresh",
)
write(appointments_path, appointments)

customers_path = "src/screens/CustomersScreen.tsx"
customers = read(customers_path)
customers = replace_once(customers, "import { supabase } from '../lib/supabase';", "import { supabase } from '../lib/supabase';\nimport { emitDataRefresh, useDataRefresh } from '../lib/dataRefreshEvents';", "customers refresh import")
customers = replace_once(customers, "  useEffect(() => { load(); }, [load]);", "  useEffect(() => { load(); }, [load]);\n  useDataRefresh(['customers','motorcycles','work_orders','customer_claims'], load);", "customers refresh listener")
customers = customers.replace("setShowNew(false); await load(); };", "setShowNew(false); emitDataRefresh(['customers']); await load(); };")
customers = customers.replace("setShowBike(false); await load();", "setShowBike(false); emitDataRefresh(['motorcycles','customers']); await load();")
customers = customers.replace("if (error) return Alert.alert('İşlem başarısız', error.message); await load();", "if (error) return Alert.alert('İşlem başarısız', error.message); emitDataRefresh(['customer_claims','customers','motorcycles']); await load();")
customers = customers.replace("setAccountMatches([]); setAccountPlate(''); await load();", "setAccountMatches([]); setAccountPlate(''); emitDataRefresh(['customers','motorcycles','customer_claims']); await load();")
write(customers_path, customers)

memory_path = "src/screens/CustomerMemoryScreen.tsx"
memory = read(memory_path)
memory = replace_once(memory, "import { useSmartAutoRefresh } from '../hooks/useSmartAutoRefresh';", "import { useSmartAutoRefresh } from '../hooks/useSmartAutoRefresh';\nimport { useDataRefresh } from '../lib/dataRefreshEvents';", "memory refresh import")
memory = replace_once(memory, "  useEffect(() => { load(); }, [load]);", "  useEffect(() => { load(); }, [load]);\n  useDataRefresh(['customers','motorcycles','work_orders'], () => load(true));", "memory refresh listener")
write(memory_path, memory)

orders_path = "src/screens/WorkOrdersScreen.tsx"
orders = read(orders_path)
orders = replace_once(orders, "import { supabase } from '../lib/supabase';", "import { supabase } from '../lib/supabase';\nimport { useDataRefresh } from '../lib/dataRefreshEvents';", "orders refresh import")
orders = replace_once(orders, "  useEffect(() => { load(); }, [load]);", "  useEffect(() => { load(); }, [load]);\n  useDataRefresh(['work_orders','customers','motorcycles'], () => load(true));", "orders refresh listener")
write(orders_path, orders)


# ---------------------------------------------------------------------------
# Settings, README and handoff
# ---------------------------------------------------------------------------
settings_path = "src/screens/SettingsScreen.tsx"
settings = read(settings_path)
settings = settings.replace("backup/v1.1.3-before-v1.1.4-20260716", "backup/v1.1.4-final-before-v1.1.5-20260717-02")
settings = settings.replace("Kod ve veritabanıyla v1.1.3", "Kod ve veritabanıyla v1.1.4")
settings = settings.replace("Push cihaz testi ve Play Console beyanları bekleniyor", "FCM V1 anahtarı ve son gerçek cihaz testleri bekleniyor")
write(settings_path, settings)

readme = read("README.md")
readme = readme.replace("**v1.1.4 — Yayın Öncesi Bildirim, Rol ve Liste Düzenlemesi**", "**v1.1.5 — Gerçek Push Teslimi, Aksiyon Popup ve Canlı Yenileme**")
readme = readme.replace("`v1.1.3`, ardından `v1.1.4`…", "`v1.1.3`, `v1.1.4`, ardından `v1.1.5`…")
marker = "## v1.1.4 düzeltmeleri\n"
section = "## v1.1.5 düzeltmeleri\n\n- Expo push HTTP isteğinin yalnız kuyruğa alınması artık teslim edildi sayılmaz; Expo ticket yanıtları ayrı tabloda doğrulanır.\n- `InvalidCredentials` gibi FCM V1 hataları Bildirim Merkezi'nde görünür ve sahte `push_sent_at` kaydı oluşturmaz.\n- Atanmış Ustaya müşteri randevusu beklediği sürece 5 dakikada bir aksiyon bildirimi hazırlanır.\n- Uygulama açıldığında yeni randevu ve müşteri eşleştirme talebi için modern yönlendirme popup'ı açılır.\n- Zil önizlemesi Android bildirim kanalına bağlı kalmadan `expo-audio` ile doğrudan çalınır.\n- Türkçe Sesli Uyarı seçeneği eklendi; randevu, müşteri bağlantısı, servis ve ödeme için ayrı sabit Türkçe ses dosyaları kullanılır.\n- Rapor Merkezi'nde Usta Raporu ve İşletme Raporu kartlarının sırası değiştirildi.\n- Hemen Başla servis kayıtlarında `started_at` ilk kayıtta yazılır.\n- Servis, randevu, müşteri, motosiklet ve eşleştirme işlemlerinden sonra ortak veri yenileme olayı gönderilir.\n- Geri alma dalı: `backup/v1.1.4-final-before-v1.1.5-20260717-02`.\n\n"
readme = replace_once(readme, marker, section + marker, "README v1.1.5")
if "FCM_V1_SETUP.md" not in readme:
    readme = readme.replace("- [Google Play politika kontrolü](docs/GOOGLE_PLAY_POLICY_CHECKLIST.md)", "- [Google Play politika kontrolü](docs/GOOGLE_PLAY_POLICY_CHECKLIST.md)\n- [Android FCM V1 kurulumu](docs/FCM_V1_SETUP.md)")
write("README.md", readme)

handoff_path = "docs/PROJECT_HANDOFF_V0.8.2.md"
handoff = read(handoff_path)
handoff = handoff.replace("**Güncel geliştirme sürümü:** `v1.1.4`", "**Güncel geliştirme sürümü:** `v1.1.5`")
handoff = handoff.replace("içerik v1.1.4 ile günceldir", "içerik v1.1.5 ile günceldir")
handoff = handoff.replace("`v1.1.3`, `v1.1.4`", "`v1.1.3`, `v1.1.4`, `v1.1.5`")
handoff = handoff.replace("## v1.1.4 — Yayın öncesi son düzenlemeler", "## v1.1.5 — Gerçek bildirim ve canlı veri düzenlemesi\n\n- Expo push ticket yanıtları doğrulanır; gerçek teslim olmadan `push_sent_at` yazılmaz.\n- Atanmış Ustaya bekleyen müşteri randevusu için 5 dakikalık aksiyon hatırlatması hazırlanır.\n- Randevu ve müşteri bağlantı talepleri uygulama açılış popup'ından ilgili ekrana yönlenir.\n- Bildirim sesi önizlemesi doğrudan ses oynatıcıyla çalışır.\n- Türkçe konuşan kategori sesleri eklendi.\n- Hemen Başla servisinde başlangıç tarih-saat bilgisi ilk kayıtta oluşturulur.\n- Ortak veri yenileme sinyali servis, randevu, müşteri, motor ve eşleştirme akışlarında kullanılır.\n- FCM V1 Service Account anahtarı Expo/EAS'e ayrıca yüklenmelidir: `docs/FCM_V1_SETUP.md`.\n- Geri alma dalı: `backup/v1.1.4-final-before-v1.1.5-20260717-02`.\n\n## v1.1.4 — Yayın öncesi son düzenlemeler")
handoff = handoff.replace("## v1.1.4 Termux yedek + kurulum", "## v1.1.5 Termux yedek + kurulum")
handoff = handoff.replace('KURULAN_SURUM="v1.1.4"', 'KURULAN_SURUM="v1.1.5"')
handoff = handoff.replace('YEDEKLENEN_SURUM="v1.1.3"', 'YEDEKLENEN_SURUM="v1.1.4"')
handoff = handoff.replace("oluşturulan `v1.1.3` yedek klasörünü", "oluşturulan `v1.1.4` yedek klasörünü")
write(handoff_path, handoff)

print('DraBornGarage v1.1.5 patch applied')
