// The legacy base context still owns the in-app notification feed, but native
// token registration must run through the network-aware v1.1.6 wrapper only.
process.env.EXPO_PUBLIC_NATIVE_PUSH_ENABLED = 'false';

const notificationModule = require('./NotificationContextV116') as typeof import('./NotificationContextV116');

export const NotificationProvider = notificationModule.NotificationProvider;
export const NOTIFICATION_SOUND_OPTIONS = notificationModule.NOTIFICATION_SOUND_OPTIONS;
export const useNotifications = notificationModule.useNotifications;
