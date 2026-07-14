import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

const DEVICE_ID_KEY = '@draborngarage/push-device-id';

async function getDeviceId() {
  const current = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (current) return current;
  const next = `${Platform.OS}-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, next);
  return next;
}

export function getEasProjectId() {
  const fromEas = Constants.easConfig?.projectId;
  const fromExtra = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
  const fromEnv = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  return fromEas || fromExtra || fromEnv || null;
}

export async function registerExpoPushToken(soundKey: string) {
  const projectId = getEasProjectId();
  if (!projectId) {
    return {
      ok: false,
      reason: 'EAS_PROJECT_ID_MISSING',
      message: 'Kapalı uygulama bildirimleri için önce EAS projesi oluşturulmalı.',
    } as const;
  }

  try {
    const permission = await Notifications.getPermissionsAsync();
    if (permission.status !== 'granted') {
      return { ok: false, reason: 'PERMISSION_REQUIRED', message: 'Bildirim izni gerekli.' } as const;
    }

    const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
    const deviceId = await getDeviceId();
    const { error } = await supabase.rpc('notification_register_push_token', {
      p_expo_push_token: tokenResult.data,
      p_device_id: deviceId,
      p_platform: Platform.OS,
      p_sound_key: soundKey,
      p_app_version: Constants.expoConfig?.version ?? '0.9.1',
    });
    if (error) throw error;

    return { ok: true, token: tokenResult.data, projectId } as const;
  } catch (error: any) {
    return {
      ok: false,
      reason: 'REGISTRATION_FAILED',
      message: error?.message || 'Push token kaydedilemedi.',
    } as const;
  }
}

export async function disableExpoPushToken() {
  const deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) return;
  await supabase.rpc('notification_disable_push_token', { p_device_id: deviceId }).catch(() => undefined);
}
