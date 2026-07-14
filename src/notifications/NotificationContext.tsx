import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
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
  NotificationSoundKey,
  PushRegistrationStatus,
} from './types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const DELIVERED_STORAGE_PREFIX = '@draborngarage/local-delivered/';
const DEVICE_ID_STORAGE_KEY = '@draborngarage/push-device-id';
const PUSH_TOKEN_STORAGE_KEY = '@draborngarage/expo-push-token';
const IS_EXPO_GO = Constants.appOwnership === 'expo';

export const NOTIFICATION_SOUND_OPTIONS: { key: NotificationSoundKey; label: string; subtitle: string; icon: 'musical-notes' | 'pulse' | 'alert-circle' | 'volume-mute' }[] = [
  { key: 'garage_chime', label: 'Garage Chime', subtitle: 'Modern ve dengeli', icon: 'musical-notes' },
  { key: 'garage_pulse', label: 'Garage Pulse', subtitle: 'Kısa ve enerjik', icon: 'pulse' },
  { key: 'garage_alert', label: 'Garage Alert', subtitle: 'Daha dikkat çekici', icon: 'alert-circle' },
  { key: 'silent', label: 'Sessiz', subtitle: 'Yalnız titreşim', icon: 'volume-mute' },
];

function soundFile(sound: NotificationSoundKey): string | false {
  if (sound === 'silent') return false;
  if (IS_EXPO_GO) return 'default';
  return `${sound}.wav`;
}

function channelId(sound: NotificationSoundKey) {
  if (sound === 'garage_pulse') return 'draborngarage-pulse-v1';
  if (sound === 'garage_alert') return 'draborngarage-alert-v1';
  if (sound === 'silent') return 'draborngarage-silent-v1';
  return 'draborngarage-chime-v1';
}


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
  notification_sound: 'garage_chime',
  push_notifications_enabled: true,
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
  pushStatus: PushRegistrationStatus;
  navigationTarget: NotificationNavigationTarget | null;
  openCenter: () => void;
  closeCenter: () => void;
  refresh: () => Promise<void>;
  markRead: (notificationId: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  archive: (notificationId: string) => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  openNotification: (notification: GarageNotification) => Promise<void>;
  updatePreferences: (patch: Partial<NotificationPreferences>) => Promise<string | null>;
  requestLocalNotifications: () => Promise<boolean>;
  registerPushNotifications: () => Promise<boolean>;
  sendTestNotification: () => Promise<boolean>;
  consumeNavigationTarget: () => NotificationNavigationTarget | null;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

async function ensureAndroidChannels() {
  if (Platform.OS !== 'android') return;
  const channels: { key: NotificationSoundKey; name: string; description: string; vibrationPattern: number[] }[] = [
    { key: 'garage_chime', name: 'Garage Chime', description: 'Modern ve dengeli DraBornGarage bildirim sesi', vibrationPattern: [0, 180, 90, 180] },
    { key: 'garage_pulse', name: 'Garage Pulse', description: 'Kısa ve enerjik DraBornGarage bildirim sesi', vibrationPattern: [0, 120, 70, 120, 70, 160] },
    { key: 'garage_alert', name: 'Garage Alert', description: 'Ödeme ve acil hareketler için dikkat çekici ses', vibrationPattern: [0, 230, 90, 230, 90, 260] },
    { key: 'silent', name: 'DraBornGarage Sessiz', description: 'Ses olmadan titreşimli bildirim', vibrationPattern: [0, 180, 100, 180] },
  ];
  await Promise.all(channels.map((item) => Notifications.setNotificationChannelAsync(channelId(item.key), {
    name: item.name,
    description: item.description,
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: item.vibrationPattern,
    lightColor: item.key === 'garage_alert' ? '#FF5E78' : '#7C5CFF',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    sound: soundFile(item.key) || null,
  })));
}


function notificationData(item: GarageNotification) {
  return {
    source: 'draborngarage',
    notificationId: item.id,
    targetTab: typeof item.data?.target_tab === 'string' ? item.data.target_tab : undefined,
    targetSection: typeof item.data?.target_section === 'string' ? item.data.target_section : undefined,
    workshopId: item.workshop_id ?? undefined,
    workshop_id: item.workshop_id ?? undefined,
    notificationType: item.notification_type,
    notification_type: item.notification_type,
    entityId: item.entity_id ?? undefined,
    entity_id: item.entity_id ?? undefined,
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
  const [pushStatus, setPushStatus] = useState<PushRegistrationStatus>('idle');
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

      await ensureAndroidChannels();
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
            sound: soundFile(nextPreferences.notification_sound),
            badge: unreadCount + 1,
            data: { ...notificationData(item), deliverAt: item.deliver_at },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date,
            channelId: Platform.OS === 'android' ? channelId(nextPreferences.notification_sound) : undefined,
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
      const sortedNotifications = [...(payload.notifications || [])].sort((a, b) => new Date(b.deliver_at).getTime() - new Date(a.deliver_at).getTime());
      setNotifications(sortedNotifications);
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

  const registerPushNotifications = useCallback(async () => {
    if (!session?.user || !preferences.push_notifications_enabled) return false;
    if (Platform.OS === 'android' && IS_EXPO_GO) {
      setPushStatus('expo_go');
      return false;
    }
    try {
      await ensureAndroidChannels();
      const permission = await Notifications.getPermissionsAsync();
      if (permission.status !== 'granted') {
        setPushStatus('denied');
        return false;
      }
      const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID
        || Constants.expoConfig?.extra?.eas?.projectId
        || Constants.easConfig?.projectId;
      if (!projectId) {
        setPushStatus('missing_project');
        return false;
      }
      let deviceId = await AsyncStorage.getItem(DEVICE_ID_STORAGE_KEY);
      if (!deviceId) {
        deviceId = `garage-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
        await AsyncStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
      }
      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      const { error } = await supabase.rpc('notification_register_push_token', {
        p_expo_push_token: token,
        p_device_id: deviceId,
        p_platform: Platform.OS,
        p_app_version: Constants.expoConfig?.version || '0.9.7',
      });
      if (error) throw error;
      await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
      setPushStatus('registered');
      return true;
    } catch {
      setPushStatus('error');
      return false;
    }
  }, [session?.user, preferences.push_notifications_enabled]);

  const requestLocalNotifications = useCallback(async () => {
    try {
      await ensureAndroidChannels();
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
       if (merged.push_notifications_enabled) await registerPushNotifications();
       return true;
    } catch {
      return false;
    }
   }, [preferences, upcoming, syncLocalSchedules, registerPushNotifications]);

  const presentRealtimeNotification = useCallback(async (item: GarageNotification) => {
    if (!session?.user || !preferences.local_notifications_enabled || !isDue(item) || item.read_at) return;
    try {
      const permission = await Notifications.getPermissionsAsync();
      if (permission.status !== 'granted') return;
      const storageKey = `${DELIVERED_STORAGE_PREFIX}${session.user.id}`;
      const raw = await AsyncStorage.getItem(storageKey);
      const delivered: string[] = raw ? JSON.parse(raw) : [];
      if (delivered.includes(item.id)) return;
      await ensureAndroidChannels();
      await Notifications.scheduleNotificationAsync({
        content: {
          title: item.title,
          body: item.body,
          sound: soundFile(preferences.notification_sound),
          badge: unreadCount + 1,
          data: notificationData(item),
        },
        trigger: Platform.OS === 'android' ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: channelId(preferences.notification_sound) } : null,
      });
      const next = [...delivered.filter((id) => id !== item.id), item.id].slice(-250);
      await AsyncStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Sistem bildirimi gösterilemese bile uygulama içi kayıt kullanılabilir.
    }
  }, [session?.user, preferences.local_notifications_enabled, preferences.notification_sound, unreadCount]);

  useEffect(() => {
    mountedRef.current = true;
    ensureAndroidChannels().catch(() => undefined);
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
      setPushStatus('idle');
      cancelGarageSchedules();
      Notifications.setBadgeCountAsync(0).catch(() => false);
      return;
    }

    refresh();
    if (preferences.push_notifications_enabled) registerPushNotifications();
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
  }, [session?.user, refresh, presentRealtimeNotification, cancelGarageSchedules, registerPushNotifications, preferences.push_notifications_enabled]);

  useEffect(() => {
    const handledResponseRef = { current: '' };
    const handleResponse = (event: Notifications.NotificationResponse | null) => {
      if (!event) return;
      const data = event.notification.request.content.data || {};
      const responseKey = `${event.notification.request.identifier}:${event.actionIdentifier}`;
      if (handledResponseRef.current === responseKey) return;
      handledResponseRef.current = responseKey;
      const notificationId = typeof data.notificationId === 'string' ? data.notificationId : typeof data.notification_id === 'string' ? data.notification_id : undefined;
      if (notificationId) supabase.rpc('notification_mark_read', { p_notification_id: notificationId }).then(() => refresh());
      setNavigationTarget({
        targetTab: typeof data.targetTab === 'string' ? data.targetTab : typeof data.target_tab === 'string' ? data.target_tab : undefined,
        targetSection: typeof data.targetSection === 'string' ? data.targetSection : typeof data.target_section === 'string' ? data.target_section : undefined,
        notificationId,
        data: data as Record<string, unknown>,
      });
      setOpen(false);
    };
    const notificationApi = Notifications as typeof Notifications & {
      getLastNotificationResponse?: () => Notifications.NotificationResponse | null;
      getLastNotificationResponseAsync?: () => Promise<Notifications.NotificationResponse | null>;
    };
    if (typeof notificationApi.getLastNotificationResponseAsync === 'function') {
      notificationApi.getLastNotificationResponseAsync().then(handleResponse).catch(() => undefined);
    } else if (typeof notificationApi.getLastNotificationResponse === 'function') {
      handleResponse(notificationApi.getLastNotificationResponse());
    }
    const response = Notifications.addNotificationResponseReceivedListener(handleResponse);
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
      p_notification_sound: merged.notification_sound,
      p_push_notifications_enabled: merged.push_notifications_enabled,
    });
    if (error) return error.message;
    const next = { ...DEFAULT_PREFERENCES, ...(data as NotificationPreferences) };
    setPreferences(next);
    if (!next.local_notifications_enabled) await cancelGarageSchedules();
    else await syncLocalSchedules(upcoming, next);
    if (next.push_notifications_enabled) await registerPushNotifications();
    await refresh();
    return null;
  }, [preferences, upcoming, cancelGarageSchedules, syncLocalSchedules, refresh, registerPushNotifications]);

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

  const deleteNotification = useCallback(async (notificationId: string) => {
    await supabase.rpc('notification_delete', { p_notification_id: notificationId });
    setNotifications((items) => items.filter((item) => item.id !== notificationId));
    setUpcoming((items) => items.filter((item) => item.id !== notificationId));
    await Notifications.cancelScheduledNotificationAsync(`draborngarage-${notificationId}`).catch(() => undefined);
    await refresh();
  }, [refresh]);

  const openNotification = useCallback(async (notification: GarageNotification) => {
    if (!notification.read_at) await markRead(notification.id);
    const targetTab = typeof notification.data?.target_tab === 'string' ? notification.data.target_tab : undefined;
    const targetSection = typeof notification.data?.target_section === 'string' ? notification.data.target_section : undefined;
    setNavigationTarget({ targetTab, targetSection, notificationId: notification.id, data: { ...notification.data, workshop_id: notification.workshop_id, workshopId: notification.workshop_id, notification_type: notification.notification_type, notificationType: notification.notification_type, entity_id: notification.entity_id, entityId: notification.entity_id } });
    setOpen(false);
  }, [markRead]);

  const sendTestNotification = useCallback(async () => {
    const allowed = permissionStatus === 'granted' || await requestLocalNotifications();
    if (!allowed) return false;
    try {
      await ensureAndroidChannels();
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'DraBornGarage bildirim testi',
          body: 'Telefon bildirimleri çalışıyor. Servis ve hatırlatmalar burada görünecek.',
          sound: soundFile(preferences.notification_sound),
          data: { source: 'draborngarage', targetTab: 'home' },
        },
        trigger: Platform.OS === 'android' ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: channelId(preferences.notification_sound) } : null,
      });
      return true;
    } catch {
      return false;
    }
  }, [permissionStatus, requestLocalNotifications, preferences.notification_sound]);

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
    pushStatus,
    navigationTarget,
    openCenter: () => setOpen(true),
    closeCenter: () => setOpen(false),
    refresh,
    markRead,
    markAllRead,
    archive,
    deleteNotification,
    openNotification,
    updatePreferences,
    requestLocalNotifications,
    registerPushNotifications,
    sendTestNotification,
    consumeNavigationTarget,
  }), [open, loading, notifications, upcoming, unreadCount, upcomingCount, preferences, permissionStatus, pushStatus, navigationTarget, refresh, markRead, markAllRead, archive, deleteNotification, openNotification, updatePreferences, requestLocalNotifications, registerPushNotifications, sendTestNotification, consumeNavigationTarget]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const value = useContext(NotificationContext);
  if (!value) throw new Error('useNotifications must be used inside NotificationProvider');
  return value;
}
