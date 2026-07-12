import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { FormField } from '../components/FormField';
import { GlassCard } from '../components/GlassCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { shortDate } from '../lib/format';
import { supabase } from '../lib/supabase';
import { CustomerClaim, StaffApplication } from '../types';
import { CustomerLinkPanel } from './CustomerLinkPanel';

const methodText: Record<string, string> = { phone: 'Plaka + Telefon', tracking_code: 'Takip Kodu', qr: 'QR', mechanic_approval: 'Usta Onayı', staff_manual: 'İşletme' };
const staffRoleText = { mechanic: 'Usta', apprentice: 'Çırak' } as const;

export function CustomerAccountScreen() {
  const { colors } = useTheme();
  const { profile, customerWorkshops, memberships, isAdmin, setAccountMode, refreshWorkspace, joinWorkshop, signOut } = useAuth();
  const [claims, setClaims] = useState<CustomerClaim[]>([]);
  const [applications, setApplications] = useState<StaffApplication[]>([]);
  const [showLink, setShowLink] = useState(false);
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<string | null>(null);
  const [requestedRole, setRequestedRole] = useState<'mechanic' | 'apprentice'>('mechanic');
  const [applicationNote, setApplicationNote] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const [claimResult, applicationResult] = await Promise.all([supabase.rpc('customer_get_claims'), supabase.rpc('customer_get_staff_applications')]);
    setClaims((claimResult.data as CustomerClaim[] | null) ?? []);
    setApplications((applicationResult.data as StaffApplication[] | null) ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!selectedWorkshopId && customerWorkshops[0]) setSelectedWorkshopId(customerWorkshops[0].workshop_id); }, [customerWorkshops, selectedWorkshopId]);

  const currentApplication = useMemo(() => applications.find((item) => item.workshop_id === selectedWorkshopId), [applications, selectedWorkshopId]);

  const unlink = (id: string, name: string) => Alert.alert('Bağlantı kaldırılsın mı?', `${name} kayıtları panelinden kaldırılır; işletme verileri silinmez.`, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Kaldır', style: 'destructive', onPress: async () => { const { error } = await supabase.rpc('customer_unlink', { p_link_id: id }); if (error) return Alert.alert('Hata', error.message); await refreshWorkspace(); } },
  ]);

  const submitApplication = async () => {
    if (!selectedWorkshopId) return Alert.alert('İşletme seç', 'Başvuru göndermek için önce motorunu bir işletmeye bağla.');
    setLoading(true);
    const { error } = await supabase.rpc('customer_submit_staff_application', { p_workshop_id: selectedWorkshopId, p_role: requestedRole, p_note: applicationNote.trim() || null });
    setLoading(false);
    if (error) return Alert.alert('Başvuru gönderilemedi', error.message);
    setApplicationNote(''); await load();
    Alert.alert('Başvurun gönderildi', 'İşletme onayladığında personel panelin otomatik açılacak.');
  };

  const useInvite = async () => {
    if (inviteCode.trim().length < 4) return Alert.alert('Davet kodunu gir');
    setLoading(true);
    const error = await joinWorkshop(inviteCode);
    setLoading(false);
    if (error) return Alert.alert('Kod kullanılamadı', error);
    setInviteCode('');
    Alert.alert('Personel erişimi açıldı', 'Davet kodundaki rol ile personel paneline bağlandın.');
  };

  return <ScrollView contentContainerStyle={styles.content}>
    <ScreenHeader eyebrow="MÜŞTERİ HESABI" title="Hesabım" subtitle="İşletme bağlantılarını, Usta/Çırak başvurularını ve davet kodlarını yönet." />
    <GlassCard style={styles.profile}><View style={[styles.avatar, { backgroundColor: `${colors.primary}18` }]}><Text style={[styles.avatarText, { color: colors.primary }]}>{profile?.full_name?.charAt(0) || 'M'}</Text></View><View style={styles.copy}><Text style={[styles.name, { color: colors.text }]}>{profile?.full_name}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{profile?.phone || 'Telefon yok'} • Müşteri</Text></View><Ionicons name="shield-checkmark" size={23} color={colors.green} /></GlassCard>

    <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: colors.text }]}>Bağlı İşletmeler</Text><AnimatedPressable onPress={() => setShowLink((v) => !v)} style={[styles.add, { borderColor: `${colors.primary}40`, backgroundColor: `${colors.primary}12` }]}><Ionicons name={showLink ? 'close' : 'add'} size={18} color={colors.primary} /><Text style={[styles.addText, { color: colors.primary }]}>{showLink ? 'Kapat' : 'Motor Ekle'}</Text></AnimatedPressable></View>
    {showLink && <CustomerLinkPanel onLinked={() => { setShowLink(false); load(); }} />}
    {customerWorkshops.map((item) => <GlassCard key={item.link_id} style={styles.workshop}><View style={[styles.icon, { backgroundColor: `${colors.cyan}15` }]}><Ionicons name="business" size={22} color={colors.cyan} /></View><View style={styles.copy}><Text style={[styles.workshopName, { color: colors.text }]}>{item.workshop_name}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{item.customer_name} • {methodText[item.link_method]}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{item.workshop_address || 'Adres eklenmedi'}</Text></View><AnimatedPressable onPress={() => unlink(item.link_id, item.workshop_name)}><Ionicons name="unlink" size={20} color={colors.red} /></AnimatedPressable></GlassCard>)}
    {customerWorkshops.length === 0 && !showLink && <GlassCard style={styles.empty}><Ionicons name="business-outline" size={38} color={colors.textMuted} /><Text style={[styles.emptyTitle, { color: colors.text }]}>Bağlı işletme yok</Text></GlassCard>}

    <Text style={[styles.sectionTitle, { color: colors.text }]}>Usta / Çırak Erişimi</Text>
    <GlassCard style={styles.accessCard}>
      <View style={styles.accessHeader}><View style={[styles.accessIcon, { backgroundColor: `${colors.orange}18` }]}><Ionicons name="construct" size={25} color={colors.orange} /></View><View style={styles.copy}><Text style={[styles.accessTitle, { color: colors.text }]}>Personel başvurusu gönder</Text><Text style={[styles.accessText, { color: colors.textMuted }]}>Motorunun eşleştiği işletmeye Usta veya Çırak başvurusu gönder. Onaydan sonra panel otomatik açılır.</Text></View></View>
      {customerWorkshops.length > 0 ? <>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{customerWorkshops.map((item) => { const active = selectedWorkshopId === item.workshop_id; return <AnimatedPressable key={item.workshop_id} onPress={() => setSelectedWorkshopId(item.workshop_id)} style={[styles.chip, { backgroundColor: active ? colors.primary : colors.surfaceSoft, borderColor: active ? colors.primary : colors.border }]}><Ionicons name="business" size={16} color={active ? '#fff' : colors.textMuted} /><Text style={[styles.chipText, { color: active ? '#fff' : colors.text }]}>{item.workshop_name}</Text></AnimatedPressable>; })}</ScrollView>
        <View style={styles.roleRow}>{(['mechanic','apprentice'] as const).map((role) => { const active = requestedRole === role; const accent = role === 'mechanic' ? colors.primary : colors.orange; return <AnimatedPressable key={role} onPress={() => setRequestedRole(role)} style={[styles.roleButton, { backgroundColor: active ? `${accent}1E` : colors.surfaceSoft, borderColor: active ? accent : colors.border }]}><Ionicons name={role === 'mechanic' ? 'construct' : 'school'} size={20} color={accent} /><Text style={[styles.roleText, { color: active ? accent : colors.textMuted }]}>{staffRoleText[role]} Başvurusu</Text></AnimatedPressable>; })}</View>
        <FormField label="Başvuru notu (opsiyonel)" value={applicationNote} onChangeText={setApplicationNote} multiline placeholder="Deneyim, çalışma alanı veya kısa açıklama" />
        {currentApplication?.status === 'pending' && <View style={[styles.pendingBox, { backgroundColor: `${colors.orange}10`, borderColor: `${colors.orange}38` }]}><Ionicons name="time" size={20} color={colors.orange} /><Text style={[styles.pendingText, { color: colors.text }]}>Bu işletmede {staffRoleText[currentApplication.requested_role]} başvurun inceleniyor.</Text></View>}
        <PrimaryButton title={currentApplication?.status === 'pending' ? 'Başvuruyu Güncelle' : 'Başvuruyu Gönder'} onPress={submitApplication} loading={loading} />
      </> : <Text style={[styles.accessText, { color: colors.textMuted }]}>Başvuru yapabilmek için önce motorunu bir işletmeyle eşleştir.</Text>}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <Text style={[styles.inviteTitle, { color: colors.text }]}>İşletmeden davet kodu aldım</Text>
      <Text style={[styles.accessText, { color: colors.textMuted }]}>Başvuru beklemeden Usta veya Çırak kodunu girerek personel panelini açabilirsin.</Text>
      <FormField label="Personel davet kodu" value={inviteCode} onChangeText={(value) => setInviteCode(value.toUpperCase())} autoCapitalize="characters" placeholder="Örn. A1B2C3D4" />
      <PrimaryButton title="Kodu Kullan ve Personel Panelini Aç" onPress={useInvite} loading={loading} secondary />
    </GlassCard>

    {applications.length > 0 && <><Text style={[styles.sectionTitle, { color: colors.text }]}>Personel Başvuru Geçmişi</Text><GlassCard>{applications.map((item) => { const accent = item.status === 'approved' ? colors.green : item.status === 'pending' ? colors.orange : colors.red; return <View key={item.id} style={styles.claim}><Ionicons name={item.status === 'approved' ? 'checkmark-circle' : item.status === 'pending' ? 'time' : 'close-circle'} size={21} color={accent} /><View style={styles.copy}><Text style={[styles.claimTitle, { color: colors.text }]}>{item.workshop_name} • {staffRoleText[item.requested_role]}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{shortDate(item.submitted_at)}{item.review_note ? ` • ${item.review_note}` : ''}</Text></View><Text style={[styles.status, { color: accent }]}>{item.status === 'approved' ? 'ONAYLI' : item.status === 'pending' ? 'BEKLİYOR' : 'RED'}</Text></View>; })}</GlassCard></>}

    <Text style={[styles.sectionTitle, { color: colors.text }]}>Eşleştirme Geçmişi</Text>
    <GlassCard>{claims.length === 0 ? <Text style={[styles.emptyText, { color: colors.textMuted }]}>Henüz talep yok.</Text> : claims.slice(0, 10).map((item) => { const accent = item.status === 'approved' ? colors.green : item.status === 'pending' ? colors.orange : colors.red; return <View key={item.id} style={styles.claim}><Ionicons name={item.status === 'approved' ? 'checkmark-circle' : item.status === 'pending' ? 'time' : 'close-circle'} size={21} color={accent} /><View style={styles.copy}><Text style={[styles.claimTitle, { color: colors.text }]}>{item.brand} {item.model} • {item.plate}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{item.workshop_name} • {methodText[item.method]} • {shortDate(item.created_at)}</Text></View><Text style={[styles.status, { color: accent }]}>{item.status === 'approved' ? 'ONAYLI' : item.status === 'pending' ? 'BEKLİYOR' : 'RED'}</Text></View>; })}</GlassCard>

    {(memberships.length > 0 || isAdmin) && <AnimatedPressable onPress={async () => { const error = await setAccountMode('staff'); if (error) Alert.alert('Hata', error); }} style={[styles.mode, { borderColor: `${colors.orange}40`, backgroundColor: `${colors.orange}11` }]}><Ionicons name="construct" size={22} color={colors.orange} /><View style={styles.copy}><Text style={[styles.modeTitle, { color: colors.text }]}>Personel görünümüne geç</Text><Text style={[styles.meta, { color: colors.textMuted }]}>İşletme, Usta, Çırak veya Admin panelini aç.</Text></View><Ionicons name="chevron-forward" size={20} color={colors.orange} /></AnimatedPressable>}
    <AnimatedPressable onPress={() => Alert.alert('Çıkış yapılsın mı?', '', [{ text: 'Vazgeç' }, { text: 'Çıkış', style: 'destructive', onPress: signOut }])} style={[styles.logout, { borderColor: `${colors.red}35`, backgroundColor: `${colors.red}10` }]}><Ionicons name="log-out-outline" size={20} color={colors.red} /><Text style={[styles.logoutText, { color: colors.red }]}>Hesaptan Çıkış Yap</Text></AnimatedPressable>
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 56, paddingBottom: 32, gap: 15 }, profile: { flexDirection: 'row', alignItems: 'center', gap: 11 }, avatar: { width: 53, height: 53, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }, avatarText: { fontSize: 21, fontWeight: '900' }, copy: { flex: 1, minWidth: 0 }, name: { fontSize: 18, fontWeight: '900' }, meta: { fontSize: 12, marginTop: 4, lineHeight: 17 }, sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, sectionTitle: { fontSize: 19, fontWeight: '900' }, add: { minHeight: 42, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 5 }, addText: { fontSize: 11, fontWeight: '900' }, workshop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, icon: { width: 45, height: 45, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, workshopName: { fontSize: 15, fontWeight: '900' }, empty: { alignItems: 'center', gap: 8, paddingVertical: 28 }, emptyTitle: { fontSize: 17, fontWeight: '900' }, emptyText: { fontSize: 13, textAlign: 'center' }, claim: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 9 }, claimTitle: { fontSize: 13, fontWeight: '900' }, status: { fontSize: 10, fontWeight: '900' }, mode: { minHeight: 72, borderWidth: 1, borderRadius: 19, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 }, modeTitle: { fontSize: 14, fontWeight: '900' }, logout: { minHeight: 56, borderWidth: 1, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, logoutText: { fontSize: 14, fontWeight: '900' }, accessCard: { gap: 13 }, accessHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 }, accessIcon: { width: 50, height: 50, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }, accessTitle: { fontSize: 17, fontWeight: '900' }, accessText: { fontSize: 12.5, lineHeight: 18, marginTop: 3 }, chips: { gap: 8, paddingRight: 12 }, chip: { minHeight: 42, maxWidth: 245, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 7 }, chipText: { flexShrink: 1, fontSize: 12, fontWeight: '900' }, roleRow: { flexDirection: 'row', gap: 9 }, roleButton: { flex: 1, minHeight: 54, borderWidth: 1, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, roleText: { fontSize: 11.5, fontWeight: '900' }, pendingBox: { minHeight: 52, borderWidth: 1, borderRadius: 15, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 8 }, pendingText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: '800' }, divider: { height: 1, marginVertical: 2 }, inviteTitle: { fontSize: 15, fontWeight: '900' },
});
