import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { GlassCard } from '../components/GlassCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { ThemeMode } from '../types';

interface DemoStatus { active: boolean; customer_count: number; work_order_count: number; workshop_count?: number; }
type ThemeOption = { value: ThemeMode; title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap; preview: [string, string] };

const EMPTY_DEMO: DemoStatus = { active: false, customer_count: 0, work_order_count: 0, workshop_count: 0 };
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
  const [demo, setDemo] = useState<DemoStatus>(EMPTY_DEMO);
  const [loading, setLoading] = useState(false);
  const isOwner = isAdmin || membership?.role === 'owner' || membership?.role === 'owner_mechanic';

  const loadDemo = useCallback(async () => {
    if (!workshop || !isOwner) return setDemo(EMPTY_DEMO);
    const { data } = await supabase.rpc('demo_data_status', { p_workshop_id: workshop.id });
    if (data) setDemo(data as DemoStatus);
  }, [workshop, isOwner]);
  useEffect(() => { loadDemo(); }, [loadDemo]);

  const createDemo = () => workshop && Alert.alert('v0.6 test verileri yüklensin mi?', 'Müşteri, motor, servis, alacak ve rapor ekranları için bugün, hafta ve ay dönemlerine dağıtılmış örnek kayıtlar eklenir.', [{ text: 'Vazgeç' }, { text: 'Yükle', onPress: async () => {
    setLoading(true);
    const baseResult = await supabase.rpc('create_demo_data', { p_workshop_id: workshop.id });
    if (baseResult.error) { setLoading(false); return Alert.alert('Temel demo yüklenemedi', baseResult.error.message); }
    const v04Result = await supabase.rpc('create_v04_demo_data', { p_workshop_id: workshop.id });
    if (v04Result.error) { setLoading(false); return Alert.alert('v0.4 demo yüklenemedi', v04Result.error.message); }
    const v05Result = await supabase.rpc('create_v05_demo_data', { p_workshop_id: workshop.id });
    if (v05Result.error) { setLoading(false); return Alert.alert('v0.5 demo yüklenemedi', v05Result.error.message); }
    const v06Result = await supabase.rpc('create_v06_demo_data', { p_workshop_id: workshop.id });
    setLoading(false);
    if (v06Result.error) return Alert.alert('v0.6 demo yüklenemedi', v06Result.error.message);
    await refreshWorkspace(workshop.id);
    await loadDemo();
    Alert.alert('v0.6 demo hazır', 'Bugün, hafta ve ay raporlarında görünecek motor, işlem, parça, Nakit, IBAN ve alacak örnekleri hazırlandı. Rapor sekmesini test edebilirsin.');
  } }]);

  const clearDemo = () => workshop && Alert.alert('Demo temizlensin mi?', 'Gerçek kayıtlar etkilenmez.', [{ text: 'Vazgeç' }, { text: 'Temizle', style: 'destructive', onPress: async () => { setLoading(true); const { data, error } = await supabase.rpc('clear_demo_data', { p_workshop_id: workshop.id }); setLoading(false); if (error) return Alert.alert('Temizlenemedi', error.message); await refreshWorkspace((data as any)?.root_workshop_id ?? null); setDemo(EMPTY_DEMO); } }]);

  return <ScrollView contentContainerStyle={styles.content}>
    <ScreenHeader eyebrow="KİŞİSELLEŞTİR" title="Ayarlar" subtitle="Tema, müşteri görünümü, test verileri ve uygulama bilgileri." />
    <GlassCard style={styles.profile}><LinearGradient colors={[colors.primary, colors.primary2]} style={styles.avatar}><Text style={styles.avatarText}>{profile?.full_name?.charAt(0) || 'D'}</Text></LinearGradient><View style={styles.copy}><Text style={[styles.name, { color: colors.text }]}>{profile?.full_name}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{roleLabel(membership?.role, isAdmin)} • {workshop?.name}</Text></View><Ionicons name="shield-checkmark" size={23} color={colors.green} /></GlassCard>

    <AnimatedPressable onPress={async () => { const error = await setAccountMode('customer'); if (error) Alert.alert('Geçiş yapılamadı', error); }} style={[styles.modeCard, { backgroundColor: `${colors.cyan}11`, borderColor: `${colors.cyan}40` }]}><View style={[styles.modeIcon, { backgroundColor: `${colors.cyan}18` }]}><Ionicons name="bicycle" size={24} color={colors.cyan} /></View><View style={styles.copy}><Text style={[styles.modeTitle, { color: colors.text }]}>Müşteri görünümüne geç</Text><Text style={[styles.modeText, { color: colors.textMuted }]}>Randevu, ek işlem onayı, motor ve servis ekranlarını müşteri olarak test et.</Text></View><Ionicons name="chevron-forward" size={20} color={colors.cyan} /></AnimatedPressable>

    <Text style={[styles.sectionTitle, { color: colors.text }]}>Garaj Temaları</Text>
    <View style={styles.themeList}>{THEMES.map((item) => { const active = mode === item.value; return <AnimatedPressable key={item.value} onPress={() => setMode(item.value)} style={[styles.theme, { backgroundColor: active ? `${colors.primary}14` : colors.card, borderColor: active ? colors.primary : colors.border }]}><LinearGradient colors={item.preview} style={styles.preview}><Ionicons name={item.icon} size={22} color="#fff" /></LinearGradient><View style={styles.copy}><Text style={[styles.themeTitle, { color: colors.text }]}>{item.title}</Text><Text style={[styles.themeSub, { color: colors.textMuted }]}>{item.subtitle}</Text></View><Ionicons name={active ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={active ? colors.primary : colors.textMuted} /></AnimatedPressable>; })}</View>

    {isOwner && <><Text style={[styles.sectionTitle, { color: colors.text }]}>Test Atölyesi</Text><GlassCard style={styles.demoCard}><View style={styles.demoHeader}><Ionicons name="flask" size={28} color={demo.active ? colors.green : colors.orange} /><View style={styles.copy}><Text style={[styles.demoTitle, { color: colors.text }]}>Geçici v0.6 Test Verileri</Text><Text style={[styles.demoText, { color: colors.textMuted }]}>{demo.customer_count} müşteri • {demo.work_order_count} servis • {(demo.workshop_count ?? 0) + (demo.active ? 1 : 0)} işletme</Text></View></View>{demo.active ? <PrimaryButton title="Demo Verilerini Temizle" onPress={clearDemo} loading={loading} secondary /> : <PrimaryButton title="v0.6 Test Verilerini Yükle" onPress={createDemo} loading={loading} />}</GlassCard></>}

    <Text style={[styles.sectionTitle, { color: colors.text }]}>İşletme ve Randevu</Text>
    <GlassCard style={styles.info}><Info icon="business" label="İşletme" value={workshop?.name || '-'} /><Info icon="calendar" label="Randevu sistemi" value={workshop?.appointments_enabled === false ? 'Kapalı' : 'Açık'} /><Info icon="checkmark-done" label="Müşteri talebi" value={workshop?.appointment_auto_confirm ? 'Otomatik onay' : 'Usta onayı'} /><Info icon="today" label="Rezervasyon ufku" value={`${workshop?.appointment_booking_days ?? 30} gün`} /><Info icon="time" label="Minimum bildirim" value={`${workshop?.appointment_min_notice_minutes ?? 60} dakika`} /></GlassCard>

    <Text style={[styles.sectionTitle, { color: colors.text }]}>Uygulama</Text>
    <GlassCard style={styles.info}><Info icon="layers" label="Sürüm" value="v0.6.0 • Usta gelir kayıtları ve işletme raporları" /><Info icon="archive" label="Bu sürüm öncesi yedek" value="backup/v0.5.0-before-v0.6.0" /><Info icon="refresh" label="Veritabanı geri alma" value="rollback_v0_6_0_to_v0_5_0.sql" /><Info icon="phone-portrait" label="Test yöntemi" value="Expo Go • SDK 54" /><Info icon="cube" label="APK/AAB planı" value="v1.0" /></GlassCard>

    <AnimatedPressable onPress={() => Alert.alert('Çıkış yapılsın mı?', '', [{ text: 'Vazgeç' }, { text: 'Çıkış', style: 'destructive', onPress: signOut }])} style={[styles.logout, { backgroundColor: `${colors.red}10`, borderColor: `${colors.red}35` }]}><Ionicons name="log-out-outline" size={21} color={colors.red} /><Text style={[styles.logoutText, { color: colors.red }]}>Hesaptan Çıkış Yap</Text></AnimatedPressable>
  </ScrollView>;
}

function Info({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) { const { colors } = useTheme(); return <View style={[styles.infoRow, { borderBottomColor: colors.border }]}><Ionicons name={icon} size={20} color={colors.textMuted} /><View style={styles.copy}><Text style={[styles.infoLabel, { color: colors.textMuted }]}>{label}</Text><Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text></View></View>; }

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 56, paddingBottom: 120, gap: 15 }, profile: { flexDirection: 'row', alignItems: 'center', gap: 11 }, avatar: { width: 54, height: 54, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: '#fff', fontSize: 21, fontWeight: '900' }, copy: { flex: 1, minWidth: 0 }, name: { fontSize: 17, fontWeight: '900' }, meta: { fontSize: 11, marginTop: 4 }, modeCard: { minHeight: 80, borderWidth: 1, borderRadius: 21, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 }, modeIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, modeTitle: { fontSize: 14, fontWeight: '900' }, modeText: { fontSize: 10.5, lineHeight: 16, marginTop: 4 }, sectionTitle: { fontSize: 18, fontWeight: '900', marginTop: 3 }, themeList: { gap: 9 }, theme: { minHeight: 79, borderWidth: 1, borderRadius: 20, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 11 }, preview: { width: 55, height: 55, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }, themeTitle: { fontSize: 14, fontWeight: '900' }, themeSub: { fontSize: 10.5, marginTop: 4 }, demoCard: { gap: 13 }, demoHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 }, demoTitle: { fontSize: 16, fontWeight: '900' }, demoText: { fontSize: 11, marginTop: 4 }, info: { paddingVertical: 2, paddingHorizontal: 14 }, infoRow: { minHeight: 65, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 11 }, infoLabel: { fontSize: 9, fontWeight: '900' }, infoValue: { fontSize: 13, fontWeight: '800', marginTop: 4 }, logout: { minHeight: 54, borderWidth: 1, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, logoutText: { fontSize: 13, fontWeight: '900' },
});
