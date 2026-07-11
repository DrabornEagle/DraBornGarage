import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedMotorcycleIcon } from '../components/AnimatedMotorcycleIcon';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { GlassCard } from '../components/GlassCard';
import { ScreenHeader } from '../components/ScreenHeader';
import { StatusPill } from '../components/StatusPill';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { formatAppointmentDate, formatAppointmentTime } from '../lib/calendar';
import { money, shortDate } from '../lib/format';
import { supabase } from '../lib/supabase';
import { Appointment, CustomerServiceRecord } from '../types';
import { CustomerLinkPanel } from './CustomerLinkPanel';

export function CustomerHomeScreen({ onOpenServices, onOpenAppointments }: { onOpenServices: () => void; onOpenAppointments: () => void }) {
  const { colors } = useTheme();
  const { profile, customerWorkshop, customerWorkshops, businessApplication, selectCustomerWorkshop, refreshWorkspace } = useAuth();
  const [services, setServices] = useState<CustomerServiceRecord[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!customerWorkshop) { setServices([]); setAppointments([]); return; }
    const [serviceResult, appointmentResult] = await Promise.all([
      supabase.rpc('customer_get_services', { p_workshop_id: customerWorkshop.workshop_id }),
      supabase.rpc('customer_get_appointments', { p_workshop_id: customerWorkshop.workshop_id }),
    ]);
    setServices((serviceResult.data as CustomerServiceRecord[] | null) ?? []);
    setAppointments((appointmentResult.data as Appointment[] | null) ?? []);
  }, [customerWorkshop]);

  useEffect(() => { load(); }, [load]);

  const active = useMemo(() => services.filter((item) => !['delivered', 'cancelled'].includes(item.status)), [services]);
  const upcoming = useMemo(() => appointments.filter((item) => ['pending', 'confirmed', 'arrived'].includes(item.status) && new Date(item.scheduled_end) >= new Date()).sort((a, b) => +new Date(a.scheduled_start) - +new Date(b.scheduled_start))[0], [appointments]);
  const remaining = active.reduce((sum, item) => sum + Number(item.remaining_amount || 0), 0);
  const pendingApprovalCount = services.reduce((sum, item) => sum + Number(item.pending_approval_count || 0), 0);
  const openDebt = services.filter((item) => (item as any).receivable_status === 'open' && Number(item.remaining_amount || 0) > 0);
  const openDebtAmount = openDebt.reduce((sum, item) => sum + Number(item.remaining_amount || 0), 0);

  const refresh = async () => { setRefreshing(true); await refreshWorkspace(undefined, customerWorkshop?.workshop_id ?? null); await load(); setRefreshing(false); };

  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}>
    <ScreenHeader eyebrow="MÜŞTERİ PANELİ" title={`Merhaba, ${profile?.full_name?.split(' ')[0] ?? 'Sürücü'}`} subtitle={customerWorkshop ? `${customerWorkshop.workshop_name} • Servis, onay ve randevu merkezi` : 'Motorunu bağla, randevu al ve servisi takip et.'} />

    {businessApplication?.status === 'pending' && <GlassCard style={[styles.applicationCard, { borderColor: `${colors.orange}60`, backgroundColor: `${colors.orange}10` }]}><View style={[styles.applicationIcon, { backgroundColor: `${colors.orange}1C` }]}><Ionicons name="hourglass" size={26} color={colors.orange} /></View><View style={styles.copy}><Text style={[styles.applicationTitle, { color: colors.text }]}>İşletme başvurunuz inceleniyor</Text><Text style={[styles.cardMeta, { color: colors.textMuted }]}>{businessApplication.business_name} • Admin onayından sonra işletme paneliniz otomatik açılacak.</Text></View></GlassCard>}
    {businessApplication?.status === 'rejected' && <GlassCard style={[styles.applicationCard, { borderColor: `${colors.red}55`, backgroundColor: `${colors.red}0D` }]}><View style={[styles.applicationIcon, { backgroundColor: `${colors.red}18` }]}><Ionicons name="close-circle" size={26} color={colors.red} /></View><View style={styles.copy}><Text style={[styles.applicationTitle, { color: colors.text }]}>İşletme başvurunuz sonuçlandı</Text><Text style={[styles.cardMeta, { color: colors.textMuted }]}>{businessApplication.review_note || 'Başvuru şu anda onaylanmadı.'}</Text></View></GlassCard>}

    {customerWorkshops.length > 1 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.workshops}>{customerWorkshops.map((item) => { const selected = item.workshop_id === customerWorkshop?.workshop_id; return <AnimatedPressable key={item.workshop_id} onPress={() => selectCustomerWorkshop(item.workshop_id)} style={[styles.workshopChip, { backgroundColor: selected ? colors.primary : colors.card, borderColor: selected ? colors.primary : colors.border }]}><Ionicons name="business" size={16} color={selected ? '#fff' : colors.cyan} /><Text style={[styles.workshopText, { color: selected ? '#fff' : colors.text }]}>{item.workshop_name}</Text></AnimatedPressable>; })}</ScrollView>}

    {!customerWorkshop ? <CustomerLinkPanel /> : <>
      <LinearGradient colors={[colors.primary, colors.primary2, colors.cyan]} style={styles.hero}>
        <View><Text style={styles.heroLabel}>AKTİF SERVİS</Text><Text style={styles.heroValue}>{active.length}</Text></View>
        <View style={styles.heroRight}><Text style={styles.heroLabel}>KALAN ÖDEME</Text><Text style={styles.heroAmount}>{money(remaining)}</Text></View>
      </LinearGradient>

      {openDebtAmount > 0 && <AnimatedPressable onPress={onOpenServices} style={[styles.approvalCard, { backgroundColor: `${colors.red}12`, borderColor: `${colors.red}50` }]}>
        <View style={[styles.icon, { backgroundColor: `${colors.red}18` }]}><Ionicons name="wallet" size={25} color={colors.red} /></View>
        <View style={styles.copy}><Text style={[styles.approvalTitle, { color: colors.text }]}>Kalan ödemen {money(openDebtAmount)}</Text><Text style={[styles.cardMeta, { color: colors.textMuted }]}>{openDebt.length} servis için borç / veresiye kaydı bulunuyor.</Text></View>
        <Ionicons name="chevron-forward" size={21} color={colors.red} />
      </AnimatedPressable>}

      {pendingApprovalCount > 0 && <AnimatedPressable onPress={onOpenServices} style={[styles.approvalCard, { backgroundColor: `${colors.orange}14`, borderColor: `${colors.orange}58` }]}>
        <View style={[styles.icon, { backgroundColor: `${colors.orange}1C` }]}><Ionicons name="shield-half" size={25} color={colors.orange} /></View>
        <View style={styles.copy}><Text style={[styles.approvalTitle, { color: colors.text }]}>{pendingApprovalCount} ek işlem onayın bekliyor</Text><Text style={[styles.cardMeta, { color: colors.textMuted }]}>Ücret ve açıklamayı inceleyip uygulamadan onayla veya reddet.</Text></View>
        <Ionicons name="chevron-forward" size={21} color={colors.orange} />
      </AnimatedPressable>}

      <AnimatedPressable onPress={onOpenAppointments} style={[styles.appointmentCard, { backgroundColor: upcoming ? `${colors.cyan}13` : colors.card, borderColor: upcoming ? `${colors.cyan}50` : colors.border }]}>
        <View style={[styles.icon, { backgroundColor: `${colors.cyan}18` }]}><Ionicons name="calendar" size={24} color={colors.cyan} /></View>
        <View style={styles.copy}>{upcoming ? <><Text style={[styles.cardTitle, { color: colors.text }]}>{upcoming.service_title}</Text><Text style={[styles.cardMeta, { color: colors.textMuted }]}>{formatAppointmentDate(upcoming.scheduled_start)} • {formatAppointmentTime(upcoming.scheduled_start)} • {upcoming.mechanic_name}</Text></> : <><Text style={[styles.cardTitle, { color: colors.text }]}>Yeni randevu oluştur</Text><Text style={[styles.cardMeta, { color: colors.textMuted }]}>Müsait usta ve saati takvimden seç.</Text></>}</View>
        <Ionicons name="chevron-forward" size={21} color={colors.cyan} />
      </AnimatedPressable>

      <View style={styles.sectionHeader}><View><Text style={[styles.sectionTitle, { color: colors.text }]}>Aktif Servisler</Text><Text style={[styles.sectionText, { color: colors.textMuted }]}>İşletmenin güncellediği canlı durum.</Text></View><AnimatedPressable onPress={onOpenServices}><Text style={[styles.link, { color: colors.primary }]}>Tümü</Text></AnimatedPressable></View>
      {active.length === 0 ? <GlassCard style={styles.empty}><Ionicons name="checkmark-done" size={34} color={colors.green} /><Text style={[styles.emptyTitle, { color: colors.text }]}>Aktif servis yok</Text></GlassCard> : active.slice(0, 3).map((item) => <AnimatedPressable key={item.id} onPress={onOpenServices} style={[styles.serviceCard, { backgroundColor: colors.card, borderColor: Number(item.pending_approval_count || 0) > 0 ? colors.orange : colors.border }]}><View style={styles.serviceTop}><View style={[styles.icon, { backgroundColor: `${colors.primary2}18` }]}><AnimatedMotorcycleIcon size={27} color={colors.primary2} /></View><View style={styles.copy}><Text style={[styles.cardTitle, { color: colors.text }]}>{item.brand} {item.model}</Text><Text style={[styles.cardMeta, { color: colors.textMuted }]}>{item.plate} • {shortDate(item.arrived_at)}</Text>{Number(item.pending_approval_count || 0) > 0 && <Text style={[styles.pendingText, { color: colors.orange }]}>Ek işlem onayın bekliyor</Text>}</View><StatusPill status={item.status} /></View><Text style={[styles.complaint, { color: colors.textSoft }]}>{item.complaint}</Text><View style={styles.moneyRow}><Text style={[styles.money, { color: colors.text }]}>{money(item.total_amount)}</Text><Text style={[styles.money, { color: item.remaining_amount > 0 ? colors.orange : colors.green }]}>Kalan {money(item.remaining_amount)}</Text></View></AnimatedPressable>)}
    </>}
  </ScrollView>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 56, paddingBottom: 32, gap: 15 },
  workshops: { gap: 8, paddingRight: 16 },
  workshopChip: { minHeight: 42, maxWidth: 230, borderWidth: 1, borderRadius: 15, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 7 },
  workshopText: { flexShrink: 1, fontSize: 11, fontWeight: '900' },
  hero: { minHeight: 150, borderRadius: 26, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  heroValue: { color: '#fff', fontSize: 45, fontWeight: '900', marginTop: 5 },
  heroRight: { alignItems: 'flex-end' },
  heroAmount: { color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 7 },
  applicationCard: { minHeight: 88, borderWidth: 1, borderRadius: 22, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 11 },
  applicationIcon: { width: 49, height: 49, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  applicationTitle: { fontSize: 15.5, fontWeight: '900' },
  approvalCard: { minHeight: 82, borderWidth: 1, borderRadius: 22, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
  approvalTitle: { fontSize: 15, fontWeight: '900' },
  appointmentCard: { minHeight: 80, borderWidth: 1, borderRadius: 22, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
  icon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 14, fontWeight: '900' },
  cardMeta: { fontSize: 11.5, lineHeight: 16, marginTop: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  sectionTitle: { fontSize: 18, fontWeight: '900' },
  sectionText: { fontSize: 12, marginTop: 4 },
  link: { fontSize: 11, fontWeight: '900' },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 26 },
  emptyTitle: { fontSize: 16, fontWeight: '900' },
  serviceCard: { borderWidth: 1, borderRadius: 22, padding: 14, gap: 11 },
  serviceTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pendingText: { fontSize: 10.5, fontWeight: '900', marginTop: 4 },
  complaint: { fontSize: 12, lineHeight: 18 },
  moneyRow: { flexDirection: 'row', justifyContent: 'space-between' },
  money: { fontSize: 12, fontWeight: '900' },
});
