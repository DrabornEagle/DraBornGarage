import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { GlassCard } from '../components/GlassCard';
import { ScreenHeader } from '../components/ScreenHeader';
import { StatusPill, statusLabels } from '../components/StatusPill';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { money, shortDate } from '../lib/format';
import { supabase } from '../lib/supabase';
import { CustomerServiceRecord, WorkOrderStatus } from '../types';
import { CustomerLinkPanel } from './CustomerLinkPanel';

type Filter = 'all' | 'active' | 'ready' | 'history';
const timeline: WorkOrderStatus[] = ['received', 'queued', 'precheck', 'price_entered', 'approval_waiting', 'repair_started', 'parts_waiting', 'testing', 'ready', 'delivered'];

export function CustomerServicesScreen() {
  const { colors } = useTheme();
  const { customerWorkshop } = useAuth();
  const [items, setItems] = useState<CustomerServiceRecord[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<CustomerServiceRecord | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!customerWorkshop) { setItems([]); return; }
    const { data } = await supabase.rpc('customer_get_services', { p_workshop_id: customerWorkshop.workshop_id });
    setItems((data as CustomerServiceRecord[] | null) ?? []);
  }, [customerWorkshop]);
  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => items.filter((item) => filter === 'all' || (filter === 'active' && !['ready', 'delivered', 'cancelled'].includes(item.status)) || (filter === 'ready' && item.status === 'ready') || (filter === 'history' && ['delivered', 'cancelled'].includes(item.status))), [items, filter]);

  if (selected) return <ServiceDetail item={selected} onBack={() => setSelected(null)} />;
  if (!customerWorkshop) return <ScrollView contentContainerStyle={styles.content}><ScreenHeader eyebrow="SERVİSLERİM" title="Servis Takibi" subtitle="Önce motorunu bir işletmeyle eşleştir." /><CustomerLinkPanel /></ScrollView>;

  return <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} />}>
    <ScreenHeader eyebrow="SERVİS TAKİBİ" title="Servislerim" subtitle={`${customerWorkshop.workshop_name} içindeki aktif ve geçmiş kayıtların.`} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{([['all', 'Tümü'], ['active', 'Aktif'], ['ready', 'Motor Hazır'], ['history', 'Geçmiş']] as [Filter, string][]).map(([value, label]) => <AnimatedPressable key={value} onPress={() => setFilter(value)} style={[styles.filter, { backgroundColor: filter === value ? colors.primary : colors.card, borderColor: filter === value ? colors.primary : colors.border }]}><Text style={[styles.filterText, { color: filter === value ? '#fff' : colors.textMuted }]}>{label}</Text></AnimatedPressable>)}</ScrollView>
    {visible.length === 0 ? <GlassCard style={styles.empty}><Ionicons name="receipt-outline" size={40} color={colors.textMuted} /><Text style={[styles.emptyTitle, { color: colors.text }]}>Servis kaydı yok</Text></GlassCard> : visible.map((item) => <AnimatedPressable key={item.id} onPress={() => setSelected(item)} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={styles.top}><View style={[styles.icon, { backgroundColor: `${colors.primary2}18` }]}><Ionicons name="bicycle" size={24} color={colors.primary2} /></View><View style={styles.copy}><Text style={[styles.title, { color: colors.text }]}>{item.brand} {item.model}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{item.plate} • {shortDate(item.arrived_at)}</Text></View><StatusPill status={item.status} /></View><Text numberOfLines={2} style={[styles.complaint, { color: colors.textSoft }]}>{item.complaint}</Text><View style={styles.moneyRow}><Text style={[styles.amount, { color: colors.text }]}>{money(item.total_amount)}</Text><Text style={[styles.amount, { color: item.remaining_amount > 0 ? colors.orange : colors.green }]}>Kalan {money(item.remaining_amount)}</Text></View></AnimatedPressable>)}
  </ScrollView>;
}

function ServiceDetail({ item, onBack }: { item: CustomerServiceRecord; onBack: () => void }) {
  const { colors } = useTheme();
  const current = timeline.indexOf(item.status);
  return <ScrollView contentContainerStyle={styles.content}>
    <View style={styles.detailHeader}><AnimatedPressable onPress={onBack} style={[styles.back, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="arrow-back" size={22} color={colors.text} /></AnimatedPressable><View style={styles.copy}><Text style={[styles.detailTitle, { color: colors.text }]}>{item.brand} {item.model}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{item.plate} • {item.workshop_name}</Text></View><StatusPill status={item.status} /></View>
    <GlassCard style={styles.summary}><Text style={[styles.summaryTitle, { color: colors.text }]}>{item.complaint}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{shortDate(item.arrived_at)}</Text><View style={styles.priceGrid}><Price label="TOPLAM" value={money(item.total_amount)} /><Price label="ÖDENEN" value={money(item.amount_received)} accent={colors.green} /><Price label="KALAN" value={money(item.remaining_amount)} accent={item.remaining_amount > 0 ? colors.orange : colors.green} /></View></GlassCard>
    <Text style={[styles.sectionTitle, { color: colors.text }]}>Servis Süreci</Text>
    <GlassCard>{timeline.map((status, index) => { const reached = current >= index || item.status === 'delivered'; return <View key={status} style={styles.timelineRow}><View style={[styles.dot, { backgroundColor: reached ? (item.status === status ? colors.orange : colors.green) : colors.surfaceSoft, borderColor: reached ? colors.green : colors.border }]}>{reached && <Ionicons name="checkmark" size={12} color="#fff" />}</View><Text style={[styles.timelineText, { color: reached ? colors.text : colors.textMuted }]}>{statusLabels[status]}</Text></View>; })}</GlassCard>
    <Text style={[styles.sectionTitle, { color: colors.text }]}>İşlem Kalemleri</Text>
    <GlassCard>{item.service_items.length === 0 ? <Text style={[styles.emptyText, { color: colors.textMuted }]}>Henüz işlem kalemi paylaşılmadı.</Text> : item.service_items.map((service, index) => <View key={`${service.title}-${index}`} style={styles.itemRow}><Ionicons name={service.completed ? 'checkmark-circle' : 'time'} size={20} color={service.completed ? colors.green : colors.orange} /><View style={styles.copy}><Text style={[styles.itemTitle, { color: colors.text }]}>{service.title}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{service.completed ? 'Tamamlandı' : 'Devam ediyor'}</Text></View><Text style={[styles.amount, { color: colors.text }]}>{money(service.price)}</Text></View>)}</GlassCard>
  </ScrollView>;
}

function Price({ label, value, accent }: { label: string; value: string; accent?: string }) { const { colors } = useTheme(); return <View style={[styles.price, { backgroundColor: colors.surfaceSoft }]}><Text style={[styles.priceLabel, { color: colors.textMuted }]}>{label}</Text><Text style={[styles.priceValue, { color: accent ?? colors.text }]}>{value}</Text></View>; }

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 56, paddingBottom: 120, gap: 14 }, filters: { gap: 8, paddingRight: 12 }, filter: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 15, paddingVertical: 10 }, filterText: { fontSize: 11, fontWeight: '900' }, card: { borderWidth: 1, borderRadius: 22, padding: 14, gap: 11 }, top: { flexDirection: 'row', alignItems: 'center', gap: 10 }, icon: { width: 45, height: 45, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1, minWidth: 0 }, title: { fontSize: 15, fontWeight: '900' }, meta: { fontSize: 10.5, marginTop: 3 }, complaint: { fontSize: 12, lineHeight: 18 }, moneyRow: { flexDirection: 'row', justifyContent: 'space-between' }, amount: { fontSize: 12, fontWeight: '900' }, empty: { alignItems: 'center', gap: 9, paddingVertical: 30 }, emptyTitle: { fontSize: 17, fontWeight: '900' }, detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 }, back: { width: 45, height: 45, borderWidth: 1, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, detailTitle: { fontSize: 20, fontWeight: '900' }, summary: { gap: 9 }, summaryTitle: { fontSize: 16, fontWeight: '900' }, priceGrid: { flexDirection: 'row', gap: 7 }, price: { flex: 1, minHeight: 65, borderRadius: 14, padding: 10, justifyContent: 'center' }, priceLabel: { fontSize: 8, fontWeight: '900' }, priceValue: { fontSize: 12, fontWeight: '900', marginTop: 4 }, sectionTitle: { fontSize: 18, fontWeight: '900', marginTop: 4 }, timelineRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10 }, dot: { width: 23, height: 23, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, timelineText: { fontSize: 12, fontWeight: '800' }, itemRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 9 }, itemTitle: { fontSize: 12, fontWeight: '900' }, emptyText: { fontSize: 12, textAlign: 'center', paddingVertical: 12 },
});
