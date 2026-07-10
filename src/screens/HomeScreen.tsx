import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { GlassCard } from '../components/GlassCard';
import { ScreenHeader } from '../components/ScreenHeader';
import { StatCard } from '../components/StatCard';
import { StatusPill } from '../components/StatusPill';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { money, shortDate, todayIsoStart } from '../lib/format';
import { supabase } from '../lib/supabase';
import { DashboardStats, WorkOrderListItem } from '../types';

interface TeamTotal {
  mechanic_id: string;
  full_name: string;
  total: number;
  count: number;
}

export function HomeScreen({ onNewOrder, onOpenOrders }: { onNewOrder: () => void; onOpenOrders: () => void }) {
  const { colors } = useTheme();
  const { profile, workshop, membership } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({ activeOrders: 0, waitingOrders: 0, todayCompleted: 0, todayIncome: 0, mechanicRecordedTotal: 0 });
  const [recent, setRecent] = useState<WorkOrderListItem[]>([]);
  const [teamTotals, setTeamTotals] = useState<TeamTotal[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const isOwner = membership?.role === 'owner';

  const load = useCallback(async () => {
    if (!workshop || !membership) return;
    const today = todayIsoStart();
    let orderQuery = supabase
      .from('work_orders')
      .select('id,status,payment_status,complaint,total_amount,amount_received,arrived_at,assigned_mechanic_id,customer:customers(full_name,phone),motorcycle:motorcycles(brand,model,plate),mechanic:profiles!work_orders_assigned_mechanic_id_fkey(full_name)')
      .eq('workshop_id', workshop.id)
      .order('arrived_at', { ascending: false })
      .limit(8);
    if (!isOwner) orderQuery = orderQuery.eq('assigned_mechanic_id', membership.user_id);

    const [ordersResult, todayOrdersResult, paymentsResult, servicesResult] = await Promise.all([
      orderQuery,
      supabase.from('work_orders').select('id,status,assigned_mechanic_id').eq('workshop_id', workshop.id).gte('arrived_at', today),
      supabase.from('payments').select('amount').eq('workshop_id', workshop.id).gte('paid_at', today),
      supabase.from('work_order_services').select('mechanic_id,price,completed,mechanic:profiles!work_order_services_mechanic_id_fkey(full_name)').eq('workshop_id', workshop.id).eq('completed', true).gte('created_at', today),
    ]);

    const todayOrders = todayOrdersResult.data ?? [];
    const visibleToday = isOwner ? todayOrders : todayOrders.filter((order) => order.assigned_mechanic_id === membership.user_id);
    const services = servicesResult.data ?? [];
    const ownServices = services.filter((service) => service.mechanic_id === membership.user_id);
    const income = isOwner
      ? (paymentsResult.data ?? []).reduce((sum, payment) => sum + Number(payment.amount), 0)
      : ownServices.reduce((sum, service) => sum + Number(service.price), 0);

    setStats({
      activeOrders: visibleToday.filter((order) => order.status === 'waiting' || order.status === 'in_progress').length,
      waitingOrders: visibleToday.filter((order) => order.status === 'waiting').length,
      todayCompleted: visibleToday.filter((order) => order.status === 'completed' || order.status === 'delivered').length,
      todayIncome: income,
      mechanicRecordedTotal: ownServices.reduce((sum, service) => sum + Number(service.price), 0),
    });
    setRecent((ordersResult.data as unknown as WorkOrderListItem[]) ?? []);

    if (isOwner) {
      const grouped = new Map<string, TeamTotal>();
      services.forEach((item: any) => {
        if (!item.mechanic_id) return;
        const current = grouped.get(item.mechanic_id) ?? {
          mechanic_id: item.mechanic_id,
          full_name: item.mechanic?.full_name ?? 'Usta',
          total: 0,
          count: 0,
        };
        current.total += Number(item.price);
        current.count += 1;
        grouped.set(item.mechanic_id, current);
      });
      setTeamTotals(Array.from(grouped.values()).sort((a, b) => b.total - a.total));
    }
  }, [workshop, membership, isOwner]);

  useEffect(() => { load(); }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
    >
      <ScreenHeader
        eyebrow={isOwner ? 'İŞLETME SAHİBİ PANELİ' : 'USTA PANELİ'}
        title={`Merhaba, ${profile?.full_name?.split(' ')[0] ?? 'Usta'}`}
        subtitle={`${workshop?.name ?? 'DraBornGarage'} • ${new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}`}
        actionIcon="notifications-outline"
        onAction={() => undefined}
      />

      <LinearGradient colors={[colors.primary, colors.primary2, colors.cyan]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroGlow} />
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroLabel}>{isOwner ? 'BUGÜN TAHSİL EDİLEN' : 'BUGÜN KAYDEDİLEN İŞ TUTARI'}</Text>
            <Text style={styles.heroValue}>{money(stats.todayIncome)}</Text>
          </View>
          <View style={styles.heroIcon}><Ionicons name="speedometer" size={28} color="#fff" /></View>
        </View>
        <View style={styles.heroBottom}>
          <Text style={styles.heroHint}>{stats.activeOrders} aktif motosiklet • {stats.todayCompleted} tamamlanan iş</Text>
          <AnimatedPressable onPress={onNewOrder} style={styles.heroButton}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.heroButtonText}>Yeni servis</Text>
          </AnimatedPressable>
        </View>
      </LinearGradient>

      <View style={styles.statsRow}>
        <StatCard label="Aktif İş" value={String(stats.activeOrders)} icon="construct" accent={colors.primary2} />
        <StatCard label="Bekleyen" value={String(stats.waitingOrders)} icon="time" accent={colors.orange} />
      </View>
      <View style={styles.statsRow}>
        <StatCard label="Tamamlanan" value={String(stats.todayCompleted)} icon="checkmark-done" accent={colors.green} />
        <StatCard label={isOwner ? 'Günlük Tahsilat' : 'Usta Toplamı'} value={money(isOwner ? stats.todayIncome : stats.mechanicRecordedTotal)} icon="wallet" accent={colors.cyan} />
      </View>

      {isOwner && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Usta bazlı bugün</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>Maaş veya pay hesabı değil; kaydedilen servis tutarları.</Text>
            </View>
          </View>
          <GlassCard style={styles.teamCard}>
            {teamTotals.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Bugün tamamlanmış usta işlemi bulunmuyor.</Text>
            ) : teamTotals.map((item, index) => (
              <View key={item.mechanic_id} style={[styles.teamRow, index > 0 && { borderTopColor: colors.border, borderTopWidth: 1 }]}> 
                <View style={[styles.avatar, { backgroundColor: `${colors.primary}22` }]}><Text style={[styles.avatarText, { color: colors.primary }]}>{item.full_name.charAt(0)}</Text></View>
                <View style={styles.teamCopy}>
                  <Text style={[styles.teamName, { color: colors.text }]}>{item.full_name}</Text>
                  <Text style={[styles.teamMeta, { color: colors.textMuted }]}>{item.count} tamamlanan işlem</Text>
                </View>
                <Text style={[styles.teamAmount, { color: colors.green }]}>{money(item.total)}</Text>
              </View>
            ))}
          </GlassCard>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Son motosikletler</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>{isOwner ? 'İşletmedeki son servis hareketleri' : 'Sana atanmış son işler'}</Text>
          </View>
          <AnimatedPressable onPress={onOpenOrders}><Text style={[styles.link, { color: colors.primary }]}>Tümünü gör</Text></AnimatedPressable>
        </View>
        <View style={styles.orderList}>
          {recent.length === 0 ? (
            <GlassCard><Text style={[styles.emptyText, { color: colors.textMuted }]}>Henüz servis kaydı yok. İlk motosikleti ekleyerek başlayabilirsin.</Text></GlassCard>
          ) : recent.map((order) => (
            <AnimatedPressable key={order.id} onPress={onOpenOrders} style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
              <View style={[styles.bikeIcon, { backgroundColor: `${colors.primary2}18` }]}><Ionicons name="bicycle" size={24} color={colors.primary2} /></View>
              <View style={styles.orderCopy}>
                <Text style={[styles.orderTitle, { color: colors.text }]}>{order.motorcycle?.brand} {order.motorcycle?.model}</Text>
                <Text style={[styles.orderMeta, { color: colors.textMuted }]}>{order.customer?.full_name} • {order.motorcycle?.plate || 'Plaka yok'}</Text>
                <Text style={[styles.orderTime, { color: colors.textMuted }]}>{shortDate(order.arrived_at)}</Text>
              </View>
              <View style={styles.orderRight}>
                <StatusPill status={order.status} />
                <Text style={[styles.orderAmount, { color: colors.text }]}>{money(order.total_amount)}</Text>
              </View>
            </AnimatedPressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 56, paddingBottom: 120, gap: 18 },
  hero: { borderRadius: 28, padding: 21, minHeight: 190, overflow: 'hidden', justifyContent: 'space-between', shadowColor: '#6158FF', shadowOpacity: 0.36, shadowRadius: 24, elevation: 12 },
  heroGlow: { position: 'absolute', width: 180, height: 180, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.13)', right: -55, top: -70 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroLabel: { color: 'rgba(255,255,255,0.76)', fontWeight: '900', fontSize: 11, letterSpacing: 1.1 },
  heroValue: { color: '#fff', fontWeight: '900', fontSize: 34, letterSpacing: -1.2, marginTop: 7 },
  heroIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  heroBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  heroHint: { color: 'rgba(255,255,255,0.8)', fontSize: 12, flex: 1 },
  heroButton: { backgroundColor: 'rgba(8,12,25,0.32)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', minHeight: 44, paddingHorizontal: 14, borderRadius: 15, flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroButtonText: { color: '#fff', fontWeight: '900', fontSize: 13 },
  statsRow: { flexDirection: 'row', gap: 12 },
  section: { gap: 12, marginTop: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  sectionTitle: { fontSize: 19, fontWeight: '900' },
  sectionSubtitle: { fontSize: 12, marginTop: 4, maxWidth: 290, lineHeight: 17 },
  link: { fontSize: 13, fontWeight: '900' },
  teamCard: { paddingVertical: 6, paddingHorizontal: 16 },
  teamRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '900', fontSize: 17 },
  teamCopy: { flex: 1 },
  teamName: { fontSize: 14, fontWeight: '900' },
  teamMeta: { fontSize: 12, marginTop: 3 },
  teamAmount: { fontSize: 15, fontWeight: '900' },
  orderList: { gap: 10 },
  orderCard: { borderWidth: 1, borderRadius: 22, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  bikeIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  orderCopy: { flex: 1 },
  orderTitle: { fontSize: 15, fontWeight: '900' },
  orderMeta: { fontSize: 12, marginTop: 3 },
  orderTime: { fontSize: 11, marginTop: 4 },
  orderRight: { alignItems: 'flex-end', gap: 8 },
  orderAmount: { fontSize: 13, fontWeight: '900' },
  emptyText: { textAlign: 'center', lineHeight: 20, paddingVertical: 10 },
});
