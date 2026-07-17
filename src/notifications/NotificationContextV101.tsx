import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { APP_VERSION } from '../lib/appVersion';
import { ALERT_NOTIFICATION_CHANNEL_ID, BELL_NOTIFICATION_CHANNEL_ID, CHIME_NOTIFICATION_CHANNEL_ID, DIGITAL_NOTIFICATION_CHANNEL_ID, ensureDraBornNotificationChannels, METAL_NOTIFICATION_CHANNEL_ID, PULSE_NOTIFICATION_CHANNEL_ID, requestDeviceNotificationPermission, RETRO_NOTIFICATION_CHANNEL_ID, SILENT_NOTIFICATION_CHANNEL_ID, SIREN_NOTIFICATION_CHANNEL_ID, SYSTEM_NOTIFICATION_CHANNEL_ID, TURBO_NOTIFICATION_CHANNEL_ID, VOICE_APPOINTMENT_CHANNEL_ID, VOICE_CUSTOMER_LINK_CHANNEL_ID, VOICE_GENERIC_CHANNEL_ID, VOICE_PAYMENT_CHANNEL_ID, VOICE_SERVICE_CHANNEL_ID } from './notificationPermissions';
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
const EAS_PROJECT_ID = process.env.EXPO_PUBLIC_EAS_PROJECT_ID
  || Constants.expoConfig?.extra?.eas?.projectId
  || Constants.easConfig?.projectId
  || null;
const NATIVE_PUSH_ENABLED = !IS_EXPO_GO && Boolean(EAS_PROJECT_ID) && process.env.EXPO_PUBLIC_NATIVE_PUSH_ENABLED !== 'false';

export const NOTIFICATION_SOUND_OPTIONS: { key: NotificationSoundKey; label: string; subtitle: string; icon: 'musical-notes' | 'volume-mute' }[] = [
  { key: 'system_loud', label: 'Telefonun Varsayılan Sesi', subtitle: 'Android ayarlarında seçili sistem bildirim sesini kullanır', icon: 'musical-notes' },
  { key: 'garage_chime', label: 'Randevu Çağrısı', subtitle: 'Üç notalı melodik müşteri çağrısı', icon: 'musical-notes' },
  { key: 'garage_pulse', label: 'Atölye Nabzı', subtitle: 'Kalın ve çift darbeli servis uyarısı', icon: 'musical-notes' },
  { key: 'garage_alert', label: 'Acil Garaj Alarmı', subtitle: 'Yükselen, dikkat çekici acil alarm', icon: 'musical-notes' },
  { key: 'garage_bell', label: 'Klasik Zil', subtitle: 'Uzun kuyruklu metalik zil', icon: 'musical-notes' },
  { key: 'garage_siren', label: 'Garaj Sireni', subtitle: 'Yükselip alçalan güçlü siren', icon: 'musical-notes' },
  { key: 'garage_turbo', label: 'Turbo', subtitle: 'Motor devri gibi hızlanan uyarı', icon: 'musical-notes' },
  { key: 'garage_metal', label: 'Metal Vuruş', subtitle: 'Atölye karakterli sert vuruş', icon: 'musical-notes' },
  { key: 'garage_digital', label: 'Dijital Uyarı', subtitle: 'Kısa ve net dijital dizi', icon: 'musical-notes' },
  { key: 'garage_retro', label: 'Retro Oyun', subtitle: 'Klasik oyun konsolu melodisi', icon: 'musical-notes' },
  { key: 'turkish_voice', label: 'Türkçe Sesli Uyarı', subtitle: 'Bildirim türüne göre Türkçe konuşan sabit uyarı', icon: 'musical-notes' },
  { key: 'silent', label: 'Sessiz', subtitle: 'Ses olmadan güçlü titreşim', icon: 'volume-mute' },
];

function voiceKind(item?: Pick<GarageNotification, 'category'> | null) {
  if (item?.category === 'appointments') return 'appointment';
  if (item?.category === 'customer_links') return 'customer_link';
  if (item?.category === 'service') return 'service';
  if (item && ['payments', 'receivables', 'platform'].includes(item.category)) return 'payment';
  return 'generic';
}

function soundFile(sound: NotificationSoundKey, item?: Pick<GarageNotification, 'category'> | null): string | false {
  if (sound === 'silent') return false;
  if (sound === 'system_loud') return 'default';
  if (sound === 'turkish_voice') {
    const kind = voiceKind(item);
    return kind === 'appointment' ? 'garage_voice_appointment.wav'
      : kind === 'customer_link' ? 'garage_voice_customer_link.wav'
        : kind === 'service' ? 'garage_voice_service.wav'
          : kind === 'payment' ? 'garage_voice_payment.wav'
            : 'garage_voice_generic.wav';
  }
  const files: Partial<Record<NotificationSoundKey, string>> = {
    garage_chime: 'garage_chime.wav', garage_pulse: 'garage_pulse.wav', garage_alert: 'garage_alert.wav',
    garage_bell: 'garage_bell.wav', garage_siren: 'garage_siren.wav', garage_turbo: 'garage_turbo.wav',
    garage_metal: 'garage_metal.wav', garage_digital: 'garage_digital.wav', garage_retro: 'garage_retro.wav',
  };
  return files[sound] ?? 'default';
}

function channelId(sound: NotificationSoundKey, item?: Pick<GarageNotification, 'category'> | null) {
  if (sound === 'turkish_voice') {
    const kind = voiceKind(item);
    return kind === 'appointment' ? VOICE_APPOINTMENT_CHANNEL_ID
      : kind === 'customer_link' ? VOICE_CUSTOMER_LINK_CHANNEL_ID
        : kind === 'service' ? VOICE_SERVICE_CHANNEL_ID
          : kind === 'payment' ? VOICE_PAYMENT_CHANNEL_ID
            : VOICE_GENERIC_CHANNEL_ID;
  }
  const channels: Record<Exclude<NotificationSoundKey, 'turkish_voice'>, string> = {
    system_loud: SYSTEM_NOTIFICATION_CHANNEL_ID, garage_chime: CHIME_NOTIFICATION_CHANNEL_ID,
    garage_pulse: PULSE_NOTIFICATION_CHANNEL_ID, garage_alert: ALERT_NOTIFICATION_CHANNEL_ID,
    garage_bell: BELL_NOTIFICATION_CHANNEL_ID, garage_siren: SIREN_NOTIFICATION_CHANNEL_ID,
    garage_turbo: TURBO_NOTIFICATION_CHANNEL_ID, garage_metal: METAL_NOTIFICATION_CHANNEL_ID,
    garage_digital: DIGITAL_NOTIFICATION_CHANNEL_ID, garage_retro: RETRO_NOTIFICATION_CHANNEL_ID,
    silent: SILENT_NOTIFICATION_CHANNEL_ID,
  };
  return channels[sound];
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
  notification_sound: 'system_loud',
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
  pushError: string | null;
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
  sendClosedAppTestNotification: () => Promise<boolean>;
  consumeNavigationTarget: () => NotificationNavigationTarget | null;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

async function ensureAndroidChannels() {
  await ensureDraBornNotificationChannels();
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
  const [pushError, setPushError] = useState<string | null>(null);
  const [navigationTarget, setNavigationTarget] = useState<NotificationNavigationTarget | null>(null);
  const refreshingRef = useRef(false);
  const mountedRef = useRef(true);
  const preferencesRef = useRef(DEFAULT_PREFERENCES);
  const pushStatusRef = useRef<PushRegistrationStatus>('idle');
  const unreadCountRef = useRef(0);
  const receivedSystemNotificationIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => { preferencesRef.current = preferences; }, [preferences]);
  useEffect(() => { pushStatusRef.current = pushStatus; }, [pushStatus]);
  useEffect(() => { unreadCountRef.current = unreadCount; }, [unreadCount]);

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
            sound: soundFile(nextPreferences.notification_sound, item),
            badge: Math.max(1, badge),
            data: { ...notificationData(item), deliverAt: item.deliver_at },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: new Date(item.deliver_at),
            channelId: Platform.OS === 'android' ? channelId(nextPreferences.notification_sound, item) : undefined,
          },
        });
      }
    } catch {
      // Planlama başarısız olsa da bildirim merkezi verisi korunur.
    }
  }, [cancelGarageSchedules]);

  const presentDueNotifications = useCallback(async (items: GarageNotification[], nextPreferences: NotificationPreferences, badge: number) => {
    if (!session?.user || !nextPreferences.local_notifications_enabled) return;
    try {
      // Uzaktan push kayıtlıysa önce FCM/Expo bildiriminin gelmesi için kısa süre bekle.
      // Gelmezse uygulama açıkken yerel Android bildirimi güvenli yedek olarak gösterilir.
      if (!IS_EXPO_GO && pushStatusRef.current === 'registered') {
        await new Promise((resolve) => setTimeout(resolve, 1400));
      }
      const permission = await Notifications.getPermissionsAsync();
      if (permission.status !== 'granted') return;
      const recentCutoff = Date.now() - 24 * 60 * 60 * 1000;
      const due = items.filter((item) => {
        const deliveryTime = new Date(item.deliver_at).getTime();
        return isDue(item) && !item.read_at && Number.isFinite(deliveryTime) && deliveryTime >= recentCutoff;
      }).slice(0, 12);
      if (due.length === 0) return;
      const storageKey = `${DELIVERED_STORAGE_PREFIX}${session.user.id}`;
      const raw = await AsyncStorage.getItem(storageKey);
      const delivered: string[] = raw ? JSON.parse(raw) : [];
      const nextDelivered = [...delivered];
      await ensureAndroidChannels();
      for (const item of due.reverse()) {
        if (nextDelivered.includes(item.id)) continue;
        if (receivedSystemNotificationIdsRef.current.has(item.id)) {
          nextDelivered.push(item.id);
          continue;
        }
        await Notifications.scheduleNotificationAsync({
          identifier: `draborngarage-due-${item.id}`,
          content: {
            title: item.title,
            body: item.body,
            sound: soundFile(nextPreferences.notification_sound, item),
            badge: Math.max(1, badge),
            data: notificationData(item),
          },
          trigger: Platform.OS === 'android'
            ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: channelId(nextPreferences.notification_sound, item) }
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
    setPushError(null);
    if (IS_EXPO_GO) {
      setPushStatus('expo_go');
      setPushError('Expo Go uzaktan push tokenı oluşturmaz. Kapalı uygulama testi için Release APK kurmalısın.');
      return false;
    }
    if (!NATIVE_PUSH_ENABLED || !EAS_PROJECT_ID) {
      setPushStatus('missing_project');
      setPushError('EAS proje kimliği native uygulama yapılandırmasına eklenmemiş.');
      return false;
    }
    try {
      await ensureAndroidChannels();
      const current = await Notifications.getPermissionsAsync();
      const permission = current.status === 'granted' ? current : await Notifications.requestPermissionsAsync();
      if (mountedRef.current) setPermissionStatus(permission.status);
      if (permission.status !== 'granted') {
        setPushStatus('denied');
        setPushError('Android bildirim izni verilmedi. Telefon ayarlarından bildirimi aç.');
        return false;
      }
      let deviceId = await AsyncStorage.getItem(DEVICE_ID_STORAGE_KEY);
      if (!deviceId) {
        deviceId = `garage-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
        await AsyncStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
      }
      const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId: EAS_PROJECT_ID });
      const token = tokenResult.data?.trim();
      if (!token || !/^Expo(nent)?PushToken\[[^\]]+\]$/.test(token)) throw new Error('Geçerli Expo push tokenı alınamadı');
      const { data, error } = await supabase.rpc('notification_register_push_token', {
        p_expo_push_token: token,
        p_device_id: deviceId,
        p_platform: Platform.OS,
        p_app_version: APP_VERSION,
      });
      if (error) throw error;
      if (!(data as { registered?: boolean } | null)?.registered) throw new Error('Push tokenı sunucuda doğrulanamadı');
      await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
      setPushStatus('registered');
      setPushError(null);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Push cihaz kaydı tamamlanamadı';
      setPushStatus('error');
      setPushError(message);
      return false;
    }
  }, [session?.user]);

  const requestLocalNotifications = useCallback(async () => {
    try {
      const result = await requestDeviceNotificationPermission();
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
      if (merged.push_notifications_enabled && NATIVE_PUSH_ENABLED) await registerPushNotifications();
      return true;
    } catch {
      return false;
    }
  }, [upcoming, unreadCount, syncFutureSchedules, registerPushNotifications]);

  useEffect(() => {
    mountedRef.current = true;
    ensureAndroidChannels().catch(() => undefined);

    const api = Notifications as typeof Notifications & Record<string, unknown>;
    if (typeof api.getPermissionsAsync === 'function') {
      Promise.resolve(Notifications.getPermissionsAsync())
        .then((status) => mountedRef.current && setPermissionStatus(status.status))
        .catch(() => undefined);
    }

    let receivedListener: { remove?: () => void } | null = null;
    if (typeof api.addNotificationReceivedListener === 'function') {
      try {
        receivedListener = Notifications.addNotificationReceivedListener((notification) => {
          const data = notification.request.content.data || {};
          const notificationId = typeof data.notificationId === 'string'
            ? data.notificationId
            : typeof data.notification_id === 'string'
              ? data.notification_id
              : null;
          if (!notificationId) return;
          const ids = receivedSystemNotificationIdsRef.current;
          ids.add(notificationId);
          while (ids.size > 350) {
            const oldest = ids.values().next().value;
            if (typeof oldest !== 'string') break;
            ids.delete(oldest);
          }
        });
      } catch {
        receivedListener = null;
      }
    }

    return () => {
      mountedRef.current = false;
      if (typeof receivedListener?.remove === 'function') receivedListener.remove();
    };
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
      setPushError(null);
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
          presentDueNotifications([payload.new as GarageNotification], preferencesRef.current, unreadCountRef.current + 1);
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
    const activePoll = setInterval(() => {
      if (AppState.currentState === 'active') refresh();
    }, 20000);
    let tokenListener: { remove: () => void } | null = null;
    if (NATIVE_PUSH_ENABLED && !IS_EXPO_GO) {
      try {
        tokenListener = Notifications.addPushTokenListener(() => { registerPushNotifications(); });
      } catch {
        setPushStatus('error');
      }
    }
    return () => {
      appState.remove();
      clearInterval(activePoll);
      tokenListener?.remove();
      supabase.removeChannel(channel);
    };
  }, [session?.user, refresh, presentDueNotifications, cancelGarageSchedules, registerPushNotifications]);

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
      addNotificationResponseReceivedListener?: typeof Notifications.addNotificationResponseReceivedListener;
    };
    if (typeof api.getLastNotificationResponseAsync === 'function') api.getLastNotificationResponseAsync().then(handleResponse).catch(() => undefined);
    else if (typeof api.getLastNotificationResponse === 'function') handleResponse(api.getLastNotificationResponse());
    let response: { remove?: () => void } | null = null;
    if (typeof api.addNotificationResponseReceivedListener === 'function') {
      try {
        response = api.addNotificationResponseReceivedListener(handleResponse);
      } catch {
        response = null;
      }
    }
    return () => {
      if (typeof response?.remove === 'function') response.remove();
    };
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
    if (next.push_notifications_enabled && NATIVE_PUSH_ENABLED) await registerPushNotifications();
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
          title: `DraBornGarage v${APP_VERSION} bildirim testi`,
          body: 'Telefonunun varsayılan bildirim sesi ve yüksek öncelikli DraBornGarage kanalı etkin.',
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

  const sendClosedAppTestNotification = useCallback(async () => {
    if (!session?.user) return false;
    const registered = pushStatusRef.current === 'registered' || await registerPushNotifications();
    if (!registered) return false;
    try {
      const { data, error } = await supabase.rpc('notification_schedule_closed_app_test', { p_delay_seconds: 45 });
      if (error) throw error;
      await refresh();
      return Boolean((data as { scheduled?: boolean } | null)?.scheduled);
    } catch (error) {
      setPushError(error instanceof Error ? error.message : 'Kapalı uygulama testi planlanamadı');
      return false;
    }
  }, [session?.user, refresh, registerPushNotifications]);

  const consumeNavigationTarget = useCallback(() => {
    const current = navigationTarget;
    setNavigationTarget(null);
    return current;
  }, [navigationTarget]);

  const value = useMemo<NotificationContextValue>(() => ({
    open, loading, notifications, upcoming, unreadCount, upcomingCount, preferences, permissionStatus, pushStatus, pushError, navigationTarget,
    openCenter: () => setOpen(true), closeCenter: () => setOpen(false), refresh, markRead, markAllRead, archive, deleteNotification,
    openNotification, updatePreferences, requestLocalNotifications, registerPushNotifications, sendTestNotification, sendClosedAppTestNotification, consumeNavigationTarget,
  }), [open, loading, notifications, upcoming, unreadCount, upcomingCount, preferences, permissionStatus, pushStatus, pushError, navigationTarget, refresh, markRead, markAllRead, archive, deleteNotification, openNotification, updatePreferences, requestLocalNotifications, registerPushNotifications, sendTestNotification, sendClosedAppTestNotification, consumeNavigationTarget]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const value = useContext(NotificationContext);
  if (!value) throw new Error('useNotifications must be used inside NotificationProvider');
  return value;
}
