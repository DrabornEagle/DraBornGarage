import type { NotificationResponse } from 'expo-notifications';

type ExpoNotificationsCompatibilityModule = {
  getLastNotificationResponse?: () => NotificationResponse | null;
  getLastNotificationResponseAsync?: () => Promise<NotificationResponse | null>;
};

declare const require: (moduleName: string) => ExpoNotificationsCompatibilityModule;

const notifications = require('expo-notifications');

if (typeof notifications.getLastNotificationResponseAsync !== 'function') {
  const getLastNotificationResponseAsync = async (): Promise<NotificationResponse | null> => {
    if (typeof notifications.getLastNotificationResponse === 'function') {
      return notifications.getLastNotificationResponse();
    }
    return null;
  };

  try {
    notifications.getLastNotificationResponseAsync = getLastNotificationResponseAsync;
  } catch {
    try {
      Object.defineProperty(notifications, 'getLastNotificationResponseAsync', {
        configurable: true,
        enumerable: false,
        value: getLastNotificationResponseAsync,
        writable: true,
      });
    } catch {
      // Çok eski veya salt okunur Expo modüllerinde son bildirim sorgusu atlanır.
      // Canlı bildirim tıklamaları listener üzerinden çalışmaya devam eder.
    }
  }
}

export {};
