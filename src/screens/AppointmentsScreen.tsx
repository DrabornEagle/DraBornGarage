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
import { addMinutes, combineLocalDateTime, dateKey, daysFromToday, formatAppointmentDate, formatAppointmentTime, formatCalendarDay } from '../lib/calendar';
import { supabase } from '../lib/supabase';
import { Appointment, AppointmentEvent, AppointmentMechanic, AvailableSlot, Customer, MechanicTimeOff, Motorcycle, WorkingHours } from '../types';

type Tab = 'calendar' | 'new' | 'schedule';
const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const statusLabels: Record<string, string> = { pending: 'Onay Bekliyor', confirmed: 'Onaylandı', arrived: 'Geldi', converted: 'Servise Dönüştü', cancelled: 'İptal', no_show: 'Gelmedi' };

function dayBounds(date: Date) {
  const start = new Date(date); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
}

export function AppointmentsScreen() {
  const { colors } = useTheme();
  const { workshop, membership, isAdmin, refreshWorkspace } = useAuth();
  const isOwner = isAdmin || membership?.role === 'owner' || membership?.role === 'owner_mechanic';
  const canWork = membership?.role === 'mechanic' || membership?.role === 'owner_mechanic';
  const [tab, setTab] = useState<Tab>('calendar');
  const [date, setDate] = useState(daysFromToday(1)[0]);
  const [mechanics, setMechanics] = useState<AppointmentMechanic[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [filterMechanic, setFilterMechanic] = useState<string | null>(isOwner ? null : membership?.user_id ?? null);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);

  const dates = useMemo(() => daysFromToday(21, -7), []);

  const loadBase = useCallback(async () => {
    if (!workshop) return;
    const [mechanicResult, customerResult, motorcycleResult] = await Promise.all([
      supabase.rpc('staff_get_appointment_mechanics', { p_workshop_id: workshop.id }),
      supabase.from('customers').select('*').eq('workshop_id', workshop.id).order('full_name'),
      supabase.from('motorcycles').select('*').eq('workshop_id', workshop.id).order('created_at', { ascending: false }),
    ]);
    const nextMechanics = (mechanicResult.data as AppointmentMechanic[] | null) ?? [];
    setMechanics(nextMechanics);
    setCustomers((customerResult.data as Customer[]) ?? []);
    setMotorcycles((motorcycleResult.data as Motorcycle[]) ?? []);
    if (!filterMechanic && !isOwner && membership?.user_id) setFilterMechanic(membership.user_id);
  }, [workshop, filterMechanic, isOwner, membership?.user_id]);

  const loadAppointments = useCallback(async () => {
    if (!workshop) return;
    const bounds = dayBounds(date);
    const { data, error } = await supabase.rpc('staff_get_appointments', {
      p_workshop_id: workshop.id,
      p_from: bounds.from,
      p_to: bounds.to,
      p_mechanic_id: filterMechanic,
    });
    if (error) return Alert.alert('Randevular alınamadı', error.message);
    setAppointments((data as Appointment[] | null) ?? []);
  }, [workshop, date, filterMechanic]);

  useEffect(() => { loadBase(); }, [loadBase]);
  useEffect(() => { loadAppointments(); }, [loadAppointments]);

  const stats = {
    total: appointments.length,
    pending: appointments.filter((item) => item.status === 'pending').length,
    confirmed: appointments.filter((item) => item.status === 'confirmed').length,
    arrived: appointments.filter((item) => item.status === 'arrived').length,
  };

  const refresh = async () => { setRefreshing(true); await Promise.all([loadBase(), loadAppointments()]); setRefreshing(false); };
  const openEdit = (item: Appointment) => { setEditing(item); setTab('new'); };

  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}>
    <ScreenHeader eyebrow="v0.3 TAKVİM" title="Randevu ve Müsaitlik" subtitle={`${workshop?.name ?? 'DraBornGarage'} • Usta saatleri, randevular ve kapalı zamanlar.`} />

    <View style={[styles.tabs, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}>
      {([['calendar', 'Takvim', 'calendar'], ['new', editing ? 'Yeniden Planla' : 'Randevu Ekle', 'add-circle'], ['schedule', 'Çalışma Saatleri', 'time']] as [Tab, string, keyof typeof Ionicons.glyphMap][]).map(([value, label, icon]) => <AnimatedPressable key={value} onPress={() => { setTab(value); if (value !== 'new') setEditing(null); }} style={[styles.tab, tab === value && { backgroundColor: colors.cardStrong, borderColor: `${colors.primary}60` }]}><Ionicons name={icon} size={18} color={tab === value ? colors.primary : colors.textMuted} /><Text style={[styles.tabText, { color: tab === value ? colors.text : colors.textMuted }]}>{label}</Text></AnimatedPressable>)}
    </View>

    {tab === 'calendar' && <CalendarTab
      dates={dates} date={date} setDate={setDate} mechanics={mechanics} filterMechanic={filterMechanic} setFilterMechanic={setFilterMechanic}
      isOwner={isOwner} stats={stats} appointments={appointments} reload={loadAppointments} onEdit={openEdit}
    />}
    {tab === 'new' && <AppointmentForm
      workshopId={workshop?.id ?? ''} membershipId={membership?.user_id ?? ''} isOwner={isOwner} canWork={canWork}
      mechanics={mechanics} customers={customers} motorcycles={motorcycles} initialDate={date} editing={editing}
      onSaved={async () => { setEditing(null); setTab('calendar'); await loadAppointments(); }} onCancel={() => { setEditing(null); setTab('calendar'); }}
    />}
    {tab === 'schedule' && <ScheduleTab workshop={workshop} membershipId={membership?.user_id ?? ''} isOwner={isOwner} canWork={canWork} mechanics={mechanics} refreshWorkspace={refreshWorkspace} />}
  </ScrollView>;
}

function CalendarTab({ dates, date, setDate, mechanics, filterMechanic, setFilterMechanic, isOwner, stats, appointments, reload, onEdit }: {
  dates: Date[]; date: Date; setDate: (d: Date) => void; mechanics: AppointmentMechanic[]; filterMechanic: string | null; setFilterMechanic: (id: string | null) => void; isOwner: boolean;
  stats: { total: number; pending: number; confirmed: number; arrived: number }; appointments: Appointment[]; reload: () => Promise<void>; onEdit: (item: Appointment) => void;
}) {
  const { colors } = useTheme();
  return <View style={styles.sectionGap}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>{dates.map((item) => { const active = dateKey(item) === dateKey(date); return <AnimatedPressable key={dateKey(item)} onPress={() => setDate(item)} style={[styles.dateChip, { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border }]}><Text style={[styles.dateText, { color: active ? '#fff' : colors.text }]}>{formatCalendarDay(item)}</Text></AnimatedPressable>; })}</ScrollView>
    {isOwner && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}><FilterChip active={filterMechanic === null} label="Tüm Ustalar" onPress={() => setFilterMechanic(null)} />{mechanics.map((item) => <FilterChip key={item.mechanic_id} active={filterMechanic === item.mechanic_id} label={item.full_name} onPress={() => setFilterMechanic(item.mechanic_id)} />)}</ScrollView>}
    <View style={styles.statsRow}><MiniStat label="Toplam" value={stats.total} accent={colors.primary} /><MiniStat label="Bekliyor" value={stats.pending} accent={colors.orange} /><MiniStat label="Onaylı" value={stats.confirmed} accent={colors.green} /><MiniStat label="Geldi" value={stats.arrived} accent={colors.cyan} /></View>
    <Text style={[styles.sectionTitle, { color: colors.text }]}>{formatAppointmentDate(date)}</Text>
    {appointments.length === 0 ? <GlassCard style={styles.empty}><Ionicons name="calendar-outline" size={40} color={colors.textMuted} /><Text style={[styles.emptyTitle, { color: colors.text }]}>Bu gün randevu yok</Text></GlassCard> : appointments.map((item) => <StaffAppointmentCard key={item.id} item={item} reload={reload} onEdit={() => onEdit(item)} />)}
  </View>;
}

function StaffAppointmentCard({ item, reload, onEdit }: { item: Appointment; reload: () => Promise<void>; onEdit: () => void }) {
  const { colors } = useTheme();
  const accent = item.status === 'pending' ? colors.orange : item.status === 'confirmed' ? colors.green : item.status === 'arrived' ? colors.cyan : item.status === 'cancelled' || item.status === 'no_show' ? colors.red : colors.primary;

  const status = async (next: string, note?: string) => {
    const { error } = await supabase.rpc('staff_set_appointment_status', { p_appointment_id: item.id, p_status: next, p_note: note ?? null });
    if (error) return Alert.alert('Durum değiştirilemedi', error.message);
    await reload();
  };
  const convert = () => Alert.alert('Servis kaydına dönüştürülsün mü?', 'Motor atölye sırasına randevulu servis olarak eklenecek.', [{ text: 'Vazgeç' }, { text: 'Dönüştür', onPress: async () => { const { error } = await supabase.rpc('staff_convert_appointment_to_work_order', { p_appointment_id: item.id, p_waiting_status: 'left_vehicle', p_odometer: null }); if (error) return Alert.alert('Dönüştürülemedi', error.message); await reload(); Alert.alert('Servis kaydı oluşturuldu'); } }]);
  const history = async () => { const { data, error } = await supabase.rpc('staff_get_appointment_events', { p_appointment_id: item.id }); if (error) return Alert.alert('Geçmiş alınamadı', error.message); const events = (data as AppointmentEvent[] | null) ?? []; Alert.alert('Randevu Geçmişi', events.map((e) => `${formatAppointmentTime(e.created_at)} • ${e.event_type}${e.actor_name ? ` • ${e.actor_name}` : ''}${e.note ? `\n${e.note}` : ''}`).join('\n\n') || 'Hareket yok'); };

  return <GlassCard style={styles.appointmentCard}>
    <View style={styles.cardTop}><View style={[styles.timeBox, { backgroundColor: `${accent}16` }]}><Text style={[styles.time, { color: accent }]}>{formatAppointmentTime(item.scheduled_start)}</Text><Text style={[styles.timeEnd, { color: colors.textMuted }]}>{formatAppointmentTime(item.scheduled_end)}</Text></View><View style={styles.copy}><Text style={[styles.cardTitle, { color: colors.text }]}>{item.service_title}</Text><Text style={[styles.cardMeta, { color: colors.textMuted }]}>{item.customer_name} • {item.brand} {item.model} • {item.plate}</Text><Text style={[styles.cardMeta, { color: colors.textMuted }]}>{item.mechanic_name} • {item.source === 'customer' ? 'Müşteri talebi' : 'Personel randevusu'}</Text></View><Text style={[styles.status, { color: accent }]}>{statusLabels[item.status]}</Text></View>
    {item.customer_note && <View style={[styles.note, { backgroundColor: colors.surfaceSoft }]}><Ionicons name="chatbubble-outline" size={16} color={colors.cyan} /><Text style={[styles.noteText, { color: colors.textMuted }]}>{item.customer_note}</Text></View>}
    <View style={styles.actions}>
      {item.status === 'pending' && <Action label="Onayla" icon="checkmark" accent={colors.green} onPress={() => status('confirmed')} />}
      {['pending', 'confirmed'].includes(item.status) && <Action label="Geldi" icon="enter" accent={colors.cyan} onPress={() => status('arrived')} />}
      {['pending', 'confirmed', 'arrived'].includes(item.status) && <Action label="Servise Al" icon="construct" accent={colors.primary} onPress={convert} />}
      {['pending', 'confirmed'].includes(item.status) && <Action label="Planla" icon="calendar" accent={colors.orange} onPress={onEdit} />}
      {['pending', 'confirmed'].includes(item.status) && <Action label="İptal" icon="close" accent={colors.red} onPress={() => Alert.alert('Randevu iptal edilsin mi?', '', [{ text: 'Vazgeç' }, { text: 'İptal Et', style: 'destructive', onPress: () => status('cancelled', 'İşletme tarafından iptal edildi') }])} />}
      {['confirmed', 'arrived'].includes(item.status) && <Action label="Gelmedi" icon="person-remove" accent={colors.red} onPress={() => status('no_show', 'Müşteri randevuya gelmedi')} />}
      <Action label="Geçmiş" icon="time" accent={colors.textMuted} onPress={history} />
    </View>
  </GlassCard>;
}

function AppointmentForm({ workshopId, membershipId, isOwner, canWork, mechanics, customers, motorcycles, initialDate, editing, onSaved, onCancel }: {
  workshopId: string; membershipId: string; isOwner: boolean; canWork: boolean; mechanics: AppointmentMechanic[]; customers: Customer[]; motorcycles: Motorcycle[]; initialDate: Date; editing: Appointment | null; onSaved: () => void; onCancel: () => void;
}) {
  const { colors } = useTheme();
  const [customerId, setCustomerId] = useState<string | null>(editing?.customer_id ?? customers[0]?.id ?? null);
  const [motorcycleId, setMotorcycleId] = useState<string | null>(editing?.motorcycle_id ?? null);
  const [mechanicId, setMechanicId] = useState<string | null>(editing?.mechanic_id ?? (canWork ? membershipId : mechanics[0]?.mechanic_id ?? null));
  const [selectedDate, setSelectedDate] = useState(editing ? new Date(editing.scheduled_start) : initialDate);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [slot, setSlot] = useState<AvailableSlot | null>(editing ? { slot_start: editing.scheduled_start, slot_end: editing.scheduled_end, slot_label: formatAppointmentTime(editing.scheduled_start) } : null);
  const [title, setTitle] = useState(editing?.service_title ?? '');
  const [customerNote, setCustomerNote] = useState(editing?.customer_note ?? '');
  const [staffNote, setStaffNote] = useState(editing?.staff_note ?? '');
  const [loading, setLoading] = useState(false);
  const dates = useMemo(() => daysFromToday(60), []);
  const bikes = motorcycles.filter((item) => item.customer_id === customerId);

  useEffect(() => { if (!motorcycleId || !bikes.some((b) => b.id === motorcycleId)) setMotorcycleId(bikes[0]?.id ?? null); }, [customerId, motorcycles]);
  useEffect(() => {
    if (!workshopId || !mechanicId) return;
    supabase.rpc('appointment_get_available_slots', { p_workshop_id: workshopId, p_mechanic_id: mechanicId, p_date: dateKey(selectedDate), p_exclude_appointment_id: editing?.id ?? null }).then(({ data }) => {
      const next = (data as AvailableSlot[] | null) ?? [];
      if (editing && dateKey(new Date(editing.scheduled_start)) === dateKey(selectedDate) && !next.some((x) => x.slot_start === editing.scheduled_start)) next.unshift({ slot_start: editing.scheduled_start, slot_end: editing.scheduled_end, slot_label: formatAppointmentTime(editing.scheduled_start) });
      setSlots(next);
    });
  }, [workshopId, mechanicId, selectedDate, editing?.id]);

  const save = async () => {
    if (!mechanicId || !slot || title.trim().length < 3) return Alert.alert('Eksik bilgi', 'Usta, tarih, saat ve işlem bilgisi gerekli.');
    setLoading(true);
    const result = editing
      ? await supabase.rpc('staff_reschedule_appointment', { p_appointment_id: editing.id, p_mechanic_id: mechanicId, p_scheduled_start: slot.slot_start, p_scheduled_end: slot.slot_end, p_note: staffNote.trim() || null })
      : await supabase.rpc('staff_create_appointment', { p_workshop_id: workshopId, p_customer_id: customerId, p_motorcycle_id: motorcycleId, p_mechanic_id: mechanicId, p_service_title: title.trim(), p_customer_note: customerNote.trim() || null, p_staff_note: staffNote.trim() || null, p_scheduled_start: slot.slot_start, p_scheduled_end: slot.slot_end });
    setLoading(false);
    if (result.error) return Alert.alert('Randevu kaydedilemedi', result.error.message);
    Alert.alert(editing ? 'Randevu yeniden planlandı' : 'Randevu oluşturuldu'); onSaved();
  };

  return <GlassCard style={styles.form}>
    <Text style={[styles.formTitle, { color: colors.text }]}>{editing ? 'Randevuyu Yeniden Planla' : 'Manuel Randevu Ekle'}</Text>
    {!editing && <><Text style={[styles.label, { color: colors.textMuted }]}>MÜŞTERİ</Text><View style={styles.listChoices}>{customers.map((item) => <Choice key={item.id} active={customerId === item.id} title={item.full_name} sub={item.phone || 'Telefon yok'} onPress={() => setCustomerId(item.id)} />)}</View><Text style={[styles.label, { color: colors.textMuted }]}>MOTOSİKLET</Text><View style={styles.listChoices}>{bikes.map((item) => <Choice key={item.id} active={motorcycleId === item.id} title={`${item.brand} ${item.model}`} sub={item.plate || 'Plaka yok'} onPress={() => setMotorcycleId(item.id)} />)}</View></>}
    <Text style={[styles.label, { color: colors.textMuted }]}>USTA</Text><View style={styles.listChoices}>{mechanics.filter((m) => isOwner || m.mechanic_id === membershipId).map((item) => <Choice key={item.mechanic_id} active={mechanicId === item.mechanic_id} title={item.full_name} sub={item.availability_status === 'off' ? 'Kapalı' : item.availability_status === 'busy' ? 'Meşgul' : 'Müsait'} onPress={() => setMechanicId(item.mechanic_id)} />)}</View>
    <Text style={[styles.label, { color: colors.textMuted }]}>TARİH</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>{dates.map((item) => <AnimatedPressable key={dateKey(item)} onPress={() => { setSelectedDate(item); setSlot(null); }} style={[styles.dateChip, { backgroundColor: dateKey(item) === dateKey(selectedDate) ? colors.primary : colors.surfaceSoft, borderColor: dateKey(item) === dateKey(selectedDate) ? colors.primary : colors.border }]}><Text style={[styles.dateText, { color: dateKey(item) === dateKey(selectedDate) ? '#fff' : colors.text }]}>{formatCalendarDay(item)}</Text></AnimatedPressable>)}</ScrollView>
    <Text style={[styles.label, { color: colors.textMuted }]}>SAAT</Text><View style={styles.slotGrid}>{slots.length === 0 ? <Text style={[styles.emptyText, { color: colors.textMuted }]}>Uygun saat yok.</Text> : slots.map((item) => <AnimatedPressable key={item.slot_start} onPress={() => setSlot(item)} style={[styles.slot, { backgroundColor: slot?.slot_start === item.slot_start ? `${colors.green}18` : colors.surfaceSoft, borderColor: slot?.slot_start === item.slot_start ? colors.green : colors.border }]}><Text style={[styles.slotText, { color: slot?.slot_start === item.slot_start ? colors.green : colors.text }]}>{item.slot_label}</Text></AnimatedPressable>)}</View>
    {!editing && <><FormField label="Yapılacak işlem" value={title} onChangeText={setTitle} multiline /><FormField label="Müşteri notu" value={customerNote} onChangeText={setCustomerNote} multiline /></>}
    <FormField label="Personel notu" value={staffNote} onChangeText={setStaffNote} multiline />
    <View style={styles.twoButtons}><View style={styles.flex}><PrimaryButton title="Vazgeç" onPress={onCancel} secondary /></View><View style={styles.flex}><PrimaryButton title={editing ? 'Yeni Saati Kaydet' : 'Randevuyu Oluştur'} onPress={save} loading={loading} /></View></View>
  </GlassCard>;
}

function ScheduleTab({ workshop, membershipId, isOwner, canWork, mechanics, refreshWorkspace }: { workshop: any; membershipId: string; isOwner: boolean; canWork: boolean; mechanics: AppointmentMechanic[]; refreshWorkspace: (...args: any[]) => Promise<void> }) {
  const { colors } = useTheme();
  const [mechanicId, setMechanicId] = useState<string | null>(canWork ? membershipId : mechanics[0]?.mechanic_id ?? null);
  const [hours, setHours] = useState<WorkingHours[]>([]);
  const [timeOff, setTimeOff] = useState<MechanicTimeOff[]>([]);
  const [offDate, setOffDate] = useState(daysFromToday(1)[0]);
  const [offStart, setOffStart] = useState('09:00');
  const [offEnd, setOffEnd] = useState('18:00');
  const [offReason, setOffReason] = useState('');
  const [enabled, setEnabled] = useState(workshop?.appointments_enabled !== false);
  const [autoConfirm, setAutoConfirm] = useState(Boolean(workshop?.appointment_auto_confirm));
  const [bookingDays, setBookingDays] = useState(String(workshop?.appointment_booking_days ?? 30));
  const [minNotice, setMinNotice] = useState(String(workshop?.appointment_min_notice_minutes ?? 60));
  const [saving, setSaving] = useState(false);
  const dates = useMemo(() => daysFromToday(60), []);

  const load = useCallback(async () => {
    if (!workshop?.id || !mechanicId) return;
    const [hoursResult, offResult] = await Promise.all([
      supabase.rpc('staff_get_working_hours', { p_workshop_id: workshop.id, p_mechanic_id: mechanicId }),
      supabase.rpc('staff_get_time_off', { p_workshop_id: workshop.id, p_mechanic_id: mechanicId }),
    ]);
    setHours(((hoursResult.data as WorkingHours[] | null) ?? []).map((h) => ({ ...h, start_time: h.start_time.slice(0, 5), end_time: h.end_time.slice(0, 5), break_start: h.break_start?.slice(0, 5) ?? null, break_end: h.break_end?.slice(0, 5) ?? null })));
    setTimeOff((offResult.data as MechanicTimeOff[] | null) ?? []);
  }, [workshop?.id, mechanicId]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!mechanicId && mechanics[0]) setMechanicId(canWork ? membershipId : mechanics[0].mechanic_id); }, [mechanics, mechanicId, canWork, membershipId]);

  const updateHour = (day: number, patch: Partial<WorkingHours>) => setHours((current) => current.map((item) => item.day_of_week === day ? { ...item, ...patch } : item));
  const saveHours = async () => {
    if (!workshop?.id || !mechanicId) return;
    setSaving(true);
    for (const item of hours) {
      const { error } = await supabase.rpc('staff_upsert_working_hours', { p_workshop_id: workshop.id, p_mechanic_id: mechanicId, p_day_of_week: item.day_of_week, p_is_working: item.is_working, p_start_time: item.start_time, p_end_time: item.end_time, p_break_start: item.break_start || null, p_break_end: item.break_end || null, p_slot_minutes: Number(item.slot_minutes) });
      if (error) { setSaving(false); return Alert.alert(`${dayNames[item.day_of_week]} kaydedilemedi`, error.message); }
    }
    setSaving(false); Alert.alert('Çalışma saatleri kaydedildi'); await load();
  };
  const addOff = async () => {
    if (!workshop?.id || !mechanicId) return;
    const { error } = await supabase.rpc('staff_add_time_off', { p_workshop_id: workshop.id, p_mechanic_id: mechanicId, p_starts_at: combineLocalDateTime(offDate, offStart), p_ends_at: combineLocalDateTime(offDate, offEnd), p_reason: offReason.trim() || null });
    if (error) return Alert.alert('Kapalı zaman eklenemedi', error.message);
    setOffReason(''); await load();
  };
  const saveSettings = async () => {
    if (!workshop?.id) return;
    const { error } = await supabase.rpc('staff_update_appointment_settings', { p_workshop_id: workshop.id, p_enabled: enabled, p_auto_confirm: autoConfirm, p_booking_days: Number(bookingDays), p_min_notice_minutes: Number(minNotice), p_timezone: workshop.timezone || 'Europe/Istanbul' });
    if (error) return Alert.alert('Ayarlar kaydedilemedi', error.message);
    await refreshWorkspace(workshop.id); Alert.alert('Randevu ayarları kaydedildi');
  };
  const setLive = async (value: string) => { if (!workshop?.id || !mechanicId) return; const { error } = await supabase.rpc('set_staff_availability', { p_workshop_id: workshop.id, p_user_id: mechanicId, p_status: value }); if (error) return Alert.alert('Durum değiştirilemedi', error.message); Alert.alert('Usta durumu güncellendi'); };

  return <View style={styles.sectionGap}>
    <Text style={[styles.sectionTitle, { color: colors.text }]}>Usta Seçimi</Text>
    <View style={styles.listChoices}>{mechanics.filter((m) => isOwner || m.mechanic_id === membershipId).map((item) => <Choice key={item.mechanic_id} active={mechanicId === item.mechanic_id} title={item.full_name} sub={item.role === 'owner_mechanic' ? 'İşletme Sahibi + Usta' : 'Usta'} onPress={() => setMechanicId(item.mechanic_id)} />)}</View>
    <GlassCard style={styles.form}><Text style={[styles.formTitle, { color: colors.text }]}>Canlı Durum</Text><View style={styles.actions}><Action label="Müsait" icon="checkmark-circle" accent={colors.green} onPress={() => setLive('available')} /><Action label="Meşgul" icon="time" accent={colors.orange} onPress={() => setLive('busy')} /><Action label="Kapalı" icon="close-circle" accent={colors.red} onPress={() => setLive('off')} /></View></GlassCard>

    <Text style={[styles.sectionTitle, { color: colors.text }]}>Haftalık Çalışma Saatleri</Text>
    {hours.map((item) => <GlassCard key={item.day_of_week} style={styles.hourCard}><View style={styles.hourHeader}><Text style={[styles.hourDay, { color: colors.text }]}>{dayNames[item.day_of_week]}</Text><AnimatedPressable onPress={() => updateHour(item.day_of_week, { is_working: !item.is_working })} style={[styles.toggle, { backgroundColor: item.is_working ? `${colors.green}18` : `${colors.red}12`, borderColor: item.is_working ? colors.green : colors.red }]}><Text style={[styles.toggleText, { color: item.is_working ? colors.green : colors.red }]}>{item.is_working ? 'AÇIK' : 'KAPALI'}</Text></AnimatedPressable></View>{item.is_working && <><View style={styles.twoCols}><View style={styles.flex}><FormField label="Başlangıç" value={item.start_time} onChangeText={(v) => updateHour(item.day_of_week, { start_time: v })} placeholder="09:00" /></View><View style={styles.flex}><FormField label="Bitiş" value={item.end_time} onChangeText={(v) => updateHour(item.day_of_week, { end_time: v })} placeholder="18:00" /></View></View><View style={styles.twoCols}><View style={styles.flex}><FormField label="Mola başlangıç" value={item.break_start ?? ''} onChangeText={(v) => updateHour(item.day_of_week, { break_start: v || null })} placeholder="13:00" /></View><View style={styles.flex}><FormField label="Mola bitiş" value={item.break_end ?? ''} onChangeText={(v) => updateHour(item.day_of_week, { break_end: v || null })} placeholder="14:00" /></View></View><FormField label="Randevu süresi (dakika)" value={String(item.slot_minutes)} onChangeText={(v) => updateHour(item.day_of_week, { slot_minutes: Number(v) || 60 })} keyboardType="number-pad" /></>}</GlassCard>)}
    <PrimaryButton title="Haftalık Saatleri Kaydet" onPress={saveHours} loading={saving} />

    <Text style={[styles.sectionTitle, { color: colors.text }]}>Belirli Gün / Saat Kapat</Text>
    <GlassCard style={styles.form}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>{dates.map((item) => <AnimatedPressable key={dateKey(item)} onPress={() => setOffDate(item)} style={[styles.dateChip, { backgroundColor: dateKey(item) === dateKey(offDate) ? colors.orange : colors.surfaceSoft, borderColor: dateKey(item) === dateKey(offDate) ? colors.orange : colors.border }]}><Text style={[styles.dateText, { color: dateKey(item) === dateKey(offDate) ? '#fff' : colors.text }]}>{formatCalendarDay(item)}</Text></AnimatedPressable>)}</ScrollView><View style={styles.twoCols}><View style={styles.flex}><FormField label="Başlangıç" value={offStart} onChangeText={setOffStart} /></View><View style={styles.flex}><FormField label="Bitiş" value={offEnd} onChangeText={setOffEnd} /></View></View><FormField label="Sebep" value={offReason} onChangeText={setOffReason} placeholder="Örn. Parça alımı, izin, özel iş" /><PrimaryButton title="Kapalı Zaman Ekle" onPress={addOff} secondary /></GlassCard>
    {timeOff.map((item) => <GlassCard key={item.id} style={styles.offCard}><Ionicons name="lock-closed" size={22} color={colors.red} /><View style={styles.copy}><Text style={[styles.cardTitle, { color: colors.text }]}>{formatAppointmentDate(item.starts_at)} • {formatAppointmentTime(item.starts_at)}-{formatAppointmentTime(item.ends_at)}</Text><Text style={[styles.cardMeta, { color: colors.textMuted }]}>{item.reason || 'Kapalı zaman'}</Text></View><AnimatedPressable onPress={() => Alert.alert('Kapalı zaman silinsin mi?', '', [{ text: 'Vazgeç' }, { text: 'Sil', style: 'destructive', onPress: async () => { const { error } = await supabase.rpc('staff_delete_time_off', { p_time_off_id: item.id }); if (error) return Alert.alert('Silinemedi', error.message); await load(); } }])}><Ionicons name="trash" size={20} color={colors.red} /></AnimatedPressable></GlassCard>)}

    {isOwner && <><Text style={[styles.sectionTitle, { color: colors.text }]}>İşletme Randevu Ayarları</Text><GlassCard style={styles.form}><SettingToggle label="Müşteri randevusu" value={enabled} onChange={setEnabled} /><SettingToggle label="Otomatik onay" value={autoConfirm} onChange={setAutoConfirm} /><FormField label="Kaç gün sonrasına kadar" value={bookingDays} onChangeText={setBookingDays} keyboardType="number-pad" /><FormField label="Minimum erken rezervasyon (dakika)" value={minNotice} onChangeText={setMinNotice} keyboardType="number-pad" /><PrimaryButton title="Randevu Ayarlarını Kaydet" onPress={saveSettings} /></GlassCard></>}
  </View>;
}

function Choice({ active, title, sub, onPress }: { active: boolean; title: string; sub: string; onPress: () => void }) { const { colors } = useTheme(); return <AnimatedPressable onPress={onPress} style={[styles.choice, { backgroundColor: active ? `${colors.primary}18` : colors.surfaceSoft, borderColor: active ? colors.primary : colors.border }]}><View style={styles.copy}><Text style={[styles.choiceTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.cardMeta, { color: colors.textMuted }]}>{sub}</Text></View>{active && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}</AnimatedPressable>; }
function FilterChip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) { const { colors } = useTheme(); return <AnimatedPressable onPress={onPress} style={[styles.filterChip, { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border }]}><Text style={[styles.filterText, { color: active ? '#fff' : colors.text }]}>{label}</Text></AnimatedPressable>; }
function MiniStat({ label, value, accent }: { label: string; value: number; accent: string }) { const { colors } = useTheme(); return <View style={[styles.miniStat, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.miniValue, { color: accent }]}>{value}</Text><Text style={[styles.miniLabel, { color: colors.textMuted }]}>{label}</Text></View>; }
function Action({ label, icon, accent, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; accent: string; onPress: () => void }) { return <AnimatedPressable onPress={onPress} style={[styles.action, { borderColor: `${accent}42`, backgroundColor: `${accent}0D` }]}><Ionicons name={icon} size={16} color={accent} /><Text style={[styles.actionText, { color: accent }]}>{label}</Text></AnimatedPressable>; }
function SettingToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) { const { colors } = useTheme(); return <AnimatedPressable onPress={() => onChange(!value)} style={[styles.setting, { backgroundColor: colors.surfaceSoft, borderColor: value ? colors.green : colors.border }]}><Text style={[styles.settingText, { color: colors.text }]}>{label}</Text><View style={[styles.toggle, { backgroundColor: value ? `${colors.green}18` : colors.card, borderColor: value ? colors.green : colors.border }]}><Text style={[styles.toggleText, { color: value ? colors.green : colors.textMuted }]}>{value ? 'AÇIK' : 'KAPALI'}</Text></View></AnimatedPressable>; }

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 56, paddingBottom: 120, gap: 15 }, tabs: { flexDirection: 'row', gap: 5, padding: 5, borderWidth: 1, borderRadius: 18 }, tab: { flex: 1, minHeight: 48, borderWidth: 1, borderColor: 'transparent', borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 3 }, tabText: { fontSize: 8.5, fontWeight: '900', textAlign: 'center' }, sectionGap: { gap: 14 }, dateRow: { gap: 8, paddingRight: 12 }, dateChip: { minWidth: 90, minHeight: 45, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 9 }, dateText: { fontSize: 10, fontWeight: '900' }, filterRow: { gap: 8, paddingRight: 12 }, filterChip: { minHeight: 40, borderWidth: 1, borderRadius: 999, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center' }, filterText: { fontSize: 10, fontWeight: '900' }, statsRow: { flexDirection: 'row', gap: 7 }, miniStat: { flex: 1, minHeight: 70, borderWidth: 1, borderRadius: 16, padding: 10, justifyContent: 'center' }, miniValue: { fontSize: 20, fontWeight: '900' }, miniLabel: { fontSize: 8.5, marginTop: 4 }, sectionTitle: { fontSize: 18, fontWeight: '900', marginTop: 2 }, empty: { alignItems: 'center', gap: 9, paddingVertical: 30 }, emptyTitle: { fontSize: 17, fontWeight: '900' }, appointmentCard: { gap: 11 }, cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, timeBox: { width: 57, height: 57, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }, time: { fontSize: 14, fontWeight: '900' }, timeEnd: { fontSize: 9, marginTop: 3 }, copy: { flex: 1, minWidth: 0 }, cardTitle: { fontSize: 13, fontWeight: '900' }, cardMeta: { fontSize: 9.5, lineHeight: 14, marginTop: 3 }, status: { fontSize: 8, fontWeight: '900', maxWidth: 78, textAlign: 'right' }, note: { borderRadius: 14, padding: 10, flexDirection: 'row', gap: 7 }, noteText: { flex: 1, fontSize: 10.5, lineHeight: 15 }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, action: { minHeight: 38, borderWidth: 1, borderRadius: 12, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }, actionText: { fontSize: 9, fontWeight: '900' }, form: { gap: 13 }, formTitle: { fontSize: 19, fontWeight: '900' }, label: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8 }, listChoices: { gap: 8 }, choice: { minHeight: 56, borderWidth: 1, borderRadius: 15, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }, choiceTitle: { fontSize: 12, fontWeight: '900' }, slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, slot: { minWidth: 68, minHeight: 41, borderWidth: 1, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, slotText: { fontSize: 11, fontWeight: '900' }, emptyText: { fontSize: 11, paddingVertical: 10 }, twoButtons: { flexDirection: 'row', gap: 8 }, flex: { flex: 1 }, hourCard: { gap: 12 }, hourHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, hourDay: { fontSize: 16, fontWeight: '900' }, toggle: { minWidth: 62, minHeight: 32, borderWidth: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 9 }, toggleText: { fontSize: 8.5, fontWeight: '900' }, twoCols: { flexDirection: 'row', gap: 9 }, offCard: { flexDirection: 'row', alignItems: 'center', gap: 10 }, setting: { minHeight: 56, borderWidth: 1, borderRadius: 16, padding: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, settingText: { fontSize: 12, fontWeight: '900' },
});
