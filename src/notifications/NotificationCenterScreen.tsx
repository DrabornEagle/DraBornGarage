import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { GlassCard } from '../components/GlassCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { useTheme } from '../context/ThemeContext';
import { NOTIFICATION_SOUND_OPTIONS, useNotifications } from './NotificationContext';
import { GarageNotification, NotificationCategory, NotificationPreferences, NotificationSoundKey } from './types';

type CenterTab = 'all' | 'unread' | 'upcoming' | 'settings';

const CATEGORY_META: Record<NotificationCategory, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  service: { label: 'Servis', icon: 'construct' },
  appointments: { label: 'Randevu', icon: 'calendar' },
  payments: { label: 'Ödeme', icon: 'cash' },
  receivables: { label: 'Alacak', icon: 'wallet' },
  platform: { label: 'Platform', icon: 'card' },
  customer_links: { label: 'Eşleştirme', icon: 'link' },
  system: { label: 'Sistem', icon: 'shield-checkmark' },
};

function formatDateTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '-';
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function relativeTime(value: string) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return '-';
  const difference = time - Date.now();
  const absolute = Math.abs(difference);
  const future = difference > 0;
  if (absolute < 60_000) return future ? 'birazdan' : 'az önce';
  if (absolute < 3_600_000) {
    const minutes = Math.max(1, Math.round(absolute / 60_000));
    return future ? `${minutes} dk sonra` : `${minutes} dk önce`;
  }
  if (absolute < 86_400_000) {
    const hours = Math.max(1, Math.round(absolute / 3_600_000));
    return future ? `${hours} saat sonra` : `${hours} saat önce`;
  }
  const days = Math.max(1, Math.round(absolute / 86_400_000));
  return future ? `${days} gün sonra` : `${days} gün önce`;
}

export function NotificationCenterScreen() {
  const { colors, resolvedMode } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    open,
    loading,
    notifications,
    upcoming,
    unreadCount,
    upcomingCount,
    preferences,
    permissionStatus,
    pushStatus,
    closeCenter,
    refresh,
    markAllRead,
    archive,
    deleteNotification,
    openNotification,
    updatePreferences,
    requestLocalNotifications,
    registerPushNotifications,
    sendTestNotification,
  } = useNotifications();
  const [tab, setTab] = useState<CenterTab>('all');
  const [saving, setSaving] = useState(false);

  const visible = useMemo(() => {
    if (tab === 'upcoming') return upcoming;
    const sourceItems = tab === 'unread' ? notifications.filter((item) => !item.read_at) : notifications;
    return [...sourceItems].sort((a, b) => new Date(b.deliver_at).getTime() - new Date(a.deliver_at).getTime());
  }, [tab, notifications, upcoming]);

  const permissionLabel = permissionStatus === 'granted'
    ? 'Telefon bildirim izni açık'
    : permissionStatus === 'denied'
      ? 'Telefon bildirim izni kapalı'
      : 'Telefon bildirim izni verilmedi';

  const updatePreference = async (patch: Partial<NotificationPreferences>) => {
    setSaving(true);
    const error = await updatePreferences(patch);
    setSaving(false);
    if (error) Alert.alert('Bildirim ayarı kaydedilemedi', error);
  };

  const enableLocal = async () => {
    setSaving(true);
    const enabled = await requestLocalNotifications();
    setSaving(false);
    Alert.alert(enabled ? 'Telefon bildirimleri açıldı' : 'Bildirim izni verilmedi', enabled
      ? 'Randevu, borç ve platform hatırlatmaları uygun zamanda telefonda gösterilecek.'
      : 'Telefon ayarlarından DraBornGarage bildirim iznini açman gerekiyor.');
  };

  const selectSound = async (sound: NotificationSoundKey) => {
    setSaving(true);
    const error = await updatePreferences({ notification_sound: sound });
    setSaving(false);
    if (error) Alert.alert('Bildirim sesi kaydedilemedi', error);
  };

  const enablePush = async () => {
    setSaving(true);
    const error = await updatePreferences({ push_notifications_enabled: true });
    const enabled = !error && await registerPushNotifications();
    setSaving(false);
    if (error) return Alert.alert('Push bildirimi açılamadı', error);
    Alert.alert(enabled ? 'Uygulama kapalı bildirimleri hazır' : 'Native APK kurulumu gerekli', enabled
      ? 'Yeni bildirimler uygulama kapalıyken de seçtiğin sesle gelebilir.'
      : 'Expo Go Android uzaktan push alamaz. EAS ile oluşturulan APK kurulduğunda bu özellik otomatik etkinleşir.');
  };

  const testLocal = async () => {
    setSaving(true);
    const ok = await sendTestNotification();
    setSaving(false);
    Alert.alert(ok ? 'Test bildirimi gönderildi' : 'Test bildirimi gönderilemedi', ok
      ? 'Telefonunun bildirim alanını kontrol et.'
      : 'Bildirim izni veya cihaz bildirim servisi kullanılamıyor.');
  };

  return (
    <Modal visible={open} animationType="slide" presentationStyle="fullScreen" onRequestClose={closeCenter} statusBarTranslucent>
      <View style={[styles.page, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.glowOne} pointerEvents="none"><View style={[styles.glow, { backgroundColor: colors.primary }]} /></View>
        <View style={styles.glowTwo} pointerEvents="none"><View style={[styles.glow, { backgroundColor: colors.cyan }]} /></View>

        <View style={styles.header}>
          <View style={styles.copy}>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>v1.0.3 RC • GÜÇLÜ BİLDİRİM MERKEZİ</Text>
            <Text style={[styles.title, { color: colors.text }]}>Bildirimler</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>Servis, randevu, ödeme, alacak ve platform hareketleri tek akışta.</Text>
          </View>
          <AnimatedPressable onPress={closeCenter} style={[styles.close, { backgroundColor: colors.cardStrong, borderColor: colors.border }]}>
            <Ionicons name="close" size={23} color={colors.text} />
          </AnimatedPressable>
        </View>

        <LinearGradient colors={[colors.primary, colors.primary2, colors.black]} style={styles.hero}>
          <View style={styles.heroIcon}><Ionicons name="notifications" size={31} color="#fff" /></View>
          <View style={styles.copy}>
            <Text style={styles.heroEyebrow}>OKUNMAMIŞ</Text>
            <Text style={styles.heroValue}>{unreadCount}</Text>
            <Text style={styles.heroText}>{upcomingCount} planlı hatırlatma • {permissionLabel}</Text>
          </View>
          <AnimatedPressable onPress={refresh} style={styles.heroRefresh}>
            <Ionicons name={loading ? 'sync' : 'refresh'} size={20} color="#fff" />
          </AnimatedPressable>
        </LinearGradient>

        <View style={[styles.tabs, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}>
          <TabButton active={tab === 'all'} label="Tümü" icon="layers" badge={notifications.length} onPress={() => setTab('all')} />
          <TabButton active={tab === 'unread'} label="Okunmamış" icon="ellipse" badge={unreadCount} onPress={() => setTab('unread')} />
          <TabButton active={tab === 'upcoming'} label="Yaklaşan" icon="time" badge={upcomingCount} onPress={() => setTab('upcoming')} />
          <TabButton active={tab === 'settings'} label="Ayarlar" icon="options" onPress={() => setTab('settings')} />
        </View>

        {tab === 'settings' ? (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <GlassCard style={styles.permissionCard}>
              <View style={[styles.permissionIcon, { backgroundColor: permissionStatus === 'granted' ? `${colors.green}18` : `${colors.orange}18` }]}>
                <Ionicons name={permissionStatus === 'granted' ? 'notifications' : 'notifications-off'} size={25} color={permissionStatus === 'granted' ? colors.green : colors.orange} />
              </View>
              <View style={styles.copy}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{permissionLabel}</Text>
                <Text style={[styles.cardText, { color: colors.textMuted }]}>Uygulama içi bildirim merkezi her zaman çalışır. Telefon izni, yaklaşan hatırlatmaları cihaz bildirim alanında da gösterir.</Text>
              </View>
            </GlassCard>

            {permissionStatus !== 'granted' && <PrimaryButton title="Telefon Bildirimlerini Aç" onPress={enableLocal} loading={saving} />}
            {permissionStatus === 'granted' && <PrimaryButton title="Test Bildirimi Gönder" onPress={testLocal} loading={saving} secondary />}

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Bildirim sesi</Text>
            <View style={styles.soundGrid}>
              {NOTIFICATION_SOUND_OPTIONS.map((option) => <SoundChoice key={option.key} active={preferences.notification_sound === option.key} label={option.label} subtitle={option.subtitle} icon={option.icon} onPress={() => selectSound(option.key)} />)}
            </View>
            <Text style={[styles.soundHint, { color: colors.textMuted }]}>{IS_EXPO_GO_TEXT(pushStatus)}</Text>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Bildirim tercihleri</Text>
            <GlassCard style={styles.settingsCard}>
              <SettingRow icon="phone-portrait" title="Telefon bildirimleri" subtitle="Planlı hatırlatmaları cihazda göster." value={preferences.local_notifications_enabled} onChange={(value) => updatePreference({ local_notifications_enabled: value })} disabled={saving || permissionStatus !== 'granted'} />
              <SettingRow icon="cloud-download" title="Uygulama kapalıyken bildir" subtitle={pushStatus === 'registered' ? 'Native push cihazı kayıtlı ve aktif.' : 'APK içinde uzaktan push bağlantısını etkinleştir.'} value={preferences.push_notifications_enabled} onChange={(value) => value ? enablePush() : updatePreference({ push_notifications_enabled: false })} disabled={saving} />
              <SettingRow icon="construct" title="Servis güncellemeleri" subtitle="Teslim alma, fiyat, tamir, parça, test, hazır ve teslim." value={preferences.service_updates} onChange={(value) => updatePreference({ service_updates: value })} disabled={saving} />
              <SettingRow icon="calendar" title="Randevu bildirimleri" subtitle="Yeni randevu, onay, değişiklik ve iptal." value={preferences.appointment_reminders} onChange={(value) => updatePreference({ appointment_reminders: value })} disabled={saving} />
              <SettingRow icon="time" title="24 saat önce" subtitle="Randevudan bir gün önce hatırlat." value={preferences.appointment_reminder_24h} onChange={(value) => updatePreference({ appointment_reminder_24h: value })} disabled={saving || !preferences.appointment_reminders} nested />
              <SettingRow icon="alarm" title="2 saat önce" subtitle="Randevu yaklaşırken tekrar hatırlat." value={preferences.appointment_reminder_2h} onChange={(value) => updatePreference({ appointment_reminder_2h: value })} disabled={saving || !preferences.appointment_reminders} nested />
              <SettingRow icon="cash" title="Ödeme ve fiyat" subtitle="Fiyat, tahsilat ve kalan tutar değişiklikleri." value={preferences.payment_updates} onChange={(value) => updatePreference({ payment_updates: value })} disabled={saving} />
              <SettingRow icon="wallet" title="Borç ve alacak" subtitle="Ödeme sözü günü ve geciken borçlar." value={preferences.receivable_reminders} onChange={(value) => updatePreference({ receivable_reminders: value })} disabled={saving} />
              <SettingRow icon="card" title="Platform ödemeleri" subtitle="Ödeme günü, gecikme, bildirim ve Admin onayı." value={preferences.platform_reminders} onChange={(value) => updatePreference({ platform_reminders: value })} disabled={saving} />
              <SettingRow icon="link" title="Müşteri eşleştirme" subtitle="Yeni talep, onay ve ret hareketleri." value={preferences.customer_link_updates} onChange={(value) => updatePreference({ customer_link_updates: value })} disabled={saving} last />
            </GlassCard>

            <GlassCard style={[styles.infoCard, { borderColor: `${colors.cyan}35` }]}>
              <Ionicons name="information-circle" size={23} color={colors.cyan} />
              <Text style={[styles.infoText, { color: colors.textMuted }]}>Bildirimler Supabase’de kullanıcıya özel hazırlanır. Native APK içinde uygulama kapalıyken push olarak, yaklaşan kayıtlar ise seçtiğin sesle zamanlı bildirim olarak gönderilir.</Text>
            </GlassCard>
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {tab === 'unread' && unreadCount > 0 && (
              <AnimatedPressable onPress={markAllRead} style={[styles.markAll, { backgroundColor: `${colors.green}12`, borderColor: `${colors.green}35` }]}>
                <Ionicons name="checkmark-done" size={19} color={colors.green} />
                <Text style={[styles.markAllText, { color: colors.green }]}>Tümünü okundu işaretle</Text>
              </AnimatedPressable>
            )}

            {visible.length === 0 ? (
              <GlassCard style={styles.emptyCard}>
                <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}12` }]}><Ionicons name={tab === 'upcoming' ? 'time-outline' : 'notifications-off-outline'} size={33} color={colors.primary} /></View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>{tab === 'upcoming' ? 'Yaklaşan hatırlatma yok' : tab === 'unread' ? 'Tüm bildirimler okundu' : 'Henüz bildirim yok'}</Text>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>Servis ve iş akışı hareketleri oluştuğunda burada görünecek.</Text>
              </GlassCard>
            ) : visible.map((item) => (
              <NotificationCard
                key={item.id}
                item={item}
                upcoming={tab === 'upcoming'}
                onOpen={() => openNotification(item)}
                onArchive={() => Alert.alert('Bildirim arşivlensin mi?', item.title, [
                  { text: 'Vazgeç' },
                  { text: 'Arşivle', onPress: () => archive(item.id) },
                 ])}
                 onDelete={() => Alert.alert('Bildirim kalıcı olarak silinsin mi?', item.title, [
                  { text: 'Vazgeç' },
                   { text: 'Sil', style: 'destructive', onPress: () => deleteNotification(item.id) },
                ])}
              />
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

function TabButton({ active, label, icon, badge, onPress }: { active: boolean; label: string; icon: keyof typeof Ionicons.glyphMap; badge?: number; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <AnimatedPressable onPress={onPress} style={[styles.tab, active && { backgroundColor: colors.cardStrong, borderColor: colors.primary }]}>
      <Ionicons name={icon} size={16} color={active ? colors.primary : colors.textMuted} />
      <Text numberOfLines={1} style={[styles.tabText, { color: active ? colors.text : colors.textMuted }]}>{label}</Text>
      {typeof badge === 'number' && badge > 0 && <View style={[styles.tabBadge, { backgroundColor: active ? colors.primary : colors.border }]}><Text style={styles.tabBadgeText}>{badge > 99 ? '99+' : badge}</Text></View>}
    </AnimatedPressable>
  );
}

function IS_EXPO_GO_TEXT(status: string) {
  if (status === 'registered') return 'Seçtiğin ses native push ve zamanlı bildirimlerde aktif.';
  if (status === 'expo_go') return 'Expo Go özel ses ve kapalı uygulama pushunu desteklemez; APK kurulunca seçimin aktif olur.';
  if (status === 'missing_project') return 'EAS proje kimliği eklenince kapalı uygulama pushu otomatik kaydolur.';
  return 'Sesi “Test Bildirimi Gönder” düğmesiyle dinleyebilirsin.';
}

function SoundChoice({ active, label, subtitle, icon, onPress }: { active: boolean; label: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  const { colors } = useTheme();
  return <AnimatedPressable onPress={onPress} style={[styles.soundCard, { backgroundColor: active ? `${colors.primary}17` : colors.card, borderColor: active ? colors.primary : colors.border }]}>
    <View style={[styles.soundIcon, { backgroundColor: active ? `${colors.primary}22` : colors.surfaceSoft }]}><Ionicons name={icon} size={20} color={active ? colors.primary : colors.textMuted} /></View>
    <View style={styles.copy}><Text style={[styles.soundTitle, { color: active ? colors.primary : colors.text }]}>{label}</Text><Text style={[styles.soundSubtitle, { color: colors.textMuted }]}>{subtitle}</Text></View>
    <View style={[styles.soundCheck, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary : 'transparent' }]}>{active && <Ionicons name="checkmark" size={13} color="#fff" />}</View>
  </AnimatedPressable>;
}

function NotificationCard({ item, upcoming, onOpen, onArchive, onDelete }: { item: GarageNotification; upcoming: boolean; onOpen: () => void; onArchive: () => void; onDelete: () => void }) {
  const { colors } = useTheme();
  const incomingPayment = item.notification_type === 'platform_payment_reported';
  const meta = incomingPayment ? { label: 'ÖDEME GELDİ', icon: 'cash' as keyof typeof Ionicons.glyphMap } : CATEGORY_META[item.category] || CATEGORY_META.system;
  const accent = incomingPayment
    ? colors.green
    : item.priority === 'urgent'
    ? colors.red
    : item.priority === 'high'
      ? colors.orange
      : item.category === 'appointments'
        ? colors.cyan
        : item.category === 'platform'
          ? colors.primary
          : colors.green;
  const unread = !item.read_at && !upcoming;

  return (
    <AnimatedPressable onPress={onOpen} style={[styles.notificationCard, incomingPayment && styles.incomingPaymentCard, { backgroundColor: unread ? `${accent}10` : colors.card, borderColor: incomingPayment ? accent : unread ? `${accent}55` : colors.border }]}>
      <View style={[styles.notificationIcon, { backgroundColor: `${accent}18`, borderColor: `${accent}35` }]}>
        <Ionicons name={meta.icon} size={22} color={accent} />
      </View>
      <View style={styles.copy}>
        <View style={styles.notificationHeader}>
          <View style={[styles.categoryPill, { backgroundColor: `${accent}14` }]}><Text style={[styles.categoryText, { color: accent }]}>{meta.label}</Text></View>
          <Text style={[styles.time, { color: colors.textMuted }]}>{relativeTime(item.deliver_at)}</Text>
        </View>
        {incomingPayment && <View style={[styles.paymentArrivedBanner, { backgroundColor: `${colors.green}18`, borderColor: `${colors.green}45` }]}><View style={[styles.paymentPulse, { backgroundColor: colors.green }]} /><Text style={[styles.paymentArrivedText, { color: colors.green }]}>İŞLETME ÖDEMESİ • ONAY BEKLİYOR</Text><Ionicons name="chevron-forward" size={15} color={colors.green} /></View>}
        <Text style={[styles.notificationTitle, incomingPayment && styles.incomingPaymentTitle, { color: colors.text }]}>{item.title}</Text>
        <Text style={[styles.notificationBody, { color: colors.textMuted }]}>{item.body}</Text>
        <View style={styles.notificationFooter}>
          <Text style={[styles.workshop, { color: colors.textSoft }]}>{item.workshop_name || 'DraBornGarage'} • {formatDateTime(item.deliver_at)}</Text>
          {unread && <View style={[styles.unreadDot, { backgroundColor: accent }]} />}
        </View>
      </View>
      <View style={styles.notificationActions}>
        <AnimatedPressable onPress={onArchive} style={[styles.archive, { backgroundColor: `${colors.textMuted}0D` }]}>
          <Ionicons name="archive-outline" size={17} color={colors.textMuted} />
        </AnimatedPressable>
        <AnimatedPressable onPress={onDelete} style={[styles.deleteAction, { backgroundColor: `${colors.red}10`, borderColor: `${colors.red}35` }]}>
          <Ionicons name="trash-outline" size={15} color={colors.red} />
        </AnimatedPressable>
      </View>
    </AnimatedPressable>
  );
}

function SettingRow({ icon, title, subtitle, value, onChange, disabled, nested, last }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; value: boolean; onChange: (value: boolean) => void; disabled?: boolean; nested?: boolean; last?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.settingRow, nested && styles.settingNested, !last && { borderBottomColor: colors.border, borderBottomWidth: 1 }, disabled && { opacity: 0.52 }]}>
      <View style={[styles.settingIcon, { backgroundColor: `${colors.primary}12` }]}><Ionicons name={icon} size={19} color={colors.primary} /></View>
      <View style={styles.copy}>
        <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: colors.border, true: `${colors.primary}88` }}
        thumbColor={value ? colors.primary : colors.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 16, overflow: 'hidden' },
  glowOne: { position: 'absolute', top: -100, right: -80, opacity: 0.16 },
  glowTwo: { position: 'absolute', bottom: 20, left: -120, opacity: 0.11 },
  glow: { width: 260, height: 260, borderRadius: 130 },
  copy: { flex: 1, minWidth: 0 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingTop: 8, paddingBottom: 14 },
  eyebrow: { fontSize: 11, fontWeight: '900', letterSpacing: 1.15 },
  title: { fontSize: 31, lineHeight: 36, fontWeight: '900', letterSpacing: -1 },
  subtitle: { fontSize: 12.5, lineHeight: 17, marginTop: 3, maxWidth: 315 },
  close: { width: 45, height: 45, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { minHeight: 116, borderRadius: 25, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  heroEyebrow: { color: 'rgba(255,255,255,0.72)', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  heroValue: { color: '#fff', fontSize: 28, fontWeight: '900', lineHeight: 32 },
  heroText: { color: 'rgba(255,255,255,0.76)', fontSize: 11, lineHeight: 14, marginTop: 2 },
  heroRefresh: { width: 41, height: 41, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  tabs: { minHeight: 59, borderRadius: 19, borderWidth: 1, padding: 5, flexDirection: 'row', gap: 4, marginTop: 12 },
  tab: { flex: 1, minWidth: 0, borderRadius: 14, borderWidth: 1, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center', gap: 2, paddingHorizontal: 2 },
  tabText: { fontSize: 10, fontWeight: '900' },
  tabBadge: { position: 'absolute', top: 3, right: 3, minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center' },
  tabBadgeText: { color: '#fff', fontSize: 9.5, fontWeight: '900' },
  scrollContent: { paddingTop: 12, paddingBottom: 30, gap: 10 },
  markAll: { minHeight: 45, borderRadius: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  markAllText: { fontSize: 12.5, fontWeight: '900' },
  notificationCard: { minHeight: 119, borderRadius: 21, borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  incomingPaymentCard: { borderWidth: 2, minHeight: 146 },
  paymentArrivedBanner: { minHeight: 27, borderRadius: 10, borderWidth: 1, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  paymentPulse: { width: 7, height: 7, borderRadius: 4 },
  paymentArrivedText: { flex: 1, fontSize: 8.8, fontWeight: '900', letterSpacing: 0.45 },
  incomingPaymentTitle: { fontSize: 15.5, marginTop: 7 },
  notificationIcon: { width: 45, height: 45, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  notificationHeader: { minHeight: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  categoryPill: { minHeight: 20, borderRadius: 999, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  categoryText: { fontSize: 9.5, fontWeight: '900', letterSpacing: 0.5 },
  time: { fontSize: 10, fontWeight: '700' },
  notificationTitle: { fontSize: 13.5, fontWeight: '900', marginTop: 4 },
  notificationBody: { fontSize: 12, lineHeight: 16, marginTop: 4 },
  notificationFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7 },
  workshop: { flex: 1, fontSize: 10, fontWeight: '700' },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  notificationActions: { gap: 7, alignItems: 'center' },
  archive: { width: 31, height: 31, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  deleteAction: { width: 27, height: 27, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  emptyCard: { minHeight: 260, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyIcon: { width: 70, height: 70, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '900' },
  emptyText: { fontSize: 12, lineHeight: 16, textAlign: 'center', maxWidth: 260 },
  permissionCard: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  permissionIcon: { width: 49, height: 49, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '900' },
  cardText: { fontSize: 12, lineHeight: 15, marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '900', marginTop: 4 },
  soundGrid: { gap: 8 },
  soundCard: { minHeight: 67, borderRadius: 17, borderWidth: 1, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  soundIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  soundTitle: { fontSize: 13, fontWeight: '900' },
  soundSubtitle: { fontSize: 10.5, marginTop: 2 },
  soundCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  soundHint: { fontSize: 10.5, lineHeight: 15, paddingHorizontal: 3 },
  settingsCard: { paddingVertical: 2, paddingHorizontal: 13 },
  settingRow: { minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: 10 },
  settingNested: { paddingLeft: 18, minHeight: 68 },
  settingIcon: { width: 39, height: 39, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  settingTitle: { fontSize: 12.5, fontWeight: '900' },
  settingSubtitle: { fontSize: 11, lineHeight: 14, marginTop: 3 },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  infoText: { flex: 1, fontSize: 11, lineHeight: 15 },
});
