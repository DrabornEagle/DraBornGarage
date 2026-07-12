import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GlassCard } from '../components/GlassCard';
import { useTheme } from '../context/ThemeContext';
import { money } from '../lib/format';

interface CustomerDebtDetail {
  receivable_status?: 'not_set' | 'open' | 'closed' | 'cancelled';
  debt_promised_date?: string | null;
  debt_written_at?: string | null;
  debt_closed_at?: string | null;
  debt_customer_note?: string | null;
  last_payment_at?: string | null;
  total_amount: number;
  amount_received: number;
  remaining_amount: number;
  payments?: { id: string; amount: number; payment_method: 'cash' | 'transfer'; note?: string | null; paid_at: string }[];
  receivable_notes?: { id: string; note: string; created_at: string }[];
}

function dateTime(value?: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function dateOnly(value?: string | null) {
  if (!value) return 'Tarih belirlenmedi';
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(`${value}T12:00:00`));
}

export function CustomerReceivableCard({ detail }: { detail: CustomerDebtDetail }) {
  const { colors } = useTheme();
  if (!detail.receivable_status || detail.receivable_status === 'not_set') return null;

  const open = detail.receivable_status === 'open';
  const closed = detail.receivable_status === 'closed';
  const accent = closed ? colors.green : detail.receivable_status === 'cancelled' ? colors.textMuted : colors.orange;
  const title = closed ? 'Ödemen tamamlandı' : detail.receivable_status === 'cancelled' ? 'Ödeme kaydı kapatıldı' : 'Kalan ödeme bilgisi';

  return <View style={styles.root}>
    <Text style={[styles.sectionTitle, { color: colors.text }]}>Ödeme ve Borç Bilgisi</Text>
    <GlassCard style={styles.card}>
      <View style={styles.header}><View style={[styles.icon, { backgroundColor: `${accent}18` }]}><Ionicons name={closed ? 'checkmark-done' : 'wallet'} size={25} color={accent} /></View><View style={styles.copy}><Text style={[styles.title, { color: colors.text }]}>{title}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{open ? `Söz tarihi: ${dateOnly(detail.debt_promised_date)}` : `Kapanış: ${dateTime(detail.debt_closed_at)}`}</Text></View><Text style={[styles.remaining, { color: detail.remaining_amount > 0 ? accent : colors.green }]}>{money(detail.remaining_amount)}</Text></View>
      <View style={styles.metrics}><Metric label="TOPLAM" value={money(detail.total_amount)} /><Metric label="ÖDENEN" value={money(detail.amount_received)} accent={colors.green} /><Metric label="KALAN" value={money(detail.remaining_amount)} accent={detail.remaining_amount > 0 ? accent : colors.green} /></View>
      {detail.debt_customer_note && <View style={[styles.message, { backgroundColor: `${colors.cyan}0E`, borderColor: `${colors.cyan}35` }]}><Ionicons name="chatbubble-ellipses" size={18} color={colors.cyan} /><Text style={[styles.messageText, { color: colors.textSoft }]}>{detail.debt_customer_note}</Text></View>}
    </GlassCard>

    {(detail.payments?.length ?? 0) > 0 && <GlassCard style={styles.listCard}><Text style={[styles.listTitle, { color: colors.text }]}>Ödeme Geçmişi</Text>{detail.payments?.map((item, index) => <View key={item.id} style={[styles.row, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}><View style={[styles.smallIcon, { backgroundColor: item.payment_method === 'cash' ? `${colors.green}16` : `${colors.cyan}16` }]}><Ionicons name={item.payment_method === 'cash' ? 'cash' : 'business'} size={17} color={item.payment_method === 'cash' ? colors.green : colors.cyan} /></View><View style={styles.copy}><Text style={[styles.rowTitle, { color: colors.text }]}>{item.payment_method === 'cash' ? 'Nakit' : 'IBAN / Banka transferi'}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{dateTime(item.paid_at)}{item.note ? ` • ${item.note}` : ''}</Text></View><Text style={[styles.rowAmount, { color: colors.green }]}>{money(item.amount)}</Text></View>)}</GlassCard>}

    {(detail.receivable_notes?.length ?? 0) > 0 && <GlassCard style={styles.listCard}><Text style={[styles.listTitle, { color: colors.text }]}>İşletmeden Ödeme Notları</Text>{detail.receivable_notes?.map((item, index) => <View key={item.id} style={[styles.noteRow, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}><Ionicons name="notifications" size={18} color={colors.orange} /><View style={styles.copy}><Text style={[styles.note, { color: colors.text }]}>{item.note}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{dateTime(item.created_at)}</Text></View></View>)}</GlassCard>}
  </View>;
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: string }) { const { colors } = useTheme(); return <View style={[styles.metric, { backgroundColor: colors.surfaceSoft }]}><Text style={[styles.metricLabel, { color: colors.textMuted }]}>{label}</Text><Text numberOfLines={1} style={[styles.metricValue, { color: accent ?? colors.text }]}>{value}</Text></View>; }

const styles = StyleSheet.create({
  root: { gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '900' },
  card: { gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 47, height: 47, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, fontWeight: '900' },
  meta: { fontSize: 11, lineHeight: 14, marginTop: 3 },
  remaining: { fontSize: 15, fontWeight: '900' },
  metrics: { flexDirection: 'row', gap: 7 },
  metric: { flex: 1, minWidth: 0, borderRadius: 14, padding: 9, minHeight: 62, justifyContent: 'center' },
  metricLabel: { fontSize: 9.5, fontWeight: '900' },
  metricValue: { fontSize: 12.5, fontWeight: '900', marginTop: 5 },
  message: { borderWidth: 1, borderRadius: 15, padding: 11, flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  messageText: { flex: 1, fontSize: 12.5, lineHeight: 17 },
  listCard: { gap: 6 },
  listTitle: { fontSize: 15, fontWeight: '900', marginBottom: 2 },
  row: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 8 },
  smallIcon: { width: 37, height: 37, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 13, fontWeight: '900' },
  rowAmount: { fontSize: 12.5, fontWeight: '900' },
  noteRow: { minHeight: 58, flexDirection: 'row', alignItems: 'flex-start', gap: 9, paddingVertical: 9 },
  note: { fontSize: 12.5, lineHeight: 17, fontWeight: '700' },
});
