import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { FormField } from '../components/FormField';
import { GlassCard } from '../components/GlassCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { Customer, Motorcycle } from '../types';

export function CustomersScreen() {
  const { colors } = useTheme();
  const { workshop } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showBike, setShowBike] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [plate, setPlate] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!workshop) return;
    const [customerResult, bikeResult] = await Promise.all([
      supabase.from('customers').select('*').eq('workshop_id', workshop.id).order('created_at', { ascending: false }),
      supabase.from('motorcycles').select('*').eq('workshop_id', workshop.id).order('created_at', { ascending: false }),
    ]);
    setCustomers((customerResult.data as Customer[]) ?? []);
    setMotorcycles((bikeResult.data as Motorcycle[]) ?? []);
  }, [workshop]);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('tr-TR');
    if (!normalized) return customers;
    return customers.filter((customer) => {
      const bikes = motorcycles.filter((bike) => bike.customer_id === customer.id);
      return customer.full_name.toLocaleLowerCase('tr-TR').includes(normalized)
        || customer.phone?.includes(normalized)
        || bikes.some((bike) => `${bike.brand} ${bike.model} ${bike.plate ?? ''}`.toLocaleLowerCase('tr-TR').includes(normalized));
    });
  }, [customers, motorcycles, query]);

  const addCustomer = async () => {
    if (!workshop || !name.trim()) return Alert.alert('Müşteri adı gerekli');
    setSaving(true);
    const { error } = await supabase.from('customers').insert({ workshop_id: workshop.id, full_name: name.trim(), phone: phone.trim() || null, note: note.trim() || null });
    setSaving(false);
    if (error) Alert.alert('Müşteri eklenemedi', error.message);
    else { setName(''); setPhone(''); setNote(''); setShowNew(false); load(); }
  };

  const addBike = async () => {
    if (!workshop || !selected || !brand.trim() || !model.trim()) return Alert.alert('Marka ve model gerekli');
    setSaving(true);
    const { error } = await supabase.from('motorcycles').insert({ workshop_id: workshop.id, customer_id: selected, brand: brand.trim(), model: model.trim(), plate: plate.trim().toUpperCase() || null });
    setSaving(false);
    if (error) Alert.alert('Motosiklet eklenemedi', error.message);
    else { setBrand(''); setModel(''); setPlate(''); setShowBike(false); load(); }
  };

  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}>
      <ScreenHeader eyebrow="MÜŞTERİ HAFIZASI" title="Müşteriler" subtitle="Müşteri ve motosiklet geçmişini işletme içinde düzenli tut." actionIcon={showNew ? 'close' : 'person-add'} onAction={() => setShowNew((value) => !value)} />

      <View style={[styles.search, { backgroundColor: colors.card, borderColor: colors.border }]}> 
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Ad, telefon, marka veya plaka ara" placeholderTextColor={colors.textMuted} style={[styles.searchInput, { color: colors.text }]} />
      </View>

      {showNew && (
        <GlassCard style={styles.form}>
          <Text style={[styles.formTitle, { color: colors.text }]}>Yeni müşteri</Text>
          <FormField label="Ad Soyad" value={name} onChangeText={setName} placeholder="Müşteri adı" />
          <FormField label="Telefon" value={phone} onChangeText={setPhone} placeholder="05xx xxx xx xx" keyboardType="phone-pad" />
          <FormField label="Not" value={note} onChangeText={setNote} placeholder="Özel müşteri notu" multiline />
          <PrimaryButton title="Müşteriyi Kaydet" onPress={addCustomer} loading={saving} />
        </GlassCard>
      )}

      <View style={styles.list}>
        {visible.length === 0 ? (
          <GlassCard style={styles.empty}><Ionicons name="people-outline" size={38} color={colors.textMuted} /><Text style={[styles.emptyTitle, { color: colors.text }]}>Müşteri bulunamadı</Text><Text style={[styles.emptyText, { color: colors.textMuted }]}>Arama filtresini temizle veya yeni müşteri ekle.</Text></GlassCard>
        ) : visible.map((customer) => {
          const bikes = motorcycles.filter((bike) => bike.customer_id === customer.id);
          const expanded = selected === customer.id;
          return (
            <GlassCard key={customer.id} style={styles.customerCard}>
              <AnimatedPressable onPress={() => { setSelected(expanded ? null : customer.id); setShowBike(false); }} style={styles.customerTop}>
                <View style={[styles.avatar, { backgroundColor: `${colors.primary}20` }]}><Text style={[styles.avatarText, { color: colors.primary }]}>{customer.full_name.charAt(0).toUpperCase()}</Text></View>
                <View style={styles.customerCopy}><Text style={[styles.customerName, { color: colors.text }]}>{customer.full_name}</Text><Text style={[styles.customerMeta, { color: colors.textMuted }]}>{customer.phone || 'Telefon yok'} • {bikes.length} motosiklet</Text></View>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
              </AnimatedPressable>
              {expanded && (
                <View style={[styles.expanded, { borderTopColor: colors.border }]}> 
                  {bikes.length === 0 ? <Text style={[styles.noBike, { color: colors.textMuted }]}>Bu müşteriye ait motosiklet kaydı yok.</Text> : bikes.map((bike) => (
                    <View key={bike.id} style={[styles.bikeRow, { backgroundColor: colors.surfaceSoft }]}> 
                      <View style={[styles.bikeIcon, { backgroundColor: `${colors.primary2}18` }]}><Ionicons name="bicycle" size={22} color={colors.primary2} /></View>
                      <View style={styles.customerCopy}><Text style={[styles.bikeTitle, { color: colors.text }]}>{bike.brand} {bike.model}</Text><Text style={[styles.customerMeta, { color: colors.textMuted }]}>{bike.plate || 'Plaka yok'}{bike.odometer ? ` • ${bike.odometer.toLocaleString('tr-TR')} km` : ''}</Text></View>
                    </View>
                  ))}
                  <AnimatedPressable onPress={() => setShowBike((value) => !value)} style={[styles.addBikeButton, { borderColor: colors.border }]}><Ionicons name={showBike ? 'close' : 'add-circle-outline'} size={20} color={colors.primary} /><Text style={[styles.addBikeText, { color: colors.primary }]}>{showBike ? 'Formu kapat' : 'Motosiklet ekle'}</Text></AnimatedPressable>
                  {showBike && (
                    <View style={styles.bikeForm}>
                      <View style={styles.twoCol}><View style={styles.col}><FormField label="Marka" value={brand} onChangeText={setBrand} placeholder="Yamaha" /></View><View style={styles.col}><FormField label="Model" value={model} onChangeText={setModel} placeholder="NMAX" /></View></View>
                      <FormField label="Plaka" value={plate} onChangeText={(value) => setPlate(value.toUpperCase())} placeholder="06 ABC 123" />
                      <PrimaryButton title="Motosikleti Kaydet" onPress={addBike} loading={saving} secondary />
                    </View>
                  )}
                </View>
              )}
            </GlassCard>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 56, paddingBottom: 120, gap: 16 },
  search: { minHeight: 54, borderWidth: 1, borderRadius: 18, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, gap: 10 },
  searchInput: { flex: 1, fontSize: 14 },
  form: { gap: 13 },
  formTitle: { fontSize: 18, fontWeight: '900' },
  list: { gap: 11 },
  customerCard: { padding: 14 },
  customerTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 19, fontWeight: '900' },
  customerCopy: { flex: 1 },
  customerName: { fontSize: 15, fontWeight: '900' },
  customerMeta: { fontSize: 12, marginTop: 4 },
  expanded: { borderTopWidth: 1, marginTop: 14, paddingTop: 13, gap: 9 },
  bikeRow: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 11, borderRadius: 16 },
  bikeIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  bikeTitle: { fontSize: 14, fontWeight: '900' },
  noBike: { textAlign: 'center', paddingVertical: 8, fontSize: 12 },
  addBikeButton: { minHeight: 44, borderWidth: 1, borderStyle: 'dashed', borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  addBikeText: { fontSize: 12, fontWeight: '900' },
  bikeForm: { gap: 11 },
  twoCol: { flexDirection: 'row', gap: 9 },
  col: { flex: 1 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 28 },
  emptyTitle: { fontSize: 17, fontWeight: '900' },
  emptyText: { fontSize: 13, textAlign: 'center' },
});
