import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { FormField } from '../components/FormField';
import { GlassCard } from '../components/GlassCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { useTheme } from '../context/ThemeContext';
import { money } from '../lib/format';
import { supabase } from '../lib/supabase';
import { WorkOrderStatus } from '../types';

export interface CustomerReadyPaymentDetails {
  mechanic_name?: string | null;
  bank_name?: string | null;
  account_holder?: string | null;
  iban?: string | null;
  transfer_description?: string | null;
  display_context?: 'ready' | 'receivable';
  remaining_amount?: number;
  can_report_payment?: boolean;
  pending_report?: {
    id: string;
    amount: number;
    status: 'pending';
    created_at: string;
  } | null;
}

interface Props {
  orderId: string;
  status: WorkOrderStatus;
  receivableStatus?: string | null;
  remainingAmount: number;
  payment?: CustomerReadyPaymentDetails | null;
  onUpdated?: () => Promise<void> | void;
}

function displayIban(value: string) {
  return value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value));
}

export function CustomerReadyPaymentCard({ orderId, status, receivableStatus, remainingAmount, payment, onUpdated }: Props) {
  const { colors } = useTheme();
  const currentRemaining = Number(payment?.remaining_amount ?? remainingAmount ?? 0);
  const isReceivable = payment?.display_context === 'receivable' || (receivableStatus === 'open' && status !== 'ready');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!payment?.pending_report && currentRemaining > 0) setAmount(String(currentRemaining));
  }, [currentRemaining, payment?.pending_report?.id]);

  if (!payment?.iban || currentRemaining <= 0 || (status !== 'ready' && receivableStatus !== 'open')) return null;

  const reportPayment = () => {
    const value = Number(amount.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) {
      Alert.alert('Geçerli ödeme tutarı gir');
      return;
    }
    if (value > currentRemaining) {
      Alert.alert('Tutar fazla', `Bildireceğin tutar kalan ${money(currentRemaining)} tutarından fazla olamaz.`);
      return;
    }

    Alert.alert(
      'Ödemeyi yaptığını bildir',
      `${money(value)} tutarındaki IBAN ödemesi Ustanın onayına gönderilecek. Borç, Usta onayladıktan sonra güncellenecek.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Ustaya Bildir',
          onPress: async () => {
            setLoading(true);
            const { error } = await supabase.rpc('customer_create_payment_report', {
              p_work_order_id: orderId,
              p_amount: value,
              p_note: note.trim() || null,
            });
            setLoading(false);
            if (error) {
              Alert.alert('Ödeme bildirimi gönderilemedi', error.message);
              return;
            }
            setNote('');
            await onUpdated?.();
            Alert.alert('Ustaya bildirildi', 'Ödeme henüz borçtan düşülmedi. Usta hesabına ulaştığını onayladığında tahsilat kaydedilecek.');
          },
        },
      ],
    );
  };

  return (
    <View style={styles.wrap}>
      <LinearGradient colors={isReceivable ? [colors.orange, colors.red, colors.primary] : [colors.green, colors.cyan, colors.primary]} style={styles.banner}>
        <View style={styles.bannerIcon}><Ionicons name={isReceivable ? 'wallet' : 'checkmark-done'} size={27} color="#fff" /></View>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>{isReceivable ? 'AÇIK VERESİYE BORCU' : 'MOTORUN HAZIR'}</Text>
          <Text style={styles.bannerTitle}>{isReceivable ? 'Usta IBAN bilgisi' : 'Teslim öncesi IBAN bilgisi'}</Text>
          <Text style={styles.bannerText}>{isReceivable ? `Kalan borç ${money(currentRemaining)}` : 'Ödemeyi kendi banka uygulamandan yapabilirsin.'}</Text>
        </View>
        <Ionicons name="card" size={29} color="#fff" />
      </LinearGradient>

      <GlassCard style={[styles.card, { borderColor: `${isReceivable ? colors.orange : colors.green}55` }]}>
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

        {payment.pending_report ? (
          <View style={[styles.pending, { backgroundColor: `${colors.orange}0D`, borderColor: `${colors.orange}3A` }]}>
            <Ionicons name="hourglass" size={22} color={colors.orange} />
            <View style={styles.copy}>
              <Text style={[styles.pendingTitle, { color: colors.text }]}>Usta onayı bekleniyor</Text>
              <Text style={[styles.pendingText, { color: colors.textMuted }]}>{money(payment.pending_report.amount)} • {dateTime(payment.pending_report.created_at)}</Text>
              <Text style={[styles.pendingText, { color: colors.textMuted }]}>Usta onaylayana kadar borç tutarı değişmez.</Text>
            </View>
          </View>
        ) : (
          <View style={styles.reportForm}>
            <Text style={[styles.reportTitle, { color: colors.text }]}>IBAN'a ödeme yaptıysan Ustaya bildir</Text>
            <FormField label="Gönderdiğin tutar" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder={String(currentRemaining)} />
            <FormField label="Ödeme notu (opsiyonel)" value={note} onChangeText={setNote} placeholder="Örn. Açıklama kısmına plakayı yazdım" />
            <PrimaryButton title="Ödemeyi Yaptım • Ustaya Bildir" onPress={reportPayment} loading={loading} />
          </View>
        )}

        <View style={[styles.notice, { borderColor: `${colors.orange}35`, backgroundColor: `${colors.orange}0A` }]}>
          <Ionicons name="information-circle" size={20} color={colors.orange} />
          <Text style={[styles.noticeText, { color: colors.textMuted }]}>DraBornGarage ödeme işlemez, para tutmaz ve bankaya bağlanmaz. Bildirim yalnız Ustanın transferi kontrol edip uygulamadaki borcu güncellemesi içindir.</Text>
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
  pending: { borderWidth: 1, borderRadius: 17, padding: 12, marginTop: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  pendingTitle: { fontSize: 14, fontWeight: '900' },
  pendingText: { fontSize: 11.5, lineHeight: 16, marginTop: 3 },
  reportForm: { gap: 11, marginTop: 12 },
  reportTitle: { fontSize: 14.5, fontWeight: '900' },
  notice: { borderWidth: 1, borderRadius: 15, padding: 11, marginTop: 9, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  noticeText: { flex: 1, fontSize: 11.5, lineHeight: 16 },
});
