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
import { PaymentMethod, PriceType, WorkOrderListItem, WorkOrderStatus } from '../types';

type Filter = 'all' | 'queue' | 'active' | 'parts' | 'ready' | 'delivered';

const ACTIVE_STATUSES: WorkOrderStatus[] = ['precheck', 'price_entered', 'approval_waiting', 'repair_started', 'extra_approval_waiting', 'testing', 'in_progress'];
const QUEUE_STATUSES: WorkOrderStatus[] = ['opened', 'received', 'queued', 'waiting'];

export function WorkOrdersScreen({ onNewOrder }: { onNewOrder: () => void }) {
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
    if (filter === 'parts') return order.status === 'parts_waiting';
    if (filter === 'ready') return order.status === 'ready' || order.status === 'completed';
    return order.status === 'delivered';
  }), [orders, filter]);

  if (selected) {
    return <WorkOrderDetail orderId={selected.id} apprenticeData={isApprentice ? selected : null} onBack={() => { setSelected(null); load(); }} />;
  }

  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}>
      <ScreenHeader
        eyebrow={isApprentice ? 'KISITLI ÇIRAK PANELİ' : 'SERVİS VE ATÖLYE SIRASI'}
        title={isApprentice ? 'Atölye Görevleri' : 'İş Emirleri'}
        subtitle={isApprentice ? 'Finansal bilgiler gizlidir. Sadece sıra, motor ve görev detayları gösterilir.' : 'Randevulu, hızlı servis ve bırakılan motorları tek sıradan yönet.'}
        actionIcon={isApprentice ? undefined : 'add'}
        onAction={isApprentice ? undefined : onNewOrder}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {([
          ['all', 'Tümü'],
          ['queue', 'Sırada'],
          ['active', 'İşlemde'],
          ['parts', 'Parça Bekliyor'],
          ['ready', 'Hazır'],
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
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>Atölye sırasına yeni motor eklendiğinde burada görünecek.</Text>
            {!isApprentice && <PrimaryButton title="Yeni Servis Kaydı" onPress={onNewOrder} />}
          </GlassCard>
        ) : visible.map((order) => {
          const brand = order.motorcycle?.brand ?? order.brand;
          const model = order.motorcycle?.model ?? order.model;
          const plate = order.motorcycle?.plate ?? order.plate;
          return (
            <AnimatedPressable key={order.id} onPress={() => setSelected(order)} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
              <View style={styles.cardTop}>
                <View style={[styles.queueBadge, { backgroundColor: `${colors.orange}20`, borderColor: `${colors.orange}55` }]}><Text style={[styles.queueText, { color: colors.orange }]}>{order.queue_position ?? '-'}</Text></View>
                <View style={[styles.icon, { backgroundColor: `${colors.primary2}1C` }]}><Ionicons name="bicycle" size={25} color={colors.primary2} /></View>
                <View style={styles.copy}>
                  <Text style={[styles.title, { color: colors.text }]}>{brand} {model}</Text>
                  <Text style={[styles.meta, { color: colors.textMuted }]}>{plate || 'Plaka yok'}{order.customer?.full_name ? ` • ${order.customer.full_name}` : ''}</Text>
                </View>
                <StatusPill status={order.status} />
              </View>
              <Text style={[styles.complaint, { color: colors.textSoft }]} numberOfLines={2}>{order.complaint}</Text>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.cardBottom}>
                <View><Text style={[styles.smallLabel, { color: colors.textMuted }]}>SERVİS</Text><Text style={[styles.smallValue, { color: colors.text }]}>{order.service_type === 'quick' ? 'Hızlı' : order.service_type === 'appointment' ? 'Randevulu' : 'Bırakılan'}</Text></View>
                <View><Text style={[styles.smallLabel, { color: colors.textMuted }]}>GELİŞ</Text><Text style={[styles.smallValue, { color: colors.text }]}>{shortDate(order.arrived_at)}</Text></View>
                {!isApprentice && <View style={styles.amountWrap}><Text style={[styles.amount, { color: colors.green }]}>{money(order.total_amount)}</Text><Text style={[styles.payment, { color: order.payment_status === 'paid' ? colors.green : colors.orange }]}>{order.payment_status === 'paid' ? 'Tam ödendi' : order.payment_status === 'partial' ? 'Kısmi' : 'Ödenmedi'}</Text></View>}
              </View>
            </AnimatedPressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

function WorkOrderDetail({ orderId, apprenticeData, onBack }: { orderId: string; apprenticeData: any | null; onBack: () => void }) {
  const { colors } = useTheme();
  const { membership } = useAuth();
  const isApprentice = Boolean(apprenticeData);
  const [order, setOrder] = useState<any>(apprenticeData);
  const [services, setServices] = useState<any[]>([]);
  const [parts, setParts] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [serviceTitle, setServiceTitle] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [partName, setPartName] = useState('');
  const [partQty, setPartQty] = useState('1');
  const [partPrice, setPartPrice] = useState('');
  const [priceType, setPriceType] = useState<PriceType>('fixed');
  const [fixedPrice, setFixedPrice] = useState('');
  const [estimateMin, setEstimateMin] = useState('');
  const [estimateMax, setEstimateMax] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (isApprentice) return;
    const [orderResult, servicesResult, partsResult, paymentsResult] = await Promise.all([
      supabase.from('work_orders').select('*,customer:customers(*),motorcycle:motorcycles(*),mechanic:profiles!work_orders_assigned_mechanic_id_fkey(full_name)').eq('id', orderId).single(),
      supabase.from('work_order_services').select('*,mechanic:profiles!work_order_services_mechanic_id_fkey(full_name)').eq('work_order_id', orderId).order('created_at'),
      supabase.from('work_order_parts').select('*').eq('work_order_id', orderId).order('created_at'),
      supabase.from('payments').select('*').eq('work_order_id', orderId).order('paid_at', { ascending: false }),
    ]);
    if (orderResult.error) return Alert.alert('İş emri açılamadı', orderResult.error.message);
    const nextOrder = orderResult.data;
    setOrder(nextOrder);
    setServices(servicesResult.data ?? []);
    setParts(partsResult.data ?? []);
    setPayments(paymentsResult.data ?? []);
    setPriceType(nextOrder.price_type ?? 'fixed');
    setFixedPrice(nextOrder.quoted_price ? String(nextOrder.quoted_price) : '');
    setEstimateMin(nextOrder.estimated_price_min ? String(nextOrder.estimated_price_min) : '');
    setEstimateMax(nextOrder.estimated_price_max ? String(nextOrder.estimated_price_max) : '');
  }, [orderId, isApprentice]);

  useEffect(() => { load(); }, [load]);

  const changeStatus = async (status: WorkOrderStatus) => {
    setSaving(true);
    const { error } = await supabase.rpc('update_work_order_status', { p_work_order_id: orderId, p_status: status });
    setSaving(false);
    if (error) return Alert.alert('Durum değiştirilemedi', error.message);
    if (isApprentice) setOrder((current: any) => ({ ...current, status }));
    else load();
  };

  const savePrice = async () => {
    const fixed = Number(fixedPrice.replace(',', '.'));
    const min = Number(estimateMin.replace(',', '.'));
    const max = Number(estimateMax.replace(',', '.'));
    if (priceType === 'fixed' && fixed <= 0) return Alert.alert('Geçerli net fiyat gir');
    if (priceType === 'estimated' && (min <= 0 || max < min)) return Alert.alert('Tahmini fiyat aralığını kontrol et');
    setSaving(true);
    const { error } = await supabase.from('work_orders').update({
      price_type: priceType,
      quoted_price: priceType === 'fixed' ? fixed : null,
      estimated_price_min: priceType === 'estimated' ? min : null,
      estimated_price_max: priceType === 'estimated' ? max : null,
      status: ['opened', 'received', 'queued', 'waiting', 'precheck'].includes(order.status) ? 'price_entered' : order.status,
    }).eq('id', orderId);
    setSaving(false);
    if (error) return Alert.alert('Ücret kaydedilemedi', error.message);
    await load();
  };

  const addService = async () => {
    if (!serviceTitle.trim() || Number(servicePrice.replace(',', '.')) <= 0 || !order) return Alert.alert('İşlem adı ve tutarı gerekli');
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
    if (!partName.trim() || Number(partQty.replace(',', '.')) <= 0 || Number(partPrice.replace(',', '.')) < 0) return Alert.alert('Parça bilgilerini kontrol et');
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
    if (Number(paymentAmount.replace(',', '.')) <= 0) return Alert.alert('Geçerli tahsilat tutarı gir');
    setSaving(true);
    const { error } = await supabase.from('payments').insert({
      work_order_id: orderId,
      amount: Number(paymentAmount.replace(',', '.')),
      payment_method: paymentMethod,
      note: paymentMethod === 'cash' ? 'Nakit tahsilat' : 'IBAN / banka transferi',
    });
    setSaving(false);
    if (error) Alert.alert('Tahsilat eklenemedi', error.message);
    else { setPaymentAmount(''); load(); }
  };

  if (!order) return <View style={styles.detailLoading}><Text style={{ color: colors.textMuted }}>İş emri yükleniyor…</Text></View>;

  const brand = order.motorcycle?.brand ?? order.brand;
  const model = order.motorcycle?.model ?? order.model;
  const plate = order.motorcycle?.plate ?? order.plate;

  if (isApprentice) {
    const allowedStatuses: WorkOrderStatus[] = ['precheck', 'parts_waiting', 'testing'];
    return (
      <ScrollView contentContainerStyle={styles.detailContent}>
        <DetailHeader onBack={onBack} title={`${brand} ${model}`} subtitle={`${plate || 'Plaka yok'} • Sıra ${order.queue_position ?? '-'}`} status={order.status} />
        <GlassCard style={styles.summaryCard}>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>YAPILACAK İŞ</Text>
          <Text style={[styles.summaryText, { color: colors.text }]}>{order.complaint}</Text>
          {!!order.notes && <><Text style={[styles.summaryLabel, { color: colors.textMuted }]}>ATÖLYE NOTU</Text><Text style={[styles.summaryText, { color: colors.text }]}>{order.notes}</Text></>}
          <View style={[styles.apprenticeNotice, { backgroundColor: `${colors.orange}10`, borderColor: `${colors.orange}35` }]}><Ionicons name="eye-off" size={19} color={colors.orange} /><Text style={[styles.apprenticeText, { color: colors.textMuted }]}>Ücret, tahsilat, müşteri borcu, usta geliri, raporlar ve işletme ayarları Çırak Panelinde gösterilmez.</Text></View>
        </GlassCard>
        <SectionTitle title="Basit servis durumu" subtitle="Çırak yalnız ön kontrol, parça bekliyor ve test ediliyor adımlarını işaretleyebilir." />
        <View style={styles.statusGrid}>{allowedStatuses.map((status) => <AnimatedPressable key={status} onPress={() => changeStatus(status)} style={[styles.statusButton, { backgroundColor: order.status === status ? `${colors.primary}20` : colors.card, borderColor: order.status === status ? colors.primary : colors.border }]}><Text style={[styles.statusButtonText, { color: order.status === status ? colors.primary : colors.text }]}>{statusLabels[status]}</Text></AnimatedPressable>)}</View>
      </ScrollView>
    );
  }

  const statusFlow: WorkOrderStatus[] = ['received', 'queued', 'precheck', 'price_entered', 'approval_waiting', 'repair_started', 'parts_waiting', 'testing', 'ready', 'delivered', 'cancelled'];

  return (
    <ScrollView contentContainerStyle={styles.detailContent}>
      <DetailHeader onBack={onBack} title={`${brand} ${model}`} subtitle={`${order.customer?.full_name} • ${plate || 'Plaka yok'} • Sıra ${order.queue_position ?? '-'}`} status={order.status} />

      <GlassCard style={styles.summaryCard}>
        <View style={styles.serviceTypeRow}><View style={[styles.serviceTypeIcon, { backgroundColor: `${colors.orange}18` }]}><Ionicons name={order.service_type === 'quick' ? 'flash' : order.service_type === 'appointment' ? 'calendar' : 'key'} size={21} color={colors.orange} /></View><View style={styles.copy}><Text style={[styles.dataTitle, { color: colors.text }]}>{order.service_type === 'quick' ? 'Hızlı Servis' : order.service_type === 'appointment' ? 'Randevulu Servis' : 'Bırakılan Motor'}</Text><Text style={[styles.dataMeta, { color: colors.textMuted }]}>{order.customer_waiting_status === 'waiting_shop' ? 'Müşteri dükkânda bekliyor' : order.customer_waiting_status === 'left_vehicle' ? 'Müşteri motoru bırakıp gitti' : order.customer_waiting_status === 'return_later' ? 'Müşteri sonra gelecek' : 'Motoru başkası teslim etti'}</Text></View></View>
        <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>MÜŞTERİ ŞİKAYETİ / YAPILACAK İŞ</Text>
        <Text style={[styles.summaryText, { color: colors.text }]}>{order.complaint}</Text>
        {!!order.diagnosis && <><Text style={[styles.summaryLabel, { color: colors.textMuted }]}>TESPİT</Text><Text style={[styles.summaryText, { color: colors.text }]}>{order.diagnosis}</Text></>}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryNumbers}>
          <View><Text style={[styles.smallLabel, { color: colors.textMuted }]}>İŞÇİLİK</Text><Text style={[styles.number, { color: colors.text }]}>{money(order.labor_amount)}</Text></View>
          <View><Text style={[styles.smallLabel, { color: colors.textMuted }]}>PARÇA</Text><Text style={[styles.number, { color: colors.text }]}>{money(order.parts_amount)}</Text></View>
          <View><Text style={[styles.smallLabel, { color: colors.textMuted }]}>TOPLAM</Text><Text style={[styles.number, { color: colors.green }]}>{money(order.total_amount)}</Text></View>
        </View>
      </GlassCard>

      <SectionTitle title="Servis durumu" subtitle="Tamire Başlandı adımında ücret kontrolü sunucu tarafında zorunludur." />
      <View style={styles.statusGrid}>{statusFlow.map((status) => <AnimatedPressable key={status} onPress={() => changeStatus(status)} style={[styles.statusButton, { backgroundColor: order.status === status ? `${colors.primary}20` : colors.card, borderColor: order.status === status ? colors.primary : colors.border }]}><Text style={[styles.statusButtonText, { color: order.status === status ? colors.primary : colors.text }]}>{statusLabels[status]}</Text></AnimatedPressable>)}</View>

      <SectionTitle title="Ücret / tahmini ücret" subtitle="Ön kontrolde boş kalabilir; tamire başlamadan önce zorunludur." />
      <GlassCard style={styles.inlineForm}>
        <View style={[styles.toggle, { backgroundColor: colors.surfaceSoft }]}>
          {(['fixed', 'estimated'] as PriceType[]).map((value) => <AnimatedPressable key={value} onPress={() => setPriceType(value)} style={[styles.toggleItem, priceType === value && { backgroundColor: colors.cardStrong }]}><Text style={[styles.toggleText, { color: priceType === value ? colors.text : colors.textMuted }]}>{value === 'fixed' ? 'Net Fiyat' : 'Tahmini Fiyat'}</Text></AnimatedPressable>)}
        </View>
        {priceType === 'fixed' ? <FormField label="Net fiyat" value={fixedPrice} onChangeText={setFixedPrice} keyboardType="decimal-pad" placeholder="850" /> : <View style={styles.twoCol}><View style={styles.col}><FormField label="En az" value={estimateMin} onChangeText={setEstimateMin} keyboardType="decimal-pad" /></View><View style={styles.col}><FormField label="En fazla" value={estimateMax} onChangeText={setEstimateMax} keyboardType="decimal-pad" /></View></View>}
        <PrimaryButton title="Ücreti Kaydet" onPress={savePrice} loading={saving} />
      </GlassCard>

      <SectionTitle title="Yapılan işlemler" subtitle="Hangi usta hangi işlem için ne kadar kaydetti bilgisi burada tutulur." />
      <GlassCard style={styles.dataCard}>
        {services.length === 0 ? <Text style={[styles.emptyText, { color: colors.textMuted }]}>Henüz işlem eklenmedi.</Text> : services.map((item, index) => <View key={item.id} style={[styles.dataRow, index > 0 && { borderTopColor: colors.border, borderTopWidth: 1 }]}><View style={styles.dataCopy}><Text style={[styles.dataTitle, { color: colors.text }]}>{item.title}</Text><Text style={[styles.dataMeta, { color: colors.textMuted }]}>{item.mechanic?.full_name || 'Usta'} • {item.completed ? 'Tamamlandı' : 'Planlandı'}</Text></View><Text style={[styles.dataAmount, { color: colors.green }]}>{money(item.price)}</Text></View>)}
        <View style={[styles.inlineForm, { borderTopColor: colors.border }]}><FormField label="İşlem" value={serviceTitle} onChangeText={setServiceTitle} placeholder="Yağ değişimi" /><FormField label="Tutar" value={servicePrice} onChangeText={setServicePrice} placeholder="750" keyboardType="decimal-pad" /><PrimaryButton title="İşlem Ekle" onPress={addService} loading={saving} /></View>
      </GlassCard>

      <SectionTitle title="Kullanılan parçalar" subtitle="Parça adı, adet ve müşteriye yansıtılan fiyat." />
      <GlassCard style={styles.dataCard}>
        {parts.length === 0 ? <Text style={[styles.emptyText, { color: colors.textMuted }]}>Parça kullanımı eklenmedi.</Text> : parts.map((item, index) => <View key={item.id} style={[styles.dataRow, index > 0 && { borderTopColor: colors.border, borderTopWidth: 1 }]}><View style={styles.dataCopy}><Text style={[styles.dataTitle, { color: colors.text }]}>{item.part_name}</Text><Text style={[styles.dataMeta, { color: colors.textMuted }]}>{Number(item.quantity)} adet × {money(item.unit_price)}</Text></View><Text style={[styles.dataAmount, { color: colors.text }]}>{money(item.total_price)}</Text></View>)}
        <View style={[styles.inlineForm, { borderTopColor: colors.border }]}><FormField label="Parça" value={partName} onChangeText={setPartName} placeholder="10W-40 motor yağı" /><View style={styles.twoCol}><View style={styles.col}><FormField label="Adet" value={partQty} onChangeText={setPartQty} keyboardType="decimal-pad" /></View><View style={styles.col}><FormField label="Birim fiyat" value={partPrice} onChangeText={setPartPrice} keyboardType="decimal-pad" /></View></View><PrimaryButton title="Parça Ekle" onPress={addPart} loading={saving} secondary /></View>
      </GlassCard>

      <SectionTitle title="Nakit / IBAN tahsilatları" subtitle={`Alınan ${money(order.amount_received)} • Kalan ${money(Math.max(0, Number(order.total_amount) - Number(order.amount_received)))}`} />
      <GlassCard style={styles.dataCard}>
        {payments.map((item, index) => <View key={item.id} style={[styles.dataRow, index > 0 && { borderTopColor: colors.border, borderTopWidth: 1 }]}><View style={styles.dataCopy}><Text style={[styles.dataTitle, { color: colors.text }]}>{item.payment_method === 'transfer' ? 'IBAN / Banka transferi' : 'Nakit'}</Text><Text style={[styles.dataMeta, { color: colors.textMuted }]}>{shortDate(item.paid_at)}</Text></View><Text style={[styles.dataAmount, { color: colors.green }]}>{money(item.amount)}</Text></View>)}
        <View style={[styles.inlineForm, { borderTopColor: colors.border }]}>
          <View style={[styles.toggle, { backgroundColor: colors.surfaceSoft }]}>{(['cash', 'transfer'] as PaymentMethod[]).map((value) => <AnimatedPressable key={value} onPress={() => setPaymentMethod(value)} style={[styles.toggleItem, paymentMethod === value && { backgroundColor: colors.cardStrong }]}><Text style={[styles.toggleText, { color: paymentMethod === value ? colors.text : colors.textMuted }]}>{value === 'cash' ? 'Nakit' : 'IBAN'}</Text></AnimatedPressable>)}</View>
          <FormField label="Tahsilat tutarı" value={paymentAmount} onChangeText={setPaymentAmount} placeholder="1000" keyboardType="decimal-pad" />
          <PrimaryButton title="Tahsilat Kaydet" onPress={addPayment} loading={saving} />
        </View>
      </GlassCard>
    </ScrollView>
  );
}

function DetailHeader({ onBack, title, subtitle, status }: { onBack: () => void; title: string; subtitle: string; status: WorkOrderStatus }) {
  const { colors } = useTheme();
  return <View style={styles.detailHeader}><AnimatedPressable onPress={onBack} style={[styles.back, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="arrow-back" size={22} color={colors.text} /></AnimatedPressable><View style={styles.detailHeaderCopy}><Text style={[styles.detailTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.detailMeta, { color: colors.textMuted }]}>{subtitle}</Text></View><StatusPill status={status} /></View>;
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
  cardTop: { flexDirection: 'row', gap: 9, alignItems: 'center' },
  queueBadge: { width: 34, height: 34, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  queueText: { fontSize: 13, fontWeight: '900' },
  icon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  title: { fontSize: 15, fontWeight: '900' },
  meta: { fontSize: 11, marginTop: 3 },
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
  detailTitle: { fontSize: 20, fontWeight: '900' },
  detailMeta: { fontSize: 11, marginTop: 3 },
  summaryCard: { gap: 10 },
  serviceTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  serviceTypeIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  summaryLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 0.9, marginTop: 3 },
  summaryText: { fontSize: 14, lineHeight: 21 },
  summaryNumbers: { flexDirection: 'row', justifyContent: 'space-between' },
  number: { fontSize: 17, fontWeight: '900', marginTop: 4 },
  sectionTitleWrap: { marginTop: 5 },
  sectionTitle: { fontSize: 19, fontWeight: '900' },
  sectionSubtitle: { fontSize: 12, marginTop: 4, lineHeight: 17 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusButton: { width: '48.5%', minHeight: 48, borderWidth: 1, borderRadius: 15, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
  statusButtonText: { fontSize: 11, fontWeight: '900', textAlign: 'center' },
  dataCard: { paddingVertical: 5, paddingHorizontal: 15 },
  dataRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  dataCopy: { flex: 1 },
  dataTitle: { fontSize: 14, fontWeight: '900' },
  dataMeta: { fontSize: 11, marginTop: 4 },
  dataAmount: { fontSize: 15, fontWeight: '900' },
  inlineForm: { borderTopWidth: 1, paddingTop: 15, paddingBottom: 12, gap: 12 },
  twoCol: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },
  toggle: { flexDirection: 'row', padding: 4, borderRadius: 16 },
  toggleItem: { flex: 1, minHeight: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  toggleText: { fontSize: 12, fontWeight: '900' },
  apprenticeNotice: { borderWidth: 1, borderRadius: 15, padding: 12, flexDirection: 'row', gap: 9, alignItems: 'flex-start' },
  apprenticeText: { flex: 1, fontSize: 11, lineHeight: 17 },
});
