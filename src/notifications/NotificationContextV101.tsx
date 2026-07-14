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

const DELIVERED_STORAGE_PREFIX = '@draborngarage/v101-delivered/';
const DEVICE_ID_STORAGE_KEY = '@draborngarage/push-device-id';
const PUSH_TOKEN_STORAGE_KEY = '@draborngarage/expo-push-token';
const IS_EXPO_GO = Constants.appOwnership === 'expo';

export const NOTIFICATION_SOUND_OPTIONS: { key: NotificationSoundKey; label: string; subtitle: string; icon: 'musical-notes' | 'pulse' | 'alert-circle' | 'volume-mute' }[] = [
  { key: 'garage_chime', label: 'Garage Chime', subtitle: 'Uzun ve net garaj melodisi', icon: 'musical-notes' },
  { key: 'garage_pulse', label: 'Garage Pulse', subtitle: 'Güçlü ve ritmik uyarı', icon: 'pulse' },
  { key: 'garage_alert', label: 'Garage Alert', subtitle: 'En uzun ve dikkat çekici', icon: 'alert-circle' },
  { key: 'silent', label: 'Sessiz', subtitle: 'Yalnız titreşim', icon: 'volume-mute' },
];

function soundFile(sound: NotificationSoundKey): string | false {
  if (sound === 'silent') return false;
  if (IS_EXPO_GO) return 'default';
  return `${sound}.wav`;
}

function channelId(sound: NotificationSoundKey) {
  if (sound === 'garage_pulse') return 'draborngarage-pulse-v2';
  if (sound === 'garage_alert') return 'draborngarage-alert-v2';
  if (sound === 'silent') return 'draborngarage-silent-v2';
  return 'draborngarage-chime-v2';
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
    { key: 'garage_chime', name: 'Garage Chime v2', description: 'Uzun ve yüksek DraBornGarage servis bildirimi', vibrationPattern: [0, 260, 110, 260, 110, 420] },
    { key: 'garage_pulse', name: 'Garage Pulse v2', description: 'Ritmik ve güçlü DraBornGarage bildirimi', vibrationPattern: [0, 180, 80, 180, 80, 260, 100, 420] },
    { key: 'garage_alert', name: 'Garage Alert v2', description: 'Acil servis, ödeme ve onay uyarısı', vibrationPattern: [0, 420, 120, 420, 120, 620] },
    { key: 'silent', name: 'DraBornGarage Sessiz v2', description: 'Ses olmadan titreşimli bildirim', vibrationPattern: [0, 220, 120, 220] },
  ];
  await Promise.all(channels.map((item) => Notifications.setNotificationChannelAsync(channelId(item.key), {
    name: item.name,
    description: item.description,
    importance: item.key === 'silent' ? Notifications.AndroidImportance.DEFAULT : Notifications.AndroidImportance.MAX,
    vibrationPattern: item.vibrationPattern,
    enableVibrate: true,
    enableLights: true,
    lightColor: item.key === 'garage_alert' ? '#FF5E78' : '#7C5CFF',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    sound: soundFile(item.key) || null,
  })));
}

function notificationData(item: GarageNotification) {
  return {
    source: 'draborngarage',
    notificationId: item.id,
    notification_id: item.id,
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
  const preferencesRef = useRef(DEFAULT_PREFERENCES);
  const pushStatusRef = useRef<PushRegistrationStatus>('idle');

  useEffect(() => { preferencesRef.current = preferences; }, [preferences]);
  useEffect(() => { pushStatusRef.current = pushStatus; }, [pushStatus]);

  const cancelGarageSchedules = useCallback(async () => {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      await Promise.all(scheduled
        .filter((request) => request.content.data?.source === 'draborngarage')
        .map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)));
    } catch {
      // Bildirim servisi erişilemiyorsa uygulama içi merkez çalışmaya devam eder.
    }
  }, []);

  const syncFutureSchedules = useCallback(async (items: GarageNotification[], nextPreferences: NotificationPreferences, badge: number) => {
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
      const desired = items.filter((item) => {
        const time = new Date(item.deliver_at).getTime();
        return Number.isFinite(time) && time > now + 5000 && time <= maxDate;
      }).slice(0, 60);
      const desiredById = new Map(desired.map((item) => [item.id, item]));
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const existing = new Map<string, Notifications.NotificationRequest>();
      for (const request of scheduled.filter((item) => item.content.data?.source === 'draborngarage')) {
        const id = request.content.data?.notificationId;
        if (typeof id !== 'string' || !desiredById.has(id) || request.content.data?.deliverAt !== desiredById.get(id)?.deliver_at) {
          await Notifications.cancelScheduledNotificationAsync(request.identifier);
        } else {
          existing.set(id, request);
        }
      }
      for (const item of desired) {
        if (existing.has(item.id)) continue;
        await Notifications.scheduleNotificationAsync({
          identifier: `draborngarage-${item.id}`,
          content: {
            title: item.title,
            body: item.body,
            sound: soundFile(nextPreferences.notification_sound),
            badge: Math.max(1, badge),
            data: { ...notificationData(item), deliverAt: item.deliver_at },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: new Date(item.deliver_at),
            channelId: Platform.OS === 'android' ? channelId(nextPreferences.notification_sound) : undefined,
          },
        });
      }
    } catch {
      // Planlama başarısız olsa da bildirim merkezi verisi korunur.
    }
  }, [cancelGarageSchedules]);

  const presentDueNotifications = useCallback(async (items: GarageNotification[], nextPreferences: NotificationPreferences, badge: number) => {
    if (!session?.user || !nextPreferences.local_notifications_enabled) return;
    if (!IS_EXPO_GO && pushStatusRef.current === 'registered') return;
    try {
      const permission = await Notifications.getPermissionsAsync();
      if (permission.status !== 'granted') return;
      const due = items.filter((item) => isDue(item) && !item.read_at).slice(0, 12);
      if (due.length === 0) return;
      const storageKey = `${DELIVERED_STORAGE_PREFIX}${session.user.id}`;
      const raw = await AsyncStorage.getItem(storageKey);
      const delivered: string[] = raw ? JSON.parse(raw) : [];
      const nextDelivered = [...delivered];
      await ensureAndroidChannels();
      for (const item of due.reverse()) {
        if (nextDelivered.includes(item.id)) continue;
        await Notifications.scheduleNotificationAsync({
          identifier: `draborngarage-due-${item.id}`,
          content: {
            title: item.title,
            body: item.body,
            sound: soundFile(nextPreferences.notification_sound),
            badge: Math.max(1, badge),
            data: notificationData(item),
          },
          trigger: Platform.OS === 'android'
            ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: channelId(nextPreferences.notification_sound) }
            : null,
        });
        nextDelivered.push(item.id);
      }
      await AsyncStorage.setItem(storageKey, JSON.stringify(nextDelivered.slice(-350)));
    } catch {
      // Yerel sistem bildirimi gösterilemese bile uygulama içi kayıt korunur.
    }
  }, [session?.user]);

  const refresh = useCallback(async () => {
    if (!session?.user || refreshingRef.current) return;
    refreshingRef.current = true;
    if (mountedRef.current) setLoading(true);
    try {
      const { data, error } = await supabase.rpc('notification_get_center', { p_limit: 120 });
      if (error) throw error;
      const payload = data as NotificationCenterPayload;
      const nextPreferences = { ...DEFAULT_PREFERENCES, ...(payload.preferences || {}) };
      const sorted = [...(payload.notifications || [])].sort((a, b) => new Date(b.deliver_at).getTime() - new Date(a.deliver_at).getTime());
      if (!mountedRef.current) return;
      setNotifications(sorted);
      setUpcoming(payload.upcoming || []);
      setUnreadCount(Number(payload.unread_count || 0));
      setUpcomingCount(Number(payload.upcoming_count || 0));
      setPreferences(nextPreferences);
      await Notifications.setBadgeCountAsync(Number(payload.unread_count || 0)).catch(() => false);
      await syncFutureSchedules(payload.upcoming || [], nextPreferences, Number(payload.unread_count || 0) + 1);
      await presentDueNotifications(sorted, nextPreferences, Number(payload.unread_count || 0));
    } catch {
      // Ağ yoksa son başarılı bildirim listesi korunur.
    } finally {
      refreshingRef.current = false;
      if (mountedRef.current) setLoading(false);
    }
  }, [session?.user, syncFutureSchedules, presentDueNotifications]);

  const registerPushNotifications = useCallback(async () => {
    if (!session?.user || !preferencesRef.current.push_notifications_enabled) return false;
    if (Platform.OS === 'android' && IS_EXPO_GO) {
      setPushStatus('expo_go');
      return false;
    }
    try {
      await ensureAndroidChannels();
      const current = await Notifications.getPermissionsAsync();
      const permission = current.status === 'granted' ? current : await Notifications.requestPermissionsAsync();
      if (mountedRef.current) setPermissionStatus(permission.status);
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
        p_app_version: Constants.expoConfig?.version || '1.0.1',
      });
      if (error) throw error;
      await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
      setPushStatus('registered');
      return true;
    } catch {
      setPushStatus('error');
      return false;
    }
  }, [session?.user]);

  const requestLocalNotifications = useCallback(async () => {
    try {
      await ensureAndroidChannels();
      const current = await Notifications.getPermissionsAsync();
      const result = current.status === 'granted' ? current : await Notifications.requestPermissionsAsync();
      if (mountedRef.current) setPermissionStatus(result.status);
      if (result.status !== 'granted') return false;
      const merged = { ...preferencesRef.current, local_notifications_enabled: true };
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
        p_notification_sound: merged.notification_sound,
        p_push_notifications_enabled: merged.push_notifications_enabled,
      });
      if (error) throw error;
      setPreferences(merged);
      await syncFutureSchedules(upcoming, merged, unreadCount + 1);
      if (merged.push_notifications_enabled) await registerPushNotifications();
      return true;
    } catch {
      return false;
    }
  }, [upcoming, unreadCount, syncFutureSchedules, registerPushNotifications]);

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
    registerPushNotifications();
    const channel = supabase
      .channel(`garage-notifications-v101-${session.user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${session.user.id}`,
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          presentDueNotifications([payload.new as GarageNotification], preferencesRef.current, unreadCount + 1);
        }
        setTimeout(() => refresh(), 180);
      })
      .subscribe();
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        registerPushNotifications();
        refresh();
      }
    });
    const tokenListener = IS_EXPO_GO ? null : Notifications.addPushTokenListener(() => { registerPushNotifications(); });
    return () => {
      appState.remove();
      tokenListener?.remove();
      supabase.removeChannel(channel);
    };
  }, [session?.user, refresh, presentDueNotifications, cancelGarageSchedules, registerPushNotifications, unreadCount]);

  useEffect(() => {
    let lastResponseKey = '';
    const handleResponse = (event: Notifications.NotificationResponse | null) => {
      if (!event) return;
      const data = event.notification.request.content.data || {};
      const responseKey = `${event.notification.request.identifier}:${event.actionIdentifier}`;
      if (lastResponseKey === responseKey) return;
      lastResponseKey = responseKey;
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
    const api = Notifications as typeof Notifications & {
      getLastNotificationResponse?: () => Notifications.NotificationResponse | null;
      getLastNotificationResponseAsync?: () => Promise<Notifications.NotificationResponse | null>;
    };
    if (typeof api.getLastNotificationResponseAsync === 'function') api.getLastNotificationResponseAsync().then(handleResponse).catch(() => undefined);
    else if (typeof api.getLastNotificationResponse === 'function') handleResponse(api.getLastNotificationResponse());
    const response = Notifications.addNotificationResponseReceivedListener(handleResponse);
    return () => response.remove();
  }, [refresh]);

  const updatePreferences = useCallback(async (patch: Partial<NotificationPreferences>) => {
    const merged = { ...preferencesRef.current, ...patch };
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
    else await syncFutureSchedules(upcoming, next, unreadCount + 1);
    if (next.push_notifications_enabled) await registerPushNotifications();
    await refresh();
    return null;
  }, [upcoming, unreadCount, cancelGarageSchedules, syncFutureSchedules, refresh, registerPushNotifications]);

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
          title: 'DraBornGarage v1.0.1 bildirim testi',
          body: 'Uzun ve güçlü bildirim sesi etkin. Gerçek servis hareketleri de cihaz bildirim alanına taşınacak.',
          sound: soundFile(preferences.notification_sound),
          data: { source: 'draborngarage', targetTab: 'home' },
        },
        trigger: Platform.OS === 'android'
          ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: channelId(preferences.notification_sound) }
          : null,
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
    open, loading, notifications, upcoming, unreadCount, upcomingCount, preferences, permissionStatus, pushStatus, navigationTarget,
    openCenter: () => setOpen(true), closeCenter: () => setOpen(false), refresh, markRead, markAllRead, archive, deleteNotification,
    openNotification, updatePreferences, requestLocalNotifications, registerPushNotifications, sendTestNotification, consumeNavigationTarget,
  }), [open, loading, notifications, upcoming, unreadCount, upcomingCount, preferences, permissionStatus, pushStatus, navigationTarget, refresh, markRead, markAllRead, archive, deleteNotification, openNotification, updatePreferences, requestLocalNotifications, registerPushNotifications, sendTestNotification, consumeNavigationTarget]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const value = useContext(NotificationContext);
  if (!value) throw new Error('useNotifications must be used inside NotificationProvider');
  return value;
}
