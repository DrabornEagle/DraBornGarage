import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { FormField } from '../components/FormField';
import { GlassCard } from '../components/GlassCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { StatusPill } from '../components/StatusPill';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { money, shortDate } from '../lib/format';
import { supabase } from '../lib/supabase';
import { Customer, Motorcycle, StaffCustomerClaim, WorkOrderStatus } from '../types';

type Tab = 'customers' | 'claims';

type CustomerWorkOrder = {
  id: string;
  customer_id: string;
  motorcycle_id: string;
  status: WorkOrderStatus;
  complaint: string;
  total_amount: number;
  amount_received: number;
  arrived_at: string;
};

type CustomerAccess = {
  work_order_id: string;
  tracking_code: string;
  claim_token: string;
  qr_payload: string;
  status: WorkOrderStatus;
  arrived_at: string;
};

const claimMethodLabel: Record<string, string> = {
  phone: 'Telefon doğrulaması',
  tracking_code: 'Servis takip kodu',
  qr: 'QR bağlantısı',
  mechanic_approval: 'Usta onayı',
  staff_manual: 'Manuel eşleştirme',
};

export function CustomersScreen() {
  const { colors } = useTheme();
  const { workshop } = useAuth();
  const [tab, setTab] = useState<Tab>('customers');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [workOrders, setWorkOrders] = useState<CustomerWorkOrder[]>([]);
  const [claims, setClaims] = useState<StaffCustomerClaim[]>([]);
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
  const [accessBikeId, setAccessBikeId] = useState<string | null>(null);
  const [access, setAccess] = useState<CustomerAccess | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!workshop) return;
    const [customerResult, bikeResult, orderResult, claimResult] = await Promise.all([
      supabase.from('customers').select('*').eq('workshop_id', workshop.id).order('created_at', { ascending: false }),
      supabase.from('motorcycles').select('*').eq('workshop_id', workshop.id).order('created_at', { ascending: false }),
      supabase.from('work_orders').select('id,customer_id,motorcycle_id,status,complaint,total_amount,amount_received,arrived_at').eq('workshop_id', workshop.id).order('arrived_at', { ascending: false }),
      supabase.rpc('staff_get_customer_claims', { p_workshop_id: workshop.id }),
    ]);
    setCustomers((customerResult.data as Customer[]) ?? []);
    setMotorcycles((bikeResult.data as Motorcycle[]) ?? []);
    setWorkOrders((orderResult.data as CustomerWorkOrder[]) ?? []);
    setClaims((claimResult.data as StaffCustomerClaim[]) ?? []);
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

  const pendingClaims = claims.filter((item) => item.status === 'pending');

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

  const openAccess = async (bikeId: string) => {
    if (accessBikeId === bikeId) {
      setAccessBikeId(null);
      setAccess(null);
      return;
    }
    const { data, error } = await supabase.rpc('staff_get_customer_access', { p_motorcycle_id: bikeId });
    if (error) return Alert.alert('Erişim kodu alınamadı', error.message);
    const nextAccess = ((data as CustomerAccess[] | null) ?? [])[0] ?? null;
    if (!nextAccess) return Alert.alert('Servis kaydı yok', 'Önce bu motor için bir servis kaydı açmalısın.');
    setAccessBikeId(bikeId);
    setAccess(nextAccess);
  };

  const shareAccess = async (bike: Motorcycle) => {
    if (!access) return;
    await Share.share({
      message: `DraBornGarage servis takibi\nMotor: ${bike.brand} ${bike.model} • ${bike.plate || 'Plaka yok'}\nTakip kodu: ${access.tracking_code}\nQR bağlantısı: ${access.qr_payload}`,
    });
  };

  const reviewClaim = async (claim: StaffCustomerClaim, approve: boolean) => {
    const action = approve ? 'onaylansın' : 'reddedilsin';
    Alert.alert(
      approve ? 'Eşleşmeyi onayla' : 'Eşleşmeyi reddet',
      `${claim.claimant_name} adlı hesabın ${claim.plate} plakalı motorla eşleşme talebi ${action} mı?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: approve ? 'Onayla' : 'Reddet',
          style: approve ? 'default' : 'destructive',
          onPress: async () => {
            const { error } = await supabase.rpc('staff_review_customer_claim', { p_claim_id: claim.id, p_approve: approve, p_note: null });
            if (error) return Alert.alert('Talep sonuçlandırılamadı', error.message);
            await load();
          },
        },
      ],
    );
  };

  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />} showsVerticalScrollIndicator={false}>
      <ScreenHeader
        eyebrow="MÜŞTERİ HAFIZASI"
        title="Müşteriler"
        subtitle="Müşteri, motor, servis geçmişi ve hesap eşleştirme taleplerini yönet."
        actionIcon={tab === 'customers' ? (showNew ? 'close' : 'person-add') : undefined}
        onAction={tab === 'customers' ? () => setShowNew((value) => !value) : undefined}
      />

      <View style={[styles.tabs, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}> 
        <AnimatedPressable onPress={() => setTab('customers')} style={[styles.tabButton, tab === 'customers' && { backgroundColor: colors.cardStrong, borderColor: `${colors.primary}60` }]}><Ionicons name="people" size={18} color={tab === 'customers' ? colors.primary : colors.textMuted} /><Text style={[styles.tabText, { color: tab === 'customers' ? colors.text : colors.textMuted }]}>Müşteriler</Text></AnimatedPressable>
        <AnimatedPressable onPress={() => setTab('claims')} style={[styles.tabButton, tab === 'claims' && { backgroundColor: colors.cardStrong, borderColor: `${colors.orange}60` }]}><Ionicons name="shield-checkmark" size={18} color={tab === 'claims' ? colors.orange : colors.textMuted} /><Text style={[styles.tabText, { color: tab === 'claims' ? colors.text : colors.textMuted }]}>Eşleşme Talepleri</Text>{pendingClaims.length > 0 && <View style={[styles.badge, { backgroundColor: colors.red }]}><Text style={styles.badgeText}>{pendingClaims.length}</Text></View>}</AnimatedPressable>
      </View>

      {tab === 'customers' ? (
        <>
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
              const customerOrders = workOrders.filter((order) => order.customer_id === customer.id);
              const expanded = selected === customer.id;
              const outstanding = customerOrders.reduce((sum, item) => sum + Math.max(0, Number(item.total_amount) - Number(item.amount_received)), 0);
              return (
                <GlassCard key={customer.id} style={styles.customerCard}>
                  <AnimatedPressable onPress={() => { setSelected(expanded ? null : customer.id); setShowBike(false); setAccessBikeId(null); setAccess(null); }} style={styles.customerTop}>
                    <View style={[styles.avatar, { backgroundColor: `${colors.primary}20` }]}><Text style={[styles.avatarText, { color: colors.primary }]}>{customer.full_name.charAt(0).toUpperCase()}</Text></View>
                    <View style={styles.customerCopy}><Text style={[styles.customerName, { color: colors.text }]}>{customer.full_name}</Text><Text style={[styles.customerMeta, { color: colors.textMuted }]}>{customer.phone || 'Telefon yok'} • {bikes.length} motosiklet • {customerOrders.length} servis</Text></View>
                    {outstanding > 0 && <Text style={[styles.debt, { color: colors.orange }]}>{money(outstanding)}</Text>}
                    <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} />
                  </AnimatedPressable>
                  {expanded && (
                    <View style={[styles.expanded, { borderTopColor: colors.border }]}> 
                      {bikes.length === 0 ? <Text style={[styles.noBike, { color: colors.textMuted }]}>Bu müşteriye ait motosiklet kaydı yok.</Text> : bikes.map((bike) => {
                        const bikeOrders = customerOrders.filter((order) => order.motorcycle_id === bike.id);
                        const latest = bikeOrders[0];
                        return (
                          <View key={bike.id} style={[styles.bikeBlock, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}> 
                            <View style={styles.bikeRow}>
                              <View style={[styles.bikeIcon, { backgroundColor: `${colors.primary2}18` }]}><Ionicons name="bicycle" size={22} color={colors.primary2} /></View>
                              <View style={styles.customerCopy}><Text style={[styles.bikeTitle, { color: colors.text }]}>{bike.brand} {bike.model}</Text><Text style={[styles.customerMeta, { color: colors.textMuted }]}>{bike.plate || 'Plaka yok'}{bike.odometer ? ` • ${bike.odometer.toLocaleString('tr-TR')} km` : ''} • {bikeOrders.length} servis</Text>{latest && <Text style={[styles.lastService, { color: colors.textMuted }]}>Son: {latest.complaint} • {shortDate(latest.arrived_at)}</Text>}</View>
                              {latest && <StatusPill status={latest.status} />}
                            </View>
                            <AnimatedPressable onPress={() => openAccess(bike.id)} style={[styles.accessButton, { borderColor: `${colors.cyan}40`, backgroundColor: `${colors.cyan}0D` }]}><Ionicons name="qr-code" size={18} color={colors.cyan} /><Text style={[styles.accessButtonText, { color: colors.cyan }]}>{accessBikeId === bike.id ? 'Erişim Kartını Kapat' : 'Müşteri Erişim Kodu / QR'}</Text></AnimatedPressable>
                            {accessBikeId === bike.id && access && (
                              <View style={[styles.accessPanel, { backgroundColor: colors.card, borderColor: colors.border }]}> 
                                <View style={styles.qrWrap}><QRCode value={access.qr_payload} size={142} backgroundColor="#FFFFFF" color="#111827" /></View>
                                <View style={styles.accessCopy}><Text style={[styles.accessLabel, { color: colors.textMuted }]}>SERVİS TAKİP KODU</Text><Text style={[styles.accessCode, { color: colors.text }]}>{access.tracking_code}</Text><Text style={[styles.accessHint, { color: colors.textMuted }]}>Müşteri uygulamada bu kodu girebilir veya QR bağlantısını tarayabilir.</Text><PrimaryButton title="Kodu ve QR Bağlantısını Paylaş" onPress={() => shareAccess(bike)} secondary /></View>
                              </View>
                            )}
                          </View>
                        );
                      })}
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
        </>
      ) : (
        <View style={styles.list}>
          {claims.length === 0 ? (
            <GlassCard style={styles.empty}><Ionicons name="shield-checkmark-outline" size={40} color={colors.textMuted} /><Text style={[styles.emptyTitle, { color: colors.text }]}>Eşleşme talebi yok</Text><Text style={[styles.emptyText, { color: colors.textMuted }]}>Müşteri plaka ile usta onayı istediğinde burada görünür.</Text></GlassCard>
          ) : claims.map((claim) => {
            const accent = claim.status === 'approved' ? colors.green : claim.status === 'pending' ? colors.orange : colors.red;
            return (
              <GlassCard key={claim.id} style={styles.claimCard}>
                <View style={styles.claimTop}>
                  <View style={[styles.claimIcon, { backgroundColor: `${accent}18` }]}><Ionicons name={claim.status === 'approved' ? 'checkmark-circle' : claim.status === 'pending' ? 'time' : 'close-circle'} size={24} color={accent} /></View>
                  <View style={styles.customerCopy}><Text style={[styles.claimTitle, { color: colors.text }]}>{claim.claimant_name}</Text><Text style={[styles.claimMeta, { color: colors.textMuted }]}>Hesap telefonu: {claim.claimant_phone || 'Yok'} • {shortDate(claim.created_at)}</Text></View>
                  <Text style={[styles.claimStatus, { color: accent }]}>{claim.status === 'pending' ? 'BEKLİYOR' : claim.status === 'approved' ? 'ONAYLI' : 'REDDEDİLDİ'}</Text>
                </View>
                <View style={[styles.claimBike, { backgroundColor: colors.surfaceSoft }]}><Ionicons name="bicycle" size={22} color={colors.primary2} /><View style={styles.customerCopy}><Text style={[styles.bikeTitle, { color: colors.text }]}>{claim.brand} {claim.model} • {claim.plate}</Text><Text style={[styles.customerMeta, { color: colors.textMuted }]}>İşletme kaydı: {claim.customer_name} • {claimMethodLabel[claim.method]}</Text>{claim.submitted_phone && <Text style={[styles.customerMeta, { color: colors.textMuted }]}>Gönderilen telefon: {claim.submitted_phone}</Text>}</View></View>
                {claim.status === 'pending' && <View style={styles.claimActions}><AnimatedPressable onPress={() => reviewClaim(claim, false)} style={[styles.rejectButton, { borderColor: `${colors.red}42`, backgroundColor: `${colors.red}0D` }]}><Ionicons name="close" size={18} color={colors.red} /><Text style={[styles.rejectText, { color: colors.red }]}>Reddet</Text></AnimatedPressable><AnimatedPressable onPress={() => reviewClaim(claim, true)} style={[styles.approveButton, { backgroundColor: colors.green }]}><Ionicons name="checkmark" size={18} color="#fff" /><Text style={styles.approveText}>Motorla Eşleştir</Text></AnimatedPressable></View>}
              </GlassCard>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 56, paddingBottom: 120, gap: 16 },
  tabs: { flexDirection: 'row', gap: 6, padding: 5, borderRadius: 18, borderWidth: 1 },
  tabButton: { flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  tabText: { fontSize: 11, fontWeight: '900' },
  badge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  search: { minHeight: 54, borderWidth: 1, borderRadius: 18, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, gap: 10 },
  searchInput: { flex: 1, fontSize: 14 },
  form: { gap: 13 },
  formTitle: { fontSize: 18, fontWeight: '900' },
  list: { gap: 11 },
  customerCard: { padding: 14 },
  customerTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 19, fontWeight: '900' },
  customerCopy: { flex: 1, minWidth: 0 },
  customerName: { fontSize: 15, fontWeight: '900' },
  customerMeta: { fontSize: 10.5, marginTop: 4 },
  debt: { fontSize: 11, fontWeight: '900' },
  expanded: { borderTopWidth: 1, marginTop: 14, paddingTop: 13, gap: 10 },
  bikeBlock: { borderWidth: 1, borderRadius: 18, padding: 11, gap: 9 },
  bikeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bikeIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  bikeTitle: { fontSize: 13, fontWeight: '900' },
  lastService: { fontSize: 9, marginTop: 4 },
  noBike: { textAlign: 'center', paddingVertical: 8, fontSize: 12 },
  accessButton: { minHeight: 42, borderWidth: 1, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  accessButtonText: { fontSize: 10, fontWeight: '900' },
  accessPanel: { borderWidth: 1, borderRadius: 18, padding: 13, gap: 13, alignItems: 'center' },
  qrWrap: { padding: 10, borderRadius: 16, backgroundColor: '#fff' },
  accessCopy: { width: '100%', alignItems: 'center', gap: 7 },
  accessLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  accessCode: { fontSize: 27, fontWeight: '900', letterSpacing: 4 },
  accessHint: { fontSize: 10.5, lineHeight: 16, textAlign: 'center' },
  addBikeButton: { minHeight: 44, borderWidth: 1, borderStyle: 'dashed', borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  addBikeText: { fontSize: 12, fontWeight: '900' },
  bikeForm: { gap: 11 },
  twoCol: { flexDirection: 'row', gap: 9 },
  col: { flex: 1 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 28 },
  emptyTitle: { fontSize: 17, fontWeight: '900' },
  emptyText: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  claimCard: { gap: 12 },
  claimTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  claimIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  claimTitle: { fontSize: 14, fontWeight: '900' },
  claimMeta: { fontSize: 10, marginTop: 4 },
  claimStatus: { fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  claimBike: { minHeight: 66, borderRadius: 16, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10 },
  claimActions: { flexDirection: 'row', gap: 9 },
  rejectButton: { flex: 1, minHeight: 46, borderWidth: 1, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  rejectText: { fontSize: 11, fontWeight: '900' },
  approveButton: { flex: 1.4, minHeight: 46, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  approveText: { color: '#fff', fontSize: 11, fontWeight: '900' },
});
