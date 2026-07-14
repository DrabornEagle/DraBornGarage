import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedMotorcycleIcon } from '../components/AnimatedMotorcycleIcon';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { GlassCard } from '../components/GlassCard';
import { ReadyPaymentSettings } from '../components/ReadyPaymentSettings';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../notifications/NotificationContext';
import { ThemeMode } from '../types';

interface DemoStatus { active: boolean; customer_count: number; work_order_count: number; workshop_count?: number; }
type ThemeOption = { value: ThemeMode; title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap; preview: [string, string] };
type SettingsSection = 'themes' | 'demo' | 'business' | 'payment' | 'security' | 'app';

const EMPTY_DEMO: DemoStatus = { active: false, customer_count: 0, work_order_count: 0, workshop_count: 0 };
const PRIVACY_POLICY_URL = 'https://github.com/DrabornEagle/DraBornGarage/blob/main/docs/PRIVACY_POLICY.md';
const TEST_CHECKLIST_URL = 'https://github.com/DrabornEagle/DraBornGarage/blob/main/docs/V0.9_PILOT_TEST_CHECKLIST.md';
const THEMES: ThemeOption[] = [
  { value: 'system', title: 'Otomatik', subtitle: 'Telefon görünümünü takip eder.', icon: 'contrast', preview: ['#F4F7FC', '#070A12'] },
  { value: 'light', title: 'Aydınlık Atölye', subtitle: 'Temiz gündüz görünümü.', icon: 'sunny', preview: ['#FFFFFF', '#3D7BFF'] },
  { value: 'dark', title: 'Gece Garajı', subtitle: 'Mor–mavi neon garaj.', icon: 'moon', preview: ['#7C5CFF', '#20D9D2'] },
  { value: 'carbon', title: 'Karbon Fiber', subtitle: 'Siyah ve çelik görünüm.', icon: 'layers', preview: ['#16191C', '#D4D9E0'] },
  { value: 'racing', title: 'Yarış Garajı', subtitle: 'Kırmızı ve turuncu pist teması.', icon: 'speedometer', preview: ['#FF355D', '#FF7A2F'] },
  { value: 'electric', title: 'Electric Blue', subtitle: 'Cyan teknoloji garajı.', icon: 'flash', preview: ['#12DDF4', '#318CFF'] },
  { value: 'sunset', title: 'Sunset Workshop', subtitle: 'Turuncu–mor sıcak görünüm.', icon: 'flame', preview: ['#FF7A4D', '#C45BFF'] },
];

const roleLabel = (role?: string, admin?: boolean) => admin ? 'Admin' : role === 'owner_mechanic' ? 'İşletme Sahibi + Usta' : role === 'owner' ? 'İşletme Sahibi' : role === 'mechanic' ? 'Usta' : role === 'apprentice' ? 'Çırak' : 'Kullanıcı';

export function SettingsScreen() {
  const { colors, mode, setMode } = useTheme();
  const { profile, workshop, membership, isAdmin, signOut, refreshWorkspace, setAccountMode } = useAuth();
  const { unreadCount, upcomingCount, permissionStatus, openCenter, refresh: refreshNotifications } = useNotifications();
  const [demo, setDemo] = useState<DemoStatus>(EMPTY_DEMO);
  const [loading, setLoading] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [openSection, setOpenSection] = useState<SettingsSection | null>(null);
  const toggleSection = (section: SettingsSection) => setOpenSection((current) => current === section ? null : section);
  const isOwner = isAdmin || membership?.role === 'owner' || membership?.role === 'owner_mechanic';
  const canConfigureReadyPayment = membership?.role === 'mechanic' || membership?.role === 'owner_mechanic';

  const loadDemo = useCallback(async () => {
    if (!workshop || !isOwner) return setDemo(EMPTY_DEMO);
    const { data } = await supabase.rpc('demo_data_status', { p_workshop_id: workshop.id });
    if (data) setDemo(data as DemoStatus);
  }, [workshop, isOwner]);
  useEffect(() => { loadDemo(); }, [loadDemo]);

  const createDemo = () => workshop && Alert.alert('v0.9 pilot verileri yüklensin mi?', 'Hızlı servis, randevu, alacak, platform bedeli, rapor ve bildirim senaryoları için geçici kayıtlar eklenir.', [{ text: 'Vazgeç' }, { text: 'Yükle', onPress: async () => {
    setLoading(true);
    const runners = [
      ['Temel demo', 'create_demo_data'],
      ['Servis detayı', 'create_v04_demo_data'],
      ['Alacak', 'create_v05_demo_data'],
      ['Rapor', 'create_v06_demo_data'],
      ['Platform', 'create_v07_demo_data'],
      ['Bildirim', 'create_v08_demo_data'],
    ] as const;
    for (const [label, rpc] of runners) {
      const result = await supabase.rpc(rpc, { p_workshop_id: workshop.id });
      if (result.error) { setLoading(false); return Alert.alert(`${label} yüklenemedi`, result.error.message); }
    }
    setLoading(false);
    await refreshWorkspace(workshop.id);
    await loadDemo();
    await refreshNotifications();
    Alert.alert('v0.9 pilot ortamı hazır', 'Ana servis ve bildirim senaryoları geçici test verileriyle hazırlandı.');
  } }]);

  const clearDemo = () => workshop && Alert.alert('Pilot verileri temizlensin mi?', 'Gerçek kayıtlar etkilenmez. Demo bildirimleri de temizlenir.', [{ text: 'Vazgeç' }, { text: 'Temizle', style: 'destructive', onPress: async () => { setLoading(true); const { data, error } = await supabase.rpc('clear_demo_data', { p_workshop_id: workshop.id }); setLoading(false); if (error) return Alert.alert('Temizlenemedi', error.message); await refreshWorkspace((data as any)?.root_workshop_id ?? null); setDemo(EMPTY_DEMO); await refreshNotifications(); } }]);

  const runRoleAudit = async () => {
    setAuditLoading(true);
    const { data, error } = await supabase.rpc('account_role_access_snapshot');
    setAuditLoading(false);
    if (error) return Alert.alert('Rol denetimi çalışmadı', error.message);
    const snapshot = data as any;
    const memberships = Array.isArray(snapshot?.memberships) ? snapshot.memberships : [];
    Alert.alert(
      'Rol erişim denetimi tamamlandı',
      `Admin: ${snapshot?.is_admin ? 'Evet' : 'Hayır'}\nAktif üyelik: ${memberships.filter((item: any) => item.is_active).length}\nİşletmeler arası erişim: ${snapshot?.capabilities?.cross_workshop_access ? 'Admin ile sınırlı' : 'Kapalı'}\nÇırak finans erişimi: Kapalı`,
    );
  };

  return <ScrollView contentContainerStyle={styles.content}>
    <ScreenHeader eyebrow="PİLOT VE YAYIN" title="Ayarlar" subtitle="Tema, bildirim, rol güvenliği, pilot test ve Google Play hazırlığı." />
    <GlassCard style={styles.profile}><LinearGradient colors={[colors.primary, colors.primary2]} style={styles.avatar}><Text style={styles.avatarText}>{profile?.full_name?.charAt(0) || 'D'}</Text></LinearGradient><View style={styles.copy}><Text style={[styles.name, { color: colors.text }]}>{profile?.full_name}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{roleLabel(membership?.role, isAdmin)} • {workshop?.name || 'Müşteri hesabı'}</Text></View><Ionicons name="shield-checkmark" size={23} color={colors.green} /></GlassCard>

    <AnimatedPressable onPress={openCenter} style={[styles.modeCard, { backgroundColor: `${colors.orange}11`, borderColor: `${colors.orange}40` }]}><View style={[styles.modeIcon, { backgroundColor: `${colors.orange}18` }]}><Ionicons name="notifications" size={24} color={colors.orange} /></View><View style={styles.copy}><Text style={[styles.modeTitle, { color: colors.text }]}>Bildirim Merkezi ve tercihleri</Text><Text style={[styles.modeText, { color: colors.textMuted }]}>{unreadCount} okunmamış • {upcomingCount} yaklaşan • Telefon izni: {permissionStatus === 'granted' ? 'Açık' : 'Kapalı'}</Text></View><Ionicons name="chevron-forward" size={20} color={colors.orange} /></AnimatedPressable>

    <AnimatedPressable onPress={async () => { const error = await setAccountMode('customer'); if (error) Alert.alert('Geçiş yapılamadı', error); }} style={[styles.modeCard, { backgroundColor: `${colors.cyan}11`, borderColor: `${colors.cyan}40` }]}><View style={[styles.modeIcon, { backgroundColor: `${colors.cyan}18` }]}><AnimatedMotorcycleIcon size={31} color={colors.cyan} /></View><View style={styles.copy}><Text style={[styles.modeTitle, { color: colors.text }]}>Müşteri görünümüne geç</Text><Text style={[styles.modeText, { color: colors.textMuted }]}>Randevu, ek işlem onayı, motor, servis ve müşteri bildirimlerini test et.</Text></View><Ionicons name="chevron-forward" size={20} color={colors.cyan} /></AnimatedPressable>

    <SettingsAccordion title="Garaj Temaları" subtitle={`${THEMES.length} görünüm • ${THEMES.find((item) => item.value === mode)?.title ?? 'Otomatik'}`} icon="color-palette" accent={colors.primary} open={openSection === 'themes'} onToggle={() => toggleSection('themes')}>
      <View style={styles.themeList}>{THEMES.map((item) => { const active = mode === item.value; return <AnimatedPressable key={item.value} onPress={() => setMode(item.value)} style={[styles.theme, { backgroundColor: active ? `${colors.primary}14` : colors.card, borderColor: active ? colors.primary : colors.border }]}><LinearGradient colors={item.preview} style={styles.preview}><Ionicons name={item.icon} size={22} color="#fff" /></LinearGradient><View style={styles.copy}><Text style={[styles.themeTitle, { color: colors.text }]}>{item.title}</Text><Text style={[styles.themeSub, { color: colors.textMuted }]}>{item.subtitle}</Text></View><Ionicons name={active ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={active ? colors.primary : colors.textMuted} /></AnimatedPressable>; })}</View>
    </SettingsAccordion>

    {isOwner && <SettingsAccordion title="Pilot Test Atölyesi" subtitle={demo.active ? `${demo.customer_count} müşteri • ${demo.work_order_count} servis` : 'Geçici pilot verileri kapalı'} icon="flask" accent={demo.active ? colors.green : colors.orange} open={openSection === 'demo'} onToggle={() => toggleSection('demo')}>
      <GlassCard style={styles.demoCard}><View style={styles.demoHeader}><Ionicons name="flask" size={28} color={demo.active ? colors.green : colors.orange} /><View style={styles.copy}><Text style={[styles.demoTitle, { color: colors.text }]}>v0.9 Ana Akış Testleri</Text><Text style={[styles.demoText, { color: colors.textMuted }]}>{demo.customer_count} müşteri • {demo.work_order_count} servis • Hızlı servis, randevu, alacak, platform ve bildirim</Text></View></View>{demo.active ? <PrimaryButton title="Pilot Verilerini Temizle" onPress={clearDemo} loading={loading} secondary /> : <PrimaryButton title="Pilot Verilerini Yükle" onPress={createDemo} loading={loading} />}<PrimaryButton title="Pilot Kontrol Listesini Aç" onPress={() => Linking.openURL(TEST_CHECKLIST_URL)} secondary /></GlassCard>
    </SettingsAccordion>}

    <SettingsAccordion title="İşletme ve Randevu" subtitle={workshop?.name || 'Aktif işletme seçilmedi'} icon="business" accent={colors.cyan} open={openSection === 'business'} onToggle={() => toggleSection('business')}>
      <GlassCard style={styles.info}><Info icon="business" label="İşletme" value={workshop?.name || '-'} /><Info icon="calendar" label="Randevu sistemi" value={workshop?.appointments_enabled === false ? 'Kapalı' : 'Açık'} /><Info icon="checkmark-done" label="Müşteri talebi" value={workshop?.appointment_auto_confirm ? 'Otomatik onay' : 'Usta onayı'} /><Info icon="today" label="Rezervasyon ufku" value={`${workshop?.appointment_booking_days ?? 30} gün`} /><Info icon="time" label="Minimum bildirim" value={`${workshop?.appointment_min_notice_minutes ?? 60} dakika`} /></GlassCard>
    </SettingsAccordion>

    {canConfigureReadyPayment && <SettingsAccordion title="IBAN Ayarları" subtitle="Motor Hazır ve açık veresiye ödemeleri" icon="card" accent={colors.green} open={openSection === 'payment'} onToggle={() => toggleSection('payment')}>
      <ReadyPaymentSettings />
    </SettingsAccordion>}

    <SettingsAccordion title="Gizlilik ve Yayın Güvenliği" subtitle="Rol denetimi • izinler • hesap silme" icon="shield-checkmark" accent={colors.green} open={openSection === 'security'} onToggle={() => toggleSection('security')}>
      <GlassCard style={styles.info}><Info icon="camera" label="Kamera" value="Yalnız QR tarama" /><Info icon="images" label="Fotoğraflar" value="Yalnız isteğe bağlı dekont" /><Info icon="notifications" label="Bildirim" value="Servis ve randevu hatırlatmaları" /><Info icon="location" label="Konum / Mikrofon / Rehber" value="Kullanılmıyor ve engelli" /><Info icon="person-remove" label="Hesap silme" value="Sağ üstteki kalkan ile talep oluşturma" /></GlassCard>
      <PrimaryButton title="Rol Erişim Denetimini Çalıştır" onPress={runRoleAudit} loading={auditLoading} />
      <PrimaryButton title="Gizlilik Politikasını Aç" onPress={() => Linking.openURL(PRIVACY_POLICY_URL)} secondary />
    </SettingsAccordion>

    <SettingsAccordion title="Uygulama" subtitle="v0.9.5 • Usta rapor ve iş sayısı tutarlılığı" icon="information-circle" accent={colors.green} open={openSection === 'app'} onToggle={() => toggleSection('app')}>
      <GlassCard style={styles.info}><Info icon="layers" label="Sürüm" value="v0.9.5 • Usta Rapor ve İş Sayısı Tutarlılığı" /><Info icon="shield-checkmark" label="Gizlilik" value="Uygulama içi politika + hesap silme talebi" /><Info icon="key" label="Şifre güvenliği" value="10 karakter + karmaşıklık + yaygın şifre engeli" /><Info icon="archive" label="Bu sürüm öncesi yedek" value="backup/v0.9.4-before-v0.9.5-20260714" /><Info icon="refresh" label="Geri alma" value="Kod ve veritabanıyla v0.9.4" /><Info icon="phone-portrait" label="Test yöntemi" value="Expo Go + Android bundle + pilot checklist" /><Info icon="storefront" label="Mağaza durumu" value="Auto & Vehicles • finansal hizmet değildir" /></GlassCard>
    </SettingsAccordion>

    <AnimatedPressable onPress={() => Alert.alert('Çıkış yapılsın mı?', '', [{ text: 'Vazgeç' }, { text: 'Çıkış', style: 'destructive', onPress: signOut }])} style={[styles.logout, { backgroundColor: `${colors.red}10`, borderColor: `${colors.red}35` }]}><Ionicons name="log-out-outline" size={21} color={colors.red} /><Text style={[styles.logoutText, { color: colors.red }]}>Hesaptan Çıkış Yap</Text></AnimatedPressable>
  </ScrollView>;
}

function SettingsAccordion({ title, subtitle, icon, accent, open, onToggle, children }: { title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap; accent: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  const { colors } = useTheme();
  return <View style={[styles.settingsAccordion, { backgroundColor: colors.card, borderColor: open ? `${accent}58` : colors.border }]}>
    <AnimatedPressable onPress={onToggle} style={styles.settingsAccordionHeader}>
      <View style={[styles.settingsAccordionIcon, { backgroundColor: `${accent}14`, borderColor: `${accent}34` }]}><Ionicons name={icon} size={22} color={accent} /></View>
      <View style={styles.copy}><Text style={[styles.settingsAccordionTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.settingsAccordionSubtitle, { color: colors.textMuted }]}>{subtitle}</Text></View>
      <View style={[styles.settingsAccordionChevron, { borderColor: open ? `${accent}58` : colors.border }]}><Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={open ? accent : colors.textMuted} /></View>
    </AnimatedPressable>
    {open && <View style={[styles.settingsAccordionBody, { borderTopColor: colors.border }]}>{children}</View>}
  </View>;
}

function Info({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) { const { colors } = useTheme(); return <View style={[styles.infoRow, { borderBottomColor: colors.border }]}><Ionicons name={icon} size={20} color={colors.textMuted} /><View style={styles.copy}><Text style={[styles.infoLabel, { color: colors.textMuted }]}>{label}</Text><Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text></View></View>; }

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 56, paddingBottom: 120, gap: 15 }, profile: { flexDirection: 'row', alignItems: 'center', gap: 11 }, avatar: { width: 54, height: 54, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: '#fff', fontSize: 21, fontWeight: '900' }, copy: { flex: 1, minWidth: 0 }, name: { fontSize: 17, fontWeight: '900' }, meta: { fontSize: 12.5, marginTop: 4 }, modeCard: { minHeight: 80, borderWidth: 1, borderRadius: 21, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 }, modeIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, modeTitle: { fontSize: 14, fontWeight: '900' }, modeText: { fontSize: 12, lineHeight: 16, marginTop: 4 }, settingsAccordion: { borderWidth: 1, borderRadius: 22, overflow: 'hidden' }, settingsAccordionHeader: { minHeight: 82, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11 }, settingsAccordionIcon: { width: 48, height: 48, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, settingsAccordionTitle: { fontSize: 16, fontWeight: '900' }, settingsAccordionSubtitle: { fontSize: 12, lineHeight: 16, marginTop: 4 }, settingsAccordionChevron: { width: 38, height: 38, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, settingsAccordionBody: { borderTopWidth: 1, padding: 12, gap: 10 }, themeList: { gap: 9 }, theme: { minHeight: 79, borderWidth: 1, borderRadius: 20, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 11 }, preview: { width: 55, height: 55, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }, themeTitle: { fontSize: 14, fontWeight: '900' }, themeSub: { fontSize: 12, marginTop: 4 }, demoCard: { gap: 13 }, demoHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 }, demoTitle: { fontSize: 16, fontWeight: '900' }, demoText: { fontSize: 12.5, marginTop: 4 }, info: { paddingVertical: 2, paddingHorizontal: 14 }, infoRow: { minHeight: 65, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 11 }, infoLabel: { fontSize: 11, fontWeight: '900' }, infoValue: { fontSize: 13, fontWeight: '800', marginTop: 4 }, logout: { minHeight: 54, borderWidth: 1, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, logoutText: { fontSize: 13, fontWeight: '900' },
});
