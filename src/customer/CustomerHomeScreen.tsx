import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { GlassCard } from '../components/GlassCard';
import { ScreenHeader } from '../components/ScreenHeader';
import { StatusPill } from '../components/StatusPill';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { money, shortDate } from '../lib/format';
import { supabase } from '../lib/supabase';
import { CustomerServiceRecord } from '../types';
import { CustomerLinkPanel } from './CustomerLinkPanel';

export function CustomerHomeScreen({ onOpenServices }: { onOpenServices: () => void }) {
  const { colors } = useTheme();
  const { profile, customerWorkshop, customerWorkshops, selectCustomerWorkshop, refreshWorkspace } = useAuth();
  const [services, setServices] = useState<CustomerServiceRecord[]>([]);
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

  const active = useMemo(() => services.filter((item) => !['delivered', 'cancelled'].includes(item.status)), [services]);
  const history = useMemo(() => services.filter((item) => ['delivered', 'cancelled'].includes(item.status)).slice(0, 3), [services]);
  const outstanding = active.reduce((sum, item) => sum + Number(item.remaining_amount || 0), 0);

  const refresh = async () => {
    setRefreshing(true);
    await refreshWorkspace(undefined, customerWorkshop?.workshop_id ?? null);
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
        eyebrow="MÜŞTERİ PANELİ"
        title={`Merhaba, ${profile?.full_name?.split(' ')[0] ?? 'Sürücü'}`}
        subtitle={customerWorkshop ? `${customerWorkshop.workshop_name} • Motor ve servis takibin` : 'Motorunu güvenle bağla ve servis sürecini takip et.'}
        actionIcon="notifications-outline"
        onAction={() => undefined}
      />

      {customerWorkshops.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.workshopChips}>
          {customerWorkshops.map((item) => {
            const activeItem = item.workshop_id === customerWorkshop?.workshop_id;
            return (
              <AnimatedPressable
                key={item.workshop_id}
                onPress={() => selectCustomerWorkshop(item.workshop_id)}
                style={[styles.workshopChip, { backgroundColor: activeItem ? colors.primary : colors.card, borderColor: activeItem ? colors.primary : colors.border }]}
              >
                <Ionicons name="business" size={17} color={activeItem ? '#fff' : colors.cyan} />
                <Text numberOfLines={1} style={[styles.workshopChipText, { color: activeItem ? '#fff' : colors.text }]}>{item.workshop_name}</Text>
              </AnimatedPressable>
            );
          })}
        </ScrollView>
      )}

      {!customerWorkshop ? (
        <CustomerLinkPanel onLinked={() => refreshWorkspace()} />
      ) : (
        <>
          <LinearGradient colors={[colors.primary, colors.primary2, colors.cyan]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={styles.heroGlow} />
            <View style={styles.heroTop}>
              <View>
                <Text style={styles.heroLabel}>AKTİF SERVİS</Text>
                <Text style={styles.heroValue}>{active.length}</Text>
              </View>
              <View style={styles.heroIcon}><Ionicons name="bicycle" size={30} color="#fff" /></View>
            </View>
            <View style={styles.heroBottom}>
              <View><Text style={styles.heroSmall}>KALAN ÖDEME</Text><Text style={styles.heroAmount}>{money(outstanding)}</Text></View>
              <View style={styles.heroWorkshop}><Ionicons name="business" size={15} color="#fff" /><Text numberOfLines={1} style={styles.heroWorkshopText}>{customerWorkshop.workshop_name}</Text></View>
            </View>
          </LinearGradient>

          <View style={styles.sectionHeader}>
            <View style={styles.copy}><Text style={[styles.sectionTitle, { color: colors.text }]}>Aktif Servisler</Text><Text style={[styles.sectionText, { color: colors.textMuted }]}>Motorunun atölyedeki son durumunu canlı takip et.</Text></View>
            <AnimatedPressable onPress={onOpenServices}><Text style={[styles.link, { color: colors.primary }]}>Tümü</Text></AnimatedPressable>
          </View>

          {active.length === 0 ? (
            <GlassCard style={styles.emptyCard}>
              <View style={[styles.emptyIcon, { backgroundColor: `${colors.green}16` }]}><Ionicons name="checkmark-done" size={30} color={colors.green} /></View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Aktif servis yok</Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Bu işletmede devam eden bir servis kaydın bulunmuyor.</Text>
            </GlassCard>
          ) : active.map((item) => (
            <AnimatedPressable key={item.id} onPress={onOpenServices} style={[styles.serviceCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
              <View style={styles.serviceTop}>
                <View style={[styles.bikeIcon, { backgroundColor: `${colors.primary2}18` }]}><Ionicons name="bicycle" size={24} color={colors.primary2} /></View>
                <View style={styles.copy}><Text style={[styles.serviceTitle, { color: colors.text }]}>{item.brand} {item.model}</Text><Text style={[styles.serviceMeta, { color: colors.textMuted }]}>{item.plate || 'Plaka yok'} • {shortDate(item.arrived_at)}</Text></View>
                <StatusPill status={item.status} />
              </View>
              <Text numberOfLines={2} style={[styles.complaint, { color: colors.textSoft }]}>{item.complaint}</Text>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.serviceBottom}>
                <View><Text style={[styles.smallLabel, { color: colors.textMuted }]}>FİYAT</Text><Text style={[styles.smallValue, { color: colors.text }]}>{item.price_type === 'estimated' ? `${money(item.estimated_price_min)} – ${money(item.estimated_price_max)}` : money(item.quoted_price ?? item.total_amount)}</Text></View>
                <View style={styles.right}><Text style={[styles.smallLabel, { color: colors.textMuted }]}>KALAN</Text><Text style={[styles.remaining, { color: item.remaining_amount > 0 ? colors.orange : colors.green }]}>{money(item.remaining_amount)}</Text></View>
              </View>
            </AnimatedPressable>
          ))}

          {history.length > 0 && (
            <>
              <View style={styles.sectionHeader}><View><Text style={[styles.sectionTitle, { color: colors.text }]}>Son Servisler</Text><Text style={[styles.sectionText, { color: colors.textMuted }]}>Seçili işletmedeki yakın geçmiş.</Text></View></View>
              <GlassCard style={styles.historyCard}>
                {history.map((item, index) => (
                  <View key={item.id} style={[styles.historyRow, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}> 
                    <View style={[styles.historyIcon, { backgroundColor: `${colors.green}14` }]}><Ionicons name="checkmark-circle" size={21} color={colors.green} /></View>
                    <View style={styles.copy}><Text style={[styles.historyTitle, { color: colors.text }]}>{item.brand} {item.model} • {item.complaint}</Text><Text style={[styles.historyMeta, { color: colors.textMuted }]}>{shortDate(item.arrived_at)} • {item.workshop_name}</Text></View>
                    <Text style={[styles.historyAmount, { color: colors.text }]}>{money(item.total_amount)}</Text>
                  </View>
                ))}
              </GlassCard>
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 56, paddingBottom: 120, gap: 16 },
  workshopChips: { gap: 9, paddingRight: 18 },
  workshopChip: { maxWidth: 260, minHeight: 42, borderWidth: 1, borderRadius: 15, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 7 },
  workshopChipText: { flexShrink: 1, fontSize: 12, fontWeight: '900' },
  hero: { borderRadius: 28, minHeight: 190, padding: 21, overflow: 'hidden', justifyContent: 'space-between', shadowColor: '#6358FF', shadowOpacity: 0.34, shadowRadius: 22, elevation: 11 },
  heroGlow: { position: 'absolute', width: 210, height: 210, borderRadius: 210, backgroundColor: 'rgba(255,255,255,0.13)', right: -65, top: -95 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between' },
  heroLabel: { color: 'rgba(255,255,255,0.76)', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  heroValue: { color: '#fff', fontSize: 46, fontWeight: '900', marginTop: 3 },
  heroIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  heroBottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  heroSmall: { color: 'rgba(255,255,255,0.72)', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  heroAmount: { color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 4 },
  heroWorkshop: { maxWidth: 190, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.16)' },
  heroWorkshopText: { flexShrink: 1, color: '#fff', fontSize: 10, fontWeight: '900' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, marginTop: 2 },
  copy: { flex: 1, minWidth: 0 },
  sectionTitle: { fontSize: 19, fontWeight: '900' },
  sectionText: { fontSize: 12, lineHeight: 17, marginTop: 4 },
  link: { fontSize: 12, fontWeight: '900' },
  serviceCard: { borderWidth: 1, borderRadius: 23, padding: 15, gap: 12 },
  serviceTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bikeIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  serviceTitle: { fontSize: 15, fontWeight: '900' },
  serviceMeta: { fontSize: 11, marginTop: 3 },
  complaint: { fontSize: 13, lineHeight: 19 },
  divider: { height: 1 },
  serviceBottom: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  smallLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  smallValue: { fontSize: 12, fontWeight: '900', marginTop: 4 },
  right: { alignItems: 'flex-end' },
  remaining: { fontSize: 16, fontWeight: '900', marginTop: 3 },
  emptyCard: { alignItems: 'center', gap: 10, paddingVertical: 28 },
  emptyIcon: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '900' },
  emptyText: { fontSize: 12, textAlign: 'center' },
  historyCard: { paddingVertical: 3, paddingHorizontal: 14 },
  historyRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 10 },
  historyIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  historyTitle: { fontSize: 12, fontWeight: '900' },
  historyMeta: { fontSize: 10, marginTop: 4 },
  historyAmount: { fontSize: 12, fontWeight: '900' },
});
