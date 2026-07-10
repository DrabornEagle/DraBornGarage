import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { AnimatedEntrance, PremiumGlowCard, PulseDot } from '../components/PremiumMotion';
import { ScreenHeader } from '../components/ScreenHeader';
import { StatusPill } from '../components/StatusPill';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { money, shortDate, todayIsoStart } from '../lib/format';
import { supabase } from '../lib/supabase';
import { DashboardStats, ServiceType, WorkOrderListItem, WORKER_ROLES } from '../types';

type PanelMode = 'business' | 'mechanic';
type Availability = 'available' | 'busy' | 'off';

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
  const [availability, setAvailability] = useState<Availability>(membership?.availability_status ?? 'available');

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

  const changeAvailability = async (status: Availability) => {
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

  const modeConfig = panelMode === 'business'
    ? {
        title: 'İşletmenin tamamını yönetiyorsun',
        subtitle: 'Tüm ustalar, aktif işler, sıra ve tahsilatlar birlikte gösterilir.',
        icon: 'business' as const,
        accent: colors.cyan,
        accent2: colors.primary,
      }
    : {
        title: 'Kişisel usta görünümündesin',
        subtitle: 'Yalnız sana atanan işler ve senin kaydettiğin işlem tutarları gösterilir.',
        icon: 'construct' as const,
        accent: colors.orange,
        accent2: colors.red,
      };

  const availabilityOptions = useMemo(() => ([
    {
      value: 'available' as Availability,
      title: 'Müsait',
      subtitle: 'Yeni iş kabul ediyorum',
      detail: 'Atama listesinde öncelikli görünürsün.',
      icon: 'checkmark-circle' as const,
      accent: colors.green,
    },
    {
      value: 'busy' as Availability,
      title: 'Meşgul',
      subtitle: 'Mevcut işe odaklanıyorum',
      detail: 'Yeni iş atanabilir ama yoğun görünürsün.',
      icon: 'timer' as const,
      accent: colors.orange,
    },
    {
      value: 'off' as Availability,
      title: 'Kapalı',
      subtitle: 'Bugün iş almıyorum',
      detail: 'Yeni iş atamalarında kapalı görünürsün.',
      icon: 'power' as const,
      accent: colors.red,
    },
  ]), [colors.green, colors.orange, colors.red]);

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
        <AnimatedEntrance delay={40}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.businessChips}>
            {workshops.map((item) => {
              const active = workshop?.id === item.id;
              return (
                <AnimatedPressable
                  key={item.id}
                  onPress={() => selectWorkshop(item.id)}
                  style={[styles.businessChip, { backgroundColor: active ? `${colors.primary}20` : colors.card, borderColor: active ? colors.primary : colors.border }]}
                >
                  {active && <LinearGradient colors={[colors.primary, colors.primary2]} style={styles.businessChipRail} />}
                  <Ionicons name={item.is_active === false ? 'pause-circle' : 'business'} size={17} color={active ? colors.primary : colors.textMuted} />
                  <Text numberOfLines={1} maxFontSizeMultiplier={1.03} style={[styles.businessChipText, { color: active ? colors.text : colors.textMuted }]}>{item.name}</Text>
                </AnimatedPressable>
              );
            })}
          </ScrollView>
        </AnimatedEntrance>
      )}

      {isOwner && canWork && !isApprentice && (
        <PremiumGlowCard accent={modeConfig.accent} accent2={modeConfig.accent2} delay={70} live>
          <View style={styles.modeHeader}>
            <View style={[styles.modeHeroIcon, { backgroundColor: `${modeConfig.accent}1C` }]}>
              <Ionicons name={modeConfig.icon} size={27} color={modeConfig.accent} />
            </View>
            <View style={styles.copy}>
              <Text style={[styles.modeTitle, { color: colors.text }]}>{modeConfig.title}</Text>
              <Text style={[styles.modeSubtitle, { color: colors.textMuted }]}>{modeConfig.subtitle}</Text>
            </View>
            <PulseDot color={modeConfig.accent} size={7} />
          </View>

          <View style={[styles.panelSwitch, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}> 
            {(['business', 'mechanic'] as PanelMode[]).map((value) => {
              const active = panelMode === value;
              const accent = value === 'business' ? colors.cyan : colors.orange;
              return (
                <AnimatedPressable
                  key={value}
                  onPress={() => setPanelMode(value)}
                  style={[styles.panelSwitchItem, { borderColor: active ? `${accent}80` : 'transparent' }]}
                >
                  {active && <LinearGradient colors={[`${accent}38`, `${colors.primary}18`]} style={StyleSheet.absoluteFill} />}
                  <View style={[styles.panelSwitchIcon, { backgroundColor: `${accent}1A` }]}> 
                    <Ionicons name={value === 'business' ? 'business' : 'construct'} size={20} color={accent} />
                  </View>
                  <View style={styles.panelSwitchCopy}>
                    <Text style={[styles.panelSwitchTitle, { color: active ? colors.text : colors.textMuted }]}>{value === 'business' ? 'İşletme Paneli' : 'Usta Panelim'}</Text>
                    <Text style={[styles.panelSwitchHint, { color: active ? accent : colors.textMuted }]}>{value === 'business' ? 'Tüm işletme' : 'Sadece benim işlerim'}</Text>
                  </View>
                  <Ionicons name={active ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={active ? accent : colors.textMuted} />
                </AnimatedPressable>
              );
            })}
          </View>
        </PremiumGlowCard>
      )}

      {canWork && panelMode === 'mechanic' && !isApprentice && (
        <AnimatedEntrance delay={120}>
          <View style={styles.availabilitySection}>
            <View style={styles.sectionHeaderCompact}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Çalışma Durumum</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>Ekip yeni iş atarken bu durumu görür.</Text>
              </View>
              <View style={[styles.liveBadge, { backgroundColor: `${availabilityOptions.find((item) => item.value === availability)?.accent}16`, borderColor: `${availabilityOptions.find((item) => item.value === availability)?.accent}45` }]}>
                <PulseDot color={availabilityOptions.find((item) => item.value === availability)?.accent ?? colors.green} size={6} />
                <Text style={[styles.liveBadgeText, { color: availabilityOptions.find((item) => item.value === availability)?.accent ?? colors.green }]}>CANLI</Text>
              </View>
            </View>
            <View style={styles.availabilityGrid}>
              {availabilityOptions.map((item, index) => {
                const active = availability === item.value;
                return (
                  <AnimatedEntrance key={item.value} delay={145 + index * 55} style={styles.availabilityCell}>
                    <AnimatedPressable
                      onPress={() => changeAvailability(item.value)}
                      style={[
                        styles.availabilityCard,
                        {
                          backgroundColor: active ? `${item.accent}17` : colors.card,
                          borderColor: active ? item.accent : colors.border,
                          shadowColor: item.accent,
                          shadowOpacity: active ? 0.3 : 0.08,
                        },
                      ]}
                    >
                      {active && <LinearGradient colors={[item.accent, `${item.accent}55`]} style={styles.availabilityRail} />}
                      <View style={styles.availabilityTop}>
                        <View style={[styles.availabilityIcon, { backgroundColor: `${item.accent}1D` }]}>
                          <Ionicons name={item.icon} size={23} color={item.accent} />
                        </View>
                        {active ? <PulseDot color={item.accent} size={6} /> : <Ionicons name="ellipse-outline" size={18} color={colors.textMuted} />}
                      </View>
                      <Text style={[styles.availabilityTitle, { color: active ? item.accent : colors.text }]}>{item.title}</Text>
                      <Text style={[styles.availabilitySubtitle, { color: colors.text }]}>{item.subtitle}</Text>
                      <Text style={[styles.availabilityDetail, { color: colors.textMuted }]}>{item.detail}</Text>
                    </AnimatedPressable>
                  </AnimatedEntrance>
                );
              })}
            </View>
          </View>
        </AnimatedEntrance>
      )}

      {!isApprentice && (
        <PremiumGlowCard accent={colors.primary} accent2={panelMode === 'business' ? colors.cyan : colors.orange} delay={170} live>
          <View style={styles.heroTop}>
            <View style={styles.copy}>
              <View style={styles.heroLiveRow}>
                <PulseDot color={panelMode === 'business' ? colors.cyan : colors.orange} size={6} />
                <Text style={[styles.heroLabel, { color: panelMode === 'business' ? colors.cyan : colors.orange }]}>{panelMode === 'business' ? 'BUGÜN TAHSİL EDİLEN' : 'BUGÜN KAYDEDİLEN İŞ TUTARI'}</Text>
              </View>
              <Text style={[styles.heroValue, { color: colors.text }]}>{money(stats.todayIncome)}</Text>
              <Text style={[styles.heroHint, { color: colors.textMuted }]}>{stats.activeOrders} aktif motosiklet • {stats.todayCompleted} hazır/tamamlanan iş</Text>
            </View>
            <LinearGradient colors={[colors.primary, panelMode === 'business' ? colors.cyan : colors.orange]} style={styles.heroIcon}>
              <Ionicons name={panelMode === 'business' ? 'analytics' : 'speedometer'} size={29} color="#fff" />
            </LinearGradient>
          </View>
          <View style={styles.metricStrip}>
            <MiniMetric label="AKTİF" value={String(stats.activeOrders)} icon="construct" accent={colors.primary2} />
            <MiniMetric label="SIRADA" value={String(stats.waitingOrders)} icon="list" accent={colors.orange} />
            <MiniMetric label="HAZIR" value={String(stats.todayCompleted)} icon="checkmark-done" accent={colors.green} />
          </View>
        </PremiumGlowCard>
      )}

      {!isApprentice && (
        <View style={styles.quickGrid}>
          <AnimatedEntrance delay={220}>
            <AnimatedPressable onPress={() => onNewOrder('quick')} style={[styles.quickAction, { borderColor: `${colors.orange}66`, shadowColor: colors.orange }]}> 
              <LinearGradient colors={[`${colors.orange}24`, colors.cardStrong, `${colors.red}12`]} style={StyleSheet.absoluteFill} />
              <View style={[styles.quickIcon, { backgroundColor: `${colors.orange}22` }]}><Ionicons name="flash" size={27} color={colors.orange} /></View>
              <View style={styles.copy}><Text style={[styles.quickTitle, { color: colors.text }]}>Hızlı Servis</Text><Text style={[styles.quickText, { color: colors.textMuted }]}>Randevusuz gelen motoru plakayla hemen sıraya al.</Text></View>
              <View style={[styles.quickArrow, { backgroundColor: `${colors.orange}18` }]}><Ionicons name="arrow-forward" size={20} color={colors.orange} /></View>
            </AnimatedPressable>
          </AnimatedEntrance>
          <AnimatedEntrance delay={275}>
            <AnimatedPressable onPress={() => onNewOrder('dropoff')} style={[styles.quickAction, { borderColor: `${colors.primary}58`, shadowColor: colors.primary }]}> 
              <LinearGradient colors={[`${colors.primary}20`, colors.cardStrong, `${colors.cyan}10`]} style={StyleSheet.absoluteFill} />
              <View style={[styles.quickIcon, { backgroundColor: `${colors.primary}20` }]}><Ionicons name="key" size={26} color={colors.primary} /></View>
              <View style={styles.copy}><Text style={[styles.quickTitle, { color: colors.text }]}>Bırakılan Motor</Text><Text style={[styles.quickText, { color: colors.textMuted }]}>Uzun tamir ve sonradan teslim akışı oluştur.</Text></View>
              <View style={[styles.quickArrow, { backgroundColor: `${colors.primary}18` }]}><Ionicons name="arrow-forward" size={20} color={colors.primary} /></View>
            </AnimatedPressable>
          </AnimatedEntrance>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.copy}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Bugünkü Atölye Sırası</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>{isApprentice ? 'Finansal bilgiler gizlidir; yalnız görev ve servis akışı gösterilir.' : 'Plaka, işlem, sıra ve güncel servis durumu tek bakışta.'}</Text>
          </View>
          <AnimatedPressable onPress={onOpenOrders} style={[styles.linkButton, { backgroundColor: `${colors.primary}14`, borderColor: `${colors.primary}38` }]}>
            <Text style={[styles.link, { color: colors.primary }]}>Tümünü gör</Text>
            <Ionicons name="arrow-forward" size={15} color={colors.primary} />
          </AnimatedPressable>
        </View>
        <View style={styles.orderList}>
          {selectedOrders.length === 0 ? (
            <PremiumGlowCard accent={colors.primary2} accent2={colors.cyan} delay={310}>
              <View style={styles.emptyWrap}>
                <Ionicons name="checkmark-done-circle" size={36} color={colors.green} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>Atölye sırası temiz</Text>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>Şu anda sırada bekleyen kayıt bulunmuyor.</Text>
              </View>
            </PremiumGlowCard>
          ) : selectedOrders.map((order: any, index: number) => {
            const accent = order.status === 'parts_waiting' ? colors.orange : order.status === 'ready' || order.status === 'completed' ? colors.green : colors.primary2;
            return (
              <AnimatedEntrance key={order.id} delay={300 + Math.min(index, 6) * 55}>
                <AnimatedPressable onPress={onOpenOrders} style={[styles.orderCard, { backgroundColor: colors.card, borderColor: `${accent}48`, shadowColor: accent }]}> 
                  <LinearGradient colors={[accent, `${accent}20`]} style={styles.orderRail} />
                  <View style={[styles.queueBadge, { backgroundColor: `${colors.orange}18`, borderColor: `${colors.orange}50` }]}><Text style={[styles.queueText, { color: colors.orange }]}>{order.queue_position ?? '-'}</Text></View>
                  <LinearGradient colors={[`${colors.primary2}34`, `${colors.cyan}18`]} style={styles.bikeIcon}><Ionicons name="bicycle" size={25} color={colors.cyan} /></LinearGradient>
                  <View style={styles.orderCopy}>
                    <Text style={[styles.orderTitle, { color: colors.text }]}>{order.motorcycle?.brand ?? order.brand} {order.motorcycle?.model ?? order.model}</Text>
                    <Text style={[styles.orderMeta, { color: colors.textMuted }]}>{order.motorcycle?.plate ?? order.plate ?? 'Plaka yok'} • {order.complaint}</Text>
                    <Text style={[styles.orderTime, { color: colors.textMuted }]}>{shortDate(order.arrived_at)} • {order.service_type === 'quick' ? 'Hızlı servis' : order.service_type === 'appointment' ? 'Randevulu' : 'Bırakılan motor'}</Text>
                  </View>
                  <View style={styles.orderRight}>
                    <StatusPill status={order.status} />
                    {!isApprentice && <Text style={[styles.orderAmount, { color: accent }]}>{money(order.total_amount)}</Text>}
                  </View>
                </AnimatedPressable>
              </AnimatedEntrance>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

function MiniMetric({ label, value, icon, accent }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap; accent: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.miniMetric, { backgroundColor: `${accent}10`, borderColor: `${accent}32` }]}>
      <Ionicons name={icon} size={17} color={accent} />
      <View>
        <Text style={[styles.miniMetricValue, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.miniMetricLabel, { color: colors.textMuted }]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 56, paddingBottom: 120, gap: 18 },
  copy: { flex: 1, minWidth: 0 },
  businessChips: { gap: 9, paddingRight: 18 },
  businessChip: { minHeight: 46, maxWidth: 255, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8, overflow: 'hidden' },
  businessChipRail: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  businessChipText: { flexShrink: 1, fontSize: 12, fontWeight: '900' },
  modeHeader: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 14 },
  modeHeroIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  modeTitle: { fontSize: 16, fontWeight: '900' },
  modeSubtitle: { fontSize: 11, lineHeight: 17, marginTop: 4 },
  panelSwitch: { flexDirection: 'row', gap: 7, padding: 5, borderRadius: 18, borderWidth: 1 },
  panelSwitchItem: { flex: 1, minWidth: 0, minHeight: 72, borderRadius: 14, borderWidth: 1, overflow: 'hidden', alignItems: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 9 },
  panelSwitchIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  panelSwitchCopy: { flex: 1, minWidth: 0 },
  panelSwitchTitle: { fontSize: 11, fontWeight: '900' },
  panelSwitchHint: { fontSize: 8.5, fontWeight: '800', marginTop: 3 },
  availabilitySection: { gap: 12 },
  sectionHeaderCompact: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  liveBadge: { minHeight: 32, borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 2 },
  liveBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  availabilityGrid: { flexDirection: 'row', gap: 8 },
  availabilityCell: { flex: 1 },
  availabilityCard: { minHeight: 168, borderWidth: 1, borderRadius: 20, padding: 11, overflow: 'hidden', shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  availabilityRail: { position: 'absolute', left: 0, top: 0, right: 0, height: 3 },
  availabilityTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  availabilityIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  availabilityTitle: { fontSize: 15, fontWeight: '900', marginTop: 11 },
  availabilitySubtitle: { fontSize: 10.5, fontWeight: '800', lineHeight: 15, marginTop: 5 },
  availabilityDetail: { fontSize: 8.5, lineHeight: 13, marginTop: 6 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  heroLiveRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroLabel: { fontWeight: '900', fontSize: 10, letterSpacing: 1.1 },
  heroValue: { fontWeight: '900', fontSize: 39, letterSpacing: -1.4, marginTop: 8 },
  heroHint: { fontSize: 12, lineHeight: 17, marginTop: 5 },
  heroIcon: { width: 59, height: 59, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.24, shadowRadius: 10, elevation: 7 },
  metricStrip: { flexDirection: 'row', gap: 8, marginTop: 17 },
  miniMetric: { flex: 1, minHeight: 62, borderWidth: 1, borderRadius: 16, padding: 9, flexDirection: 'row', alignItems: 'center', gap: 7 },
  miniMetricValue: { fontSize: 15, fontWeight: '900' },
  miniMetricLabel: { fontSize: 7.5, fontWeight: '900', letterSpacing: 0.6, marginTop: 2 },
  quickGrid: { gap: 11 },
  quickAction: { minHeight: 94, borderWidth: 1, borderRadius: 23, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden', shadowOpacity: 0.18, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  quickIcon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  quickTitle: { fontSize: 17, fontWeight: '900' },
  quickText: { fontSize: 11, lineHeight: 17, marginTop: 4 },
  quickArrow: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  section: { gap: 13, marginTop: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 },
  sectionTitle: { fontSize: 19, fontWeight: '900' },
  sectionSubtitle: { fontSize: 11.5, marginTop: 4, lineHeight: 17 },
  linkButton: { minHeight: 38, borderWidth: 1, borderRadius: 13, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 5 },
  link: { fontSize: 10.5, fontWeight: '900' },
  orderList: { gap: 11 },
  orderCard: { borderWidth: 1, borderRadius: 23, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 9, overflow: 'hidden', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 7 }, elevation: 4 },
  orderRail: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  queueBadge: { width: 34, height: 34, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  queueText: { fontWeight: '900', fontSize: 13 },
  bikeIcon: { width: 47, height: 47, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  orderCopy: { flex: 1, minWidth: 0 },
  orderTitle: { fontSize: 14, fontWeight: '900' },
  orderMeta: { fontSize: 10.5, marginTop: 3 },
  orderTime: { fontSize: 9.5, marginTop: 4 },
  orderRight: { alignItems: 'flex-end', gap: 8 },
  orderAmount: { fontSize: 12, fontWeight: '900' },
  emptyWrap: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '900' },
  emptyText: { textAlign: 'center', fontSize: 11.5, lineHeight: 17 },
});
