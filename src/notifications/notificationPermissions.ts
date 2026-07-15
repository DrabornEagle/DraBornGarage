import AsyncStorage from '@react-native-async-storage/async-storage';
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
