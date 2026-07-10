import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { FormField } from '../components/FormField';
import { GlassCard } from '../components/GlassCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { Customer, Motorcycle } from '../types';

export function NewWorkOrderScreen({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { colors } = useTheme();
  const { workshop, membership } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [members, setMembers] = useState<any[]>([]);
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
  const [mechanicId, setMechanicId] = useState<string | null>(membership?.user_id ?? null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!workshop) return;
    Promise.all([
      supabase.from('customers').select('*').eq('workshop_id', workshop.id).order('full_name'),
      supabase.from('motorcycles').select('*').eq('workshop_id', workshop.id).order('created_at', { ascending: false }),
      supabase.from('workshop_members').select('user_id,role,profile:profiles(full_name)').eq('workshop_id', workshop.id).eq('is_active', true),
    ]).then(([customerResult, motorcycleResult, memberResult]) => {
      setCustomers((customerResult.data as Customer[]) ?? []);
      setMotorcycles((motorcycleResult.data as Motorcycle[]) ?? []);
      setMembers(memberResult.data ?? []);
      if (membership?.role === 'mechanic') setMechanicId(membership.user_id);
    });
  }, [workshop, membership]);

  const customerBikes = useMemo(() => motorcycles.filter((item) => item.customer_id === selectedCustomerId), [motorcycles, selectedCustomerId]);

  const submit = async () => {
    if (!workshop || !membership) return;
    if (!complaint.trim()) return Alert.alert('Müşteri şikayeti / yapılacak iş gerekli');
    if (newCustomer && !customerName.trim()) return Alert.alert('Müşteri adı gerekli');
    if (!newCustomer && !selectedCustomerId) return Alert.alert('Bir müşteri seç');
    if (newMotorcycle && (!brand.trim() || !model.trim())) return Alert.alert('Motosiklet marka ve modeli gerekli');
    if (!newMotorcycle && !selectedMotorcycleId) return Alert.alert('Bir motosiklet seç');

    setSaving(true);
    let customerId = selectedCustomerId;
    let motorcycleId = selectedMotorcycleId;

    if (newCustomer) {
      const { data, error } = await supabase.from('customers').insert({ workshop_id: workshop.id, full_name: customerName.trim(), phone: customerPhone.trim() || null }).select('id').single();
      if (error) { setSaving(false); return Alert.alert('Müşteri oluşturulamadı', error.message); }
      customerId = data.id;
    }

    if (newMotorcycle) {
      const { data, error } = await supabase.from('motorcycles').insert({
        workshop_id: workshop.id,
        customer_id: customerId,
        brand: brand.trim(),
        model: model.trim(),
        plate: plate.trim().toUpperCase() || null,
        odometer: odometer ? Number(odometer) : null,
      }).select('id').single();
      if (error) { setSaving(false); return Alert.alert('Motosiklet oluşturulamadı', error.message); }
      motorcycleId = data.id;
    }

    const { error } = await supabase.from('work_orders').insert({
      workshop_id: workshop.id,
      customer_id: customerId,
      motorcycle_id: motorcycleId,
      assigned_mechanic_id: mechanicId,
      complaint: complaint.trim(),
      notes: notes.trim() || null,
      odometer_in: odometer ? Number(odometer) : null,
      status: 'waiting',
    });
    setSaving(false);
    if (error) return Alert.alert('Servis kaydı oluşturulamadı', error.message);
    Alert.alert('Servis kaydı hazır', 'Motosiklet bekleyen işler listesine eklendi.');
    onCreated();
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <AnimatedPressable onPress={onClose} style={[styles.close, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="close" size={24} color={colors.text} /></AnimatedPressable>
          <View style={styles.headerCopy}><Text style={[styles.eyebrow, { color: colors.primary }]}>HIZLI KABUL</Text><Text style={[styles.title, { color: colors.text }]}>Yeni Servis Kaydı</Text><Text style={[styles.subtitle, { color: colors.textMuted }]}>Müşteri, motosiklet ve atanacak ustayı tek adımda kaydet.</Text></View>
        </View>

        <Section title="1. Müşteri" />
        <GlassCard style={styles.formCard}>
          <Toggle value={newCustomer} onChange={setNewCustomer} first="Yeni müşteri" second="Kayıtlı müşteri" />
          {newCustomer ? (
            <><FormField label="Ad Soyad" value={customerName} onChangeText={setCustomerName} placeholder="Müşteri adı" /><FormField label="Telefon" value={customerPhone} onChangeText={setCustomerPhone} keyboardType="phone-pad" placeholder="05xx xxx xx xx" /></>
          ) : (
            <ChipList empty="Henüz kayıtlı müşteri yok." items={customers.map((item) => ({ id: item.id, label: item.full_name, sub: item.phone || 'Telefon yok' }))} selected={selectedCustomerId} onSelect={(id) => { setSelectedCustomerId(id); setSelectedMotorcycleId(null); setNewMotorcycle(true); }} />
          )}
        </GlassCard>

        <Section title="2. Motosiklet" />
        <GlassCard style={styles.formCard}>
          {!newCustomer && selectedCustomerId && customerBikes.length > 0 && <Toggle value={newMotorcycle} onChange={setNewMotorcycle} first="Yeni motosiklet" second="Kayıtlı motosiklet" />}
          {newMotorcycle || newCustomer ? (
            <>
              <View style={styles.twoCol}><View style={styles.col}><FormField label="Marka" value={brand} onChangeText={setBrand} placeholder="Honda" /></View><View style={styles.col}><FormField label="Model" value={model} onChangeText={setModel} placeholder="PCX 125" /></View></View>
              <FormField label="Plaka" value={plate} onChangeText={(value) => setPlate(value.toUpperCase())} placeholder="06 ABC 123" autoCapitalize="characters" />
              <FormField label="Kilometre" value={odometer} onChangeText={setOdometer} keyboardType="number-pad" placeholder="23500" />
            </>
          ) : (
            <ChipList empty="Bu müşterinin kayıtlı motosikleti yok." items={customerBikes.map((item) => ({ id: item.id, label: `${item.brand} ${item.model}`, sub: item.plate || 'Plaka yok' }))} selected={selectedMotorcycleId} onSelect={setSelectedMotorcycleId} />
          )}
        </GlassCard>

        <Section title="3. Servis bilgisi" />
        <GlassCard style={styles.formCard}>
          <FormField label="Şikayet / yapılacak iş" value={complaint} onChangeText={setComplaint} placeholder="Örn. Ön frenden ses geliyor, genel bakım yapılacak." multiline />
          <FormField label="Servis notu" value={notes} onChangeText={setNotes} placeholder="Müşterinin bıraktığı ek notlar" multiline />
          <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>ATANACAK USTA</Text>
          <ChipList
            empty="Aktif ekip üyesi yok."
            items={members.filter((item) => item.role === 'mechanic' || item.role === 'owner').map((item) => ({ id: item.user_id, label: item.profile?.full_name || 'Usta', sub: item.role === 'owner' ? 'İşletme sahibi' : 'Usta' }))}
            selected={mechanicId}
            onSelect={membership?.role === 'owner' ? setMechanicId : () => undefined}
          />
        </GlassCard>

        <PrimaryButton title="Servis Kaydını Oluştur" onPress={submit} loading={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Section({ title }: { title: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.section, { color: colors.text }]}>{title}</Text>;
}

function Toggle({ value, onChange, first, second }: { value: boolean; onChange: (value: boolean) => void; first: string; second: string }) {
  const { colors } = useTheme();
  return <View style={[styles.toggle, { backgroundColor: colors.surfaceSoft }]}>{[[true, first], [false, second]].map(([item, label]) => <AnimatedPressable key={String(item)} onPress={() => onChange(Boolean(item))} style={[styles.toggleItem, value === item && { backgroundColor: colors.cardStrong }]}><Text style={[styles.toggleText, { color: value === item ? colors.text : colors.textMuted }]}>{String(label)}</Text></AnimatedPressable>)}</View>;
}

function ChipList({ items, selected, onSelect, empty }: { items: { id: string; label: string; sub: string }[]; selected: string | null; onSelect: (id: string) => void; empty: string }) {
  const { colors } = useTheme();
  if (items.length === 0) return <Text style={[styles.empty, { color: colors.textMuted }]}>{empty}</Text>;
  return <View style={styles.chips}>{items.map((item) => <AnimatedPressable key={item.id} onPress={() => onSelect(item.id)} style={[styles.chip, { backgroundColor: selected === item.id ? `${colors.primary}20` : colors.surfaceSoft, borderColor: selected === item.id ? colors.primary : colors.border }]}><View style={styles.chipCopy}><Text style={[styles.chipTitle, { color: colors.text }]}>{item.label}</Text><Text style={[styles.chipSub, { color: colors.textMuted }]}>{item.sub}</Text></View>{selected === item.id && <Ionicons name="checkmark-circle" size={22} color={colors.primary} />}</AnimatedPressable>)}</View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 54, paddingBottom: 60, gap: 15 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 13 },
  close: { width: 46, height: 46, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1 },
  eyebrow: { fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  title: { fontSize: 27, fontWeight: '900', letterSpacing: -0.8, marginTop: 3 },
  subtitle: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  section: { fontSize: 18, fontWeight: '900', marginTop: 6 },
  formCard: { gap: 14 },
  toggle: { flexDirection: 'row', padding: 4, borderRadius: 16 },
  toggleItem: { flex: 1, minHeight: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  toggleText: { fontSize: 12, fontWeight: '900' },
  twoCol: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },
  fieldLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  chips: { gap: 9 },
  chip: { minHeight: 59, borderRadius: 17, borderWidth: 1, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  chipCopy: { flex: 1 },
  chipTitle: { fontSize: 14, fontWeight: '900' },
  chipSub: { fontSize: 11, marginTop: 3 },
  empty: { textAlign: 'center', paddingVertical: 16, fontSize: 13 },
});
