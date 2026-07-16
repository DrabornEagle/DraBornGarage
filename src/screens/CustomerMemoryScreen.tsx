import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AnimatedMotorcycleIcon } from '../components/AnimatedMotorcycleIcon';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { FormField } from '../components/FormField';
import { GlassCard } from '../components/GlassCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { StatusPill } from '../components/StatusPill';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { money } from '../lib/format';
import { supabase } from '../lib/supabase';
import { useSmartAutoRefresh } from '../hooks/useSmartAutoRefresh';
import { Customer, Motorcycle, WorkOrderStatus } from '../types';
import { CustomersScreen as LegacyCustomersScreen } from './CustomersScreen';

type ScreenMode = 'memory' | 'management';

type MemoryMotorcycle = Motorcycle & {
  staff_note?: string | null;
  next_service_note?: string | null;
  next_service_due_km?: number | null;
  next_service_due_date?: string | null;
};

type HistoryOrder = {
  id: string;
  customer_id: string;
  motorcycle_id: string;
  assigned_mechanic_id?: string | null;
  complaint: string;
  diagnosis?: string | null;
  notes?: string | null;
  status: WorkOrderStatus;
  service_type: string;
  odometer_in?: number | null;
  total_amount: number;
  amount_received: number;
  arrived_at: string;
  started_at?: string | null;
  testing_started_at?: string | null;
  ready_at?: string | null;
  completed_at?: string | null;
  delivered_at?: string | null;
  mechanic?: { full_name?: string | null } | null;
};

type ServiceRow = {
  id: string;
  work_order_id: string;
  title: string;
  description?: string | null;
  price: number;
  completed: boolean;
  started_at?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
};

type PartRow = {
  id: string;
  work_order_id: string;
  part_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  used_at?: string | null;
  created_at?: string | null;
};

type NoteRow = {
  id: string;
  work_order_id: string;
  category: string;
  visibility?: string | null;
  note: string;
  author_name?: string | null;
  created_at: string;
};

function fullDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '-';
  return new Intl.DateTimeFormat('tr-TR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function compactDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '-';
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function serviceTypeLabel(value: string) {
  if (value === 'quick') return 'Hızlı Servis';
  if (value === 'appointment') return 'Randevulu Servis';
  return 'Bırakılan Motor';
}

const NOTE_LABELS: Record<string, string> = {
  general: 'Genel Not', diagnosis: 'Tespit', test: 'Test Notu', customer_update: 'Müşteri Bilgisi', internal: 'Usta Dahili Notu',
};

export function CustomerMemoryScreen({ initialTab = 'customers' }: { initialTab?: 'customers' | 'claims' }) {
  const { colors } = useTheme();
  const { workshop } = useAuth();
  const [mode, setMode] = useState<ScreenMode>(initialTab === 'claims' ? 'management' : 'memory');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [motorcycles, setMotorcycles] = useState<MemoryMotorcycle[]>([]);
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [parts, setParts] = useState<PartRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [query, setQuery] = useState('');
  const [openCustomer, setOpenCustomer] = useState<string | null>(null);
  const [openBike, setOpenBike] = useState<string | null>(null);
  const [openOrder, setOpenOrder] = useState<string | null>(null);
  const [editingBike, setEditingBike] = useState<string | null>(null);
  const [staffNote, setStaffNote] = useState('');
  const [nextServiceNote, setNextServiceNote] = useState('');
  const [nextServiceKm, setNextServiceKm] = useState('');
  const [nextServiceDate, setNextServiceDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { setMode(initialTab === 'claims' ? 'management' : 'memory'); }, [initialTab]);

  const load = useCallback(async (silent = false) => {
    if (!workshop) return;
    const [customerResult, motorcycleResult, orderResult] = await Promise.all([
      supabase.from('customers').select('*').eq('workshop_id', workshop.id).order('full_name'),
      supabase.from('motorcycles').select('*').eq('workshop_id', workshop.id).order('created_at', { ascending: false }),
      supabase.from('work_orders')
        .select('id,customer_id,motorcycle_id,assigned_mechanic_id,complaint,diagnosis,notes,status,service_type,odometer_in,total_amount,amount_received,arrived_at,started_at,testing_started_at,ready_at,completed_at,delivered_at,mechanic:profiles!work_orders_assigned_mechanic_id_fkey(full_name)')
        .eq('workshop_id', workshop.id)
        .order('arrived_at', { ascending: false }),
    ]);
    if (customerResult.error || motorcycleResult.error || orderResult.error) {
      if (!silent) Alert.alert('Müşteri hafızası açılamadı', customerResult.error?.message || motorcycleResult.error?.message || orderResult.error?.message || 'Bilinmeyen hata');
      return;
    }
    const nextOrders = (orderResult.data as unknown as HistoryOrder[]) ?? [];
    const orderIds = nextOrders.map((item) => item.id);
    let nextServices: ServiceRow[] = [];
    let nextParts: PartRow[] = [];
    let nextNotes: NoteRow[] = [];
    if (orderIds.length > 0) {
      const [serviceResult, partResult, noteResult] = await Promise.all([
        supabase.from('work_order_services').select('id,work_order_id,title,description,price,completed,started_at,completed_at,created_at').in('work_order_id', orderIds).order('created_at', { ascending: false }),
        supabase.from('work_order_parts').select('id,work_order_id,part_name,quantity,unit_price,total_price,used_at,created_at').in('work_order_id', orderIds).order('created_at', { ascending: false }),
        supabase.from('work_order_notes').select('id,work_order_id,category,visibility,note,author_name,created_at').in('work_order_id', orderIds).order('created_at', { ascending: false }),
      ]);
      if (serviceResult.error || partResult.error || noteResult.error) {
        Alert.alert('Servis ayrıntıları alınamadı', serviceResult.error?.message || partResult.error?.message || noteResult.error?.message || 'Bilinmeyen hata');
      }
      nextServices = (serviceResult.data as ServiceRow[]) ?? [];
      nextParts = (partResult.data as PartRow[]) ?? [];
      nextNotes = (noteResult.data as NoteRow[]) ?? [];
    }
    setCustomers((customerResult.data as Customer[]) ?? []);
    setMotorcycles((motorcycleResult.data as MemoryMotorcycle[]) ?? []);
    setOrders(nextOrders);
    setServices(nextServices);
    setParts(nextParts);
    setNotes(nextNotes);
  }, [workshop]);

  useEffect(() => { load(); }, [load]);
  useSmartAutoRefresh(() => load(true), 60000, Boolean(workshop));
  useEffect(() => {
    if (!workshop?.id) return;
    const refreshSilently = () => { load(true).catch(() => undefined); };
    const channel = supabase.channel(`customer-memory-live-${workshop.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers', filter: `workshop_id=eq.${workshop.id}` }, refreshSilently)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'motorcycles', filter: `workshop_id=eq.${workshop.id}` }, refreshSilently)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_orders', filter: `workshop_id=eq.${workshop.id}` }, refreshSilently)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [workshop?.id, load]);

  const visibleCustomers = useMemo(() => {
    const value = query.trim().toLocaleLowerCase('tr-TR');
    if (!value) return customers;
    return customers.filter((customer) => {
      if (`${customer.full_name} ${customer.phone || ''}`.toLocaleLowerCase('tr-TR').includes(value)) return true;
      return motorcycles.some((bike) => bike.customer_id === customer.id && `${bike.brand} ${bike.model} ${bike.plate || ''}`.toLocaleLowerCase('tr-TR').includes(value));
    });
  }, [query, customers, motorcycles]);

  const editBike = (bike: MemoryMotorcycle) => {
    setEditingBike(bike.id);
    setStaffNote(bike.staff_note || '');
    setNextServiceNote(bike.next_service_note || '');
    setNextServiceKm(bike.next_service_due_km ? String(bike.next_service_due_km) : '');
    setNextServiceDate(bike.next_service_due_date || '');
  };

  const saveBikeMemory = async (bikeId: string) => {
    const dueKm = nextServiceKm.trim() ? Number(nextServiceKm.replace(/\D/g, '')) : null;
    if (nextServiceDate.trim() && !/^\d{4}-\d{2}-\d{2}$/.test(nextServiceDate.trim())) {
      return Alert.alert('Tarih biçimini kontrol et', 'Tarihi 2026-12-31 şeklinde gir.');
    }
    setSaving(true);
    const { error } = await supabase.from('motorcycles').update({
      staff_note: staffNote.trim() || null,
      next_service_note: nextServiceNote.trim() || null,
      next_service_due_km: dueKm,
      next_service_due_date: nextServiceDate.trim() || null,
    }).eq('id', bikeId);
    setSaving(false);
    if (error) return Alert.alert('Motor hafızası kaydedilemedi', error.message);
    setEditingBike(null);
    await load();
    Alert.alert('Usta notu kaydedildi', 'Bu bilgi motor tekrar geldiğinde müşteri hafızasında görünecek.');
  };

  if (mode === 'management') {
    return <View style={styles.full}>
      <View style={[styles.modeTabsFloating, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}>
        <ModeButton active={false} label="Müşteri Hafızası" icon="time" onPress={() => setMode('memory')} />
        <ModeButton active label="Kayıt ve Eşleşme" icon="people" onPress={() => undefined} />
      </View>
      <LegacyCustomersScreen initialTab={initialTab === 'claims' ? 'claims' : 'customers'} />
    </View>;
  }

  return <ScrollView
    contentContainerStyle={styles.content}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} />}
    showsVerticalScrollIndicator={false}
  >
    <ScreenHeader eyebrow="MÜŞTERİ HAFIZASI" title="Müşteriler" subtitle="Motorun kilometreli servis geçmişi, yapılan işlemler, parçalar ve ustanın sonraki geliş notları." />

    <View style={[styles.modeTabs, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}>
      <ModeButton active label="Müşteri Hafızası" icon="time" onPress={() => undefined} />
      <ModeButton active={false} label="Kayıt ve Eşleşme" icon="people" onPress={() => setMode('management')} />
    </View>

    <View style={[styles.search, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Ionicons name="search" size={20} color={colors.textMuted} />
      <TextInput value={query} onChangeText={setQuery} placeholder="Ad, telefon, marka, model veya plaka ara" placeholderTextColor={colors.textMuted} style={[styles.searchInput, { color: colors.text }]} />
    </View>

    {visibleCustomers.map((customer) => {
      const bikes = motorcycles.filter((item) => item.customer_id === customer.id);
      const customerOrders = orders.filter((item) => item.customer_id === customer.id);
      const expanded = openCustomer === customer.id;
      return <GlassCard key={customer.id} style={styles.customerCard}>
        <AnimatedPressable onPress={() => { setOpenCustomer(expanded ? null : customer.id); setOpenBike(null); setOpenOrder(null); }} style={styles.customerHeader}>
          <View style={[styles.avatar, { backgroundColor: `${colors.primary}18`, borderColor: `${colors.primary}42` }]}><Text style={[styles.avatarText, { color: colors.primary }]}>{customer.full_name.charAt(0).toUpperCase()}</Text></View>
          <View style={styles.copy}>
            <Text style={[styles.customerName, { color: colors.text }]}>{customer.full_name}</Text>
            <Text style={[styles.meta, { color: colors.textMuted }]}>{customer.phone || 'Telefon yok'} • {bikes.length} motor • {customerOrders.length} servis kaydı</Text>
            {!!customer.note && <Text style={[styles.customerNote, { color: colors.orange }]}>Müşteri notu: {customer.note}</Text>}
          </View>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={21} color={colors.textMuted} />
        </AnimatedPressable>

        {expanded && <View style={[styles.expanded, { borderTopColor: colors.border }]}>
          {bikes.length === 0 && <Text style={[styles.emptyText, { color: colors.textMuted }]}>Bu müşteriye bağlı motosiklet bulunmuyor. Kayıt ve Eşleşme bölümünden motor ekleyebilirsin.</Text>}
          {bikes.map((bike) => {
            const bikeOrders = customerOrders.filter((item) => item.motorcycle_id === bike.id).sort((a, b) => new Date(b.arrived_at).getTime() - new Date(a.arrived_at).getTime());
            const bikeOrderIds = new Set(bikeOrders.map((item) => item.id));
            const oilServices = services
              .filter((item) => bikeOrderIds.has(item.work_order_id) && /(^|\s)(yağ|motor yağı|oil)(\s|$)/i.test(`${item.title} ${item.description || ''}`))
              .sort((a, b) => new Date(b.completed_at || b.created_at || 0).getTime() - new Date(a.completed_at || a.created_at || 0).getTime());
            const latestOil = oilServices[0];
            const latestOilOrder = latestOil ? bikeOrders.find((item) => item.id === latestOil.work_order_id) : undefined;
            const bikeExpanded = openBike === bike.id;
            return <View key={bike.id} style={[styles.bikeCard, { backgroundColor: colors.surfaceSoft, borderColor: bike.next_service_note ? `${colors.orange}58` : colors.border }]}>
              <AnimatedPressable onPress={() => { setOpenBike(bikeExpanded ? null : bike.id); setOpenOrder(null); }} style={styles.bikeHeader}>
                <View style={[styles.bikeIcon, { backgroundColor: `${colors.primary2}16` }]}><AnimatedMotorcycleIcon size={34} color={colors.primary2} /></View>
                <View style={styles.copy}>
                  <Text style={[styles.bikeTitle, { color: colors.text }]}>{bike.brand} {bike.model}</Text>
                  <Text style={[styles.meta, { color: colors.textMuted }]}>{bike.plate || 'Plaka yok'} • Güncel km: {bike.odometer ? bike.odometer.toLocaleString('tr-TR') : 'Girilmedi'} • {bikeOrders.length} servis</Text>
                  {latestOilOrder && <Text style={[styles.memoryHighlight, { color: colors.green }]}>Son yağ değişimi: {latestOilOrder.odometer_in ? `${latestOilOrder.odometer_in.toLocaleString('tr-TR')} km` : 'km girilmedi'} • {compactDate(latestOilOrder.completed_at || latestOilOrder.delivered_at || latestOilOrder.arrived_at)}</Text>}
                </View>
                <Ionicons name={bikeExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
              </AnimatedPressable>

              {(bike.staff_note || bike.next_service_note || bike.next_service_due_km || bike.next_service_due_date) && <View style={[styles.memoryBox, { backgroundColor: `${colors.orange}0B`, borderColor: `${colors.orange}38` }]}>
                <Ionicons name="bookmark" size={21} color={colors.orange} />
                <View style={styles.copy}>
                  {!!bike.staff_note && <Text style={[styles.memoryText, { color: colors.text }]}>Usta özel notu: {bike.staff_note}</Text>}
                  {!!bike.next_service_note && <Text style={[styles.memoryText, { color: colors.orange }]}>Sonraki geliş: {bike.next_service_note}</Text>}
                  {(bike.next_service_due_km || bike.next_service_due_date) && <Text style={[styles.meta, { color: colors.textMuted }]}>Hedef: {bike.next_service_due_km ? `${bike.next_service_due_km.toLocaleString('tr-TR')} km` : '-'} • {bike.next_service_due_date ? compactDate(bike.next_service_due_date) : 'tarih yok'}</Text>}
                </View>
              </View>}

              {bikeExpanded && <View style={styles.bikeBody}>
                <AnimatedPressable onPress={() => editingBike === bike.id ? setEditingBike(null) : editBike(bike)} style={[styles.noteButton, { backgroundColor: `${colors.orange}10`, borderColor: `${colors.orange}40` }]}>
                  <Ionicons name={editingBike === bike.id ? 'close' : 'create'} size={18} color={colors.orange} />
                  <Text style={[styles.noteButtonText, { color: colors.orange }]}>{editingBike === bike.id ? 'Usta Notunu Kapat' : 'Usta / Sonraki Servis Notu'}</Text>
                </AnimatedPressable>

                {editingBike === bike.id && <View style={[styles.editor, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <FormField label="Ustanın özel motor notu" value={staffNote} onChangeText={setStaffNote} multiline placeholder="Örn. Soğuk çalıştırmada sesi tekrar kontrol et" />
                  <FormField label="Bir sonraki gelişte yapılacak" value={nextServiceNote} onChangeText={setNextServiceNote} multiline placeholder="Örn. Ön fren balatası değişecek" />
                  <View style={styles.twoCol}><View style={styles.copy}><FormField label="Hedef kilometre" value={nextServiceKm} onChangeText={(value) => setNextServiceKm(value.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="15000" /></View><View style={styles.copy}><FormField label="Hedef tarih" value={nextServiceDate} onChangeText={setNextServiceDate} placeholder="2026-12-31" /></View></View>
                  <PrimaryButton title="Motor Hafızasını Kaydet" onPress={() => saveBikeMemory(bike.id)} loading={saving} />
                </View>}

                <Text style={[styles.sectionTitle, { color: colors.text }]}>Tüm Servis Geçmişi</Text>
                {bikeOrders.length === 0 ? <Text style={[styles.emptyText, { color: colors.textMuted }]}>Bu motor için henüz servis kaydı yok.</Text> : bikeOrders.map((order) => {
                  const orderServices = services.filter((item) => item.work_order_id === order.id);
                  const orderParts = parts.filter((item) => item.work_order_id === order.id);
                  const orderNotes = notes.filter((item) => item.work_order_id === order.id);
                  const expandedOrder = openOrder === order.id;
                  return <View key={order.id} style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <AnimatedPressable onPress={() => setOpenOrder(expandedOrder ? null : order.id)} style={styles.orderHeader}>
                      <View style={[styles.orderIcon, { backgroundColor: `${colors.cyan}14` }]}><Ionicons name="receipt" size={22} color={colors.cyan} /></View>
                      <View style={styles.copy}>
                        <Text style={[styles.orderTitle, { color: colors.text }]}>{order.complaint}</Text>
                        <Text style={[styles.meta, { color: colors.textMuted }]}>{fullDateTime(order.arrived_at)}</Text>
                        <Text style={[styles.metaStrong, { color: colors.primary2 }]}>{order.odometer_in ? `${order.odometer_in.toLocaleString('tr-TR')} km` : 'Kilometre girilmedi'} • {serviceTypeLabel(order.service_type)} • {order.mechanic?.full_name || 'Usta belirtilmedi'}</Text>
                      </View>
                      <StatusPill status={order.status} />
                    </AnimatedPressable>
                    {expandedOrder && <View style={[styles.orderBody, { borderTopColor: colors.border }]}>
                      {!!order.diagnosis && <DetailLine icon="search" label="Tespit" value={order.diagnosis} />}
                      {!!order.notes && <DetailLine icon="document-text" label="Servis kabul notu" value={order.notes} />}
                      <DetailLine icon="play" label="Başlama" value={fullDateTime(order.started_at)} />
                      <DetailLine icon="speedometer" label="Test" value={fullDateTime(order.testing_started_at)} />
                      <DetailLine icon="checkmark-done" label="Hazır" value={fullDateTime(order.ready_at)} />
                      <DetailLine icon="hand-left" label="Teslim" value={fullDateTime(order.delivered_at || order.completed_at)} />

                      <Text style={[styles.subTitle, { color: colors.text }]}>Yapılan İşlemler</Text>
                      {orderServices.length === 0 ? <Text style={[styles.emptyText, { color: colors.textMuted }]}>İşlem kalemi girilmemiş.</Text> : orderServices.map((item) => <View key={item.id} style={[styles.lineItem, { borderBottomColor: colors.border }]}><Ionicons name={item.completed ? 'checkmark-circle' : 'time'} size={19} color={item.completed ? colors.green : colors.orange} /><View style={styles.copy}><Text style={[styles.lineTitle, { color: colors.text }]}>{item.title}</Text>{!!item.description && <Text style={[styles.meta, { color: colors.textMuted }]}>{item.description}</Text>}<Text style={[styles.meta, { color: colors.textMuted }]}>{fullDateTime(item.completed_at || item.started_at || item.created_at)}</Text></View><Text style={[styles.lineAmount, { color: colors.green }]}>{money(item.price)}</Text></View>)}

                      <Text style={[styles.subTitle, { color: colors.text }]}>Kullanılan Parçalar</Text>
                      {orderParts.length === 0 ? <Text style={[styles.emptyText, { color: colors.textMuted }]}>Parça kaydı yok.</Text> : orderParts.map((item) => <View key={item.id} style={[styles.lineItem, { borderBottomColor: colors.border }]}><Ionicons name="cog" size={19} color={colors.primary} /><View style={styles.copy}><Text style={[styles.lineTitle, { color: colors.text }]}>{item.part_name}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{item.quantity} adet • {fullDateTime(item.used_at || item.created_at)}</Text></View><Text style={[styles.lineAmount, { color: colors.text }]}>{money(item.total_price)}</Text></View>)}

                      <Text style={[styles.subTitle, { color: colors.text }]}>Usta ve Servis Notları</Text>
                      {orderNotes.length === 0 ? <Text style={[styles.emptyText, { color: colors.textMuted }]}>Bu serviste not bırakılmamış.</Text> : orderNotes.map((item) => <View key={item.id} style={[styles.noteRow, { backgroundColor: `${colors.primary}09`, borderColor: `${colors.primary}24` }]}><Ionicons name={item.visibility === 'staff' ? 'lock-closed' : 'chatbubble'} size={18} color={item.visibility === 'staff' ? colors.orange : colors.cyan} /><View style={styles.copy}><Text style={[styles.noteCategory, { color: colors.text }]}>{NOTE_LABELS[item.category] || item.category} • {item.author_name || 'Usta'}</Text><Text style={[styles.noteValue, { color: colors.textSoft }]}>{item.note}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{fullDateTime(item.created_at)} • {item.visibility === 'staff' ? 'Yalnız personel' : 'Müşteriyle paylaşılan'}</Text></View></View>)}

                      <View style={[styles.totalRow, { borderTopColor: colors.border }]}><View><Text style={[styles.totalLabel, { color: colors.textMuted }]}>TOPLAM</Text><Text style={[styles.totalValue, { color: colors.text }]}>{money(order.total_amount)}</Text></View><View style={styles.right}><Text style={[styles.totalLabel, { color: colors.textMuted }]}>TAHSİL EDİLEN</Text><Text style={[styles.totalValue, { color: colors.green }]}>{money(order.amount_received)}</Text></View></View>
                    </View>}
                  </View>;
                })}
              </View>}
            </View>;
          })}
        </View>}
      </GlassCard>;
    })}

    {visibleCustomers.length === 0 && <GlassCard style={styles.empty}><Ionicons name="people-outline" size={42} color={colors.textMuted} /><Text style={[styles.emptyTitle, { color: colors.text }]}>Müşteri bulunamadı</Text><Text style={[styles.emptyText, { color: colors.textMuted }]}>Kayıt ve Eşleşme bölümünden müşteri ekleyebilirsin.</Text></GlassCard>}
  </ScrollView>;
}

function ModeButton({ active, label, icon, onPress }: { active: boolean; label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  const { colors } = useTheme();
  return <AnimatedPressable onPress={onPress} style={[styles.modeButton, { backgroundColor: active ? colors.cardStrong : 'transparent', borderColor: active ? `${colors.primary}58` : 'transparent' }]}><Ionicons name={icon} size={18} color={active ? colors.primary : colors.textMuted} /><Text style={[styles.modeText, { color: active ? colors.text : colors.textMuted }]}>{label}</Text></AnimatedPressable>;
}

function DetailLine({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  const { colors } = useTheme();
  return <View style={[styles.detailLine, { borderBottomColor: colors.border }]}><Ionicons name={icon} size={18} color={colors.textMuted} /><View style={styles.copy}><Text style={[styles.detailLabel, { color: colors.textMuted }]}>{label}</Text><Text style={[styles.detailValue, { color: colors.text }]}>{value}</Text></View></View>;
}

const styles = StyleSheet.create({
  full: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 56, paddingBottom: 150, gap: 14 },
  modeTabs: { flexDirection: 'row', borderWidth: 1, borderRadius: 18, padding: 5, gap: 5 },
  modeTabsFloating: { marginHorizontal: 18, marginTop: 48, marginBottom: -42, zIndex: 10, flexDirection: 'row', borderWidth: 1, borderRadius: 18, padding: 5, gap: 5 },
  modeButton: { flex: 1, minHeight: 47, borderWidth: 1, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  modeText: { fontSize: 12, fontWeight: '900' },
  search: { minHeight: 54, borderWidth: 1, borderRadius: 18, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 9 },
  searchInput: { flex: 1 },
  customerCard: { padding: 14 },
  customerHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 48, height: 48, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '900' },
  copy: { flex: 1, minWidth: 0 },
  customerName: { fontSize: 16, fontWeight: '900' },
  customerNote: { fontSize: 12, fontWeight: '800', marginTop: 5 },
  meta: { fontSize: 11.5, lineHeight: 16, marginTop: 3 },
  metaStrong: { fontSize: 11.5, fontWeight: '900', lineHeight: 16, marginTop: 4 },
  expanded: { borderTopWidth: 1, marginTop: 13, paddingTop: 12, gap: 10 },
  bikeCard: { borderWidth: 1, borderRadius: 20, padding: 12, gap: 10 },
  bikeHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  bikeIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  bikeTitle: { fontSize: 14, fontWeight: '900' },
  memoryHighlight: { fontSize: 11.5, lineHeight: 16, fontWeight: '900', marginTop: 5 },
  memoryBox: { borderWidth: 1, borderRadius: 15, padding: 10, flexDirection: 'row', gap: 9 },
  memoryText: { fontSize: 12.5, fontWeight: '800', lineHeight: 18 },
  bikeBody: { gap: 11 },
  noteButton: { minHeight: 44, borderWidth: 1, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  noteButtonText: { fontSize: 12.5, fontWeight: '900' },
  editor: { borderWidth: 1, borderRadius: 18, padding: 12, gap: 11 },
  twoCol: { flexDirection: 'row', gap: 9 },
  sectionTitle: { fontSize: 14, fontWeight: '900', marginTop: 4 },
  orderCard: { borderWidth: 1, borderRadius: 17, overflow: 'hidden' },
  orderHeader: { padding: 11, flexDirection: 'row', alignItems: 'center', gap: 9 },
  orderIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  orderTitle: { fontSize: 13.5, fontWeight: '900' },
  orderBody: { borderTopWidth: 1, padding: 11, gap: 7 },
  detailLine: { minHeight: 52, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 9 },
  detailLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 0.6 },
  detailValue: { fontSize: 12.5, fontWeight: '800', marginTop: 3, lineHeight: 17 },
  subTitle: { fontSize: 13, fontWeight: '900', marginTop: 9 },
  lineItem: { minHeight: 59, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 9 },
  lineTitle: { fontSize: 12.5, fontWeight: '900' },
  lineAmount: { fontSize: 12, fontWeight: '900' },
  noteRow: { borderWidth: 1, borderRadius: 14, padding: 10, flexDirection: 'row', gap: 9 },
  noteCategory: { fontSize: 11.5, fontWeight: '900' },
  noteValue: { fontSize: 12.5, lineHeight: 18, marginTop: 4 },
  totalRow: { borderTopWidth: 1, marginTop: 8, paddingTop: 11, flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 0.7 },
  totalValue: { fontSize: 16, fontWeight: '900', marginTop: 3 },
  right: { alignItems: 'flex-end' },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 30 },
  emptyTitle: { fontSize: 17, fontWeight: '900' },
  emptyText: { fontSize: 12.5, lineHeight: 18, textAlign: 'center' },
});
