import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedMotorcycleIcon } from '../components/AnimatedMotorcycleIcon';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { GlassCard } from '../components/GlassCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { StatusPill } from '../components/StatusPill';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { money, shortDate } from '../lib/format';
import { supabase } from '../lib/supabase';
import { WorkOrderListItem, WorkOrderStatus } from '../types';
import { WorkOrderDetailV04 } from './WorkOrderDetailV04';

type Filter = 'all' | 'queue' | 'active' | 'approval' | 'parts' | 'ready' | 'delivered';

const ACTIVE_STATUSES: WorkOrderStatus[] = ['precheck', 'price_entered', 'approval_waiting', 'repair_started', 'extra_approval_waiting', 'testing', 'in_progress'];
const QUEUE_STATUSES: WorkOrderStatus[] = ['opened', 'received', 'queued', 'waiting'];

export function WorkOrdersScreen({ onNewOrder, allowNewOrder }: { onNewOrder: () => void; allowNewOrder: boolean }) {
  const { colors } = useTheme();
  const { workshop, membership } = useAuth();
  const isApprentice = membership?.role === 'apprentice';
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<any | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!workshop || !membership) return;

    if (isApprentice) {
      const { data, error } = await supabase.rpc('get_apprentice_queue', { p_workshop_id: workshop.id });
      if (error) Alert.alert('Atölye sırası alınamadı', error.message);
      setOrders(data ?? []);
      return;
    }

    let query = supabase
      .from('work_orders')
      .select('id,workshop_id,status,payment_status,service_type,customer_waiting_status,queue_position,complaint,total_amount,amount_received,price_type,estimated_price_min,estimated_price_max,quoted_price,arrived_at,assigned_mechanic_id,customer:customers(full_name,phone),motorcycle:motorcycles(brand,model,plate),mechanic:profiles!work_orders_assigned_mechanic_id_fkey(full_name)')
      .eq('workshop_id', workshop.id)
      .order('queue_position', { ascending: true })
      .order('arrived_at', { ascending: false });

    if (membership.role === 'mechanic') query = query.eq('assigned_mechanic_id', membership.user_id);
    const { data, error } = await query;
    if (error) Alert.alert('Servis kayıtları alınamadı', error.message);
    setOrders((data as unknown as WorkOrderListItem[]) ?? []);
  }, [workshop, membership, isApprentice]);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => orders.filter((order) => {
    if (filter === 'all') return true;
    if (filter === 'queue') return QUEUE_STATUSES.includes(order.status);
    if (filter === 'active') return ACTIVE_STATUSES.includes(order.status);
    if (filter === 'approval') return order.status === 'extra_approval_waiting' || order.status === 'approval_waiting';
    if (filter === 'parts') return order.status === 'parts_waiting';
    if (filter === 'ready') return order.status === 'ready' || order.status === 'completed';
    return order.status === 'delivered';
  }), [orders, filter]);

  if (selected) {
    return <WorkOrderDetailV04 orderId={selected.id} apprenticeData={isApprentice ? selected : null} onBack={() => { setSelected(null); load(); }} />;
  }

  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}>
    <ScreenHeader
      eyebrow={isApprentice ? 'KISITLI ÇIRAK PANELİ' : 'v0.4 SERVİS YÖNETİMİ'}
      title={isApprentice ? 'Atölye Görevleri' : 'İş Emirleri'}
      subtitle={isApprentice ? 'Finansal bilgiler gizlidir. Sadece sıra, motor ve görev detayları gösterilir.' : 'Servis, ek işlem onayı, parça, not ve test sürecini tek merkezden yönet.'}
      actionIcon={!isApprentice && allowNewOrder ? 'add' : undefined}
      onAction={!isApprentice && allowNewOrder ? onNewOrder : undefined}
    />

    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
      {([
        ['all', 'Tümü'],
        ['queue', 'Sırada'],
        ['active', 'İşlemde'],
        ['approval', 'Onay Bekliyor'],
        ['parts', 'Parça Bekliyor'],
        ['ready', 'Hazır'],
        ['delivered', 'Teslim'],
      ] as [Filter, string][]).map(([value, label]) => <AnimatedPressable key={value} onPress={() => setFilter(value)} style={[styles.filter, { backgroundColor: filter === value ? colors.primary : colors.card, borderColor: filter === value ? colors.primary : colors.border }]}><Text style={[styles.filterText, { color: filter === value ? '#fff' : colors.textMuted }]}>{label}</Text></AnimatedPressable>)}
    </ScrollView>

    <View style={styles.list}>
      {visible.length === 0 ? <GlassCard style={styles.empty}><Ionicons name="construct-outline" size={40} color={colors.textMuted} /><Text style={[styles.emptyTitle, { color: colors.text }]}>Bu filtrede iş emri yok</Text><Text style={[styles.emptyText, { color: colors.textMuted }]}>Atölye sırasına yeni motor eklendiğinde burada görünecek.</Text>{!isApprentice && allowNewOrder && <PrimaryButton title="Yeni Servis Kaydı" onPress={onNewOrder} />}</GlassCard> : visible.map((order) => {
        const brand = order.motorcycle?.brand ?? order.brand;
        const model = order.motorcycle?.model ?? order.model;
        const plate = order.motorcycle?.plate ?? order.plate;
        return <AnimatedPressable key={order.id} onPress={() => setSelected(order)} style={[styles.card, { backgroundColor: colors.card, borderColor: order.status === 'extra_approval_waiting' ? colors.orange : colors.border }]}>
          <View style={styles.cardTop}>
            <View style={[styles.queueBadge, { backgroundColor: `${colors.orange}20`, borderColor: `${colors.orange}55` }]}><Text style={[styles.queueText, { color: colors.orange }]}>{order.queue_position ?? '-'}</Text></View>
            <View style={[styles.icon, { backgroundColor: order.status === 'extra_approval_waiting' ? `${colors.orange}1C` : `${colors.primary2}1C` }]}>{order.status === 'extra_approval_waiting' ? <Ionicons name="shield-half" size={25} color={colors.orange} /> : <AnimatedMotorcycleIcon size={29} color={colors.primary2} />}</View>
            <View style={styles.copy}><Text style={[styles.title, { color: colors.text }]}>{brand} {model}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{plate || 'Plaka yok'}{order.customer?.full_name ? ` • ${order.customer.full_name}` : ''}</Text>{order.status === 'extra_approval_waiting' && <Text style={[styles.approvalText, { color: colors.orange }]}>Müşteri ek işlem onayı bekleniyor</Text>}</View>
            <StatusPill status={order.status} />
          </View>
          <Text style={[styles.complaint, { color: colors.textSoft }]} numberOfLines={2}>{order.complaint}</Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.cardBottom}><View><Text style={[styles.smallLabel, { color: colors.textMuted }]}>SERVİS</Text><Text style={[styles.smallValue, { color: colors.text }]}>{order.service_type === 'quick' ? 'Hızlı' : order.service_type === 'appointment' ? 'Randevulu' : 'Bırakılan'}</Text></View><View><Text style={[styles.smallLabel, { color: colors.textMuted }]}>GELİŞ</Text><Text style={[styles.smallValue, { color: colors.text }]}>{shortDate(order.arrived_at)}</Text></View>{!isApprentice && <View style={styles.amountWrap}><Text style={[styles.amount, { color: colors.green }]}>{money(order.total_amount)}</Text><Text style={[styles.payment, { color: order.payment_status === 'paid' ? colors.green : colors.orange }]}>{order.payment_status === 'paid' ? 'Tam ödendi' : order.payment_status === 'partial' ? 'Kısmi' : 'Ödenmedi'}</Text></View>}</View>
        </AnimatedPressable>;
      })}
    </View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 56, paddingBottom: 120, gap: 18 },
  filters: { gap: 9, paddingRight: 18 },
  filter: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 15, paddingVertical: 10 },
  filterText: { fontSize: 12.5, fontWeight: '900' },
  list: { gap: 11 },
  card: { borderWidth: 1, borderRadius: 23, padding: 15, gap: 12 },
  cardTop: { flexDirection: 'row', gap: 9, alignItems: 'center' },
  queueBadge: { width: 34, height: 34, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  queueText: { fontSize: 13, fontWeight: '900' },
  icon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, fontWeight: '900' },
  meta: { fontSize: 12.5, marginTop: 3 },
  approvalText: { fontSize: 12, fontWeight: '900', marginTop: 4 },
  complaint: { fontSize: 13, lineHeight: 19 },
  divider: { height: 1 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  smallLabel: { fontSize: 12, fontWeight: '900', letterSpacing: 0.8 },
  smallValue: { fontSize: 13, fontWeight: '800', marginTop: 4 },
  amountWrap: { alignItems: 'flex-end' },
  amount: { fontSize: 17, fontWeight: '900' },
  payment: { fontSize: 12.5, fontWeight: '900', marginTop: 3 },
  empty: { alignItems: 'center', gap: 11, paddingVertical: 28 },
  emptyTitle: { fontSize: 18, fontWeight: '900' },
  emptyText: { textAlign: 'center', lineHeight: 20 },
});
