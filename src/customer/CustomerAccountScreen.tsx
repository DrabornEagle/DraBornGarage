import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { GlassCard } from '../components/GlassCard';
import { ScreenHeader } from '../components/ScreenHeader';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { shortDate } from '../lib/format';
import { supabase } from '../lib/supabase';
import { CustomerClaim } from '../types';
import { CustomerLinkPanel } from './CustomerLinkPanel';

const methodLabel: Record<string, string> = {
  phone: 'Plaka + Telefon',
  tracking_code: 'Servis Takip Kodu',
  qr: 'QR Bağlantısı',
  mechanic_approval: 'Usta Onayı',
  staff_manual: 'İşletme Eşleştirmesi',
};

export function CustomerAccountScreen() {
  const { colors } = useTheme();
  const {
    profile,
    customerWorkshops,
    memberships,
    isAdmin,
    signOut,
    setAccountMode,
    refreshWorkspace,
  } = useAuth();
  const [claims, setClaims] = useState<CustomerClaim[]>([]);
  const [showLink, setShowLink] = useState(false);

  const loadClaims = useCallback(async () => {
    const { data } = await supabase.rpc('customer_get_claims');
    setClaims((data as CustomerClaim[] | null) ?? []);
  }, []);

  useEffect(() => { loadClaims(); }, [loadClaims]);

  const switchToStaff = async () => {
    const error = await setAccountMode('staff');
    if (error) Alert.alert('Görünüm değiştirilemedi', error);
  };

  const unlink = (linkId: string, workshopName: string) => {
    Alert.alert(
      'İşletme bağlantısı kaldırılsın mı?',
      `${workshopName} servis kayıtları müşteri panelinden kaldırılacak. İşletmedeki gerçek kayıtlar silinmez.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Bağlantıyı Kaldır',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.rpc('customer_unlink', { p_link_id: linkId });
            if (error) return Alert.alert('Bağlantı kaldırılamadı', error.message);
            await refreshWorkspace();
          },
        },
      ],
    );
  };

  const logout = () => Alert.alert('Çıkış yapılsın mı?', 'Bu cihazdaki müşteri oturumu kapatılacak.', [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Çıkış Yap', style: 'destructive', onPress: signOut },
  ]);

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <ScreenHeader eyebrow="MÜŞTERİ HESABI" title="Hesabım" subtitle="Profilini, işletme bağlantılarını ve eşleştirme geçmişini yönet." />

      <GlassCard style={styles.profileCard}>
        <View style={[styles.avatar, { backgroundColor: `${colors.primary}20` }]}><Text style={[styles.avatarText, { color: colors.primary }]}>{profile?.full_name?.charAt(0).toUpperCase() || 'M'}</Text></View>
        <View style={styles.copy}><Text style={[styles.name, { color: colors.text }]}>{profile?.full_name}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{profile?.phone || 'Telefon eklenmedi'} • Müşteri görünümü</Text></View>
        <Ionicons name="shield-checkmark" size={23} color={colors.green} />
      </GlassCard>

      <View style={styles.sectionHeader}>
        <View><Text style={[styles.sectionTitle, { color: colors.text }]}>Bağlı İşletmeler</Text><Text style={[styles.sectionText, { color: colors.textMuted }]}>Her işletmenin servis geçmişi ayrı tutulur.</Text></View>
        <AnimatedPressable onPress={() => setShowLink((value) => !value)} style={[styles.addButton, { backgroundColor: `${colors.primary}14`, borderColor: `${colors.primary}42` }]}><Ionicons name={showLink ? 'close' : 'add'} size={18} color={colors.primary} /><Text style={[styles.addButtonText, { color: colors.primary }]}>{showLink ? 'Kapat' : 'Motor Ekle'}</Text></AnimatedPressable>
      </View>

      {showLink && <CustomerLinkPanel onLinked={() => { setShowLink(false); loadClaims(); }} />}

      {customerWorkshops.length === 0 ? (
        !showLink && <GlassCard style={styles.empty}><Ionicons name="business-outline" size={38} color={colors.textMuted} /><Text style={[styles.emptyTitle, { color: colors.text }]}>Bağlı işletme yok</Text><Text style={[styles.emptyText, { color: colors.textMuted }]}>Motorunu telefon, takip kodu, QR veya usta onayıyla eşleştir.</Text></GlassCard>
      ) : customerWorkshops.map((item) => (
        <GlassCard key={item.link_id} style={styles.workshopCard}>
          <View style={[styles.workshopIcon, { backgroundColor: `${colors.cyan}16` }]}><Ionicons name="business" size={23} color={colors.cyan} /></View>
          <View style={styles.copy}><Text style={[styles.workshopName, { color: colors.text }]}>{item.workshop_name}</Text><Text style={[styles.workshopMeta, { color: colors.textMuted }]}>{item.customer_name} • {methodLabel[item.link_method] || item.link_method}</Text><Text style={[styles.workshopMeta, { color: colors.textMuted }]}>{item.workshop_address || 'Adres eklenmedi'}</Text></View>
          <AnimatedPressable onPress={() => unlink(item.link_id, item.workshop_name)} style={[styles.unlinkButton, { backgroundColor: `${colors.red}10`, borderColor: `${colors.red}32` }]}><Ionicons name="unlink" size={18} color={colors.red} /></AnimatedPressable>
        </GlassCard>
      ))}

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Eşleştirme Geçmişi</Text>
      <GlassCard style={styles.claimCard}>
        {claims.length === 0 ? <Text style={[styles.emptyText, { color: colors.textMuted }]}>Henüz eşleştirme talebi yok.</Text> : claims.slice(0, 10).map((claim, index) => {
          const accent = claim.status === 'approved' ? colors.green : claim.status === 'pending' ? colors.orange : colors.red;
          return (
            <View key={claim.id} style={[styles.claimRow, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}> 
              <View style={[styles.claimIcon, { backgroundColor: `${accent}15` }]}><Ionicons name={claim.status === 'approved' ? 'checkmark-circle' : claim.status === 'pending' ? 'time' : 'close-circle'} size={20} color={accent} /></View>
              <View style={styles.copy}><Text style={[styles.claimTitle, { color: colors.text }]}>{claim.brand} {claim.model} • {claim.plate}</Text><Text style={[styles.claimMeta, { color: colors.textMuted }]}>{claim.workshop_name} • {methodLabel[claim.method] || claim.method} • {shortDate(claim.created_at)}</Text></View>
              <Text style={[styles.claimStatus, { color: accent }]}>{claim.status === 'approved' ? 'ONAYLI' : claim.status === 'pending' ? 'BEKLİYOR' : claim.status.toLocaleUpperCase('tr-TR')}</Text>
            </View>
          );
        })}
      </GlassCard>

      {(memberships.length > 0 || isAdmin) && (
        <AnimatedPressable onPress={switchToStaff} style={[styles.modeButton, { backgroundColor: `${colors.orange}12`, borderColor: `${colors.orange}38` }]}><Ionicons name="construct" size={21} color={colors.orange} /><View style={styles.copy}><Text style={[styles.modeTitle, { color: colors.text }]}>Personel görünümüne geç</Text><Text style={[styles.modeText, { color: colors.textMuted }]}>İşletme, Usta, Çırak veya Admin panelini aç.</Text></View><Ionicons name="chevron-forward" size={20} color={colors.orange} /></AnimatedPressable>
      )}

      <AnimatedPressable onPress={logout} style={[styles.logout, { backgroundColor: `${colors.red}12`, borderColor: `${colors.red}35` }]}><Ionicons name="log-out-outline" size={21} color={colors.red} /><Text style={[styles.logoutText, { color: colors.red }]}>Hesaptan Çıkış Yap</Text></AnimatedPressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 56, paddingBottom: 120, gap: 15 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 54, height: 54, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 21, fontWeight: '900' },
  copy: { flex: 1, minWidth: 0 },
  name: { fontSize: 17, fontWeight: '900' },
  meta: { fontSize: 11, marginTop: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '900' },
  sectionText: { fontSize: 11, marginTop: 4 },
  addButton: { minHeight: 40, borderWidth: 1, borderRadius: 14, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 5 },
  addButtonText: { fontSize: 10, fontWeight: '900' },
  workshopCard: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  workshopIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  workshopName: { fontSize: 14, fontWeight: '900' },
  workshopMeta: { fontSize: 10, marginTop: 4 },
  unlinkButton: { width: 38, height: 38, borderWidth: 1, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: 9, paddingVertical: 28 },
  emptyTitle: { fontSize: 17, fontWeight: '900' },
  emptyText: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
  claimCard: { paddingVertical: 3, paddingHorizontal: 14 },
  claimRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 10 },
  claimIcon: { width: 39, height: 39, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  claimTitle: { fontSize: 12, fontWeight: '900' },
  claimMeta: { fontSize: 9, marginTop: 4 },
  claimStatus: { fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },
  modeButton: { minHeight: 68, borderWidth: 1, borderRadius: 19, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
  modeTitle: { fontSize: 13, fontWeight: '900' },
  modeText: { fontSize: 10, marginTop: 4 },
  logout: { minHeight: 54, borderWidth: 1, borderRadius: 18, flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center' },
  logoutText: { fontSize: 14, fontWeight: '900' },
});
