import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedMotorcycleIcon } from '../components/AnimatedMotorcycleIcon';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { FormField } from '../components/FormField';
import { GlassCard } from '../components/GlassCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { Customer, CustomerWaitingStatus, Motorcycle, PaymentMethod, PriceType, ServiceType, WORKER_ROLES } from '../types';

export function NewWorkOrderScreen({
  onClose,
  onCreated,
  initialServiceType = 'dropoff',
}: {
  onClose: () => void;
  onCreated: () => void;
  initialServiceType?: ServiceType;
}) {
  const { colors } = useTheme();
  const { workshop, membership, isAdmin } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [plateSearch, setPlateSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedMotorcycleId, setSelectedMotorcycleId] = useState<string | null>(null);
  const [newCustomer, setNewCustomer] = useState(true);
  const [newMotorcycle, setNewMotorcycle] = useState(true);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [plate, setPlate] = useState('');
  const [odometer, setOdometer] = useState('');
  const [complaint, setComplaint] = useState('');
  const [notes, setNotes] = useState('');
  const [mechanicId, setMechanicId] = useState<string | null>(WORKER_ROLES.includes(membership?.role as any) ? membership?.user_id ?? null : null);
  const [serviceType, setServiceType] = useState<ServiceType>(initialServiceType);
  const [waitingStatus, setWaitingStatus] = useState<CustomerWaitingStatus>(initialServiceType === 'quick' ? 'waiting_shop' : 'left_vehicle');
  const [startImmediately, setStartImmediately] = useState(initialServiceType === 'quick');
  const [priceType, setPriceType] = useState<PriceType>('fixed');
  const [fixedPrice, setFixedPrice] = useState('');
  const [estimatedMin, setEstimatedMin] = useState('');
  const [estimatedMax, setEstimatedMax] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'none' | PaymentMethod>('none');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!workshop) return;
    Promise.all([
      supabase.from('customers').select('*').eq('workshop_id', workshop.id).order('full_name'),
      supabase.from('motorcycles').select('*').eq('workshop_id', workshop.id).order('created_at', { ascending: false }),
      supabase.from('workshop_members').select('user_id,role,is_active,availability_status,profile:profiles(full_name)').eq('workshop_id', workshop.id).eq('is_active', true),
    ]).then(([customerResult, motorcycleResult, memberResult]) => {
      const nextCustomers = (customerResult.data as Customer[]) ?? [];
      const nextMotorcycles = (motorcycleResult.data as Motorcycle[]) ?? [];
      const nextMembers = memberResult.data ?? [];
      setCustomers(nextCustomers);
      setMotorcycles(nextMotorcycles);
      setMembers(nextMembers);
      if (membership && WORKER_ROLES.includes(membership.role)) setMechanicId(membership.user_id);
      else if (!mechanicId) {
        const firstWorker = nextMembers.find((item: any) => item.role === 'mechanic' || item.role === 'owner_mechanic');
        if (firstWorker) setMechanicId(firstWorker.user_id);
      }
    });
  }, [workshop]);

  useEffect(() => {
    if (priceType === 'fixed' && fixedPrice && !paymentAmount) setPaymentAmount(fixedPrice);
  }, [fixedPrice, priceType]);

  const matchingBikes = useMemo(() => {
    const search = plateSearch.replace(/\s/g, '').toLocaleUpperCase('tr-TR');
    if (!search) return [];
    return motorcycles.filter((item) => item.plate?.replace(/\s/g, '').toLocaleUpperCase('tr-TR').includes(search)).slice(0, 6);
  }, [motorcycles, plateSearch]);

  const customerBikes = useMemo(() => motorcycles.filter((item) => item.customer_id === selectedCustomerId), [motorcycles, selectedCustomerId]);

  const selectExistingBike = (bike: Motorcycle) => {
    setSelectedMotorcycleId(bike.id);
    setSelectedCustomerId(bike.customer_id);
    setNewCustomer(false);
    setNewMotorcycle(false);
    setPlateSearch(bike.plate ?? '');
    setOdometer(bike.odometer ? String(bike.odometer) : '');
  };

  const submit = async () => {
    if (!workshop || !membership) return;
    if (!complaint.trim()) return Alert.alert('İşlem türü / yapılacak iş gerekli');
    if (newCustomer && !customerName.trim()) return Alert.alert('Müşteri adı gerekli');
    if (!newCustomer && !selectedCustomerId) return Alert.alert('Bir müşteri seç');
    if (newMotorcycle && (!brand.trim() || !model.trim() || !plate.trim())) return Alert.alert('Marka, model ve plaka gerekli');
    if (!newMotorcycle && !selectedMotorcycleId) return Alert.alert('Bir motosiklet seç');
    if (!mechanicId) return Alert.alert('Atanacak usta gerekli', 'İşletmeye önce Usta veya İşletme Sahibi + Usta rolünde personel ekle.');

    const fixed = Number(fixedPrice.replace(',', '.'));
    const min = Number(estimatedMin.replace(',', '.'));
    const max = Number(estimatedMax.replace(',', '.'));
    const priceComplete = priceType === 'fixed' ? fixed > 0 : min > 0 && max >= min;
    if (paymentMethod !== 'none' && (!priceComplete || Number(paymentAmount.replace(',', '.')) <= 0)) {
      return Alert.alert('Ödeme bilgisi eksik', 'Nakit veya IBAN tahsilatı için geçerli bir ödeme tutarı gir.');
    }

    setSaving(true);
    let customerId = selectedCustomerId;
    let motorcycleId = selectedMotorcycleId;

    if (newCustomer) {
      const { data, error } = await supabase.from('customers').insert({
        workshop_id: workshop.id,
        full_name: customerName.trim(),
        phone: customerPhone.trim() || null,
      }).select('id').single();
      if (error) { setSaving(false); return Alert.alert('Müşteri oluşturulamadı', error.message); }
      customerId = data.id;
    }

    if (newMotorcycle) {
      const { data, error } = await supabase.from('motorcycles').insert({
        workshop_id: workshop.id,
        customer_id: customerId,
        brand: brand.trim(),
        model: model.trim(),
        plate: plate.trim().toUpperCase(),
        odometer: odometer ? Number(odometer) : null,
      }).select('id').single();
      if (error) { setSaving(false); return Alert.alert('Motosiklet oluşturulamadı', error.message); }
      motorcycleId = data.id;
    }

    const { data: orderData, error: orderError } = await supabase.from('work_orders').insert({
      workshop_id: workshop.id,
      customer_id: customerId,
      motorcycle_id: motorcycleId,
      assigned_mechanic_id: mechanicId,
      complaint: complaint.trim(),
      notes: notes.trim() || null,
      odometer_in: odometer ? Number(odometer) : null,
      service_type: serviceType,
      customer_waiting_status: waitingStatus,
      price_type: priceComplete ? priceType : null,
      quoted_price: priceType === 'fixed' && priceComplete ? fixed : null,
      estimated_price_min: priceType === 'estimated' && priceComplete ? min : null,
      estimated_price_max: priceType === 'estimated' && priceComplete ? max : null,
      status: startImmediately ? 'repair_started' : priceComplete ? 'price_entered' : 'queued',
    }).select('id').single();

    if (orderError || !orderData) {
      setSaving(false);
      return Alert.alert('Servis kaydı oluşturulamadı', orderError?.message ?? 'Bilinmeyen hata');
    }

    if (priceType === 'fixed' && priceComplete) {
      const { error } = await supabase.from('work_order_services').insert({
        work_order_id: orderData.id,
        mechanic_id: mechanicId,
        title: complaint.trim(),
        description: serviceType === 'quick' ? 'Hızlı servis açılış işlemi' : 'Servis kabulünde girilen net işlem',
        price: fixed,
        completed: false,
      });
      if (error) {
        setSaving(false);
        return Alert.alert('Servis açıldı fakat ücret kalemi eklenemedi', error.message);
      }
    }

    if (paymentMethod !== 'none') {
      const { error } = await supabase.from('payments').insert({
        work_order_id: orderData.id,
        amount: Number(paymentAmount.replace(',', '.')),
        payment_method: paymentMethod,
        note: serviceType === 'quick' ? 'Hızlı servis kabulünde tahsil edildi' : 'Servis kabulünde tahsil edildi',
      });
      if (error) {
        setSaving(false);
        return Alert.alert('Servis açıldı fakat ödeme kaydedilemedi', error.message);
      }
    }

    setSaving(false);
    Alert.alert('Servis kaydı hazır', startImmediately ? 'Motor tamire başlandı durumunda açıldı.' : 'Motor atölye sırasına eklendi.');
    onCreated();
  };

  const canChooseWorker = isAdmin || membership?.role === 'owner';

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <AnimatedPressable onPress={onClose} style={[styles.close, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="close" size={24} color={colors.text} /></AnimatedPressable>
          <View style={styles.headerCopy}>
            <Text style={[styles.eyebrow, { color: serviceType === 'quick' ? colors.orange : colors.primary }]}>{serviceType === 'quick' ? 'RANDEVUSUZ HIZLI KABUL' : 'SERVİS KABUL'}</Text>
            <Text style={[styles.title, { color: colors.text }]}>{serviceType === 'quick' ? '+ Hızlı Servis' : 'Yeni Servis Kaydı'}</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>Plakayı ara; ücreti şimdi belirle veya tamire başlayıp daha sonra netleştir.</Text>
          </View>
        </View>

        <Section title="1. Servis tipi" />
        <GlassCard style={styles.formCard}>
          <ChoiceGrid
            items={[
              { id: 'quick', title: 'Hızlı Servis', sub: 'Randevusuz gelen motor', icon: 'flash', accent: colors.orange },
              { id: 'dropoff', title: 'Bırakılan Motor', sub: 'Uzun tamir / sonra teslim', icon: 'key', accent: colors.primary },
              { id: 'appointment', title: 'Randevulu', sub: 'Randevu kaynağından geldi', icon: 'calendar', accent: colors.cyan },
            ]}
            selected={serviceType}
            onSelect={(id) => setServiceType(id as ServiceType)}
          />
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>MÜŞTERİ DURUMU</Text>
          <ChoiceGrid
            items={[
              { id: 'waiting_shop', title: 'Dükkânda bekliyor', sub: 'Hızlı teslim bekliyor', icon: 'hourglass', accent: colors.orange },
              { id: 'left_vehicle', title: 'Motoru bırakıp gitti', sub: 'Hazır olunca gelecek', icon: 'walk', accent: colors.primary },
              { id: 'return_later', title: 'Sonra gelecek', sub: 'Teslim için dönecek', icon: 'time', accent: colors.cyan },
              { id: 'third_party_delivery', title: 'Başkası teslim etti', sub: 'Müşteri motorla gelmedi', icon: 'people', accent: colors.green },
            ]}
            selected={waitingStatus}
            onSelect={(id) => setWaitingStatus(id as CustomerWaitingStatus)}
          />
        </GlassCard>

        <Section title="2. Plaka ve müşteri" />
        <GlassCard style={styles.formCard}>
          <FormField label="Plaka ara" value={plateSearch} onChangeText={(value) => setPlateSearch(value.toUpperCase())} placeholder="06 ABC 123" autoCapitalize="characters" />
          {matchingBikes.length > 0 && (
            <View style={styles.matchList}>
              {matchingBikes.map((bike) => {
                const customer = customers.find((item) => item.id === bike.customer_id);
                return (
                  <AnimatedPressable key={bike.id} onPress={() => selectExistingBike(bike)} style={[styles.matchCard, { backgroundColor: colors.surfaceSoft, borderColor: selectedMotorcycleId === bike.id ? colors.green : colors.border }]}> 
                    <Ionicons name="search-circle" size={24} color={colors.green} />
                    <View style={styles.chipCopy}><Text style={[styles.chipTitle, { color: colors.text }]}>{bike.plate} • {bike.brand} {bike.model}</Text><Text style={[styles.chipSub, { color: colors.textMuted }]}>{customer?.full_name ?? 'Müşteri'} • son km {bike.odometer?.toLocaleString('tr-TR') ?? '-'}</Text></View>
                    <Ionicons name="arrow-forward-circle" size={22} color={colors.primary} />
                  </AnimatedPressable>
                );
              })}
            </View>
          )}
          <Toggle value={newCustomer} onChange={(value) => { setNewCustomer(value); if (value) { setSelectedCustomerId(null); setSelectedMotorcycleId(null); setNewMotorcycle(true); } }} first="Yeni müşteri" second="Kayıtlı müşteri" firstIcon="person-add" secondIcon="people" />
          {newCustomer ? (
            <><FormField label="Ad Soyad" value={customerName} onChangeText={setCustomerName} placeholder="Müşteri adı" /><FormField label="Telefon" value={customerPhone} onChangeText={setCustomerPhone} keyboardType="phone-pad" placeholder="05xx xxx xx xx" /></>
          ) : (
            <ChipList kind="customer" empty="Henüz kayıtlı müşteri yok." items={customers.map((item) => ({ id: item.id, label: item.full_name, sub: item.phone || 'Telefon yok' }))} selected={selectedCustomerId} onSelect={(id) => { setSelectedCustomerId(id); setSelectedMotorcycleId(null); setNewMotorcycle(true); }} />
          )}
        </GlassCard>

        <Section title="3. Motosiklet" />
        <GlassCard style={styles.formCard}>
          {!newCustomer && selectedCustomerId && customerBikes.length > 0 && <Toggle value={newMotorcycle} onChange={setNewMotorcycle} first="Yeni motosiklet" second="Kayıtlı motosiklet" firstIcon="add-circle" secondIcon="speedometer" />}
          {newMotorcycle || newCustomer ? (
            <>
              <View style={styles.twoCol}><View style={styles.col}><FormField label="Marka" value={brand} onChangeText={setBrand} placeholder="Honda" /></View><View style={styles.col}><FormField label="Model" value={model} onChangeText={setModel} placeholder="PCX 125" /></View></View>
              <FormField label="Plaka" value={plate} onChangeText={(value) => setPlate(value.toUpperCase())} placeholder="06 ABC 123" autoCapitalize="characters" />
              <FormField label="Kilometre" value={odometer} onChangeText={setOdometer} keyboardType="number-pad" placeholder="23500" />
            </>
          ) : (
            <ChipList kind="motorcycle" empty="Bu müşterinin kayıtlı motosikleti yok." items={customerBikes.map((item) => ({ id: item.id, label: `${item.brand} ${item.model}`, sub: `${item.plate || 'Plaka yok'} • ${item.odometer?.toLocaleString('tr-TR') ?? '-'} km` }))} selected={selectedMotorcycleId} onSelect={setSelectedMotorcycleId} />
          )}
        </GlassCard>

        <Section title="4. İşlem, ücret ve usta" />
        <GlassCard style={styles.formCard}>
          <FormField label="İşlem türü / yapılacak iş" value={complaint} onChangeText={setComplaint} placeholder="Örn. Yağ değişimi, fren kontrolü" multiline />
          <FormField label="Servis notu" value={notes} onChangeText={setNotes} placeholder="Müşteri veya motorla ilgili ek not" multiline />
          <Toggle value={priceType === 'fixed'} onChange={(value) => setPriceType(value ? 'fixed' : 'estimated')} first="Net Fiyat" second="Tahmini Fiyat" />
          {priceType === 'fixed' ? (
            <FormField label="Net ücret" value={fixedPrice} onChangeText={setFixedPrice} placeholder="850" keyboardType="decimal-pad" />
          ) : (
            <View style={styles.twoCol}><View style={styles.col}><FormField label="Tahmini en az" value={estimatedMin} onChangeText={setEstimatedMin} placeholder="1500" keyboardType="decimal-pad" /></View><View style={styles.col}><FormField label="Tahmini en fazla" value={estimatedMax} onChangeText={setEstimatedMax} placeholder="2000" keyboardType="decimal-pad" /></View></View>
          )}
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>ATANACAK USTA</Text>
          <ChipList
            kind="mechanic"
            empty="Aktif Usta veya İşletme Sahibi + Usta bulunamadı."
            items={members.filter((item) => item.role === 'mechanic' || item.role === 'owner_mechanic').map((item) => ({ id: item.user_id, label: item.profile?.full_name || 'Usta', sub: `${item.role === 'owner_mechanic' ? 'İşletme Sahibi + Usta' : 'Usta'} • ${item.availability_status === 'busy' ? 'Meşgul' : item.availability_status === 'off' ? 'Kapalı' : 'Müsait'}` }))}
            selected={mechanicId}
            onSelect={canChooseWorker ? setMechanicId : () => undefined}
          />
          <Toggle value={startImmediately} onChange={setStartImmediately} first="Hemen Başla" second="Sıraya Al" />
          {startImmediately && (
            <View style={[styles.warning, { backgroundColor: `${colors.cyan}12`, borderColor: `${colors.cyan}38` }]}><Ionicons name="information-circle" size={19} color={colors.cyan} /><Text style={[styles.warningText, { color: colors.textMuted }]}>Ücret şimdi girilmeden tamire başlanabilir. Tahmini fiyat müşteriye aralık olarak gösterilir; motor teslim edilmeden önce son net fiyat kaydedilir.</Text></View>
          )}
        </GlassCard>

        <Section title="5. İlk tahsilat (opsiyonel)" />
        <GlassCard style={styles.formCard}>
          <ChoiceGrid
            items={[
              { id: 'none', title: 'Henüz ödeme yok', sub: 'Sonra tahsil edilecek', icon: 'time', accent: colors.primary },
              { id: 'cash', title: 'Nakit', sub: 'Kasaya alındı', icon: 'cash', accent: colors.green },
              { id: 'transfer', title: 'IBAN', sub: 'Banka transferi', icon: 'business', accent: colors.cyan },
            ]}
            selected={paymentMethod}
            onSelect={(id) => setPaymentMethod(id as 'none' | PaymentMethod)}
          />
          {paymentMethod !== 'none' && <FormField label="Alınan tutar" value={paymentAmount} onChangeText={setPaymentAmount} placeholder="850" keyboardType="decimal-pad" />}
        </GlassCard>

        <PrimaryButton title={startImmediately ? 'Kaydı Aç ve Tamire Başla' : 'Servisi Atölye Sırasına Ekle'} onPress={submit} loading={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Section({ title }: { title: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.section, { color: colors.text }]}>{title}</Text>;
}

function Toggle({ value, onChange, first, second, firstIcon, secondIcon }: { value: boolean; onChange: (value: boolean) => void; first: string; second: string; firstIcon?: keyof typeof Ionicons.glyphMap; secondIcon?: keyof typeof Ionicons.glyphMap }) {
  const { colors } = useTheme();
  const options = [
    { value: true, label: first, icon: firstIcon },
    { value: false, label: second, icon: secondIcon },
  ];
  return (
    <View style={[styles.toggle, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}>
      {options.map((option) => {
        const active = value === option.value;
        return (
          <AnimatedPressable key={String(option.value)} onPress={() => onChange(option.value)} style={[styles.toggleItem, { backgroundColor: active ? colors.cardStrong : 'transparent', borderColor: active ? `${colors.primary}7A` : 'transparent' }]}>
            {option.icon && <View style={[styles.toggleOptionIcon, { backgroundColor: `${colors.primary}14` }]}><Ionicons name={option.icon} size={18} color={active ? colors.primary : colors.textMuted} /></View>}
            <Text numberOfLines={1} maxFontSizeMultiplier={1.02} style={[styles.toggleText, { color: active ? colors.text : colors.textMuted }]}>{option.label}</Text>
            {active && <View style={[styles.toggleDot, { backgroundColor: colors.primary }]} />}
          </AnimatedPressable>
        );
      })}
    </View>
  );
}

type ChoiceItem = {
  id: string;
  title: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
};

function ChoiceGrid({ items, selected, onSelect }: { items: ChoiceItem[]; selected: string; onSelect: (id: string) => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.choiceGrid}>
      {items.map((item) => {
        const active = selected === item.id;
        return (
          <AnimatedPressable
            key={item.id}
            onPress={() => onSelect(item.id)}
            style={[
              styles.choice,
              {
                backgroundColor: active ? `${item.accent}18` : colors.surfaceSoft,
                borderColor: active ? item.accent : colors.border,
              },
            ]}
          >
            <View style={[styles.choiceIcon, { backgroundColor: `${item.accent}18`, borderColor: `${item.accent}38` }]}> 
              <Ionicons name={item.icon} size={21} color={item.accent} />
            </View>
            <View style={styles.choiceCopy}>
              <Text numberOfLines={2} maxFontSizeMultiplier={1.08} style={[styles.choiceTitle, { color: colors.text }]}>{item.title}</Text>
              <Text numberOfLines={2} maxFontSizeMultiplier={1.08} style={[styles.choiceSub, { color: colors.textMuted }]}>{item.sub}</Text>
            </View>
            <Ionicons name={active ? 'checkmark-circle' : 'ellipse-outline'} size={23} color={active ? item.accent : colors.textMuted} />
          </AnimatedPressable>
        );
      })}
    </View>
  );
}

function ChipList({ items, selected, onSelect, empty, kind = 'customer' }: { items: { id: string; label: string; sub: string }[]; selected: string | null; onSelect: (id: string) => void; empty: string; kind?: 'customer' | 'motorcycle' | 'mechanic' }) {
  const { colors } = useTheme();
  if (items.length === 0) return <Text style={[styles.empty, { color: colors.textMuted }]}>{empty}</Text>;
  const accent = kind === 'motorcycle' ? colors.cyan : kind === 'mechanic' ? colors.orange : colors.primary;
  return <View style={styles.chips}>{items.map((item) => {
    const active = selected === item.id;
    return <AnimatedPressable key={item.id} onPress={() => onSelect(item.id)} style={[styles.chip, { backgroundColor: active ? `${accent}18` : colors.surfaceSoft, borderColor: active ? accent : colors.border }]}>
      <View style={[styles.chipIcon, { backgroundColor: `${accent}14`, borderColor: `${accent}34` }]}>{kind === 'motorcycle' ? <AnimatedMotorcycleIcon size={28} color={accent} /> : <Ionicons name={kind === 'mechanic' ? 'construct' : 'person'} size={21} color={accent} />}</View>
      <View style={styles.chipCopy}><Text style={[styles.chipTitle, { color: colors.text }]}>{item.label}</Text><Text style={[styles.chipSub, { color: colors.textMuted }]}>{item.sub}</Text></View>
      <Ionicons name={active ? 'checkmark-circle' : 'chevron-forward'} size={22} color={active ? accent : colors.textMuted} />
    </AnimatedPressable>;
  })}</View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 54, paddingBottom: 60, gap: 15 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 13 },
  close: { width: 46, height: 46, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1 },
  eyebrow: { fontSize: 12.5, fontWeight: '900', letterSpacing: 1.2 },
  title: { fontSize: 27, fontWeight: '900', letterSpacing: -0.8, marginTop: 3 },
  subtitle: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  section: { fontSize: 18, fontWeight: '900', marginTop: 6 },
  formCard: { gap: 14 },
  toggle: { flexDirection: 'row', gap: 6, padding: 5, borderRadius: 17, borderWidth: 1 },
  toggleItem: { flex: 1, minWidth: 0, minHeight: 50, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 8 }, toggleOptionIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  toggleText: { fontSize: 13, fontWeight: '900', textAlign: 'center' },
  toggleDot: { width: 18, height: 2.5, borderRadius: 3, marginTop: 4 },
  twoCol: { flexDirection: 'row', gap: 10 },
  col: { flex: 1, minWidth: 0 },
  fieldLabel: { fontSize: 12.5, fontWeight: '900', letterSpacing: 0.8 },
  chips: { gap: 9 },
  chip: { minHeight: 72, borderRadius: 18, borderWidth: 1, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 10 }, chipIcon: { width: 46, height: 46, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  chipCopy: { flex: 1, minWidth: 0 },
  chipTitle: { fontSize: 14, fontWeight: '900' },
  chipSub: { fontSize: 12.5, marginTop: 3 },
  empty: { textAlign: 'center', paddingVertical: 16, fontSize: 13 },
  choiceGrid: { gap: 9 },
  choice: { width: '100%', minHeight: 74, borderRadius: 18, borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  choiceIcon: { width: 44, height: 44, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  choiceCopy: { flex: 1, minWidth: 0 },
  choiceTitle: { fontSize: 14, fontWeight: '900' },
  choiceSub: { fontSize: 12.5, lineHeight: 16, marginTop: 3 },
  matchList: { gap: 8 },
  matchCard: { minHeight: 62, borderRadius: 16, borderWidth: 1, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 9 },
  warning: { borderWidth: 1, borderRadius: 15, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 8 },
  warningText: { flex: 1, fontSize: 12.5, lineHeight: 16 },
});
