from __future__ import annotations

import json
import math
import re
import struct
import wave
from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


def replace_required(path: str, before: str, after: str, count: int = 1) -> None:
    source = read(path)
    if before not in source:
        raise RuntimeError(f"{path}: hedef bulunamadı\n{before[:700]}")
    write(path, source.replace(before, after, count))


def regex_required(path: str, pattern: str, replacement: str, count: int = 1) -> None:
    source = read(path)
    updated, total = re.subn(pattern, replacement, source, count=count, flags=re.S)
    if total != count:
        raise RuntimeError(f"{path}: regex hedef sayısı {total}, beklenen {count}\n{pattern[:500]}")
    write(path, updated)


def make_sound(path: str, notes: list[tuple[float, float, float, float]], sr: int = 22050, volume: float = 0.35) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    frames = bytearray()
    for frequency, duration, gap, decay in notes:
        for index in range(int(sr * duration)):
            time = index / sr
            envelope = (1 - math.exp(-time * 40)) * math.exp(-time * decay)
            value = (math.sin(2 * math.pi * frequency * time) + 0.22 * math.sin(2 * math.pi * frequency * 2 * time)) * envelope * volume
            frames += struct.pack('<h', max(-32767, min(32767, int(value * 32767))))
        frames += b'\x00\x00' * int(sr * gap)
    with wave.open(str(target), 'wb') as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(sr)
        output.writeframes(frames)


# ---------------------------------------------------------------------------
# Native sound assets
# ---------------------------------------------------------------------------
make_sound('assets/sounds/garage_chime.wav', [(659.25, .14, .03, 7), (987.77, .22, .01, 6)])
make_sound('assets/sounds/garage_pulse.wav', [(523.25, .10, .04, 9), (659.25, .10, .04, 9), (783.99, .18, .01, 7)])
make_sound('assets/sounds/garage_alert.wav', [(880, .09, .035, 10), (880, .09, .035, 10), (1174.66, .18, .01, 7)])

# ---------------------------------------------------------------------------
# Notification data types
# ---------------------------------------------------------------------------
replace_required(
    'src/notifications/types.ts',
    "export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';",
    "export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';\nexport type NotificationSoundKey = 'garage_chime' | 'garage_pulse' | 'garage_alert' | 'silent';\nexport type PushRegistrationStatus = 'idle' | 'registered' | 'expo_go' | 'missing_project' | 'denied' | 'error';",
)
replace_required(
    'src/notifications/types.ts',
    "  customer_link_updates: boolean;\n  updated_at?: string | null;",
    "  customer_link_updates: boolean;\n  notification_sound: NotificationSoundKey;\n  push_notifications_enabled: boolean;\n  updated_at?: string | null;",
)

# ---------------------------------------------------------------------------
# Notification context: sounds, push token registration and killed-app routing
# ---------------------------------------------------------------------------
replace_required(
    'src/notifications/NotificationContext.tsx',
    "import * as Notifications from 'expo-notifications';",
    "import Constants from 'expo-constants';\nimport * as Notifications from 'expo-notifications';",
)
replace_required(
    'src/notifications/NotificationContext.tsx',
    "  NotificationPreferences,\n} from './types';",
    "  NotificationPreferences,\n  NotificationSoundKey,\n  PushRegistrationStatus,\n} from './types';",
)
replace_required(
    'src/notifications/NotificationContext.tsx',
    "    shouldPlaySound: false,",
    "    shouldPlaySound: true,",
)
regex_required(
    'src/notifications/NotificationContext.tsx',
    r"const CHANNEL_ID = 'draborngarage-alerts';\nconst DELIVERED_STORAGE_PREFIX = '@draborngarage/local-delivered/';",
    """const DELIVERED_STORAGE_PREFIX = '@draborngarage/local-delivered/';
const DEVICE_ID_STORAGE_KEY = '@draborngarage/push-device-id';
const PUSH_TOKEN_STORAGE_KEY = '@draborngarage/expo-push-token';
const IS_EXPO_GO = Constants.appOwnership === 'expo';

export const NOTIFICATION_SOUND_OPTIONS: { key: NotificationSoundKey; label: string; subtitle: string; icon: 'musical-notes' | 'pulse' | 'alert-circle' | 'volume-mute' }[] = [
  { key: 'garage_chime', label: 'Garage Chime', subtitle: 'Modern ve dengeli', icon: 'musical-notes' },
  { key: 'garage_pulse', label: 'Garage Pulse', subtitle: 'Kısa ve enerjik', icon: 'pulse' },
  { key: 'garage_alert', label: 'Garage Alert', subtitle: 'Daha dikkat çekici', icon: 'alert-circle' },
  { key: 'silent', label: 'Sessiz', subtitle: 'Yalnız titreşim', icon: 'volume-mute' },
];

function soundFile(sound: NotificationSoundKey): string | false {
  if (sound === 'silent') return false;
  if (IS_EXPO_GO) return 'default';
  return `${sound}.wav`;
}

function channelId(sound: NotificationSoundKey) {
  if (sound === 'garage_pulse') return 'draborngarage-pulse-v1';
  if (sound === 'garage_alert') return 'draborngarage-alert-v1';
  if (sound === 'silent') return 'draborngarage-silent-v1';
  return 'draborngarage-chime-v1';
}
""",
)
replace_required(
    'src/notifications/NotificationContext.tsx',
    "  customer_link_updates: true,\n};",
    "  customer_link_updates: true,\n  notification_sound: 'garage_chime',\n  push_notifications_enabled: true,\n};",
)
replace_required(
    'src/notifications/NotificationContext.tsx',
    "  permissionStatus: string;\n  navigationTarget: NotificationNavigationTarget | null;",
    "  permissionStatus: string;\n  pushStatus: PushRegistrationStatus;\n  navigationTarget: NotificationNavigationTarget | null;",
)
replace_required(
    'src/notifications/NotificationContext.tsx',
    "  requestLocalNotifications: () => Promise<boolean>;\n  sendTestNotification: () => Promise<boolean>;",
    "  requestLocalNotifications: () => Promise<boolean>;\n  registerPushNotifications: () => Promise<boolean>;\n  sendTestNotification: () => Promise<boolean>;",
)
regex_required(
    'src/notifications/NotificationContext.tsx',
    r"async function ensureAndroidChannel\(\) \{.*?\n\}",
    """async function ensureAndroidChannels() {
  if (Platform.OS !== 'android') return;
  const channels: { key: NotificationSoundKey; name: string; description: string; vibrationPattern: number[] }[] = [
    { key: 'garage_chime', name: 'Garage Chime', description: 'Modern ve dengeli DraBornGarage bildirim sesi', vibrationPattern: [0, 180, 90, 180] },
    { key: 'garage_pulse', name: 'Garage Pulse', description: 'Kısa ve enerjik DraBornGarage bildirim sesi', vibrationPattern: [0, 120, 70, 120, 70, 160] },
    { key: 'garage_alert', name: 'Garage Alert', description: 'Ödeme ve acil hareketler için dikkat çekici ses', vibrationPattern: [0, 230, 90, 230, 90, 260] },
    { key: 'silent', name: 'DraBornGarage Sessiz', description: 'Ses olmadan titreşimli bildirim', vibrationPattern: [0, 180, 100, 180] },
  ];
  await Promise.all(channels.map((item) => Notifications.setNotificationChannelAsync(channelId(item.key), {
    name: item.name,
    description: item.description,
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: item.vibrationPattern,
    lightColor: item.key === 'garage_alert' ? '#FF5E78' : '#7C5CFF',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    sound: soundFile(item.key) || null,
  })));
}
""",
)
replace_required(
    'src/notifications/NotificationContext.tsx',
    "    targetSection: typeof item.data?.target_section === 'string' ? item.data.target_section : undefined,\n    ...item.data,",
    "    targetSection: typeof item.data?.target_section === 'string' ? item.data.target_section : undefined,\n    workshopId: item.workshop_id ?? undefined,\n    workshop_id: item.workshop_id ?? undefined,\n    notificationType: item.notification_type,\n    notification_type: item.notification_type,\n    entityId: item.entity_id ?? undefined,\n    entity_id: item.entity_id ?? undefined,\n    ...item.data,",
)
replace_required(
    'src/notifications/NotificationContext.tsx',
    "  const [permissionStatus, setPermissionStatus] = useState<string>('undetermined');\n  const [navigationTarget, setNavigationTarget]",
    "  const [permissionStatus, setPermissionStatus] = useState<string>('undetermined');\n  const [pushStatus, setPushStatus] = useState<PushRegistrationStatus>('idle');\n  const [navigationTarget, setNavigationTarget]",
)
replace_required(
    'src/notifications/NotificationContext.tsx',
    "      await ensureAndroidChannel();",
    "      await ensureAndroidChannels();",
    count=1,
)
replace_required(
    'src/notifications/NotificationContext.tsx',
    "            sound: false,\n            badge: unreadCount + 1,",
    "            sound: soundFile(nextPreferences.notification_sound),\n            badge: unreadCount + 1,",
    count=1,
)
replace_required(
    'src/notifications/NotificationContext.tsx',
    "            channelId: Platform.OS === 'android' ? CHANNEL_ID : undefined,",
    "            channelId: Platform.OS === 'android' ? channelId(nextPreferences.notification_sound) : undefined,",
    count=1,
)
replace_required(
    'src/notifications/NotificationContext.tsx',
    "  const requestLocalNotifications = useCallback(async () => {",
    """  const registerPushNotifications = useCallback(async () => {
    if (!session?.user || !preferences.push_notifications_enabled) return false;
    if (Platform.OS === 'android' && IS_EXPO_GO) {
      setPushStatus('expo_go');
      return false;
    }
    try {
      await ensureAndroidChannels();
      const permission = await Notifications.getPermissionsAsync();
      if (permission.status !== 'granted') {
        setPushStatus('denied');
        return false;
      }
      const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID
        || Constants.expoConfig?.extra?.eas?.projectId
        || Constants.easConfig?.projectId;
      if (!projectId) {
        setPushStatus('missing_project');
        return false;
      }
      let deviceId = await AsyncStorage.getItem(DEVICE_ID_STORAGE_KEY);
      if (!deviceId) {
        deviceId = `garage-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
        await AsyncStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
      }
      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      const { error } = await supabase.rpc('notification_register_push_token', {
        p_expo_push_token: token,
        p_device_id: deviceId,
        p_platform: Platform.OS,
        p_app_version: Constants.expoConfig?.version || '0.8.17',
      });
      if (error) throw error;
      await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
      setPushStatus('registered');
      return true;
    } catch {
      setPushStatus('error');
      return false;
    }
  }, [session?.user, preferences.push_notifications_enabled]);

  const requestLocalNotifications = useCallback(async () => {""",
)
# Replace all remaining old channel calls.
source = read('src/notifications/NotificationContext.tsx').replace('ensureAndroidChannel()', 'ensureAndroidChannels()')
write('src/notifications/NotificationContext.tsx', source)
replace_required(
    'src/notifications/NotificationContext.tsx',
    "       setPreferences(merged);\n       await syncLocalSchedules(upcoming, merged);\n       return true;",
    "       setPreferences(merged);\n       await syncLocalSchedules(upcoming, merged);\n       if (merged.push_notifications_enabled) await registerPushNotifications();\n       return true;",
)
replace_required(
    'src/notifications/NotificationContext.tsx',
    "   }, [preferences, upcoming, syncLocalSchedules]);",
    "   }, [preferences, upcoming, syncLocalSchedules, registerPushNotifications]);",
    count=1,
)
replace_required(
    'src/notifications/NotificationContext.tsx',
    "          sound: false,\n          badge: unreadCount + 1,",
    "          sound: soundFile(preferences.notification_sound),\n          badge: unreadCount + 1,",
    count=1,
)
replace_required(
    'src/notifications/NotificationContext.tsx',
    "        trigger: null,\n      });",
    "        trigger: Platform.OS === 'android' ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: channelId(preferences.notification_sound) } : null,\n      });",
    count=1,
)
replace_required(
    'src/notifications/NotificationContext.tsx',
    "  }, [session?.user, preferences.local_notifications_enabled, unreadCount]);",
    "  }, [session?.user, preferences.local_notifications_enabled, preferences.notification_sound, unreadCount]);",
)
replace_required(
    'src/notifications/NotificationContext.tsx',
    "    ensureAndroidChannels().catch(() => undefined);",
    "    ensureAndroidChannels().catch(() => undefined);",
)
replace_required(
    'src/notifications/NotificationContext.tsx',
    "      setPreferences(DEFAULT_PREFERENCES);\n      cancelGarageSchedules();",
    "      setPreferences(DEFAULT_PREFERENCES);\n      setPushStatus('idle');\n      cancelGarageSchedules();",
)
replace_required(
    'src/notifications/NotificationContext.tsx',
    "    refresh();\n    const channel = supabase",
    "    refresh();\n    if (preferences.push_notifications_enabled) registerPushNotifications();\n    const channel = supabase",
)
replace_required(
    'src/notifications/NotificationContext.tsx',
    "  }, [session?.user, refresh, presentRealtimeNotification, cancelGarageSchedules]);",
    "  }, [session?.user, refresh, presentRealtimeNotification, cancelGarageSchedules, registerPushNotifications, preferences.push_notifications_enabled]);",
)
regex_required(
    'src/notifications/NotificationContext.tsx',
    r"  useEffect\(\(\) => \{\n    const response = Notifications\.addNotificationResponseReceivedListener\(\(event\) => \{.*?\n  \}, \[refresh\]\);",
    """  useEffect(() => {
    const handledResponseRef = { current: '' };
    const handleResponse = (event: Notifications.NotificationResponse | null) => {
      if (!event) return;
      const data = event.notification.request.content.data || {};
      const responseKey = `${event.notification.request.identifier}:${event.actionIdentifier}`;
      if (handledResponseRef.current === responseKey) return;
      handledResponseRef.current = responseKey;
      const notificationId = typeof data.notificationId === 'string' ? data.notificationId : typeof data.notification_id === 'string' ? data.notification_id : undefined;
      if (notificationId) supabase.rpc('notification_mark_read', { p_notification_id: notificationId }).then(() => refresh());
      setNavigationTarget({
        targetTab: typeof data.targetTab === 'string' ? data.targetTab : typeof data.target_tab === 'string' ? data.target_tab : undefined,
        targetSection: typeof data.targetSection === 'string' ? data.targetSection : typeof data.target_section === 'string' ? data.target_section : undefined,
        notificationId,
        data: data as Record<string, unknown>,
      });
      setOpen(false);
    };
    Notifications.getLastNotificationResponseAsync().then(handleResponse).catch(() => undefined);
    const response = Notifications.addNotificationResponseReceivedListener(handleResponse);
    return () => response.remove();
  }, [refresh]);""",
)
replace_required(
    'src/notifications/NotificationContext.tsx',
    "      p_customer_link_updates: merged.customer_link_updates,\n    });",
    "      p_customer_link_updates: merged.customer_link_updates,\n      p_notification_sound: merged.notification_sound,\n      p_push_notifications_enabled: merged.push_notifications_enabled,\n    });",
    count=2,
)
replace_required(
    'src/notifications/NotificationContext.tsx',
    "    if (!next.local_notifications_enabled) await cancelGarageSchedules();\n    else await syncLocalSchedules(upcoming, next);",
    "    if (!next.local_notifications_enabled) await cancelGarageSchedules();\n    else await syncLocalSchedules(upcoming, next);\n    if (next.push_notifications_enabled) await registerPushNotifications();",
)
replace_required(
    'src/notifications/NotificationContext.tsx',
    "  }, [preferences, upcoming, cancelGarageSchedules, syncLocalSchedules, refresh]);",
    "  }, [preferences, upcoming, cancelGarageSchedules, syncLocalSchedules, refresh, registerPushNotifications]);",
)
replace_required(
    'src/notifications/NotificationContext.tsx',
    "    setNavigationTarget({ targetTab, targetSection, notificationId: notification.id, data: notification.data });",
    "    setNavigationTarget({ targetTab, targetSection, notificationId: notification.id, data: { ...notification.data, workshop_id: notification.workshop_id, workshopId: notification.workshop_id, notification_type: notification.notification_type, notificationType: notification.notification_type, entity_id: notification.entity_id, entityId: notification.entity_id } });",
)
replace_required(
    'src/notifications/NotificationContext.tsx',
    "          sound: false,\n          data: { source: 'draborngarage', targetTab: 'home' },",
    "          sound: soundFile(preferences.notification_sound),\n          data: { source: 'draborngarage', targetTab: 'home' },",
)
replace_required(
    'src/notifications/NotificationContext.tsx',
    "        trigger: null,\n      });\n      return true;",
    "        trigger: Platform.OS === 'android' ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: channelId(preferences.notification_sound) } : null,\n      });\n      return true;",
)
replace_required(
    'src/notifications/NotificationContext.tsx',
    "  }, [permissionStatus, requestLocalNotifications]);",
    "  }, [permissionStatus, requestLocalNotifications, preferences.notification_sound]);",
)
replace_required(
    'src/notifications/NotificationContext.tsx',
    "    permissionStatus,\n    navigationTarget,",
    "    permissionStatus,\n    pushStatus,\n    navigationTarget,",
)
replace_required(
    'src/notifications/NotificationContext.tsx',
    "    requestLocalNotifications,\n    sendTestNotification,",
    "    requestLocalNotifications,\n    registerPushNotifications,\n    sendTestNotification,",
)
replace_required(
    'src/notifications/NotificationContext.tsx',
    "  }), [open, loading, notifications, upcoming, unreadCount, upcomingCount, preferences, permissionStatus, navigationTarget, refresh, markRead, markAllRead, archive, openNotification, updatePreferences, requestLocalNotifications, sendTestNotification, consumeNavigationTarget]);",
    "  }), [open, loading, notifications, upcoming, unreadCount, upcomingCount, preferences, permissionStatus, pushStatus, navigationTarget, refresh, markRead, markAllRead, archive, openNotification, updatePreferences, requestLocalNotifications, registerPushNotifications, sendTestNotification, consumeNavigationTarget]);",
)

# ---------------------------------------------------------------------------
# Notification center: sound chooser and stronger payment-arrived cards
# ---------------------------------------------------------------------------
replace_required(
    'src/notifications/NotificationCenterScreen.tsx',
    "import { useNotifications } from './NotificationContext';",
    "import { NOTIFICATION_SOUND_OPTIONS, useNotifications } from './NotificationContext';",
)
replace_required(
    'src/notifications/NotificationCenterScreen.tsx',
    "import { GarageNotification, NotificationCategory, NotificationPreferences } from './types';",
    "import { GarageNotification, NotificationCategory, NotificationPreferences, NotificationSoundKey } from './types';",
)
replace_required(
    'src/notifications/NotificationCenterScreen.tsx',
    "    permissionStatus,\n    closeCenter,",
    "    permissionStatus,\n    pushStatus,\n    closeCenter,",
)
replace_required(
    'src/notifications/NotificationCenterScreen.tsx',
    "    requestLocalNotifications,\n    sendTestNotification,",
    "    requestLocalNotifications,\n    registerPushNotifications,\n    sendTestNotification,",
)
replace_required(
    'src/notifications/NotificationCenterScreen.tsx',
    "  const testLocal = async () => {",
    """  const selectSound = async (sound: NotificationSoundKey) => {
    setSaving(true);
    const error = await updatePreferences({ notification_sound: sound });
    setSaving(false);
    if (error) Alert.alert('Bildirim sesi kaydedilemedi', error);
  };

  const enablePush = async () => {
    setSaving(true);
    const error = await updatePreferences({ push_notifications_enabled: true });
    const enabled = !error && await registerPushNotifications();
    setSaving(false);
    if (error) return Alert.alert('Push bildirimi açılamadı', error);
    Alert.alert(enabled ? 'Uygulama kapalı bildirimleri hazır' : 'Native APK kurulumu gerekli', enabled
      ? 'Yeni bildirimler uygulama kapalıyken de seçtiğin sesle gelebilir.'
      : 'Expo Go Android uzaktan push alamaz. EAS ile oluşturulan APK kurulduğunda bu özellik otomatik etkinleşir.');
  };

  const testLocal = async () => {""",
)
replace_required(
    'src/notifications/NotificationCenterScreen.tsx',
    "            <Text style={[styles.sectionTitle, { color: colors.text }]}>Bildirim tercihleri</Text>",
    """            <Text style={[styles.sectionTitle, { color: colors.text }]}>Bildirim sesi</Text>
            <View style={styles.soundGrid}>
              {NOTIFICATION_SOUND_OPTIONS.map((option) => <SoundChoice key={option.key} active={preferences.notification_sound === option.key} label={option.label} subtitle={option.subtitle} icon={option.icon} onPress={() => selectSound(option.key)} />)}
            </View>
            <Text style={[styles.soundHint, { color: colors.textMuted }]}>{IS_EXPO_GO_TEXT(pushStatus)}</Text>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Bildirim tercihleri</Text>""",
)
replace_required(
    'src/notifications/NotificationCenterScreen.tsx',
    "              <SettingRow icon=\"phone-portrait\" title=\"Telefon bildirimleri\" subtitle=\"Planlı hatırlatmaları cihazda göster.\" value={preferences.local_notifications_enabled} onChange={(value) => updatePreference({ local_notifications_enabled: value })} disabled={saving || permissionStatus !== 'granted'} />",
    """              <SettingRow icon="phone-portrait" title="Telefon bildirimleri" subtitle="Planlı hatırlatmaları cihazda göster." value={preferences.local_notifications_enabled} onChange={(value) => updatePreference({ local_notifications_enabled: value })} disabled={saving || permissionStatus !== 'granted'} />
              <SettingRow icon="cloud-download" title="Uygulama kapalıyken bildir" subtitle={pushStatus === 'registered' ? 'Native push cihazı kayıtlı ve aktif.' : 'APK içinde uzaktan push bağlantısını etkinleştir.'} value={preferences.push_notifications_enabled} onChange={(value) => value ? enablePush() : updatePreference({ push_notifications_enabled: false })} disabled={saving} />""",
)
replace_required(
    'src/notifications/NotificationCenterScreen.tsx',
    "Hatırlatmalar Supabase’de kullanıcıya özel hazırlanır. Uygulama açıldığında ve veri değiştiğinde canlı olarak yenilenir; yaklaşan kayıtlar telefonunda yerel bildirim olarak planlanır.",
    "Bildirimler Supabase’de kullanıcıya özel hazırlanır. Native APK içinde uygulama kapalıyken push olarak, yaklaşan kayıtlar ise seçtiğin sesle zamanlı bildirim olarak gönderilir.",
)
replace_required(
    'src/notifications/NotificationCenterScreen.tsx',
    "function NotificationCard({ item, upcoming, onOpen, onArchive }:",
    """function IS_EXPO_GO_TEXT(status: string) {
  if (status === 'registered') return 'Seçtiğin ses native push ve zamanlı bildirimlerde aktif.';
  if (status === 'expo_go') return 'Expo Go özel ses ve kapalı uygulama pushunu desteklemez; APK kurulunca seçimin aktif olur.';
  if (status === 'missing_project') return 'EAS proje kimliği eklenince kapalı uygulama pushu otomatik kaydolur.';
  return 'Sesi “Test Bildirimi Gönder” düğmesiyle dinleyebilirsin.';
}

function SoundChoice({ active, label, subtitle, icon, onPress }: { active: boolean; label: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  const { colors } = useTheme();
  return <AnimatedPressable onPress={onPress} style={[styles.soundCard, { backgroundColor: active ? `${colors.primary}17` : colors.card, borderColor: active ? colors.primary : colors.border }]}>
    <View style={[styles.soundIcon, { backgroundColor: active ? `${colors.primary}22` : colors.surfaceSoft }]}><Ionicons name={icon} size={20} color={active ? colors.primary : colors.textMuted} /></View>
    <View style={styles.copy}><Text style={[styles.soundTitle, { color: active ? colors.primary : colors.text }]}>{label}</Text><Text style={[styles.soundSubtitle, { color: colors.textMuted }]}>{subtitle}</Text></View>
    <View style={[styles.soundCheck, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary : 'transparent' }]}>{active && <Ionicons name="checkmark" size={13} color="#fff" />}</View>
  </AnimatedPressable>;
}

function NotificationCard({ item, upcoming, onOpen, onArchive }:""",
)
replace_required(
    'src/notifications/NotificationCenterScreen.tsx',
    "  const meta = CATEGORY_META[item.category] || CATEGORY_META.system;",
    "  const incomingPayment = item.notification_type === 'platform_payment_reported';\n  const meta = incomingPayment ? { label: 'ÖDEME GELDİ', icon: 'cash' as keyof typeof Ionicons.glyphMap } : CATEGORY_META[item.category] || CATEGORY_META.system;",
)
replace_required(
    'src/notifications/NotificationCenterScreen.tsx',
    "  const accent = item.priority === 'urgent'",
    "  const accent = incomingPayment\n    ? colors.green\n    : item.priority === 'urgent'",
)
replace_required(
    'src/notifications/NotificationCenterScreen.tsx',
    "    <AnimatedPressable onPress={onOpen} style={[styles.notificationCard, { backgroundColor: unread ? `${accent}10` : colors.card, borderColor: unread ? `${accent}55` : colors.border }]}",
    "    <AnimatedPressable onPress={onOpen} style={[styles.notificationCard, incomingPayment && styles.incomingPaymentCard, { backgroundColor: unread ? `${accent}10` : colors.card, borderColor: incomingPayment ? accent : unread ? `${accent}55` : colors.border }]}",
)
replace_required(
    'src/notifications/NotificationCenterScreen.tsx',
    "        <Text style={[styles.notificationTitle, { color: colors.text }]}>{item.title}</Text>",
    "        {incomingPayment && <View style={[styles.paymentArrivedBanner, { backgroundColor: `${colors.green}18`, borderColor: `${colors.green}45` }]}><View style={[styles.paymentPulse, { backgroundColor: colors.green }]} /><Text style={[styles.paymentArrivedText, { color: colors.green }]}>İŞLETME ÖDEMESİ • ONAY BEKLİYOR</Text><Ionicons name=\"chevron-forward\" size={15} color={colors.green} /></View>}\n        <Text style={[styles.notificationTitle, incomingPayment && styles.incomingPaymentTitle, { color: colors.text }]}>{item.title}</Text>",
)
replace_required(
    'src/notifications/NotificationCenterScreen.tsx',
    "  notificationCard: { minHeight: 119, borderRadius: 21, borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },",
    "  notificationCard: { minHeight: 119, borderRadius: 21, borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },\n  incomingPaymentCard: { borderWidth: 2, minHeight: 146 },\n  paymentArrivedBanner: { minHeight: 27, borderRadius: 10, borderWidth: 1, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },\n  paymentPulse: { width: 7, height: 7, borderRadius: 4 },\n  paymentArrivedText: { flex: 1, fontSize: 8.8, fontWeight: '900', letterSpacing: 0.45 },\n  incomingPaymentTitle: { fontSize: 15.5, marginTop: 7 },",
)
replace_required(
    'src/notifications/NotificationCenterScreen.tsx',
    "  settingsCard: { paddingVertical: 2, paddingHorizontal: 13 },",
    "  soundGrid: { gap: 8 },\n  soundCard: { minHeight: 67, borderRadius: 17, borderWidth: 1, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },\n  soundIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },\n  soundTitle: { fontSize: 13, fontWeight: '900' },\n  soundSubtitle: { fontSize: 10.5, marginTop: 2 },\n  soundCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },\n  soundHint: { fontSize: 10.5, lineHeight: 15, paddingHorizontal: 3 },\n  settingsCard: { paddingVertical: 2, paddingHorizontal: 13 },",
)

# ---------------------------------------------------------------------------
# Direct Admin navigation to the exact payment approval area
# ---------------------------------------------------------------------------
replace_required(
    'src/AppShell.tsx',
    "  const { membership, isAdmin, workshop } = useAuth();",
    "  const { membership, isAdmin, workshop, selectWorkshop } = useAuth();",
)
replace_required(
    'src/AppShell.tsx',
    "  const [customerNavigationKey, setCustomerNavigationKey] = useState(0);",
    "  const [customerNavigationKey, setCustomerNavigationKey] = useState(0);\n  const [adminInitialSection, setAdminInitialSection] = useState<'management' | 'reports' | 'platform'>('management');\n  const [adminFocusPaymentReportId, setAdminFocusPaymentReportId] = useState<string | undefined>();\n  const [adminNavigationKey, setAdminNavigationKey] = useState(0);",
)
replace_required(
    'src/AppShell.tsx',
    "      if (target === 'customers' && navigationTarget.targetSection === 'claims' && allowedForBusiness) {",
    """      if (isAdmin && target === 'team' && navigationTarget.targetSection === 'platform') {
        const data = navigationTarget.data || {};
        const reportId = typeof data.focus_payment_report_id === 'string' ? data.focus_payment_report_id : typeof data.payment_report_id === 'string' ? data.payment_report_id : undefined;
        const workshopId = typeof data.workshop_id === 'string' ? data.workshop_id : typeof data.workshopId === 'string' ? data.workshopId : undefined;
        setAdminInitialSection('platform');
        setAdminFocusPaymentReportId(reportId);
        setAdminNavigationKey((value) => value + 1);
        if (workshopId && workshopId !== workshop?.id) selectWorkshop(workshopId).catch(() => undefined);
      }
      if (target === 'customers' && navigationTarget.targetSection === 'claims' && allowedForBusiness) {""",
)
replace_required(
    'src/AppShell.tsx',
    "  }, [navigationTarget, consumeNavigationTarget, isApprentice, businessRestricted, isAdmin]);",
    "  }, [navigationTarget, consumeNavigationTarget, isApprentice, businessRestricted, isAdmin, workshop?.id, selectWorkshop]);",
)
replace_required(
    'src/AppShell.tsx',
    "               ? isAdmin ? <AdminScreen /> : <TeamScreen />",
    "               ? isAdmin ? <AdminScreen key={`admin-${adminNavigationKey}`} initialSection={adminInitialSection} focusPaymentReportId={adminFocusPaymentReportId} /> : <TeamScreen />",
)

replace_required(
    'src/screens/AdminScreen.tsx',
    "export function AdminScreen() {",
    "export function AdminScreen({ initialSection = 'management', focusPaymentReportId }: { initialSection?: Section; focusPaymentReportId?: string }) {",
)
replace_required(
    'src/screens/AdminScreen.tsx',
    "  const [section, setSection] = useState<Section>('management');",
    "  const [section, setSection] = useState<Section>(initialSection);",
)
replace_required(
    'src/screens/AdminScreen.tsx',
    "  useEffect(() => {\n    setEditName(workshop?.name ?? '');",
    "  useEffect(() => { setSection(initialSection); }, [initialSection, focusPaymentReportId]);\n\n  useEffect(() => {\n    setEditName(workshop?.name ?? '');",
)
replace_required(
    'src/screens/AdminScreen.tsx',
    "        <PlatformFeesDashboard />",
    "        <PlatformFeesDashboard focusPaymentReportId={focusPaymentReportId} />",
)

# ---------------------------------------------------------------------------
# Platform payment focus panel and clear approval emphasis
# ---------------------------------------------------------------------------
replace_required(
    'src/components/PlatformFeesDashboard.tsx',
    "export function PlatformFeesDashboard() {",
    "export function PlatformFeesDashboard({ focusPaymentReportId }: { focusPaymentReportId?: string }) {",
)
replace_required(
    'src/components/PlatformFeesDashboard.tsx',
    "    paymentReports: false,",
    "    paymentReports: Boolean(focusPaymentReportId),",
)
replace_required(
    'src/components/PlatformFeesDashboard.tsx',
    "  useEffect(() => { load(); }, [load]);",
    "  useEffect(() => { load(); }, [load]);\n  useEffect(() => { if (focusPaymentReportId) setExpandedSections((current) => ({ ...current, paymentReports: true })); }, [focusPaymentReportId]);",
)
replace_required(
    'src/components/PlatformFeesDashboard.tsx',
    "  const s = dashboard.summary;\n  const g = dashboard.global_settings;",
    "  const s = dashboard.summary;\n  const g = dashboard.global_settings;\n  const focusedPaymentReport = focusPaymentReportId ? dashboard.payment_reports.find((item) => item.id === focusPaymentReportId) : undefined;",
)
replace_required(
    'src/components/PlatformFeesDashboard.tsx',
    "    <LinearGradient colors={[statusAccent, colors.primary2, colors.black]} style={styles.hero}>",
    """    {isAdmin && focusedPaymentReport && <View style={[styles.incomingPaymentFocus, { borderColor: `${colors.green}70`, backgroundColor: `${colors.green}0B` }]}>
      <LinearGradient colors={[colors.green, colors.cyan, colors.primary]} style={styles.incomingPaymentFocusHeader}>
        <View style={styles.incomingPaymentFocusIcon}><Ionicons name="cash" size={25} color="#fff" /></View>
        <View style={styles.copy}><Text style={styles.incomingPaymentFocusEyebrow}>İŞLETMEDEN ÖDEME GELDİ</Text><Text style={styles.incomingPaymentFocusTitle}>{money(number(focusedPaymentReport.amount))} • Onayını bekliyor</Text><Text style={styles.incomingPaymentFocusText}>{focusedPaymentReport.reported_by_name} • {dateText(focusedPaymentReport.payment_date)}</Text></View>
        <Ionicons name="arrow-down-circle" size={28} color="#fff" />
      </LinearGradient>
      <PaymentReportCard report={focusedPaymentReport} focused isAdmin reviewNote={reviewNotes[focusedPaymentReport.id] || ''} onReviewNote={(value) => setReviewNotes((current) => ({ ...current, [focusedPaymentReport.id]: value }))} onApprove={() => review(focusedPaymentReport.id, true)} onReject={() => review(focusedPaymentReport.id, false)} onCancel={() => cancelReport(focusedPaymentReport.id)} onOpenReceipt={() => focusedPaymentReport.receipt_path && openReceipt(focusedPaymentReport.receipt_path)} loading={saving} />
    </View>}

    <LinearGradient colors={[statusAccent, colors.primary2, colors.black]} style={styles.hero}>""",
)
replace_required(
    'src/components/PlatformFeesDashboard.tsx',
    "dashboard.payment_reports.map((report) => <PaymentReportCard key={report.id}",
    "dashboard.payment_reports.filter((report) => !isAdmin || report.id !== focusPaymentReportId).map((report) => <PaymentReportCard key={report.id}",
)
replace_required(
    'src/components/PlatformFeesDashboard.tsx',
    "function PaymentReportCard({ report, isAdmin, reviewNote, onReviewNote, onApprove, onReject, onCancel, onOpenReceipt, loading }: { report: PaymentReport; isAdmin: boolean; reviewNote: string; onReviewNote: (value: string) => void; onApprove: () => void; onReject: () => void; onCancel: () => void; onOpenReceipt: () => void; loading: boolean }) {",
    "function PaymentReportCard({ report, isAdmin, reviewNote, onReviewNote, onApprove, onReject, onCancel, onOpenReceipt, loading, focused = false }: { report: PaymentReport; isAdmin: boolean; reviewNote: string; onReviewNote: (value: string) => void; onApprove: () => void; onReject: () => void; onCancel: () => void; onOpenReceipt: () => void; loading: boolean; focused?: boolean }) {",
)
replace_required(
    'src/components/PlatformFeesDashboard.tsx',
    "  return <GlassCard style={styles.reportCard}>",
    "  return <GlassCard style={[styles.reportCard, focused && { borderColor: colors.green, borderWidth: 2 }]}>\n    {focused && <View style={[styles.focusedReportPill, { backgroundColor: `${colors.green}18`, borderColor: `${colors.green}45` }]}><View style={[styles.focusedReportDot, { backgroundColor: colors.green }]} /><Text style={[styles.focusedReportPillText, { color: colors.green }]}>YENİ ÖDEME • ŞİMDİ İNCELE</Text></View>}",
)
replace_required(
    'src/components/PlatformFeesDashboard.tsx',
    "  stack: { gap: 12 }, copy: { flex: 1, minWidth: 0 }, row: { flexDirection: 'row', alignItems: 'center', gap: 10 },",
    "  stack: { gap: 12 }, copy: { flex: 1, minWidth: 0 }, row: { flexDirection: 'row', alignItems: 'center', gap: 10 },\n  incomingPaymentFocus: { borderWidth: 2, borderRadius: 25, padding: 8, gap: 8 },\n  incomingPaymentFocusHeader: { minHeight: 91, borderRadius: 19, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 11 },\n  incomingPaymentFocusIcon: { width: 49, height: 49, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },\n  incomingPaymentFocusEyebrow: { color: 'rgba(255,255,255,0.76)', fontSize: 9.5, fontWeight: '900', letterSpacing: 0.85 },\n  incomingPaymentFocusTitle: { color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 3 },\n  incomingPaymentFocusText: { color: 'rgba(255,255,255,0.78)', fontSize: 11, marginTop: 3 },\n  focusedReportPill: { minHeight: 30, borderRadius: 11, borderWidth: 1, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 4 },\n  focusedReportDot: { width: 8, height: 8, borderRadius: 4 },\n  focusedReportPillText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.7 },",
)

# ---------------------------------------------------------------------------
# Native Expo configuration and version metadata
# ---------------------------------------------------------------------------
app_data = json.loads(read('app.json'))
app_data['expo']['version'] = '0.8.17'
for plugin in app_data['expo'].get('plugins', []):
    if isinstance(plugin, list) and plugin and plugin[0] == 'expo-notifications':
        plugin[1]['defaultChannel'] = 'draborngarage-chime-v1'
        plugin[1]['sounds'] = [
            './assets/sounds/garage_chime.wav',
            './assets/sounds/garage_pulse.wav',
            './assets/sounds/garage_alert.wav',
        ]
        plugin[1]['enableBackgroundRemoteNotifications'] = True
write('app.json', json.dumps(app_data, ensure_ascii=False, indent=2) + '\n')

write('app.config.js', """module.exports = ({ config }) => {
  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID || config.extra?.eas?.projectId;
  return {
    ...config,
    extra: {
      ...config.extra,
      eas: projectId ? { ...(config.extra?.eas || {}), projectId } : config.extra?.eas,
    },
  };
};
""")
write('eas.json', """{
  "cli": { "version": ">= 16.0.0" },
  "build": {
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "android": { "buildType": "app-bundle" }
    }
  }
}
""")

for file_name in ('package.json', 'package-lock.json'):
    data = json.loads(read(file_name))
    data['version'] = '0.8.17'
    if file_name == 'package-lock.json' and data.get('packages', {}).get(''):
        data['packages']['']['version'] = '0.8.17'
    write(file_name, json.dumps(data, ensure_ascii=False, indent=2) + '\n')

replace_required('src/screens/AuthScreen.tsx', 'GARAGE OS • v0.8.16 AKILLI SERVİS SİSTEMİ', 'GARAGE OS • v0.8.17 AKILLI SERVİS SİSTEMİ')
replace_required('src/screens/SettingsScreen.tsx', 'subtitle="v0.8.16 • sürüm ve sistem bilgileri"', 'subtitle="v0.8.17 • sürüm ve sistem bilgileri"')
replace_required('src/screens/SettingsScreen.tsx', 'value="v0.8.16 • Tahsilat Yerleşim Düzeni"', 'value="v0.8.17 • Sesli Push ve Ödeme Odağı"')
replace_required('src/screens/SettingsScreen.tsx', 'value="Canlı uygulama içi + yerel telefon hatırlatması"', 'value="Canlı merkez + özel ses + native kapalı uygulama pushu"')
replace_required('src/screens/SettingsScreen.tsx', 'value="backup/v0.8.15-before-v0.8.16-20260713"', 'value="backup/v0.8.16-before-v0.8.17-20260714"')
replace_required('src/screens/SettingsScreen.tsx', 'value="Kod yedeğiyle v0.8.15"', 'value="Kod yedeğiyle v0.8.16"')
replace_required('src/screens/SettingsScreen.tsx', 'value="Expo Go • SDK 54 • Yerel bildirim"', 'value="Expo Go arayüz testi • Native APK push/ses testi"')
replace_required('src/screens/SettingsScreen.tsx', 'value="v1.0 geliştirme yapısı"', 'value="v0.8.17 EAS preview APK ile aktif"')

readme = read('README.md')
readme = readme.replace('**v0.8.16 — Tahsilat Yerleşim Düzeni**', '**v0.8.17 — Sesli Push ve Ödeme Odağı**')
readme = readme.replace('v0.8.16; Tahsilat Kaydet alanındaki kalan tutarı ortalar, tamamlanan tahsilat kartını düz ve gölgesiz hale getirir ve Servis Hareket Geçmişini servis detayının en altına taşır.', 'v0.8.17; alternatif bildirim sesleri, native kapalı uygulama push altyapısı ve işletmeden gelen platform ödemesine doğrudan Admin onay yönlendirmesi ekler.')
write('README.md', readme)
write('docs/ROADMAP.md', read('docs/ROADMAP.md').replace('Güncel sürüm `v0.8.16`tür.', 'Güncel sürüm `v0.8.17`dir.'))

write('docs/CHANGELOG_V0.8.17.md', """# DraBornGarage v0.8.17

Tarih: 14 Temmuz 2026

## Bildirim sesleri
- Garage Chime, Garage Pulse, Garage Alert ve Sessiz seçenekleri eklendi.
- Bildirim Merkezi > Ayarlar içinden ses değiştirilebilir.
- Android için her ses ayrı ve sürümlenmiş bildirim kanalında çalışır.
- Seçilen ses yerel, zamanlı ve native push bildirimlerine uygulanır.

## Uygulama kapalıyken bildirim
- Expo push tokenı native APK içinde otomatik kaydedilir.
- Supabase `pg_net` ile yeni bildirimleri Expo Push Service'e gönderir.
- `pg_cron` yaklaşan bildirimleri dakikalık olarak kontrol eder.
- Bildirime dokunma, uygulama kapalıyken açılışta da hedef sayfaya yönlendirir.

## İşletme ödemesi
- Bildirim başlığı `İşletmeden ödeme geldi` olarak netleştirildi.
- Tutar, işletme ve Admin onayı bilgisi daha güçlü vurgulanır.
- Bildirime dokunulduğunda Admin > Platform açılır, doğru işletme seçilir ve ödeme onay kartı üstte gösterilir.
- Ödeme Bildirimleri kategorisi otomatik açılır.

## Native test notu
- Android Expo Go, SDK 53 ve sonrasında uzaktan push desteklemez.
- Kapalı uygulama pushu ve özel ses testi EAS preview APK ile yapılır.
""")

write('docs/PROJECT_HANDOFF_V0.8.17.md', """# DraBornGarage — v0.8.17 Devam Dosyası

**Güncel sürüm:** `v0.8.17`  
**Önceki sabit yedek:** `backup/v0.8.16-before-v0.8.17-20260714`  
**Sonraki sürüm:** `v0.9.0`

## Tamamlananlar
- Alternatif ve değiştirilebilir bildirim sesleri eklendi.
- Expo push token kayıt tablosu ve RPC fonksiyonları eklendi.
- Anlık ve zamanlı push dağıtımı için pg_net + pg_cron altyapısı kuruldu.
- Kapalı uygulamadan bildirim tıklama yönlendirmesi eklendi.
- İşletmeden gelen platform ödemesi özel kart ve doğrudan Admin onay odağı kazandı.

## EAS
- `EXPO_PUBLIC_EAS_PROJECT_ID` veya EAS bağlı proje kimliği gereklidir.
- Expo Go arayüz/yerel bildirim testini sürdürür; native uzaktan push için preview APK gerekir.
""")

write('docs/TERMUX_INSTALL.md', """# Termux — v0.8.16 Yedekle, v0.8.17 Kur

```bash
cd ~
KURULAN_SURUM="v0.8.17"
YEDEK_KLASORU="$HOME/DraBornGarage-v0.8.16-local-backup"
ZIP_DOSYASI="$HOME/DraBornGarage-v0.8.17.zip"
ACILAN_KLASOR="$HOME/DraBornGarage-main"

pkg update -y
pkg install nodejs-lts curl unzip -y
rm -rf "$ACILAN_KLASOR"
rm -f "$ZIP_DOSYASI"

if [ -d "$HOME/DraBornGarage" ]; then
  rm -rf "$YEDEK_KLASORU"
  mv "$HOME/DraBornGarage" "$YEDEK_KLASORU"
fi

curl -L --retry 10 --retry-delay 3 --connect-timeout 30 --max-time 600 \
  "https://github.com/DrabornEagle/DraBornGarage/archive/refs/heads/main.zip" \
  -o "$ZIP_DOSYASI"

unzip -o "$ZIP_DOSYASI" -d "$HOME"
mv "$ACILAN_KLASOR" "$HOME/DraBornGarage"
rm -f "$ZIP_DOSYASI"

if [ -f "$YEDEK_KLASORU/.env" ]; then
  cp "$YEDEK_KLASORU/.env" "$HOME/DraBornGarage/.env"
else
  cp "$HOME/DraBornGarage/.env.example" "$HOME/DraBornGarage/.env"
fi

cd "$HOME/DraBornGarage"
npm install --no-audit --no-fund
npm run typecheck
node -p "require('./package.json').version"
npx expo start -c --go
```

Beklenen sürüm: `0.8.17`.

Kapalı uygulama pushu ve özel ses için Expo Go yerine EAS preview APK kurulmalıdır.
""")

print('v0.8.17 changes prepared')
