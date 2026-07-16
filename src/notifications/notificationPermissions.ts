import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

export const SYSTEM_NOTIFICATION_CHANNEL_ID = 'draborngarage-system-default-v5';
export const CHIME_NOTIFICATION_CHANNEL_ID = 'draborngarage-appointment-chime-v5';
export const PULSE_NOTIFICATION_CHANNEL_ID = 'draborngarage-workshop-pulse-v5';
export const ALERT_NOTIFICATION_CHANNEL_ID = 'draborngarage-urgent-alert-v5';
export const BELL_NOTIFICATION_CHANNEL_ID = 'draborngarage-classic-bell-v5';
export const SIREN_NOTIFICATION_CHANNEL_ID = 'draborngarage-siren-v5';
export const TURBO_NOTIFICATION_CHANNEL_ID = 'draborngarage-turbo-v5';
export const METAL_NOTIFICATION_CHANNEL_ID = 'draborngarage-metal-v5';
export const DIGITAL_NOTIFICATION_CHANNEL_ID = 'draborngarage-digital-v5';
export const RETRO_NOTIFICATION_CHANNEL_ID = 'draborngarage-retro-v5';
export const SILENT_NOTIFICATION_CHANNEL_ID = 'draborngarage-silent-v5';
export const NOTIFICATION_INTRO_STORAGE_KEY = '@draborngarage/notification-intro-v110';

const LEGACY_CHANNELS = [
  'draborngarage-system-loud-v4',
  'draborngarage-appointment-chime-v4',
  'draborngarage-workshop-pulse-v4',
  'draborngarage-urgent-alert-v4',
  'draborngarage-silent-v4',
];

export async function ensureDraBornNotificationChannels() {
  if (Platform.OS !== 'android') return;
  await Promise.all(LEGACY_CHANNELS.map((id) => Notifications.deleteNotificationChannelAsync(id).catch(() => undefined)));
  const common = {
    importance: Notifications.AndroidImportance.MAX,
    enableVibrate: true,
    enableLights: true,
    lightColor: '#7C5CFF',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    showBadge: true,
    bypassDnd: false,
  };
  const definitions: Array<[string, Notifications.NotificationChannelInput]> = [
    [SYSTEM_NOTIFICATION_CHANNEL_ID, { ...common, name: 'Telefonun Varsayılan Sesi', description: 'Android sisteminde seçili varsayılan bildirim sesini kullanır.', sound: 'default', vibrationPattern: [0, 280, 100, 430] }],
    [CHIME_NOTIFICATION_CHANNEL_ID, { ...common, name: 'Randevu Çağrısı', description: 'Üç notalı melodik randevu çağrısı.', sound: 'garage_chime.wav', vibrationPattern: [0, 220, 100, 220, 100, 450] }],
    [PULSE_NOTIFICATION_CHANNEL_ID, { ...common, name: 'Atölye Nabzı', description: 'Kalın ve çift darbeli servis uyarısı.', sound: 'garage_pulse.wav', vibrationPattern: [0, 180, 80, 420, 120, 420] }],
    [ALERT_NOTIFICATION_CHANNEL_ID, { ...common, name: 'Acil Garaj Alarmı', description: 'Önemli ödeme ve gecikmeler için yükselen alarm.', sound: 'garage_alert.wav', vibrationPattern: [0, 500, 120, 500, 120, 850] }],
    [BELL_NOTIFICATION_CHANNEL_ID, { ...common, name: 'Klasik Zil', description: 'Uzun kuyruklu metalik zil sesi.', sound: 'garage_bell.wav', vibrationPattern: [0, 240, 90, 240] }],
    [SIREN_NOTIFICATION_CHANNEL_ID, { ...common, name: 'Garaj Sireni', description: 'Yükselip alçalan güçlü siren.', sound: 'garage_siren.wav', vibrationPattern: [0, 520, 100, 520] }],
    [TURBO_NOTIFICATION_CHANNEL_ID, { ...common, name: 'Turbo', description: 'Motor devri yükseliyormuş gibi hızlanan uyarı.', sound: 'garage_turbo.wav', vibrationPattern: [0, 150, 70, 180, 70, 500] }],
    [METAL_NOTIFICATION_CHANNEL_ID, { ...common, name: 'Metal Vuruş', description: 'Atölye karakterli sert metal vuruş.', sound: 'garage_metal.wav', vibrationPattern: [0, 360, 80, 620] }],
    [DIGITAL_NOTIFICATION_CHANNEL_ID, { ...common, name: 'Dijital Uyarı', description: 'Kısa ve net dijital bildirim dizisi.', sound: 'garage_digital.wav', vibrationPattern: [0, 110, 70, 110, 70, 260] }],
    [RETRO_NOTIFICATION_CHANNEL_ID, { ...common, name: 'Retro Oyun', description: 'Klasik oyun konsolu tarzında melodi.', sound: 'garage_retro.wav', vibrationPattern: [0, 100, 60, 100, 60, 320] }],
    [SILENT_NOTIFICATION_CHANNEL_ID, { ...common, name: 'Sessiz', description: 'Ses olmadan titreşim ve bildirim alanı uyarısı.', importance: Notifications.AndroidImportance.HIGH, sound: null, vibrationPattern: [0, 220, 120, 220] }],
  ];
  for (const [id, definition] of definitions) await Notifications.setNotificationChannelAsync(id, definition);
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
