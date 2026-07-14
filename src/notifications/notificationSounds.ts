import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export type NotificationSoundKey = 'garage_chime' | 'neon_pulse' | 'cash_arrival' | 'urgent_signal';

export type NotificationSoundOption = {
  key: NotificationSoundKey;
  title: string;
  description: string;
  fileName: string;
  channelId: string;
  vibrationPattern: number[];
  importance: Notifications.AndroidImportance;
};

export const DEFAULT_NOTIFICATION_SOUND: NotificationSoundKey = 'garage_chime';

export const NOTIFICATION_SOUND_OPTIONS: NotificationSoundOption[] = [
  {
    key: 'garage_chime',
    title: 'Garage Chime',
    description: 'Modern, kısa ve dengeli varsayılan ses.',
    fileName: 'garage_chime.wav',
    channelId: 'draborngarage-garage-chime-v1',
    vibrationPattern: [0, 180, 90, 180],
    importance: Notifications.AndroidImportance.HIGH,
  },
  {
    key: 'neon_pulse',
    title: 'Neon Pulse',
    description: 'Teknolojik ve yumuşak üç tonlu uyarı.',
    fileName: 'neon_pulse.wav',
    channelId: 'draborngarage-neon-pulse-v1',
    vibrationPattern: [0, 130, 70, 130],
    importance: Notifications.AndroidImportance.HIGH,
  },
  {
    key: 'cash_arrival',
    title: 'Ödeme Geldi',
    description: 'Ödeme bildirimleri için parlak ve belirgin ses.',
    fileName: 'cash_arrival.wav',
    channelId: 'draborngarage-cash-arrival-v1',
    vibrationPattern: [0, 220, 80, 220, 80, 280],
    importance: Notifications.AndroidImportance.MAX,
  },
  {
    key: 'urgent_signal',
    title: 'Dikkat Sinyali',
    description: 'Acil ve yüksek öncelikli hareketler için güçlü uyarı.',
    fileName: 'urgent_signal.wav',
    channelId: 'draborngarage-urgent-signal-v1',
    vibrationPattern: [0, 300, 100, 300, 100, 300],
    importance: Notifications.AndroidImportance.MAX,
  },
];

export function normalizeNotificationSound(value?: string | null): NotificationSoundKey {
  return NOTIFICATION_SOUND_OPTIONS.some((item) => item.key === value)
    ? value as NotificationSoundKey
    : DEFAULT_NOTIFICATION_SOUND;
}

export function notificationSoundOption(value?: string | null) {
  const key = normalizeNotificationSound(value);
  return NOTIFICATION_SOUND_OPTIONS.find((item) => item.key === key) ?? NOTIFICATION_SOUND_OPTIONS[0];
}

export function notificationSoundForItem(
  selectedSound: string | null | undefined,
  category?: string | null,
  notificationType?: string | null,
  priority?: string | null,
) {
  if (category === 'platform' && notificationType === 'platform_payment_reported') {
    return notificationSoundOption('cash_arrival');
  }
  if (priority === 'urgent') return notificationSoundOption('urgent_signal');
  return notificationSoundOption(selectedSound);
}

export async function ensureNotificationChannel(soundKey?: string | null) {
  const sound = notificationSoundOption(soundKey);
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(sound.channelId, {
      name: `DraBornGarage • ${sound.title}`,
      description: sound.description,
      importance: sound.importance,
      sound: sound.fileName,
      vibrationPattern: sound.vibrationPattern,
      lightColor: '#7C5CFF',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      enableVibrate: true,
      showBadge: true,
    });
  }
  return sound;
}

export async function ensureAllNotificationChannels() {
  await Promise.all(NOTIFICATION_SOUND_OPTIONS.map((item) => ensureNotificationChannel(item.key)));
}
