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

const methodText: Record<string, string> = { phone: 'Plaka + Telefon', tracking_code: 'Takip Kodu', qr: 'QR', mechanic_approval: 'Usta Onayı', staff_manual: 'İşletme' };

export function CustomerAccountScreen() {
  const { colors } = useTheme();
  const { profile, customerWorkshops, memberships, isAdmin, setAccountMode, refreshWorkspace, signOut } = useAuth();
  const [claims, setClaims] = useState<CustomerClaim[]>([]);
  const [showLink, setShowLink] = useState(false);
  const load = useCallback(async () => { const { data } = await supabase.rpc('customer_get_claims'); setClaims((data as CustomerClaim[] | null) ?? []); }, []);
  useEffect(() => { load(); }, [load]);

  const unlink = (id: string, name: string) => Alert.alert('Bağlantı kaldırılsın mı?', `${name} kayıtları panelinden kaldırılır; işletme verileri silinmez.`, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Kaldır', style: 'destructive', onPress: async () => { const { error } = await supabase.rpc('customer_unlink', { p_link_id: id }); if (error) return Alert.alert('Hata', error.message); await refreshWorkspace(); } },
  ]);

  return <ScrollView contentContainerStyle={styles.content}>
    <ScreenHeader eyebrow="MÜŞTERİ HESABI" title="Hesabım" subtitle="İşletme bağlantılarını ve eşleştirme geçmişini yönet." />
    <GlassCard style={styles.profile}><View style={[styles.avatar, { backgroundColor: `${colors.primary}18` }]}><Text style={[styles.avatarText, { color: colors.primary }]}>{profile?.full_name?.charAt(0) || 'M'}</Text></View><View style={styles.copy}><Text style={[styles.name, { color: colors.text }]}>{profile?.full_name}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{profile?.phone || 'Telefon yok'} • Müşteri</Text></View><Ionicons name="shield-checkmark" size={23} color={colors.green} /></GlassCard>

    <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: colors.text }]}>Bağlı İşletmeler</Text><AnimatedPressable onPress={() => setShowLink((v) => !v)} style={[styles.add, { borderColor: `${colors.primary}40`, backgroundColor: `${colors.primary}12` }]}><Ionicons name={showLink ? 'close' : 'add'} size={18} color={colors.primary} /><Text style={[styles.addText, { color: colors.primary }]}>{showLink ? 'Kapat' : 'Motor Ekle'}</Text></AnimatedPressable></View>
    {showLink && <CustomerLinkPanel onLinked={() => { setShowLink(false); load(); }} />}
    {customerWorkshops.map((item) => <GlassCard key={item.link_id} style={styles.workshop}><View style={[styles.icon, { backgroundColor: `${colors.cyan}15` }]}><Ionicons name="business" size={22} color={colors.cyan} /></View><View style={styles.copy}><Text style={[styles.workshopName, { color: colors.text }]}>{item.workshop_name}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{item.customer_name} • {methodText[item.link_method]}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{item.workshop_address || 'Adres eklenmedi'}</Text></View><AnimatedPressable onPress={() => unlink(item.link_id, item.workshop_name)}><Ionicons name="unlink" size={20} color={colors.red} /></AnimatedPressable></GlassCard>)}
    {customerWorkshops.length === 0 && !showLink && <GlassCard style={styles.empty}><Ionicons name="business-outline" size={38} color={colors.textMuted} /><Text style={[styles.emptyTitle, { color: colors.text }]}>Bağlı işletme yok</Text></GlassCard>}

    <Text style={[styles.sectionTitle, { color: colors.text }]}>Eşleştirme Geçmişi</Text>
    <GlassCard>{claims.length === 0 ? <Text style={[styles.emptyText, { color: colors.textMuted }]}>Henüz talep yok.</Text> : claims.slice(0, 10).map((item) => { const accent = item.status === 'approved' ? colors.green : item.status === 'pending' ? colors.orange : colors.red; return <View key={item.id} style={styles.claim}><Ionicons name={item.status === 'approved' ? 'checkmark-circle' : item.status === 'pending' ? 'time' : 'close-circle'} size={21} color={accent} /><View style={styles.copy}><Text style={[styles.claimTitle, { color: colors.text }]}>{item.brand} {item.model} • {item.plate}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{item.workshop_name} • {methodText[item.method]} • {shortDate(item.created_at)}</Text></View><Text style={[styles.status, { color: accent }]}>{item.status === 'approved' ? 'ONAYLI' : item.status === 'pending' ? 'BEKLİYOR' : 'RED'}</Text></View>; })}</GlassCard>

    {(memberships.length > 0 || isAdmin) && <AnimatedPressable onPress={async () => { const error = await setAccountMode('staff'); if (error) Alert.alert('Hata', error); }} style={[styles.mode, { borderColor: `${colors.orange}40`, backgroundColor: `${colors.orange}11` }]}><Ionicons name="construct" size={22} color={colors.orange} /><View style={styles.copy}><Text style={[styles.modeTitle, { color: colors.text }]}>Personel görünümüne geç</Text><Text style={[styles.meta, { color: colors.textMuted }]}>İşletme, usta veya admin panelini aç.</Text></View><Ionicons name="chevron-forward" size={20} color={colors.orange} /></AnimatedPressable>}
    <AnimatedPressable onPress={() => Alert.alert('Çıkış yapılsın mı?', '', [{ text: 'Vazgeç' }, { text: 'Çıkış', style: 'destructive', onPress: signOut }])} style={[styles.logout, { borderColor: `${colors.red}35`, backgroundColor: `${colors.red}10` }]}><Ionicons name="log-out-outline" size={20} color={colors.red} /><Text style={[styles.logoutText, { color: colors.red }]}>Hesaptan Çıkış Yap</Text></AnimatedPressable>
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 56, paddingBottom: 32, gap: 14 }, profile: { flexDirection: 'row', alignItems: 'center', gap: 11 }, avatar: { width: 53, height: 53, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }, avatarText: { fontSize: 21, fontWeight: '900' }, copy: { flex: 1, minWidth: 0 }, name: { fontSize: 17, fontWeight: '900' }, meta: { fontSize: 10.5, marginTop: 4 }, sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, sectionTitle: { fontSize: 18, fontWeight: '900' }, add: { minHeight: 40, borderWidth: 1, borderRadius: 14, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 5 }, addText: { fontSize: 10, fontWeight: '900' }, workshop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, icon: { width: 45, height: 45, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, workshopName: { fontSize: 14, fontWeight: '900' }, empty: { alignItems: 'center', gap: 8, paddingVertical: 28 }, emptyTitle: { fontSize: 16, fontWeight: '900' }, emptyText: { fontSize: 12, textAlign: 'center' }, claim: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 9 }, claimTitle: { fontSize: 12, fontWeight: '900' }, status: { fontSize: 8, fontWeight: '900' }, mode: { minHeight: 70, borderWidth: 1, borderRadius: 19, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 }, modeTitle: { fontSize: 13, fontWeight: '900' }, logout: { minHeight: 54, borderWidth: 1, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, logoutText: { fontSize: 13, fontWeight: '900' },
});
