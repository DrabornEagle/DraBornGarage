import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { GlassCard } from '../components/GlassCard';
import { ScreenHeader } from '../components/ScreenHeader';
import { StatusPill, statusLabels } from '../components/StatusPill';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { money, shortDate } from '../lib/format';
import { supabase } from '../lib/supabase';
import { CustomerServiceRecord, WorkOrderStatus } from '../types';
import { CustomerLinkPanel } from './CustomerLinkPanel';

type ServiceFilter = 'all' | 'active' | 'ready' | 'history';

const timeline: WorkOrderStatus[] = ['received', 'queued', 'precheck', 'price_entered', 'approval_waiting', 'repair_started', 'parts_waiting', 'testing', 'ready', 'delivered'];

export function CustomerServicesScreen() {
  const { colors } = useTheme();
  const { customerWorkshop } = useAuth();
  const [services, setServices] = useState<CustomerServiceRecord[]>([]);
  const [selected, setSelected] = useState<CustomerServiceRecord | null>(null);
  const [filter, setFilter] = useState<ServiceFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!customerWorkshop) {
      setServices([]);
      return;
    }
    const { data } = await supabase.rpc('customer_get_services', { p_workshop_id: customerWorkshop.workshop_id });
    setServices((data as CustomerServiceRecord[] | null) ?? []);
  }, [customerWorkshop]);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => services.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'active') return !['ready', 'delivered', 'cancelled'].includes(item.status);
    if (filter === 'ready') return item.status === 'ready';
    return ['delivered', 'cancelled'].includes(item.status);
  }), [filter, services]);

  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  if (selected) return <CustomerServiceDetail item={selected} onBack={() => setSelected(null)} />;

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}>
      <ScreenHeader eyebrow="SERVİS TAKİBİ" title="Servislerim" subtitle={customerWorkshop ? `${customerWorkshop.workshop_name} içindeki aktif ve geçmiş servis kayıtların.` : 'Motorunu eşleştirdiğinde servis kayıtların burada görünür.'} />

      {!customerWorkshop ? <CustomerLinkPanel /> : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
            {([
              ['all', 'Tümü'],
              ['active', 'Aktif'],
              ['ready', 'Motor Hazır'],
              ['history', 'Geçmiş'],
            ] as [ServiceFilter, string][]).map(([value, label]) => (
              <AnimatedPressable key={value} onPress={() => setFilter(value)} style={[styles.filter, { backgroundColor: filter === value ? colors.primary : colors.card, borderColor: filter === value ? colors.primary : colors.border }]}> 
                <Text style={[styles.filterText, { color: filter === value ? '#fff' : colors.textMuted }]}>{label}</Text>
              </AnimatedPressable>
            ))}
          </ScrollView>

          {visible.length === 0 ? (
            <GlassCard style={styles.empty}>
              <Ionicons name="receipt-outline" size={42} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Servis kaydı bulunamadı</Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Seçili filtrede gösterilecek kayıt yok.</Text>
            </GlassCard>
          ) : visible.map((item) => (
            <AnimatedPressable key={item.id} onPress={() => setSelected(item)} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}> 
              <View style={styles.top}>
                <View style={[styles.icon, { backgroundColor: `${colors.primary2}18` }]}><Ionicons name="bicycle" size={25} color={colors.primary2} /></View>
                <View style={styles.copy}><Text style={[styles.title, { color: colors.text }]}>{item.brand} {item.model}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{item.plate || 'Plaka yok'} • {shortDate(item.arrived_at)}</Text></View>
                <StatusPill status={item.status} />
              </View>
              <Text numberOfLines={2} style={[styles.complaint, { color: colors.textSoft }]}>{item.complaint}</Text>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.bottom}>
                <View><Text style={[styles.label, { color: colors.textMuted }]}>TOPLAM</Text><Text style={[styles.value, { color: colors.text }]}>{money(item.total_amount)}</Text></View>
                <View><Text style={[styles.label, { color: colors.textMuted }]}>ÖDENEN</Text><Text style={[styles.value, { color: colors.green }]}>{money(item.amount_received)}</Text></View>
                <View style={styles.right}><Text style={[styles.label, { color: colors.textMuted }]}>KALAN</Text><Text style={[styles.value, { color: item.remaining_amount > 0 ? colors.orange : colors.green }]}>{money(item.remaining_amount)}</Text></View>
              </View>
            </AnimatedPressable>
          ))}
        </>
      )}
    </ScrollView>
  );
}

function CustomerServiceDetail({ item, onBack }: { item: CustomerServiceRecord; onBack: () => void }) {
  const { colors } = useTheme();
  const currentIndex = timeline.indexOf(item.status);
  const priceText = item.price_type === 'estimated'
    ? `${money(item.estimated_price_min)} – ${money(item.estimated_price_max)}`
    : money(item.quoted_price ?? item.total_amount);

  return (
    <ScrollView contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
      <View style={styles.detailHeader}>
        <AnimatedPressable onPress={onBack} style={[styles.back, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="arrow-back" size={22} color={colors.text} /></AnimatedPressable>
        <View style={styles.copy}><Text style={[styles.detailTitle, { color: colors.text }]}>{item.brand} {item.model}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{item.plate || 'Plaka yok'} • {item.workshop_name}</Text></View>
        <StatusPill status={item.status} />
      </View>

      <GlassCard style={styles.summary}>
        <View style={styles.summaryTop}><View style={[styles.largeIcon, { backgroundColor: `${colors.primary}18` }]}><Ionicons name="construct" size={27} color={colors.primary} /></View><View style={styles.copy}><Text style={[styles.summaryTitle, { color: colors.text }]}>{item.complaint}</Text><Text style={[styles.summaryMeta, { color: colors.textMuted }]}>{shortDate(item.arrived_at)} • {item.service_type === 'quick' ? 'Hızlı Servis' : item.service_type === 'appointment' ? 'Randevulu Servis' : 'Bırakılan Motor'}</Text></View></View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.priceGrid}>
          <View style={[styles.priceBox, { backgroundColor: colors.surfaceSoft }]}><Text style={[styles.label, { color: colors.textMuted }]}>BİLDİRİLEN FİYAT</Text><Text style={[styles.priceValue, { color: colors.text }]}>{priceText}</Text></View>
          <View style={[styles.priceBox, { backgroundColor: colors.surfaceSoft }]}><Text style={[styles.label, { color: colors.textMuted }]}>KALAN ÖDEME</Text><Text style={[styles.priceValue, { color: item.remaining_amount > 0 ? colors.orange : colors.green }]}>{money(item.remaining_amount)}</Text></View>
        </View>
      </GlassCard>

      <View><Text style={[styles.sectionTitle, { color: colors.text }]}>Servis Süreci</Text><Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>İşletmenin güncellediği durum adım adım gösterilir.</Text></View>
      <GlassCard style={styles.timelineCard}>
        {timeline.map((status, index) => {
          const reached = currentIndex >= index || item.status === 'delivered';
          const current = item.status === status;
          return (
            <View key={status} style={styles.timelineRow}>
              <View style={styles.timelineVisual}>
                <View style={[styles.timelineDot, { backgroundColor: reached ? (current ? colors.orange : colors.green) : colors.surfaceSoft, borderColor: reached ? (current ? colors.orange : colors.green) : colors.border }]}>{reached && <Ionicons name={current ? 'radio-button-on' : 'checkmark'} size={12} color="#fff" />}</View>
                {index < timeline.length - 1 && <View style={[styles.timelineLine, { backgroundColor: reached && currentIndex > index ? colors.green : colors.border }]} />}
              </View>
              <View style={styles.timelineCopy}><Text style={[styles.timelineTitle, { color: reached ? colors.text : colors.textMuted }]}>{statusLabels[status]}</Text>{current && <Text style={[styles.timelineCurrent, { color: colors.orange }]}>Şu an bu aşamada</Text>}</View>
            </View>
          );
        })}
      </GlassCard>

      <View><Text style={[styles.sectionTitle, { color: colors.text }]}>İşlem Kalemleri</Text><Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>İşletmenin müşteriyle paylaştığı servis işlemleri.</Text></View>
      <GlassCard style={styles.itemsCard}>
        {item.service_items.length === 0 ? <Text style={[styles.emptyText, { color: colors.textMuted }]}>Henüz işlem kalemi paylaşılmadı.</Text> : item.service_items.map((service, index) => (
          <View key={`${service.title}-${index}`} style={[styles.itemRow, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}> 
            <View style={[styles.itemIcon, { backgroundColor: `${service.completed ? colors.green : colors.orange}14` }]}><Ionicons name={service.completed ? 'checkmark-circle' : 'time'} size={20} color={service.completed ? colors.green : colors.orange} /></View>
            <View style={styles.copy}><Text style={[styles.itemTitle, { color: colors.text }]}>{service.title}</Text><Text style={[styles.itemMeta, { color: colors.textMuted }]}>{service.completed ? 'Tamamlandı' : 'Planlandı / devam ediyor'}</Text></View>
            <Text style={[styles.itemAmount, { color: colors.text }]}>{money(service.price)}</Text>
          </View>
        ))}
      </GlassCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 56, paddingBottom: 120, gap: 15 },
  filters: { gap: 8, paddingRight: 18 },
  filter: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 15, paddingVertical: 10 },
  filterText: { fontSize: 11, fontWeight: '900' },
  card: { borderWidth: 1, borderRadius: 23, padding: 15, gap: 12 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, fontWeight: '900' },
  meta: { fontSize: 11, marginTop: 3 },
  complaint: { fontSize: 13, lineHeight: 19 },
  divider: { height: 1 },
  bottom: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  right: { alignItems: 'flex-end' },
  label: { fontSize: 8.5, fontWeight: '900', letterSpacing: 0.7 },
  value: { fontSize: 13, fontWeight: '900', marginTop: 4 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 34 },
  emptyTitle: { fontSize: 18, fontWeight: '900' },
  emptyText: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  detailContent: { paddingHorizontal: 18, paddingTop: 56, paddingBottom: 120, gap: 16 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  back: { width: 46, height: 46, borderWidth: 1, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  detailTitle: { fontSize: 20, fontWeight: '900' },
  summary: { gap: 13 },
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  largeIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  summaryTitle: { fontSize: 15, fontWeight: '900' },
  summaryMeta: { fontSize: 11, marginTop: 4 },
  priceGrid: { flexDirection: 'row', gap: 9 },
  priceBox: { flex: 1, minHeight: 78, borderRadius: 16, padding: 12, justifyContent: 'center' },
  priceValue: { fontSize: 15, fontWeight: '900', marginTop: 5 },
  sectionTitle: { fontSize: 19, fontWeight: '900' },
  sectionSubtitle: { fontSize: 12, lineHeight: 17, marginTop: 4 },
  timelineCard: { paddingVertical: 14 },
  timelineRow: { flexDirection: 'row', minHeight: 58 },
  timelineVisual: { width: 34, alignItems: 'center' },
  timelineDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  timelineLine: { width: 2, flex: 1 },
  timelineCopy: { flex: 1, paddingTop: 3 },
  timelineTitle: { fontSize: 13, fontWeight: '900' },
  timelineCurrent: { fontSize: 10, fontWeight: '900', marginTop: 4 },
  itemsCard: { paddingVertical: 3, paddingHorizontal: 14 },
  itemRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemIcon: { width: 39, height: 39, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontSize: 13, fontWeight: '900' },
  itemMeta: { fontSize: 10, marginTop: 4 },
  itemAmount: { fontSize: 12, fontWeight: '900' },
});
