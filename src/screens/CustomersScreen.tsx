import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { AnimatedMotorcycleIcon } from '../components/AnimatedMotorcycleIcon';
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
import { Customer, Motorcycle, StaffCustomerClaim, StaffRegisteredCustomerMatch, WorkOrderStatus } from '../types';

type Tab = 'customers' | 'claims';
type Order = { id: string; customer_id: string; motorcycle_id: string; status: WorkOrderStatus; complaint: string; total_amount: number; amount_received: number; arrived_at: string };
type Access = { work_order_id: string; tracking_code: string; claim_token: string; qr_payload: string; status: WorkOrderStatus; arrived_at: string };

export function CustomersScreen() {
  const { colors } = useTheme();
  const { workshop } = useAuth();
  const [tab, setTab] = useState<Tab>('customers');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [claims, setClaims] = useState<StaffCustomerClaim[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showBike, setShowBike] = useState(false);
  const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [note, setNote] = useState('');
  const [brand, setBrand] = useState(''); const [model, setModel] = useState(''); const [plate, setPlate] = useState('');
  const [accessBike, setAccessBike] = useState<string | null>(null); const [access, setAccess] = useState<Access | null>(null);
  const [saving, setSaving] = useState(false); const [refreshing, setRefreshing] = useState(false);
  const [accountPlate, setAccountPlate] = useState('');
  const [accountMatches, setAccountMatches] = useState<StaffRegisteredCustomerMatch[]>([]);
  const [accountLoading, setAccountLoading] = useState(false);

  const load = useCallback(async () => {
    if (!workshop) return;
    const [c, m, o, cl] = await Promise.all([
      supabase.from('customers').select('*').eq('workshop_id', workshop.id).order('created_at', { ascending: false }),
      supabase.from('motorcycles').select('*').eq('workshop_id', workshop.id).order('created_at', { ascending: false }),
      supabase.from('work_orders').select('id,customer_id,motorcycle_id,status,complaint,total_amount,amount_received,arrived_at').eq('workshop_id', workshop.id).order('arrived_at', { ascending: false }),
      supabase.rpc('staff_get_customer_claims', { p_workshop_id: workshop.id }),
    ]);
    setCustomers((c.data as Customer[]) ?? []); setMotorcycles((m.data as Motorcycle[]) ?? []); setOrders((o.data as Order[]) ?? []); setClaims((cl.data as StaffCustomerClaim[] | null) ?? []);
  }, [workshop]);
  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => { const q = query.trim().toLocaleLowerCase('tr-TR'); if (!q) return customers; return customers.filter((c) => c.full_name.toLocaleLowerCase('tr-TR').includes(q) || c.phone?.includes(q) || motorcycles.filter((m) => m.customer_id === c.id).some((m) => `${m.brand} ${m.model} ${m.plate ?? ''}`.toLocaleLowerCase('tr-TR').includes(q))); }, [customers, motorcycles, query]);
  const pending = claims.filter((item) => item.status === 'pending').length;

  const addCustomer = async () => { if (!workshop || !name.trim()) return Alert.alert('Müşteri adı gerekli'); setSaving(true); const { error } = await supabase.from('customers').insert({ workshop_id: workshop.id, full_name: name.trim(), phone: phone.trim() || null, note: note.trim() || null }); setSaving(false); if (error) return Alert.alert('Eklenemedi', error.message); setName(''); setPhone(''); setNote(''); setShowNew(false); await load(); };
  const addBike = async () => { if (!workshop || !selected || !brand.trim() || !model.trim()) return Alert.alert('Marka ve model gerekli'); setSaving(true); const { error } = await supabase.from('motorcycles').insert({ workshop_id: workshop.id, customer_id: selected, brand: brand.trim(), model: model.trim(), plate: plate.trim().toUpperCase() || null }); setSaving(false); if (error) return Alert.alert('Eklenemedi', error.message); setBrand(''); setModel(''); setPlate(''); setShowBike(false); await load(); };

  const openAccess = async (bikeId: string) => {
    if (accessBike === bikeId) { setAccessBike(null); setAccess(null); return; }
    const { data, error } = await supabase.rpc('staff_get_customer_access', { p_motorcycle_id: bikeId });
    if (error) return Alert.alert('Kod alınamadı', error.message);
    const value = ((data as Access[] | null) ?? [])[0];
    if (!value) return Alert.alert('Servis kaydı yok', 'Önce motor için servis kaydı aç.');
    setAccessBike(bikeId); setAccess(value);
  };

  const review = (claim: StaffCustomerClaim, approve: boolean) => Alert.alert(approve ? 'Eşleşmeyi onayla' : 'Talebi reddet', `${claim.claimant_name} • ${claim.plate}`, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: approve ? 'Onayla' : 'Reddet', style: approve ? 'default' : 'destructive', onPress: async () => { const { error } = await supabase.rpc('staff_review_customer_claim', { p_claim_id: claim.id, p_approve: approve, p_note: null }); if (error) return Alert.alert('İşlem başarısız', error.message); await load(); } },
  ]);

  const findRegisteredAccount = async () => {
    if (!workshop || accountPlate.trim().replace(/[^A-Za-z0-9ÇĞİÖŞÜçğıöşü]/g, '').length < 5) return Alert.alert('Geçerli plaka gir');
    setAccountLoading(true);
    const { data, error } = await supabase.rpc('staff_find_registered_customer_by_plate', { p_workshop_id: workshop.id, p_plate: accountPlate.trim() });
    setAccountLoading(false);
    if (error) return Alert.alert('Hesap aranamadı', error.message);
    const rows = (data as StaffRegisteredCustomerMatch[] | null) ?? [];
    setAccountMatches(rows);
    if (rows.length === 0) Alert.alert('Kayıt bulunamadı', 'Bu plakayla açılmış bir müşteri hesabı bulunamadı.');
  };

  const linkRegisteredAccount = async (match: StaffRegisteredCustomerMatch) => {
    if (!workshop) return;
    Alert.alert('Müşteri hesabını eşleştir', `${match.full_name} • ${match.registered_plate}`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Onayla ve Eşleştir', onPress: async () => {
        setAccountLoading(true);
        const { error } = await supabase.rpc('staff_link_registered_customer_by_plate', { p_workshop_id: workshop.id, p_user_id: match.user_id, p_plate: match.registered_plate });
        setAccountLoading(false);
        if (error) return Alert.alert('Eşleştirme yapılamadı', error.message);
        setAccountMatches([]); setAccountPlate(''); await load();
        Alert.alert('Hesap eşleştirildi', 'Müşteri hesabı ve motosiklet bu işletmeye güvenle bağlandı.');
      } },
    ]);
  };

  return <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.primary} />}>
    <ScreenHeader eyebrow="MÜŞTERİ HAFIZASI" title="Müşteriler" subtitle="Müşteri, motor, servis erişimi ve hesap eşleştirme talepleri." actionIcon={tab === 'customers' ? (showNew ? 'close' : 'person-add') : undefined} onAction={tab === 'customers' ? () => setShowNew((v) => !v) : undefined} />
    <View style={[styles.tabs, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}><TabButton active={tab === 'customers'} label="Müşteriler" icon="people" onPress={() => setTab('customers')} /><TabButton active={tab === 'claims'} label="Eşleşme Talepleri" icon="shield-checkmark" badge={pending} onPress={() => setTab('claims')} /></View>

    {tab === 'customers' ? <>
      <View style={[styles.search, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="search" size={20} color={colors.textMuted} /><TextInput value={query} onChangeText={setQuery} placeholder="Ad, telefon, marka veya plaka ara" placeholderTextColor={colors.textMuted} style={[styles.searchInput, { color: colors.text }]} /></View>
      {showNew && <GlassCard style={styles.form}><Text style={[styles.formTitle, { color: colors.text }]}>Yeni müşteri</Text><FormField label="Ad Soyad" value={name} onChangeText={setName} /><FormField label="Telefon" value={phone} onChangeText={setPhone} keyboardType="phone-pad" /><FormField label="Özel not" value={note} onChangeText={setNote} multiline /><PrimaryButton title="Müşteriyi Kaydet" onPress={addCustomer} loading={saving} /></GlassCard>}
      {visible.map((customer) => { const bikes = motorcycles.filter((b) => b.customer_id === customer.id); const customerOrders = orders.filter((o) => o.customer_id === customer.id); const expanded = selected === customer.id; const debt = customerOrders.reduce((sum, o) => sum + Math.max(0, Number(o.total_amount) - Number(o.amount_received)), 0); return <GlassCard key={customer.id} style={styles.customerCard}>
        <AnimatedPressable onPress={() => { setSelected(expanded ? null : customer.id); setShowBike(false); setAccessBike(null); }} style={styles.customerTop}><View style={[styles.avatar, { backgroundColor: `${colors.primary}20` }]}><Text style={[styles.avatarText, { color: colors.primary }]}>{customer.full_name.charAt(0)}</Text></View><View style={styles.copy}><Text style={[styles.customerName, { color: colors.text }]}>{customer.full_name}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{customer.phone || 'Telefon yok'} • {bikes.length} motor • {customerOrders.length} servis</Text></View>{debt > 0 && <Text style={[styles.debt, { color: colors.orange }]}>{money(debt)}</Text>}<Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textMuted} /></AnimatedPressable>
        {expanded && <View style={[styles.expanded, { borderTopColor: colors.border }]}>{bikes.map((bike) => { const bikeOrders = customerOrders.filter((o) => o.motorcycle_id === bike.id); const latest = bikeOrders[0]; return <View key={bike.id} style={[styles.bike, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}><View style={styles.bikeTop}><AnimatedMotorcycleIcon size={32} color={colors.primary2} /><View style={styles.copy}><Text style={[styles.bikeTitle, { color: colors.text }]}>{bike.brand} {bike.model}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{bike.plate || 'Plaka yok'} • {bikeOrders.length} servis</Text>{latest && <Text style={[styles.meta, { color: colors.textMuted }]}>Son: {latest.complaint} • {shortDate(latest.arrived_at)}</Text>}</View>{latest && <StatusPill status={latest.status} />}</View><AnimatedPressable onPress={() => openAccess(bike.id)} style={[styles.accessButton, { borderColor: `${colors.cyan}40`, backgroundColor: `${colors.cyan}0D` }]}><Ionicons name="qr-code" size={18} color={colors.cyan} /><Text style={[styles.accessText, { color: colors.cyan }]}>{accessBike === bike.id ? 'Erişim Kartını Kapat' : 'Takip Kodu / QR'}</Text></AnimatedPressable>{accessBike === bike.id && access && <View style={[styles.accessPanel, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={styles.qr}><QRCode value={access.qr_payload} size={135} /></View><Text style={[styles.codeLabel, { color: colors.textMuted }]}>SERVİS TAKİP KODU</Text><Text style={[styles.code, { color: colors.text }]}>{access.tracking_code}</Text><PrimaryButton title="Müşteriyle Paylaş" secondary onPress={() => Share.share({ message: `DraBornGarage servis takibi\n${bike.brand} ${bike.model} • ${bike.plate}\nKod: ${access.tracking_code}\n${access.qr_payload}` })} /></View>}</View>; })}
          <AnimatedPressable onPress={() => setShowBike((v) => !v)} style={[styles.addBike, { borderColor: colors.border }]}><Ionicons name={showBike ? 'close' : 'add-circle-outline'} size={20} color={colors.primary} /><Text style={[styles.addBikeText, { color: colors.primary }]}>{showBike ? 'Formu kapat' : 'Motosiklet ekle'}</Text></AnimatedPressable>
          {showBike && <View style={styles.form}><View style={styles.twoCol}><View style={styles.flex}><FormField label="Marka" value={brand} onChangeText={setBrand} /></View><View style={styles.flex}><FormField label="Model" value={model} onChangeText={setModel} /></View></View><FormField label="Plaka" value={plate} onChangeText={(v) => setPlate(v.toUpperCase())} /><PrimaryButton title="Motosikleti Kaydet" onPress={addBike} loading={saving} secondary /></View>}
        </View>}
      </GlassCard>; })}
      {visible.length === 0 && <GlassCard style={styles.empty}><Ionicons name="people-outline" size={38} color={colors.textMuted} /><Text style={[styles.emptyTitle, { color: colors.text }]}>Müşteri bulunamadı</Text></GlassCard>}
    </> : <>
      <GlassCard style={styles.accountSearch}>
        <View style={styles.accountSearchHeader}><View style={[styles.accountSearchIcon, { backgroundColor: `${colors.cyan}16` }]}><Ionicons name="search-circle" size={27} color={colors.cyan} /></View><View style={styles.copy}><Text style={[styles.formTitle, { color: colors.text }]}>Plaka ile müşteri hesabını bul</Text><Text style={[styles.meta, { color: colors.textMuted }]}>Müşteri kayıt olurken yazdığı plakayı gir. Hesap bulunursa mevcut işletme kaydıyla eşleştir veya kayıt yoksa müşteri ve motor kaydını otomatik oluştur.</Text></View></View>
        <FormField label="Müşteri Plakası" value={accountPlate} onChangeText={(value) => setAccountPlate(value.toUpperCase())} placeholder="06 ABC 123" autoCapitalize="characters" />
        <PrimaryButton title="Müşteri Hesabını Ara" onPress={findRegisteredAccount} loading={accountLoading} secondary />
        {accountMatches.map((match) => <View key={match.user_id} style={[styles.accountMatch, { backgroundColor: colors.surfaceSoft, borderColor: match.already_linked ? `${colors.green}45` : colors.border }]}><View style={styles.copy}><Text style={[styles.claimTitle, { color: colors.text }]}>{match.full_name}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{match.registered_brand} {match.registered_model} • {match.registered_plate}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{match.workshop_customer_name ? `İşletme kaydı: ${match.workshop_customer_name}` : 'İşletme kaydı eşleştirme sırasında oluşturulacak'}</Text></View>{match.already_linked ? <Text style={[styles.claimStatus, { color: colors.green }]}>BAĞLI</Text> : <AnimatedPressable onPress={() => linkRegisteredAccount(match)} style={[styles.linkAccountButton, { backgroundColor: `${colors.green}12`, borderColor: `${colors.green}45` }]}><Text style={[styles.actionText, { color: colors.green }]}>Eşleştir</Text></AnimatedPressable>}</View>)}
      </GlassCard>
      {claims.length === 0 ? <GlassCard style={styles.empty}><Ionicons name="shield-checkmark-outline" size={40} color={colors.textMuted} /><Text style={[styles.emptyTitle, { color: colors.text }]}>Eşleşme talebi yok</Text></GlassCard> : claims.map((claim) => { const accent = claim.status === 'approved' ? colors.green : claim.status === 'pending' ? colors.orange : colors.red; return <GlassCard key={claim.id} style={styles.claim}><View style={styles.claimTop}><Ionicons name={claim.status === 'approved' ? 'checkmark-circle' : claim.status === 'pending' ? 'time' : 'close-circle'} size={26} color={accent} /><View style={styles.copy}><Text style={[styles.claimTitle, { color: colors.text }]}>{claim.claimant_name}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{claim.brand} {claim.model} • {claim.plate}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>İşletme kaydı: {claim.customer_name} • {shortDate(claim.created_at)}</Text></View><Text style={[styles.claimStatus, { color: accent }]}>{claim.status === 'pending' ? 'BEKLİYOR' : claim.status === 'approved' ? 'ONAYLI' : 'RED'}</Text></View>{claim.status === 'pending' && <View style={styles.claimActions}><Action label="Reddet" accent={colors.red} onPress={() => review(claim, false)} /><Action label="Motorla Eşleştir" accent={colors.green} onPress={() => review(claim, true)} /></View>}</GlassCard>; })}</>}
  </ScrollView>;
}

function TabButton({ active, label, icon, badge, onPress }: { active: boolean; label: string; icon: keyof typeof Ionicons.glyphMap; badge?: number; onPress: () => void }) { const { colors } = useTheme(); return <AnimatedPressable onPress={onPress} style={[styles.tab, active && { backgroundColor: colors.cardStrong, borderColor: `${colors.primary}60` }]}><Ionicons name={icon} size={18} color={active ? colors.primary : colors.textMuted} /><Text style={[styles.tabText, { color: active ? colors.text : colors.textMuted }]}>{label}</Text>{Boolean(badge) && <View style={[styles.badge, { backgroundColor: colors.red }]}><Text style={styles.badgeText}>{badge}</Text></View>}</AnimatedPressable>; }
function Action({ label, accent, onPress }: { label: string; accent: string; onPress: () => void }) { return <AnimatedPressable onPress={onPress} style={[styles.action, { borderColor: `${accent}40`, backgroundColor: `${accent}0D` }]}><Text style={[styles.actionText, { color: accent }]}>{label}</Text></AnimatedPressable>; }

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 56, paddingBottom: 120, gap: 14 }, accountSearch: { gap: 12 }, accountSearchHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 }, accountSearchIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, accountMatch: { minHeight: 76, borderWidth: 1, borderRadius: 16, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 9 }, linkAccountButton: { minHeight: 40, paddingHorizontal: 13, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, tabs: { flexDirection: 'row', gap: 5, padding: 5, borderWidth: 1, borderRadius: 18 }, tab: { flex: 1, minHeight: 47, borderWidth: 1, borderColor: 'transparent', borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, tabText: { fontSize: 12, fontWeight: '900' }, badge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, badgeText: { color: '#fff', fontSize: 11, fontWeight: '900' }, search: { minHeight: 54, borderWidth: 1, borderRadius: 18, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, gap: 10 }, searchInput: { flex: 1 }, form: { gap: 12 }, formTitle: { fontSize: 18, fontWeight: '900' }, customerCard: { padding: 14 }, customerTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, avatar: { width: 47, height: 47, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, avatarText: { fontSize: 19, fontWeight: '900' }, copy: { flex: 1, minWidth: 0 }, customerName: { fontSize: 15, fontWeight: '900' }, meta: { fontSize: 12, lineHeight: 14, marginTop: 3 }, debt: { fontSize: 12.5, fontWeight: '900' }, expanded: { borderTopWidth: 1, marginTop: 13, paddingTop: 12, gap: 9 }, bike: { borderWidth: 1, borderRadius: 18, padding: 11, gap: 9 }, bikeTop: { flexDirection: 'row', alignItems: 'center', gap: 9 }, bikeTitle: { fontSize: 13, fontWeight: '900' }, accessButton: { minHeight: 41, borderWidth: 1, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, accessText: { fontSize: 12, fontWeight: '900' }, accessPanel: { borderWidth: 1, borderRadius: 17, padding: 12, alignItems: 'center', gap: 8 }, qr: { backgroundColor: '#fff', padding: 9, borderRadius: 14 }, codeLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1 }, code: { fontSize: 25, fontWeight: '900', letterSpacing: 3 }, addBike: { minHeight: 43, borderWidth: 1, borderStyle: 'dashed', borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, addBikeText: { fontSize: 12.5, fontWeight: '900' }, twoCol: { flexDirection: 'row', gap: 8 }, flex: { flex: 1 }, empty: { alignItems: 'center', gap: 8, paddingVertical: 28 }, emptyTitle: { fontSize: 16, fontWeight: '900' }, claim: { gap: 11 }, claimTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, claimTitle: { fontSize: 14, fontWeight: '900' }, claimStatus: { fontSize: 10, fontWeight: '900' }, claimActions: { flexDirection: 'row', gap: 8 }, action: { flex: 1, minHeight: 43, borderWidth: 1, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, actionText: { fontSize: 12, fontWeight: '900' },
});
