import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedMotorcycleIcon } from '../components/AnimatedMotorcycleIcon';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { FormField } from '../components/FormField';
import { GlassCard } from '../components/GlassCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { dateKey, daysFromToday, formatAppointmentDate, formatAppointmentTime, formatCalendarDay } from '../lib/calendar';
import { supabase } from '../lib/supabase';
import { Appointment, AppointmentMechanic, AvailableSlot, WorkshopSearchResult } from '../types';

const statusText: Record<string, string> = {
  pending: 'Onay Bekliyor', confirmed: 'Onaylandı', arrived: 'Geldin', converted: 'Servise Dönüştü', cancelled: 'İptal', no_show: 'Gelmedi',
};

export function CustomerAppointmentsScreen({ onStartLink: _onStartLink }: { onStartLink: () => void }) {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [workshopQuery, setWorkshopQuery] = useState('');
  const [workshopResults, setWorkshopResults] = useState<WorkshopSearchResult[]>([]);
  const [selectedWorkshop, setSelectedWorkshop] = useState<WorkshopSearchResult | null>(null);
  const [mechanics, setMechanics] = useState<AppointmentMechanic[]>([]);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [mechanicId, setMechanicId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(daysFromToday(1)[0]);
  const [slot, setSlot] = useState<AvailableSlot | null>(null);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [odometer, setOdometer] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const dates = useMemo(() => daysFromToday(30), []);

  const loadAppointments = useCallback(async () => {
    const { data } = await supabase.rpc('customer_get_my_appointments');
    setAppointments((data as Appointment[] | null) ?? []);
  }, []);

  const searchWorkshops = async () => {
    if (workshopQuery.trim().length < 2) return Alert.alert('İşletme adı gerekli', 'Arama için en az 2 karakter yaz.');
    setSearching(true);
    const { data, error } = await supabase.rpc('customer_search_appointment_workshops', { p_query: workshopQuery.trim() });
    setSearching(false);
    if (error) return Alert.alert('İşletmeler aranamadı', error.message);
    setSearched(true);
    const next = (data as WorkshopSearchResult[] | null) ?? [];
    setWorkshopResults(next);
    if (next.length === 0) setSelectedWorkshop(null);
  };

  const selectWorkshop = async (workshop: WorkshopSearchResult) => {
    setSelectedWorkshop(workshop);
    setMechanicId(null);
    setMechanics([]);
    setSlots([]);
    setSlot(null);
    const { data, error } = await supabase.rpc('customer_get_appointment_mechanics', { p_workshop_id: workshop.id });
    if (error) return Alert.alert('Ustalar alınamadı', error.message);
    const next = (data as AppointmentMechanic[] | null) ?? [];
    setMechanics(next);
    if (next[0]) setMechanicId(next[0].mechanic_id);
  };

  const loadSlots = useCallback(async () => {
    if (!selectedWorkshop || !mechanicId) { setSlots([]); return; }
    const { data, error } = await supabase.rpc('appointment_get_available_slots', {
      p_workshop_id: selectedWorkshop.id,
      p_mechanic_id: mechanicId,
      p_date: dateKey(selectedDate),
      p_exclude_appointment_id: null,
    });
    if (error) { setSlots([]); return; }
    setSlots((data as AvailableSlot[] | null) ?? []);
    setSlot(null);
  }, [selectedWorkshop, mechanicId, selectedDate]);

  useEffect(() => { loadAppointments(); }, [loadAppointments]);
  useEffect(() => {
    if (!odometer && profile?.customer_motorcycle_odometer != null) setOdometer(String(profile.customer_motorcycle_odometer));
  }, [profile?.customer_motorcycle_odometer, odometer]);
  useEffect(() => { if (showForm) loadSlots(); }, [showForm, loadSlots]);

  const upcoming = appointments.filter((item) => !['cancelled', 'no_show', 'converted'].includes(item.status) && new Date(item.scheduled_end) >= new Date());
  const history = appointments.filter((item) => !upcoming.some((up) => up.id === item.id));

  const create = async () => {
    const brand = profile?.customer_motorcycle_brand?.trim();
    const model = profile?.customer_motorcycle_model?.trim();
    const plate = profile?.customer_plate?.trim();
    if (!brand || !model || !plate) return Alert.alert('Motor bilgileri eksik', 'Randevu için Hesabım bölümünden plaka, marka ve model bilgilerini tamamla.');
    const odometerText = odometer.replace(/\D/g, '');
    const odometerValue = odometerText ? Number(odometerText) : null;
    if (odometerValue !== null && (!Number.isInteger(odometerValue) || odometerValue < 0)) return Alert.alert('Kilometre bilgisi geçersiz', 'Güncel kilometreyi sıfır veya daha büyük tam sayı olarak yaz.');
    if (!selectedWorkshop || !mechanicId || !slot || title.trim().length < 3) return Alert.alert('Eksik bilgi', 'İşletme, usta, saat ve yapılacak işlemi seç.');

    setLoading(true);
    const { error } = await supabase.rpc('customer_create_open_appointment', {
      p_workshop_id: selectedWorkshop.id,
      p_mechanic_id: mechanicId,
      p_brand: brand,
      p_model: model,
      p_plate: plate,
      p_service_title: title.trim(),
      p_customer_note: note.trim() || null,
      p_scheduled_start: slot.slot_start,
      p_scheduled_end: slot.slot_end,
      p_odometer: odometerValue,
    });
    setLoading(false);
    if (error) return Alert.alert('Randevu oluşturulamadı', error.message);

    setShowForm(false); setTitle(''); setNote(''); setSlot(null); await loadAppointments();
    Alert.alert('Randevu talebin gönderildi', `${selectedWorkshop.name} işletmesindeki Usta talebi panelinden onaylayabilir.`);
  };

  const cancel = (item: Appointment) => Alert.alert('Randevu iptal edilsin mi?', `${formatAppointmentDate(item.scheduled_start)} ${formatAppointmentTime(item.scheduled_start)}`, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'İptal Et', style: 'destructive', onPress: async () => {
      const { error } = await supabase.rpc('customer_cancel_appointment', { p_appointment_id: item.id, p_reason: 'Müşteri uygulamadan iptal etti' });
      if (error) return Alert.alert('İptal edilemedi', error.message);
      await loadAppointments();
    } },
  ]);

  const refresh = async () => { setRefreshing(true); await loadAppointments(); await loadSlots(); setRefreshing(false); };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}>
      <ScreenHeader eyebrow="RANDEVU MERKEZİ" title="Randevularım" subtitle="Bağlantı şartı olmadan işletmeyi ara, Ustayı ve boş saati seç." actionIcon={showForm ? 'close' : 'add'} onAction={() => setShowForm((value) => !value)} />

      <GlassCard style={[styles.infoCard, { borderColor: `${colors.green}38` }]}>
        <AnimatedMotorcycleIcon size={34} color={colors.green} />
        <View style={styles.copy}><Text style={[styles.infoCardTitle, { color: colors.text }]}>İşletmeye bağlı olmak zorunda değilsin</Text><Text style={[styles.infoCardText, { color: colors.textMuted }]}>Motor bağlantısı servis geçmişini birleştirir. Randevu için doğrudan istediğin işletmeyi ve Ustayı seçebilirsin.</Text></View>
      </GlassCard>

      {showForm && <GlassCard style={styles.form}>
        <Text style={[styles.formTitle, { color: colors.text }]}>Yeni Randevu</Text>
        <Text style={[styles.label, { color: colors.textMuted }]}>İŞLETME ARA</Text>
        <FormField label="İşletme adı" value={workshopQuery} onChangeText={(value) => { setWorkshopQuery(value); setSearched(false); }} placeholder="Örn. Ankara Merkez Garage" autoCapitalize="words" />
        <PrimaryButton title="Randevuya Açık İşletmeleri Ara" onPress={searchWorkshops} loading={searching} secondary />

        {workshopResults.length > 0 && <View style={styles.chips}>{workshopResults.map((item) => <WorkshopChoice key={item.id} item={item} active={selectedWorkshop?.id === item.id} onPress={() => selectWorkshop(item)} />)}</View>}
        {searched && workshopResults.length === 0 && <View style={[styles.searchEmpty, { backgroundColor: `${colors.cyan}0D`, borderColor: `${colors.cyan}38` }]}><View style={[styles.searchEmptyIcon, { backgroundColor: `${colors.cyan}18` }]}><Ionicons name="search" size={25} color={colors.cyan} /></View><View style={styles.copy}><Text style={[styles.searchEmptyTitle, { color: colors.text }]}>Bu adla işletme bulunamadı</Text><Text style={[styles.searchEmptyText, { color: colors.textMuted }]}>İşletme adını farklı yazarak tekrar dene. Yalnız randevuya açık işletmeler sonuçlarda gösterilir.</Text></View></View>}

        {selectedWorkshop && <>
          <Text style={[styles.label, { color: colors.textMuted }]}>KAYITLI MOTORUN</Text>
          <View style={[styles.motorSummary, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}><AnimatedMotorcycleIcon size={31} color={colors.cyan} /><View style={styles.copy}><Text style={[styles.choiceTitle, { color: colors.text }]}>{profile?.customer_motorcycle_brand} {profile?.customer_motorcycle_model}</Text><Text style={[styles.choiceSub, { color: colors.textMuted }]}>{profile?.customer_plate || 'Plaka bilgisi yok'}{profile?.customer_motorcycle_odometer != null ? ` • ${Number(profile.customer_motorcycle_odometer).toLocaleString('tr-TR')} km` : ''}</Text></View></View>

          <Text style={[styles.label, { color: colors.textMuted }]}>USTA</Text>
          <View style={styles.chips}>{mechanics.length === 0 ? <Text style={[styles.emptyText, { color: colors.textMuted }]}>Bu işletmede şu anda randevuya açık Usta yok.</Text> : mechanics.map((item) => <Choice key={item.mechanic_id} active={mechanicId === item.mechanic_id} title={item.full_name} sub={item.availability_status === 'busy' ? 'Şu an meşgul' : 'Randevuya açık'} onPress={() => setMechanicId(item.mechanic_id)} />)}</View>

          <Text style={[styles.label, { color: colors.textMuted }]}>TARİH</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>{dates.map((date) => <AnimatedPressable key={dateKey(date)} onPress={() => setSelectedDate(date)} style={[styles.dateChip, { backgroundColor: dateKey(selectedDate) === dateKey(date) ? colors.primary : colors.surfaceSoft, borderColor: dateKey(selectedDate) === dateKey(date) ? colors.primary : colors.border }]}><Text style={[styles.dateText, { color: dateKey(selectedDate) === dateKey(date) ? '#fff' : colors.text }]}>{formatCalendarDay(date)}</Text></AnimatedPressable>)}</ScrollView>

          <Text style={[styles.label, { color: colors.textMuted }]}>MÜSAİT SAAT</Text>
          <View style={styles.slotGrid}>{slots.length === 0 ? <Text style={[styles.emptyText, { color: colors.textMuted }]}>Seçilen gün için uygun saat bulunamadı.</Text> : slots.map((item) => <AnimatedPressable key={item.slot_start} onPress={() => setSlot(item)} style={[styles.slot, { backgroundColor: slot?.slot_start === item.slot_start ? `${colors.green}20` : colors.surfaceSoft, borderColor: slot?.slot_start === item.slot_start ? colors.green : colors.border }]}><Text style={[styles.slotText, { color: slot?.slot_start === item.slot_start ? colors.green : colors.text }]}>{item.slot_label}</Text></AnimatedPressable>)}</View>

          <FormField label="Güncel Kilometre" value={odometer} onChangeText={(value) => setOdometer(value.replace(/\D/g, ''))} placeholder="Örn. 24500" keyboardType="number-pad" />
          <FormField label="Yapılacak işlem" value={title} onChangeText={setTitle} placeholder="Örn. Yağ değişimi ve genel kontrol" multiline />
          <FormField label="Ustaya not (opsiyonel)" value={note} onChangeText={setNote} multiline />
          <PrimaryButton title="Randevu Talebi Oluştur" onPress={create} loading={loading} />
        </>}
      </GlassCard>}

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Yaklaşan Randevular</Text>
      {upcoming.length === 0 ? <GlassCard style={styles.empty}><Ionicons name="calendar-outline" size={38} color={colors.textMuted} /><Text style={[styles.emptyTitle, { color: colors.text }]}>Yaklaşan randevu yok</Text></GlassCard> : upcoming.map((item) => <AppointmentCard key={item.id} item={item} onCancel={() => cancel(item)} />)}

      {history.length > 0 && <><Text style={[styles.sectionTitle, { color: colors.text }]}>Geçmiş</Text>{history.slice(0, 15).map((item) => <AppointmentCard key={item.id} item={item} />)}</>}
    </ScrollView>
  );
}

function WorkshopChoice({ item, active, onPress }: { item: WorkshopSearchResult; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return <AnimatedPressable onPress={onPress} style={[styles.choice, { backgroundColor: active ? `${colors.green}16` : colors.surfaceSoft, borderColor: active ? colors.green : colors.border }]}><View style={[styles.businessIcon, { backgroundColor: `${active ? colors.green : colors.primary}16` }]}><Ionicons name="business" size={22} color={active ? colors.green : colors.primary} /></View><View style={styles.copy}><Text style={[styles.choiceTitle, { color: colors.text }]}>{item.name}</Text><Text style={[styles.choiceSub, { color: colors.textMuted }]}>{item.address || 'Adres eklenmedi'}</Text></View>{active && <Ionicons name="checkmark-circle" size={21} color={colors.green} />}</AnimatedPressable>;
}

function Choice({ active, title, sub, onPress }: { active: boolean; title: string; sub: string; onPress: () => void }) {
  const { colors } = useTheme();
  return <AnimatedPressable onPress={onPress} style={[styles.choice, { backgroundColor: active ? `${colors.primary}18` : colors.surfaceSoft, borderColor: active ? colors.primary : colors.border }]}><View style={styles.copy}><Text style={[styles.choiceTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.choiceSub, { color: colors.textMuted }]}>{sub}</Text></View>{active && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}</AnimatedPressable>;
}

function AppointmentCard({ item, onCancel }: { item: Appointment; onCancel?: () => void }) {
  const { colors } = useTheme();
  const accent = item.status === 'confirmed' ? colors.green : item.status === 'pending' ? colors.orange : item.status === 'cancelled' || item.status === 'no_show' ? colors.red : colors.cyan;
  return <GlassCard style={styles.card}><View style={styles.cardTop}><View style={[styles.icon, { backgroundColor: `${accent}16` }]}><Ionicons name="calendar" size={23} color={accent} /></View><View style={styles.copy}><Text style={[styles.cardTitle, { color: colors.text }]}>{item.service_title}</Text><Text style={[styles.cardMeta, { color: colors.textMuted }]}>{item.workshop_name} • {item.brand} {item.model} • {item.plate}</Text></View><Text style={[styles.status, { color: accent }]}>{statusText[item.status] || item.status}</Text></View><View style={[styles.info, { backgroundColor: colors.surfaceSoft }]}><Ionicons name="time" size={18} color={colors.primary} /><View style={styles.copy}><Text style={[styles.infoTitle, { color: colors.text }]}>{formatAppointmentDate(item.scheduled_start)}</Text><Text style={[styles.infoSub, { color: colors.textMuted }]}>{formatAppointmentTime(item.scheduled_start)} - {formatAppointmentTime(item.scheduled_end)} • {item.mechanic_name}</Text></View></View>{onCancel && ['pending', 'confirmed'].includes(item.status) && <AnimatedPressable onPress={onCancel} style={[styles.cancel, { borderColor: `${colors.red}40`, backgroundColor: `${colors.red}0D` }]}><Ionicons name="close-circle" size={18} color={colors.red} /><Text style={[styles.cancelText, { color: colors.red }]}>Randevuyu İptal Et</Text></AnimatedPressable>}</GlassCard>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 56, paddingBottom: 32, gap: 14 }, infoCard: { borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 11 }, infoCardTitle: { fontSize: 15, fontWeight: '900' }, infoCardText: { fontSize: 12.5, lineHeight: 18, marginTop: 4 }, form: { gap: 13 }, formTitle: { fontSize: 19, fontWeight: '900' }, label: { fontSize: 12, fontWeight: '900', letterSpacing: 0.8 }, chips: { gap: 8 }, choice: { minHeight: 64, borderWidth: 1, borderRadius: 16, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 9 }, businessIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, motorSummary: { minHeight: 67, borderWidth: 1, borderRadius: 16, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10 }, copy: { flex: 1, minWidth: 0 }, choiceTitle: { fontSize: 13.5, fontWeight: '900' }, choiceSub: { fontSize: 12, lineHeight: 16, marginTop: 3 }, dateRow: { gap: 8, paddingRight: 12 }, dateChip: { minWidth: 90, minHeight: 45, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 }, dateText: { fontSize: 12, fontWeight: '900' }, slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, slot: { minWidth: 70, minHeight: 42, borderWidth: 1, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, slotText: { fontSize: 13, fontWeight: '900' }, emptyText: { fontSize: 13, lineHeight: 18, paddingVertical: 10 }, sectionTitle: { fontSize: 18, fontWeight: '900', marginTop: 3 }, empty: { alignItems: 'center', gap: 8, paddingVertical: 28 }, emptyTitle: { fontSize: 16, fontWeight: '900' }, searchEmpty: { minHeight: 92, borderWidth: 1, borderRadius: 19, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11 }, searchEmptyIcon: { width: 49, height: 49, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, searchEmptyTitle: { fontSize: 15, fontWeight: '900' }, searchEmptyText: { fontSize: 12, lineHeight: 17, marginTop: 4 }, card: { gap: 11 }, cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, icon: { width: 45, height: 45, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, cardTitle: { fontSize: 14.5, fontWeight: '900' }, cardMeta: { fontSize: 12, lineHeight: 17, marginTop: 4 }, status: { fontSize: 10.5, fontWeight: '900', maxWidth: 82, textAlign: 'right' }, info: { minHeight: 58, borderRadius: 15, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 9 }, infoTitle: { fontSize: 13, fontWeight: '900' }, infoSub: { fontSize: 12, marginTop: 3 }, cancel: { minHeight: 44, borderWidth: 1, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, cancelText: { fontSize: 12, fontWeight: '900' },
});
