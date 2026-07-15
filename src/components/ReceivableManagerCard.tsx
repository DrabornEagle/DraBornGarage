import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';
import { FormField } from './FormField';
import { GlassCard } from './GlassCard';
import { PrimaryButton } from './PrimaryButton';
import { useTheme } from '../context/ThemeContext';
import { money } from '../lib/format';
import { supabase } from '../lib/supabase';

type PaymentMethod = 'cash' | 'transfer';
type CollectionChoice = PaymentMethod | 'debt';
type ReceivableStatus = 'not_set' | 'open' | 'closed' | 'cancelled';

interface Detail {
  work_order_id: string;
  total_amount: number;
  amount_received: number;
  remaining_amount: number;
  payment_status: string;
  receivable_status: ReceivableStatus;
  debt_promised_date?: string | null;
  debt_written_at?: string | null;
  debt_closed_at?: string | null;
  last_payment_at?: string | null;
  debt_note?: string | null;
  debt_customer_note?: string | null;
  payments: { id: string; amount: number; payment_method: PaymentMethod; note?: string | null; paid_at: string }[];
}

function dateTime(value?: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export function ReceivableManagerCard({ orderId, onChanged }: { orderId: string; onChanged?: () => void | Promise<void> }) {
  const { colors } = useTheme();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);
  const [collectionChoice, setCollectionChoice] = useState<CollectionChoice>('cash');
  const [dueDate, setDueDate] = useState('');
  const [staffNote, setStaffNote] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [debtAmount, setDebtAmount] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('staff_get_receivable_detail', { p_work_order_id: orderId });
    if (error) return Alert.alert('Finans bilgisi alınamadı', error.message);
    const next = data as Detail;
    setDetail(next);
    setDueDate(next.debt_promised_date ?? '');
    setStaffNote(next.debt_note ?? '');
    setCustomerNote(next.debt_customer_note ?? '');
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  const run = async (promise: PromiseLike<{ error: any }>, success?: string) => {
    setLoading(true);
    const result = await promise;
    setLoading(false);
    if (result.error) {
      Alert.alert('İşlem tamamlanamadı', result.error.message);
      return false;
    }
    await load();
    await onChanged?.();
    if (success) Alert.alert(success);
    return true;
  };

  const saveDebt = async () => {
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return Alert.alert('Tarih biçimi', 'Tarihi YYYY-AA-GG biçiminde gir.');
    const needsInitialCharge = Number(detail?.total_amount || 0) <= 0;
    const amount = Number(debtAmount.replace(',', '.'));
    if (needsInitialCharge && amount <= 0) return Alert.alert('Borç tutarı gerekli', 'Ücret girilmediği için borç tutarı Net Fiyat olarak kaydedilecek.');
    const saved = await run(supabase.rpc('staff_open_receivable', {
      p_work_order_id: orderId,
      p_due_date: dueDate || null,
      p_staff_note: staffNote.trim() || null,
      p_customer_note: customerNote.trim() || null,
      p_amount: needsInitialCharge ? amount : null,
    }), detail?.receivable_status === 'open' ? 'Alacak bilgisi güncellendi ve motosiklet teslim edildi' : 'Borç / veresiye kaydı açıldı ve motosiklet teslim edildi');
    if (saved) { setCollectionChoice('debt'); setDebtAmount(''); }
  };

  const addPayment = async () => {
    const amount = Number(paymentAmount.replace(',', '.'));
    if (amount <= 0) return Alert.alert('Geçerli tahsilat tutarı gir');
    if (collectionChoice === 'debt') return;
    const saved = await run(supabase.rpc('staff_record_payment', {
      p_work_order_id: orderId,
      p_amount: amount,
      p_method: collectionChoice,
      p_note: paymentNote.trim() || null,
      p_paid_at: new Date().toISOString(),
      p_collection_source: detail?.receivable_status === 'open' ? 'receivable' : 'service',
    }), 'Tahsilat kaydedildi ve motosiklet teslim edildi');
    if (saved) {
      setPaymentAmount('');
      setPaymentNote('');
    }
  };

  const cancel = () => Alert.alert('Tahsil edilemedi / kapat', 'Kalan tutar geçmişte korunur ve alacak kapatılmış olarak işaretlenir.', [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Kaydı Kapat', style: 'destructive', onPress: () => run(supabase.rpc('staff_cancel_receivable', { p_work_order_id: orderId, p_note: staffNote.trim() || 'Tahsil edilemedi / kapatıldı' }), 'Alacak kapatıldı') },
  ]);

  const reopen = () => run(supabase.rpc('staff_reopen_receivable', { p_work_order_id: orderId, p_due_date: dueDate || null, p_note: 'Servis detayından yeniden açıldı' }), 'Alacak yeniden açıldı');

  if (!detail) return <GlassCard><Text style={{ color: colors.textMuted }}>Finans bilgisi yükleniyor…</Text></GlassCard>;

  const remaining = Number(detail.remaining_amount || 0);
  const needsInitialCharge = Number(detail.total_amount || 0) <= 0;
  const isOpen = detail.receivable_status === 'open';
  const statusAccent = detail.receivable_status === 'closed' ? colors.green : detail.receivable_status === 'cancelled' ? colors.red : isOpen ? colors.orange : colors.textMuted;
  const statusText = detail.receivable_status === 'closed' ? 'Tam ödendi' : detail.receivable_status === 'cancelled' ? 'Kapatıldı' : isOpen ? (detail.payment_status === 'partial' ? 'Kısmi ödendi' : 'Borç açık') : 'Borç yazılmadı';
  const paymentMethod = collectionChoice === 'transfer' ? 'transfer' : 'cash';
  const paymentAccent = paymentMethod === 'cash' ? colors.green : colors.cyan;
  const paymentTitle = paymentMethod === 'cash' ? 'Nakit Tahsilat' : 'IBAN Tahsilatı';

  return <View style={styles.root}>
    <GlassCard style={styles.summaryCard}>
      <View style={styles.summaryHeader}>
        <View style={[styles.summaryIcon, { backgroundColor: `${colors.green}18`, borderColor: `${colors.green}40` }]}><Ionicons name="wallet" size={25} color={colors.green} /></View>
        <View style={styles.copy}><Text style={[styles.summaryTitle, { color: colors.text }]}>Tahsilat Kaydet</Text><Text style={[styles.summaryMeta, { color: colors.textMuted }]}>Nakit, IBAN veya Borç seçerek teslimat finansını tamamla.</Text></View>
        <View style={[styles.remainingPill, { backgroundColor: `${remaining > 0 ? colors.orange : colors.green}14`, borderColor: `${remaining > 0 ? colors.orange : colors.green}42` }]}><Text style={[styles.remainingPillLabel, { color: remaining > 0 ? colors.orange : colors.green }]}>KALAN</Text><Text style={[styles.remainingPillValue, { color: remaining > 0 ? colors.orange : colors.green }]}>{money(remaining)}</Text></View>
      </View>
      <View style={styles.metrics}><Metric label="TOPLAM" value={money(detail.total_amount)} icon="receipt" /><Metric label="ÖDENEN" value={money(detail.amount_received)} accent={colors.green} icon="checkmark-circle" /><Metric label="KALAN" value={money(remaining)} accent={remaining > 0 ? colors.orange : colors.green} icon="hourglass" /></View>
    </GlassCard>

    {(remaining > 0 || needsInitialCharge) ? <>
      <View style={styles.methodGrid}>
        <MethodChoice value="cash" active={collectionChoice === 'cash'} label="NAKİT" subtitle="Kasadan tahsil" icon="cash" accent={colors.green} onPress={() => setCollectionChoice('cash')} />
        <MethodChoice value="transfer" active={collectionChoice === 'transfer'} label="IBAN" subtitle="Banka transferi" icon="business" accent={colors.cyan} onPress={() => setCollectionChoice('transfer')} />
        <MethodChoice value="debt" active={collectionChoice === 'debt'} label="BORÇ" subtitle="Veresiye yaz" icon="time" accent={colors.orange} onPress={() => setCollectionChoice('debt')} />
      </View>

      {collectionChoice !== 'debt' && <GlassCard style={[styles.formCard, { borderColor: `${paymentAccent}42` }]}>
        <View style={styles.formHeader}>
          <View style={[styles.formIcon, { backgroundColor: `${paymentAccent}16` }]}><Ionicons name={paymentMethod === 'cash' ? 'cash' : 'business'} size={23} color={paymentAccent} /></View>
          <View style={styles.copy}><Text style={[styles.formTitle, { color: colors.text }]}>{paymentTitle}</Text><Text style={[styles.formSubtitle, { color: colors.textMuted }]}>Kaydedildiğinde motosiklet otomatik olarak Teslim Edildi olur.</Text></View>
          <Text style={[styles.formAmount, { color: paymentAccent }]}>{money(remaining)}</Text>
        </View>
        <View style={[styles.inlineNotice, { backgroundColor: `${paymentAccent}0D`, borderColor: `${paymentAccent}30` }]}><Ionicons name="information-circle" size={18} color={paymentAccent} /><Text style={[styles.inlineNoticeText, { color: colors.textMuted }]}>{needsInitialCharge ? 'Önceden ücret girilmedi. Yazdığın tahsilat tutarı otomatik olarak Net Fiyat kabul edilir.' : 'Ödeme tutarı kalan borçtan fazla olamaz. Kısmi ödeme de kaydedilebilir.'}</Text></View>
        <FormField label="Tahsilat tutarı" value={paymentAmount} onChangeText={setPaymentAmount} keyboardType="decimal-pad" placeholder={needsInitialCharge ? 'Net fiyat olacak tutar' : String(remaining)} />
        <FormField label="Tahsilat notu (opsiyonel)" value={paymentNote} onChangeText={setPaymentNote} placeholder={paymentMethod === 'cash' ? 'Nakit teslim alındı' : 'IBAN açıklaması veya dekont notu'} />
        <PrimaryButton title={`${paymentMethod === 'cash' ? 'Nakit' : 'IBAN'} Tahsilatını Kaydet`} onPress={addPayment} loading={loading} />
      </GlassCard>}

      {collectionChoice === 'debt' && <>
        <GlassCard style={[styles.debtStatusCard, { borderColor: `${statusAccent}42` }]}>
          <View style={styles.header}><View style={[styles.icon, { backgroundColor: `${statusAccent}18` }]}><Ionicons name="document-text" size={23} color={statusAccent} /></View><View style={styles.copy}><Text style={[styles.title, { color: colors.text }]}>Borç / Veresiye</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{statusText} • Son ödeme {dateTime(detail.last_payment_at)}</Text></View><Text style={[styles.remaining, { color: remaining > 0 ? statusAccent : colors.green }]}>{money(remaining)}</Text></View>
        </GlassCard>
        <GlassCard style={[styles.formCard, { borderColor: `${colors.orange}42` }]}>
          <View style={styles.formHeader}>
            <View style={[styles.formIcon, { backgroundColor: `${colors.orange}16` }]}><Ionicons name="time" size={23} color={colors.orange} /></View>
            <View style={styles.copy}><Text style={[styles.formTitle, { color: colors.text }]}>{isOpen ? 'Borç Bilgisini Güncelle' : 'Borç / Veresiye Yaz'}</Text><Text style={[styles.formSubtitle, { color: colors.textMuted }]}>Kaydedildiğinde motosiklet otomatik olarak Teslim Edildi olur.</Text></View>
          </View>
          {needsInitialCharge && <FormField label="Borç tutarı / Net fiyat" value={debtAmount} onChangeText={setDebtAmount} keyboardType="decimal-pad" placeholder="Örn. 2500" />}
          <FormField label="Ödeme sözü tarihi (YYYY-AA-GG)" value={dueDate} onChangeText={setDueDate} placeholder="2026-07-20" />
          <FormField label="Personel özel notu" value={staffNote} onChangeText={setStaffNote} multiline placeholder="Ödeme sözü ve dahili not" />
          <FormField label="Müşterinin göreceği ödeme notu" value={customerNote} onChangeText={setCustomerNote} multiline placeholder="Kalan ödeme bilgisi" />
          <PrimaryButton title={isOpen ? 'Borç Bilgisini Güncelle' : 'Borç / Veresiye Yaz'} onPress={saveDebt} loading={loading} />
          {(detail.receivable_status === 'cancelled' || detail.receivable_status === 'closed') && <PrimaryButton title="Alacağı Yeniden Aç" onPress={reopen} loading={loading} secondary />}
          {isOpen && <PrimaryButton title="Tahsil Edilemedi / Kaydı Kapat" onPress={cancel} loading={loading} secondary />}
        </GlassCard>
      </>}
    </> : <View style={[styles.completedCard, { borderColor: colors.border, backgroundColor: colors.card }]}><View style={[styles.completedIcon, { backgroundColor: `${colors.green}14` }]}><Ionicons name="checkmark-done" size={28} color={colors.green} /></View><View style={styles.copy}><Text style={[styles.completedTitle, { color: colors.text }]}>Tahsilat tamamlandı</Text><Text style={[styles.completedText, { color: colors.textMuted }]}>Bu servis için açık kalan ödeme bulunmuyor.</Text></View></View>}

    <GlassCard style={styles.listCard}>
      <View style={styles.historyHeader}><View style={[styles.smallIcon, { backgroundColor: `${colors.primary}16` }]}><Ionicons name="time" size={18} color={colors.primary} /></View><View style={styles.copy}><Text style={[styles.formTitle, { color: colors.text }]}>Tahsilat Geçmişi</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{detail.payments.length} ödeme kaydı</Text></View></View>
      {detail.payments.length === 0 ? <Text style={[styles.empty, { color: colors.textMuted }]}>Henüz tahsilat yok.</Text> : detail.payments.map((item, index) => <View key={item.id} style={[styles.paymentRow, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}><View style={[styles.smallIcon, { backgroundColor: item.payment_method === 'cash' ? `${colors.green}16` : `${colors.cyan}16` }]}><Ionicons name={item.payment_method === 'cash' ? 'cash' : 'business'} size={18} color={item.payment_method === 'cash' ? colors.green : colors.cyan} /></View><View style={styles.copy}><Text style={[styles.paymentTitle, { color: colors.text }]}>{item.payment_method === 'cash' ? 'Nakit' : 'IBAN / Banka transferi'}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{dateTime(item.paid_at)}{item.note ? ` • ${item.note}` : ''}</Text></View><Text style={[styles.paymentValue, { color: colors.green }]}>{money(item.amount)}</Text></View>)}
    </GlassCard>
  </View>;
}

function MethodChoice({ active, label, subtitle, icon, accent, onPress }: { value: CollectionChoice; active: boolean; label: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap; accent: string; onPress: () => void }) {
  const { colors } = useTheme();
  return <AnimatedPressable onPress={onPress} style={[styles.methodCard, { backgroundColor: active ? `${accent}16` : colors.card, borderColor: active ? accent : colors.border }]}>
    <View style={[styles.methodIcon, { backgroundColor: `${accent}16` }]}><Ionicons name={icon} size={21} color={accent} /></View>
    <Text style={[styles.methodLabel, { color: active ? accent : colors.text }]}>{label}</Text>
    <Text style={[styles.methodSubtitle, { color: colors.textMuted }]} numberOfLines={1}>{subtitle}</Text>
    <View style={[styles.methodCheck, { backgroundColor: active ? accent : 'transparent', borderColor: active ? accent : colors.border }]}>{active && <Ionicons name="checkmark" size={12} color="#07131B" />}</View>
  </AnimatedPressable>;
}

function Metric({ label, value, accent, icon }: { label: string; value: string; accent?: string; icon: keyof typeof Ionicons.glyphMap }) { const { colors } = useTheme(); const tone = accent ?? colors.text; return <View style={[styles.metric, { backgroundColor: colors.surfaceSoft }]}><View style={styles.metricLabelRow}><Ionicons name={icon} size={13} color={tone} /><Text style={[styles.metricLabel, { color: colors.textMuted }]}>{label}</Text></View><Text numberOfLines={1} style={[styles.metricValue, { color: tone }]}>{value}</Text></View>; }

const styles = StyleSheet.create({
  root: { gap: 13 },
  copy: { flex: 1, minWidth: 0 },
  summaryCard: { gap: 15, padding: 16 },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  summaryIcon: { width: 50, height: 50, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  summaryTitle: { fontSize: 19, fontWeight: '900' },
  summaryMeta: { fontSize: 12.5, lineHeight: 17, marginTop: 3 },
  remainingPill: { minWidth: 82, borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },
  remainingPillLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  remainingPillValue: { fontSize: 15, fontWeight: '900', marginTop: 3 },
  metrics: { flexDirection: 'row', gap: 8 },
  metric: { flex: 1, minWidth: 0, borderRadius: 15, padding: 10, minHeight: 67, justifyContent: 'center' },
  metricLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metricLabel: { fontSize: 9.5, fontWeight: '900' },
  metricValue: { fontSize: 13.5, fontWeight: '900', marginTop: 6 },
  methodGrid: { flexDirection: 'row', gap: 8 },
  methodCard: { flex: 1, minWidth: 0, minHeight: 112, borderWidth: 1, borderRadius: 18, padding: 10, alignItems: 'center', justifyContent: 'center' },
  methodIcon: { width: 39, height: 39, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  methodLabel: { fontSize: 12.5, fontWeight: '900', marginTop: 7 },
  methodSubtitle: { fontSize: 9.5, marginTop: 2, maxWidth: '100%' },
  methodCheck: { position: 'absolute', top: 7, right: 7, width: 18, height: 18, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  formCard: { gap: 13, borderWidth: 1 },
  formHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  formIcon: { width: 47, height: 47, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  formTitle: { fontSize: 17, fontWeight: '900' },
  formSubtitle: { fontSize: 11.5, lineHeight: 16, marginTop: 3 },
  formAmount: { fontSize: 16, fontWeight: '900' },
  inlineNotice: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 11, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 8 },
  inlineNoticeText: { flex: 1, fontSize: 11.5, lineHeight: 16 },
  debtStatusCard: { borderWidth: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '900' },
  meta: { fontSize: 11.5, lineHeight: 15, marginTop: 3 },
  remaining: { fontSize: 16, fontWeight: '900' },
  completedCard: { borderWidth: 1, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 11, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },
  completedIcon: { width: 50, height: 50, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  completedTitle: { fontSize: 16, fontWeight: '900' },
  completedText: { fontSize: 12, lineHeight: 16, marginTop: 3 },
  listCard: { gap: 6 },
  historyHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingBottom: 5 },
  paymentRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 9 },
  smallIcon: { width: 39, height: 39, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  paymentTitle: { fontSize: 13.5, fontWeight: '900' },
  paymentValue: { fontSize: 13.5, fontWeight: '900' },
  empty: { fontSize: 12.5, textAlign: 'center', paddingVertical: 16 },
});
