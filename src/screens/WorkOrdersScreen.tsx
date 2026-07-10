import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { FormField } from '../components/FormField';
import { GlassCard } from '../components/GlassCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { StatusPill } from '../components/StatusPill';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { money, shortDate } from '../lib/format';
import { supabase } from '../lib/supabase';
import { WorkOrderListItem, WorkOrderStatus } from '../types';

type Filter = 'all' | WorkOrderStatus;

export function WorkOrdersScreen({ onNewOrder }: { onNewOrder: () => void }) {
  const { colors } = useTheme();
  const { workshop, membership } = useAuth();
  const [orders, setOrders] = useState<WorkOrderListItem[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!workshop || !membership) return;
    let query = supabase
      .from('work_orders')
      .select('id,status,payment_status,complaint,total_amount,amount_received,arrived_at,assigned_mechanic_id,customer:customers(full_name,phone),motorcycle:motorcycles(brand,model,plate),mechanic:profiles!work_orders_assigned_mechanic_id_fkey(full_name)')
      .eq('workshop_id', workshop.id)
      .order('arrived_at', { ascending: false });
    if (membership.role === 'mechanic') query = query.eq('assigned_mechanic_id', membership.user_id);
    const { data, error } = await query;
    if (error) Alert.alert('Servis kayıtları alınamadı', error.message);
    setOrders((data as unknown as WorkOrderListItem[]) ?? []);
  }, [workshop, membership]);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => filter === 'all' ? orders : orders.filter((order) => order.status === filter), [orders, filter]);

  if (selectedId) {
    return <WorkOrderDetail orderId={selectedId} onBack={() => { setSelectedId(null); load(); }} />;
  }

  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}>
      <ScreenHeader eyebrow="SERVİS AKIŞI" title="İş Emirleri" subtitle="Bekleyen, işlemde ve tamamlanan motosikletleri yönet." actionIcon="add" onAction={onNewOrder} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {([
          ['all', 'Tümü'],
          ['waiting', 'Bekleyen'],
          ['in_progress', 'İşlemde'],
          ['completed', 'Tamamlandı'],
          ['delivered', 'Teslim'],
        ] as [Filter, string][]).map(([value, label]) => (
          <AnimatedPressable key={value} onPress={() => setFilter(value)} style={[styles.filter, { backgroundColor: filter === value ? colors.primary : colors.card, borderColor: filter === value ? colors.primary : colors.border }]}> 
            <Text style={[styles.filterText, { color: filter === value ? '#fff' : colors.textMuted }]}>{label}</Text>
          </AnimatedPressable>
        ))}
      </ScrollView>

      <View style={styles.list}>
        {visible.length === 0 ? (
          <GlassCard style={styles.empty}>
            <Ionicons name="construct-outline" size={40} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Bu filtrede iş emri yok</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Yeni motosiklet kabulü oluşturarak servis akışını başlat.</Text>
            <PrimaryButton title="Yeni Servis Kaydı" onPress={onNewOrder} />
          </GlassCard>
        ) : visible.map((order) => (
          <AnimatedPressable key={order.id} onPress={() => setSelectedId(order.id)} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <View style={styles.cardTop}>
              <View style={[styles.icon, { backgroundColor: `${colors.primary2}1C` }]}><Ionicons name="bicycle" size={25} color={colors.primary2} /></View>
              <View style={styles.copy}>
                <Text style={[styles.title, { color: colors.text }]}>{order.motorcycle?.brand} {order.motorcycle?.model}</Text>
                <Text style={[styles.meta, { color: colors.textMuted }]}>{order.motorcycle?.plate || 'Plaka yok'} • {order.customer?.full_name}</Text>
              </View>
              <StatusPill status={order.status} />
            </View>
            <Text style={[styles.complaint, { color: colors.textSoft }]} numberOfLines={2}>{order.complaint}</Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.cardBottom}>
              <View>
                <Text style={[styles.smallLabel, { color: colors.textMuted }]}>GELİŞ</Text>
                <Text style={[styles.smallValue, { color: colors.text }]}>{shortDate(order.arrived_at)}</Text>
              </View>
              <View>
                <Text style={[styles.smallLabel, { color: colors.textMuted }]}>USTA</Text>
                <Text style={[styles.smallValue, { color: colors.text }]}>{order.mechanic?.full_name || 'Atanmadı'}</Text>
              </View>
              <View style={styles.amountWrap}>
                <Text style={[styles.amount, { color: colors.green }]}>{money(order.total_amount)}</Text>
                <Text style={[styles.payment, { color: order.payment_status === 'paid' ? colors.green : colors.orange }]}>{order.payment_status === 'paid' ? 'Ödendi' : order.payment_status === 'partial' ? 'Kısmi' : 'Bekliyor'}</Text>
              </View>
            </View>
          </AnimatedPressable>
        ))}
      </View>
    </ScrollView>
  );
}

function WorkOrderDetail({ orderId, onBack }: { orderId: string; onBack: () => void }) {
  const { colors } = useTheme();
  const { membership } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [parts, setParts] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [serviceTitle, setServiceTitle] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [partName, setPartName] = useState('');
  const [partQty, setPartQty] = useState('1');
  const [partPrice, setPartPrice] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [orderResult, servicesResult, partsResult, paymentsResult] = await Promise.all([
      supabase.from('work_orders').select('*,customer:customers(*),motorcycle:motorcycles(*),mechanic:profiles!work_orders_assigned_mechanic_id_fkey(full_name)').eq('id', orderId).single(),
      supabase.from('work_order_services').select('*,mechanic:profiles!work_order_services_mechanic_id_fkey(full_name)').eq('work_order_id', orderId).order('created_at'),
      supabase.from('work_order_parts').select('*').eq('work_order_id', orderId).order('created_at'),
      supabase.from('payments').select('*').eq('work_order_id', orderId).order('paid_at', { ascending: false }),
    ]);
    if (orderResult.error) return Alert.alert('İş emri açılamadı', orderResult.error.message);
    setOrder(orderResult.data);
    setServices(servicesResult.data ?? []);
    setParts(partsResult.data ?? []);
    setPayments(paymentsResult.data ?? []);
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  const changeStatus = async (status: WorkOrderStatus) => {
    setSaving(true);
    const { error } = await supabase.from('work_orders').update({ status }).eq('id', orderId);
    setSaving(false);
    if (error) Alert.alert('Durum değiştirilemedi', error.message); else load();
  };

  const addService = async () => {
    if (!serviceTitle.trim() || Number(servicePrice) <= 0 || !order) return Alert.alert('İşlem adı ve tutarı gerekli');
    setSaving(true);
    const { error } = await supabase.from('work_order_services').insert({
      work_order_id: orderId,
      mechanic_id: order.assigned_mechanic_id ?? membership?.user_id,
      title: serviceTitle.trim(),
      price: Number(servicePrice.replace(',', '.')),
      completed: true,
    });
    setSaving(false);
    if (error) Alert.alert('İşlem eklenemedi', error.message);
    else { setServiceTitle(''); setServicePrice(''); load(); }
  };

  const addPart = async () => {
    if (!partName.trim() || Number(partQty) <= 0 || Number(partPrice) < 0) return Alert.alert('Parça bilgilerini kontrol et');
    setSaving(true);
    const { error } = await supabase.from('work_order_parts').insert({
      work_order_id: orderId,
      mechanic_id: order?.assigned_mechanic_id ?? membership?.user_id,
      part_name: partName.trim(),
      quantity: Number(partQty.replace(',', '.')),
      unit_price: Number(partPrice.replace(',', '.')),
    });
    setSaving(false);
    if (error) Alert.alert('Parça eklenemedi', error.message);
    else { setPartName(''); setPartQty('1'); setPartPrice(''); load(); }
  };

  const addPayment = async () => {
    if (Number(paymentAmount) <= 0) return Alert.alert('Geçerli tahsilat tutarı gir');
    setSaving(true);
    const { error } = await supabase.from('payments').insert({ work_order_id: orderId, amount: Number(paymentAmount.replace(',', '.')), payment_method: 'cash' });
    setSaving(false);
    if (error) Alert.alert('Tahsilat eklenemedi', error.message);
    else { setPaymentAmount(''); load(); }
  };

  if (!order) return <View style={styles.detailLoading}><Text style={{ color: colors.textMuted }}>İş emri yükleniyor…</Text></View>;

  return (
    <ScrollView contentContainerStyle={styles.detailContent}>
      <View style={styles.detailHeader}>
        <AnimatedPressable onPress={onBack} style={[styles.back, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="arrow-back" size={22} color={colors.text} /></AnimatedPressable>
        <View style={styles.detailHeaderCopy}>
          <Text style={[styles.detailTitle, { color: colors.text }]}>{order.motorcycle?.brand} {order.motorcycle?.model}</Text>
          <Text style={[styles.detailMeta, { color: colors.textMuted }]}>{order.customer?.full_name} • {order.motorcycle?.plate || 'Plaka yok'}</Text>
        </View>
        <StatusPill status={order.status} />
      </View>

      <GlassCard style={styles.summaryCard}>
        <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>MÜŞTERİ ŞİKAYETİ / TALEP</Text>
        <Text style={[styles.summaryText, { color: colors.text }]}>{order.complaint}</Text>
        {!!order.diagnosis && <><Text style={[styles.summaryLabel, { color: colors.textMuted }]}>TESPİT</Text><Text style={[styles.summaryText, { color: colors.text }]}>{order.diagnosis}</Text></>}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryNumbers}>
          <View><Text style={[styles.smallLabel, { color: colors.textMuted }]}>İŞÇİLİK</Text><Text style={[styles.number, { color: colors.text }]}>{money(order.labor_amount)}</Text></View>
          <View><Text style={[styles.smallLabel, { color: colors.textMuted }]}>PARÇA</Text><Text style={[styles.number, { color: colors.text }]}>{money(order.parts_amount)}</Text></View>
          <View><Text style={[styles.smallLabel, { color: colors.textMuted }]}>TOPLAM</Text><Text style={[styles.number, { color: colors.green }]}>{money(order.total_amount)}</Text></View>
        </View>
      </GlassCard>

      <View style={styles.actionRow}>
        {order.status === 'waiting' && <View style={styles.actionFlex}><PrimaryButton title="İşleme Başla" onPress={() => changeStatus('in_progress')} loading={saving} /></View>}
        {order.status === 'in_progress' && <View style={styles.actionFlex}><PrimaryButton title="İşi Tamamla" onPress={() => changeStatus('completed')} loading={saving} /></View>}
        {order.status === 'completed' && <View style={styles.actionFlex}><PrimaryButton title="Teslim Edildi" onPress={() => changeStatus('delivered')} loading={saving} /></View>}
      </View>

      <SectionTitle title="Yapılan işlemler" subtitle="Ustanın kişisel toplamına bu kayıtlar eklenir." />
      <GlassCard style={styles.dataCard}>
        {services.length === 0 ? <Text style={[styles.emptyText, { color: colors.textMuted }]}>Henüz işlem eklenmedi.</Text> : services.map((item, index) => (
          <View key={item.id} style={[styles.dataRow, index > 0 && { borderTopColor: colors.border, borderTopWidth: 1 }]}> 
            <View style={styles.dataCopy}><Text style={[styles.dataTitle, { color: colors.text }]}>{item.title}</Text><Text style={[styles.dataMeta, { color: colors.textMuted }]}>{item.mechanic?.full_name || 'Usta'} • Tamamlandı</Text></View>
            <Text style={[styles.dataAmount, { color: colors.green }]}>{money(item.price)}</Text>
          </View>
        ))}
        <View style={[styles.inlineForm, { borderTopColor: colors.border }]}> 
          <FormField label="İşlem" value={serviceTitle} onChangeText={setServiceTitle} placeholder="Yağ değişimi" />
          <FormField label="Tutar" value={servicePrice} onChangeText={setServicePrice} placeholder="750" keyboardType="decimal-pad" />
          <PrimaryButton title="İşlem Ekle" onPress={addService} loading={saving} />
        </View>
      </GlassCard>

      <SectionTitle title="Kullanılan parçalar" subtitle="Parça adı, adet ve müşteriye yansıtılan tutar." />
      <GlassCard style={styles.dataCard}>
        {parts.length === 0 ? <Text style={[styles.emptyText, { color: colors.textMuted }]}>Parça kullanımı eklenmedi.</Text> : parts.map((item, index) => (
          <View key={item.id} style={[styles.dataRow, index > 0 && { borderTopColor: colors.border, borderTopWidth: 1 }]}> 
            <View style={styles.dataCopy}><Text style={[styles.dataTitle, { color: colors.text }]}>{item.part_name}</Text><Text style={[styles.dataMeta, { color: colors.textMuted }]}>{Number(item.quantity)} adet × {money(item.unit_price)}</Text></View>
            <Text style={[styles.dataAmount, { color: colors.text }]}>{money(item.total_price)}</Text>
          </View>
        ))}
        <View style={[styles.inlineForm, { borderTopColor: colors.border }]}> 
          <FormField label="Parça" value={partName} onChangeText={setPartName} placeholder="10W-40 motor yağı" />
          <View style={styles.twoCol}><View style={styles.col}><FormField label="Adet" value={partQty} onChangeText={setPartQty} keyboardType="decimal-pad" /></View><View style={styles.col}><FormField label="Birim fiyat" value={partPrice} onChangeText={setPartPrice} keyboardType="decimal-pad" /></View></View>
          <PrimaryButton title="Parça Ekle" onPress={addPart} loading={saving} secondary />
        </View>
      </GlassCard>

      <SectionTitle title="Tahsilatlar" subtitle={`Alınan ${money(order.amount_received)} • Kalan ${money(Math.max(0, Number(order.total_amount) - Number(order.amount_received)))}`} />
      <GlassCard style={styles.dataCard}>
        {payments.map((item, index) => (
          <View key={item.id} style={[styles.dataRow, index > 0 && { borderTopColor: colors.border, borderTopWidth: 1 }]}> 
            <View style={styles.dataCopy}><Text style={[styles.dataTitle, { color: colors.text }]}>Nakit tahsilat</Text><Text style={[styles.dataMeta, { color: colors.textMuted }]}>{shortDate(item.paid_at)}</Text></View>
            <Text style={[styles.dataAmount, { color: colors.green }]}>{money(item.amount)}</Text>
          </View>
        ))}
        <View style={[styles.inlineForm, { borderTopColor: colors.border }]}> 
          <FormField label="Tahsilat tutarı" value={paymentAmount} onChangeText={setPaymentAmount} placeholder="1000" keyboardType="decimal-pad" />
          <PrimaryButton title="Tahsilat Kaydet" onPress={addPayment} loading={saving} />
        </View>
      </GlassCard>
    </ScrollView>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  const { colors } = useTheme();
  return <View style={styles.sectionTitleWrap}><Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>{subtitle}</Text></View>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 56, paddingBottom: 120, gap: 18 },
  filters: { gap: 9, paddingRight: 18 },
  filter: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 15, paddingVertical: 10 },
  filterText: { fontSize: 12, fontWeight: '900' },
  list: { gap: 11 },
  card: { borderWidth: 1, borderRadius: 23, padding: 15, gap: 12 },
  cardTop: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  icon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  title: { fontSize: 16, fontWeight: '900' },
  meta: { fontSize: 12, marginTop: 3 },
  complaint: { fontSize: 13, lineHeight: 19 },
  divider: { height: 1 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  smallLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  smallValue: { fontSize: 12, fontWeight: '800', marginTop: 4 },
  amountWrap: { alignItems: 'flex-end' },
  amount: { fontSize: 17, fontWeight: '900' },
  payment: { fontSize: 10, fontWeight: '900', marginTop: 3 },
  empty: { alignItems: 'center', gap: 11, paddingVertical: 28 },
  emptyTitle: { fontSize: 18, fontWeight: '900' },
  emptyText: { textAlign: 'center', lineHeight: 20 },
  detailLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  detailContent: { paddingHorizontal: 18, paddingTop: 56, paddingBottom: 120, gap: 16 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  back: { width: 46, height: 46, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  detailHeaderCopy: { flex: 1 },
  detailTitle: { fontSize: 21, fontWeight: '900' },
  detailMeta: { fontSize: 12, marginTop: 3 },
  summaryCard: { gap: 10 },
  summaryLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 0.9, marginTop: 3 },
  summaryText: { fontSize: 14, lineHeight: 21 },
  summaryNumbers: { flexDirection: 'row', justifyContent: 'space-between' },
  number: { fontSize: 17, fontWeight: '900', marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionFlex: { flex: 1 },
  sectionTitleWrap: { marginTop: 5 },
  sectionTitle: { fontSize: 19, fontWeight: '900' },
  sectionSubtitle: { fontSize: 12, marginTop: 4, lineHeight: 17 },
  dataCard: { paddingVertical: 5, paddingHorizontal: 15 },
  dataRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  dataCopy: { flex: 1 },
  dataTitle: { fontSize: 14, fontWeight: '900' },
  dataMeta: { fontSize: 11, marginTop: 4 },
  dataAmount: { fontSize: 15, fontWeight: '900' },
  inlineForm: { borderTopWidth: 1, paddingTop: 15, paddingBottom: 12, gap: 12 },
  twoCol: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },
});
