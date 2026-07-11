import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  GarageNotification,
  NotificationCenterPayload,
  NotificationNavigationTarget,
  NotificationPreferences,
} from './types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const CHANNEL_ID = 'draborngarage-alerts';
const DELIVERED_STORAGE_PREFIX = '@draborngarage/local-delivered/';

const DEFAULT_PREFERENCES: NotificationPreferences = {
  local_notifications_enabled: true,
  service_updates: true,
  appointment_reminders: true,
  appointment_reminder_24h: true,
  appointment_reminder_2h: true,
  payment_updates: true,
  receivable_reminders: true,
  platform_reminders: true,
  customer_link_updates: true,
};

interface NotificationContextValue {
  open: boolean;
  loading: boolean;
  notifications: GarageNotification[];
  upcoming: GarageNotification[];
  unreadCount: number;
  upcomingCount: number;
  preferences: NotificationPreferences;
  permissionStatus: string;
  navigationTarget: NotificationNavigationTarget | null;
  openCenter: () => void;
  closeCenter: () => void;
  refresh: () => Promise<void>;
  markRead: (notificationId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  archive: (notificationId: string) => Promise<void>;
  openNotification: (notification: GarageNotification) => Promise<void>;
  updatePreferences: (patch: Partial<NotificationPreferences>) => Promise<string | null>;
  requestLocalNotifications: () => Promise<boolean>;
  sendTestNotification: () => Promise<boolean>;
  consumeNavigationTarget: () => NotificationNavigationTarget | null;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'DraBornGarage Bildirimleri',
    description: 'Servis, randevu, ödeme, alacak ve platform hatırlatmaları',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 220, 120, 220],
    lightColor: '#7C5CFF',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

function notificationData(item: GarageNotification) {
  return {
    source: 'draborngarage',
    notificationId: item.id,
    targetTab: typeof item.data?.target_tab === 'string' ? item.data.target_tab : undefined,
    targetSection: typeof item.data?.target_section === 'string' ? item.data.target_section : undefined,
    ...item.data,
  };
}

function isDue(item: GarageNotification) {
  return new Date(item.deliver_at).getTime() <= Date.now() + 5000;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<GarageNotification[]>([]);
  const [upcoming, setUpcoming] = useState<GarageNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [permissionStatus, setPermissionStatus] = useState<string>('undetermined');
  const [navigationTarget, setNavigationTarget] = useState<NotificationNavigationTarget | null>(null);
  const refreshingRef = useRef(false);
  const mountedRef = useRef(true);

  const cancelGarageSchedules = useCallback(async () => {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      await Promise.all(scheduled
        .filter((request) => request.content.data?.source === 'draborngarage')
        .map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)));
    } catch {
      // Expo Go veya cihaz bildirim servisi geçici olarak erişilemiyorsa uygulama çalışmaya devam eder.
    }
  }, []);

  const syncLocalSchedules = useCallback(async (items: GarageNotification[], nextPreferences: NotificationPreferences) => {
    try {
      const permission = await Notifications.getPermissionsAsync();
      if (mountedRef.current) setPermissionStatus(permission.status);
      if (permission.status !== 'granted' || !nextPreferences.local_notifications_enabled) {
        await cancelGarageSchedules();
        return;
      }

      await ensureAndroidChannel();
      const now = Date.now();
      const maxDate = now + 60 * 24 * 60 * 60 * 1000;
      const desired = items
        .filter((item) => {
          const time = new Date(item.deliver_at).getTime();
          return Number.isFinite(time) && time > now + 5000 && time <= maxDate;
        })
        .slice(0, 60);
      const desiredById = new Map(desired.map((item) => [item.id, item]));
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const garageScheduled = scheduled.filter((request) => request.content.data?.source === 'draborngarage');
      const existingByNotificationId = new Map<string, Notifications.NotificationRequest>();

      for (const request of garageScheduled) {
        const notificationId = request.content.data?.notificationId;
        if (typeof notificationId !== 'string') {
          await Notifications.cancelScheduledNotificationAsync(request.identifier);
          continue;
        }
        const desiredItem = desiredById.get(notificationId);
        const storedDeliverAt = request.content.data?.deliverAt;
        if (!desiredItem || storedDeliverAt !== desiredItem.deliver_at) {
          await Notifications.cancelScheduledNotificationAsync(request.identifier);
          continue;
        }
        existingByNotificationId.set(notificationId, request);
      }

      for (const item of desired) {
        if (existingByNotificationId.has(item.id)) continue;
        const date = new Date(item.deliver_at);
        await Notifications.scheduleNotificationAsync({
          identifier: `draborngarage-${item.id}`,
          content: {
            title: item.title,
            body: item.body,
            sound: false,
            badge: unreadCount + 1,
            data: { ...notificationData(item), deliverAt: item.deliver_at },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date,
            channelId: Platform.OS === 'android' ? CHANNEL_ID : undefined,
          },
        });
      }
    } catch {
      // Yerel bildirim planlama hatası bildirim merkezindeki veriyi etkilemez.
    }
  }, [cancelGarageSchedules, unreadCount]);

  const refresh = useCallback(async () => {
    if (!session?.user || refreshingRef.current) return;
    refreshingRef.current = true;
    if (mountedRef.current) setLoading(true);
    try {
      const { data, error } = await supabase.rpc('notification_get_center', { p_limit: 120 });
      if (error) throw error;
      const payload = data as NotificationCenterPayload;
      const nextPreferences = { ...DEFAULT_PREFERENCES, ...(payload.preferences || {}) };
      if (!mountedRef.current) return;
      setNotifications(payload.notifications || []);
      setUpcoming(payload.upcoming || []);
      setUnreadCount(Number(payload.unread_count || 0));
      setUpcomingCount(Number(payload.upcoming_count || 0));
      setPreferences(nextPreferences);
      await Notifications.setBadgeCountAsync(Number(payload.unread_count || 0)).catch(() => false);
      await syncLocalSchedules(payload.upcoming || [], nextPreferences);
    } catch {
      // Ağ geçici olarak kapalıysa son başarılı bildirim listesi korunur.
    } finally {
      refreshingRef.current = false;
      if (mountedRef.current) setLoading(false);
    }
  }, [session?.user, syncLocalSchedules]);

  const requestLocalNotifications = useCallback(async () => {
    try {
      await ensureAndroidChannel();
      const current = await Notifications.getPermissionsAsync();
      const result = current.status === 'granted' ? current : await Notifications.requestPermissionsAsync();
      if (mountedRef.current) setPermissionStatus(result.status);
      if (result.status !== 'granted') return false;
      const merged = { ...preferences, local_notifications_enabled: true };
      const { error } = await supabase.rpc('notification_update_preferences', {
        p_local_notifications_enabled: true,
        p_service_updates: merged.service_updates,
        p_appointment_reminders: merged.appointment_reminders,
        p_appointment_reminder_24h: merged.appointment_reminder_24h,
        p_appointment_reminder_2h: merged.appointment_reminder_2h,
        p_payment_updates: merged.payment_updates,
        p_receivable_reminders: merged.receivable_reminders,
        p_platform_reminders: merged.platform_reminders,
        p_customer_link_updates: merged.customer_link_updates,
      });
      if (error) throw error;
      setPreferences(merged);
      await syncLocalSchedules(upcoming, merged);
      return true;
    } catch {
      return false;
    }
  }, [preferences, upcoming, syncLocalSchedules]);

  const presentRealtimeNotification = useCallback(async (item: GarageNotification) => {
    if (!session?.user || !preferences.local_notifications_enabled || !isDue(item) || item.read_at) return;
    try {
      const permission = await Notifications.getPermissionsAsync();
      if (permission.status !== 'granted') return;
      const storageKey = `${DELIVERED_STORAGE_PREFIX}${session.user.id}`;
      const raw = await AsyncStorage.getItem(storageKey);
      const delivered: string[] = raw ? JSON.parse(raw) : [];
      if (delivered.includes(item.id)) return;
      await ensureAndroidChannel();
      await Notifications.scheduleNotificationAsync({
        content: {
          title: item.title,
          body: item.body,
          sound: false,
          badge: unreadCount + 1,
          data: notificationData(item),
        },
        trigger: null,
      });
      const next = [...delivered.filter((id) => id !== item.id), item.id].slice(-250);
      await AsyncStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Sistem bildirimi gösterilemese bile uygulama içi kayıt kullanılabilir.
    }
  }, [session?.user, preferences.local_notifications_enabled, unreadCount]);

  useEffect(() => {
    mountedRef.current = true;
    ensureAndroidChannel().catch(() => undefined);
    Notifications.getPermissionsAsync().then((status) => mountedRef.current && setPermissionStatus(status.status)).catch(() => undefined);
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setOpen(false);
      setNotifications([]);
      setUpcoming([]);
      setUnreadCount(0);
      setUpcomingCount(0);
      setPreferences(DEFAULT_PREFERENCES);
      cancelGarageSchedules();
      Notifications.setBadgeCountAsync(0).catch(() => false);
      return;
    }

    refresh();
    const channel = supabase
      .channel(`garage-notifications-${session.user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_notifications',
        filter: `user_id=eq.${session.user.id}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') presentRealtimeNotification(payload.new as GarageNotification);
        setTimeout(() => refresh(), 180);
      })
      .subscribe();

    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });

    return () => {
      appState.remove();
      supabase.removeChannel(channel);
    };
  }, [session?.user, refresh, presentRealtimeNotification, cancelGarageSchedules]);

  useEffect(() => {
    const response = Notifications.addNotificationResponseReceivedListener((event) => {
      const data = event.notification.request.content.data || {};
      const notificationId = typeof data.notificationId === 'string' ? data.notificationId : undefined;
      if (notificationId) supabase.rpc('notification_mark_read', { p_notification_id: notificationId }).then(() => refresh());
      setNavigationTarget({
        targetTab: typeof data.targetTab === 'string' ? data.targetTab : typeof data.target_tab === 'string' ? data.target_tab : undefined,
        targetSection: typeof data.targetSection === 'string' ? data.targetSection : typeof data.target_section === 'string' ? data.target_section : undefined,
        notificationId,
        data: data as Record<string, unknown>,
      });
      setOpen(false);
    });
    return () => response.remove();
  }, [refresh]);

  const updatePreferences = useCallback(async (patch: Partial<NotificationPreferences>) => {
    const merged = { ...preferences, ...patch };
    const { data, error } = await supabase.rpc('notification_update_preferences', {
      p_local_notifications_enabled: merged.local_notifications_enabled,
      p_service_updates: merged.service_updates,
      p_appointment_reminders: merged.appointment_reminders,
      p_appointment_reminder_24h: merged.appointment_reminder_24h,
      p_appointment_reminder_2h: merged.appointment_reminder_2h,
      p_payment_updates: merged.payment_updates,
      p_receivable_reminders: merged.receivable_reminders,
      p_platform_reminders: merged.platform_reminders,
      p_customer_link_updates: merged.customer_link_updates,
    });
    if (error) return error.message;
    const next = { ...DEFAULT_PREFERENCES, ...(data as NotificationPreferences) };
    setPreferences(next);
    if (!next.local_notifications_enabled) await cancelGarageSchedules();
    else await syncLocalSchedules(upcoming, next);
    await refresh();
    return null;
  }, [preferences, upcoming, cancelGarageSchedules, syncLocalSchedules, refresh]);

  const markRead = useCallback(async (notificationId: string) => {
    await supabase.rpc('notification_mark_read', { p_notification_id: notificationId });
    setNotifications((items) => items.map((item) => item.id === notificationId ? { ...item, read_at: item.read_at || new Date().toISOString() } : item));
    setUnreadCount((count) => Math.max(0, count - 1));
    await refresh();
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    await supabase.rpc('notification_mark_all_read');
    const now = new Date().toISOString();
    setNotifications((items) => items.map((item) => ({ ...item, read_at: item.read_at || now })));
    setUnreadCount(0);
    await Notifications.setBadgeCountAsync(0).catch(() => false);
    await refresh();
  }, [refresh]);

  const archive = useCallback(async (notificationId: string) => {
    await supabase.rpc('notification_archive', { p_notification_id: notificationId });
    setNotifications((items) => items.filter((item) => item.id !== notificationId));
    setUpcoming((items) => items.filter((item) => item.id !== notificationId));
    await Notifications.cancelScheduledNotificationAsync(`draborngarage-${notificationId}`).catch(() => undefined);
    await refresh();
  }, [refresh]);

  const openNotification = useCallback(async (notification: GarageNotification) => {
    if (!notification.read_at) await markRead(notification.id);
    const targetTab = typeof notification.data?.target_tab === 'string' ? notification.data.target_tab : undefined;
    const targetSection = typeof notification.data?.target_section === 'string' ? notification.data.target_section : undefined;
    setNavigationTarget({ targetTab, targetSection, notificationId: notification.id, data: notification.data });
    setOpen(false);
  }, [markRead]);

  const sendTestNotification = useCallback(async () => {
    const allowed = permissionStatus === 'granted' || await requestLocalNotifications();
    if (!allowed) return false;
    try {
      await ensureAndroidChannel();
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'DraBornGarage bildirim testi',
          body: 'Telefon bildirimleri çalışıyor. Servis ve hatırlatmalar burada görünecek.',
          sound: false,
          data: { source: 'draborngarage', targetTab: 'home' },
        },
        trigger: null,
      });
      return true;
    } catch {
      return false;
    }
  }, [permissionStatus, requestLocalNotifications]);

  const consumeNavigationTarget = useCallback(() => {
    const current = navigationTarget;
    setNavigationTarget(null);
    return current;
  }, [navigationTarget]);

  const value = useMemo<NotificationContextValue>(() => ({
    open,
    loading,
    notifications,
    upcoming,
    unreadCount,
    upcomingCount,
    preferences,
    permissionStatus,
    navigationTarget,
    openCenter: () => setOpen(true),
    closeCenter: () => setOpen(false),
    refresh,
    markRead,
    markAllRead,
    archive,
    openNotification,
    updatePreferences,
    requestLocalNotifications,
    sendTestNotification,
    consumeNavigationTarget,
  }), [open, loading, notifications, upcoming, unreadCount, upcomingCount, preferences, permissionStatus, navigationTarget, refresh, markRead, markAllRead, archive, openNotification, updatePreferences, requestLocalNotifications, sendTestNotification, consumeNavigationTarget]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const value = useContext(NotificationContext);
  if (!value) throw new Error('useNotifications must be used inside NotificationProvider');
  return value;
}
