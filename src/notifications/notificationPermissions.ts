import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

export const SYSTEM_NOTIFICATION_CHANNEL_ID = 'draborngarage-system-default-v7';
export const CHIME_NOTIFICATION_CHANNEL_ID = 'draborngarage-appointment-chime-v7';
export const PULSE_NOTIFICATION_CHANNEL_ID = 'draborngarage-workshop-pulse-v7';
export const ALERT_NOTIFICATION_CHANNEL_ID = 'draborngarage-urgent-alert-v7';
export const BELL_NOTIFICATION_CHANNEL_ID = 'draborngarage-classic-bell-v7';
export const SIREN_NOTIFICATION_CHANNEL_ID = 'draborngarage-siren-v7';
export const TURBO_NOTIFICATION_CHANNEL_ID = 'draborngarage-turbo-v7';
export const METAL_NOTIFICATION_CHANNEL_ID = 'draborngarage-metal-v7';
export const DIGITAL_NOTIFICATION_CHANNEL_ID = 'draborngarage-digital-v7';
export const RETRO_NOTIFICATION_CHANNEL_ID = 'draborngarage-retro-v7';
export const SILENT_NOTIFICATION_CHANNEL_ID = 'draborngarage-silent-v7';
export const VOICE_APPOINTMENT_CHANNEL_ID = 'draborngarage-voice-appointment-v10';
export const VOICE_CUSTOMER_LINK_CHANNEL_ID = 'draborngarage-voice-customer-link-v10';
export const VOICE_SERVICE_CHANNEL_ID = 'draborngarage-voice-service-v10';
export const VOICE_PAYMENT_CHANNEL_ID = 'draborngarage-voice-payment-v10';
export const VOICE_GENERIC_CHANNEL_ID = 'draborngarage-voice-generic-v10';
export const NOTIFICATION_INTRO_STORAGE_KEY = '@draborngarage/notification-intro-v116';

const LEGACY_CHANNELS = [
  'draborngarage-system-loud-v4',
  'draborngarage-appointment-chime-v4',
  'draborngarage-workshop-pulse-v4',
  'draborngarage-urgent-alert-v4',
  'draborngarage-silent-v4',
  'draborngarage-system-default-v5',
  'draborngarage-appointment-chime-v5',
  'draborngarage-workshop-pulse-v5',
  'draborngarage-urgent-alert-v5',
  'draborngarage-classic-bell-v5',
  'draborngarage-siren-v5',
  'draborngarage-turbo-v5',
  'draborngarage-metal-v5',
  'draborngarage-digital-v5',
  'draborngarage-retro-v5',
  'draborngarage-silent-v5',
  'draborngarage-system-default-v6',
  'draborngarage-appointment-chime-v6',
  'draborngarage-workshop-pulse-v6',
  'draborngarage-urgent-alert-v6',
  'draborngarage-classic-bell-v6',
  'draborngarage-siren-v6',
  'draborngarage-turbo-v6',
  'draborngarage-metal-v6',
  'draborngarage-digital-v6',
  'draborngarage-retro-v6',
  'draborngarage-silent-v6',
  'draborngarage-voice-appointment-v8',
  'draborngarage-voice-customer-link-v8',
  'draborngarage-voice-service-v8',
  'draborngarage-voice-payment-v8',
  'draborngarage-voice-generic-v8',
  'draborngarage-voice-appointment-v9',
  'draborngarage-voice-customer-link-v9',
  'draborngarage-voice-service-v9',
  'draborngarage-voice-payment-v9',
  'draborngarage-voice-generic-v9',
];

function notificationMethodError(method: string) {
  return new Error(`Android bildirim modülü hazır değil: ${method}`);
}

export async function ensureDraBornNotificationChannels() {
  if (Platform.OS !== 'android') return;
  const api = Notifications as typeof Notifications & Record<string, unknown>;

  if (typeof api.deleteNotificationChannelAsync === 'function') {
    for (const id of LEGACY_CHANNELS) {
      try {
        await Promise.resolve(Notifications.deleteNotificationChannelAsync(id));
      } catch {
        // Eski kanal yoksa veya cihaz üreticisi silmeye izin vermiyorsa yeni kanallar yine oluşturulur.
      }
    }
  }

  if (typeof api.setNotificationChannelAsync !== 'function') {
    throw notificationMethodError('setNotificationChannelAsync');
  }

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
    [VOICE_APPOINTMENT_CHANNEL_ID, { ...common, name: 'Doğal Türkçe Ses • Randevu', description: 'Yeni randevu var. Lütfen kontrol edin.', sound: 'garage_voice_appointment.wav', vibrationPattern: [0, 240, 90, 240, 90, 520] }],
    [VOICE_CUSTOMER_LINK_CHANNEL_ID, { ...common, name: 'Doğal Türkçe Ses • Müşteri Talebi', description: 'Yeni müşteri bağlantı talebi var. Lütfen kontrol edin.', sound: 'garage_voice_customer_link.wav', vibrationPattern: [0, 240, 90, 240, 90, 520] }],
    [VOICE_SERVICE_CHANNEL_ID, { ...common, name: 'Doğal Türkçe Ses • Servis', description: 'Yeni servis bildirimi var. Lütfen kontrol edin.', sound: 'garage_voice_service.wav', vibrationPattern: [0, 240, 90, 240, 90, 520] }],
    [VOICE_PAYMENT_CHANNEL_ID, { ...common, name: 'Doğal Türkçe Ses • Ödeme', description: 'Yeni ödeme bildirimi var. Lütfen kontrol edin.', sound: 'garage_voice_payment.wav', vibrationPattern: [0, 240, 90, 240, 90, 520] }],
    [VOICE_GENERIC_CHANNEL_ID, { ...common, name: 'Doğal Türkçe Sesli Uyarı', description: 'Yeni bildirim var. Lütfen kontrol edin.', sound: 'garage_voice_generic.wav', vibrationPattern: [0, 240, 90, 240, 90, 520] }],
    [SILENT_NOTIFICATION_CHANNEL_ID, { ...common, name: 'Sessiz', description: 'Ses olmadan titreşim ve bildirim alanı uyarısı.', importance: Notifications.AndroidImportance.HIGH, sound: null, vibrationPattern: [0, 220, 120, 220] }],
  ];

  for (const [id, definition] of definitions) {
    await Promise.resolve(Notifications.setNotificationChannelAsync(id, definition));
  }
}

export async function requestDeviceNotificationPermission() {
  const api = Notifications as typeof Notifications & Record<string, unknown>;
  await ensureDraBornNotificationChannels();

  if (typeof api.getPermissionsAsync !== 'function') {
    throw notificationMethodError('getPermissionsAsync');
  }
  const current = await Promise.resolve(Notifications.getPermissionsAsync());
  if (current.status === 'granted') return current;

  if (typeof api.requestPermissionsAsync !== 'function') {
    throw notificationMethodError('requestPermissionsAsync');
  }
  return Promise.resolve(Notifications.requestPermissionsAsync());
}

export async function shouldShowNotificationIntro() {
  const api = Notifications as typeof Notifications & Record<string, unknown>;
  if (typeof api.getPermissionsAsync !== 'function') return true;

  let permission: Notifications.NotificationPermissionsStatus | null = null;
  try {
    permission = await Promise.resolve(Notifications.getPermissionsAsync());
  } catch {
    permission = null;
  }
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
