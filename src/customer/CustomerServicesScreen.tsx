import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { FormField } from '../components/FormField';
import { GlassCard } from '../components/GlassCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { StatusPill, statusLabels } from '../components/StatusPill';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { money, shortDate } from '../lib/format';
import { supabase } from '../lib/supabase';
import { CustomerServiceDetail, CustomerServiceRecord, ExtraWorkRequest, WorkOrderStatus } from '../types';
import { CustomerLockedState } from './CustomerLockedState';
import { CustomerReceivableCard } from './CustomerReceivableCard';

type Filter = 'all' | 'active' | 'approval' | 'ready' | 'history';
const timeline: WorkOrderStatus[] = ['received', 'queued', 'precheck', 'price_entered', 'approval_waiting', 'repair_started', 'extra_approval_waiting', 'parts_waiting', 'testing', 'ready', 'delivered'];

const methodText: Record<string, string> = {
  app: 'Uygulama', in_person: 'Müşteri yanında', phone: 'Telefon', whatsapp: 'WhatsApp', staff_rejected: 'Personel kaydı',
};

function dateTime(value?: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export function CustomerServicesScreen({ onStartLink }: { onStartLink: () => void }) {
  const { colors } = useTheme();
  const { customerWorkshop } = useAuth();
  const [items, setItems] = useState<CustomerServiceRecord[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!customerWorkshop) { setItems([]); return; }
    const { data, error } = await supabase.rpc('customer_get_services', { p_workshop_id: customerWorkshop.workshop_id });
    if (error) return Alert.alert('Servisler alınamadı', error.message);
    setItems((data as CustomerServiceRecord[] | null) ?? []);
  }, [customerWorkshop]);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => items.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'active') return !['ready', 'delivered', 'cancelled'].includes(item.status);
    if (filter === 'approval') return Number(item.pending_approval_count || 0) > 0;
    if (filter === 'ready') return item.status === 'ready';
    return ['delivered', 'cancelled'].includes(item.status);
  }), [items, filter]);

  if (selectedId) return <ServiceDetail orderId={selectedId} onBack={() => { setSelectedId(null); load(); }} />;
  if (!customerWorkshop) return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}><ScreenHeader eyebrow="SERVİSLERİM" title="Servis Takibi" subtitle="Servis kayıtlarını görmek için önce motorunu eşleştir." /><CustomerLockedState title="Servis takibi henüz kilitli" description="Motorunu eşleştirdiğinde aktif servis, ek işlem onayları, kullanılan parçalar ve servis geçmişin burada görünür." icon="construct" onStartLink={onStartLink} /></ScrollView>;

  return <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} />}>
    <ScreenHeader eyebrow="v0.4 SERVİS TAKİBİ" title="Servislerim" subtitle={`${customerWorkshop.workshop_name} içindeki servis, ek işlem onayı ve parça kayıtların.`} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{([['all', 'Tümü'], ['active', 'Aktif'], ['approval', 'Onay Bekliyor'], ['ready', 'Motor Hazır'], ['history', 'Geçmiş']] as [Filter, string][]).map(([value, label]) => <AnimatedPressable key={value} onPress={() => setFilter(value)} style={[styles.filter, { backgroundColor: filter === value ? colors.primary : colors.card, borderColor: filter === value ? colors.primary : colors.border }]}><Text style={[styles.filterText, { color: filter === value ? '#fff' : colors.textMuted }]}>{label}</Text></AnimatedPressable>)}</ScrollView>
    {visible.length === 0 ? <GlassCard style={styles.empty}><Ionicons name="receipt-outline" size={40} color={colors.textMuted} /><Text style={[styles.emptyTitle, { color: colors.text }]}>Servis kaydı yok</Text></GlassCard> : visible.map((item) => <AnimatedPressable key={item.id} onPress={() => setSelectedId(item.id)} style={[styles.card, { backgroundColor: colors.card, borderColor: Number(item.pending_approval_count || 0) > 0 ? colors.orange : colors.border }]}>
      <View style={styles.top}><View style={[styles.icon, { backgroundColor: Number(item.pending_approval_count || 0) > 0 ? `${colors.orange}18` : `${colors.primary2}18` }]}><Ionicons name={Number(item.pending_approval_count || 0) > 0 ? 'shield-half' : 'bicycle'} size={24} color={Number(item.pending_approval_count || 0) > 0 ? colors.orange : colors.primary2} /></View><View style={styles.copy}><Text style={[styles.title, { color: colors.text }]}>{item.brand} {item.model}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{item.plate} • {shortDate(item.arrived_at)}</Text>{Number(item.pending_approval_count || 0) > 0 && <Text style={[styles.approvalText, { color: colors.orange }]}>{item.pending_approval_count} ek işlem onayın bekliyor</Text>}</View><StatusPill status={item.status} /></View>
      <Text numberOfLines={2} style={[styles.complaint, { color: colors.textSoft }]}>{item.complaint}</Text>
      <View style={styles.moneyRow}><Text style={[styles.amount, { color: colors.text }]}>{money(item.total_amount)}</Text><Text style={[styles.amount, { color: item.remaining_amount > 0 ? colors.orange : colors.green }]}>Kalan {money(item.remaining_amount)}</Text></View>
    </AnimatedPressable>)}
  </ScrollView>;
}

function ServiceDetail({ orderId, onBack }: { orderId: string; onBack: () => void }) {
  const { colors } = useTheme();
  const [detail, setDetail] = useState<CustomerServiceDetail | null>(null);
  const [responseNote, setResponseNote] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('customer_get_service_detail', { p_work_order_id: orderId });
    if (error) return Alert.alert('Servis detayı alınamadı', error.message);
    setDetail(data as CustomerServiceDetail);
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  const respond = (item: ExtraWorkRequest, approve: boolean) => Alert.alert(
    approve ? 'Ek işlemi onaylıyor musun?' : 'Ek işlemi reddediyor musun?',
    `${item.title}\n${money(item.total_amount)}`,
    [
      { text: 'Vazgeç', style: 'cancel' },
      { text: approve ? 'Onayla' : 'Reddet', style: approve ? 'default' : 'destructive', onPress: async () => {
        setLoading(true);
        const { error } = await supabase.rpc('customer_respond_extra_request', { p_extra_request_id: item.id, p_approve: approve, p_note: responseNote.trim() || null });
        setLoading(false);
        if (error) return Alert.alert('Yanıt kaydedilemedi', error.message);
        setResponseNote(''); await load();
        Alert.alert(approve ? 'Ek işlem onaylandı' : 'Ek işlem reddedildi');
      } },
    ],
  );

  if (!detail) return <View style={styles.loading}><Text style={{ color: colors.textMuted }}>Servis detayı yükleniyor…</Text></View>;
  const current = timeline.indexOf(detail.status);
  const pending = detail.extra_requests?.filter((item) => item.status === 'pending') ?? [];

  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.detailHeader}><AnimatedPressable onPress={onBack} style={[styles.back, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="arrow-back" size={22} color={colors.text} /></AnimatedPressable><View style={styles.copy}><Text style={[styles.detailTitle, { color: colors.text }]}>{detail.brand} {detail.model}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{detail.plate} • {detail.workshop_name}</Text></View><StatusPill status={detail.status} /></View>

    {pending.length > 0 && <>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Onay Bekleyen Ek İşlemler</Text>
      {pending.map((item) => <GlassCard key={item.id} style={styles.approvalCard}>
        <View style={styles.top}><View style={[styles.icon, { backgroundColor: `${colors.orange}18` }]}><Ionicons name="shield-half" size={24} color={colors.orange} /></View><View style={styles.copy}><Text style={[styles.title, { color: colors.text }]}>{item.title}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{dateTime(item.created_at)} • Uygulamadan yanıt bekleniyor</Text></View><Text style={[styles.extraAmount, { color: colors.orange }]}>{money(item.total_amount)}</Text></View>
        {!!item.description && <Text style={[styles.complaint, { color: colors.textSoft }]}>{item.description}</Text>}
        <View style={styles.priceGrid}><Price label="EK İŞÇİLİK" value={money(item.labor_amount)} /><Price label="EK PARÇA" value={money(item.parts_amount)} /><Price label="TOPLAM" value={money(item.total_amount)} accent={colors.orange} /></View>
        <FormField label="Yanıt notun (opsiyonel)" value={responseNote} onChangeText={setResponseNote} multiline />
        <View style={styles.responseRow}><View style={styles.flex}><PrimaryButton title="Reddet" onPress={() => respond(item, false)} secondary loading={loading} /></View><View style={styles.flex}><PrimaryButton title="Onayla" onPress={() => respond(item, true)} loading={loading} /></View></View>
      </GlassCard>)}
    </>}

    <GlassCard style={styles.summary}><Text style={[styles.summaryTitle, { color: colors.text }]}>{detail.complaint}</Text>{detail.diagnosis && <Text style={[styles.diagnosis, { color: colors.textSoft }]}>Tespit: {detail.diagnosis}</Text>}<Text style={[styles.meta, { color: colors.textMuted }]}>{shortDate(detail.arrived_at)}</Text><View style={styles.priceGrid}><Price label="İŞÇİLİK" value={money(detail.labor_amount)} /><Price label="PARÇA" value={money(detail.parts_amount)} /><Price label="TOPLAM" value={money(detail.total_amount)} accent={colors.green} /></View><View style={styles.priceGrid}><Price label="ÖDENEN" value={money(detail.amount_received)} accent={colors.green} /><Price label="KALAN" value={money(detail.remaining_amount)} accent={detail.remaining_amount > 0 ? colors.orange : colors.green} /><Price label="HAZIR" value={dateTime(detail.ready_at)} /></View></GlassCard>

    <CustomerReceivableCard detail={detail as any} />

    <Text style={[styles.sectionTitle, { color: colors.text }]}>Servis Süreci</Text>
    <GlassCard>{timeline.map((status, index) => { const reached = current >= index || detail.status === 'delivered'; return <View key={status} style={styles.timelineRow}><View style={[styles.dot, { backgroundColor: reached ? (detail.status === status ? colors.orange : colors.green) : colors.surfaceSoft, borderColor: reached ? colors.green : colors.border }]}>{reached && <Ionicons name="checkmark" size={12} color="#fff" />}</View><View style={styles.copy}><Text style={[styles.timelineText, { color: reached ? colors.text : colors.textMuted }]}>{statusLabels[status]}</Text>{status === 'repair_started' && detail.started_at && <Text style={[styles.meta, { color: colors.textMuted }]}>{dateTime(detail.started_at)}</Text>}{status === 'testing' && detail.testing_started_at && <Text style={[styles.meta, { color: colors.textMuted }]}>{dateTime(detail.testing_started_at)}</Text>}{status === 'ready' && detail.ready_at && <Text style={[styles.meta, { color: colors.textMuted }]}>{dateTime(detail.ready_at)}</Text>}</View></View>; })}</GlassCard>

    <Text style={[styles.sectionTitle, { color: colors.text }]}>Ek İşlem Geçmişi</Text>
    <GlassCard>{detail.extra_requests.length === 0 ? <Empty text="Ek işlem kaydı yok." /> : detail.extra_requests.map((item, index) => <View key={item.id} style={[styles.itemRow, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}><Ionicons name={item.status === 'approved' ? 'checkmark-circle' : item.status === 'pending' ? 'time' : 'close-circle'} size={22} color={item.status === 'approved' ? colors.green : item.status === 'pending' ? colors.orange : colors.red} /><View style={styles.copy}><Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{item.status === 'approved' ? 'Onaylandı' : item.status === 'pending' ? 'Onay bekliyor' : 'Reddedildi'} • {methodText[item.approval_method || 'app']} • {dateTime(item.responded_at || item.created_at)}</Text>{item.response_note && <Text style={[styles.note, { color: colors.textSoft }]}>{item.response_note}</Text>}</View><Text style={[styles.amount, { color: item.status === 'approved' ? colors.green : colors.textMuted }]}>{money(item.total_amount)}</Text></View>)}</GlassCard>

    <Text style={[styles.sectionTitle, { color: colors.text }]}>İşlem Kalemleri</Text>
    <GlassCard>{detail.services.length === 0 ? <Empty text="Henüz işlem kalemi paylaşılmadı." /> : detail.services.map((service, index) => <View key={service.id || `${service.title}-${index}`} style={[styles.itemRow, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}><Ionicons name={service.completed ? 'checkmark-circle' : service.started_at ? 'play-circle' : 'time'} size={21} color={service.completed ? colors.green : service.started_at ? colors.cyan : colors.orange} /><View style={styles.copy}><Text style={[styles.itemTitle, { color: colors.text }]}>{service.title}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{service.completed ? `Tamamlandı • ${dateTime(service.completed_at)}` : service.started_at ? `İşlemde • ${dateTime(service.started_at)}` : 'Planlandı'}</Text>{service.description && <Text style={[styles.note, { color: colors.textSoft }]}>{service.description}</Text>}</View><Text style={[styles.amount, { color: colors.text }]}>{money(service.price)}</Text></View>)}</GlassCard>

    <Text style={[styles.sectionTitle, { color: colors.text }]}>Kullanılan Parçalar</Text>
    <GlassCard>{detail.parts.length === 0 ? <Empty text="Parça kaydı yok." /> : detail.parts.map((part, index) => <View key={part.id} style={[styles.itemRow, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}><Ionicons name="cog" size={21} color={colors.primary2} /><View style={styles.copy}><Text style={[styles.itemTitle, { color: colors.text }]}>{part.part_name}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{Number(part.quantity)} adet × {money(part.unit_price)} • {dateTime(part.used_at)}</Text></View><Text style={[styles.amount, { color: colors.text }]}>{money(part.total_price)}</Text></View>)}</GlassCard>

    {detail.notes.length > 0 && <><Text style={[styles.sectionTitle, { color: colors.text }]}>İşletmeden Notlar</Text><GlassCard>{detail.notes.map((item, index) => <View key={item.id} style={[styles.itemRow, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}><Ionicons name="chatbubble-ellipses" size={21} color={colors.cyan} /><View style={styles.copy}><Text style={[styles.itemTitle, { color: colors.text }]}>{item.note}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{item.author_name || 'İşletme'} • {dateTime(item.created_at)}</Text></View></View>)}</GlassCard></>}
  </ScrollView>;
}

function Price({ label, value, accent }: { label: string; value: string; accent?: string }) { const { colors } = useTheme(); return <View style={[styles.price, { backgroundColor: colors.surfaceSoft }]}><Text style={[styles.priceLabel, { color: colors.textMuted }]}>{label}</Text><Text style={[styles.priceValue, { color: accent ?? colors.text }]}>{value}</Text></View>; }
function Empty({ text }: { text: string }) { const { colors } = useTheme(); return <Text style={[styles.emptyText, { color: colors.textMuted }]}>{text}</Text>; }

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 18, paddingTop: 56, paddingBottom: 32, gap: 14 },
  filters: { gap: 8, paddingRight: 12 },
  filter: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 15, paddingVertical: 10 },
  filterText: { fontSize: 10.5, fontWeight: '900' },
  card: { borderWidth: 1, borderRadius: 22, padding: 14, gap: 11 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 45, height: 45, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, fontWeight: '900' },
  meta: { fontSize: 10, lineHeight: 15, marginTop: 3 },
  approvalText: { fontSize: 9.5, fontWeight: '900', marginTop: 4 },
  complaint: { fontSize: 12, lineHeight: 18 },
  moneyRow: { flexDirection: 'row', justifyContent: 'space-between' },
  amount: { fontSize: 12, fontWeight: '900' },
  empty: { alignItems: 'center', gap: 9, paddingVertical: 30 },
  emptyTitle: { fontSize: 17, fontWeight: '900' },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  back: { width: 45, height: 45, borderWidth: 1, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  detailTitle: { fontSize: 20, fontWeight: '900' },
  approvalCard: { gap: 12 },
  extraAmount: { fontSize: 14, fontWeight: '900' },
  responseRow: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
  summary: { gap: 9 },
  summaryTitle: { fontSize: 16, fontWeight: '900' },
  diagnosis: { fontSize: 12, lineHeight: 18 },
  priceGrid: { flexDirection: 'row', gap: 7 },
  price: { flex: 1, minHeight: 65, borderRadius: 14, padding: 10, justifyContent: 'center' },
  priceLabel: { fontSize: 8, fontWeight: '900' },
  priceValue: { fontSize: 11.5, fontWeight: '900', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '900', marginTop: 4 },
  timelineRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 23, height: 23, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  timelineText: { fontSize: 12, fontWeight: '800' },
  itemRow: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 8 },
  itemTitle: { fontSize: 12, fontWeight: '900' },
  note: { fontSize: 10.5, lineHeight: 15, marginTop: 4 },
  emptyText: { fontSize: 12, textAlign: 'center', paddingVertical: 12 },
});
