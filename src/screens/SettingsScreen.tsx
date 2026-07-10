import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { GlassCard } from '../components/GlassCard';
import { ScreenHeader } from '../components/ScreenHeader';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ThemeMode } from '../types';

export function SettingsScreen() {
  const { colors, mode, setMode } = useTheme();
  const { profile, workshop, membership, signOut } = useAuth();

  const logout = () => Alert.alert('Çıkış yapılsın mı?', 'Bu cihazdaki oturum kapatılacak.', [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Çıkış Yap', style: 'destructive', onPress: signOut },
  ]);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ScreenHeader eyebrow="KİŞİSELLEŞTİR" title="Ayarlar" subtitle="Görünüm, hesap ve aktif işletme bilgileri." />

      <GlassCard style={styles.profileCard}>
        <View style={[styles.avatar, { backgroundColor: `${colors.primary}20` }]}><Text style={[styles.avatarText, { color: colors.primary }]}>{profile?.full_name?.charAt(0) || 'D'}</Text></View>
        <View style={styles.copy}><Text style={[styles.name, { color: colors.text }]}>{profile?.full_name}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{membership?.role === 'owner' ? 'İşletme sahibi' : 'Usta'} • {workshop?.name}</Text></View>
        <Ionicons name="shield-checkmark" size={23} color={colors.green} />
      </GlassCard>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Tema</Text>
      <GlassCard style={styles.optionCard}>
        {([
          ['system', 'Otomatik', 'Telefonun görünümünü takip eder', 'contrast'],
          ['light', 'Açık', 'Aydınlık ve temiz arayüz', 'sunny'],
          ['dark', 'Koyu', 'Premium garaj görünümü', 'moon'],
        ] as [ThemeMode, string, string, keyof typeof Ionicons.glyphMap][]).map(([value, title, subtitle, icon], index) => (
          <AnimatedPressable key={value} onPress={() => setMode(value)} style={[styles.optionRow, index > 0 && { borderTopColor: colors.border, borderTopWidth: 1 }]}> 
            <View style={[styles.optionIcon, { backgroundColor: `${colors.primary}15` }]}><Ionicons name={icon} size={21} color={colors.primary} /></View>
            <View style={styles.copy}><Text style={[styles.optionTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.optionSubtitle, { color: colors.textMuted }]}>{subtitle}</Text></View>
            <Ionicons name={mode === value ? 'radio-button-on' : 'radio-button-off'} size={23} color={mode === value ? colors.primary : colors.textMuted} />
          </AnimatedPressable>
        ))}
      </GlassCard>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>İşletme</Text>
      <GlassCard style={styles.infoCard}>
        <InfoRow icon="business" label="İşletme adı" value={workshop?.name || '-'} />
        <InfoRow icon="call" label="Telefon" value={workshop?.phone || 'Eklenmedi'} />
        <InfoRow icon="location" label="Adres" value={workshop?.address || 'Eklenmedi'} />
      </GlassCard>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Uygulama</Text>
      <GlassCard style={styles.infoCard}>
        <InfoRow icon="layers" label="Sürüm" value="v0.1.0" />
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
  avatarText: { fontSize: 21, fontWeight: '900' },
  copy: { flex: 1 },
  name: { fontSize: 17, fontWeight: '900' },
  meta: { fontSize: 12, marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '900', marginTop: 3 },
  optionCard: { paddingVertical: 5, paddingHorizontal: 15 },
  optionRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  optionTitle: { fontSize: 14, fontWeight: '900' },
  optionSubtitle: { fontSize: 11, marginTop: 3 },
  infoCard: { paddingVertical: 2, paddingHorizontal: 15 },
  infoRow: { minHeight: 68, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 0.6 },
  infoValue: { fontSize: 14, fontWeight: '800', marginTop: 4 },
  logout: { minHeight: 54, borderWidth: 1, borderRadius: 18, flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center' },
  logoutText: { fontSize: 14, fontWeight: '900' },
});
