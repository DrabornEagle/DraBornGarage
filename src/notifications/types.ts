import { NotificationSoundKey } from './notificationSounds';

export type NotificationCategory = 'service' | 'appointments' | 'payments' | 'receivables' | 'platform' | 'customer_links' | 'system';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface GarageNotification {
  id: string;
  workshop_id?: string | null;
  workshop_name?: string | null;
  category: NotificationCategory;
  notification_type: string;
  priority: NotificationPriority;
  entity_type?: string | null;
  entity_id?: string | null;
  title: string;
  body: string;
  data: Record<string, unknown>;
  deliver_at: string;
  read_at?: string | null;
  created_at: string;
}

export interface NotificationPreferences {
  local_notifications_enabled: boolean;
  sound_key: NotificationSoundKey;
  service_updates: boolean;
  appointment_reminders: boolean;
  appointment_reminder_24h: boolean;
  appointment_reminder_2h: boolean;
  payment_updates: boolean;
  receivable_reminders: boolean;
  platform_reminders: boolean;
  customer_link_updates: boolean;
  updated_at?: string | null;
}

export interface NotificationCenterPayload {
  notifications: GarageNotification[];
  upcoming: GarageNotification[];
  preferences: NotificationPreferences;
  unread_count: number;
  upcoming_count: number;
  category_counts: Partial<Record<NotificationCategory, number>>;
  server_time: string;
}

export interface NotificationNavigationTarget {
  targetTab?: string;
  targetSection?: string;
  notificationId?: string;
  data?: Record<string, unknown>;
}
