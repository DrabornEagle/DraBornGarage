import Constants from 'expo-constants';
import { Platform } from 'react-native';

declare const require: (moduleName: string) => any;

const isExpoGoAndroid = Platform.OS === 'android' && Constants.executionEnvironment === 'storeClient';
const NativeNotifications = isExpoGoAndroid ? null : require('expo-notifications/build/index');

export const AndroidImportance = NativeNotifications?.AndroidImportance ?? {
  UNKNOWN: 0,
  UNSPECIFIED: -1000,
  NONE: 0,
  MIN: 1,
  LOW: 2,
  DEFAULT: 3,
  HIGH: 4,
  MAX: 5,
};

export const AndroidNotificationVisibility = NativeNotifications?.AndroidNotificationVisibility ?? {
  UNKNOWN: -1,
  SECRET: -1,
  PRIVATE: 0,
  PUBLIC: 1,
};

export const SchedulableTriggerInputTypes = NativeNotifications?.SchedulableTriggerInputTypes ?? {
  CALENDAR: 'calendar',
  DAILY: 'daily',
  DATE: 'date',
  MONTHLY: 'monthly',
  TIME_INTERVAL: 'timeInterval',
  WEEKLY: 'weekly',
  YEARLY: 'yearly',
};

export function setNotificationHandler(handler: unknown) {
  NativeNotifications?.setNotificationHandler(handler);
}

export async function setNotificationChannelAsync(channelId: string, channel: unknown) {
  if (!NativeNotifications) return null;
  return NativeNotifications.setNotificationChannelAsync(channelId, channel);
}

export async function getPermissionsAsync() {
  if (!NativeNotifications) {
    return {
      status: 'denied',
      granted: false,
      expires: 'never',
      canAskAgain: false,
    };
  }
  return NativeNotifications.getPermissionsAsync();
}

export async function requestPermissionsAsync() {
  if (!NativeNotifications) {
    return {
      status: 'denied',
      granted: false,
      expires: 'never',
      canAskAgain: false,
    };
  }
  return NativeNotifications.requestPermissionsAsync();
}

export async function getAllScheduledNotificationsAsync() {
  if (!NativeNotifications) return [];
  return NativeNotifications.getAllScheduledNotificationsAsync();
}

export async function cancelScheduledNotificationAsync(identifier: string) {
  if (!NativeNotifications) return;
  return NativeNotifications.cancelScheduledNotificationAsync(identifier);
}

export async function scheduleNotificationAsync(request: unknown) {
  if (!NativeNotifications) return 'expo-go-disabled';
  return NativeNotifications.scheduleNotificationAsync(request);
}

export async function setBadgeCountAsync(count: number) {
  if (!NativeNotifications) return false;
  return NativeNotifications.setBadgeCountAsync(count);
}

export function addNotificationResponseReceivedListener(listener: (event: any) => void) {
  if (!NativeNotifications) return { remove: () => undefined };
  return NativeNotifications.addNotificationResponseReceivedListener(listener);
}

export type NotificationRequest = {
  identifier: string;
  content: {
    data?: Record<string, unknown>;
  };
};
