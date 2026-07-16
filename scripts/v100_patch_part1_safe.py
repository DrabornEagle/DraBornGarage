from pathlib import Path
ROOT=Path.cwd()

def p(rel): return ROOT/rel

p('src/lib/appVersion.ts').write_text("""import Constants from 'expo-constants';

export const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
export const APP_VERSION_LABEL = `v${APP_VERSION}`;
export const ANDROID_VERSION_CODE = Constants.expoConfig?.android?.versionCode ?? 1;
""")
p('src/hooks').mkdir(exist_ok=True)
p('src/hooks/useSmartAutoRefresh.ts').write_text("""import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

export function useSmartAutoRefresh(
  refresh: () => void | Promise<void>,
  intervalMs = 60000,
  enabled = true,
) {
  const refreshRef = useRef(refresh);
  const runningRef = useRef(false);

  useEffect(() => { refreshRef.current = refresh; }, [refresh]);

  useEffect(() => {
    if (!enabled) return;
    let active = AppState.currentState === 'active';
    let timer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const run = async () => {
      if (disposed || !active || runningRef.current) return;
      runningRef.current = true;
      try { await refreshRef.current(); } catch { /* background refresh stays silent */ }
      finally { runningRef.current = false; }
    };

    const schedule = () => {
      if (timer) clearTimeout(timer);
      if (disposed || !active) return;
      timer = setTimeout(async () => { await run(); schedule(); }, intervalMs);
    };

    const subscription = AppState.addEventListener('change', (state) => {
      active = state === 'active';
      if (active) { void run(); schedule(); }
      else if (timer) { clearTimeout(timer); timer = null; }
    });

    schedule();
    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      subscription.remove();
    };
  }, [enabled, intervalMs]);
}
""")

p('src/notifications/notificationPermissions.ts').write_text("""import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

export const LOUD_NOTIFICATION_CHANNEL_ID = 'draborngarage-system-loud-v4';
export const CHIME_NOTIFICATION_CHANNEL_ID = 'draborngarage-appointment-chime-v4';
export const PULSE_NOTIFICATION_CHANNEL_ID = 'draborngarage-workshop-pulse-v4';
export const ALERT_NOTIFICATION_CHANNEL_ID = 'draborngarage-urgent-alert-v4';
export const SILENT_NOTIFICATION_CHANNEL_ID = 'draborngarage-silent-v4';
export const NOTIFICATION_INTRO_STORAGE_KEY = '@draborngarage/notification-intro-v100';

export async function ensureDraBornNotificationChannels() {
  if (Platform.OS !== 'android') return;
  const common = {
    importance: Notifications.AndroidImportance.MAX,
    enableVibrate: true,
    enableLights: true,
    lightColor: '#7C5CFF',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    showBadge: true,
    bypassDnd: false,
  };
  await Notifications.setNotificationChannelAsync(LOUD_NOTIFICATION_CHANNEL_ID, {
    ...common,
    name: 'DraBornGarage Telefon Sesi',
    description: 'Telefonun varsayılan bildirim sesini yüksek öncelikle kullanır.',
    sound: 'default',
    vibrationPattern: [0, 320, 120, 320, 120, 620],
  });
  await Notifications.setNotificationChannelAsync(CHIME_NOTIFICATION_CHANNEL_ID, {
    ...common,
    name: 'Randevu Çağrısı',
    description: 'Randevu ve müşteri gelişleri için dikkat çekici melodik çağrı.',
    sound: 'garage_chime.wav',
    vibrationPattern: [0, 220, 100, 220, 100, 450],
  });
  await Notifications.setNotificationChannelAsync(PULSE_NOTIFICATION_CHANNEL_ID, {
    ...common,
    name: 'Atölye Nabzı',
    description: 'Servis hareketleri için güçlü çift darbeli atölye uyarısı.',
    sound: 'garage_pulse.wav',
    vibrationPattern: [0, 180, 80, 420, 120, 420],
  });
  await Notifications.setNotificationChannelAsync(ALERT_NOTIFICATION_CHANNEL_ID, {
    ...common,
    name: 'Acil Garaj Alarmı',
    description: 'Önemli ödeme, gecikme ve acil servis hareketleri için güçlü alarm.',
    sound: 'garage_alert.wav',
    vibrationPattern: [0, 500, 120, 500, 120, 850],
  });
  await Notifications.setNotificationChannelAsync(SILENT_NOTIFICATION_CHANNEL_ID, {
    ...common,
    name: 'DraBornGarage Sessiz',
    description: 'Ses olmadan titreşim ve bildirim alanı uyarıları.',
    importance: Notifications.AndroidImportance.HIGH,
    sound: null,
    vibrationPattern: [0, 220, 120, 220],
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

export async function openNotificationSettings() { await Linking.openSettings(); }
""")

print('v1.0.0 safe patch part 1 complete')
