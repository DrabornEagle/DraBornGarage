import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { GlassCard } from '../components/GlassCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';

const PRIVACY_POLICY_URL = 'https://github.com/DrabornEagle/DraBornGarage/blob/main/docs/PRIVACY_POLICY.md';
const ACCOUNT_DELETION_URL = 'https://github.com/DrabornEagle/DraBornGarage/blob/main/docs/ACCOUNT_DELETION.md';

type DeletionStatus = 'pending' | 'cancelled' | 'processing' | 'completed' | 'rejected';

interface DeletionRequest {
  id: string;
  status: DeletionStatus;
  requested_at: string;
  admin_note?: string | null;
}

interface PrivacyStatus {
  email?: string | null;
  deletion_request?: DeletionRequest | null;
}

const statusLabel: Record<DeletionStatus, string> = {
  pending: 'İnceleme bekliyor',
  processing: 'İşleniyor',
  completed: 'Tamamlandı',
  cancelled: 'İptal edildi',
  rejected: 'Reddedildi',
};

export function PrivacyCenter() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<PrivacyStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadStatus = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    const { data, error } = await supabase.rpc('account_privacy_status');
    setLoading(false);
    if (error) {
      Alert.alert('Gizlilik bilgileri açılamadı', error.message);
      return;
    }
    setStatus((data as PrivacyStatus | null) ?? null);
  }, [session?.user]);

  useEffect(() => {
    if (visible) loadStatus();
  }, [visible, loadStatus]);

  if (!session?.user) return null;

  const request = status?.deletion_request;
  const hasActiveRequest = request?.status === 'pending' || request?.status === 'processing';

  const createDeletionRequest = () => {
    Alert.alert(
      'Hesap silme talebi oluşturulsun mu?',
      'Hesabın hemen silinmez. Aktif servis, borç, yasal saklama ve işletme sorumlulukları kontrol edildikten sonra talep en geç 30 gün içinde işleme alınır.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Talep Oluştur',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            const { error } = await supabase.rpc('account_request_deletion', { p_reason: 'Uygulama içi hesap silme talebi' });
            setSubmitting(false);
            if (error) return Alert.alert('Talep oluşturulamadı', error.message);
            await loadStatus();
            Alert.alert('Talebin alındı', 'Hesap silme talebin kayıt altına alındı. Durumu bu ekrandan takip edebilirsin.');
          },
        },
      ],
    );
  };

  const cancelDeletionRequest = () => {
    Alert.alert('Silme talebi iptal edilsin mi?', '', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Talebi İptal Et',
        onPress: async () => {
          setSubmitting(true);
          const { error } = await supabase.rpc('account_cancel_deletion');
          setSubmitting(false);
          if (error) return Alert.alert('Talep iptal edilemedi', error.message);
          await loadStatus();
        },
      },
    ]);
  };

  return (
    <>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel="Gizlilik ve hesap merkezi"
        onPress={() => setVisible(true)}
        style={[styles.floatingButton, { backgroundColor: colors.cardStrong, borderColor: `${colors.green}55`, shadowColor: colors.green }]}
      >
        <Ionicons name="shield-checkmark" size={29} color={colors.green} />
      </AnimatedPressable>

      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setVisible(false)}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}> 
          <View style={[styles.header, { borderBottomColor: colors.border }]}> 
            <View style={[styles.headerIcon, { backgroundColor: `${colors.green}16` }]}><Ionicons name="shield-checkmark" size={30} color={colors.green} /></View>
            <View style={styles.copy}><Text style={[styles.title, { color: colors.text }]}>Gizlilik ve Hesap</Text><Text style={[styles.subtitle, { color: colors.textMuted }]}>Verilerini, izinlerini ve silme talebini yönet.</Text></View>
            <AnimatedPressable accessibilityLabel="Kapat" onPress={() => setVisible(false)} style={[styles.close, { borderColor: colors.border }]}><Ionicons name="close" size={22} color={colors.text} /></AnimatedPressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <GlassCard style={styles.heroCard}>
              <View style={[styles.heroIcon, { backgroundColor: `${colors.primary}15` }]}><Ionicons name="lock-closed" size={28} color={colors.primary} /></View>
              <View style={styles.copy}><Text style={[styles.cardTitle, { color: colors.text }]}>Verilerin senin kontrolünde</Text><Text style={[styles.body, { color: colors.textMuted }]}>DraBornGarage; servis yönetimi için gerekli hesap, işletme, müşteri, motosiklet, randevu, işlem, ödeme ve bildirim verilerini işler. Veriler reklam satışı için kullanılmaz.</Text></View>
            </GlassCard>

            <PrivacySection icon="server" title="İşlenen veri grupları" accent={colors.cyan} items={[
              'Ad, telefon, e-posta ve hesap rolü',
              'İşletme, personel üyeliği ve vergi başvuru bilgileri',
              'Müşteri, motosiklet, plaka, servis ve randevu kayıtları',
              'Tahsilat, alacak/veresiye ve platform hizmet bedeli kayıtları',
              'Bildirim tercihleri ve uygulama içi hareket kayıtları',
              'Yalnız kullanıcı seçerse platform ödeme dekontu',
            ]} />

            <PrivacySection icon="phone-portrait" title="Telefon izinleri" accent={colors.orange} items={[
              'Kamera: yalnız servis QR kodu taramak için',
              'Fotoğraflar: yalnız isteğe bağlı dekont seçmek için',
              'Bildirim: servis ve randevu hatırlatmalarını göstermek için',
              'Konum, mikrofon, rehber, arama ve SMS izni kullanılmaz',
            ]} />

            <PrivacySection icon="people" title="Paylaşım ve saklama" accent={colors.primary2} items={[
              'Veriler yalnız yetkili kullanıcı, ilgili işletme ve rol kapsamındaki personelle gösterilir',
              'Supabase altyapısı kimlik doğrulama, veritabanı, depolama ve canlı güncelleme için kullanılır',
              'Yasal yükümlülük veya açık finansal kayıt gerektiren bilgiler gerekli süre boyunca sınırlı tutulabilir',
              'Silme tamamlandığında erişim hesabı ve silinmesi mümkün kişisel bağlantılar kaldırılır veya anonimleştirilir',
            ]} />

            <View style={styles.linksRow}>
              <AnimatedPressable onPress={() => Linking.openURL(PRIVACY_POLICY_URL)} style={[styles.linkButton, { borderColor: `${colors.green}45`, backgroundColor: `${colors.green}10` }]}><Ionicons name="document-text" size={19} color={colors.green} /><Text style={[styles.linkText, { color: colors.green }]}>Gizlilik Politikası</Text></AnimatedPressable>
              <AnimatedPressable onPress={() => Linking.openURL(ACCOUNT_DELETION_URL)} style={[styles.linkButton, { borderColor: `${colors.cyan}45`, backgroundColor: `${colors.cyan}10` }]}><Ionicons name="open-outline" size={19} color={colors.cyan} /><Text style={[styles.linkText, { color: colors.cyan }]}>Silme Açıklaması</Text></AnimatedPressable>
            </View>

            <GlassCard style={[styles.deletionCard, { borderColor: `${colors.red}40` }]}> 
              <View style={styles.deletionHeader}><View style={[styles.heroIcon, { backgroundColor: `${colors.red}12` }]}><Ionicons name="person-remove" size={26} color={colors.red} /></View><View style={styles.copy}><Text style={[styles.cardTitle, { color: colors.text }]}>Hesabımı silme talebi</Text><Text style={[styles.body, { color: colors.textMuted }]}>{status?.email ?? session.user.email ?? 'Oturumdaki hesap'}</Text></View></View>
              {loading ? <ActivityIndicator color={colors.primary} /> : request ? (
                <View style={[styles.statusBox, { backgroundColor: `${hasActiveRequest ? colors.orange : colors.textMuted}10`, borderColor: `${hasActiveRequest ? colors.orange : colors.textMuted}35` }]}>
                  <Ionicons name={hasActiveRequest ? 'hourglass' : request.status === 'completed' ? 'checkmark-circle' : 'information-circle'} size={21} color={hasActiveRequest ? colors.orange : request.status === 'completed' ? colors.green : colors.textMuted} />
                  <View style={styles.copy}><Text style={[styles.statusTitle, { color: colors.text }]}>{statusLabel[request.status]}</Text><Text style={[styles.body, { color: colors.textMuted }]}>Talep tarihi: {new Date(request.requested_at).toLocaleDateString('tr-TR')}{request.admin_note ? ` • ${request.admin_note}` : ''}</Text></View>
                </View>
              ) : <Text style={[styles.body, { color: colors.textMuted }]}>Bu hesap için aktif silme talebi bulunmuyor.</Text>}
              {hasActiveRequest ? <PrimaryButton title="Silme Talebini İptal Et" onPress={cancelDeletionRequest} loading={submitting} secondary /> : <PrimaryButton title="Hesap Silme Talebi Oluştur" onPress={createDeletionRequest} loading={submitting} />}
              <Text style={[styles.footnote, { color: colors.textMuted }]}>Destek: draborneagle@gmail.com</Text>
            </GlassCard>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

function PrivacySection({ icon, title, accent, items }: { icon: keyof typeof Ionicons.glyphMap; title: string; accent: string; items: string[] }) {
  const { colors } = useTheme();
  return <GlassCard style={styles.section}><View style={styles.sectionHeader}><View style={[styles.sectionIcon, { backgroundColor: `${accent}14` }]}><Ionicons name={icon} size={22} color={accent} /></View><Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text></View>{items.map((item) => <View key={item} style={styles.item}><Ionicons name="checkmark-circle" size={17} color={accent} /><Text style={[styles.itemText, { color: colors.textMuted }]}>{item}</Text></View>)}</GlassCard>;
}

const styles = StyleSheet.create({
  floatingButton: { position: 'absolute', zIndex: 80, top: 46, right: 13, width: 58, height: 58, borderRadius: 20, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.4, shadowRadius: 15, shadowOffset: { width: 0, height: 7 }, elevation: 16 },
  modal: { flex: 1 },
  header: { minHeight: 86, paddingHorizontal: 18, paddingTop: 22, paddingBottom: 12, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 11 },
  headerIcon: { width: 56, height: 56, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  title: { fontSize: 22, fontWeight: '900' },
  subtitle: { fontSize: 12.5, marginTop: 3 },
  close: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 18, paddingBottom: 42, gap: 13 },
  heroCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  heroIcon: { width: 50, height: 50, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '900' },
  body: { fontSize: 12.5, lineHeight: 18, marginTop: 4 },
  section: { gap: 9 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 2 },
  sectionIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '900' },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  itemText: { flex: 1, fontSize: 12.5, lineHeight: 18 },
  linksRow: { flexDirection: 'row', gap: 8 },
  linkButton: { flex: 1, minHeight: 54, borderWidth: 1, borderRadius: 17, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  linkText: { fontSize: 12, fontWeight: '900', textAlign: 'center' },
  deletionCard: { gap: 12, borderWidth: 1 },
  deletionHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  statusBox: { minHeight: 68, borderWidth: 1, borderRadius: 17, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 9 },
  statusTitle: { fontSize: 13.5, fontWeight: '900' },
  footnote: { fontSize: 11.5, textAlign: 'center' },
});
