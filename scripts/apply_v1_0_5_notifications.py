from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def write(path: str, text: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text, encoding='utf-8')


def replace(path: str, old: str, new: str, count: int = 1) -> None:
    text = read(path)
    if text.count(old) < count:
        raise RuntimeError(f'{path}: beklenen metin bulunamadı: {old[:140]}')
    write(path, text.replace(old, new, count))


permission_helper = r'''import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

export const LOUD_NOTIFICATION_CHANNEL_ID = 'draborngarage-system-loud-v3';
export const SILENT_NOTIFICATION_CHANNEL_ID = 'draborngarage-silent-v3';
export const NOTIFICATION_INTRO_STORAGE_KEY = '@draborngarage/notification-intro-v105';

export async function ensureDraBornNotificationChannels() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync(LOUD_NOTIFICATION_CHANNEL_ID, {
    name: 'DraBornGarage Öncelikli Bildirimler',
    description: 'Telefonun bildirim sesi seviyesini kullanan yüksek öncelikli servis, randevu ve ödeme bildirimleri.',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 320, 120, 320, 120, 620],
    enableVibrate: true,
    enableLights: true,
    lightColor: '#7C5CFF',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    showBadge: true,
    bypassDnd: false,
  });

  await Notifications.setNotificationChannelAsync(SILENT_NOTIFICATION_CHANNEL_ID, {
    name: 'DraBornGarage Sessiz',
    description: 'Ses olmadan titreşim ve bildirim alanı uyarıları.',
    importance: Notifications.AndroidImportance.HIGH,
    sound: null,
    vibrationPattern: [0, 220, 120, 220],
    enableVibrate: true,
    enableLights: true,
    lightColor: '#7C5CFF',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    showBadge: true,
    bypassDnd: false,
  });
}

export async function requestDeviceNotificationPermission() {
  await ensureDraBornNotificationChannels();
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return current;
  return Notifications.requestPermissionsAsync();
}

export async function shouldShowNotificationIntro() {
  const permission = await Notifications.getPermissionsAsync().catch(() => null);
  if (permission?.status === 'granted') return false;
  const seen = await AsyncStorage.getItem(NOTIFICATION_INTRO_STORAGE_KEY);
  return seen !== 'completed';
}

export async function markNotificationIntroCompleted() {
  await AsyncStorage.setItem(NOTIFICATION_INTRO_STORAGE_KEY, 'completed');
}

export async function openNotificationSettings() {
  await Linking.openSettings();
}
'''
write('src/notifications/notificationPermissions.ts', permission_helper)

permission_screen = r'''import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { GlassCard } from '../components/GlassCard';
import { PremiumBackground } from '../components/PremiumBackground';
import { PrimaryButton } from '../components/PrimaryButton';
import { useTheme } from '../context/ThemeContext';
import {
  markNotificationIntroCompleted,
  openNotificationSettings,
  requestDeviceNotificationPermission,
} from '../notifications/notificationPermissions';

export function NotificationPermissionScreen({ onComplete }: { onComplete: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [requesting, setRequesting] = useState(false);
  const [denied, setDenied] = useState(false);

  const enable = async () => {
    setRequesting(true);
    try {
      const result = await requestDeviceNotificationPermission();
      await markNotificationIntroCompleted();
      if (result.status === 'granted') onComplete();
      else setDenied(true);
    } finally {
      setRequesting(false);
    }
  };

  const skip = async () => {
    await markNotificationIntroCompleted();
    onComplete();
  };

  if (denied) {
    return <PremiumBackground>
      <View style={[styles.page, { paddingTop: Math.max(insets.top, 28), paddingBottom: Math.max(insets.bottom, 24) }]}>
        <GlassCard style={styles.deniedCard}>
          <View style={[styles.mainIcon, { backgroundColor: `${colors.orange}18`, borderColor: `${colors.orange}45` }]}>
            <Ionicons name="notifications-off" size={42} color={colors.orange} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Bildirim izni kapalı</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Telefon ayarlarından DraBornGarage bildirimlerini açtığında servis, randevu, ödeme ve teslim bilgileri bildirim alanında gösterilir.</Text>
          <PrimaryButton title="Telefon Ayarlarını Aç" onPress={openNotificationSettings} />
          <AnimatedPressable onPress={skip} style={[styles.secondaryButton, { borderColor: colors.border }]}>
            <Text style={[styles.secondaryText, { color: colors.textMuted }]}>Şimdilik Devam Et</Text>
          </AnimatedPressable>
        </GlassCard>
      </View>
    </PremiumBackground>;
  }

  return <PremiumBackground>
    <View style={[styles.page, { paddingTop: Math.max(insets.top, 28), paddingBottom: Math.max(insets.bottom, 24) }]}>
      <View style={styles.hero}>
        <View style={[styles.mainIcon, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}48` }]}>
          <Ionicons name="notifications" size={44} color={colors.primary} />
        </View>
        <Text style={[styles.eyebrow, { color: colors.green }]}>DraBornGarage • v1.0.5</Text>
        <Text style={[styles.title, { color: colors.text }]}>Önemli gelişmeleri kaçırma</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>Bildirim izni yalnız servis ve hesap hareketlerini zamanında göstermek için kullanılır. Reklam bildirimi gönderilmez.</Text>
      </View>

      <GlassCard style={styles.features}>
        <Feature icon="construct" title="Servis hareketleri" text="İşe başlandı, fiyat güncellendi, motor hazır ve teslim edildi bilgileri." />
        <Feature icon="calendar" title="Randevu hatırlatmaları" text="Randevu yaklaşınca ve saat değiştiğinde telefonuna haber verir." />
        <Feature icon="volume-high" title="Telefonun bildirim sesi" text="Ses yüksekliği telefonunun Bildirim Sesi ayarını takip eder." />
        <Feature icon="shield-checkmark" title="Gizli ve güvenli" text="Yalnız kendi hesabına ait bildirimler gösterilir." last />
      </GlassCard>

      <View style={styles.actions}>
        <PrimaryButton title="Bildirimleri Aç" onPress={enable} loading={requesting} />
        <AnimatedPressable onPress={skip} disabled={requesting} style={[styles.secondaryButton, { borderColor: colors.border }]}>
          <Text style={[styles.secondaryText, { color: colors.textMuted }]}>Şimdilik Değil</Text>
        </AnimatedPressable>
      </View>
    </View>
  </PremiumBackground>;
}

function Feature({ icon, title, text, last }: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string; last?: boolean }) {
  const { colors } = useTheme();
  return <View style={[styles.feature, !last && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
    <View style={[styles.featureIcon, { backgroundColor: `${colors.cyan}14` }]}><Ionicons name={icon} size={23} color={colors.cyan} /></View>
    <View style={styles.copy}><Text style={[styles.featureTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.featureText, { color: colors.textMuted }]}>{text}</Text></View>
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 20, justifyContent: 'center', gap: 20 },
  hero: { alignItems: 'center', gap: 9 },
  mainIcon: { width: 88, height: 88, borderRadius: 30, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 12, fontWeight: '900', letterSpacing: 1.1, marginTop: 5 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '900', letterSpacing: -0.8, textAlign: 'center' },
  subtitle: { maxWidth: 370, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  features: { paddingVertical: 2 },
  feature: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  featureIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  featureTitle: { fontSize: 14.5, fontWeight: '900' },
  featureText: { fontSize: 12.5, lineHeight: 18, marginTop: 3 },
  actions: { gap: 10 },
  secondaryButton: { minHeight: 52, borderWidth: 1, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: 13, fontWeight: '900' },
  deniedCard: { alignItems: 'center', gap: 14, paddingVertical: 24 },
});
'''
write('src/screens/NotificationPermissionScreen.tsx', permission_screen)

replace('src/AppRoot.tsx', "import { WelcomeScreen } from './screens/WelcomeScreen';", "import { WelcomeScreen } from './screens/WelcomeScreen';\nimport { NotificationPermissionScreen } from './screens/NotificationPermissionScreen';\nimport { shouldShowNotificationIntro } from './notifications/notificationPermissions';")
replace('src/AppRoot.tsx', "  const [welcomeCompleted, setWelcomeCompleted] = useState(false);", "  const [welcomeCompleted, setWelcomeCompleted] = useState(false);\n  const [notificationIntroReady, setNotificationIntroReady] = useState(false);\n  const [showNotificationIntro, setShowNotificationIntro] = useState(false);")
replace('src/AppRoot.tsx', "  useEffect(() => {\n    if (session) setWelcomeCompleted(true);\n  }, [session]);", "  useEffect(() => {\n    if (session) setWelcomeCompleted(true);\n  }, [session]);\n\n  useEffect(() => {\n    if (loading) return;\n    shouldShowNotificationIntro()\n      .then((show) => setShowNotificationIntro(show))\n      .catch(() => setShowNotificationIntro(false))\n      .finally(() => setNotificationIntroReady(true));\n  }, [loading]);")
replace('src/AppRoot.tsx', "  if (!session && !welcomeCompleted) return <WelcomeScreen onStart={() => setWelcomeCompleted(true)} />;\n  if (!session) return <AuthScreen />;", "  if (!session && !welcomeCompleted) return <WelcomeScreen onStart={() => setWelcomeCompleted(true)} />;\n  if (!notificationIntroReady) return <PremiumBackground><View style={styles.loading}><ActivityIndicator color={colors.primary} size=\"large\" /></View></PremiumBackground>;\n  if (showNotificationIntro) return <NotificationPermissionScreen onComplete={() => setShowNotificationIntro(false)} />;\n  if (!session) return <AuthScreen />;")

replace('src/notifications/types.ts', "export type NotificationSoundKey = 'garage_chime' | 'garage_pulse' | 'garage_alert' | 'silent';", "export type NotificationSoundKey = 'system_loud' | 'garage_chime' | 'garage_pulse' | 'garage_alert' | 'silent';")

ctx = read('src/notifications/NotificationContextV101.tsx')
ctx = ctx.replace("import { supabase } from '../lib/supabase';", "import { supabase } from '../lib/supabase';\nimport { ensureDraBornNotificationChannels, LOUD_NOTIFICATION_CHANNEL_ID, requestDeviceNotificationPermission, SILENT_NOTIFICATION_CHANNEL_ID } from './notificationPermissions';")
ctx = ctx.replace("const APP_VERSION = Constants.expoConfig?.version ?? '1.0.4';", "const APP_VERSION = Constants.expoConfig?.version ?? '1.0.5';")
ctx = ctx.replace("export const NOTIFICATION_SOUND_OPTIONS: { key: NotificationSoundKey; label: string; subtitle: string; icon: 'musical-notes' | 'pulse' | 'alert-circle' | 'volume-mute' }[] = [\n  { key: 'garage_chime', label: 'Garage Chime', subtitle: 'Uzun ve net garaj melodisi', icon: 'musical-notes' },\n  { key: 'garage_pulse', label: 'Garage Pulse', subtitle: 'Güçlü ve ritmik uyarı', icon: 'pulse' },\n  { key: 'garage_alert', label: 'Garage Alert', subtitle: 'En uzun ve dikkat çekici', icon: 'alert-circle' },\n  { key: 'silent', label: 'Sessiz', subtitle: 'Yalnız titreşim', icon: 'volume-mute' },\n];", "export const NOTIFICATION_SOUND_OPTIONS: { key: NotificationSoundKey; label: string; subtitle: string; icon: 'musical-notes' | 'volume-mute' }[] = [\n  { key: 'system_loud', label: 'Telefon Bildirim Sesi', subtitle: 'Telefonunun bildirim sesi ve ses seviyesini kullanır', icon: 'musical-notes' },\n  { key: 'silent', label: 'Sessiz', subtitle: 'Ses olmadan güçlü titreşim', icon: 'volume-mute' },\n];")
ctx = ctx.replace("function soundFile(sound: NotificationSoundKey): string | false {\n  if (sound === 'silent') return false;\n  if (IS_EXPO_GO) return 'default';\n  return `${sound}.wav`;\n}\n\nfunction channelId(sound: NotificationSoundKey) {\n  if (sound === 'garage_pulse') return 'draborngarage-pulse-v2';\n  if (sound === 'garage_alert') return 'draborngarage-alert-v2';\n  if (sound === 'silent') return 'draborngarage-silent-v2';\n  return 'draborngarage-chime-v2';\n}", "function soundFile(sound: NotificationSoundKey): 'default' | false {\n  return sound === 'silent' ? false : 'default';\n}\n\nfunction channelId(sound: NotificationSoundKey) {\n  return sound === 'silent' ? SILENT_NOTIFICATION_CHANNEL_ID : LOUD_NOTIFICATION_CHANNEL_ID;\n}")
ctx = ctx.replace("  notification_sound: 'garage_chime',", "  notification_sound: 'system_loud',")
start = ctx.index('async function ensureAndroidChannels() {')
end = ctx.index('\n\nfunction notificationData', start)
ctx = ctx[:start] + "async function ensureAndroidChannels() {\n  await ensureDraBornNotificationChannels();\n}" + ctx[end:]
ctx = ctx.replace("      await ensureAndroidChannels();\n      const current = await Notifications.getPermissionsAsync();\n      const result = current.status === 'granted' ? current : await Notifications.requestPermissionsAsync();", "      const result = await requestDeviceNotificationPermission();")
ctx = ctx.replace("body: 'Uzun ve güçlü bildirim sesi etkin. Gerçek servis hareketleri de cihaz bildirim alanına taşınacak.',", "body: 'Telefonunun varsayılan bildirim sesi ve yüksek öncelikli DraBornGarage kanalı etkin.',")
write('src/notifications/NotificationContextV101.tsx', ctx)

replace('src/notifications/NotificationCenterScreen.tsx', 'v1.0.4 RC • GÜÇLÜ BİLDİRİM MERKEZİ', 'v1.0.5 RC • ÖNCELİKLİ BİLDİRİM MERKEZİ')
replace('src/notifications/NotificationCenterScreen.tsx', 'Telefonunun bildirim alanını kontrol et.', 'Telefonunun bildirim alanını ve Bildirim Sesi seviyesini kontrol et.')
replace('src/notifications/NotificationCenterScreen.tsx', 'APK içinde uzaktan push bağlantısını etkinleştir.', 'FCM bağlantısı tamamlandığında uygulama kapalıyken de gelir.')

for path in ('package.json', 'package-lock.json'):
    text = read(path).replace('"version": "1.0.4"', '"version": "1.0.5"')
    write(path, text)
app = read('app.json').replace('"version": "1.0.4"', '"version": "1.0.5"', 1)
app = app.replace('"buildNumber": "22"', '"buildNumber": "23"', 1)
app = app.replace('"versionCode": 22', '"versionCode": 23', 1)
write('app.json', app)

workflow = read('.github/workflows/release-apk.yml')
workflow = workflow.replace('v1.0.4', 'v1.0.5').replace('versionCode: 22', 'versionCode: 23').replace('versionCode 22', 'versionCode 23').replace('"versionCode": 22', '"versionCode": 23').replace("'22'", "'23'")
workflow = workflow.replace('DraBornGarage-v1.0.4', 'DraBornGarage-v1.0.5')
workflow = workflow.replace('EXPO_PUBLIC_NATIVE_PUSH_ENABLED: "false"', 'EXPO_PUBLIC_NATIVE_PUSH_ENABLED: "false"')
write('.github/workflows/release-apk.yml', workflow)

migration = r'''-- DraBornGarage v1.0.5 notification sound/channel upgrade
alter table public.notification_preferences drop constraint if exists notification_preferences_sound_check;
alter table public.notification_preferences alter column notification_sound set default 'system_loud';
update public.notification_preferences
set notification_sound='system_loud', updated_at=now()
where notification_sound in ('garage_chime','garage_pulse','garage_alert');
alter table public.notification_preferences add constraint notification_preferences_sound_check
check (notification_sound = any (array['system_loud','garage_chime','garage_pulse','garage_alert','silent']::text[]));

create or replace function public.notification_channel_id(p_sound text)
returns text
language sql
immutable
as $$
  select case when p_sound='silent' then 'draborngarage-silent-v3' else 'draborngarage-system-loud-v3' end;
$$;

create or replace function public.notification_sound_file(p_sound text)
returns text
language sql
immutable
as $$
  select case when p_sound='silent' then null else 'default' end;
$$;
'''
write('supabase/migrations/20260715170000_v1_0_5_notification_sound_channels.sql', migration)

changelog = '''# DraBornGarage v1.0.5 RC\n\n- v1.0.4 kaynakları `backup/v1.0.4-before-v1.0.5-20260715` dalına yedeklendi.\n- İlk açılış için modern bildirim izin açıklama ekranı eklendi.\n- Android bildirimleri yeni `draborngarage-system-loud-v3` kanalına taşındı.\n- Ses, özel düşük seviyeli WAV yerine telefonun varsayılan bildirim sesini kullanır.\n- Kanal önemi MAX, güçlü titreşim, kilit ekranı görünürlüğü ve rozet etkin.\n- Sessiz kanal ayrı `draborngarage-silent-v3` olarak korundu.\n- Eski ses tercihleri Supabase üzerinde `system_loud` seçeneğine geçirildi.\n- Uygulama sürümü 1.0.5, Android versionCode 23, iOS buildNumber 23.\n- Uygulama kapalıyken dinamik push için istemci ve Supabase gönderim hattı hazırdır; Firebase/FCM kimlik bilgileri ayrıca bağlanmalıdır.\n'''
write('docs/CHANGELOG_V1.0.5.md', changelog)

print('DraBornGarage v1.0.5 notification patch applied')
