import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { FormField } from '../components/FormField';
import { GlassCard } from '../components/GlassCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { MemberRole } from '../types';
import { TeamScreen } from './TeamScreen';

type AccessRequest = {
  id: string;
  user_id: string;
  applicant_name?: string | null;
  applicant_phone?: string | null;
  applicant_email?: string | null;
  request_business_panel: boolean;
  request_mechanic_panel: boolean;
  source: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  applicant_note?: string | null;
  submitted_at: string;
  review_note?: string | null;
};

type UserSearchResult = {
  user_id: string;
  full_name: string;
  phone?: string | null;
  email?: string | null;
  membership_role?: MemberRole | null;
  membership_active?: boolean | null;
};

const roleName = (role?: MemberRole | null) => role === 'owner_mechanic'
  ? 'İşletme Sahibi + Usta'
  : role === 'owner'
    ? 'İşletme Sahibi'
    : role === 'mechanic'
      ? 'Usta'
      : role === 'apprentice'
        ? 'Çırak'
        : 'Erişim yok';

export function TeamScreenV102() {
  const { colors } = useTheme();
  const { workshop, membership, isAdmin, refreshWorkspace } = useAuth();
  const [visible, setVisible] = useState(false);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const isOwner = isAdmin || membership?.role === 'owner' || membership?.role === 'owner_mechanic';

  const loadRequests = useCallback(async () => {
    if (!workshop?.id || !isOwner) return;
    const { data, error } = await supabase.rpc('owner_get_workshop_access_requests', { p_workshop_id: workshop.id });
    if (error) {
      Alert.alert('Erişim başvuruları alınamadı', error.message);
      return;
    }
    setRequests((data as AccessRequest[] | null) ?? []);
  }, [workshop?.id, isOwner]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    if (!workshop?.id || !isOwner) return;
    const channel = supabase.channel(`workshop-access-manager-${workshop.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workshop_access_requests', filter: `workshop_id=eq.${workshop.id}` }, () => loadRequests())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [workshop?.id, isOwner, loadRequests]);

  const searchUsers = async () => {
    if (!workshop?.id) return;
    if (query.trim().length < 2) {
      Alert.alert('Arama bilgisi gerekli', 'Ad, telefon veya e-postadan en az 2 karakter yaz.');
      return;
    }
    setSearching(true);
    const { data, error } = await supabase.rpc('owner_search_users', { p_workshop_id: workshop.id, p_query: query.trim() });
    setSearching(false);
    if (error) {
      Alert.alert('Kullanıcı aranamadı', error.message);
      return;
    }
    setResults((data as UserSearchResult[] | null) ?? []);
  };

  const grant = (user: UserSearchResult, businessPanel: boolean, mechanicPanel: boolean) => {
    if (!workshop?.id) return;
    const accessText = businessPanel && mechanicPanel ? 'İşletme ve Usta panellerini' : businessPanel ? 'İşletme panelini' : 'Usta panelini';
    Alert.alert(
      'Panel erişimi verilsin mi?',
      `${user.full_name} için ${accessText} açılacak.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Erişimi Aç',
          onPress: async () => {
            setLoading(true);
            const { error } = await supabase.rpc('owner_grant_workshop_access', {
              p_workshop_id: workshop.id,
              p_user_id: user.user_id,
              p_business_panel: businessPanel,
              p_mechanic_panel: mechanicPanel,
            });
            setLoading(false);
            if (error) return Alert.alert('Erişim açılamadı', error.message);
            await Promise.all([loadRequests(), refreshWorkspace(workshop.id)]);
            await searchUsers();
            Alert.alert('Erişim açıldı', `${user.full_name} artık ${accessText.toLocaleLowerCase('tr-TR')} kullanabilir.`);
          },
        },
      ],
    );
  };

  const review = (request: AccessRequest, approve: boolean) => {
    const accessText = request.request_business_panel && request.request_mechanic_panel
      ? 'İşletme Sahibi + Usta'
      : request.request_business_panel
        ? 'İşletme Sahibi'
        : 'Usta';
    Alert.alert(
      approve ? 'Başvuruyu onayla' : 'Başvuruyu reddet',
      `${request.applicant_name || 'Kullanıcı'} • ${accessText}`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: approve ? 'Onayla' : 'Reddet',
          style: approve ? 'default' : 'destructive',
          onPress: async () => {
            setLoading(true);
            const { error } = await supabase.rpc('owner_review_workshop_access_request', {
              p_request_id: request.id,
              p_approve: approve,
              p_note: approve ? `${accessText} erişimi işletme sahibi tarafından açıldı` : 'Başvuru işletme sahibi tarafından uygun bulunmadı',
            });
            setLoading(false);
            if (error) return Alert.alert('Başvuru sonuçlandırılamadı', error.message);
            await Promise.all([loadRequests(), refreshWorkspace(workshop?.id ?? null)]);
          },
        },
      ],
    );
  };

  const accessEntry = isOwner ? (
    <AnimatedPressable
      onPress={() => setVisible(true)}
      style={[styles.accessButton, { backgroundColor: colors.cardStrong, borderColor: `${colors.green}70`, shadowColor: colors.green }]}
    >
      <Ionicons name="people-circle" size={24} color={colors.green} />
      <View style={styles.copy}>
        <Text style={[styles.accessTitle, { color: colors.text }]}>İşletme ve Usta Erişimi</Text>
        <Text style={[styles.accessSubtitle, { color: colors.textMuted }]}>Kullanıcı ara • İşletme/Usta paneli aç</Text>
      </View>
      {requests.filter((item) => item.status === 'pending').length > 0 && <View style={[styles.badge, { backgroundColor: colors.red }]}><Text style={styles.badgeText}>{requests.filter((item) => item.status === 'pending').length}</Text></View>}
      <Ionicons name="chevron-forward" size={20} color={colors.green} />
    </AnimatedPressable>
  ) : undefined;

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><TeamScreen accessEntry={accessEntry} /></KeyboardAvoidingView>

      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setVisible(false)}>
        <KeyboardAvoidingView style={[styles.modal, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={[styles.headerIcon, { backgroundColor: `${colors.green}16` }]}><Ionicons name="people-circle" size={29} color={colors.green} /></View>
            <View style={styles.copy}><Text style={[styles.title, { color: colors.text }]}>İşletme ve Usta Erişimi</Text><Text style={[styles.subtitle, { color: colors.textMuted }]}>{workshop?.name} ekibini ve ortaklarını yönet.</Text></View>
            <AnimatedPressable onPress={() => setVisible(false)} style={[styles.close, { borderColor: colors.border }]}><Ionicons name="close" size={23} color={colors.text} /></AnimatedPressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            automaticallyAdjustKeyboardInsets
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.sectionHeader}><View><Text style={[styles.sectionTitle, { color: colors.text }]}>Onay Bekleyen Başvurular</Text><Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>Kayıt sırasında mevcut işletmeyi seçen kullanıcılar.</Text></View><AnimatedPressable onPress={loadRequests} style={[styles.refresh, { borderColor: colors.border }]}><Ionicons name="refresh" size={19} color={colors.primary} /></AnimatedPressable></View>

            {requests.filter((item) => item.status === 'pending').length === 0
              ? <GlassCard style={styles.empty}><Ionicons name="checkmark-done-circle" size={36} color={colors.green} /><Text style={[styles.emptyTitle, { color: colors.text }]}>Bekleyen ortaklık başvurusu yok</Text><Text style={[styles.emptyText, { color: colors.textMuted }]}>Yeni başvurular geldiğinde burada görünecek ve bildirim alacaksın.</Text></GlassCard>
              : requests.filter((item) => item.status === 'pending').map((request) => {
                  const accessText = request.request_business_panel && request.request_mechanic_panel ? 'İşletme + Usta' : request.request_business_panel ? 'İşletme' : 'Usta';
                  return <GlassCard key={request.id} style={[styles.requestCard, { borderColor: `${colors.orange}45` }]}>
                    <View style={styles.userRow}><View style={[styles.avatar, { backgroundColor: `${colors.orange}18` }]}><Text style={[styles.avatarText, { color: colors.orange }]}>{request.applicant_name?.charAt(0) || 'K'}</Text></View><View style={styles.copy}><Text style={[styles.userName, { color: colors.text }]}>{request.applicant_name || 'Kullanıcı'}</Text><Text style={[styles.userMeta, { color: colors.textMuted }]}>{request.applicant_phone || request.applicant_email || 'İletişim bilgisi yok'}</Text></View><View style={[styles.rolePill, { backgroundColor: `${colors.orange}12`, borderColor: `${colors.orange}38` }]}><Text style={[styles.rolePillText, { color: colors.orange }]}>{accessText}</Text></View></View>
                    <Text style={[styles.note, { color: colors.textSoft }]}>{request.applicant_note || 'Başvuru notu bulunmuyor.'}</Text>
                    <View style={styles.actions}><AnimatedPressable onPress={() => review(request, false)} style={[styles.action, { borderColor: `${colors.red}40`, backgroundColor: `${colors.red}0D` }]}><Ionicons name="close" size={19} color={colors.red} /><Text style={[styles.actionText, { color: colors.red }]}>Reddet</Text></AnimatedPressable><AnimatedPressable onPress={() => review(request, true)} style={[styles.action, { borderColor: `${colors.green}40`, backgroundColor: `${colors.green}0D` }]}><Ionicons name="checkmark" size={19} color={colors.green} /><Text style={[styles.actionText, { color: colors.green }]}>Onayla</Text></AnimatedPressable></View>
                  </GlassCard>;
                })}

            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Kullanıcı Ara ve Erişim Ver</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>DraBornGarage hesabını ad, telefon veya e-posta ile bul. İşletme paneli, kişisel Usta paneli veya ikisini birlikte aç.</Text>
            <FormField label="Kullanıcı Ara" value={query} onChangeText={setQuery} placeholder="Ad, telefon veya e-posta" autoCapitalize="none" />
            <PrimaryButton title="Kullanıcıları Ara" onPress={searchUsers} loading={searching} />

            {results.length === 0 && query.trim().length >= 2 && !searching && <GlassCard style={styles.empty}><Ionicons name="search" size={32} color={colors.cyan} /><Text style={[styles.emptyTitle, { color: colors.text }]}>Kullanıcı sonucu yok</Text><Text style={[styles.emptyText, { color: colors.textMuted }]}>Arama düğmesine bas veya bilgiyi farklı yazımla dene.</Text></GlassCard>}

            {results.map((user) => <GlassCard key={user.user_id} style={styles.userCard}>
              <View style={styles.userRow}><View style={[styles.avatar, { backgroundColor: `${colors.primary}18` }]}><Text style={[styles.avatarText, { color: colors.primary }]}>{user.full_name?.charAt(0) || 'K'}</Text></View><View style={styles.copy}><Text style={[styles.userName, { color: colors.text }]}>{user.full_name}</Text><Text style={[styles.userMeta, { color: colors.textMuted }]}>{user.phone || 'Telefon yok'} • {user.email || 'E-posta yok'}</Text><Text style={[styles.currentRole, { color: user.membership_active ? colors.green : colors.textMuted }]}>Mevcut: {roleName(user.membership_role)}{user.membership_active === false ? ' • Pasif' : ''}</Text></View></View>
              <View style={styles.panelGrid}>
                <PanelButton icon="business" label="İşletme" accent={colors.cyan} onPress={() => grant(user, true, false)} />
                <PanelButton icon="construct" label="Usta" accent={colors.orange} onPress={() => grant(user, false, true)} />
                <PanelButton icon="git-merge" label="İkisi" accent={colors.green} onPress={() => grant(user, true, true)} />
              </View>
            </GlassCard>)}

            {loading && <Text style={[styles.processing, { color: colors.textMuted }]}>Erişim güncelleniyor…</Text>}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function PanelButton({ icon, label, accent, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; accent: string; onPress: () => void }) {
  return <AnimatedPressable onPress={onPress} style={[styles.panelButton, { borderColor: `${accent}42`, backgroundColor: `${accent}10` }]}><Ionicons name={icon} size={18} color={accent} /><Text style={[styles.panelButtonText, { color: accent }]}>{label}</Text></AnimatedPressable>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  accessButton: { minHeight: 72, borderWidth: 1, borderRadius: 21, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10, shadowOpacity: 0.22, shadowRadius: 12, elevation: 7 },
  copy: { flex: 1, minWidth: 0 },
  accessTitle: { fontSize: 14, fontWeight: '900' },
  accessSubtitle: { fontSize: 11.5, marginTop: 3 },
  badge: { minWidth: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  modal: { flex: 1 },
  header: { minHeight: 88, paddingHorizontal: 18, paddingTop: 22, paddingBottom: 12, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 11 },
  headerIcon: { width: 50, height: 50, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 21, fontWeight: '900' },
  subtitle: { fontSize: 12.5, marginTop: 3 },
  close: { width: 43, height: 43, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 18, paddingBottom: 180, gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '900' },
  sectionSubtitle: { fontSize: 12.5, lineHeight: 18, marginTop: 4 },
  refresh: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { minHeight: 145, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '900', textAlign: 'center' },
  emptyText: { fontSize: 12.5, lineHeight: 18, textAlign: 'center' },
  requestCard: { gap: 12, borderWidth: 1 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '900' },
  userName: { fontSize: 14.5, fontWeight: '900' },
  userMeta: { fontSize: 12, lineHeight: 17, marginTop: 3 },
  currentRole: { fontSize: 11.5, fontWeight: '800', marginTop: 5 },
  rolePill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 },
  rolePillText: { fontSize: 10.5, fontWeight: '900' },
  note: { fontSize: 12.5, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  actionText: { fontSize: 12.5, fontWeight: '900' },
  divider: { height: 1, marginVertical: 7 },
  userCard: { gap: 13 },
  panelGrid: { flexDirection: 'row', gap: 7 },
  panelButton: { flex: 1, minHeight: 48, borderWidth: 1, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  panelButtonText: { fontSize: 11.5, fontWeight: '900' },
  processing: { textAlign: 'center', fontSize: 12.5, fontWeight: '800' },
});
