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

interface DemoStatus {
  active: boolean;
  batch_id?: string | null;
  created_at?: string | null;
  customer_count: number;
  work_order_count: number;
  workshop_count?: number;
}

type ThemeOption = {
  value: ThemeMode;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  preview: [string, string];
};

const EMPTY_DEMO: DemoStatus = {
  active: false,
  customer_count: 0,
  work_order_count: 0,
  workshop_count: 0,
};

const THEME_OPTIONS: ThemeOption[] = [
  { value: 'system', title: 'Otomatik', subtitle: 'Telefonun açık/koyu görünümünü takip eder.', icon: 'contrast', preview: ['#F4F7FC', '#070A12'] },
  { value: 'light', title: 'Aydınlık Atölye', subtitle: 'Temiz metal, beyaz servis ve gündüz görünümü.', icon: 'sunny', preview: ['#FFFFFF', '#3D7BFF'] },
  { value: 'dark', title: 'Gece Garajı', subtitle: 'Mor–mavi neonlu ana DraBornGarage teması.', icon: 'moon', preview: ['#7C5CFF', '#20D9D2'] },
  { value: 'carbon', title: 'Karbon Fiber', subtitle: 'Siyah, çelik ve karbon kaplama hissi.', icon: 'layers', preview: ['#16191C', '#D4D9E0'] },
  { value: 'racing', title: 'Yarış Garajı', subtitle: 'Kırmızı, turuncu ve pist odaklı agresif görünüm.', icon: 'speedometer', preview: ['#FF355D', '#FF7A2F'] },
  { value: 'electric', title: 'Electric Blue', subtitle: 'Elektrik mavisi, cyan ve teknoloji garajı.', icon: 'flash', preview: ['#12DDF4', '#318CFF'] },
  { value: 'sunset', title: 'Sunset Workshop', subtitle: 'Turuncu–mor sıcak gece atölyesi.', icon: 'flame', preview: ['#FF7A4D', '#C45BFF'] },
];

const roleLabel = (role?: string, isAdmin?: boolean) => {
  if (isAdmin) return 'Admin';
  if (role === 'owner_mechanic') return 'İşletme Sahibi + Usta';
  if (role === 'owner') return 'İşletme Sahibi';
  if (role === 'mechanic') return 'Usta';
  if (role === 'apprentice') return 'Çırak';
  return 'Kullanıcı';
};

export function SettingsScreen() {
  const { colors, mode, setMode } = useTheme();
  const { profile, workshop, membership, isAdmin, signOut, refreshWorkspace } = useAuth();
  const [demoStatus, setDemoStatus] = useState<DemoStatus>(EMPTY_DEMO);
  const [demoLoading, setDemoLoading] = useState(false);
  const isOwner = isAdmin || membership?.role === 'owner' || membership?.role === 'owner_mechanic';

  const loadDemoStatus = useCallback(async () => {
    if (!workshop || !isOwner) {
      setDemoStatus(EMPTY_DEMO);
      return;
    }
    const { data, error } = await supabase.rpc('demo_data_status', { p_workshop_id: workshop.id });
    if (!error && data) setDemoStatus(data as DemoStatus);
  }, [workshop, isOwner]);

  useEffect(() => {
    loadDemoStatus();
  }, [loadDemoStatus]);

  const createDemo = () => {
    if (!workshop) return;
    Alert.alert(
      'Tam v0.1 demosu yüklensin mi?',
      '3 işletme görünümü, 7 müşteri, 7 motosiklet, hızlı servis, bırakılan motor, randevulu kayıt, atölye sırası, net/tahmini fiyat, Nakit ve IBAN örnekleri eklenecek.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Demoyu Yükle',
          onPress: async () => {
            setDemoLoading(true);
            const { data, error } = await supabase.rpc('create_demo_data', { p_workshop_id: workshop.id });
            setDemoLoading(false);
            if (error) return Alert.alert('Demo yüklenemedi', error.message);
            await refreshWorkspace(workshop.id);
            await loadDemoStatus();
            Alert.alert('Demo hazır', `Demo batch oluşturuldu: ${String(data).slice(0, 8)}… Ana panel, Admin, Müşteriler ve İş Emirleri sekmelerini test edebilirsin.`);
          },
        },
      ],
    );
  };

  const clearDemo = () => {
    if (!workshop) return;
    Alert.alert(
      'Demo verileri silinsin mi?',
      'Sadece demo_batch_id taşıyan geçici kayıtlar ve demo işletmeler kaldırılacak. Gerçek işletmen, müşterilerin ve servis kayıtların silinmeyecek.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Demoyu Temizle',
          style: 'destructive',
          onPress: async () => {
            setDemoLoading(true);
            const { data, error } = await supabase.rpc('clear_demo_data', { p_workshop_id: workshop.id });
            setDemoLoading(false);
            if (error) return Alert.alert('Demo temizlenemedi', error.message);
            const rootWorkshopId = (data as any)?.root_workshop_id ?? null;
            await refreshWorkspace(rootWorkshopId);
            setDemoStatus(EMPTY_DEMO);
            Alert.alert('Demo temizlendi', 'Geçici demo işletmeleri, müşterileri, motorları, servisleri, parçaları ve tahsilatları kaldırıldı.');
          },
        },
      ],
    );
  };

  const logout = () => Alert.alert('Çıkış yapılsın mı?', 'Bu cihazdaki oturum kapatılacak.', [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Çıkış Yap', style: 'destructive', onPress: signOut },
  ]);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <ScreenHeader eyebrow="KİŞİSELLEŞTİR" title="Ayarlar" subtitle="Garaj temasını, test verilerini, hesabı ve aktif işletmeyi yönet." />

      <GlassCard style={styles.profileCard}>
        <LinearGradient colors={[colors.primary, colors.primary2]} style={styles.avatar}><Text style={styles.avatarText}>{profile?.full_name?.charAt(0) || 'D'}</Text></LinearGradient>
        <View style={styles.copy}><Text style={[styles.name, { color: colors.text }]}>{profile?.full_name}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{roleLabel(membership?.role, isAdmin)} • {workshop?.name}</Text></View>
        <Ionicons name="shield-checkmark" size={23} color={colors.green} />
      </GlassCard>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Garaj Temaları</Text>
      <Text style={[styles.sectionDescription, { color: colors.textMuted }]}>Tema değişikliği anında tüm panellere, animasyonlu arka plana ve alt menüye uygulanır.</Text>
      <View style={styles.themeList}>
        {THEME_OPTIONS.map((item) => {
          const active = mode === item.value;
          return (
            <AnimatedPressable
              key={item.value}
              onPress={() => setMode(item.value)}
              style={[
                styles.themeCard,
                {
                  backgroundColor: active ? `${colors.primary}14` : colors.card,
                  borderColor: active ? colors.primary : colors.border,
                  shadowColor: active ? colors.primary : '#000',
                },
              ]}
            >
              <LinearGradient colors={item.preview} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.themePreview}>
                <Ionicons name={item.icon} size={22} color="#fff" />
                <View style={styles.previewRail}><View style={styles.previewRailLight} /><View style={styles.previewRailDark} /></View>
              </LinearGradient>
              <View style={styles.copy}>
                <Text numberOfLines={1} maxFontSizeMultiplier={1.06} style={[styles.themeTitle, { color: colors.text }]}>{item.title}</Text>
                <Text maxFontSizeMultiplier={1.08} style={[styles.themeSubtitle, { color: colors.textMuted }]}>{item.subtitle}</Text>
              </View>
              <View style={[styles.themeCheck, { backgroundColor: active ? colors.primary : colors.surfaceSoft, borderColor: active ? colors.primary : colors.border }]}> 
                <Ionicons name={active ? 'checkmark' : 'ellipse-outline'} size={18} color={active ? '#fff' : colors.textMuted} />
              </View>
            </AnimatedPressable>
          );
        })}
      </View>

      {isOwner && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Test Atölyesi</Text>
          <GlassCard style={styles.demoCard}>
            <View style={styles.demoHeader}>
              <View style={[styles.demoIcon, { backgroundColor: demoStatus.active ? `${colors.green}1C` : `${colors.orange}1C` }]}> 
                <Ionicons name={demoStatus.active ? 'flask' : 'flask-outline'} size={25} color={demoStatus.active ? colors.green : colors.orange} />
              </View>
              <View style={styles.copy}>
                <View style={styles.demoTitleRow}>
                  <Text style={[styles.demoTitle, { color: colors.text }]}>Geçici v0.1 Demo Modu</Text>
                  <View style={[styles.demoPill, { backgroundColor: demoStatus.active ? `${colors.green}1A` : `${colors.textMuted}18`, borderColor: demoStatus.active ? `${colors.green}45` : colors.border }]}> 
                    <View style={[styles.demoDot, { backgroundColor: demoStatus.active ? colors.green : colors.textMuted }]} />
                    <Text style={[styles.demoPillText, { color: demoStatus.active ? colors.green : colors.textMuted }]}>{demoStatus.active ? 'AKTİF' : 'KAPALI'}</Text>
                  </View>
                </View>
                <Text style={[styles.demoText, { color: colors.textMuted }]}>Gerçek verilerden ayrı, çok işletmeli v0.1 akışlarını dolduran güvenli test paketi.</Text>
              </View>
            </View>

            <View style={styles.demoStats}>
              <View style={[styles.demoStat, { backgroundColor: colors.surfaceSoft }]}><Ionicons name="business" size={18} color={colors.cyan} /><Text style={[styles.demoStatValue, { color: colors.text }]}>{(demoStatus.workshop_count ?? 0) + (demoStatus.active ? 1 : 0)}</Text><Text style={[styles.demoStatLabel, { color: colors.textMuted }]}>İşletme</Text></View>
              <View style={[styles.demoStat, { backgroundColor: colors.surfaceSoft }]}><Ionicons name="people" size={18} color={colors.primary} /><Text style={[styles.demoStatValue, { color: colors.text }]}>{demoStatus.customer_count}</Text><Text style={[styles.demoStatLabel, { color: colors.textMuted }]}>Müşteri</Text></View>
              <View style={[styles.demoStat, { backgroundColor: colors.surfaceSoft }]}><Ionicons name="construct" size={18} color={colors.orange} /><Text style={[styles.demoStatValue, { color: colors.text }]}>{demoStatus.work_order_count}</Text><Text style={[styles.demoStatLabel, { color: colors.textMuted }]}>İş emri</Text></View>
            </View>

            <View style={[styles.demoNotice, { backgroundColor: `${colors.orange}0D`, borderColor: `${colors.orange}2B` }]}> 
              <Ionicons name="warning-outline" size={19} color={colors.orange} />
              <Text style={[styles.demoNoticeText, { color: colors.textMuted }]}>Temizleme yalnız demo batch kayıtlarını siler. Gerçek işletme ve servis verilerine dokunmaz.</Text>
            </View>

            {demoStatus.active ? <PrimaryButton title="Demo Verilerini Temizle" onPress={clearDemo} loading={demoLoading} secondary /> : <PrimaryButton title="Tam v0.1 Demosunu Yükle" onPress={createDemo} loading={demoLoading} />}
          </GlassCard>
        </>
      )}

      <Text style={[styles.sectionTitle, { color: colors.text }]}>İşletme</Text>
      <GlassCard style={styles.infoCard}>
        <InfoRow icon="business" label="İşletme adı" value={workshop?.name || '-'} />
        <InfoRow icon="call" label="Telefon" value={workshop?.phone || 'Eklenmedi'} />
        <InfoRow icon="location" label="Adres" value={workshop?.address || 'Eklenmedi'} />
        <InfoRow icon="toggle" label="Durum" value={workshop?.is_active === false ? 'Pasif' : 'Aktif'} />
      </GlassCard>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Uygulama</Text>
      <GlassCard style={styles.infoCard}>
        <InfoRow icon="layers" label="Sürüm" value="v0.1.0 • Çok işletmeli çekirdek" />
        <InfoRow icon="phone-portrait" label="Test yöntemi" value="Expo Go • SDK 54" />
        <InfoRow icon="cube" label="APK planı" value="v1.0" />
      </GlassCard>

      <AnimatedPressable onPress={logout} style={[styles.logout, { backgroundColor: `${colors.red}12`, borderColor: `${colors.red}35` }]}><Ionicons name="log-out-outline" size={21} color={colors.red} /><Text style={[styles.logoutText, { color: colors.red }]}>Hesaptan Çıkış Yap</Text></AnimatedPressable>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  const { colors } = useTheme();
  return <View style={[styles.infoRow, { borderBottomColor: colors.border }]}><Ionicons name={icon} size={20} color={colors.textMuted} /><View style={styles.copy}><Text style={[styles.infoLabel, { color: colors.textMuted }]}>{label}</Text><Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text></View></View>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 56, paddingBottom: 120, gap: 16 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 54, height: 54, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 21, fontWeight: '900' },
  copy: { flex: 1, minWidth: 0 },
  name: { fontSize: 17, fontWeight: '900' },
  meta: { fontSize: 12, marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '900', marginTop: 3 },
  sectionDescription: { fontSize: 12, lineHeight: 18, marginTop: -8 },
  themeList: { gap: 10 },
  themeCard: { minHeight: 84, borderWidth: 1, borderRadius: 21, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, shadowOpacity: 0.12, shadowRadius: 12, elevation: 3 },
  themePreview: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  previewRail: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 7, flexDirection: 'row' },
  previewRailLight: { flex: 1, backgroundColor: '#FFB14A', transform: [{ skewX: '-24deg' }] },
  previewRailDark: { flex: 1, backgroundColor: '#101010', transform: [{ skewX: '-24deg' }] },
  themeTitle: { fontSize: 15, fontWeight: '900' },
  themeSubtitle: { fontSize: 11, lineHeight: 16, marginTop: 4 },
  themeCheck: { width: 34, height: 34, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  demoCard: { gap: 15 },
  demoHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  demoIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  demoTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  demoTitle: { fontSize: 17, fontWeight: '900' },
  demoText: { fontSize: 12, lineHeight: 18, marginTop: 5 },
  demoPill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 5 },
  demoDot: { width: 6, height: 6, borderRadius: 6 },
  demoPillText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  demoStats: { flexDirection: 'row', gap: 8 },
  demoStat: { flex: 1, borderRadius: 16, minHeight: 82, padding: 11, justifyContent: 'center', gap: 4 },
  demoStatValue: { fontSize: 18, fontWeight: '900' },
  demoStatLabel: { fontSize: 9, fontWeight: '800' },
  demoNotice: { borderWidth: 1, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  demoNoticeText: { flex: 1, fontSize: 11, lineHeight: 17 },
  infoCard: { paddingVertical: 2, paddingHorizontal: 15 },
  infoRow: { minHeight: 68, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 0.6 },
  infoValue: { fontSize: 14, fontWeight: '800', marginTop: 4 },
  logout: { minHeight: 54, borderWidth: 1, borderRadius: 18, flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center' },
  logoutText: { fontSize: 14, fontWeight: '900' },
});
