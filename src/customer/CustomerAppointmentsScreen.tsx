import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { FormField } from '../components/FormField';
import { GlassCard } from '../components/GlassCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { dateKey, daysFromToday, formatAppointmentDate, formatAppointmentTime, formatCalendarDay } from '../lib/calendar';
import { supabase } from '../lib/supabase';
import { Appointment, AppointmentMechanic, AvailableSlot, CustomerMotorcycle } from '../types';
import { CustomerLinkPanel } from './CustomerLinkPanel';

const statusText: Record<string, string> = {
  pending: 'Onay Bekliyor', confirmed: 'Onaylandı', arrived: 'Geldin', converted: 'Servise Dönüştü', cancelled: 'İptal', no_show: 'Gelmedi',
};

export function CustomerAppointmentsScreen() {
  const { colors } = useTheme();
  const { customerWorkshop } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [motorcycles, setMotorcycles] = useState<CustomerMotorcycle[]>([]);
  const [mechanics, setMechanics] = useState<AppointmentMechanic[]>([]);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [motorcycleId, setMotorcycleId] = useState<string | null>(null);
  const [mechanicId, setMechanicId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(daysFromToday(1)[0]);
  const [slot, setSlot] = useState<AvailableSlot | null>(null);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const dates = useMemo(() => daysFromToday(30), []);

  const load = useCallback(async () => {
    if (!customerWorkshop) { setAppointments([]); setMotorcycles([]); setMechanics([]); return; }
    const [appointmentResult, motorcycleResult, mechanicResult] = await Promise.all([
      supabase.rpc('customer_get_appointments', { p_workshop_id: customerWorkshop.workshop_id }),
      supabase.rpc('customer_get_motorcycles', { p_workshop_id: customerWorkshop.workshop_id }),
      supabase.rpc('customer_get_appointment_mechanics', { p_workshop_id: customerWorkshop.workshop_id }),
    ]);
    setAppointments((appointmentResult.data as Appointment[] | null) ?? []);
    const nextBikes = (motorcycleResult.data as CustomerMotorcycle[] | null) ?? [];
    const nextMechanics = (mechanicResult.data as AppointmentMechanic[] | null) ?? [];
    setMotorcycles(nextBikes); setMechanics(nextMechanics);
    if (!motorcycleId && nextBikes[0]) setMotorcycleId(nextBikes[0].id);
    if (!mechanicId && nextMechanics[0]) setMechanicId(nextMechanics[0].mechanic_id);
  }, [customerWorkshop, mechanicId, motorcycleId]);

  const loadSlots = useCallback(async () => {
    if (!customerWorkshop || !mechanicId) { setSlots([]); return; }
    const { data, error } = await supabase.rpc('appointment_get_available_slots', {
      p_workshop_id: customerWorkshop.workshop_id,
      p_mechanic_id: mechanicId,
      p_date: dateKey(selectedDate),
      p_exclude_appointment_id: null,
    });
    if (error) { setSlots([]); return; }
    setSlots((data as AvailableSlot[] | null) ?? []);
    setSlot(null);
  }, [customerWorkshop, mechanicId, selectedDate]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (showForm) loadSlots(); }, [showForm, loadSlots]);

  const upcoming = appointments.filter((item) => !['cancelled', 'no_show', 'converted'].includes(item.status) && new Date(item.scheduled_end) >= new Date());
  const history = appointments.filter((item) => !upcoming.some((up) => up.id === item.id));

  const create = async () => {
    if (!customerWorkshop || !motorcycleId || !mechanicId || !slot || title.trim().length < 3) return Alert.alert('Eksik bilgi', 'Motor, usta, saat ve yapılacak işlemi seç.');
    setLoading(true);
    const { error } = await supabase.rpc('customer_create_appointment', {
      p_workshop_id: customerWorkshop.workshop_id,
      p_motorcycle_id: motorcycleId,
      p_mechanic_id: mechanicId,
      p_service_title: title.trim(),
      p_customer_note: note.trim() || null,
      p_scheduled_start: slot.slot_start,
      p_scheduled_end: slot.slot_end,
    });
    setLoading(false);
    if (error) return Alert.alert('Randevu oluşturulamadı', error.message);
    setShowForm(false); setTitle(''); setNote(''); setSlot(null); await load();
    Alert.alert('Randevu talebin alındı', 'İşletmenin ayarına göre onaylandı veya usta onayı bekliyor.');
  };

  const cancel = (item: Appointment) => Alert.alert('Randevu iptal edilsin mi?', `${formatAppointmentDate(item.scheduled_start)} ${formatAppointmentTime(item.scheduled_start)}`, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'İptal Et', style: 'destructive', onPress: async () => {
      const { error } = await supabase.rpc('customer_cancel_appointment', { p_appointment_id: item.id, p_reason: 'Müşteri uygulamadan iptal etti' });
      if (error) return Alert.alert('İptal edilemedi', error.message);
      await load();
    } },
  ]);

  const refresh = async () => { setRefreshing(true); await load(); await loadSlots(); setRefreshing(false); };

  if (!customerWorkshop) return <ScrollView contentContainerStyle={styles.content}><ScreenHeader eyebrow="RANDEVU" title="Randevularım" subtitle="Önce motorunu bir işletmeyle eşleştir." /><CustomerLinkPanel /></ScrollView>;

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}>
      <ScreenHeader eyebrow="v0.3 RANDEVU" title="Randevularım" subtitle={`${customerWorkshop.workshop_name} • Uygun usta ve saati seç.`} actionIcon={showForm ? 'close' : 'add'} onAction={() => setShowForm((value) => !value)} />

      {showForm && <GlassCard style={styles.form}>
        <Text style={[styles.formTitle, { color: colors.text }]}>Yeni Randevu</Text>
        <Text style={[styles.label, { color: colors.textMuted }]}>MOTOR</Text>
        <View style={styles.chips}>{motorcycles.map((bike) => <Choice key={bike.id} active={motorcycleId === bike.id} title={`${bike.brand} ${bike.model}`} sub={bike.plate || 'Plaka yok'} onPress={() => setMotorcycleId(bike.id)} />)}</View>
        <Text style={[styles.label, { color: colors.textMuted }]}>USTA</Text>
        <View style={styles.chips}>{mechanics.map((item) => <Choice key={item.mechanic_id} active={mechanicId === item.mechanic_id} title={item.full_name} sub={item.availability_status === 'busy' ? 'Şu an meşgul' : 'Randevuya açık'} onPress={() => setMechanicId(item.mechanic_id)} />)}</View>
        <Text style={[styles.label, { color: colors.textMuted }]}>TARİH</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>{dates.map((date) => <AnimatedPressable key={dateKey(date)} onPress={() => setSelectedDate(date)} style={[styles.dateChip, { backgroundColor: dateKey(selectedDate) === dateKey(date) ? colors.primary : colors.surfaceSoft, borderColor: dateKey(selectedDate) === dateKey(date) ? colors.primary : colors.border }]}><Text style={[styles.dateText, { color: dateKey(selectedDate) === dateKey(date) ? '#fff' : colors.text }]}>{formatCalendarDay(date)}</Text></AnimatedPressable>)}</ScrollView>
        <Text style={[styles.label, { color: colors.textMuted }]}>MÜSAİT SAAT</Text>
        <View style={styles.slotGrid}>{slots.length === 0 ? <Text style={[styles.emptyText, { color: colors.textMuted }]}>Bu gün için uygun saat kalmadı.</Text> : slots.map((item) => <AnimatedPressable key={item.slot_start} onPress={() => setSlot(item)} style={[styles.slot, { backgroundColor: slot?.slot_start === item.slot_start ? `${colors.green}20` : colors.surfaceSoft, borderColor: slot?.slot_start === item.slot_start ? colors.green : colors.border }]}><Text style={[styles.slotText, { color: slot?.slot_start === item.slot_start ? colors.green : colors.text }]}>{item.slot_label}</Text></AnimatedPressable>)}</View>
        <FormField label="Yapılacak işlem" value={title} onChangeText={setTitle} placeholder="Örn. Yağ değişimi ve genel kontrol" multiline />
        <FormField label="Ustaya not (opsiyonel)" value={note} onChangeText={setNote} multiline />
        <PrimaryButton title="Randevu Talebi Oluştur" onPress={create} loading={loading} />
      </GlassCard>}

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Yaklaşan Randevular</Text>
      {upcoming.length === 0 ? <GlassCard style={styles.empty}><Ionicons name="calendar-outline" size={38} color={colors.textMuted} /><Text style={[styles.emptyTitle, { color: colors.text }]}>Yaklaşan randevu yok</Text></GlassCard> : upcoming.map((item) => <AppointmentCard key={item.id} item={item} onCancel={() => cancel(item)} />)}

      {history.length > 0 && <><Text style={[styles.sectionTitle, { color: colors.text }]}>Geçmiş</Text>{history.slice(0, 10).map((item) => <AppointmentCard key={item.id} item={item} />)}</>}
    </ScrollView>
  );
}

function Choice({ active, title, sub, onPress }: { active: boolean; title: string; sub: string; onPress: () => void }) {
  const { colors } = useTheme();
  return <AnimatedPressable onPress={onPress} style={[styles.choice, { backgroundColor: active ? `${colors.primary}18` : colors.surfaceSoft, borderColor: active ? colors.primary : colors.border }]}><View style={styles.copy}><Text style={[styles.choiceTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.choiceSub, { color: colors.textMuted }]}>{sub}</Text></View>{active && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}</AnimatedPressable>;
}

function AppointmentCard({ item, onCancel }: { item: Appointment; onCancel?: () => void }) {
  const { colors } = useTheme();
  const accent = item.status === 'confirmed' ? colors.green : item.status === 'pending' ? colors.orange : item.status === 'cancelled' || item.status === 'no_show' ? colors.red : colors.cyan;
  return <GlassCard style={styles.card}><View style={styles.cardTop}><View style={[styles.icon, { backgroundColor: `${accent}16` }]}><Ionicons name="calendar" size={23} color={accent} /></View><View style={styles.copy}><Text style={[styles.cardTitle, { color: colors.text }]}>{item.service_title}</Text><Text style={[styles.cardMeta, { color: colors.textMuted }]}>{item.brand} {item.model} • {item.plate}</Text></View><Text style={[styles.status, { color: accent }]}>{statusText[item.status] || item.status}</Text></View><View style={[styles.info, { backgroundColor: colors.surfaceSoft }]}><Ionicons name="time" size={18} color={colors.primary} /><View style={styles.copy}><Text style={[styles.infoTitle, { color: colors.text }]}>{formatAppointmentDate(item.scheduled_start)}</Text><Text style={[styles.infoSub, { color: colors.textMuted }]}>{formatAppointmentTime(item.scheduled_start)} - {formatAppointmentTime(item.scheduled_end)} • {item.mechanic_name}</Text></View></View>{onCancel && ['pending', 'confirmed'].includes(item.status) && <AnimatedPressable onPress={onCancel} style={[styles.cancel, { borderColor: `${colors.red}40`, backgroundColor: `${colors.red}0D` }]}><Ionicons name="close-circle" size={18} color={colors.red} /><Text style={[styles.cancelText, { color: colors.red }]}>Randevuyu İptal Et</Text></AnimatedPressable>}</GlassCard>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 56, paddingBottom: 120, gap: 14 }, form: { gap: 13 }, formTitle: { fontSize: 19, fontWeight: '900' }, label: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8 }, chips: { gap: 8 }, choice: { minHeight: 58, borderWidth: 1, borderRadius: 16, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 8 }, copy: { flex: 1, minWidth: 0 }, choiceTitle: { fontSize: 13, fontWeight: '900' }, choiceSub: { fontSize: 10, marginTop: 3 }, dateRow: { gap: 8, paddingRight: 12 }, dateChip: { minWidth: 90, minHeight: 45, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 }, dateText: { fontSize: 10, fontWeight: '900' }, slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, slot: { minWidth: 70, minHeight: 42, borderWidth: 1, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, slotText: { fontSize: 12, fontWeight: '900' }, emptyText: { fontSize: 12, paddingVertical: 10 }, sectionTitle: { fontSize: 18, fontWeight: '900', marginTop: 3 }, empty: { alignItems: 'center', gap: 8, paddingVertical: 28 }, emptyTitle: { fontSize: 16, fontWeight: '900' }, card: { gap: 11 }, cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, icon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, cardTitle: { fontSize: 14, fontWeight: '900' }, cardMeta: { fontSize: 10, marginTop: 3 }, status: { fontSize: 9, fontWeight: '900', maxWidth: 85, textAlign: 'right' }, info: { minHeight: 64, borderRadius: 16, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 9 }, infoTitle: { fontSize: 12, fontWeight: '900' }, infoSub: { fontSize: 10, marginTop: 4 }, cancel: { minHeight: 44, borderWidth: 1, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, cancelText: { fontSize: 11, fontWeight: '900' },
});
