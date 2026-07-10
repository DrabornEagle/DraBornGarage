import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { FormField } from '../components/FormField';
import { GarageIcon3D } from '../components/GarageIcon3D';
import { GarageReveal } from '../components/GarageMotion';
import { GlassCard } from '../components/GlassCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { StatusPill, statusLabels } from '../components/StatusPill';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { money, shortDate } from '../lib/format';
import { supabase } from '../lib/supabase';
import { PaymentMethod, PriceType, WorkOrderListItem, WorkOrderStatus } from '../types';

type Filter = 'all' | 'queue' | 'active' | 'parts' | 'ready';
const QUEUE: WorkOrderStatus[] = ['opened', 'received', 'queued', 'waiting'];
const ACTIVE: WorkOrderStatus[] = ['precheck', 'price_entered', 'approval_waiting', 'repair_started', 'extra_approval_waiting', 'testing', 'in_progress'];
const READY: WorkOrderStatus[] = ['ready', 'completed', 'delivered'];

export function WorkOrdersScreen({ onNewOrder }: { onNewOrder: () => void }) {
  const { colors } = useTheme();
  const { workshop, membership } = useAuth();
  const apprentice = membership?.role === 'apprentice';
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!workshop || !membership) return;
    if (apprentice) {
      const { data, error } = await supabase.rpc('get_apprentice_queue', { p_workshop_id: workshop.id });
      if (error) Alert.alert('Atölye sırası alınamadı', error.message);
      setOrders(data ?? []);
      return;
    }
    let query = supabase.from('work_orders').select('id,status,payment_status,service_type,queue_position,complaint,total_amount,amount_received,arrived_at,assigned_mechanic_id,customer:customers(full_name),motorcycle:motorcycles(brand,model,plate),mechanic:profiles!work_orders_assigned_mechanic_id_fkey(full_name)').eq('workshop_id', workshop.id).order('queue_position').order('arrived_at', { ascending: false });
    if (membership.role === 'mechanic') query = query.eq('assigned_mechanic_id', membership.user_id);
    const { data, error } = await query;
    if (error) Alert.alert('Servis kayıtları alınamadı', error.message);
    setOrders((data as unknown as WorkOrderListItem[]) ?? []);
  }, [workshop, membership, apprentice]);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => ({
    all: orders.length,
    queue: orders.filter((o) => QUEUE.includes(o.status)).length,
    active: orders.filter((o) => ACTIVE.includes(o.status)).length,
    parts: orders.filter((o) => o.status === 'parts_waiting').length,
    ready: orders.filter((o) => READY.includes(o.status)).length,
  }), [orders]);

  const visible = useMemo(() => orders.filter((o) => filter === 'all' || (filter === 'queue' && QUEUE.includes(o.status)) || (filter === 'active' && ACTIVE.includes(o.status)) || (filter === 'parts' && o.status === 'parts_waiting') || (filter === 'ready' && READY.includes(o.status))), [orders, filter]);

  if (selected) return <WorkOrderDetail orderId={selected} apprentice={apprentice} onBack={() => { setSelected(null); load(); }} />;
  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  const filterItems: { key: Filter; label: string; icon: string; accent: string }[] = [
    { key: 'all', label: 'Tümü', icon: 'view-grid', accent: colors.primary },
    { key: 'queue', label: 'Sırada', icon: 'format-list-numbered', accent: colors.orange },
    { key: 'active', label: 'İşlemde', icon: 'wrench-clock', accent: colors.cyan },
    { key: 'parts', label: 'Parça', icon: 'package-variant', accent: colors.red },
    { key: 'ready', label: 'Hazır', icon: 'check-decagram', accent: colors.green },
  ];

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}>
      <ScreenHeader eyebrow={apprentice ? 'ÇIRAK GÖREV KONSOLU' : 'SERVİS AKIŞ MERKEZİ'} title={apprentice ? 'Atölye Görevleri' : 'İş Emirleri'} subtitle="Motorları sıra, işlem, parça ve teslim durumuna göre yönet." actionIcon={apprentice ? undefined : 'add'} onAction={apprentice ? undefined : onNewOrder} />

      <GarageReveal delay={30}>
        <GlassCard style={styles.summary}>
          <View style={styles.summaryTop}><View style={styles.copy}><Text style={[styles.eyebrow, { color: colors.orange }]}>ATÖLYE CANLI AKIŞI</Text><Text style={[styles.summaryTitle, { color: colors.text }]}>{counts.queue + counts.active + counts.parts} aktif iş</Text><Text style={[styles.sub, { color: colors.textMuted }]}>{counts.queue} sırada • {counts.active} işlemde • {counts.parts} parça bekliyor</Text></View><GarageIcon3D name="wrench-clock" size={68} iconSize={31} accent={colors.orange} accent2={colors.primary} animated /></View>
          <View style={styles.metrics}><Metric label="TOPLAM" value={String(counts.all)} accent={colors.primary2} /><Metric label="HAZIR" value={String(counts.ready)} accent={colors.green} /><Metric label="GÖRÜNEN" value={String(visible.length)} accent={colors.cyan} /></View>
        </GlassCard>
      </GarageReveal>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {filterItems.map((item) => {
          const active = filter === item.key;
          return <AnimatedPressable key={item.key} onPress={() => setFilter(item.key)} style={[styles.filter, { backgroundColor: active ? `${item.accent}13` : colors.cardStrong, borderColor: active ? `${item.accent}60` : colors.border }]}><View style={[styles.filterIcon, { backgroundColor: `${item.accent}16` }]}><MaterialCommunityIcons name={item.icon as any} size={18} color={item.accent} /></View><View style={styles.copy}><Text style={[styles.filterTitle, { color: active ? colors.text : colors.textMuted }]}>{item.label}</Text><Text style={[styles.filterCount, { color: active ? item.accent : colors.textMuted }]}>{counts[item.key]} kayıt</Text></View>{active && <Ionicons name="checkmark-circle" size={17} color={item.accent} />}</AnimatedPressable>;
        })}
      </ScrollView>

      <View style={styles.list}>
        {visible.length === 0 ? <GlassCard style={styles.empty}><MaterialCommunityIcons name="motorbike-off" size={40} color={colors.textMuted} /><Text style={[styles.emptyTitle, { color: colors.text }]}>Bu filtrede iş yok</Text><Text style={[styles.emptyText, { color: colors.textMuted }]}>Yeni servis kaydı oluşturulduğunda burada görünür.</Text>{!apprentice && <PrimaryButton title="Yeni Servis Kaydı" onPress={onNewOrder} />}</GlassCard> : visible.map((order, index) => {
          const accent = order.status === 'parts_waiting' ? colors.red : READY.includes(order.status) ? colors.green : QUEUE.includes(order.status) ? colors.orange : colors.cyan;
          const brand = order.motorcycle?.brand ?? order.brand;
          const model = order.motorcycle?.model ?? order.model;
          const plate = order.motorcycle?.plate ?? order.plate;
          const remaining = Math.max(0, Number(order.total_amount || 0) - Number(order.amount_received || 0));
          return <GarageReveal key={order.id} delay={70 + Math.min(index, 7) * 35}><AnimatedPressable onPress={() => setSelected(order.id)} style={[styles.card, { backgroundColor: colors.cardStrong, borderColor: `${accent}40` }]}><View style={[styles.rail, { backgroundColor: accent }]} /><View style={styles.cardTop}><View style={[styles.queue, { backgroundColor: `${colors.orange}12`, borderColor: `${colors.orange}42` }]}><Text style={[styles.queueLabel, { color: colors.orange }]}>SIRA</Text><Text style={[styles.queueValue, { color: colors.orange }]}>{order.queue_position ?? '-'}</Text></View><GarageIcon3D name="motorbike" size={57} iconSize={27} accent={colors.primary2} accent2={accent} /><View style={styles.copy}><Text style={[styles.title, { color: colors.text }]}>{brand} {model}</Text><Text style={[styles.plate, { color: colors.cyan }]}>{plate || 'PLAKA YOK'}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{order.customer?.full_name || 'Müşteri yok'}{order.mechanic?.full_name ? ` • ${order.mechanic.full_name}` : ''}</Text></View><StatusPill status={order.status} /></View><View style={[styles.complaint, { backgroundColor: `${accent}0B`, borderColor: `${accent}24` }]}><MaterialCommunityIcons name="clipboard-text-outline" size={18} color={accent} /><Text style={[styles.complaintText, { color: colors.textSoft }]} numberOfLines={2}>{order.complaint}</Text></View><View style={styles.progress}>{[0, 1, 2, 3].map((step) => <View key={step} style={[styles.progressPart, { backgroundColor: (QUEUE.includes(order.status) ? step === 0 : order.status === 'parts_waiting' ? step <= 2 : READY.includes(order.status) ? true : step <= 1) ? accent : colors.border }]} />)}</View><View style={styles.bottom}><Small label="SERVİS" value={order.service_type === 'quick' ? 'Hızlı' : order.service_type === 'appointment' ? 'Randevulu' : 'Bırakılan'} /><Small label="GELİŞ" value={shortDate(order.arrived_at)} />{!apprentice && <View style={styles.amount}><Text style={[styles.amountValue, { color: accent }]}>{money(order.total_amount)}</Text><Text style={[styles.payment, { color: remaining ? colors.orange : colors.green }]}>{remaining ? `${money(remaining)} kaldı` : 'Tam ödendi'}</Text></View>}</View></AnimatedPressable></GarageReveal>;
        })}
      </View>
    </ScrollView>
  );
}

function WorkOrderDetail({ orderId, apprentice, onBack }: { orderId: string; apprentice: boolean; onBack: () => void }) {
  const { colors } = useTheme();
  const { membership } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [parts, setParts] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [priceType, setPriceType] = useState<PriceType>('fixed');
  const [fixedPrice, setFixedPrice] = useState('');
  const [estimateMin, setEstimateMin] = useState('');
  const [estimateMax, setEstimateMax] = useState('');
  const [serviceTitle, setServiceTitle] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [partName, setPartName] = useState('');
  const [partQty, setPartQty] = useState('1');
  const [partPrice, setPartPrice] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [o, s, p, pay] = await Promise.all([supabase.from('work_orders').select('*,customer:customers(*),motorcycle:motorcycles(*)').eq('id', orderId).single(), supabase.from('work_order_services').select('*').eq('work_order_id', orderId), supabase.from('work_order_parts').select('*').eq('work_order_id', orderId), supabase.from('payments').select('*').eq('work_order_id', orderId).order('paid_at', { ascending: false })]);
    if (o.error) return Alert.alert('İş emri açılamadı', o.error.message);
    setOrder(o.data); setServices(s.data ?? []); setParts(p.data ?? []); setPayments(pay.data ?? []);
    setPriceType(o.data.price_type ?? 'fixed'); setFixedPrice(o.data.quoted_price ? String(o.data.quoted_price) : ''); setEstimateMin(o.data.estimated_price_min ? String(o.data.estimated_price_min) : ''); setEstimateMax(o.data.estimated_price_max ? String(o.data.estimated_price_max) : '');
  }, [orderId]);
  useEffect(() => { load(); }, [load]);

  const status = async (next: WorkOrderStatus) => { setSaving(true); const { error } = await supabase.rpc('update_work_order_status', { p_work_order_id: orderId, p_status: next }); setSaving(false); if (error) Alert.alert('Durum değiştirilemedi', error.message); else load(); };
  const savePrice = async () => { const fixed = Number(fixedPrice.replace(',', '.')); const min = Number(estimateMin.replace(',', '.')); const max = Number(estimateMax.replace(',', '.')); if (priceType === 'fixed' && fixed <= 0) return Alert.alert('Geçerli fiyat gir'); if (priceType === 'estimated' && (min <= 0 || max < min)) return Alert.alert('Fiyat aralığını kontrol et'); setSaving(true); const { error } = await supabase.from('work_orders').update({ price_type: priceType, quoted_price: priceType === 'fixed' ? fixed : null, estimated_price_min: priceType === 'estimated' ? min : null, estimated_price_max: priceType === 'estimated' ? max : null }).eq('id', orderId); setSaving(false); if (error) Alert.alert('Ücret kaydedilemedi', error.message); else load(); };
  const addService = async () => { if (!serviceTitle.trim() || Number(servicePrice) <= 0) return; await supabase.from('work_order_services').insert({ work_order_id: orderId, mechanic_id: order?.assigned_mechanic_id ?? membership?.user_id, title: serviceTitle.trim(), price: Number(servicePrice), completed: true }); setServiceTitle(''); setServicePrice(''); load(); };
  const addPart = async () => { if (!partName.trim() || Number(partQty) <= 0) return; await supabase.from('work_order_parts').insert({ work_order_id: orderId, mechanic_id: order?.assigned_mechanic_id ?? membership?.user_id, part_name: partName.trim(), quantity: Number(partQty), unit_price: Number(partPrice || 0) }); setPartName(''); setPartQty('1'); setPartPrice(''); load(); };
  const addPayment = async () => { if (Number(paymentAmount) <= 0) return; await supabase.from('payments').insert({ work_order_id: orderId, amount: Number(paymentAmount), payment_method: paymentMethod }); setPaymentAmount(''); load(); };

  if (!order) return <View style={styles.loading}><Text style={{ color: colors.textMuted }}>İş emri yükleniyor…</Text></View>;
  const brand = order.motorcycle?.brand; const model = order.motorcycle?.model; const plate = order.motorcycle?.plate; const remaining = Math.max(0, Number(order.total_amount) - Number(order.amount_received));
  const flow: WorkOrderStatus[] = apprentice ? ['precheck', 'parts_waiting', 'testing'] : ['received', 'queued', 'precheck', 'price_entered', 'repair_started', 'parts_waiting', 'testing', 'ready', 'delivered', 'cancelled'];

  return <ScrollView contentContainerStyle={styles.detail} showsVerticalScrollIndicator={false}><View style={styles.detailHeader}><AnimatedPressable onPress={onBack} style={[styles.back, { backgroundColor: colors.cardStrong, borderColor: colors.border }]}><Ionicons name="arrow-back" size={22} color={colors.text} /></AnimatedPressable><View style={styles.copy}><Text style={[styles.detailTitle, { color: colors.text }]}>{brand} {model}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{plate || 'Plaka yok'} • {order.customer?.full_name}</Text></View><StatusPill status={order.status} /></View><GlassCard style={styles.detailHero}><View style={styles.cardTop}><GarageIcon3D name="motorbike" size={68} iconSize={32} accent={colors.orange} accent2={colors.primary} animated /><View style={styles.copy}><Text style={[styles.eyebrow, { color: colors.orange }]}>{statusLabels[order.status]}</Text><Text style={[styles.detailName, { color: colors.text }]}>{order.complaint}</Text><Text style={[styles.sub, { color: colors.textMuted }]}>Toplam {money(order.total_amount)} • Kalan {money(remaining)}</Text></View></View></GlassCard><Section title="Servis durumu" icon="timeline-clock-outline" /><View style={styles.statusGrid}>{flow.map((item) => <AnimatedPressable key={item} onPress={() => status(item)} style={[styles.statusButton, { backgroundColor: order.status === item ? `${colors.primary}15` : colors.cardStrong, borderColor: order.status === item ? colors.primary : colors.border }]}><MaterialCommunityIcons name="progress-wrench" size={18} color={order.status === item ? colors.primary : colors.textMuted} /><Text style={[styles.statusText, { color: order.status === item ? colors.text : colors.textMuted }]}>{statusLabels[item]}</Text></AnimatedPressable>)}</View>{!apprentice && <><Section title="Ücret" icon="tag-outline" /><GlassCard style={styles.form}><View style={styles.toggle}>{(['fixed', 'estimated'] as PriceType[]).map((item) => <AnimatedPressable key={item} onPress={() => setPriceType(item)} style={[styles.toggleItem, { backgroundColor: priceType === item ? `${colors.primary}15` : colors.surfaceSoft, borderColor: priceType === item ? colors.primary : colors.border }]}><Text style={{ color: priceType === item ? colors.text : colors.textMuted, fontWeight: '900' }}>{item === 'fixed' ? 'Net Fiyat' : 'Tahmini'}</Text></AnimatedPressable>)}</View>{priceType === 'fixed' ? <FormField label="Net fiyat" value={fixedPrice} onChangeText={setFixedPrice} keyboardType="decimal-pad" /> : <View style={styles.two}><View style={styles.copy}><FormField label="En az" value={estimateMin} onChangeText={setEstimateMin} keyboardType="decimal-pad" /></View><View style={styles.copy}><FormField label="En fazla" value={estimateMax} onChangeText={setEstimateMax} keyboardType="decimal-pad" /></View></View>}<PrimaryButton title="Ücreti Kaydet" onPress={savePrice} loading={saving} /></GlassCard><Section title="İşlemler" icon="wrench-outline" /><DataCard items={services.map((x) => ({ title: x.title, meta: 'Tamamlandı', amount: money(x.price) }))} empty="İşlem eklenmedi"><FormField label="İşlem" value={serviceTitle} onChangeText={setServiceTitle} /><FormField label="Tutar" value={servicePrice} onChangeText={setServicePrice} keyboardType="decimal-pad" /><PrimaryButton title="İşlem Ekle" onPress={addService} /></DataCard><Section title="Parçalar" icon="package-variant" /><DataCard items={parts.map((x) => ({ title: x.part_name, meta: `${x.quantity} adet`, amount: money(x.total_price) }))} empty="Parça eklenmedi"><FormField label="Parça" value={partName} onChangeText={setPartName} /><View style={styles.two}><View style={styles.copy}><FormField label="Adet" value={partQty} onChangeText={setPartQty} keyboardType="decimal-pad" /></View><View style={styles.copy}><FormField label="Birim fiyat" value={partPrice} onChangeText={setPartPrice} keyboardType="decimal-pad" /></View></View><PrimaryButton title="Parça Ekle" onPress={addPart} secondary /></DataCard><Section title="Tahsilatlar" icon="cash-multiple" /><DataCard items={payments.map((x) => ({ title: x.payment_method === 'transfer' ? 'IBAN' : 'Nakit', meta: shortDate(x.paid_at), amount: money(x.amount) }))} empty="Tahsilat yok"><View style={styles.toggle}>{(['cash', 'transfer'] as PaymentMethod[]).map((item) => <AnimatedPressable key={item} onPress={() => setPaymentMethod(item)} style={[styles.toggleItem, { backgroundColor: paymentMethod === item ? `${colors.cyan}15` : colors.surfaceSoft, borderColor: paymentMethod === item ? colors.cyan : colors.border }]}><Text style={{ color: paymentMethod === item ? colors.text : colors.textMuted, fontWeight: '900' }}>{item === 'cash' ? 'Nakit' : 'IBAN'}</Text></AnimatedPressable>)}</View><FormField label="Tahsilat tutarı" value={paymentAmount} onChangeText={setPaymentAmount} keyboardType="decimal-pad" /><PrimaryButton title="Tahsilat Kaydet" onPress={addPayment} /></DataCard></>}</ScrollView>;
}

function Metric({ label, value, accent }: { label: string; value: string; accent: string }) { const { colors } = useTheme(); return <View style={[styles.metric, { backgroundColor: `${accent}0D`, borderColor: `${accent}2C` }]}><Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text><Text style={[styles.metricLabel, { color: colors.textMuted }]}>{label}</Text></View>; }
function Small({ label, value }: { label: string; value: string }) { const { colors } = useTheme(); return <View style={styles.small}><Text style={[styles.smallLabel, { color: colors.textMuted }]}>{label}</Text><Text style={[styles.smallValue, { color: colors.text }]}>{value}</Text></View>; }
function Section({ title, icon }: { title: string; icon: string }) { const { colors } = useTheme(); return <View style={styles.section}><View style={[styles.sectionIcon, { backgroundColor: `${colors.orange}14`, borderColor: `${colors.orange}35` }]}><MaterialCommunityIcons name={icon as any} size={19} color={colors.orange} /></View><Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text></View>; }
function DataCard({ items, empty, children }: { items: { title: string; meta: string; amount: string }[]; empty: string; children: React.ReactNode }) { const { colors } = useTheme(); return <GlassCard style={styles.dataCard}>{items.length ? items.map((x, i) => <View key={`${x.title}-${i}`} style={[styles.dataRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}><View style={styles.copy}><Text style={[styles.dataTitle, { color: colors.text }]}>{x.title}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{x.meta}</Text></View><Text style={[styles.dataAmount, { color: colors.green }]}>{x.amount}</Text></View>) : <Text style={[styles.emptyText, { color: colors.textMuted }]}>{empty}</Text>}<View style={[styles.form, { borderTopColor: colors.border }]}>{children}</View></GlassCard>; }

const styles = StyleSheet.create({
  content: { paddingHorizontal: 17, paddingTop: 54, paddingBottom: 118, gap: 15 }, summary: { gap: 13 }, summaryTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, copy: { flex: 1, minWidth: 0 }, eyebrow: { fontSize: 8.5, fontWeight: '900', letterSpacing: 1 }, summaryTitle: { fontSize: 22, fontWeight: '900', marginTop: 5 }, sub: { fontSize: 10.5, lineHeight: 16, marginTop: 4 }, metrics: { flexDirection: 'row', gap: 7 }, metric: { flex: 1, minHeight: 62, borderWidth: 1, borderRadius: 15, padding: 9, justifyContent: 'center' }, metricValue: { fontSize: 18, fontWeight: '900' }, metricLabel: { fontSize: 7, fontWeight: '900', marginTop: 4 }, filters: { gap: 8, paddingRight: 18 }, filter: { width: 132, minHeight: 61, borderWidth: 1, borderRadius: 18, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 7 }, filterIcon: { width: 37, height: 37, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, filterTitle: { fontSize: 10.5, fontWeight: '900' }, filterCount: { fontSize: 7.5, fontWeight: '900', marginTop: 3 }, list: { gap: 10 }, card: { position: 'relative', borderWidth: 1, borderRadius: 21, padding: 12, gap: 10, overflow: 'hidden' }, rail: { position: 'absolute', top: 0, left: 18, right: 18, height: 3, borderRadius: 3 }, cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 }, queue: { width: 41, height: 49, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, queueLabel: { fontSize: 6, fontWeight: '900' }, queueValue: { fontSize: 15, fontWeight: '900' }, title: { fontSize: 14.5, fontWeight: '900' }, plate: { fontSize: 9, fontWeight: '900', marginTop: 3 }, meta: { fontSize: 9, marginTop: 3 }, complaint: { minHeight: 50, borderWidth: 1, borderRadius: 15, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }, complaintText: { flex: 1, fontSize: 11.5, lineHeight: 17 }, progress: { flexDirection: 'row', gap: 5 }, progressPart: { flex: 1, height: 3, borderRadius: 3 }, bottom: { flexDirection: 'row', gap: 9 }, small: { flex: 1 }, smallLabel: { fontSize: 7.5, fontWeight: '900' }, smallValue: { fontSize: 10.5, fontWeight: '900', marginTop: 4 }, amount: { flex: 1.2, alignItems: 'flex-end' }, amountValue: { fontSize: 15, fontWeight: '900' }, payment: { fontSize: 8.5, fontWeight: '900', marginTop: 3 }, empty: { alignItems: 'center', gap: 10, paddingVertical: 25 }, emptyTitle: { fontSize: 17, fontWeight: '900' }, emptyText: { textAlign: 'center', fontSize: 11, lineHeight: 17 }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center' }, detail: { paddingHorizontal: 17, paddingTop: 54, paddingBottom: 118, gap: 15 }, detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 }, back: { width: 46, height: 46, borderWidth: 1, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, detailTitle: { fontSize: 19, fontWeight: '900' }, detailHero: { gap: 10 }, detailName: { fontSize: 14, fontWeight: '900', marginTop: 4 }, section: { flexDirection: 'row', alignItems: 'center', gap: 9 }, sectionIcon: { width: 40, height: 40, borderWidth: 1, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, sectionTitle: { fontSize: 18, fontWeight: '900' }, statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, statusButton: { width: '48.7%', minHeight: 58, borderWidth: 1, borderRadius: 16, padding: 9, flexDirection: 'row', alignItems: 'center', gap: 7 }, statusText: { flex: 1, fontSize: 9.5, fontWeight: '900' }, form: { gap: 11, borderTopWidth: 1, paddingTop: 12 }, toggle: { flexDirection: 'row', gap: 6 }, toggleItem: { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, two: { flexDirection: 'row', gap: 9 }, dataCard: { paddingVertical: 6, paddingHorizontal: 14 }, dataRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 9 }, dataTitle: { fontSize: 12.5, fontWeight: '900' }, dataAmount: { fontSize: 13, fontWeight: '900' },
});
