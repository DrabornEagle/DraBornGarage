import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { GarageIcon3D } from '../components/GarageIcon3D';
import { GarageBlink, GarageReveal } from '../components/GarageMotion';
import { GlassCard } from '../components/GlassCard';
import { ScreenHeader } from '../components/ScreenHeader';
import { StatCard } from '../components/StatCard';
import { StatusPill } from '../components/StatusPill';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { money, shortDate, todayIsoStart } from '../lib/format';
import { supabase } from '../lib/supabase';
import { DashboardStats, ServiceType, WorkOrderListItem, WORKER_ROLES } from '../types';

type PanelMode = 'business' | 'mechanic';

export function HomeScreen({
  onNewOrder,
  onOpenOrders,
}: {
  onNewOrder: (mode?: ServiceType) => void;
  onOpenOrders: () => void;
}) {
  const { colors } = useTheme();
  const { profile, workshop, workshops, membership, isAdmin, selectWorkshop } = useAuth();
  const canWork = Boolean(membership && WORKER_ROLES.includes(membership.role));
  const isOwner = isAdmin || membership?.role === 'owner' || membership?.role === 'owner_mechanic';
  const isApprentice = membership?.role === 'apprentice';
  const [panelMode, setPanelMode] = useState<PanelMode>(isOwner ? 'business' : 'mechanic');
  const [stats, setStats] = useState<DashboardStats>({ activeOrders: 0, waitingOrders: 0, todayCompleted: 0, todayIncome: 0, mechanicRecordedTotal: 0 });
  const [recent, setRecent] = useState<WorkOrderListItem[]>([]);
  const [apprenticeQueue, setApprenticeQueue] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [availability, setAvailability] = useState(membership?.availability_status ?? 'available');

  useEffect(() => {
    setPanelMode(isOwner ? 'business' : 'mechanic');
    setAvailability(membership?.availability_status ?? 'available');
  }, [workshop?.id, isOwner, membership?.availability_status]);

  const load = useCallback(async () => {
    if (!workshop || !membership) return;

    if (isApprentice) {
      const { data, error } = await supabase.rpc('get_apprentice_queue', { p_workshop_id: workshop.id });
      if (error) Alert.alert('Atölye sırası alınamadı', error.message);
      setApprenticeQueue(data ?? []);
      return;
    }

    const today = todayIsoStart();
    const mechanicView = panelMode === 'mechanic' && canWork;
    let orderQuery = supabase
      .from('work_orders')
      .select('id,workshop_id,status,payment_status,service_type,customer_waiting_status,queue_position,complaint,total_amount,amount_received,price_type,estimated_price_min,estimated_price_max,quoted_price,arrived_at,assigned_mechanic_id,customer:customers(full_name,phone),motorcycle:motorcycles(brand,model,plate),mechanic:profiles!work_orders_assigned_mechanic_id_fkey(full_name)')
      .eq('workshop_id', workshop.id)
      .order('queue_position', { ascending: true })
      .order('arrived_at', { ascending: false })
      .limit(8);
    if (mechanicView) orderQuery = orderQuery.eq('assigned_mechanic_id', membership.user_id);

    let todayOrdersQuery = supabase
      .from('work_orders')
      .select('id,status,assigned_mechanic_id')
      .eq('workshop_id', workshop.id)
      .gte('arrived_at', today);
    if (mechanicView) todayOrdersQuery = todayOrdersQuery.eq('assigned_mechanic_id', membership.user_id);

    let servicesQuery = supabase
      .from('work_order_services')
      .select('mechanic_id,price,completed')
      .eq('workshop_id', workshop.id)
      .eq('completed', true)
      .gte('created_at', today);
    if (mechanicView) servicesQuery = servicesQuery.eq('mechanic_id', membership.user_id);

    const [ordersResult, todayOrdersResult, paymentsResult, servicesResult] = await Promise.all([
      orderQuery,
      todayOrdersQuery,
      supabase.from('payments').select('amount,payment_method,received_by').eq('workshop_id', workshop.id).gte('paid_at', today),
      servicesQuery,
    ]);

    const todayOrders = todayOrdersResult.data ?? [];
    const services = servicesResult.data ?? [];
    const activeStatuses = ['opened', 'received', 'queued', 'precheck', 'price_entered', 'approval_waiting', 'repair_started', 'extra_approval_waiting', 'parts_waiting', 'testing', 'waiting', 'in_progress'];
    const waitingStatuses = ['opened', 'received', 'queued', 'waiting'];
    const completedStatuses = ['ready', 'completed', 'delivered'];
    const recorded = services.reduce((sum, item) => sum + Number(item.price), 0);
    const received = (paymentsResult.data ?? [])
      .filter((item) => !mechanicView || item.received_by === membership.user_id)
      .reduce((sum, item) => sum + Number(item.amount), 0);

    setStats({
      activeOrders: todayOrders.filter((order) => activeStatuses.includes(order.status)).length,
      waitingOrders: todayOrders.filter((order) => waitingStatuses.includes(order.status)).length,
      todayCompleted: todayOrders.filter((order) => completedStatuses.includes(order.status)).length,
      todayIncome: mechanicView ? recorded : received,
      mechanicRecordedTotal: recorded,
    });
    setRecent((ordersResult.data as unknown as WorkOrderListItem[]) ?? []);
  }, [workshop, membership, panelMode, canWork, isApprentice]);

  useEffect(() => { load(); }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const changeAvailability = async (status: 'available' | 'busy' | 'off') => {
    if (!workshop || !membership) return;
    const { error } = await supabase.rpc('set_staff_availability', {
      p_workshop_id: workshop.id,
      p_user_id: membership.user_id,
      p_status: status,
    });
    if (error) return Alert.alert('Durum değiştirilemedi', error.message);
    setAvailability(status);
  };

  const selectedOrders = isApprentice ? apprenticeQueue : recent;
  const titleRole = isAdmin ? 'ADMIN KONTROLÜ' : isApprentice ? 'ÇIRAK ATÖLYESİ' : panelMode === 'business' ? 'İŞLETME KOKPİTİ' : 'USTA KOKPİTİ';

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
    >
      <ScreenHeader
        eyebrow={titleRole}
        title={`Merhaba, ${profile?.full_name?.split(' ')[0] ?? 'Usta'}`}
        subtitle={`${workshop?.name ?? 'DraBornGarage'} • ${new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}`}
        actionIcon="notifications-outline"
        onAction={() => undefined}
      />

      {workshops.length > 1 && (
        <GarageReveal delay={30}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.businessChips}>
            {workshops.map((item) => {
              const active = workshop?.id === item.id;
              return (
                <AnimatedPressable
                  key={item.id}
                  onPress={() => selectWorkshop(item.id)}
                  style={[styles.businessChip, { backgroundColor: active ? `${colors.primary}1B` : colors.cardStrong, borderColor: active ? colors.primary : colors.border }]}
                >
                  <View style={[styles.businessIcon, { backgroundColor: active ? `${colors.primary}25` : colors.surfaceSoft }]}><MaterialCommunityIcons name={item.is_active === false ? 'garage-alert' : 'garage-variant'} size={19} color={active ? colors.primary : colors.textMuted} /></View>
                  <View style={styles.businessCopy}><Text numberOfLines={1} style={[styles.businessChipText, { color: active ? colors.text : colors.textMuted }]}>{item.name}</Text><Text style={[styles.businessStatus, { color: item.is_active === false ? colors.red : colors.green }]}>{item.is_active === false ? 'PASİF' : 'AKTİF'}</Text></View>
                  {active && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
                </AnimatedPressable>
              );
            })}
          </ScrollView>
        </GarageReveal>
      )}

      {isOwner && canWork && !isApprentice && (
        <GarageReveal delay={55}>
          <View style={[styles.panelSwitch, { backgroundColor: colors.cardStrong, borderColor: colors.border }]}> 
            {(['business', 'mechanic'] as PanelMode[]).map((value) => {
              const active = panelMode === value;
              const accent = value === 'business' ? colors.cyan : colors.orange;
              return (
                <AnimatedPressable key={value} onPress={() => setPanelMode(value)} style={[styles.panelSwitchItem, { borderColor: active ? `${accent}65` : 'transparent', backgroundColor: active ? `${accent}12` : 'transparent' }]}> 
                  <View style={[styles.switchDepth, { backgroundColor: active ? `${accent}24` : 'transparent' }]} />
                  <MaterialCommunityIcons name={value === 'business' ? 'garage-variant' : 'account-hard-hat'} size={21} color={active ? accent : colors.textMuted} />
                  <View style={styles.switchCopy}><Text style={[styles.panelSwitchText, { color: active ? colors.text : colors.textMuted }]}>{value === 'business' ? 'İşletme Paneli' : 'Usta Panelim'}</Text><Text style={[styles.panelSwitchSub, { color: active ? accent : colors.textMuted }]}>{value === 'business' ? 'Tüm işletme verileri' : 'Yalnız benim işlerim'}</Text></View>
                  <Ionicons name={active ? 'radio-button-on' : 'ellipse-outline'} size={18} color={active ? accent : colors.textMuted} />
                </AnimatedPressable>
              );
            })}
          </View>
        </GarageReveal>
      )}

      {canWork && panelMode === 'mechanic' && (
        <GarageReveal delay={75}>
          <GlassCard style={styles.availabilityCard}>
            <View style={styles.sectionHeaderCompact}>
              <View>
                <Text style={[styles.sectionMini, { color: colors.orange }]}>USTA DURUMU</Text>
                <Text style={[styles.availabilityTitle, { color: colors.text }]}>Çalışma modunu seç</Text>
              </View>
              <View style={[styles.liveBadge, { backgroundColor: `${colors.green}12`, borderColor: `${colors.green}30` }]}><GarageBlink><View style={[styles.liveDot, { backgroundColor: colors.green }]} /></GarageBlink><Text style={[styles.liveText, { color: colors.green }]}>CANLI</Text></View>
            </View>
            <View style={styles.availabilityRow}>
              {([
                ['available', 'Müsait', 'Yeni iş alırım', 'check-circle', colors.green],
                ['busy', 'Meşgul', 'İşim sürüyor', 'timer-sand', colors.orange],
                ['off', 'Kapalı', 'İş almıyorum', 'power', colors.red],
              ] as const).map(([value, label, hint, icon, accent]) => {
                const active = availability === value;
                return (
                  <AnimatedPressable key={value} onPress={() => changeAvailability(value)} style={[styles.availability, { backgroundColor: active ? `${accent}13` : colors.surfaceSoft, borderColor: active ? accent : colors.border }]}> 
                    <View style={[styles.availabilityIcon, { backgroundColor: `${accent}18` }]}><MaterialCommunityIcons name={icon} size={20} color={accent} /></View>
                    <Text style={[styles.availabilityText, { color: active ? accent : colors.text }]}>{label}</Text>
                    <Text style={[styles.availabilityHint, { color: colors.textMuted }]}>{hint}</Text>
                    <Ionicons name={active ? 'checkmark-circle' : 'ellipse-outline'} size={17} color={active ? accent : colors.textMuted} />
                  </AnimatedPressable>
                );
              })}
            </View>
          </GlassCard>
        </GarageReveal>
      )}

      {!isApprentice && (
        <GarageReveal delay={95}>
          <LinearGradient colors={[colors.orange, colors.primary, colors.primary2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={styles.heroDepth} />
            <View style={styles.heroTop}>
              <View style={styles.heroCopy}>
                <Text style={styles.heroLabel}>{panelMode === 'business' ? 'BUGÜN TAHSİL EDİLEN' : 'BUGÜN KAYDEDİLEN İŞ TUTARI'}</Text>
                <Text style={styles.heroValue}>{money(stats.todayIncome)}</Text>
                <Text style={styles.heroHint}>{stats.activeOrders} aktif motor • {stats.todayCompleted} hazır/tamam • {stats.waitingOrders} sırada</Text>
              </View>
              <GarageIcon3D name="motorbike" size={86} iconSize={43} accent="#FFB14A" accent2="#5B8CFF" animated />
            </View>
            <View style={styles.heroGauge}>
              <View style={styles.heroGaugeFill} />
              <View style={styles.heroGaugeTick} />
              <View style={[styles.heroGaugeTick, { left: '55%' }]} />
              <View style={[styles.heroGaugeTick, { left: '82%' }]} />
            </View>
          </LinearGradient>
        </GarageReveal>
      )}

      {!isApprentice && (
        <GarageReveal delay={125}>
          <View style={styles.quickGrid}>
            <QuickAction title="Hızlı Servis" subtitle="Randevusuz gelen motoru sıraya al" icon="lightning-bolt" accent={colors.orange} onPress={() => onNewOrder('quick')} />
            <QuickAction title="Bırakılan Motor" subtitle="Uzun tamir ve sonradan teslim" icon="key-variant" accent={colors.primary} onPress={() => onNewOrder('dropoff')} />
          </View>
        </GarageReveal>
      )}

      {!isApprentice && (
        <GarageReveal delay={145}>
          <View style={styles.statsRow}>
            <StatCard label="Aktif İş" value={String(stats.activeOrders)} icon="construct" accent={colors.primary2} />
            <StatCard label="Sırada" value={String(stats.waitingOrders)} icon="list" accent={colors.orange} />
          </View>
          <View style={[styles.statsRow, { marginTop: 10 }]}>
            <StatCard label="Hazır / Tamam" value={String(stats.todayCompleted)} icon="checkmark-done" accent={colors.green} />
            <StatCard label={panelMode === 'business' ? 'Tahsilat' : 'Kayıtlı Tutar'} value={money(panelMode === 'business' ? stats.todayIncome : stats.mechanicRecordedTotal)} icon="wallet" accent={colors.cyan} />
          </View>
        </GarageReveal>
      )}

      <GarageReveal delay={170}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionMini, { color: colors.orange }]}>CANLI ATÖLYE AKIŞI</Text>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Bugünkü sıra</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>{isApprentice ? 'Sana görünen görev ve servis akışı.' : 'Plaka, işlem, sıra ve güncel servis durumu.'}</Text>
            </View>
            <AnimatedPressable onPress={onOpenOrders} style={[styles.seeAll, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}34` }]}><Text style={[styles.link, { color: colors.primary }]}>Tümünü gör</Text><Ionicons name="chevron-forward" size={16} color={colors.primary} /></AnimatedPressable>
          </View>

          <View style={styles.orderList}>
            {selectedOrders.length === 0 ? (
              <GlassCard><View style={styles.empty}><MaterialCommunityIcons name="motorbike-off" size={34} color={colors.textMuted} /><Text style={[styles.emptyText, { color: colors.textMuted }]}>Atölye sırasında kayıt bulunmuyor.</Text></View></GlassCard>
            ) : selectedOrders.map((order: any, index) => (
              <GarageReveal key={order.id} delay={190 + Math.min(index, 5) * 35}>
                <AnimatedPressable onPress={onOpenOrders} style={[styles.orderCard, { backgroundColor: colors.cardStrong, borderColor: colors.border }]}> 
                  <View style={[styles.queueBadge, { backgroundColor: `${colors.orange}15`, borderColor: `${colors.orange}45` }]}><Text style={[styles.queueSmall, { color: colors.orange }]}>SIRA</Text><Text style={[styles.queueText, { color: colors.orange }]}>{order.queue_position ?? '-'}</Text></View>
                  <GarageIcon3D name="motorbike" size={51} iconSize={24} accent={colors.primary2} accent2={colors.cyan} />
                  <View style={styles.orderCopy}>
                    <Text style={[styles.orderTitle, { color: colors.text }]}>{order.motorcycle?.brand ?? order.brand} {order.motorcycle?.model ?? order.model}</Text>
                    <Text style={[styles.orderMeta, { color: colors.textMuted }]} numberOfLines={1}>{order.motorcycle?.plate ?? order.plate ?? 'Plaka yok'} • {order.complaint}</Text>
                    <Text style={[styles.orderTime, { color: colors.textMuted }]}>{shortDate(order.arrived_at)} • {order.service_type === 'quick' ? 'Hızlı servis' : order.service_type === 'appointment' ? 'Randevulu' : 'Bırakılan motor'}</Text>
                  </View>
                  <View style={styles.orderRight}>
                    <StatusPill status={order.status} />
                    {!isApprentice && <Text style={[styles.orderAmount, { color: colors.green }]}>{money(order.total_amount)}</Text>}
                  </View>
                </AnimatedPressable>
              </GarageReveal>
            ))}
          </View>
        </View>
      </GarageReveal>
    </ScrollView>
  );
}

function QuickAction({ title, subtitle, icon, accent, onPress }: { title: string; subtitle: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; accent: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <AnimatedPressable onPress={onPress} style={[styles.quickAction, { backgroundColor: colors.cardStrong, borderColor: `${accent}42` }]}> 
      <GarageIcon3D name={icon} size={58} iconSize={27} accent={accent} accent2={colors.primary2} />
      <View style={styles.quickCopy}><Text style={[styles.quickTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.quickText, { color: colors.textMuted }]}>{subtitle}</Text></View>
      <Ionicons name="chevron-forward" size={19} color={accent} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 17, paddingTop: 54, paddingBottom: 118, gap: 15 },
  businessChips: { gap: 9, paddingRight: 18 },
  businessChip: { minHeight: 58, width: 230, borderWidth: 1, borderRadius: 18, padding: 8, flexDirection: 'row', alignItems: 'center', gap: 9 },
  businessIcon: { width: 39, height: 39, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  businessCopy: { flex: 1, minWidth: 0 },
  businessChipText: { fontSize: 11.5, fontWeight: '900' },
  businessStatus: { fontSize: 7.5, fontWeight: '900', letterSpacing: 0.8, marginTop: 3 },
  panelSwitch: { flexDirection: 'row', gap: 6, padding: 5, borderRadius: 20, borderWidth: 1 },
  panelSwitchItem: { flex: 1, minWidth: 0, minHeight: 66, borderRadius: 16, borderWidth: 1, overflow: 'hidden', alignItems: 'center', flexDirection: 'row', gap: 7, paddingHorizontal: 8 },
  switchDepth: { position: 'absolute', left: 7, right: 7, bottom: 5, height: 7, borderRadius: 7 },
  switchCopy: { flex: 1, minWidth: 0 },
  panelSwitchText: { fontSize: 10.5, fontWeight: '900' },
  panelSwitchSub: { fontSize: 7.5, fontWeight: '800', marginTop: 3 },
  availabilityCard: { gap: 13 },
  sectionHeaderCompact: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionMini: { fontSize: 8.5, fontWeight: '900', letterSpacing: 1 },
  availabilityTitle: { fontSize: 17, fontWeight: '900', marginTop: 3 },
  liveBadge: { minHeight: 29, borderRadius: 999, borderWidth: 1, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveDot: { width: 6, height: 6, borderRadius: 6 },
  liveText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  availabilityRow: { flexDirection: 'row', gap: 7 },
  availability: { flex: 1, minWidth: 0, minHeight: 112, borderWidth: 1, borderRadius: 17, alignItems: 'center', justifyContent: 'center', padding: 7 },
  availabilityIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  availabilityText: { fontSize: 11.5, fontWeight: '900', marginTop: 6 },
  availabilityHint: { fontSize: 7.5, textAlign: 'center', marginTop: 3 },
  hero: { borderRadius: 27, padding: 18, minHeight: 190, overflow: 'hidden', justifyContent: 'space-between', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  heroDepth: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 12, backgroundColor: 'rgba(0,0,0,0.17)' },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroCopy: { flex: 1, minWidth: 0 },
  heroLabel: { color: 'rgba(255,255,255,0.78)', fontWeight: '900', fontSize: 9.5, letterSpacing: 1 },
  heroValue: { color: '#fff', fontWeight: '900', fontSize: 33, letterSpacing: -1, marginTop: 8 },
  heroHint: { color: 'rgba(255,255,255,0.82)', fontSize: 10.5, lineHeight: 16, marginTop: 7 },
  heroGauge: { position: 'relative', height: 5, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 5, overflow: 'hidden', marginTop: 13 },
  heroGaugeFill: { width: '68%', height: 5, backgroundColor: '#FFFFFF', borderRadius: 5 },
  heroGaugeTick: { position: 'absolute', left: '28%', width: 2, height: 5, backgroundColor: 'rgba(0,0,0,0.32)' },
  quickGrid: { gap: 9 },
  quickAction: { minHeight: 83, borderWidth: 1, borderRadius: 21, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10, overflow: 'hidden' },
  quickCopy: { flex: 1, minWidth: 0 },
  quickTitle: { fontSize: 15, fontWeight: '900' },
  quickText: { fontSize: 10, lineHeight: 15, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 10 },
  section: { gap: 12, marginTop: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 },
  sectionTitle: { fontSize: 20, fontWeight: '900', marginTop: 3 },
  sectionSubtitle: { fontSize: 10.5, marginTop: 4, maxWidth: 235, lineHeight: 16 },
  seeAll: { minHeight: 36, borderRadius: 12, borderWidth: 1, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 3 },
  link: { fontSize: 10, fontWeight: '900' },
  orderList: { gap: 9 },
  orderCard: { borderWidth: 1, borderRadius: 20, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 8, overflow: 'hidden' },
  queueBadge: { width: 39, height: 47, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  queueSmall: { fontSize: 6, fontWeight: '900', letterSpacing: 0.6 },
  queueText: { fontWeight: '900', fontSize: 15, marginTop: 2 },
  orderCopy: { flex: 1, minWidth: 0 },
  orderTitle: { fontSize: 13, fontWeight: '900' },
  orderMeta: { fontSize: 9.5, marginTop: 3 },
  orderTime: { fontSize: 8.5, marginTop: 4 },
  orderRight: { alignItems: 'flex-end', gap: 7 },
  orderAmount: { fontSize: 11, fontWeight: '900' },
  empty: { alignItems: 'center', gap: 7, paddingVertical: 13 },
  emptyText: { textAlign: 'center', lineHeight: 18, fontSize: 11 },
});
