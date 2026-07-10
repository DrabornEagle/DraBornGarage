import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { FormField } from '../components/FormField';
import { GlassCard } from '../components/GlassCard';
import { AnimatedEntrance, PremiumGlowCard, PulseDot } from '../components/PremiumMotion';
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
const READY_STATUSES: WorkOrderStatus[] = ['ready', 'completed'];

function statusIcon(status: WorkOrderStatus): keyof typeof Ionicons.glyphMap {
  if (QUEUE_STATUSES.includes(status)) return 'time';
  if (status === 'parts_waiting') return 'cube';
  if (status === 'testing') return 'speedometer';
  if (READY_STATUSES.includes(status)) return 'checkmark-done-circle';
  if (status === 'delivered') return 'flag';
  if (status === 'cancelled') return 'close-circle';
  if (status === 'approval_waiting' || status === 'extra_approval_waiting') return 'shield-checkmark';
  return 'construct';
}

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

  const counts = useMemo(() => ({
    all: orders.length,
    queue: orders.filter((order) => QUEUE_STATUSES.includes(order.status)).length,
    active: orders.filter((order) => ACTIVE_STATUSES.includes(order.status)).length,
    parts: orders.filter((order) => order.status === 'parts_waiting').length,
    ready: orders.filter((order) => READY_STATUSES.includes(order.status)).length,
    delivered: orders.filter((order) => order.status === 'delivered').length,
  }), [orders]);

  const visible = useMemo(() => orders.filter((order) => {
    if (filter === 'all') return true;
    if (filter === 'queue') return QUEUE_STATUSES.includes(order.status);
    if (filter === 'active') return ACTIVE_STATUSES.includes(order.status);
    if (filter === 'parts') return order.status === 'parts_waiting';
    if (filter === 'ready') return READY_STATUSES.includes(order.status);
    return order.status === 'delivered';
  }), [orders, filter]);

  if (selected) {
    return <WorkOrderDetail orderId={selected.id} apprenticeData={isApprentice ? selected : null} onBack={() => { setSelected(null); load(); }} />;
  }

  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  const totalValue = isApprentice ? 0 : visible.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);

  const filters: { value: Filter; label: string; icon: keyof typeof Ionicons.glyphMap; accent: string }[] = [
    { value: 'all', label: 'Tümü', icon: 'apps', accent: colors.primary },
    { value: 'queue', label: 'Sırada', icon: 'time', accent: colors.orange },
    { value: 'active', label: 'İşlemde', icon: 'construct', accent: colors.primary2 },
    { value: 'parts', label: 'Parça', icon: 'cube', accent: colors.red },
    { value: 'ready', label: 'Hazır', icon: 'checkmark-done', accent: colors.green },
    { value: 'delivered', label: 'Teslim', icon: 'flag', accent: colors.cyan },
  ];

  return (
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />} showsVerticalScrollIndicator={false}>
      <ScreenHeader
        eyebrow={isApprentice ? 'KISITLI ÇIRAK PANELİ' : 'SERVİS VE ATÖLYE SIRASI'}
        title={isApprentice ? 'Atölye Görevleri' : 'İş Emirleri'}
        subtitle={isApprentice ? 'Finansal bilgiler gizlidir. Sadece sıra, motor ve görev detayları gösterilir.' : 'Randevulu, hızlı servis ve bırakılan motorları renkli durum akışıyla yönet.'}
        actionIcon={isApprentice ? undefined : 'add'}
        onAction={isApprentice ? undefined : onNewOrder}
      />

      <PremiumGlowCard accent={colors.orange} accent2={colors.primary2} delay={35} live>
        <View style={styles.overviewTop}>
          <View style={styles.copy}>
            <View style={styles.overviewLive}><PulseDot color={colors.orange} size={6} /><Text style={[styles.overviewEyebrow, { color: colors.orange }]}>ATÖLYE CANLI AKIŞI</Text></View>
            <Text style={[styles.overviewTitle, { color: colors.text }]}>{counts.queue + counts.active + counts.parts} aktif iş akışı</Text>
            <Text style={[styles.overviewText, { color: colors.textMuted }]}>{counts.queue} sırada • {counts.active} işlemde • {counts.parts} parça bekliyor</Text>
          </View>
          <LinearGradient colors={[colors.orange, colors.red]} style={styles.overviewIcon}><Ionicons name="construct" size={29} color="#fff" /></LinearGradient>
        </View>
        <View style={styles.overviewMetrics}>
          <OrderMetric label="GÖRÜNEN" value={String(visible.length)} icon="layers" accent={colors.primary2} />
          <OrderMetric label="HAZIR" value={String(counts.ready)} icon="checkmark-done" accent={colors.green} />
          {!isApprentice && <OrderMetric label="TOPLAM TUTAR" value={money(totalValue)} icon="wallet" accent={colors.cyan} compact />}
        </View>
      </PremiumGlowCard>

      <AnimatedEntrance delay={80}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {filters.map((item) => {
            const active = filter === item.value;
            return (
              <AnimatedPressable key={item.value} onPress={() => setFilter(item.value)} style={[styles.filter, { backgroundColor: active ? `${item.accent}18` : colors.card, borderColor: active ? item.accent : colors.border, shadowColor: item.accent, shadowOpacity: active ? 0.25 : 0.05 }]}> 
                {active && <LinearGradient colors={[item.accent, `${item.accent}30`]} style={styles.filterRail} />}
                <View style={[styles.filterIcon, { backgroundColor: `${item.accent}18` }]}><Ionicons name={item.icon} size={18} color={item.accent} /></View>
                <View><Text style={[styles.filterText, { color: active ? colors.text : colors.textMuted }]}>{item.label}</Text><Text style={[styles.filterCount, { color: active ? item.accent : colors.textMuted }]}>{counts[item.value]} kayıt</Text></View>
                {active && <Ionicons name="checkmark-circle" size={18} color={item.accent} />}
              </AnimatedPressable>
            );
          })}
        </ScrollView>
      </AnimatedEntrance>

      <View style={styles.list}>
        {visible.length === 0 ? (
          <PremiumGlowCard accent={colors.primary2} accent2={colors.cyan} delay={130}>
            <View style={styles.empty}>
              <Ionicons name="construct-outline" size={42} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Bu filtrede iş emri yok</Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Atölye sırasına yeni motor eklendiğinde burada görünecek.</Text>
              {!isApprentice && <PrimaryButton title="Yeni Servis Kaydı" onPress={onNewOrder} />}
            </View>
          </PremiumGlowCard>
        ) : visible.map((order, index) => {
          const brand = order.motorcycle?.brand ?? order.brand;
          const model = order.motorcycle?.model ?? order.model;
          const plate = order.motorcycle?.plate ?? order.plate;
          const accent = order.status === 'parts_waiting'
            ? colors.red
            : READY_STATUSES.includes(order.status)
              ? colors.green
              : QUEUE_STATUSES.includes(order.status)
                ? colors.orange
                : colors.primary2;
          const remaining = Math.max(0, Number(order.total_amount || 0) - Number(order.amount_received || 0));
          return (
            <AnimatedEntrance key={order.id} delay={125 + Math.min(index, 8) * 48}>
              <AnimatedPressable key={order.id} onPress={() => setSelected(order)} style={[styles.card, { backgroundColor: colors.card, borderColor: `${accent}4C`, shadowColor: accent }]}> 
                <LinearGradient colors={[accent, `${accent}15`]} style={styles.cardRail} />
                <View style={styles.cardTop}>
                  <View style={[styles.queueBadge, { backgroundColor: `${colors.orange}17`, borderColor: `${colors.orange}4D` }]}><Text style={[styles.queueLabel, { color: colors.orange }]}>SIRA</Text><Text style={[styles.queueText, { color: colors.orange }]}>{order.queue_position ?? '-'}</Text></View>
                  <LinearGradient colors={[`${accent}38`, `${colors.cyan}14`]} style={styles.icon}><Ionicons name="bicycle" size={27} color={accent} /></LinearGradient>
                  <View style={styles.copy}>
                    <Text style={[styles.title, { color: colors.text }]}>{brand} {model}</Text>
                    <Text style={[styles.meta, { color: colors.textMuted }]}>{plate || 'Plaka yok'}{order.customer?.full_name ? ` • ${order.customer.full_name}` : ''}</Text>
                    {!!order.mechanic?.full_name && <Text style={[styles.mechanic, { color: colors.cyan }]}><Ionicons name="person" size={11} color={colors.cyan} /> {order.mechanic.full_name}</Text>}
                  </View>
                  <View style={styles.statusWrap}><StatusPill status={order.status} /><Ionicons name="chevron-forward" size={19} color={accent} /></View>
                </View>

                <View style={[styles.complaintBox, { backgroundColor: `${accent}0B`, borderColor: `${accent}24` }]}>
                  <Ionicons name={statusIcon(order.status)} size={18} color={accent} />
                  <Text style={[styles.complaint, { color: colors.textSoft }]} numberOfLines={2}>{order.complaint}</Text>
                </View>

                <View style={styles.progressRow}>
                  {[0, 1, 2, 3].map((step) => {
                    const filled = QUEUE_STATUSES.includes(order.status) ? step === 0 : order.status === 'parts_waiting' ? step <= 2 : READY_STATUSES.includes(order.status) || order.status === 'delivered' ? true : step <= 1;
                    return <View key={step} style={[styles.progressSegment, { backgroundColor: filled ? accent : colors.border }]} />;
                  })}
                </View>

                <View style={styles.cardBottom}>
                  <View style={styles.dataBlock}><Text style={[styles.smallLabel, { color: colors.textMuted }]}>SERVİS</Text><Text style={[styles.smallValue, { color: colors.text }]}>{order.service_type === 'quick' ? 'Hızlı' : order.service_type === 'appointment' ? 'Randevulu' : 'Bırakılan'}</Text></View>
                  <View style={styles.dataBlock}><Text style={[styles.smallLabel, { color: colors.textMuted }]}>GELİŞ</Text><Text style={[styles.smallValue, { color: colors.text }]}>{shortDate(order.arrived_at)}</Text></View>
                  {!isApprentice && <View style={styles.amountWrap}><Text style={[styles.amount, { color: accent }]}>{money(order.total_amount)}</Text><Text style={[styles.payment, { color: remaining <= 0 ? colors.green : colors.orange }]}>{remaining <= 0 ? 'Tam ödendi' : `${money(remaining)} kaldı`}</Text></View>}
                </View>
              </AnimatedPressable>
            </AnimatedEntrance>
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
  const currentAccent = order.status === 'parts_waiting' ? colors.red : READY_STATUSES.includes(order.status) ? colors.green : QUEUE_STATUSES.includes(order.status) ? colors.orange : colors.primary2;

  if (isApprentice) {
    const allowedStatuses: WorkOrderStatus[] = ['precheck', 'parts_waiting', 'testing'];
    return (
      <ScrollView contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
        <DetailHeader onBack={onBack} title={`${brand} ${model}`} subtitle={`${plate || 'Plaka yok'} • Sıra ${order.queue_position ?? '-'}`} status={order.status} />
        <PremiumGlowCard accent={currentAccent} accent2={colors.cyan} delay={40} live>
          <View style={styles.apprenticeHero}><LinearGradient colors={[currentAccent, colors.primary2]} style={styles.detailBikeIcon}><Ionicons name="bicycle" size={29} color="#fff" /></LinearGradient><View style={styles.copy}><Text style={[styles.summaryLabel, { color: currentAccent }]}>YAPILACAK İŞ</Text><Text style={[styles.summaryText, { color: colors.text }]}>{order.complaint}</Text></View></View>
          {!!order.notes && <View style={[styles.noteBox, { backgroundColor: `${colors.orange}0E`, borderColor: `${colors.orange}30` }]}><Text style={[styles.summaryLabel, { color: colors.orange }]}>ATÖLYE NOTU</Text><Text style={[styles.summaryText, { color: colors.text }]}>{order.notes}</Text></View>}
          <View style={[styles.apprenticeNotice, { backgroundColor: `${colors.orange}10`, borderColor: `${colors.orange}35` }]}><Ionicons name="eye-off" size={19} color={colors.orange} /><Text style={[styles.apprenticeText, { color: colors.textMuted }]}>Ücret, tahsilat, müşteri borcu, usta geliri, raporlar ve işletme ayarları Çırak Panelinde gösterilmez.</Text></View>
        </PremiumGlowCard>
        <SectionTitle title="Basit servis durumu" subtitle="Çırak yalnız ön kontrol, parça bekliyor ve test ediliyor adımlarını işaretleyebilir." icon="git-branch" accent={colors.orange} />
        <View style={styles.statusGrid}>{allowedStatuses.map((status, index) => <StatusAction key={status} status={status} current={order.status === status} accent={status === 'parts_waiting' ? colors.red : status === 'testing' ? colors.cyan : colors.primary2} onPress={() => changeStatus(status)} delay={80 + index * 45} />)}</View>
      </ScrollView>
    );
  }

  const statusFlow: WorkOrderStatus[] = ['received', 'queued', 'precheck', 'price_entered', 'approval_waiting', 'repair_started', 'parts_waiting', 'testing', 'ready', 'delivered', 'cancelled'];
  const remaining = Math.max(0, Number(order.total_amount || 0) - Number(order.amount_received || 0));

  return (
    <ScrollView contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
      <DetailHeader onBack={onBack} title={`${brand} ${model}`} subtitle={`${order.customer?.full_name} • ${plate || 'Plaka yok'} • Sıra ${order.queue_position ?? '-'}`} status={order.status} />

      <PremiumGlowCard accent={currentAccent} accent2={colors.cyan} delay={35} live>
        <View style={styles.detailHeroTop}>
          <LinearGradient colors={[currentAccent, colors.primary2]} style={styles.detailBikeIcon}><Ionicons name="bicycle" size={31} color="#fff" /></LinearGradient>
          <View style={styles.copy}>
            <View style={styles.detailLiveRow}><PulseDot color={currentAccent} size={6} /><Text style={[styles.detailEyebrow, { color: currentAccent }]}>{statusLabels[order.status]}</Text></View>
            <Text style={[styles.detailHeroTitle, { color: colors.text }]}>{order.service_type === 'quick' ? 'Hızlı Servis' : order.service_type === 'appointment' ? 'Randevulu Servis' : 'Bırakılan Motor'}</Text>
            <Text style={[styles.dataMeta, { color: colors.textMuted }]}>{order.customer_waiting_status === 'waiting_shop' ? 'Müşteri dükkânda bekliyor' : order.customer_waiting_status === 'left_vehicle' ? 'Müşteri motoru bırakıp gitti' : order.customer_waiting_status === 'return_later' ? 'Müşteri sonra gelecek' : 'Motoru başkası teslim etti'}</Text>
          </View>
        </View>
        <View style={[styles.complaintHero, { backgroundColor: `${currentAccent}0D`, borderColor: `${currentAccent}2C` }]}><Ionicons name="chatbox-ellipses" size={19} color={currentAccent} /><Text style={[styles.summaryText, { color: colors.text }]}>{order.complaint}</Text></View>
        {!!order.diagnosis && <View style={[styles.noteBox, { backgroundColor: `${colors.cyan}0D`, borderColor: `${colors.cyan}2B` }]}><Text style={[styles.summaryLabel, { color: colors.cyan }]}>TESPİT</Text><Text style={[styles.summaryText, { color: colors.text }]}>{order.diagnosis}</Text></View>}
        <View style={styles.summaryNumbers}>
          <SummaryNumber label="İŞÇİLİK" value={money(order.labor_amount)} accent={colors.primary2} icon="construct" />
          <SummaryNumber label="PARÇA" value={money(order.parts_amount)} accent={colors.orange} icon="cube" />
          <SummaryNumber label="TOPLAM" value={money(order.total_amount)} accent={colors.green} icon="wallet" />
        </View>
        <View style={[styles.paymentSummary, { backgroundColor: remaining > 0 ? `${colors.orange}0F` : `${colors.green}0F`, borderColor: remaining > 0 ? `${colors.orange}34` : `${colors.green}34` }]}>
          <Ionicons name={remaining > 0 ? 'time' : 'checkmark-circle'} size={21} color={remaining > 0 ? colors.orange : colors.green} />
          <View style={styles.copy}><Text style={[styles.paymentSummaryTitle, { color: colors.text }]}>{remaining > 0 ? 'Tahsilat bekleniyor' : 'Ödeme tamamlandı'}</Text><Text style={[styles.paymentSummaryText, { color: colors.textMuted }]}>Alınan {money(order.amount_received)} • Kalan {money(remaining)}</Text></View>
        </View>
      </PremiumGlowCard>

      <SectionTitle title="Servis durumu" subtitle="Aktif adım parlak renkle vurgulanır. Tamire başlamadan önce ücret zorunludur." icon="git-branch" accent={currentAccent} />
      <View style={styles.statusGrid}>{statusFlow.map((status, index) => {
        const accent = status === 'parts_waiting' ? colors.red : status === 'ready' || status === 'delivered' ? colors.green : status === 'testing' ? colors.cyan : status === 'cancelled' ? colors.red : status === 'queued' ? colors.orange : colors.primary2;
        return <StatusAction key={status} status={status} current={order.status === status} accent={accent} onPress={() => changeStatus(status)} delay={70 + Math.min(index, 8) * 32} />;
      })}</View>

      <SectionTitle title="Ücret / tahmini ücret" subtitle="Müşteriyle paylaşılacak ücret türünü net ve görünür biçimde seç." icon="pricetag" accent={colors.primary} />
      <PremiumGlowCard accent={colors.primary} accent2={colors.cyan} delay={70}>
        <SegmentedControl
          options={[
            { value: 'fixed', title: 'Net Fiyat', subtitle: 'Kesin tutar', icon: 'checkmark-circle', accent: colors.green },
            { value: 'estimated', title: 'Tahmini Fiyat', subtitle: 'Aralık belirt', icon: 'analytics', accent: colors.orange },
          ]}
          value={priceType}
          onChange={(value) => setPriceType(value as PriceType)}
        />
        <View style={styles.formGap}>{priceType === 'fixed' ? <FormField label="Net fiyat" value={fixedPrice} onChangeText={setFixedPrice} keyboardType="decimal-pad" placeholder="850" /> : <View style={styles.twoCol}><View style={styles.col}><FormField label="En az" value={estimateMin} onChangeText={setEstimateMin} keyboardType="decimal-pad" placeholder="750" /></View><View style={styles.col}><FormField label="En fazla" value={estimateMax} onChangeText={setEstimateMax} keyboardType="decimal-pad" placeholder="1000" /></View></View>}<PrimaryButton title="Ücreti Kaydet" onPress={savePrice} loading={saving} /></View>
      </PremiumGlowCard>

      <SectionTitle title="Yapılan işlemler" subtitle="Hangi usta hangi işlem için ne kadar tutar kaydetti." icon="hammer" accent={colors.green} />
      <PremiumGlowCard accent={colors.green} accent2={colors.cyan} delay={80}>
        <View style={styles.dataList}>
          {services.length === 0 ? <EmptyData icon="hammer-outline" text="Henüz işlem eklenmedi." /> : services.map((item, index) => <DataRow key={item.id} index={index} icon={item.completed ? 'checkmark-circle' : 'time'} accent={item.completed ? colors.green : colors.orange} title={item.title} meta={`${item.mechanic?.full_name || 'Usta'} • ${item.completed ? 'Tamamlandı' : 'Planlandı'}`} amount={money(item.price)} />)}
        </View>
        <View style={[styles.inlineForm, { borderTopColor: colors.border }]}><FormField label="İşlem" value={serviceTitle} onChangeText={setServiceTitle} placeholder="Yağ değişimi" /><FormField label="Tutar" value={servicePrice} onChangeText={setServicePrice} placeholder="750" keyboardType="decimal-pad" /><PrimaryButton title="İşlem Ekle" onPress={addService} loading={saving} /></View>
      </PremiumGlowCard>

      <SectionTitle title="Kullanılan parçalar" subtitle="Parça adı, adet ve müşteriye yansıtılan birim fiyat." icon="cube" accent={colors.orange} />
      <PremiumGlowCard accent={colors.orange} accent2={colors.red} delay={90}>
        <View style={styles.dataList}>
          {parts.length === 0 ? <EmptyData icon="cube-outline" text="Parça kullanımı eklenmedi." /> : parts.map((item, index) => <DataRow key={item.id} index={index} icon="cube" accent={colors.orange} title={item.part_name} meta={`${Number(item.quantity)} adet × ${money(item.unit_price)}`} amount={money(item.total_price)} />)}
        </View>
        <View style={[styles.inlineForm, { borderTopColor: colors.border }]}><FormField label="Parça" value={partName} onChangeText={setPartName} placeholder="10W-40 motor yağı" /><View style={styles.twoCol}><View style={styles.col}><FormField label="Adet" value={partQty} onChangeText={setPartQty} keyboardType="decimal-pad" /></View><View style={styles.col}><FormField label="Birim fiyat" value={partPrice} onChangeText={setPartPrice} keyboardType="decimal-pad" /></View></View><PrimaryButton title="Parça Ekle" onPress={addPart} loading={saving} secondary /></View>
      </PremiumGlowCard>

      <SectionTitle title="Tahsilatlar" subtitle={`Alınan ${money(order.amount_received)} • Kalan ${money(remaining)}`} icon="card" accent={colors.cyan} />
      <PremiumGlowCard accent={colors.cyan} accent2={colors.primary} delay={100} live={remaining > 0}>
        <View style={styles.dataList}>
          {payments.length === 0 ? <EmptyData icon="wallet-outline" text="Henüz tahsilat kaydı yok." /> : payments.map((item, index) => <DataRow key={item.id} index={index} icon={item.payment_method === 'transfer' ? 'business' : 'cash'} accent={colors.green} title={item.payment_method === 'transfer' ? 'IBAN / Banka Transferi' : 'Nakit'} meta={shortDate(item.paid_at)} amount={money(item.amount)} />)}
        </View>
        <View style={[styles.inlineForm, { borderTopColor: colors.border }]}> 
          <SegmentedControl
            options={[
              { value: 'cash', title: 'Nakit', subtitle: 'Elden ödeme', icon: 'cash', accent: colors.green },
              { value: 'transfer', title: 'IBAN', subtitle: 'Banka transferi', icon: 'business', accent: colors.cyan },
            ]}
            value={paymentMethod}
            onChange={(value) => setPaymentMethod(value as PaymentMethod)}
          />
          <FormField label="Tahsilat tutarı" value={paymentAmount} onChangeText={setPaymentAmount} placeholder="1000" keyboardType="decimal-pad" />
          <PrimaryButton title="Tahsilat Kaydet" onPress={addPayment} loading={saving} />
        </View>
      </PremiumGlowCard>
    </ScrollView>
  );
}

function DetailHeader({ onBack, title, subtitle, status }: { onBack: () => void; title: string; subtitle: string; status: WorkOrderStatus }) {
  const { colors } = useTheme();
  return (
    <AnimatedEntrance delay={0}>
      <View style={styles.detailHeader}>
        <AnimatedPressable onPress={onBack} style={[styles.back, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="arrow-back" size={22} color={colors.text} /></AnimatedPressable>
        <View style={styles.detailHeaderCopy}><Text style={[styles.detailTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.detailMeta, { color: colors.textMuted }]}>{subtitle}</Text></View>
        <StatusPill status={status} />
      </View>
    </AnimatedEntrance>
  );
}

function SectionTitle({ title, subtitle, icon, accent }: { title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap; accent: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionTitleWrap}>
      <View style={[styles.sectionIcon, { backgroundColor: `${accent}16` }]}><Ionicons name={icon} size={20} color={accent} /></View>
      <View style={styles.copy}><Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>{subtitle}</Text></View>
    </View>
  );
}

function StatusAction({ status, current, accent, onPress, delay }: { status: WorkOrderStatus; current: boolean; accent: string; onPress: () => void; delay: number }) {
  const { colors } = useTheme();
  return (
    <AnimatedEntrance delay={delay} style={styles.statusCell}>
      <AnimatedPressable onPress={onPress} style={[styles.statusButton, { backgroundColor: current ? `${accent}18` : colors.card, borderColor: current ? accent : colors.border, shadowColor: accent, shadowOpacity: current ? 0.28 : 0.06 }]}> 
        {current && <LinearGradient colors={[accent, `${accent}30`]} style={styles.statusRail} />}
        <View style={[styles.statusIcon, { backgroundColor: `${accent}16` }]}><Ionicons name={statusIcon(status)} size={19} color={accent} /></View>
        <View style={styles.statusCopy}><Text style={[styles.statusButtonText, { color: current ? colors.text : colors.textMuted }]}>{statusLabels[status]}</Text>{current && <Text style={[styles.statusCurrent, { color: accent }]}>Şu an bu aşamada</Text>}</View>
        <Ionicons name={current ? 'radio-button-on' : 'ellipse-outline'} size={18} color={current ? accent : colors.textMuted} />
      </AnimatedPressable>
    </AnimatedEntrance>
  );
}

function SegmentedControl({ options, value, onChange }: { options: { value: string; title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap; accent: string }[]; value: string; onChange: (value: string) => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}> 
      {options.map((item) => {
        const active = value === item.value;
        return (
          <AnimatedPressable key={item.value} onPress={() => onChange(item.value)} style={[styles.segmentItem, { borderColor: active ? `${item.accent}65` : 'transparent' }]}> 
            {active && <LinearGradient colors={[`${item.accent}32`, `${item.accent}10`]} style={StyleSheet.absoluteFill} />}
            <View style={[styles.segmentIcon, { backgroundColor: `${item.accent}17` }]}><Ionicons name={item.icon} size={19} color={item.accent} /></View>
            <View style={styles.segmentCopy}><Text style={[styles.segmentTitle, { color: active ? colors.text : colors.textMuted }]}>{item.title}</Text><Text style={[styles.segmentSubtitle, { color: active ? item.accent : colors.textMuted }]}>{item.subtitle}</Text></View>
            <Ionicons name={active ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={active ? item.accent : colors.textMuted} />
          </AnimatedPressable>
        );
      })}
    </View>
  );
}

function SummaryNumber({ label, value, accent, icon }: { label: string; value: string; accent: string; icon: keyof typeof Ionicons.glyphMap }) {
  const { colors } = useTheme();
  return <View style={[styles.summaryNumber, { backgroundColor: `${accent}0E`, borderColor: `${accent}2D` }]}><Ionicons name={icon} size={17} color={accent} /><Text numberOfLines={1} style={[styles.number, { color: colors.text }]}>{value}</Text><Text style={[styles.smallLabel, { color: colors.textMuted }]}>{label}</Text></View>;
}

function DataRow({ index, icon, accent, title, meta, amount }: { index: number; icon: keyof typeof Ionicons.glyphMap; accent: string; title: string; meta: string; amount: string }) {
  const { colors } = useTheme();
  return (
    <AnimatedEntrance delay={Math.min(index, 6) * 35}>
      <View style={[styles.dataRow, index > 0 && { borderTopColor: colors.border, borderTopWidth: 1 }]}> 
        <View style={[styles.dataIcon, { backgroundColor: `${accent}16` }]}><Ionicons name={icon} size={20} color={accent} /></View>
        <View style={styles.dataCopy}><Text style={[styles.dataTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.dataMeta, { color: colors.textMuted }]}>{meta}</Text></View>
        <Text style={[styles.dataAmount, { color: accent }]}>{amount}</Text>
      </View>
    </AnimatedEntrance>
  );
}

function EmptyData({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  const { colors } = useTheme();
  return <View style={styles.emptyData}><Ionicons name={icon} size={28} color={colors.textMuted} /><Text style={[styles.emptyDataText, { color: colors.textMuted }]}>{text}</Text></View>;
}

function OrderMetric({ label, value, icon, accent, compact = false }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap; accent: string; compact?: boolean }) {
  const { colors } = useTheme();
  return <View style={[styles.metric, { backgroundColor: `${accent}0E`, borderColor: `${accent}2C` }]}><Ionicons name={icon} size={17} color={accent} /><Text numberOfLines={1} style={[compact ? styles.metricValueCompact : styles.metricValue, { color: colors.text }]}>{value}</Text><Text style={[styles.metricLabel, { color: colors.textMuted }]}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 56, paddingBottom: 120, gap: 17 },
  copy: { flex: 1, minWidth: 0 },
  overviewTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  overviewLive: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  overviewEyebrow: { fontSize: 9.5, fontWeight: '900', letterSpacing: 1 },
  overviewTitle: { fontSize: 22, fontWeight: '900', marginTop: 7 },
  overviewText: { fontSize: 11.5, lineHeight: 17, marginTop: 5 },
  overviewIcon: { width: 57, height: 57, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.24, shadowRadius: 10, elevation: 7 },
  overviewMetrics: { flexDirection: 'row', gap: 7, marginTop: 15 },
  metric: { flex: 1, minHeight: 70, borderWidth: 1, borderRadius: 16, padding: 8, justifyContent: 'center' },
  metricValue: { fontSize: 18, fontWeight: '900', marginTop: 4 },
  metricValueCompact: { fontSize: 12.5, fontWeight: '900', marginTop: 5 },
  metricLabel: { fontSize: 7, fontWeight: '900', letterSpacing: 0.5, marginTop: 3 },
  filters: { gap: 9, paddingRight: 18 },
  filter: { minWidth: 126, minHeight: 64, borderWidth: 1, borderRadius: 18, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 8, overflow: 'hidden', shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  filterRail: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  filterIcon: { width: 37, height: 37, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  filterText: { fontSize: 11.5, fontWeight: '900' },
  filterCount: { fontSize: 8.5, fontWeight: '800', marginTop: 3 },
  list: { gap: 12 },
  card: { borderWidth: 1, borderRadius: 25, padding: 15, gap: 12, overflow: 'hidden', shadowOpacity: 0.15, shadowRadius: 16, shadowOffset: { width: 0, height: 9 }, elevation: 6 },
  cardRail: { position: 'absolute', left: 0, top: 0, right: 0, height: 4 },
  cardTop: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  queueBadge: { width: 43, height: 50, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  queueLabel: { fontSize: 6.5, fontWeight: '900', letterSpacing: 0.7 },
  queueText: { fontSize: 17, fontWeight: '900', marginTop: 2 },
  icon: { width: 51, height: 51, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16.5, fontWeight: '900' },
  meta: { fontSize: 10.5, marginTop: 3 },
  mechanic: { fontSize: 9.5, fontWeight: '900', marginTop: 5 },
  statusWrap: { alignItems: 'flex-end', gap: 7 },
  complaintBox: { minHeight: 54, borderWidth: 1, borderRadius: 16, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 9 },
  complaint: { flex: 1, fontSize: 12.5, lineHeight: 18 },
  progressRow: { flexDirection: 'row', gap: 5 },
  progressSegment: { flex: 1, height: 3, borderRadius: 3 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  dataBlock: { flex: 1 },
  smallLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  smallValue: { fontSize: 11.5, fontWeight: '900', marginTop: 4 },
  amountWrap: { flex: 1.15, alignItems: 'flex-end' },
  amount: { fontSize: 17, fontWeight: '900' },
  payment: { fontSize: 9.5, fontWeight: '900', marginTop: 3 },
  empty: { alignItems: 'center', gap: 11, paddingVertical: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '900' },
  emptyText: { textAlign: 'center', lineHeight: 20 },
  detailLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  detailContent: { paddingHorizontal: 18, paddingTop: 56, paddingBottom: 120, gap: 17 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  back: { width: 46, height: 46, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  detailHeaderCopy: { flex: 1, minWidth: 0 },
  detailTitle: { fontSize: 20, fontWeight: '900' },
  detailMeta: { fontSize: 10.5, marginTop: 3 },
  detailHeroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  apprenticeHero: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  detailBikeIcon: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 9, elevation: 6 },
  detailLiveRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailEyebrow: { fontSize: 9.5, fontWeight: '900', letterSpacing: 0.8 },
  detailHeroTitle: { fontSize: 18, fontWeight: '900', marginTop: 4 },
  complaintHero: { borderWidth: 1, borderRadius: 17, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginTop: 13 },
  noteBox: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 5, marginTop: 11 },
  summaryLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 0.9 },
  summaryText: { flex: 1, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  summaryNumbers: { flexDirection: 'row', gap: 7, marginTop: 14 },
  summaryNumber: { flex: 1, minHeight: 76, borderWidth: 1, borderRadius: 16, padding: 9, justifyContent: 'center' },
  number: { fontSize: 13.5, fontWeight: '900', marginTop: 5 },
  paymentSummary: { minHeight: 62, borderWidth: 1, borderRadius: 16, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 12 },
  paymentSummaryTitle: { fontSize: 12.5, fontWeight: '900' },
  paymentSummaryText: { fontSize: 10, marginTop: 3 },
  sectionTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 5 },
  sectionIcon: { width: 43, height: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 19, fontWeight: '900' },
  sectionSubtitle: { fontSize: 11, marginTop: 4, lineHeight: 16 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusCell: { width: '48.7%' },
  statusButton: { minHeight: 76, borderWidth: 1, borderRadius: 18, padding: 10, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 8, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  statusRail: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  statusIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  statusCopy: { flex: 1, minWidth: 0 },
  statusButtonText: { fontSize: 10.5, fontWeight: '900' },
  statusCurrent: { fontSize: 7.5, fontWeight: '900', marginTop: 3 },
  segmented: { flexDirection: 'row', gap: 7, padding: 5, borderWidth: 1, borderRadius: 18 },
  segmentItem: { flex: 1, minHeight: 68, borderWidth: 1, borderRadius: 14, overflow: 'hidden', paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 7 },
  segmentIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  segmentCopy: { flex: 1, minWidth: 0 },
  segmentTitle: { fontSize: 10.5, fontWeight: '900' },
  segmentSubtitle: { fontSize: 8, fontWeight: '800', marginTop: 3 },
  formGap: { gap: 12, marginTop: 13 },
  dataList: { gap: 0 },
  dataRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  dataIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dataCopy: { flex: 1, minWidth: 0 },
  dataTitle: { fontSize: 13, fontWeight: '900' },
  dataMeta: { fontSize: 10, marginTop: 4 },
  dataAmount: { fontSize: 14, fontWeight: '900' },
  inlineForm: { borderTopWidth: 1, paddingTop: 15, marginTop: 8, gap: 12 },
  twoCol: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },
  emptyData: { alignItems: 'center', gap: 8, paddingVertical: 18 },
  emptyDataText: { fontSize: 11.5 },
  apprenticeNotice: { borderWidth: 1, borderRadius: 15, padding: 12, flexDirection: 'row', gap: 9, alignItems: 'flex-start', marginTop: 12 },
  apprenticeText: { flex: 1, fontSize: 11, lineHeight: 17 },
});
