import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { GlassCard } from '../components/GlassCard';
import { PremiumBackground } from '../components/PremiumBackground';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { shortDate } from '../lib/format';
import { supabase } from '../lib/supabase';
import { BusinessApplication, MechanicApplication } from '../types';

type EntryTab = 'application' | 'account';
type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

type WorkshopAccessRequest = {
  id: string;
  workshop_id: string;
  workshop_name: string;
  workshop_phone?: string | null;
  workshop_address?: string | null;
  request_business_panel: boolean;
  request_mechanic_panel: boolean;
  source: string;
  status: ApplicationStatus;
  applicant_note?: string | null;
  submitted_at: string;
  reviewed_at?: string | null;
  review_note?: string | null;
};

const statusLabel = (status: ApplicationStatus | BusinessApplication['status'] | MechanicApplication['status']) => {
  if (status === 'approved') return 'ONAYLANDI';
  if (status === 'rejected') return 'ONAYLANMADI';
  if (status === 'cancelled') return 'İPTAL EDİLDİ';
  return 'ONAY BEKLİYOR';
};

export function ApplicationEntryScreen() {
  const { colors } = useTheme();
  const {
    profile,
    businessApplication,
    mechanicApplications,
    setAccountMode,
    signOut,
    refreshWorkspace,
  } = useAuth();
  const [tab, setTab] = useState<EntryTab>('application');
  const [accessRequests, setAccessRequests] = useState<WorkshopAccessRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [switching, setSwitching] = useState(false);

  const loadAccessRequests = useCallback(async () => {
    const { data, error } = await supabase.rpc('customer_get_workshop_access_requests');
    if (error) {
      Alert.alert('Başvuru bilgileri alınamadı', error.message);
      return;
    }
    setAccessRequests((data as WorkshopAccessRequest[] | null) ?? []);
  }, []);

  useEffect(() => {
    loadAccessRequests();
  }, [loadAccessRequests]);

  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel(`application-entry-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workshop_access_requests', filter: `user_id=eq.${profile.id}` }, () => {
        loadAccessRequests().catch(() => undefined);
        refreshWorkspace().catch(() => undefined);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'business_applications', filter: `user_id=eq.${profile.id}` }, () => refreshWorkspace())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mechanic_applications', filter: `user_id=eq.${profile.id}` }, () => refreshWorkspace())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.id, loadAccessRequests, refreshWorkspace]);

  const applicationCount = Number(Boolean(businessApplication)) + accessRequests.length + mechanicApplications.length;
  const pendingCount = Number(businessApplication?.status === 'pending')
    + accessRequests.filter((item) => item.status === 'pending').length
    + mechanicApplications.filter((item) => item.status === 'pending').length;

  const latestStatus = useMemo(() => {
    if (pendingCount > 0) return 'Başvurun inceleniyor';
    if (accessRequests.some((item) => item.status === 'approved') || businessApplication?.status === 'approved' || mechanicApplications.some((item) => item.status === 'approved')) return 'Başvurun onaylandı';
    if (applicationCount > 0) return 'Başvurun sonuçlandı';
    return 'Başvuru kaydı bekleniyor';
  }, [accessRequests, applicationCount, businessApplication?.status, mechanicApplications, pendingCount]);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([loadAccessRequests(), refreshWorkspace()]);
    setRefreshing(false);
  };

  const openCustomerAccount = () => {
    Alert.alert(
      'Müşteri hesabına geçilsin mi?',
      'Başvurun silinmez. Hesabım bölümünden müşteri görünümüne geçerek motor, servis ve randevu alanlarını kullanabilirsin.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Müşteri Hesabına Geç',
          onPress: async () => {
            setSwitching(true);
            const error = await setAccountMode('customer');
            setSwitching(false);
            if (error) Alert.alert('Geçiş yapılamadı', error);
          },
        },
      ],
    );
  };

  return (
    <PremiumBackground>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
      >
        <View style={styles.hero}>
          <View style={[styles.heroIcon, { backgroundColor: `${colors.orange}18`, borderColor: `${colors.orange}48` }]}>
            <Ionicons name="document-text" size={34} color={colors.orange} />
          </View>
          <Text style={[styles.eyebrow, { color: colors.orange }]}>DraBornGarage • v1.0.3 RC</Text>
          <Text style={[styles.title, { color: colors.text }]}>Merhaba, {profile?.full_name?.split(' ')[0] || 'Kullanıcı'}</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>İşletme veya Usta başvurun sonuçlanana kadar bu ekrandan güncel durumunu takip edebilirsin.</Text>
          <View style={[styles.statusPill, { backgroundColor: `${pendingCount > 0 ? colors.orange : colors.green}14`, borderColor: `${pendingCount > 0 ? colors.orange : colors.green}45` }]}>
            <View style={[styles.statusDot, { backgroundColor: pendingCount > 0 ? colors.orange : colors.green }]} />
            <Text style={[styles.statusPillText, { color: pendingCount > 0 ? colors.orange : colors.green }]}>{latestStatus}</Text>
          </View>
        </View>

        <View style={[styles.tabs, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}>
          <TabButton active={tab === 'application'} icon="document-text" label="Başvurum" badge={pendingCount} onPress={() => setTab('application')} />
          <TabButton active={tab === 'account'} icon="person-circle" label="Hesabım" onPress={() => setTab('account')} />
        </View>

        {tab === 'application' ? (
          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <View style={styles.copy}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Başvuru Bilgilerim</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>{applicationCount} başvuru kaydı • {pendingCount} onay bekliyor</Text>
              </View>
              <AnimatedPressable onPress={refresh} style={[styles.refreshButton, { borderColor: colors.border }]}><Ionicons name="refresh" size={20} color={colors.primary} /></AnimatedPressable>
            </View>

            {businessApplication && <BusinessApplicationCard application={businessApplication} />}
            {accessRequests.map((request) => <WorkshopAccessCard key={request.id} request={request} />)}
            {mechanicApplications.map((application) => <MechanicApplicationCard key={application.id} application={application} />)}

            {applicationCount === 0 && (
              <GlassCard style={styles.emptyCard}>
                <Ionicons name="hourglass" size={38} color={colors.orange} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>Başvuru kaydı hazırlanıyor</Text>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>Ekranı aşağı çekerek yenile. Kayıt tamamlandığında işletme ve erişim bilgilerin burada görünecek.</Text>
              </GlassCard>
            )}

            <GlassCard style={[styles.infoCard, { borderColor: `${colors.cyan}35` }]}>
              <Ionicons name="shield-checkmark" size={25} color={colors.cyan} />
              <View style={styles.copy}>
                <Text style={[styles.infoTitle, { color: colors.text }]}>Güvenli onay akışı</Text>
                <Text style={[styles.infoText, { color: colors.textMuted }]}>Yeni işletme başvuruları Admin tarafından; mevcut işletme ve Usta erişimleri yetkili işletme sahibi tarafından onaylanır.</Text>
              </View>
            </GlassCard>
          </View>
        ) : (
          <View style={styles.section}>
            <GlassCard style={styles.accountCard}>
              <View style={[styles.avatar, { backgroundColor: `${colors.primary}18` }]}><Text style={[styles.avatarText, { color: colors.primary }]}>{profile?.full_name?.charAt(0) || 'D'}</Text></View>
              <View style={styles.copy}>
                <Text style={[styles.accountName, { color: colors.text }]}>{profile?.full_name || 'DraBornGarage Kullanıcısı'}</Text>
                <Text style={[styles.accountMeta, { color: colors.textMuted }]}>{profile?.phone || 'Telefon eklenmedi'} • Başvuru hesabı</Text>
              </View>
            </GlassCard>

            <GlassCard style={styles.customerCard}>
              <View style={[styles.customerIcon, { backgroundColor: `${colors.cyan}16` }]}><Ionicons name="bicycle" size={28} color={colors.cyan} /></View>
              <Text style={[styles.customerTitle, { color: colors.text }]}>Müşteri hesabını da kullan</Text>
              <Text style={[styles.customerText, { color: colors.textMuted }]}>Başvurun devam ederken müşteri görünümüne geçebilirsin. Başvuru kaydın ve onay sürecin korunur.</Text>
              <PrimaryButton title="Müşteri Hesabına Geç" onPress={openCustomerAccount} loading={switching} />
            </GlassCard>

            <AnimatedPressable onPress={() => Alert.alert('Çıkış yapılsın mı?', '', [{ text: 'Vazgeç' }, { text: 'Çıkış Yap', style: 'destructive', onPress: signOut }])} style={[styles.logout, { backgroundColor: `${colors.red}0D`, borderColor: `${colors.red}35` }]}>
              <Ionicons name="log-out-outline" size={21} color={colors.red} />
              <Text style={[styles.logoutText, { color: colors.red }]}>Hesaptan Çıkış Yap</Text>
            </AnimatedPressable>
          </View>
        )}
      </ScrollView>
    </PremiumBackground>
  );
}

function statusAccent(status: ApplicationStatus | BusinessApplication['status'] | MechanicApplication['status'], colors: ReturnType<typeof useTheme>['colors']) {
  if (status === 'approved') return colors.green;
  if (status === 'rejected' || status === 'cancelled') return colors.red;
  return colors.orange;
}

function ApplicationHeader({ icon, title, subtitle, status }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; status: ApplicationStatus | BusinessApplication['status'] | MechanicApplication['status'] }) {
  const { colors } = useTheme();
  const accent = statusAccent(status, colors);
  return <View style={styles.applicationHeader}><View style={[styles.applicationIcon, { backgroundColor: `${accent}16` }]}><Ionicons name={icon} size={23} color={accent} /></View><View style={styles.copy}><Text style={[styles.applicationTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.applicationSubtitle, { color: colors.textMuted }]}>{subtitle}</Text></View><View style={[styles.applicationStatus, { backgroundColor: `${accent}12`, borderColor: `${accent}38` }]}><Text style={[styles.applicationStatusText, { color: accent }]}>{statusLabel(status)}</Text></View></View>;
}

function BusinessApplicationCard({ application }: { application: BusinessApplication }) {
  const { colors } = useTheme();
  return <GlassCard style={styles.applicationCard}><ApplicationHeader icon="business" title="Yeni İşletme Başvurusu" subtitle={application.business_name} status={application.status} /><Detail label="Gönderim" value={shortDate(application.submitted_at)} /><Detail label="Vergi Dairesi" value={application.tax_office || '-'} /><Detail label="Adres" value={application.business_address || 'Adres eklenmedi'} />{application.review_note && <Text style={[styles.reviewNote, { color: colors.textSoft }]}>{application.review_note}</Text>}</GlassCard>;
}

function WorkshopAccessCard({ request }: { request: WorkshopAccessRequest }) {
  const { colors } = useTheme();
  const requestedPanels = request.request_business_panel && request.request_mechanic_panel ? 'İşletme + Usta' : request.request_business_panel ? 'İşletme' : 'Usta';
  return <GlassCard style={styles.applicationCard}><ApplicationHeader icon="people-circle" title="İşletme ve Usta Erişimi" subtitle={request.workshop_name} status={request.status} /><Detail label="İstenen erişim" value={requestedPanels} /><Detail label="Gönderim" value={shortDate(request.submitted_at)} /><Detail label="İşletme" value={[request.workshop_address, request.workshop_phone].filter(Boolean).join(' • ') || 'İletişim bilgisi eklenmedi'} />{request.review_note && <Text style={[styles.reviewNote, { color: colors.textSoft }]}>{request.review_note}</Text>}</GlassCard>;
}

function MechanicApplicationCard({ application }: { application: MechanicApplication }) {
  const { colors } = useTheme();
  return <GlassCard style={styles.applicationCard}><ApplicationHeader icon="construct" title="Usta Başvurusu" subtitle={application.workshop_name} status={application.status} /><Detail label="Gönderim" value={shortDate(application.submitted_at)} /><Detail label="İşletme" value={[application.workshop_address, application.workshop_phone].filter(Boolean).join(' • ') || 'İletişim bilgisi eklenmedi'} />{application.review_note && <Text style={[styles.reviewNote, { color: colors.textSoft }]}>{application.review_note}</Text>}</GlassCard>;
}

function Detail({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return <View style={[styles.detailRow, { borderTopColor: colors.border }]}><Text style={[styles.detailLabel, { color: colors.textMuted }]}>{label}</Text><Text style={[styles.detailValue, { color: colors.text }]}>{value}</Text></View>;
}

function TabButton({ active, icon, label, badge, onPress }: { active: boolean; icon: keyof typeof Ionicons.glyphMap; label: string; badge?: number; onPress: () => void }) {
  const { colors } = useTheme();
  return <AnimatedPressable onPress={onPress} style={[styles.tabButton, active && { backgroundColor: colors.cardStrong, borderColor: colors.primary }]}><Ionicons name={icon} size={19} color={active ? colors.primary : colors.textMuted} /><Text style={[styles.tabText, { color: active ? colors.text : colors.textMuted }]}>{label}</Text>{Boolean(badge) && <View style={[styles.tabBadge, { backgroundColor: colors.orange }]}><Text style={styles.tabBadgeText}>{badge}</Text></View>}</AnimatedPressable>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 58, paddingBottom: 130, gap: 18 },
  hero: { alignItems: 'center', gap: 8 },
  heroIcon: { width: 72, height: 72, borderWidth: 1, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontSize: 11.5, fontWeight: '900', letterSpacing: 1.05 },
  title: { fontSize: 27, fontWeight: '900', letterSpacing: -0.8, textAlign: 'center' },
  subtitle: { maxWidth: 355, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  statusPill: { minHeight: 38, borderWidth: 1, borderRadius: 999, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusPillText: { fontSize: 12, fontWeight: '900' },
  tabs: { minHeight: 61, borderWidth: 1, borderRadius: 20, padding: 5, flexDirection: 'row', gap: 5 },
  tabButton: { flex: 1, minHeight: 49, borderWidth: 1, borderColor: 'transparent', borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  tabText: { fontSize: 13, fontWeight: '900' },
  tabBadge: { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  tabBadgeText: { color: '#fff', fontSize: 10.5, fontWeight: '900' },
  section: { gap: 12 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  copy: { flex: 1, minWidth: 0 },
  sectionTitle: { fontSize: 19, fontWeight: '900' },
  sectionSubtitle: { fontSize: 12.5, marginTop: 4 },
  refreshButton: { width: 43, height: 43, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  applicationCard: { gap: 9 },
  applicationHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  applicationIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  applicationTitle: { fontSize: 14.5, fontWeight: '900' },
  applicationSubtitle: { fontSize: 12, marginTop: 3 },
  applicationStatus: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 6 },
  applicationStatusText: { fontSize: 9.5, fontWeight: '900' },
  detailRow: { minHeight: 48, borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 8 },
  detailLabel: { fontSize: 11.5, fontWeight: '800' },
  detailValue: { flex: 1, fontSize: 12.5, fontWeight: '800', textAlign: 'right' },
  reviewNote: { fontSize: 12.5, lineHeight: 18 },
  emptyCard: { minHeight: 175, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '900', textAlign: 'center' },
  emptyText: { maxWidth: 320, fontSize: 12.5, lineHeight: 18, textAlign: 'center' },
  infoCard: { borderWidth: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoTitle: { fontSize: 14, fontWeight: '900' },
  infoText: { fontSize: 12.5, lineHeight: 18, marginTop: 4 },
  accountCard: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  avatar: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 21, fontWeight: '900' },
  accountName: { fontSize: 16, fontWeight: '900' },
  accountMeta: { fontSize: 12.5, marginTop: 4 },
  customerCard: { alignItems: 'center', gap: 10 },
  customerIcon: { width: 58, height: 58, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  customerTitle: { fontSize: 18, fontWeight: '900', textAlign: 'center' },
  customerText: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  logout: { minHeight: 54, borderWidth: 1, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  logoutText: { fontSize: 13, fontWeight: '900' },
});
