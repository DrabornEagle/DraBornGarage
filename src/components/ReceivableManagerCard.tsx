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
  const [dueDate, setDueDate] = useState('');
  const [staffNote, setStaffNote] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentNote, setPaymentNote] = useState('');

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
    if (result.error) return Alert.alert('İşlem tamamlanamadı', result.error.message);
    await load();
    await onChanged?.();
    if (success) Alert.alert(success);
  };

  const saveDebt = async () => {
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return Alert.alert('Tarih biçimi', 'Tarihi YYYY-AA-GG biçiminde gir.');
    await run(supabase.rpc('staff_open_receivable', {
      p_work_order_id: orderId,
      p_due_date: dueDate || null,
      p_staff_note: staffNote.trim() || null,
      p_customer_note: customerNote.trim() || null,
    }), detail?.receivable_status === 'open' ? 'Alacak bilgisi güncellendi' : 'Borç / veresiye kaydı açıldı');
  };

  const addPayment = async () => {
    const amount = Number(paymentAmount.replace(',', '.'));
    if (amount <= 0) return Alert.alert('Geçerli tahsilat tutarı gir');
    await run(supabase.rpc('staff_record_payment', {
      p_work_order_id: orderId,
      p_amount: amount,
      p_method: paymentMethod,
      p_note: paymentNote.trim() || null,
      p_paid_at: new Date().toISOString(),
      p_collection_source: detail?.receivable_status === 'open' ? 'receivable' : 'service',
    }), 'Tahsilat kaydedildi');
    setPaymentAmount(''); setPaymentNote('');
  };

  const cancel = () => Alert.alert('Tahsil edilemedi / kapat', 'Kalan tutar geçmişte korunur ve alacak kapatılmış olarak işaretlenir.', [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Kaydı Kapat', style: 'destructive', onPress: () => run(supabase.rpc('staff_cancel_receivable', { p_work_order_id: orderId, p_note: staffNote.trim() || 'Tahsil edilemedi / kapatıldı' }), 'Alacak kapatıldı') },
  ]);

  const reopen = () => run(supabase.rpc('staff_reopen_receivable', { p_work_order_id: orderId, p_due_date: dueDate || null, p_note: 'Servis detayından yeniden açıldı' }), 'Alacak yeniden açıldı');

  if (!detail) return <GlassCard><Text style={{ color: colors.textMuted }}>Finans bilgisi yükleniyor…</Text></GlassCard>;

  const remaining = Number(detail.remaining_amount || 0);
  const isOpen = detail.receivable_status === 'open';
  const statusAccent = detail.receivable_status === 'closed' ? colors.green : detail.receivable_status === 'cancelled' ? colors.red : isOpen ? colors.orange : colors.textMuted;
  const statusText = detail.receivable_status === 'closed' ? 'Tam ödendi' : detail.receivable_status === 'cancelled' ? 'Kapatıldı' : isOpen ? (detail.payment_status === 'partial' ? 'Kısmi ödendi' : 'Borç açık') : 'Borç yazılmadı';

  return <View style={styles.root}>
    <GlassCard style={styles.stack}>
      <View style={styles.header}><View style={[styles.icon, { backgroundColor: `${statusAccent}18` }]}><Ionicons name="wallet" size={23} color={statusAccent} /></View><View style={styles.copy}><Text style={[styles.title, { color: colors.text }]}>Borç / Veresiye ve Tahsilat</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{statusText} • Son ödeme {dateTime(detail.last_payment_at)}</Text></View><Text style={[styles.remaining, { color: remaining > 0 ? statusAccent : colors.green }]}>{money(remaining)}</Text></View>
      <View style={styles.metrics}><Metric label="TOPLAM" value={money(detail.total_amount)} /><Metric label="ÖDENEN" value={money(detail.amount_received)} accent={colors.green} /><Metric label="KALAN" value={money(remaining)} accent={remaining > 0 ? statusAccent : colors.green} /></View>
    </GlassCard>

    {remaining > 0 && <GlassCard style={styles.stack}>
      <FormField label="Ödeme sözü tarihi (YYYY-AA-GG)" value={dueDate} onChangeText={setDueDate} placeholder="2026-07-20" />
      <FormField label="Personel özel notu" value={staffNote} onChangeText={setStaffNote} multiline placeholder="Ödeme sözü ve dahili not" />
      <FormField label="Müşterinin göreceği ödeme notu" value={customerNote} onChangeText={setCustomerNote} multiline placeholder="Kalan ödeme bilgisi" />
      <PrimaryButton title={isOpen ? 'Alacak Bilgisini Güncelle' : 'Borç / Veresiye Yaz'} onPress={saveDebt} loading={loading} />
      {(detail.receivable_status === 'cancelled' || detail.receivable_status === 'closed') && <PrimaryButton title="Alacağı Yeniden Aç" onPress={reopen} loading={loading} secondary />}
    </GlassCard>}

    {remaining > 0 && <GlassCard style={styles.stack}>
      <Text style={[styles.formTitle, { color: colors.text }]}>Tahsilat Kaydet</Text>
      <View style={[styles.toggle, { backgroundColor: colors.surfaceSoft }]}>{([['cash','Nakit'],['transfer','IBAN']] as [PaymentMethod,string][]).map(([value,label]) => <PrimaryChoice key={value} active={paymentMethod === value} label={label} onPress={() => setPaymentMethod(value)} />)}</View>
      <FormField label="Tahsilat tutarı" value={paymentAmount} onChangeText={setPaymentAmount} keyboardType="decimal-pad" placeholder={String(remaining)} />
      <FormField label="Tahsilat notu (opsiyonel)" value={paymentNote} onChangeText={setPaymentNote} />
      <PrimaryButton title="Tahsilatı Kaydet" onPress={addPayment} loading={loading} />
      {isOpen && <PrimaryButton title="Tahsil Edilemedi / Kaydı Kapat" onPress={cancel} loading={loading} secondary />}
    </GlassCard>}

    <GlassCard style={styles.listCard}>
      <Text style={[styles.formTitle, { color: colors.text }]}>Tahsilat Geçmişi</Text>
      {detail.payments.length === 0 ? <Text style={[styles.empty, { color: colors.textMuted }]}>Henüz tahsilat yok.</Text> : detail.payments.map((item, index) => <View key={item.id} style={[styles.paymentRow, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}><View style={[styles.smallIcon, { backgroundColor: item.payment_method === 'cash' ? `${colors.green}16` : `${colors.cyan}16` }]}><Ionicons name={item.payment_method === 'cash' ? 'cash' : 'business'} size={18} color={item.payment_method === 'cash' ? colors.green : colors.cyan} /></View><View style={styles.copy}><Text style={[styles.paymentTitle, { color: colors.text }]}>{item.payment_method === 'cash' ? 'Nakit' : 'IBAN / Banka transferi'}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{dateTime(item.paid_at)}{item.note ? ` • ${item.note}` : ''}</Text></View><Text style={[styles.paymentValue, { color: colors.green }]}>{money(item.amount)}</Text></View>)}
    </GlassCard>
  </View>;
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: string }) { const { colors } = useTheme(); return <View style={[styles.metric, { backgroundColor: colors.surfaceSoft }]}><Text style={[styles.metricLabel, { color: colors.textMuted }]}>{label}</Text><Text numberOfLines={1} style={[styles.metricValue, { color: accent ?? colors.text }]}>{value}</Text></View>; }

function PrimaryChoice({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) { const { colors } = useTheme(); return <AnimatedPressable onPress={onPress} style={[styles.toggleItem, active && { backgroundColor: colors.cardStrong }]}><Text style={[styles.toggleText, { color: active ? colors.text : colors.textMuted }]}>{label}</Text></AnimatedPressable>; }

const styles = StyleSheet.create({
  root: { gap: 12 },
  stack: { gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, fontWeight: '900' },
  meta: { fontSize: 9.5, lineHeight: 14, marginTop: 3 },
  remaining: { fontSize: 15, fontWeight: '900' },
  metrics: { flexDirection: 'row', gap: 7 },
  metric: { flex: 1, minWidth: 0, borderRadius: 14, padding: 9, minHeight: 62, justifyContent: 'center' },
  metricLabel: { fontSize: 7.5, fontWeight: '900' },
  metricValue: { fontSize: 11.5, fontWeight: '900', marginTop: 5 },
  formTitle: { fontSize: 16, fontWeight: '900' },
  toggle: { flexDirection: 'row', padding: 4, borderRadius: 15 },
  toggleItem: { flex: 1, minHeight: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  toggleText: { fontSize: 10.5, fontWeight: '900' },
  listCard: { gap: 6 },
  paymentRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 8 },
  smallIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  paymentTitle: { fontSize: 12, fontWeight: '900' },
  paymentValue: { fontSize: 13, fontWeight: '900' },
  empty: { fontSize: 11.5, textAlign: 'center', paddingVertical: 14 },
});
