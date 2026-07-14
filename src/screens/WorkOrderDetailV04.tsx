import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { FormField } from '../components/FormField';
import { GlassCard } from '../components/GlassCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { ReceivableManagerCard } from '../components/ReceivableManagerCard';
import { StatusPill, statusLabels } from '../components/StatusPill';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { money } from '../lib/format';
import { supabase } from '../lib/supabase';
import {
  ExtraApprovalMethod,
  ExtraWorkRequest,
  PriceType,
  WorkNoteCategory,
  WorkNoteVisibility,
  WorkOrderEvent,
  WorkOrderNote,
  WorkOrderStatus,
} from '../types';

const statusFlow: WorkOrderStatus[] = [
  'received', 'queued', 'precheck', 'price_entered', 'approval_waiting', 'repair_started',
  'extra_approval_waiting', 'parts_waiting', 'testing', 'ready', 'delivered', 'cancelled',
];

const extraActionOptions = [
  { value: 'pending_app', label: 'Uygulamadan onay bekle', icon: 'phone-portrait' as const },
  { value: 'approved_in_person', label: 'Yanımda onay verdi', icon: 'people' as const },
  { value: 'approved_phone', label: 'Telefonla onay', icon: 'call' as const },
  { value: 'approved_whatsapp', label: 'WhatsApp onayı', icon: 'logo-whatsapp' as const },
  { value: 'rejected', label: 'Reddedildi', icon: 'close-circle' as const },
];

const approvalMethodLabel: Record<string, string> = {
  app: 'Uygulama',
  in_person: 'Müşteri yanında',
  phone: 'Telefon',
  whatsapp: 'WhatsApp',
  staff_rejected: 'Personel kaydı',
};

const noteCategoryLabel: Record<string, string> = {
  general: 'Genel', diagnosis: 'Tespit', test: 'Test', customer_update: 'Müşteri Bilgisi', internal: 'Dahili',
};

const eventLabel: Record<string, string> = {
  status_changed: 'Servis durumu değişti',
  service_added: 'İşlem eklendi',
  service_started: 'İşleme başlandı',
  service_completed: 'İşlem tamamlandı',
  service_deleted: 'İşlem silindi',
  part_added: 'Parça eklendi',
  part_deleted: 'Parça silindi',
  note_added: 'Servis notu eklendi',
  note_deleted: 'Servis notu silindi',
  extra_created: 'Ek işlem talebi açıldı',
  extra_approved: 'Ek işlem onaylandı',
  extra_rejected: 'Ek işlem reddedildi',
};

function dateTime(value?: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export function WorkOrderDetailV04({ orderId, apprenticeData, onBack }: { orderId: string; apprenticeData?: any | null; onBack: () => void }) {
  const { colors } = useTheme();
  const { membership } = useAuth();
  const isApprentice = Boolean(apprenticeData);
  const [order, setOrder] = useState<any>(apprenticeData ?? null);
  const [services, setServices] = useState<any[]>([]);
  const [parts, setParts] = useState<any[]>([]);
  const [extras, setExtras] = useState<ExtraWorkRequest[]>([]);
  const [notes, setNotes] = useState<WorkOrderNote[]>([]);
  const [events, setEvents] = useState<WorkOrderEvent[]>([]);
  const [saving, setSaving] = useState(false);
  const [readyPaymentPromptVisible, setReadyPaymentPromptVisible] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ status: true, price: false, extras: false, services: false, parts: false, notes: false, history: false, receivables: false });
  const scrollRef = useRef<ScrollView>(null);
  const [priceType, setPriceType] = useState<PriceType>('fixed');
  const [fixedPrice, setFixedPrice] = useState('');
  const [estimateMin, setEstimateMin] = useState('');
  const [estimateMax, setEstimateMax] = useState('');

  const [extraTitle, setExtraTitle] = useState('');
  const [extraDescription, setExtraDescription] = useState('');
  const [extraLabor, setExtraLabor] = useState('');
  const [extraParts, setExtraParts] = useState('');
  const [extraAction, setExtraAction] = useState('pending_app');

  const [serviceTitle, setServiceTitle] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [serviceExtraId, setServiceExtraId] = useState<string | null>(null);

  const [partName, setPartName] = useState('');
  const [partQty, setPartQty] = useState('1');
  const [partPrice, setPartPrice] = useState('');
  const [partExtraId, setPartExtraId] = useState<string | null>(null);

  const [noteText, setNoteText] = useState('');
  const [noteVisibility, setNoteVisibility] = useState<WorkNoteVisibility>('staff');
  const [noteCategory, setNoteCategory] = useState<WorkNoteCategory>('general');

  const approvedExtras = useMemo(() => extras.filter((item) => item.status === 'approved'), [extras]);
  const toggleSection = (key: string) => setOpenSections((current) => ({ ...current, [key]: !current[key] }));
  useEffect(() => { if (extras.some((item) => item.status === 'pending')) setOpenSections((current) => current.extras ? current : ({ ...current, extras: true })); }, [extras]);

  const load = useCallback(async () => {
    if (isApprentice) return;
    const [orderResult, servicesResult, partsResult, extrasResult, notesResult, eventsResult] = await Promise.all([
      supabase.from('work_orders').select('*,customer:customers(*),motorcycle:motorcycles(*),mechanic:profiles!work_orders_assigned_mechanic_id_fkey(full_name)').eq('id', orderId).single(),
      supabase.from('work_order_services').select('*,mechanic:profiles!work_order_services_mechanic_id_fkey(full_name)').eq('work_order_id', orderId).order('created_at'),
      supabase.from('work_order_parts').select('*').eq('work_order_id', orderId).order('created_at'),
      supabase.from('work_order_extra_requests').select('*').eq('work_order_id', orderId).order('created_at', { ascending: false }),
      supabase.from('work_order_notes').select('*').eq('work_order_id', orderId).order('created_at', { ascending: false }),
      supabase.from('work_order_events').select('*').eq('work_order_id', orderId).order('created_at', { ascending: false }),
    ]);
    if (orderResult.error) return Alert.alert('İş emri açılamadı', orderResult.error.message);
    const next = orderResult.data;
    setOrder(next);
    setServices(servicesResult.data ?? []);
    setParts(partsResult.data ?? []);
    setExtras((extrasResult.data as ExtraWorkRequest[]) ?? []);
    setNotes((notesResult.data as WorkOrderNote[]) ?? []);
    setEvents((eventsResult.data as WorkOrderEvent[]) ?? []);
    setPriceType(next.price_type ?? 'fixed');
    setFixedPrice(next.quoted_price ? String(next.quoted_price) : '');
    setEstimateMin(next.estimated_price_min ? String(next.estimated_price_min) : '');
    setEstimateMax(next.estimated_price_max ? String(next.estimated_price_max) : '');
  }, [orderId, isApprentice]);

  useEffect(() => { load(); }, [load]);

  const run = async (action: () => PromiseLike<{ error: any }>, fallback: string) => {
    setSaving(true);
    const result = await action();
    setSaving(false);
    if (result.error) return Alert.alert(fallback, result.error.message);
    await load();
  };

  const openReceivableFlow = () => {
    setOpenSections((current) => ({ ...current, receivables: true }));
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 220);
  };

  const changeStatus = async (status: WorkOrderStatus) => {
    if (status === 'delivered' && Number(order?.total_amount || 0) <= 0) {
      setPriceType('fixed');
      setFixedPrice('');
      setOpenSections((current) => ({ ...current, price: true, status: false }));
      setTimeout(() => scrollRef.current?.scrollTo({ y: 420, animated: true }), 180);
      Alert.alert('Son net fiyat gerekli', 'Motor Hazır durumunda tahmini fiyat gösterilebilir; ancak teslim edilmeden önce son net fiyatı veya yapılan işlem tutarını kaydetmelisin.');
      return;
    }
    const { error } = await supabase.rpc('update_work_order_status', { p_work_order_id: orderId, p_status: status });
    if (error) return Alert.alert('Durum değiştirilemedi', error.message);
    if (isApprentice) setOrder((current: any) => ({ ...current, status }));
    else await load();
    if (status === 'ready' && !isApprentice) {
      setReadyPaymentPromptVisible(true);
    }
  };

  if (!order) return <View style={styles.loading}><Text style={{ color: colors.textMuted }}>Servis kaydı yükleniyor…</Text></View>;

  const brand = order.motorcycle?.brand ?? order.brand;
  const model = order.motorcycle?.model ?? order.model;
  const plate = order.motorcycle?.plate ?? order.plate;

  if (isApprentice) {
    const allowed: WorkOrderStatus[] = ['precheck', 'parts_waiting', 'testing'];
    return <ScrollView contentContainerStyle={styles.content}>
      <Header onBack={onBack} title={`${brand} ${model}`} subtitle={`${plate || 'Plaka yok'} • Sıra ${order.queue_position ?? '-'}`} status={order.status} />
      <GlassCard style={styles.stack}>
        <Label text="YAPILACAK İŞ" /><Text style={[styles.body, { color: colors.text }]}>{order.complaint}</Text>
        {!!order.notes && <><Label text="ATÖLYE NOTU" /><Text style={[styles.body, { color: colors.text }]}>{order.notes}</Text></>}
        <View style={[styles.notice, { backgroundColor: `${colors.orange}10`, borderColor: `${colors.orange}35` }]}><Ionicons name="eye-off" size={20} color={colors.orange} /><Text style={[styles.noticeText, { color: colors.textMuted }]}>Finans, müşteri borcu, ek ücret ve onay bilgileri Çırak Panelinde gösterilmez.</Text></View>
      </GlassCard>
      <Section title="Basit servis durumu" subtitle="Ön kontrol, parça bekliyor veya test ediliyor durumunu seç." />
      <View style={styles.grid}>{allowed.map((status) => <StatusButton key={status} status={status} active={order.status === status} onPress={() => changeStatus(status)} />)}</View>
    </ScrollView>;
  }


  const savePrice = async () => {
    const fixed = Number(fixedPrice.replace(',', '.'));
    const min = Number(estimateMin.replace(',', '.'));
    const max = Number(estimateMax.replace(',', '.'));
    if (priceType === 'fixed' && fixed <= 0) return Alert.alert('Geçerli net fiyat gir');
    if (priceType === 'estimated' && (min <= 0 || max < min)) return Alert.alert('Tahmini fiyat aralığını kontrol et');
    await run(() => supabase.from('work_orders').update({
      price_type: priceType,
      quoted_price: priceType === 'fixed' ? fixed : null,
      estimated_price_min: priceType === 'estimated' ? min : null,
      estimated_price_max: priceType === 'estimated' ? max : null,
      status: ['opened', 'received', 'queued', 'waiting', 'precheck'].includes(order.status) ? 'price_entered' : order.status,
    }).eq('id', orderId), 'Ücret kaydedilemedi');
  };

  const createExtra = async () => {
    const labor = Number(extraLabor.replace(',', '.')) || 0;
    const partAmount = Number(extraParts.replace(',', '.')) || 0;
    if (extraTitle.trim().length < 3 || labor + partAmount <= 0) return Alert.alert('Ek işlem adı ve tutarı gerekli');
    await run(() => supabase.rpc('staff_create_extra_request', {
      p_work_order_id: orderId,
      p_title: extraTitle.trim(),
      p_description: extraDescription.trim() || null,
      p_labor_amount: labor,
      p_parts_amount: partAmount,
      p_action: extraAction,
    }), 'Ek işlem oluşturulamadı');
    setExtraTitle(''); setExtraDescription(''); setExtraLabor(''); setExtraParts(''); setExtraAction('pending_app');
  };

  const decideExtra = async (id: string, approve: boolean, method: ExtraApprovalMethod | 'staff_rejected') => {
    await run(() => supabase.rpc('staff_decide_extra_request', {
      p_extra_request_id: id,
      p_approve: approve,
      p_method: method,
      p_note: approve ? `${approvalMethodLabel[method]} ile onaylandı` : 'Müşteri ek işlemi reddetti',
    }), 'Ek işlem kararı kaydedilemedi');
  };

  const addService = async () => {
    const price = Number(servicePrice.replace(',', '.')) || 0;
    if (serviceTitle.trim().length < 2 || (!serviceExtraId && price <= 0)) return Alert.alert('İşlem adı ve tutarı gerekli');
    await run(() => supabase.rpc('staff_add_work_order_service', {
      p_work_order_id: orderId,
      p_title: serviceTitle.trim(),
      p_description: serviceDescription.trim() || null,
      p_price: price,
      p_extra_request_id: serviceExtraId,
    }), 'İşlem eklenemedi');
    setServiceTitle(''); setServiceDescription(''); setServicePrice(''); setServiceExtraId(null);
  };

  const setServiceState = (id: string, state: string) => run(
    () => supabase.rpc('staff_set_work_order_service_state', { p_service_id: id, p_state: state }),
    'İşlem durumu değiştirilemedi',
  );

  const deleteService = (id: string, title: string) => Alert.alert('İşlem silinsin mi?', title, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Sil', style: 'destructive', onPress: () => run(() => supabase.rpc('staff_delete_work_order_service', { p_service_id: id }), 'İşlem silinemedi') },
  ]);

  const addPart = async () => {
    const quantity = Number(partQty.replace(',', '.'));
    const unit = Number(partPrice.replace(',', '.'));
    if (partName.trim().length < 2 || quantity <= 0 || unit < 0) return Alert.alert('Parça bilgilerini kontrol et');
    await run(() => supabase.rpc('staff_add_work_order_part', {
      p_work_order_id: orderId,
      p_part_name: partName.trim(),
      p_quantity: quantity,
      p_unit_price: unit,
      p_extra_request_id: partExtraId,
    }), 'Parça eklenemedi');
    setPartName(''); setPartQty('1'); setPartPrice(''); setPartExtraId(null);
  };

  const deletePart = (id: string, title: string) => Alert.alert('Parça kaydı silinsin mi?', title, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Sil', style: 'destructive', onPress: () => run(() => supabase.rpc('staff_delete_work_order_part', { p_part_row_id: id }), 'Parça silinemedi') },
  ]);

  const addNote = async () => {
    if (noteText.trim().length < 2) return Alert.alert('Not çok kısa');
    await run(() => supabase.rpc('staff_add_work_order_note', {
      p_work_order_id: orderId,
      p_note: noteText.trim(),
      p_visibility: noteVisibility,
      p_category: noteCategory,
    }), 'Not eklenemedi');
    setNoteText('');
  };

  const deleteNote = (id: string) => run(() => supabase.rpc('staff_delete_work_order_note', { p_note_id: id }), 'Not silinemedi');

  return <>
    <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <Header onBack={onBack} title={`${brand} ${model}`} subtitle={`${order.customer?.full_name || 'Müşteri'} • ${plate || 'Plaka yok'} • Sıra ${order.queue_position ?? '-'}`} status={order.status} />

    <GlassCard style={styles.stack}>
      <View style={styles.typeRow}><View style={[styles.typeIcon, { backgroundColor: `${colors.orange}18` }]}><Ionicons name={order.service_type === 'quick' ? 'flash' : order.service_type === 'appointment' ? 'calendar' : 'key'} size={22} color={colors.orange} /></View><View style={styles.copy}><Text style={[styles.cardTitle, { color: colors.text }]}>{order.service_type === 'quick' ? 'Hızlı Servis' : order.service_type === 'appointment' ? 'Randevulu Servis' : 'Bırakılan Motor'}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{order.mechanic?.full_name || 'Atanmamış usta'}</Text></View></View>
      <Label text="MÜŞTERİ ŞİKAYETİ / YAPILACAK İŞ" /><Text style={[styles.body, { color: colors.text }]}>{order.complaint}</Text>
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <View style={styles.metrics}><Metric label="İŞÇİLİK" value={money(order.labor_amount)} /><Metric label="PARÇA" value={money(order.parts_amount)} /><Metric label="TOPLAM" value={money(order.total_amount)} accent={colors.green} /></View>
      <View style={styles.timeGrid}><TimeMetric label="GELİŞ" value={dateTime(order.arrived_at)} /><TimeMetric label="BAŞLANGIÇ" value={dateTime(order.started_at)} /><TimeMetric label="TEST" value={dateTime(order.testing_started_at)} /><TimeMetric label="HAZIR" value={dateTime(order.ready_at)} /></View>
    </GlassCard>

    <DetailAccordion title="Servis Durumu" subtitle="Tamir akışını ve motorun güncel aşamasını yönet." icon="speedometer" accent={colors.primary} open={openSections.status} onToggle={() => toggleSection('status')} badge={statusLabels[order.status as WorkOrderStatus]}>
      <View style={styles.grid}>{statusFlow.map((status) => <StatusButton key={status} status={status} active={order.status === status} onPress={() => changeStatus(status)} />)}</View>
    </DetailAccordion>


    <DetailAccordion title="Ücret ve Tahmini Fiyat" subtitle="Tamire başlamadan önce net veya tahmini fiyatı kaydet." icon="pricetag" accent={colors.green} open={openSections.price} onToggle={() => toggleSection('price')} badge={order.quoted_price ? money(order.quoted_price) : order.estimated_price_min ? 'Tahmini' : 'Girilmedi'}>
      <Toggle values={[['fixed', 'Net Fiyat'], ['estimated', 'Tahmini Fiyat']]} active={priceType} onChange={(value) => setPriceType(value as PriceType)} />
      {priceType === 'fixed' ? <FormField label="Net fiyat" value={fixedPrice} onChangeText={setFixedPrice} keyboardType="decimal-pad" /> : <View style={styles.twoCol}><View style={styles.flex}><FormField label="En az" value={estimateMin} onChangeText={setEstimateMin} keyboardType="decimal-pad" /></View><View style={styles.flex}><FormField label="En fazla" value={estimateMax} onChangeText={setEstimateMax} keyboardType="decimal-pad" /></View></View>}
      <PrimaryButton title="Ücreti Kaydet" onPress={savePrice} loading={saving} />
    </DetailAccordion>

    <DetailAccordion title="Ek İşlem ve Müşteri Onayı" subtitle="Ek işçilik ve parçalar yalnız müşteri onayından sonra toplam tutara eklenir." icon="shield-checkmark" accent={colors.orange} open={openSections.extras} onToggle={() => toggleSection('extras')} badge={extras.some((item) => item.status === 'pending') ? `${extras.filter((item) => item.status === 'pending').length} Bekliyor` : `${extras.length} Kayıt`}>
    {extras.map((item) => <GlassCard key={item.id} style={styles.stack}>
      <View style={styles.row}><View style={[styles.roundIcon, { backgroundColor: item.status === 'approved' ? `${colors.green}18` : item.status === 'pending' ? `${colors.orange}18` : `${colors.red}14` }]}><Ionicons name={item.status === 'approved' ? 'checkmark-circle' : item.status === 'pending' ? 'time' : 'close-circle'} size={24} color={item.status === 'approved' ? colors.green : item.status === 'pending' ? colors.orange : colors.red} /></View><View style={styles.copy}><Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{approvalMethodLabel[item.approval_method || 'app']} • {dateTime(item.created_at)}</Text></View><Text style={[styles.boldAmount, { color: item.status === 'approved' ? colors.green : item.status === 'pending' ? colors.orange : colors.red }]}>{money(item.total_amount)}</Text></View>
      {!!item.description && <Text style={[styles.bodySmall, { color: colors.textSoft }]}>{item.description}</Text>}
      <View style={styles.metrics}><Metric label="EK İŞÇİLİK" value={money(item.labor_amount)} /><Metric label="EK PARÇA" value={money(item.parts_amount)} /><Metric label="DURUM" value={item.status === 'pending' ? 'Bekliyor' : item.status === 'approved' ? 'Onaylı' : 'Reddedildi'} /></View>
      {item.status === 'pending' && <View style={styles.actionWrap}><Action label="Yanımda Onay" icon="people" accent={colors.green} onPress={() => decideExtra(item.id, true, 'in_person')} /><Action label="Telefon" icon="call" accent={colors.cyan} onPress={() => decideExtra(item.id, true, 'phone')} /><Action label="WhatsApp" icon="logo-whatsapp" accent={colors.green} onPress={() => decideExtra(item.id, true, 'whatsapp')} /><Action label="Reddet" icon="close" accent={colors.red} onPress={() => decideExtra(item.id, false, 'staff_rejected')} /></View>}
    </GlassCard>)}
    <GlassCard style={styles.stack}>
      <Text style={[styles.formTitle, { color: colors.text }]}>Yeni Ek İşlem</Text>
      <FormField label="Ek işlem" value={extraTitle} onChangeText={setExtraTitle} placeholder="Fren balatası değişimi" />
      <FormField label="Açıklama" value={extraDescription} onChangeText={setExtraDescription} multiline placeholder="Neden gerekli olduğunu açıkla" />
      <View style={styles.twoCol}><View style={styles.flex}><FormField label="Ek işçilik" value={extraLabor} onChangeText={setExtraLabor} keyboardType="decimal-pad" /></View><View style={styles.flex}><FormField label="Ek parça" value={extraParts} onChangeText={setExtraParts} keyboardType="decimal-pad" /></View></View>
      <View style={styles.choiceGrid}>{extraActionOptions.map((item) => <Choice key={item.value} active={extraAction === item.value} title={item.label} icon={item.icon} onPress={() => setExtraAction(item.value)} />)}</View>
      <PrimaryButton title="Ek İşlemi Kaydet" onPress={createExtra} loading={saving} />
    </GlassCard>
    </DetailAccordion>

    <DetailAccordion title="Yapılan İşlemler" subtitle="Planlanan, başlayan ve tamamlanan işçilik kalemlerini yönet." icon="construct" accent={colors.primary2} open={openSections.services} onToggle={() => toggleSection('services')} badge={`${services.length} İşlem`}>
    <GlassCard style={styles.listCard}>
      {services.length === 0 ? <Empty text="Henüz işlem kalemi yok." /> : services.map((item, index) => <View key={item.id} style={[styles.listItem, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}><View style={styles.copy}><Text style={[styles.cardTitle, { color: colors.text }]}>{item.title}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{item.mechanic?.full_name || 'Usta'} • {item.completed ? 'Tamamlandı' : item.started_at ? 'İşlemde' : 'Planlandı'}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>Başlangıç {dateTime(item.started_at)} • Bitiş {dateTime(item.completed_at)}</Text>{item.extra_request_id && <Text style={[styles.linked, { color: colors.orange }]}>Onaylı ek işlem kapsamında • Toplama tekrar eklenmez</Text>}</View><Text style={[styles.boldAmount, { color: colors.green }]}>{money(item.price)}</Text><View style={styles.verticalActions}>{!item.started_at && <IconAction icon="play" accent={colors.cyan} onPress={() => setServiceState(item.id, 'started')} />}{!item.completed && <IconAction icon="checkmark" accent={colors.green} onPress={() => setServiceState(item.id, 'completed')} />}<IconAction icon="trash" accent={colors.red} onPress={() => deleteService(item.id, item.title)} /></View></View>)}
      <View style={[styles.stack, styles.formDivider, { borderTopColor: colors.border }]}><FormField label="İşlem" value={serviceTitle} onChangeText={setServiceTitle} /><FormField label="Açıklama" value={serviceDescription} onChangeText={setServiceDescription} multiline /><FormField label="Tutar" value={servicePrice} onChangeText={setServicePrice} keyboardType="decimal-pad" /><ExtraLinkPicker extras={approvedExtras} selected={serviceExtraId} onChange={setServiceExtraId} /><PrimaryButton title="İşlem Ekle" onPress={addService} loading={saving} /></View>
    </GlassCard>
    </DetailAccordion>

    <DetailAccordion title="Kullanılan Parçalar" subtitle="Parça adı, adet, birim fiyat ve kullanım zamanını kaydet." icon="hardware-chip" accent={colors.orange} open={openSections.parts} onToggle={() => toggleSection('parts')} badge={`${parts.length} Parça`}>
    <GlassCard style={styles.listCard}>
      {parts.length === 0 ? <Empty text="Parça kullanımı eklenmedi." /> : parts.map((item, index) => <View key={item.id} style={[styles.listItem, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}><View style={styles.copy}><Text style={[styles.cardTitle, { color: colors.text }]}>{item.part_name}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{Number(item.quantity)} adet × {money(item.unit_price)} • {dateTime(item.used_at)}</Text>{item.extra_request_id && <Text style={[styles.linked, { color: colors.orange }]}>Onaylı ek işlem kapsamında • Toplama tekrar eklenmez</Text>}</View><Text style={[styles.boldAmount, { color: colors.text }]}>{money(item.total_price)}</Text><IconAction icon="trash" accent={colors.red} onPress={() => deletePart(item.id, item.part_name)} /></View>)}
      <View style={[styles.stack, styles.formDivider, { borderTopColor: colors.border }]}><FormField label="Parça" value={partName} onChangeText={setPartName} /><View style={styles.twoCol}><View style={styles.flex}><FormField label="Adet" value={partQty} onChangeText={setPartQty} keyboardType="decimal-pad" /></View><View style={styles.flex}><FormField label="Birim fiyat" value={partPrice} onChangeText={setPartPrice} keyboardType="decimal-pad" /></View></View><ExtraLinkPicker extras={approvedExtras} selected={partExtraId} onChange={setPartExtraId} /><PrimaryButton title="Parça Ekle" onPress={addPart} loading={saving} secondary /></View>
    </GlassCard>
    </DetailAccordion>

    <DetailAccordion title="Servis Notları" subtitle="Müşteriye açık veya yalnız personele özel notları yönet." icon="chatbox-ellipses" accent={colors.cyan} open={openSections.notes} onToggle={() => toggleSection('notes')} badge={`${notes.length} Not`}>
    <GlassCard style={styles.listCard}>
      {notes.length === 0 ? <Empty text="Henüz servis notu yok." /> : notes.map((item, index) => <View key={item.id} style={[styles.listItem, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}><View style={[styles.roundIcon, { backgroundColor: item.visibility === 'customer' ? `${colors.cyan}14` : `${colors.primary}14` }]}><Ionicons name={item.visibility === 'customer' ? 'eye' : 'lock-closed'} size={19} color={item.visibility === 'customer' ? colors.cyan : colors.primary} /></View><View style={styles.copy}><Text style={[styles.cardTitle, { color: colors.text }]}>{noteCategoryLabel[item.category]}</Text><Text style={[styles.bodySmall, { color: colors.textSoft }]}>{item.note}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{item.visibility === 'customer' ? 'Müşteri görebilir' : 'Yalnız personel'} • {dateTime(item.created_at)}</Text></View><IconAction icon="trash" accent={colors.red} onPress={() => deleteNote(item.id)} /></View>)}
      <View style={[styles.stack, styles.formDivider, { borderTopColor: colors.border }]}><FormField label="Yeni not" value={noteText} onChangeText={setNoteText} multiline /><Toggle values={[['staff', 'Yalnız Personel'], ['customer', 'Müşteriye Açık']]} active={noteVisibility} onChange={(v) => setNoteVisibility(v as WorkNoteVisibility)} /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChoices}>{(['general','diagnosis','test','customer_update','internal'] as WorkNoteCategory[]).map((value) => <SmallChoice key={value} active={noteCategory === value} label={noteCategoryLabel[value]} onPress={() => setNoteCategory(value)} />)}</ScrollView><PrimaryButton title="Servis Notu Ekle" onPress={addNote} loading={saving} /></View>
    </GlassCard>
    </DetailAccordion>

    <DetailAccordion title="Tahsilat Kaydet" subtitle="Nakit, IBAN veya Borç seçerek teslimat finansını tamamla." icon="card" accent={colors.green} open={openSections.receivables} onToggle={() => toggleSection('receivables')} badge={money(Number(order.total_amount || 0) - Number(order.amount_received || 0))}>
      <ReceivableManagerCard orderId={orderId} onChanged={load} />
    </DetailAccordion>

    <DetailAccordion title="Servis Hareket Geçmişi" subtitle="Durum, ek işlem, parça, not ve işlem hareketlerinin zaman çizgisi." icon="time" accent={colors.primary} open={openSections.history} onToggle={() => toggleSection('history')} badge={`${events.length} Hareket`}>
    <GlassCard style={styles.listCard}>{events.length === 0 ? <Empty text="Hareket kaydı yok." /> : events.map((item, index) => <View key={item.id} style={[styles.eventRow, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}><View style={[styles.eventDot, { backgroundColor: `${colors.primary}20` }]}><Ionicons name="pulse" size={15} color={colors.primary} /></View><View style={styles.copy}><Text style={[styles.cardTitle, { color: colors.text }]}>{eventLabel[item.event_type] || item.event_type}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{item.old_status && item.new_status ? `${statusLabels[item.old_status]} → ${statusLabels[item.new_status]} • ` : ''}{dateTime(item.created_at)}</Text>{item.note && <Text style={[styles.bodySmall, { color: colors.textSoft }]}>{item.note}</Text>}</View></View>)}</GlassCard>
    </DetailAccordion>
    </ScrollView>
    <ReadyPaymentModal
      visible={readyPaymentPromptVisible}
      total={Number(order.total_amount || order.quoted_price || 0)}
      received={Number(order.amount_received || 0)}
      onClose={() => setReadyPaymentPromptVisible(false)}
      onOpenFinance={() => {
        setReadyPaymentPromptVisible(false);
        openReceivableFlow();
      }}
    />
  </>;
}

function ReadyPaymentModal({ visible, total, received, onClose, onOpenFinance }: { visible: boolean; total: number; received: number; onClose: () => void; onOpenFinance: () => void }) {
  const { colors } = useTheme();
  const remaining = Math.max(total - received, 0);
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.readyOverlay}>
      <View style={[styles.readyModal, { backgroundColor: colors.cardStrong, borderColor: `${colors.green}55` }]}>
        <View style={[styles.readyIcon, { backgroundColor: `${colors.green}18`, borderColor: `${colors.green}45` }]}><Ionicons name="checkmark-circle" size={36} color={colors.green} /></View>
        <Text style={[styles.readyTitle, { color: colors.text }]}>Motosiklet Hazır</Text>
        <Text style={[styles.readyText, { color: colors.textMuted }]}>Teslimden önce tahsilatı kaydet veya kalan tutarı Borç / Veresiye olarak aç.</Text>
        <View style={[styles.readyAmountCard, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}>
          <View><Text style={[styles.readyAmountLabel, { color: colors.textMuted }]}>SERVİS TOPLAMI</Text><Text style={[styles.readyAmount, { color: colors.text }]}>{money(total)}</Text></View>
          <View style={styles.readyAmountDivider} />
          <View><Text style={[styles.readyAmountLabel, { color: colors.textMuted }]}>KALAN</Text><Text style={[styles.readyAmount, { color: remaining > 0 ? colors.orange : colors.green }]}>{money(remaining)}</Text></View>
        </View>
        <AnimatedPressable onPress={onOpenFinance} style={[styles.readyPrimary, { backgroundColor: colors.green }]}><Ionicons name="wallet" size={20} color="#07131B" /><Text style={styles.readyPrimaryText}>Tahsilat Kaydet Alanına Git</Text></AnimatedPressable>
        <AnimatedPressable onPress={onClose} style={[styles.readySecondary, { borderColor: colors.border }]}><Text style={[styles.readySecondaryText, { color: colors.textMuted }]}>Şimdilik Kapat</Text></AnimatedPressable>
      </View>
    </View>
  </Modal>;
}

function DetailAccordion({ title, subtitle, icon, accent, open, onToggle, badge, children }: { title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap; accent: string; open: boolean; onToggle: () => void; badge?: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return <GlassCard style={styles.accordionCard}><AnimatedPressable onPress={onToggle} style={styles.accordionHeader}><View style={[styles.accordionIcon, { backgroundColor: `${accent}18` }]}><Ionicons name={icon} size={23} color={accent} /></View><View style={styles.copy}><Text style={[styles.accordionTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.accordionSub, { color: colors.textMuted }]}>{subtitle}</Text></View>{badge && <View style={[styles.accordionBadge, { backgroundColor: `${accent}12`, borderColor: `${accent}38` }]}><Text style={[styles.accordionBadgeText, { color: accent }]} numberOfLines={1}>{badge}</Text></View>}<Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={22} color={colors.textMuted} /></AnimatedPressable>{open && <View style={[styles.accordionBody, { borderTopColor: colors.border }]}>{children}</View>}</GlassCard>;
}

function Header({ onBack, title, subtitle, status }: { onBack: () => void; title: string; subtitle: string; status: WorkOrderStatus }) {
  const { colors } = useTheme();
  return <View style={styles.header}><AnimatedPressable onPress={onBack} style={[styles.back, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="arrow-back" size={22} color={colors.text} /></AnimatedPressable><View style={styles.copy}><Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{subtitle}</Text></View><StatusPill status={status} /></View>;
}

function Section({ title, subtitle }: { title: string; subtitle: string }) { const { colors } = useTheme(); return <View style={styles.section}><Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.sectionSub, { color: colors.textMuted }]}>{subtitle}</Text></View>; }
function Label({ text }: { text: string }) { const { colors } = useTheme(); return <Text style={[styles.label, { color: colors.textMuted }]}>{text}</Text>; }
function Metric({ label, value, accent }: { label: string; value: string; accent?: string }) { const { colors } = useTheme(); return <View style={styles.metric}><Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text><Text style={[styles.metricValue, { color: accent ?? colors.text }]}>{value}</Text></View>; }
function TimeMetric({ label, value }: { label: string; value: string }) { const { colors } = useTheme(); return <View style={[styles.timeMetric, { backgroundColor: colors.surfaceSoft }]}><Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text><Text style={[styles.timeValue, { color: colors.text }]}>{value}</Text></View>; }
function Empty({ text }: { text: string }) { const { colors } = useTheme(); return <Text style={[styles.empty, { color: colors.textMuted }]}>{text}</Text>; }

function StatusButton({ status, active, onPress }: { status: WorkOrderStatus; active: boolean; onPress: () => void }) { const { colors } = useTheme(); return <AnimatedPressable onPress={onPress} style={[styles.statusButton, { backgroundColor: active ? `${colors.primary}20` : colors.card, borderColor: active ? colors.primary : colors.border }]}><Text style={[styles.statusText, { color: active ? colors.primary : colors.text }]}>{statusLabels[status]}</Text></AnimatedPressable>; }
function Action({ label, icon, accent, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; accent: string; onPress: () => void }) { return <AnimatedPressable onPress={onPress} style={[styles.action, { backgroundColor: `${accent}0F`, borderColor: `${accent}45` }]}><Ionicons name={icon} size={16} color={accent} /><Text style={[styles.actionText, { color: accent }]}>{label}</Text></AnimatedPressable>; }
function IconAction({ icon, accent, onPress }: { icon: keyof typeof Ionicons.glyphMap; accent: string; onPress: () => void }) { return <AnimatedPressable onPress={onPress} style={[styles.iconAction, { backgroundColor: `${accent}10`, borderColor: `${accent}38` }]}><Ionicons name={icon} size={17} color={accent} /></AnimatedPressable>; }

function Toggle({ values, active, onChange }: { values: [string, string][]; active: string; onChange: (value: string) => void }) { const { colors } = useTheme(); return <View style={[styles.toggle, { backgroundColor: colors.surfaceSoft }]}>{values.map(([value, label]) => <AnimatedPressable key={value} onPress={() => onChange(value)} style={[styles.toggleItem, active === value && { backgroundColor: colors.cardStrong }]}><Text style={[styles.toggleText, { color: active === value ? colors.text : colors.textMuted }]}>{label}</Text></AnimatedPressable>)}</View>; }
function Choice({ active, title, icon, onPress }: { active: boolean; title: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) { const { colors } = useTheme(); return <AnimatedPressable onPress={onPress} style={[styles.choice, { backgroundColor: active ? `${colors.primary}18` : colors.surfaceSoft, borderColor: active ? colors.primary : colors.border }]}><Ionicons name={icon} size={18} color={active ? colors.primary : colors.textMuted} /><Text style={[styles.choiceText, { color: colors.text }]}>{title}</Text></AnimatedPressable>; }
function SmallChoice({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) { const { colors } = useTheme(); return <AnimatedPressable onPress={onPress} style={[styles.smallChoice, { backgroundColor: active ? colors.primary : colors.surfaceSoft, borderColor: active ? colors.primary : colors.border }]}><Text style={[styles.smallChoiceText, { color: active ? '#fff' : colors.text }]}>{label}</Text></AnimatedPressable>; }

function ExtraLinkPicker({ extras, selected, onChange }: { extras: ExtraWorkRequest[]; selected: string | null; onChange: (id: string | null) => void }) {
  const { colors } = useTheme();
  return <View style={styles.stack}><Text style={[styles.label, { color: colors.textMuted }]}>TUTAR BAĞLANTISI</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalChoices}><SmallChoice active={!selected} label="Normal ücret" onPress={() => onChange(null)} />{extras.map((item) => <SmallChoice key={item.id} active={selected === item.id} label={`Ek: ${item.title}`} onPress={() => onChange(item.id)} />)}</ScrollView>{selected && <Text style={[styles.linked, { color: colors.orange }]}>Bu satır onaylı ek işlemi açıklar; tutar toplam hesaba ikinci kez eklenmez.</Text>}</View>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 18, paddingTop: 56, paddingBottom: 120, gap: 15 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  back: { width: 46, height: 46, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '900' },
  copy: { flex: 1, minWidth: 0 },
  stack: { gap: 12 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  typeIcon: { width: 45, height: 45, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 13, fontWeight: '900' },
  meta: { fontSize: 12.5, lineHeight: 16, marginTop: 3 },
  body: { fontSize: 14, lineHeight: 21 },
  bodySmall: { fontSize: 12.5, lineHeight: 17, marginTop: 4 },
  label: { fontSize: 12, fontWeight: '900', letterSpacing: 0.8 },
  divider: { height: 1 },
  metrics: { flexDirection: 'row', gap: 8 },
  metric: { flex: 1 },
  metricValue: { fontSize: 14, fontWeight: '900', marginTop: 4 },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeMetric: { width: '48.5%', minHeight: 62, borderRadius: 15, padding: 10, justifyContent: 'center' },
  timeValue: { fontSize: 12.5, fontWeight: '800', marginTop: 4 },
  section: { marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '900' },
  sectionSub: { fontSize: 12.5, lineHeight: 17, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusButton: { width: '48.5%', minHeight: 47, borderWidth: 1, borderRadius: 15, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  statusText: { fontSize: 12.5, fontWeight: '900', textAlign: 'center' },
  notice: { borderWidth: 1, borderRadius: 15, padding: 12, flexDirection: 'row', gap: 9 },
  noticeText: { flex: 1, fontSize: 12.5, lineHeight: 17 },
  twoCol: { flexDirection: 'row', gap: 9 },
  flex: { flex: 1 },
  toggle: { flexDirection: 'row', padding: 4, borderRadius: 15 },
  toggleItem: { flex: 1, minHeight: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  toggleText: { fontSize: 12, fontWeight: '900', textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  roundIcon: { width: 43, height: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  boldAmount: { fontSize: 13, fontWeight: '900' },
  actionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  action: { minHeight: 39, borderWidth: 1, borderRadius: 12, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 5 },
  actionText: { fontSize: 12, fontWeight: '900' },
  formTitle: { fontSize: 17, fontWeight: '900' },
  choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { width: '48.5%', minHeight: 52, borderWidth: 1, borderRadius: 15, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 7 },
  choiceText: { flex: 1, fontSize: 12, fontWeight: '900' },
  listCard: { paddingVertical: 4, paddingHorizontal: 14 },
  listItem: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 13 },
  verticalActions: { gap: 5 },
  iconAction: { width: 34, height: 34, borderWidth: 1, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  linked: { fontSize: 12, lineHeight: 14, marginTop: 4, fontWeight: '800' },
  formDivider: { borderTopWidth: 1, paddingTop: 14, paddingBottom: 10 },
  empty: { textAlign: 'center', paddingVertical: 18, fontSize: 12.5 },
  horizontalChoices: { gap: 7, paddingRight: 12 },
  smallChoice: { minHeight: 39, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  smallChoiceText: { fontSize: 12, fontWeight: '900' },
  eventRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, paddingVertical: 12 },
  eventDot: { width: 31, height: 31, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  accordionCard: { padding: 0, overflow: 'hidden' },
  accordionHeader: { minHeight: 86, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  accordionIcon: { width: 49, height: 49, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  accordionTitle: { fontSize: 16.5, fontWeight: '900' },
  accordionSub: { fontSize: 12.5, lineHeight: 17, marginTop: 4 },
  accordionBadge: { maxWidth: 88, minHeight: 30, borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center' },
  accordionBadgeText: { fontSize: 11, fontWeight: '900' },
  accordionBody: { borderTopWidth: 1, padding: 14, gap: 12 },
  readyOverlay: { flex: 1, backgroundColor: 'rgba(2,7,16,0.72)', alignItems: 'center', justifyContent: 'center', padding: 22 },
  readyModal: { width: '100%', maxWidth: 430, borderWidth: 1, borderRadius: 27, padding: 20, alignItems: 'center' },
  readyIcon: { width: 68, height: 68, borderRadius: 23, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  readyTitle: { fontSize: 24, fontWeight: '900', marginTop: 15 },
  readyText: { fontSize: 14.5, lineHeight: 21, textAlign: 'center', marginTop: 8 },
  readyAmountCard: { width: '100%', minHeight: 88, borderWidth: 1, borderRadius: 19, marginTop: 17, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  readyAmountDivider: { width: 1, height: 46, backgroundColor: 'rgba(148,163,184,0.22)' },
  readyAmountLabel: { fontSize: 10.5, fontWeight: '900', letterSpacing: 0.8 },
  readyAmount: { fontSize: 20, fontWeight: '900', marginTop: 5 },
  readyPrimary: { width: '100%', minHeight: 54, borderRadius: 17, marginTop: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  readyPrimaryText: { color: '#07131B', fontSize: 14, fontWeight: '900' },
  readySecondary: { width: '100%', minHeight: 48, borderRadius: 16, borderWidth: 1, marginTop: 9, alignItems: 'center', justifyContent: 'center' },
  readySecondaryText: { fontSize: 13, fontWeight: '900' },
});
