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
  const [motorcycles, setMotorcycles] = useState<CustomerMotorcycle[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!customerWorkshop) {
      setMotorcycles([]);
      return;
    }
    const { data } = await supabase.rpc('customer_get_motorcycles', { p_workshop_id: customerWorkshop.workshop_id });
    setMotorcycles((data as CustomerMotorcycle[] | null) ?? []);
  }, [customerWorkshop]);

  useEffect(() => { load(); }, [load]);

  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}>
      <ScreenHeader eyebrow="MOTORLARIM" title="Garajım" subtitle={customerWorkshop ? `${customerWorkshop.workshop_name} işletmesine kayıtlı motorların.` : 'Bir motor eşleştirerek dijital garajını oluştur.'} />

      {!customerWorkshop ? <CustomerLinkPanel /> : motorcycles.length === 0 ? (
        <GlassCard style={styles.empty}>
          <Ionicons name="bicycle-outline" size={44} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Motor bulunamadı</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Bu işletme bağlantısında henüz motosiklet görünmüyor.</Text>
        </GlassCard>
      ) : motorcycles.map((item) => (
        <GlassCard key={item.id} style={styles.card}>
          <View style={styles.top}>
            <View style={[styles.icon, { backgroundColor: `${colors.primary2}18` }]}><Ionicons name="bicycle" size={29} color={colors.primary2} /></View>
            <View style={styles.copy}>
              <Text style={[styles.title, { color: colors.text }]}>{item.brand} {item.model}</Text>
              <Text style={[styles.meta, { color: colors.textMuted }]}>{item.plate || 'Plaka yok'}{item.year ? ` • ${item.year}` : ''}{item.color ? ` • ${item.color}` : ''}</Text>
            </View>
            {item.latest_status && <StatusPill status={item.latest_status} />}
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.stats}>
            <View style={[styles.stat, { backgroundColor: colors.surfaceSoft }]}><Text style={[styles.statValue, { color: colors.text }]}>{item.service_count}</Text><Text style={[styles.statLabel, { color: colors.textMuted }]}>Servis</Text></View>
            <View style={[styles.stat, { backgroundColor: colors.surfaceSoft }]}><Text style={[styles.statValue, { color: item.active_service_count > 0 ? colors.orange : colors.green }]}>{item.active_service_count}</Text><Text style={[styles.statLabel, { color: colors.textMuted }]}>Aktif</Text></View>
            <View style={[styles.stat, { backgroundColor: colors.surfaceSoft }]}><Text style={[styles.statValue, { color: colors.text }]}>{item.odometer ? item.odometer.toLocaleString('tr-TR') : '-'}</Text><Text style={[styles.statLabel, { color: colors.textMuted }]}>Son km</Text></View>
          </View>

          <View style={styles.footer}>
            <Ionicons name="time-outline" size={16} color={colors.textMuted} />
            <Text style={[styles.footerText, { color: colors.textMuted }]}>{item.last_service_at ? `Son servis: ${shortDate(item.last_service_at)}` : 'Henüz servis geçmişi yok'}</Text>
          </View>
        </GlassCard>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 56, paddingBottom: 120, gap: 14 },
  card: { gap: 13 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  icon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  title: { fontSize: 17, fontWeight: '900' },
  meta: { fontSize: 11, marginTop: 4 },
  divider: { height: 1 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, minHeight: 72, borderRadius: 16, padding: 11, justifyContent: 'center' },
  statValue: { fontSize: 18, fontWeight: '900' },
  statLabel: { fontSize: 9, fontWeight: '800', marginTop: 4 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  footerText: { fontSize: 11 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 34 },
  emptyTitle: { fontSize: 18, fontWeight: '900' },
  emptyText: { fontSize: 12, textAlign: 'center' },
});
