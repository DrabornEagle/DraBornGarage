import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import getDevicePushTokenAsync from 'expo-notifications/build/getDevicePushTokenAsync';
import getExpoPushTokenAsync from 'expo-notifications/build/getExpoPushTokenAsync';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { APP_VERSION } from '../lib/appVersion';
import { supabase } from '../lib/supabase';
import {
  ALERT_NOTIFICATION_CHANNEL_ID,
  BELL_NOTIFICATION_CHANNEL_ID,
  CHIME_NOTIFICATION_CHANNEL_ID,
  DIGITAL_NOTIFICATION_CHANNEL_ID,
  ensureDraBornNotificationChannels,
  METAL_NOTIFICATION_CHANNEL_ID,
  PULSE_NOTIFICATION_CHANNEL_ID,
  RETRO_NOTIFICATION_CHANNEL_ID,
  SILENT_NOTIFICATION_CHANNEL_ID,
  SIREN_NOTIFICATION_CHANNEL_ID,
  SYSTEM_NOTIFICATION_CHANNEL_ID,
  TURBO_NOTIFICATION_CHANNEL_ID,
} from './notificationPermissions';
import {
  NotificationProvider as BaseNotificationProvider,
  NOTIFICATION_SOUND_OPTIONS,
  useNotifications as useBaseNotifications,
} from './NotificationContextV101';
import { NotificationPreferences, NotificationSoundKey, PushRegistrationStatus } from './types';

export const NotificationProvider = BaseNotificationProvider;
export { NOTIFICATION_SOUND_OPTIONS };

const DEVICE_ID_STORAGE_KEY = '@draborngarage/push-device-uuid-v114';
const LEGACY_DEVICE_ID_STORAGE_KEY = '@draborngarage/push-device-id';
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PUSH_TOKEN_STORAGE_KEY = '@draborngarage/expo-push-token';
const IS_EXPO_GO = Constants.appOwnership === 'expo';
const EAS_PROJECT_ID = process.env.EXPO_PUBLIC_EAS_PROJECT_ID
  || Constants.expoConfig?.extra?.eas?.projectId
  || Constants.easConfig?.projectId
  || null;
const APPLICATION_ID = Constants.expoConfig?.android?.package || 'com.draborneagle.draborngarage';

function soundFile(sound: NotificationSoundKey): string | false {
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

function readableError(error: unknown, stage: string) {
  const raw = error instanceof Error ? error.message : String(error || 'Bilinmeyen hata');
  if (raw.includes('ERR_NOTIFICATIONS_SERVER_ERROR')) {
    return `${stage}: Expo push servisi token oluşturamadı`;
  }
  if (raw.includes('ERR_NOTIFICATIONS_NETWORK_ERROR')) {
    return `${stage}: internet bağlantısı kurulamadı`;
  }
  if (raw.includes('ERR_NOTIF_DEVICE_ID') || raw.includes('Invalid UUID')) {
    return `${stage}: geçerli uygulama kurulum kimliği oluşturulamadı`;
  }
  if (raw.includes('undefined is not a function')) {
    return `${stage}: native bildirim köprüsündeki gerekli fonksiyon bulunamadı`;
  }
  return `${stage}: ${raw}`;
}

function createUuidV4() {
  const bytes = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.map((value) => value.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}

async function getDeviceId() {
  let id = await AsyncStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (!id || !UUID_V4_PATTERN.test(id)) {
    id = createUuidV4();
    await AsyncStorage.setItem(DEVICE_ID_STORAGE_KEY, id);
    await AsyncStorage.removeItem(LEGACY_DEVICE_ID_STORAGE_KEY);
  }
  return id;
}

export function useNotifications() {
  const base = useBaseNotifications();
  const { session } = useAuth();
  const [pushStatus, setPushStatus] = useState<PushRegistrationStatus>('idle');
  const [pushError, setPushError] = useState<string | null>(null);
  const errorRef = useRef<string | null>(null);
  const activeRegistration = useRef<Promise<boolean> | null>(null);
  const lastRegisteredAt = useRef(0);

  const fail = useCallback((status: PushRegistrationStatus, message: string) => {
    errorRef.current = message;
    setPushStatus(status);
    setPushError(message);
  }, []);

  const registerPushNotifications = useCallback(async () => {
    if (!session?.user || !base.preferences.push_notifications_enabled) return false;
    if (activeRegistration.current) return activeRegistration.current;
    if (pushStatus === 'registered' && Date.now() - lastRegisteredAt.current < 20000) return true;

    const task = (async () => {
      setPushError(null);
      errorRef.current = null;
      if (IS_EXPO_GO) {
        fail('expo_go', 'Expo Go uzaktan push alamaz. DraBornGarage Release APK kullanmalısın.');
        return false;
      }
      if (!EAS_PROJECT_ID) {
        fail('missing_project', 'EAS proje kimliği APK yapılandırmasında bulunamadı.');
        return false;
      }

      let stage = 'Bildirim kanalları hazırlanamadı';
      try {
        await ensureDraBornNotificationChannels();

        stage = 'Bildirim izni okunamadı';
        const current = await Notifications.getPermissionsAsync();
        const permission = current.status === 'granted'
          ? current
          : await Notifications.requestPermissionsAsync();
        if (permission.status !== 'granted') {
          fail('denied', 'Android bildirim izni verilmedi. Telefon ayarlarından DraBornGarage bildirimlerini aç.');
          return false;
        }

        stage = 'Android FCM tokenı alınamadı';
        const devicePushToken = await getDevicePushTokenAsync();
        const rawDeviceToken = (devicePushToken as { data?: unknown }).data;
        if (typeof rawDeviceToken !== 'string' || rawDeviceToken.trim().length < 20) {
          throw new Error('Geçerli Android FCM tokenı alınamadı');
        }

        stage = 'Expo push tokenı oluşturulamadı';
        const deviceId = await getDeviceId();
        const result = await getExpoPushTokenAsync({
          projectId: EAS_PROJECT_ID,
          deviceId,
          devicePushToken,
          applicationId: APPLICATION_ID,
        });
        const token = result.data?.trim();
        if (!token || !/^Expo(nent)?PushToken\[[^\]]+\]$/.test(token)) {
          throw new Error('Geçerli Expo push tokenı alınamadı');
        }

        stage = 'Push tokenı DraBornGarage sunucusuna kaydedilemedi';
        const { data, error } = await supabase.rpc('notification_register_push_token', {
          p_expo_push_token: token,
          p_device_id: deviceId,
          p_platform: Platform.OS,
          p_app_version: APP_VERSION,
        });
        if (error) throw error;
        if (!(data as { registered?: boolean } | null)?.registered) {
          throw new Error('Sunucu tokenı doğrulamadı');
        }

        await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
        lastRegisteredAt.current = Date.now();
        errorRef.current = null;
        setPushStatus('registered');
        setPushError(null);
        return true;
      } catch (error) {
        fail('error', readableError(error, stage));
        return false;
      }
    })();

    activeRegistration.current = task;
    try {
      return await task;
    } finally {
      activeRegistration.current = null;
    }
  }, [base.preferences.push_notifications_enabled, fail, pushStatus, session?.user]);

  const previewNotificationSound = useCallback(async (sound: NotificationSoundKey) => {
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

  const updatePreferences = useCallback(async (patch: Partial<NotificationPreferences>) => {
    const error = await base.updatePreferences(patch);
    if (error) return error;
    if (patch.push_notifications_enabled === true) {
      const registered = await registerPushNotifications();
      if (!registered) return errorRef.current || 'Telefon push kaydı tamamlanamadı';
    }
    return null;
  }, [base.updatePreferences, previewNotificationSound, registerPushNotifications]);

  const requestLocalNotifications = useCallback(async () => {
    const allowed = await base.requestLocalNotifications();
    if (allowed) void registerPushNotifications();
    return allowed;
  }, [base.requestLocalNotifications, registerPushNotifications]);

  const sendClosedAppTestNotification = useCallback(async () => {
    if (!session?.user) return false;
    const registered = pushStatus === 'registered' || await registerPushNotifications();
    if (!registered) return false;
    const { data, error } = await supabase.rpc('notification_schedule_closed_app_test', { p_delay_seconds: 45 });
    if (error) {
      fail('error', readableError(error, 'Kapalı uygulama testi planlanamadı'));
      return false;
    }
    await base.refresh();
    return Boolean((data as { scheduled?: boolean } | null)?.scheduled);
  }, [base.refresh, fail, pushStatus, registerPushNotifications, session?.user]);

  useEffect(() => {
    if (!session?.user || !base.preferences.push_notifications_enabled) return;
    void registerPushNotifications();
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') void registerPushNotifications();
    });
    return () => listener.remove();
  }, [base.preferences.push_notifications_enabled, registerPushNotifications, session?.user]);

  return useMemo(() => ({
    ...base,
    pushStatus,
    pushError,
    updatePreferences,
    requestLocalNotifications,
    registerPushNotifications,
    previewNotificationSound,
    sendClosedAppTestNotification,
  }), [base, previewNotificationSound, pushError, pushStatus, registerPushNotifications, requestLocalNotifications, sendClosedAppTestNotification, updatePreferences]);
}
