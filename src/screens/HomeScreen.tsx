import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedMotorcycleIcon } from '../components/AnimatedMotorcycleIcon';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { GlassCard } from '../components/GlassCard';
import { ScreenHeader } from '../components/ScreenHeader';
import { StatCard } from '../components/StatCard';
import { StatusPill } from '../components/StatusPill';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { money, shortDate, todayIsoStart } from '../lib/format';
import { supabase } from '../lib/supabase';
import { DashboardStats, ServiceType, WorkOrderListItem, WORKER_ROLES } from '../types';

export type PanelMode = 'business' | 'mechanic';

export function HomeScreen({
  onNewOrder,
  onOpenOrders,
  panelMode,
  onPanelModeChange,
}: {
  onNewOrder: (mode?: ServiceType) => void;
  onOpenOrders: () => void;
  panelMode: PanelMode;
  onPanelModeChange: (mode: PanelMode) => void;
}) {
  const { colors } = useTheme();
  const { profile, workshop, workshops, membership, isAdmin, selectWorkshop } = useAuth();
  const canWork = Boolean(membership && WORKER_ROLES.includes(membership.role));
  const isOwner = isAdmin || membership?.role === 'owner' || membership?.role === 'owner_mechanic';
  const isApprentice = membership?.role === 'apprentice';
  const [stats, setStats] = useState<DashboardStats>({ activeOrders: 0, waitingOrders: 0, todayCompleted: 0, todayIncome: 0, mechanicRecordedTotal: 0 });
  const [recent, setRecent] = useState<WorkOrderListItem[]>([]);
  const [apprenticeQueue, setApprenticeQueue] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [availability, setAvailability] = useState(membership?.availability_status ?? 'available');

  useEffect(() => {
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
      .select('id,status,assigned_mechanic_id,labor_amount')
      .eq('workshop_id', workshop.id)
      .gte('arrived_at', today);
    if (mechanicView) todayOrdersQuery = todayOrdersQuery.eq('assigned_mechanic_id', membership.user_id);

    const [ordersResult, todayOrdersResult, paymentsResult] = await Promise.all([
      orderQuery,
      todayOrdersQuery,
      supabase.from('payments').select('amount,payment_method,received_by').eq('workshop_id', workshop.id).gte('paid_at', today),
    ]);

    const todayOrders = todayOrdersResult.data ?? [];
    const activeStatuses = ['opened', 'received', 'queued', 'precheck', 'price_entered', 'approval_waiting', 'repair_started', 'extra_approval_waiting', 'parts_waiting', 'testing', 'waiting', 'in_progress'];
    const waitingStatuses = ['opened', 'received', 'queued', 'waiting'];
    const completedStatuses = ['ready', 'completed', 'delivered'];
    const recorded = todayOrders
      .filter((order) => completedStatuses.includes(order.status))
      .reduce((sum, order) => sum + Number(order.labor_amount || 0), 0);
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
    setRecent(mechanicView ? ((ordersResult.data as unknown as WorkOrderListItem[]) ?? []) : []);
  }, [workshop, membership, panelMode, canWork, isApprentice]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!workshop?.id || isApprentice) return;
    const refreshLiveStats = () => { load().catch(() => undefined); };
    const channel = supabase
      .channel(`home-live-stats-${workshop.id}-${membership?.user_id ?? 'staff'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_orders', filter: `workshop_id=eq.${workshop.id}` }, refreshLiveStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_order_services', filter: `workshop_id=eq.${workshop.id}` }, refreshLiveStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments', filter: `workshop_id=eq.${workshop.id}` }, refreshLiveStats)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [workshop?.id, membership?.user_id, isApprentice, load]);

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
  const titleRole = isAdmin ? 'ADMIN' : isApprentice ? 'ÇIRAK PANELİ' : panelMode === 'business' ? 'İŞLETME PANELİ' : 'USTA PANELİ';

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
      />

      {workshops.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.businessChips}>
          {workshops.map((item) => (
            <AnimatedPressable
              key={item.id}
              onPress={() => selectWorkshop(item.id)}
              style={[styles.businessChip, { backgroundColor: workshop?.id === item.id ? colors.primary : colors.card, borderColor: workshop?.id === item.id ? colors.primary : colors.border }]}
            >
              <Ionicons name={item.is_active === false ? 'pause-circle' : 'business'} size={16} color={workshop?.id === item.id ? '#fff' : colors.textMuted} />
              <Text numberOfLines={1} maxFontSizeMultiplier={1.03} style={[styles.businessChipText, { color: workshop?.id === item.id ? '#fff' : colors.text }]}>{item.name}</Text>
            </AnimatedPressable>
          ))}
        </ScrollView>
      )}

      {isOwner && canWork && !isApprentice && (
        <View style={[styles.panelSwitch, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}> 
          {(['mechanic', 'business'] as PanelMode[]).map((value) => {
            const active = panelMode === value;
            const accent = value === 'business' ? colors.cyan : colors.orange;
            return (
              <AnimatedPressable
                key={value}
                onPress={() => onPanelModeChange(value)}
                style={[styles.panelSwitchItem, { borderColor: active ? `${accent}70` : 'transparent' }]}
              >
                {active && <LinearGradient colors={[`${accent}24`, `${colors.primary}16`]} style={StyleSheet.absoluteFill} />}
                <View style={[styles.panelSwitchIcon, { backgroundColor: `${accent}16` }]}> 
                  <Ionicons name={value === 'business' ? 'business' : 'construct'} size={17} color={accent} />
                </View>
                <Text numberOfLines={1} maxFontSizeMultiplier={1.02} style={[styles.panelSwitchText, { color: active ? colors.text : colors.textMuted }]}>{value === 'business' ? 'İşletme Panelim' : 'Usta Panelim'}</Text>
                {active && <View style={[styles.panelSwitchDot, { backgroundColor: accent }]} />}
              </AnimatedPressable>
            );
          })}
        </View>
      )}

      {canWork && panelMode === 'mechanic' && (
        <View style={styles.availabilityRow}>
          {([
            ['available', 'Müsait', colors.green],
            ['busy', 'Meşgul', colors.orange],
            ['off', 'Kapalı', colors.red],
          ] as const).map(([value, label, accent]) => (
            <AnimatedPressable key={value} onPress={() => changeAvailability(value)} style={[styles.availability, { backgroundColor: availability === value ? `${accent}22` : colors.card, borderColor: availability === value ? accent : colors.border }]}> 
              <View style={[styles.availabilityDot, { backgroundColor: accent }]} />
              <Text numberOfLines={1} maxFontSizeMultiplier={1.02} style={[styles.availabilityText, { color: availability === value ? accent : colors.textMuted }]}>{label}</Text>
            </AnimatedPressable>
          ))}
        </View>
      )}

      {!isApprentice && (
        <LinearGradient colors={[colors.primary, colors.primary2, colors.cyan]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroGlow} />
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroLabel}>{panelMode === 'business' ? 'BUGÜN TAHSİL EDİLEN' : 'BUGÜN KAYDEDİLEN İŞ TUTARI'}</Text>
              <Text style={styles.heroValue}>{money(stats.todayIncome)}</Text>
            </View>
            <View style={styles.heroIcon}><Ionicons name="speedometer" size={28} color="#fff" /></View>
          </View>
          <Text style={styles.heroHint}>{stats.activeOrders} aktif motosiklet • {stats.todayCompleted} hazır/tamamlanan iş</Text>
        </LinearGradient>
      )}

      {!isApprentice && canWork && panelMode === 'mechanic' && (
        <View style={styles.quickGrid}>
          <AnimatedPressable onPress={() => onNewOrder('quick')} style={[styles.quickAction, { backgroundColor: `${colors.orange}18`, borderColor: `${colors.orange}55` }]}> 
            <View style={[styles.quickIcon, { backgroundColor: `${colors.orange}24` }]}><Ionicons name="flash" size={25} color={colors.orange} /></View>
            <View style={styles.quickCopy}><Text style={[styles.quickTitle, { color: colors.text }]}>+ Hızlı Servis</Text><Text style={[styles.quickText, { color: colors.textMuted }]}>Randevusuz gelen motoru plakayla hemen sıraya al.</Text></View>
            <Ionicons name="chevron-forward" size={20} color={colors.orange} />
          </AnimatedPressable>
          <AnimatedPressable onPress={() => onNewOrder('dropoff')} style={[styles.quickAction, { backgroundColor: `${colors.primary}14`, borderColor: `${colors.primary}45` }]}> 
            <View style={[styles.quickIcon, { backgroundColor: `${colors.primary}20` }]}><Ionicons name="key" size={24} color={colors.primary} /></View>
            <View style={styles.quickCopy}><Text style={[styles.quickTitle, { color: colors.text }]}>Bırakılan Motor</Text><Text style={[styles.quickText, { color: colors.textMuted }]}>Uzun tamir ve sonradan teslim akışı oluştur.</Text></View>
            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          </AnimatedPressable>
        </View>
      )}

      {!isApprentice && (
        <>
          <View style={styles.statsRow}>
            <StatCard label="Aktif İş" value={String(stats.activeOrders)} icon="construct" accent={colors.primary2} />
            <StatCard label="Sırada" value={String(stats.waitingOrders)} icon="list" accent={colors.orange} />
          </View>
          <View style={styles.statsRow}>
            <StatCard label="Hazır/Tamam" value={String(stats.todayCompleted)} icon="checkmark-done" accent={colors.green} />
            <StatCard label={panelMode === 'business' ? 'Tahsilat' : 'Kayıtlı Tutar'} value={money(panelMode === 'business' ? stats.todayIncome : stats.mechanicRecordedTotal)} icon="wallet" accent={colors.cyan} />
          </View>
        </>
      )}

      {!isApprentice && panelMode === 'business' && (
        <GlassCard style={[styles.businessNotice, { borderColor: `${colors.cyan}38` }]}>
          <View style={[styles.businessNoticeIcon, { backgroundColor: `${colors.cyan}14` }]}><Ionicons name="analytics" size={24} color={colors.cyan} /></View>
          <View style={styles.quickCopy}><Text style={[styles.businessNoticeTitle, { color: colors.text }]}>İşletme Paneli özet görünümüdür</Text><Text style={[styles.businessNoticeText, { color: colors.textMuted }]}>Toplamlar, Usta kazançları, raporlar ve işletme ayarları burada yönetilir. Motosiklet kabulü ve bütün servis işlemleri yalnız Usta Panelinden yapılır.</Text></View>
        </GlassCard>
      )}

      {(isApprentice || panelMode === 'mechanic') && <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Bugünkü Atölye Sırası</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>{isApprentice ? 'Finansal bilgiler gizlidir; yalnız görev ve servis akışı gösterilir.' : 'Yalnız sana atanmış plaka, işlem, sıra ve güncel servis durumu.'}</Text>
          </View>
          <AnimatedPressable onPress={onOpenOrders}><Text style={[styles.link, { color: colors.primary }]}>Tümünü gör</Text></AnimatedPressable>
        </View>
        <View style={styles.orderList}>
          {selectedOrders.length === 0 ? (
            <GlassCard><Text style={[styles.emptyText, { color: colors.textMuted }]}>Sana atanmış atölye kaydı bulunmuyor.</Text></GlassCard>
          ) : selectedOrders.map((order: any) => (
            <AnimatedPressable key={order.id} onPress={onOpenOrders} style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.queueBadge, { backgroundColor: `${colors.orange}20`, borderColor: `${colors.orange}55` }]}><Text style={[styles.queueText, { color: colors.orange }]}>{order.queue_position ?? '-'}</Text></View>
              <View style={[styles.bikeIcon, { backgroundColor: `${colors.primary2}18` }]}><AnimatedMotorcycleIcon size={30} color={colors.primary2} /></View>
              <View style={styles.orderCopy}>
                <Text style={[styles.orderTitle, { color: colors.text }]}>{order.motorcycle?.brand ?? order.brand} {order.motorcycle?.model ?? order.model}</Text>
                <Text style={[styles.orderMeta, { color: colors.textMuted }]}>{order.motorcycle?.plate ?? order.plate ?? 'Plaka yok'} • {order.complaint}</Text>
                <Text style={[styles.orderTime, { color: colors.textMuted }]}>{shortDate(order.arrived_at)} • {order.service_type === 'quick' ? 'Hızlı servis' : order.service_type === 'appointment' ? 'Randevulu' : 'Bırakılan motor'}</Text>
              </View>
              <View style={styles.orderRight}>
                <StatusPill status={order.status} />
                {!isApprentice && <Text style={[styles.orderAmount, { color: colors.text }]}>{money(order.total_amount)}</Text>}
              </View>
            </AnimatedPressable>
          ))}
        </View>
      </View>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 56, paddingBottom: 120, gap: 17 },
  businessChips: { gap: 9, paddingRight: 18 },
  businessChip: { minHeight: 42, maxWidth: 245, borderWidth: 1, borderRadius: 15, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 7 },
  businessChipText: { flexShrink: 1, fontSize: 13, fontWeight: '900' },
  panelSwitch: { flexDirection: 'row', gap: 6, padding: 5, borderRadius: 19, borderWidth: 1 },
  panelSwitchItem: { flex: 1, minWidth: 0, minHeight: 52, borderRadius: 15, borderWidth: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7, paddingHorizontal: 7 },
  panelSwitchIcon: { width: 29, height: 29, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  panelSwitchText: { flexShrink: 1, fontSize: 12, fontWeight: '900', textAlign: 'center' },
  panelSwitchDot: { width: 5, height: 5, borderRadius: 5 },
  availabilityRow: { flexDirection: 'row', gap: 8 },
  availability: { flex: 1, minWidth: 0, minHeight: 42, borderWidth: 1, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  availabilityDot: { width: 7, height: 7, borderRadius: 7 },
  availabilityText: { fontSize: 12.5, fontWeight: '900' },
  hero: { borderRadius: 28, padding: 21, minHeight: 170, overflow: 'hidden', justifyContent: 'space-between', shadowColor: '#6158FF', shadowOpacity: 0.36, shadowRadius: 24, elevation: 12 },
  heroGlow: { position: 'absolute', width: 180, height: 180, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.13)', right: -55, top: -70 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroLabel: { color: 'rgba(255,255,255,0.76)', fontWeight: '900', fontSize: 12.5, letterSpacing: 1.1 },
  heroValue: { color: '#fff', fontWeight: '900', fontSize: 34, letterSpacing: -1.2, marginTop: 7 },
  heroIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  heroHint: { color: 'rgba(255,255,255,0.82)', fontSize: 13 },
  businessNotice: { minHeight: 96, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }, businessNoticeIcon: { width: 50, height: 50, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }, businessNoticeTitle: { fontSize: 15.5, fontWeight: '900' }, businessNoticeText: { fontSize: 12.5, lineHeight: 18, marginTop: 4 },
  quickGrid: { gap: 10 },
  quickAction: { minHeight: 88, borderWidth: 1, borderRadius: 22, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  quickIcon: { width: 50, height: 50, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  quickCopy: { flex: 1 },
  quickTitle: { fontSize: 16, fontWeight: '900' },
  quickText: { fontSize: 12.5, lineHeight: 17, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 12 },
  section: { gap: 12, marginTop: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  sectionTitle: { fontSize: 19, fontWeight: '900' },
  sectionSubtitle: { fontSize: 13, marginTop: 4, maxWidth: 290, lineHeight: 17 },
  link: { fontSize: 13, fontWeight: '900' },
  orderList: { gap: 10 },
  orderCard: { borderWidth: 1, borderRadius: 22, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 9 },
  queueBadge: { width: 32, height: 32, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  queueText: { fontWeight: '900', fontSize: 13 },
  bikeIcon: { width: 45, height: 45, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  orderCopy: { flex: 1 },
  orderTitle: { fontSize: 14, fontWeight: '900' },
  orderMeta: { fontSize: 12.5, marginTop: 3 },
  orderTime: { fontSize: 12, marginTop: 4 },
  orderRight: { alignItems: 'flex-end', gap: 8 },
  orderAmount: { fontSize: 13, fontWeight: '900' },
  emptyText: { textAlign: 'center', lineHeight: 20, paddingVertical: 10 },
});
