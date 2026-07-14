import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GlassCard } from '../components/GlassCard';
import { useTheme } from '../context/ThemeContext';
import { WorkOrderStatus } from '../types';

export interface CustomerReadyPaymentDetails {
  mechanic_name?: string | null;
  bank_name?: string | null;
  account_holder?: string | null;
  iban?: string | null;
  transfer_description?: string | null;
}

function displayIban(value: string) {
  return value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
}

export function CustomerReadyPaymentCard({ status, payment }: { status: WorkOrderStatus; payment?: CustomerReadyPaymentDetails | null }) {
  const { colors } = useTheme();
  if (status !== 'ready' || !payment?.iban) return null;

  return (
    <View style={styles.wrap}>
      <LinearGradient colors={[colors.green, colors.cyan, colors.primary]} style={styles.banner}>
        <View style={styles.bannerIcon}><Ionicons name="checkmark-done" size={27} color="#fff" /></View>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>MOTORUN HAZIR</Text>
          <Text style={styles.bannerTitle}>Teslim öncesi IBAN bilgisi</Text>
          <Text style={styles.bannerText}>Ödemeyi kendi banka uygulamandan yapabilirsin.</Text>
        </View>
        <Ionicons name="card" size={29} color="#fff" />
      </LinearGradient>

      <GlassCard style={[styles.card, { borderColor: `${colors.green}55` }]}>
        <PaymentRow icon="person" label="Usta" value={payment.mechanic_name || 'Atanmış Usta'} accent={colors.green} />
        <PaymentRow icon="business" label="Banka" value={payment.bank_name || '-'} accent={colors.cyan} />
        <PaymentRow icon="person-circle" label="Hesap Sahibi" value={payment.account_holder || '-'} accent={colors.primary2} />
        <View style={[styles.ibanBox, { backgroundColor: `${colors.green}0D`, borderColor: `${colors.green}3A` }]}>
          <View style={styles.ibanHeader}>
            <View style={[styles.rowIcon, { backgroundColor: `${colors.green}18` }]}><Ionicons name="card" size={20} color={colors.green} /></View>
            <Text style={[styles.label, { color: colors.textMuted }]}>IBAN</Text>
          </View>
          <Text selectable style={[styles.iban, { color: colors.text }]}>{displayIban(payment.iban)}</Text>
        </View>
        {!!payment.transfer_description && <View style={[styles.description, { backgroundColor: colors.surfaceSoft }]}><Ionicons name="document-text" size={19} color={colors.orange} /><View style={styles.copy}><Text style={[styles.label, { color: colors.textMuted }]}>Transfer açıklaması</Text><Text selectable style={[styles.value, { color: colors.text }]}>{payment.transfer_description}</Text></View></View>}
        <View style={[styles.notice, { borderColor: `${colors.orange}35`, backgroundColor: `${colors.orange}0A` }]}>
          <Ionicons name="information-circle" size={20} color={colors.orange} />
          <Text style={[styles.noticeText, { color: colors.textMuted }]}>DraBornGarage ödeme işlemez, para tutmaz ve bankaya bağlanmaz. Transferi kendi banka uygulamanda kontrol ederek gerçekleştir.</Text>
        </View>
      </GlassCard>
    </View>
  );
}

function PaymentRow({ icon, label, value, accent }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; accent: string }) {
  const { colors } = useTheme();
  return <View style={[styles.row, { borderBottomColor: colors.border }]}><View style={[styles.rowIcon, { backgroundColor: `${accent}15` }]}><Ionicons name={icon} size={20} color={accent} /></View><View style={styles.copy}><Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text><Text selectable style={[styles.value, { color: colors.text }]}>{value}</Text></View></View>;
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  banner: { minHeight: 102, borderRadius: 24, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 11 },
  bannerIcon: { width: 51, height: 51, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.17)', alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  eyebrow: { color: 'rgba(255,255,255,0.76)', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  bannerTitle: { color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 3 },
  bannerText: { color: 'rgba(255,255,255,0.82)', fontSize: 11.5, marginTop: 4 },
  card: { borderWidth: 1, gap: 2 },
  row: { minHeight: 67, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 10.5, fontWeight: '900', letterSpacing: 0.35 },
  value: { fontSize: 13.5, fontWeight: '900', marginTop: 4 },
  ibanBox: { borderWidth: 1, borderRadius: 18, padding: 12, marginVertical: 8, gap: 8 },
  ibanHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  iban: { fontSize: 16, lineHeight: 23, fontWeight: '900', letterSpacing: 0.6 },
  description: { minHeight: 64, borderRadius: 16, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 9 },
  notice: { borderWidth: 1, borderRadius: 15, padding: 11, marginTop: 9, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  noticeText: { flex: 1, fontSize: 11.5, lineHeight: 16 },
});
