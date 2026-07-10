import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GlassCard } from '../components/GlassCard';
import { ScreenHeader } from '../components/ScreenHeader';
import { StatusPill } from '../components/StatusPill';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { shortDate } from '../lib/format';
import { supabase } from '../lib/supabase';
import { CustomerMotorcycle } from '../types';
import { CustomerLinkPanel } from './CustomerLinkPanel';

export function CustomerMotorcyclesScreen() {
  const { colors } = useTheme();
  const { customerWorkshop } = useAuth();
  const [items, setItems] = useState<CustomerMotorcycle[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!customerWorkshop) { setItems([]); return; }
    const { data } = await supabase.rpc('customer_get_motorcycles', { p_workshop_id: customerWorkshop.workshop_id });
    setItems((data as CustomerMotorcycle[] | null) ?? []);
  }, [customerWorkshop]);
  useEffect(() => { load(); }, [load]);

  if (!customerWorkshop) return <ScrollView contentContainerStyle={styles.content}><ScreenHeader eyebrow="MOTORLARIM" title="Garajım" subtitle="Önce motorunu bir işletmeyle eşleştir." /><CustomerLinkPanel /></ScrollView>;

  return <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} />}>
    <ScreenHeader eyebrow="MOTORLARIM" title="Garajım" subtitle={`${customerWorkshop.workshop_name} işletmesine kayıtlı motorların.`} />
    {items.length === 0 ? <GlassCard style={styles.empty}><Ionicons name="bicycle-outline" size={42} color={colors.textMuted} /><Text style={[styles.emptyTitle, { color: colors.text }]}>Motor bulunamadı</Text></GlassCard> : items.map((item) => <GlassCard key={item.id} style={styles.card}>
      <View style={styles.top}><View style={[styles.icon, { backgroundColor: `${colors.primary2}18` }]}><Ionicons name="bicycle" size={28} color={colors.primary2} /></View><View style={styles.copy}><Text style={[styles.title, { color: colors.text }]}>{item.brand} {item.model}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{item.plate || 'Plaka yok'}{item.year ? ` • ${item.year}` : ''}{item.color ? ` • ${item.color}` : ''}</Text></View>{item.latest_status && <StatusPill status={item.latest_status} />}</View>
      <View style={styles.stats}><Stat value={String(item.service_count)} label="Servis" /><Stat value={String(item.active_service_count)} label="Aktif" accent={item.active_service_count > 0 ? colors.orange : colors.green} /><Stat value={item.odometer ? item.odometer.toLocaleString('tr-TR') : '-'} label="Kilometre" /></View>
      <View style={styles.footer}><Ionicons name="time-outline" size={16} color={colors.textMuted} /><Text style={[styles.footerText, { color: colors.textMuted }]}>{item.last_service_at ? `Son servis: ${shortDate(item.last_service_at)}` : 'Henüz servis geçmişi yok'}</Text></View>
    </GlassCard>)}
  </ScrollView>;
}

function Stat({ value, label, accent }: { value: string; label: string; accent?: string }) {
  const { colors } = useTheme();
  return <View style={[styles.stat, { backgroundColor: colors.surfaceSoft }]}><Text style={[styles.statValue, { color: accent ?? colors.text }]}>{value}</Text><Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 56, paddingBottom: 120, gap: 14 }, card: { gap: 13 }, top: { flexDirection: 'row', alignItems: 'center', gap: 10 }, icon: { width: 53, height: 53, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1, minWidth: 0 }, title: { fontSize: 17, fontWeight: '900' }, meta: { fontSize: 11, marginTop: 4 }, stats: { flexDirection: 'row', gap: 8 }, stat: { flex: 1, minHeight: 70, borderRadius: 16, padding: 10, justifyContent: 'center' }, statValue: { fontSize: 17, fontWeight: '900' }, statLabel: { fontSize: 9, marginTop: 4 }, footer: { flexDirection: 'row', alignItems: 'center', gap: 7 }, footerText: { fontSize: 11 }, empty: { alignItems: 'center', gap: 9, paddingVertical: 30 }, emptyTitle: { fontSize: 17, fontWeight: '900' },
});
