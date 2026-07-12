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
import { CustomerClaim, MechanicApplication, WorkshopSearchResult } from '../types';
import { CustomerLinkPanel } from './CustomerLinkPanel';

const methodText: Record<string, string> = {
  phone: 'Plaka + Telefon',
  tracking_code: 'Takip Kodu',
  qr: 'QR',
  mechanic_approval: 'Usta Onayı',
  staff_manual: 'İşletme',
};

const applicationLabel: Record<MechanicApplication['status'], string> = {
  pending: 'İnceleniyor',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
  cancelled: 'İptal Edildi',
};

export function CustomerAccountScreen() {
  const { colors } = useTheme();
  const {
    profile,
    customerWorkshops,
    memberships,
    mechanicApplications,
    isAdmin,
    setAccountMode,
    refreshWorkspace,
    searchWorkshops,
    applyAsMechanic,
    joinWorkshop,
    signOut,
  } = useAuth();
  const [claims, setClaims] = useState<CustomerClaim[]>([]);
  const [showLink, setShowLink] = useState(false);
  const [workshopQuery, setWorkshopQuery] = useState('');
  const [workshopResults, setWorkshopResults] = useState<WorkshopSearchResult[]>([]);
  const [applicationNote, setApplicationNote] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc('customer_get_claims');
    setClaims((data as CustomerClaim[] | null) ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const applicationsByWorkshop = useMemo(() => {
    const map = new Map<string, MechanicApplication>();
    mechanicApplications.forEach((item) => map.set(item.workshop_id, item));
    return map;
  }, [mechanicApplications]);

  const unlink = (id: string, name: string) => Alert.alert(
    'Bağlantı kaldırılsın mı?',
    `${name} kayıtları panelinden kaldırılır; işletme verileri silinmez.`,
    [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Kaldır',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.rpc('customer_unlink', { p_link_id: id });
          if (error) return Alert.alert('Hata', error.message);
          await refreshWorkspace();
        },
      },
    ],
  );

  const runWorkshopSearch = async () => {
    if (workshopQuery.trim().length < 2) return Alert.alert('İşletme adı gerekli', 'Arama için en az 2 karakter yaz.');
    setSearching(true);
    const result = await searchWorkshops(workshopQuery);
    setSearching(false);
    if (result.error) return Alert.alert('İşletmeler aranamadı', result.error);
    setWorkshopResults(result.data);
  };

  const sendMechanicApplication = (workshop: WorkshopSearchResult) => {
    const existing = applicationsByWorkshop.get(workshop.id);
    if (existing?.status === 'pending') return Alert.alert('Başvurun zaten inceleniyor');
    if (existing?.status === 'approved') return Alert.alert('Bu işletmede Usta erişimin zaten onaylı');

    Alert.alert(
      'Usta başvurusu gönderilsin mi?',
      `${workshop.name} işletmesine Usta olarak katılma talebin gönderilecek.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: existing?.status === 'rejected' ? 'Yeniden Başvur' : 'Başvuruyu Gönder',
          onPress: async () => {
            setSubmittingId(workshop.id);
            const error = await applyAsMechanic(workshop.id, applicationNote);
            setSubmittingId(null);
            if (error) return Alert.alert('Başvuru gönderilemedi', error);
            setApplicationNote('');
            Alert.alert('Başvurun gönderildi', 'İşletme onayladığında Usta panelin otomatik olarak açılacak.');
          },
        },
      ],
    );
  };

  const redeemInvite = async () => {
    if (inviteCode.trim().length < 6) return Alert.alert('Davet kodunu kontrol et');
    setJoining(true);
    const error = await joinWorkshop(inviteCode);
    setJoining(false);
    if (error) return Alert.alert('Kod kullanılamadı', error);
    setInviteCode('');
    Alert.alert('Usta panelin açıldı', 'İşletmenin personel daveti başarıyla kabul edildi.');
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <ScreenHeader eyebrow="MÜŞTERİ HESABI" title="Hesabım" subtitle="İşletme bağlantılarını, Usta başvurularını ve davet kodlarını yönet." />

      <GlassCard style={styles.profile}>
        <View style={[styles.avatar, { backgroundColor: `${colors.primary}18` }]}><Text style={[styles.avatarText, { color: colors.primary }]}>{profile?.full_name?.charAt(0) || 'M'}</Text></View>
        <View style={styles.copy}><Text style={[styles.name, { color: colors.text }]}>{profile?.full_name}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{profile?.phone || 'Telefon yok'} • Müşteri hesabı</Text></View>
        <Ionicons name="shield-checkmark" size={24} color={colors.green} />
      </GlassCard>

      <GlassCard style={[styles.mechanicHub, { borderColor: `${colors.orange}45` }]}>
        <View style={styles.hubHeader}>
          <View style={[styles.hubIcon, { backgroundColor: `${colors.orange}1A` }]}><Ionicons name="construct" size={27} color={colors.orange} /></View>
          <View style={styles.copy}>
            <Text style={[styles.hubTitle, { color: colors.text }]}>Usta Paneline Katıl</Text>
            <Text style={[styles.hubText, { color: colors.textMuted }]}>İşletme adını arayıp Usta başvurusu gönder veya işletmenin verdiği tek kullanımlık Usta kodunu gir.</Text>
          </View>
        </View>

        <View style={[styles.methodBox, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}>
          <View style={styles.methodHeader}><Ionicons name="search" size={21} color={colors.primary} /><View style={styles.copy}><Text style={[styles.methodTitle, { color: colors.text }]}>İşletme Ara ve Başvur</Text><Text style={[styles.methodText, { color: colors.textMuted }]}>İşletme onayladığında hesabın otomatik Usta paneline geçer.</Text></View></View>
          <FormField label="İşletme adı" value={workshopQuery} onChangeText={setWorkshopQuery} placeholder="Örn. Ankara Merkez Garage" autoCapitalize="words" />
          <FormField label="Başvuru notu (isteğe bağlı)" value={applicationNote} onChangeText={setApplicationNote} placeholder="Deneyim, uzmanlık veya kısa tanıtım" multiline />
          <PrimaryButton title="İşletmeleri Ara" onPress={runWorkshopSearch} loading={searching} secondary />

          {workshopResults.length > 0 && <View style={styles.searchResults}>{workshopResults.map((item) => {
            const application = applicationsByWorkshop.get(item.id);
            const accent = application?.status === 'approved' ? colors.green : application?.status === 'pending' ? colors.orange : application?.status === 'rejected' ? colors.red : colors.primary;
            return (
              <View key={item.id} style={[styles.searchResult, { backgroundColor: colors.card, borderColor: application ? `${accent}50` : colors.border }]}>
                <View style={[styles.businessIcon, { backgroundColor: `${accent}16` }]}><Ionicons name="business" size={23} color={accent} /></View>
                <View style={styles.copy}><Text style={[styles.workshopName, { color: colors.text }]}>{item.name}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{item.address || 'Adres eklenmedi'}</Text>{application && <Text style={[styles.applicationState, { color: accent }]}>{applicationLabel[application.status].toLocaleUpperCase('tr-TR')}</Text>}</View>
                <AnimatedPressable onPress={() => sendMechanicApplication(item)} disabled={submittingId === item.id || application?.status === 'pending' || application?.status === 'approved'} style={[styles.applyButton, { backgroundColor: `${accent}12`, borderColor: `${accent}45`, opacity: application?.status === 'pending' || application?.status === 'approved' ? 0.65 : 1 }]}>
                  <Ionicons name={application?.status === 'pending' ? 'hourglass' : application?.status === 'approved' ? 'checkmark' : 'send'} size={18} color={accent} />
                  <Text style={[styles.applyText, { color: accent }]}>{submittingId === item.id ? 'Gönderiliyor' : application?.status === 'pending' ? 'Bekliyor' : application?.status === 'approved' ? 'Onaylı' : application?.status === 'rejected' ? 'Yeniden' : 'Başvur'}</Text>
                </AnimatedPressable>
              </View>
            );
          })}</View>}
        </View>

        {mechanicApplications.length > 0 && (
          <View style={styles.applicationList}>
            <Text style={[styles.subsectionTitle, { color: colors.text }]}>Usta Başvurularım</Text>
            {mechanicApplications.map((item) => {
              const accent = item.status === 'approved' ? colors.green : item.status === 'pending' ? colors.orange : item.status === 'rejected' ? colors.red : colors.textMuted;
              return <View key={item.id} style={[styles.applicationRow, { backgroundColor: colors.surfaceSoft, borderColor: `${accent}3D` }]}><Ionicons name={item.status === 'approved' ? 'checkmark-circle' : item.status === 'pending' ? 'hourglass' : item.status === 'rejected' ? 'close-circle' : 'remove-circle'} size={23} color={accent} /><View style={styles.copy}><Text style={[styles.applicationName, { color: colors.text }]}>{item.workshop_name}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{shortDate(item.submitted_at)} • {item.workshop_address || 'Adres eklenmedi'}</Text>{item.review_note && <Text style={[styles.reviewNote, { color: colors.textMuted }]}>{item.review_note}</Text>}</View><Text style={[styles.status, { color: accent }]}>{applicationLabel[item.status].toLocaleUpperCase('tr-TR')}</Text></View>;
            })}
          </View>
        )}

        <View style={[styles.methodBox, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}>
          <View style={styles.methodHeader}><Ionicons name="key" size={22} color={colors.green} /><View style={styles.copy}><Text style={[styles.methodTitle, { color: colors.text }]}>Usta Davet Kodum Var</Text><Text style={[styles.methodText, { color: colors.textMuted }]}>İşletmenin gönderdiği Usta kodunu girerek başvuru beklemeden personel panelini aç.</Text></View></View>
          <FormField label="Personel davet kodu" value={inviteCode} onChangeText={(value) => setInviteCode(value.toUpperCase())} placeholder="Örn. A1B2C3D4" autoCapitalize="characters" />
          <PrimaryButton title="Kodu Kullan ve Usta Panelini Aç" onPress={redeemInvite} loading={joining} />
        </View>
      </GlassCard>

      <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: colors.text }]}>Bağlı İşletmeler</Text><AnimatedPressable onPress={() => setShowLink((value) => !value)} style={[styles.add, { borderColor: `${colors.primary}40`, backgroundColor: `${colors.primary}12` }]}><Ionicons name={showLink ? 'close' : 'add'} size={19} color={colors.primary} /><Text style={[styles.addText, { color: colors.primary }]}>{showLink ? 'Kapat' : 'Motor Ekle'}</Text></AnimatedPressable></View>
      {showLink && <CustomerLinkPanel onLinked={() => { setShowLink(false); load(); }} />}
      {customerWorkshops.map((item) => <GlassCard key={item.link_id} style={styles.workshop}><View style={[styles.icon, { backgroundColor: `${colors.cyan}15` }]}><Ionicons name="business" size={23} color={colors.cyan} /></View><View style={styles.copy}><Text style={[styles.workshopName, { color: colors.text }]}>{item.workshop_name}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{item.customer_name} • {methodText[item.link_method]}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{item.workshop_address || 'Adres eklenmedi'}</Text></View><AnimatedPressable onPress={() => unlink(item.link_id, item.workshop_name)}><Ionicons name="unlink" size={21} color={colors.red} /></AnimatedPressable></GlassCard>)}
      {customerWorkshops.length === 0 && !showLink && <GlassCard style={styles.empty}><Ionicons name="business-outline" size={40} color={colors.textMuted} /><Text style={[styles.emptyTitle, { color: colors.text }]}>Bağlı işletme yok</Text></GlassCard>}

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Eşleştirme Geçmişi</Text>
      <GlassCard>{claims.length === 0 ? <Text style={[styles.emptyText, { color: colors.textMuted }]}>Henüz talep yok.</Text> : claims.slice(0, 10).map((item) => { const accent = item.status === 'approved' ? colors.green : item.status === 'pending' ? colors.orange : colors.red; return <View key={item.id} style={styles.claim}><Ionicons name={item.status === 'approved' ? 'checkmark-circle' : item.status === 'pending' ? 'time' : 'close-circle'} size={22} color={accent} /><View style={styles.copy}><Text style={[styles.claimTitle, { color: colors.text }]}>{item.brand} {item.model} • {item.plate}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{item.workshop_name} • {methodText[item.method]} • {shortDate(item.created_at)}</Text></View><Text style={[styles.status, { color: accent }]}>{item.status === 'approved' ? 'ONAYLI' : item.status === 'pending' ? 'BEKLİYOR' : 'RED'}</Text></View>; })}</GlassCard>

      {(memberships.length > 0 || isAdmin) && <AnimatedPressable onPress={async () => { const error = await setAccountMode('staff'); if (error) Alert.alert('Hata', error); }} style={[styles.mode, { borderColor: `${colors.orange}40`, backgroundColor: `${colors.orange}11` }]}><Ionicons name="construct" size={23} color={colors.orange} /><View style={styles.copy}><Text style={[styles.modeTitle, { color: colors.text }]}>Personel görünümüne geç</Text><Text style={[styles.meta, { color: colors.textMuted }]}>İşletme, Usta veya Admin panelini aç.</Text></View><Ionicons name="chevron-forward" size={21} color={colors.orange} /></AnimatedPressable>}
      <AnimatedPressable onPress={() => Alert.alert('Çıkış yapılsın mı?', '', [{ text: 'Vazgeç' }, { text: 'Çıkış', style: 'destructive', onPress: signOut }])} style={[styles.logout, { borderColor: `${colors.red}35`, backgroundColor: `${colors.red}10` }]}><Ionicons name="log-out-outline" size={21} color={colors.red} /><Text style={[styles.logoutText, { color: colors.red }]}>Hesaptan Çıkış Yap</Text></AnimatedPressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 56, paddingBottom: 34, gap: 16 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 55, height: 55, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 22, fontWeight: '900' },
  copy: { flex: 1, minWidth: 0 },
  name: { fontSize: 18, fontWeight: '900' },
  meta: { fontSize: 12, lineHeight: 17, marginTop: 4 },
  mechanicHub: { gap: 15, borderWidth: 1 },
  hubHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hubIcon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  hubTitle: { fontSize: 19, fontWeight: '900' },
  hubText: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  methodBox: { borderWidth: 1, borderRadius: 20, padding: 14, gap: 12 },
  methodHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  methodTitle: { fontSize: 16, fontWeight: '900' },
  methodText: { fontSize: 12, lineHeight: 18, marginTop: 3 },
  searchResults: { gap: 9 },
  searchResult: { minHeight: 78, borderWidth: 1, borderRadius: 17, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 9 },
  businessIcon: { width: 45, height: 45, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  workshopName: { fontSize: 15, fontWeight: '900' },
  applicationState: { fontSize: 11, fontWeight: '900', marginTop: 5 },
  applyButton: { minWidth: 82, minHeight: 43, borderWidth: 1, borderRadius: 13, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  applyText: { fontSize: 11.5, fontWeight: '900' },
  applicationList: { gap: 9 },
  subsectionTitle: { fontSize: 16, fontWeight: '900' },
  applicationRow: { minHeight: 72, borderWidth: 1, borderRadius: 17, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 9 },
  applicationName: { fontSize: 14.5, fontWeight: '900' },
  reviewNote: { fontSize: 11.5, lineHeight: 16, marginTop: 4 },
  status: { fontSize: 10.5, fontWeight: '900', maxWidth: 78, textAlign: 'right' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 19, fontWeight: '900' },
  add: { minHeight: 42, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  addText: { fontSize: 11.5, fontWeight: '900' },
  workshop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 28 },
  emptyTitle: { fontSize: 17, fontWeight: '900' },
  emptyText: { fontSize: 13, textAlign: 'center' },
  claim: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 9 },
  claimTitle: { fontSize: 13.5, fontWeight: '900' },
  mode: { minHeight: 74, borderWidth: 1, borderRadius: 19, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  modeTitle: { fontSize: 14.5, fontWeight: '900' },
  logout: { minHeight: 56, borderWidth: 1, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  logoutText: { fontSize: 14, fontWeight: '900' },
});
