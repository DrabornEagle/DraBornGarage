import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { FormField } from '../components/FormField';
import { GarageIcon3D } from '../components/GarageIcon3D';
import { GarageReveal } from '../components/GarageMotion';
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
  const openBalance = workOrders.reduce((sum, item) => sum + Math.max(0, Number(item.total_amount) - Number(item.amount_received)), 0);
  const activeServiceCount = workOrders.filter((item) => !['ready', 'completed', 'delivered', 'cancelled'].includes(item.status)).length;

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
        title="Müşteri Garajı"
        subtitle="Müşterileri, motorları, servis geçmişini ve hesap bağlantılarını tek ekrandan yönet."
        actionIcon={tab === 'customers' ? (showNew ? 'close' : 'person-add') : undefined}
        onAction={tab === 'customers' ? () => setShowNew((value) => !value) : undefined}
      />

      <GarageReveal delay={30}>
        <GlassCard style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View style={styles.summaryCopy}>
              <Text style={[styles.summaryEyebrow, { color: colors.cyan }]}>MÜŞTERİ KONTROL MERKEZİ</Text>
              <Text style={[styles.summaryTitle, { color: colors.text }]}>{customers.length} müşteri • {motorcycles.length} motor</Text>
              <Text style={[styles.summarySubtitle, { color: colors.textMuted }]}>Aktif servisleri, açık bakiyeleri ve eşleşme taleplerini izle.</Text>
            </View>
            <GarageIcon3D name="account-group" size={67} iconSize={31} accent={colors.cyan} accent2={colors.primary} animated />
          </View>
          <View style={styles.metricRow}>
            <SummaryMetric label="AKTİF SERVİS" value={String(activeServiceCount)} icon="wrench-clock" accent={colors.orange} />
            <SummaryMetric label="BEKLEYEN ONAY" value={String(pendingClaims.length)} icon="shield-account" accent={colors.primary2} />
            <SummaryMetric label="AÇIK BAKİYE" value={money(openBalance)} icon="wallet-outline" accent={colors.red} compact />
          </View>
        </GlassCard>
      </GarageReveal>

      <GarageReveal delay={60}>
        <View style={[styles.tabs, { backgroundColor: colors.cardStrong, borderColor: colors.border }]}> 
          <AnimatedPressable onPress={() => setTab('customers')} style={[styles.tabButton, tab === 'customers' && { backgroundColor: `${colors.cyan}13`, borderColor: `${colors.cyan}55` }]}><MaterialCommunityIcons name="account-group" size={19} color={tab === 'customers' ? colors.cyan : colors.textMuted} /><Text style={[styles.tabText, { color: tab === 'customers' ? colors.text : colors.textMuted }]}>Müşteriler</Text></AnimatedPressable>
          <AnimatedPressable onPress={() => setTab('claims')} style={[styles.tabButton, tab === 'claims' && { backgroundColor: `${colors.orange}13`, borderColor: `${colors.orange}55` }]}><MaterialCommunityIcons name="shield-account" size={19} color={tab === 'claims' ? colors.orange : colors.textMuted} /><Text style={[styles.tabText, { color: tab === 'claims' ? colors.text : colors.textMuted }]}>Eşleşme Talepleri</Text>{pendingClaims.length > 0 && <View style={[styles.badge, { backgroundColor: colors.red }]}><Text style={styles.badgeText}>{pendingClaims.length}</Text></View>}</AnimatedPressable>
        </View>
      </GarageReveal>

      {tab === 'customers' ? (
        <>
          <GarageReveal delay={80}>
            <View style={[styles.search, { backgroundColor: colors.cardStrong, borderColor: colors.border }]}> 
              <View style={[styles.searchIcon, { backgroundColor: `${colors.primary}14` }]}><Ionicons name="search" size={19} color={colors.primary} /></View>
              <TextInput value={query} onChangeText={setQuery} placeholder="Ad, telefon, marka veya plaka ara" placeholderTextColor={colors.textMuted} style={[styles.searchInput, { color: colors.text }]} />
              {!!query && <AnimatedPressable onPress={() => setQuery('')}><Ionicons name="close-circle" size={20} color={colors.textMuted} /></AnimatedPressable>}
            </View>
          </GarageReveal>

          {showNew && (
            <GarageReveal delay={70}>
              <GlassCard style={styles.form}>
                <View style={styles.formHeader}><GarageIcon3D name="account-plus" size={53} iconSize={24} accent={colors.green} accent2={colors.cyan} /><View style={styles.summaryCopy}><Text style={[styles.formTitle, { color: colors.text }]}>Yeni müşteri kaydı</Text><Text style={[styles.formSubtitle, { color: colors.textMuted }]}>Müşteriyi kaydet, ardından motosikletini ekle.</Text></View></View>
                <FormField label="Ad Soyad" value={name} onChangeText={setName} placeholder="Müşteri adı" />
                <FormField label="Telefon" value={phone} onChangeText={setPhone} placeholder="05xx xxx xx xx" keyboardType="phone-pad" />
                <FormField label="Not" value={note} onChangeText={setNote} placeholder="Özel müşteri notu" multiline />
                <PrimaryButton title="Müşteriyi Kaydet" onPress={addCustomer} loading={saving} />
              </GlassCard>
            </GarageReveal>
          )}

          <View style={styles.list}>
            {visible.length === 0 ? (
              <GlassCard style={styles.empty}><MaterialCommunityIcons name="account-search-outline" size={38} color={colors.textMuted} /><Text style={[styles.emptyTitle, { color: colors.text }]}>Müşteri bulunamadı</Text><Text style={[styles.emptyText, { color: colors.textMuted }]}>Arama filtresini temizle veya yeni müşteri ekle.</Text></GlassCard>
            ) : visible.map((customer, index) => {
              const bikes = motorcycles.filter((bike) => bike.customer_id === customer.id);
              const customerOrders = workOrders.filter((order) => order.customer_id === customer.id);
              const expanded = selected === customer.id;
              const outstanding = customerOrders.reduce((sum, item) => sum + Math.max(0, Number(item.total_amount) - Number(item.amount_received)), 0);
              const activeCount = customerOrders.filter((item) => !['ready', 'completed', 'delivered', 'cancelled'].includes(item.status)).length;
              const accent = outstanding > 0 ? colors.orange : activeCount > 0 ? colors.cyan : colors.green;
              return (
                <GarageReveal key={customer.id} delay={100 + Math.min(index, 7) * 35}>
                  <GlassCard style={styles.customerCard}>
                    <AnimatedPressable onPress={() => { setSelected(expanded ? null : customer.id); setShowBike(false); setAccessBikeId(null); setAccess(null); }} style={styles.customerTop}>
                      <View style={styles.avatarStage}><View style={[styles.avatarDepth, { backgroundColor: `${accent}28` }]} /><View style={[styles.avatar, { backgroundColor: `${accent}14`, borderColor: `${accent}42` }]}><Text style={[styles.avatarText, { color: accent }]}>{customer.full_name.charAt(0).toUpperCase()}</Text></View></View>
                      <View style={styles.customerCopy}><Text style={[styles.customerName, { color: colors.text }]}>{customer.full_name}</Text><Text style={[styles.customerMeta, { color: colors.textMuted }]}>{customer.phone || 'Telefon yok'}</Text><View style={styles.tagRow}><MiniTag text={`${bikes.length} motor`} icon="motorbike" accent={colors.cyan} /><MiniTag text={`${customerOrders.length} servis`} icon="wrench" accent={colors.primary2} />{activeCount > 0 && <MiniTag text={`${activeCount} aktif`} icon="progress-wrench" accent={colors.orange} />}</View></View>
                      <View style={styles.customerRight}>{outstanding > 0 ? <><Text style={[styles.debtLabel, { color: colors.textMuted }]}>AÇIK BAKİYE</Text><Text style={[styles.debt, { color: colors.orange }]}>{money(outstanding)}</Text></> : <View style={[styles.cleanBadge, { backgroundColor: `${colors.green}12`, borderColor: `${colors.green}30` }]}><Ionicons name="checkmark-circle" size={15} color={colors.green} /><Text style={[styles.cleanText, { color: colors.green }]}>Temiz</Text></View>}<Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={accent} /></View>
                    </AnimatedPressable>

                    {expanded && (
                      <View style={[styles.expanded, { borderTopColor: colors.border }]}> 
                        <View style={styles.expandedHeader}><Text style={[styles.expandedTitle, { color: colors.text }]}>Müşteri Garajı</Text><Text style={[styles.expandedSub, { color: colors.textMuted }]}>{bikes.length} kayıtlı motosiklet</Text></View>
                        {bikes.length === 0 ? <Text style={[styles.noBike, { color: colors.textMuted }]}>Bu müşteriye ait motosiklet kaydı yok.</Text> : bikes.map((bike) => {
                          const bikeOrders = customerOrders.filter((order) => order.motorcycle_id === bike.id);
                          const latest = bikeOrders[0];
                          return (
                            <View key={bike.id} style={[styles.bikeBlock, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}> 
                              <View style={styles.bikeRow}>
                                <GarageIcon3D name="motorbike" size={55} iconSize={26} accent={colors.primary2} accent2={colors.cyan} />
                                <View style={styles.customerCopy}><Text style={[styles.bikeTitle, { color: colors.text }]}>{bike.brand} {bike.model}</Text><Text style={[styles.plate, { color: colors.cyan }]}>{bike.plate || 'PLAKA YOK'}</Text><Text style={[styles.customerMeta, { color: colors.textMuted }]}>{bike.odometer ? `${bike.odometer.toLocaleString('tr-TR')} km • ` : ''}{bikeOrders.length} servis kaydı</Text>{latest && <Text style={[styles.lastService, { color: colors.textMuted }]} numberOfLines={1}>Son: {latest.complaint} • {shortDate(latest.arrived_at)}</Text>}</View>
                                {latest && <StatusPill status={latest.status} />}
                              </View>
                              <AnimatedPressable onPress={() => openAccess(bike.id)} style={[styles.accessButton, { borderColor: `${colors.cyan}3C`, backgroundColor: `${colors.cyan}0C` }]}><MaterialCommunityIcons name="qrcode-scan" size={18} color={colors.cyan} /><Text style={[styles.accessButtonText, { color: colors.cyan }]}>{accessBikeId === bike.id ? 'Erişim Kartını Kapat' : 'Takip Kodu ve QR Oluştur'}</Text><Ionicons name="chevron-forward" size={17} color={colors.cyan} /></AnimatedPressable>
                              {accessBikeId === bike.id && access && (
                                <GarageReveal>
                                  <View style={[styles.accessPanel, { backgroundColor: colors.cardStrong, borderColor: colors.border }]}> 
                                    <View style={styles.qrWrap}><QRCode value={access.qr_payload} size={136} backgroundColor="#FFFFFF" color="#111827" /></View>
                                    <View style={styles.accessCopy}><Text style={[styles.accessLabel, { color: colors.textMuted }]}>SERVİS TAKİP KODU</Text><Text style={[styles.accessCode, { color: colors.text }]}>{access.tracking_code}</Text><Text style={[styles.accessHint, { color: colors.textMuted }]}>Müşteri kodu girebilir veya QR bağlantısını tarayabilir.</Text><PrimaryButton title="Kodu ve Bağlantıyı Paylaş" onPress={() => shareAccess(bike)} secondary /></View>
                                  </View>
                                </GarageReveal>
                              )}
                            </View>
                          );
                        })}
                        <AnimatedPressable onPress={() => setShowBike((value) => !value)} style={[styles.addBikeButton, { borderColor: `${colors.primary}3B`, backgroundColor: `${colors.primary}0B` }]}><MaterialCommunityIcons name={showBike ? 'close' : 'motorbike'} size={20} color={colors.primary} /><Text style={[styles.addBikeText, { color: colors.primary }]}>{showBike ? 'Motor formunu kapat' : 'Motosiklet ekle'}</Text></AnimatedPressable>
                        {showBike && (
                          <GarageReveal>
                            <View style={styles.bikeForm}>
                              <View style={styles.twoCol}><View style={styles.col}><FormField label="Marka" value={brand} onChangeText={setBrand} placeholder="Yamaha" /></View><View style={styles.col}><FormField label="Model" value={model} onChangeText={setModel} placeholder="NMAX" /></View></View>
                              <FormField label="Plaka" value={plate} onChangeText={(value) => setPlate(value.toUpperCase())} placeholder="06 ABC 123" />
                              <PrimaryButton title="Motosikleti Kaydet" onPress={addBike} loading={saving} secondary />
                            </View>
                          </GarageReveal>
                        )}
                      </View>
                    )}
                  </GlassCard>
                </GarageReveal>
              );
            })}
          </View>
        </>
      ) : (
        <View style={styles.list}>
          {claims.length === 0 ? (
            <GlassCard style={styles.empty}><MaterialCommunityIcons name="shield-check-outline" size={40} color={colors.textMuted} /><Text style={[styles.emptyTitle, { color: colors.text }]}>Eşleşme talebi yok</Text><Text style={[styles.emptyText, { color: colors.textMuted }]}>Müşteri plaka ile usta onayı istediğinde burada görünür.</Text></GlassCard>
          ) : claims.map((claim, index) => {
            const accent = claim.status === 'approved' ? colors.green : claim.status === 'pending' ? colors.orange : colors.red;
            return (
              <GarageReveal key={claim.id} delay={80 + Math.min(index, 7) * 35}>
                <GlassCard style={styles.claimCard}>
                  <View style={styles.claimTop}>
                    <GarageIcon3D name={claim.status === 'approved' ? 'shield-check' : claim.status === 'pending' ? 'shield-clock' : 'shield-remove'} size={56} iconSize={25} accent={accent} accent2={colors.primary2} />
                    <View style={styles.customerCopy}><Text style={[styles.claimTitle, { color: colors.text }]}>{claim.claimant_name}</Text><Text style={[styles.claimMeta, { color: colors.textMuted }]}>Hesap telefonu: {claim.claimant_phone || 'Yok'} • {shortDate(claim.created_at)}</Text></View>
                    <Text style={[styles.claimStatus, { color: accent }]}>{claim.status === 'pending' ? 'BEKLİYOR' : claim.status === 'approved' ? 'ONAYLI' : 'REDDEDİLDİ'}</Text>
                  </View>
                  <View style={[styles.claimBike, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}><MaterialCommunityIcons name="motorbike" size={25} color={colors.primary2} /><View style={styles.customerCopy}><Text style={[styles.bikeTitle, { color: colors.text }]}>{claim.brand} {claim.model} • {claim.plate}</Text><Text style={[styles.customerMeta, { color: colors.textMuted }]}>İşletme kaydı: {claim.customer_name} • {claimMethodLabel[claim.method]}</Text>{claim.submitted_phone && <Text style={[styles.customerMeta, { color: colors.textMuted }]}>Gönderilen telefon: {claim.submitted_phone}</Text>}</View></View>
                  {claim.status === 'pending' && <View style={styles.claimActions}><AnimatedPressable onPress={() => reviewClaim(claim, false)} style={[styles.rejectButton, { borderColor: `${colors.red}42`, backgroundColor: `${colors.red}0D` }]}><Ionicons name="close" size={18} color={colors.red} /><Text style={[styles.rejectText, { color: colors.red }]}>Reddet</Text></AnimatedPressable><AnimatedPressable onPress={() => reviewClaim(claim, true)} style={[styles.approveButton, { backgroundColor: colors.green }]}><Ionicons name="checkmark" size={18} color="#fff" /><Text style={styles.approveText}>Motorla Eşleştir</Text></AnimatedPressable></View>}
                </GlassCard>
              </GarageReveal>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

function SummaryMetric({ label, value, icon, accent, compact = false }: { label: string; value: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; accent: string; compact?: boolean }) {
  const { colors } = useTheme();
  return <View style={[styles.metric, { backgroundColor: `${accent}0D`, borderColor: `${accent}2C` }]}><MaterialCommunityIcons name={icon} size={19} color={accent} /><Text numberOfLines={1} style={[compact ? styles.metricValueCompact : styles.metricValue, { color: colors.text }]}>{value}</Text><Text style={[styles.metricLabel, { color: colors.textMuted }]}>{label}</Text></View>;
}

function MiniTag({ text, icon, accent }: { text: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; accent: string }) {
  return <View style={[styles.miniTag, { backgroundColor: `${accent}0D`, borderColor: `${accent}28` }]}><MaterialCommunityIcons name={icon} size={12} color={accent} /><Text style={[styles.miniTagText, { color: accent }]}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 17, paddingTop: 54, paddingBottom: 118, gap: 15 },
  summaryCard: { gap: 14 },
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryCopy: { flex: 1, minWidth: 0 },
  summaryEyebrow: { fontSize: 8.5, fontWeight: '900', letterSpacing: 1 },
  summaryTitle: { fontSize: 21, fontWeight: '900', marginTop: 5 },
  summarySubtitle: { fontSize: 10.5, lineHeight: 16, marginTop: 5 },
  metricRow: { flexDirection: 'row', gap: 7 },
  metric: { flex: 1, minHeight: 78, borderRadius: 16, borderWidth: 1, padding: 9, justifyContent: 'center' },
  metricValue: { fontSize: 19, fontWeight: '900', marginTop: 4 },
  metricValueCompact: { fontSize: 12.5, fontWeight: '900', marginTop: 5 },
  metricLabel: { fontSize: 6.8, fontWeight: '900', letterSpacing: 0.45, marginTop: 3 },
  tabs: { flexDirection: 'row', gap: 6, padding: 5, borderRadius: 19, borderWidth: 1 },
  tabButton: { flex: 1, minHeight: 51, borderRadius: 15, borderWidth: 1, borderColor: 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  tabText: { fontSize: 10.5, fontWeight: '900' },
  badge: { minWidth: 19, height: 19, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { color: '#fff', fontSize: 8.5, fontWeight: '900' },
  search: { minHeight: 57, borderWidth: 1, borderRadius: 18, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 9 },
  searchIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  searchInput: { flex: 1, fontSize: 13.5, fontWeight: '700' },
  form: { gap: 13 },
  formHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  formTitle: { fontSize: 17, fontWeight: '900' },
  formSubtitle: { fontSize: 9.5, lineHeight: 14, marginTop: 3 },
  list: { gap: 10 },
  customerCard: { padding: 13 },
  customerTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  avatarStage: { width: 50, height: 53 },
  avatarDepth: { position: 'absolute', width: 45, height: 45, borderRadius: 15, left: 4, top: 5 },
  avatar: { width: 45, height: 45, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '900' },
  customerCopy: { flex: 1, minWidth: 0 },
  customerName: { fontSize: 14.5, fontWeight: '900' },
  customerMeta: { fontSize: 9.5, marginTop: 3 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  miniTag: { minHeight: 22, borderRadius: 999, borderWidth: 1, paddingHorizontal: 6, flexDirection: 'row', alignItems: 'center', gap: 3 },
  miniTagText: { fontSize: 7.5, fontWeight: '900' },
  customerRight: { alignItems: 'flex-end', gap: 4 },
  debtLabel: { fontSize: 6.5, fontWeight: '900', letterSpacing: 0.5 },
  debt: { fontSize: 11.5, fontWeight: '900' },
  cleanBadge: { minHeight: 25, borderRadius: 999, borderWidth: 1, paddingHorizontal: 7, flexDirection: 'row', alignItems: 'center', gap: 3 },
  cleanText: { fontSize: 7.5, fontWeight: '900' },
  expanded: { borderTopWidth: 1, marginTop: 13, paddingTop: 12, gap: 10 },
  expandedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  expandedTitle: { fontSize: 14, fontWeight: '900' },
  expandedSub: { fontSize: 8.5, fontWeight: '800' },
  bikeBlock: { borderWidth: 1, borderRadius: 18, padding: 10, gap: 9 },
  bikeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bikeTitle: { fontSize: 12.5, fontWeight: '900' },
  plate: { fontSize: 9.5, fontWeight: '900', letterSpacing: 0.7, marginTop: 3 },
  lastService: { fontSize: 8.5, marginTop: 4 },
  noBike: { textAlign: 'center', paddingVertical: 9, fontSize: 11 },
  accessButton: { minHeight: 43, borderWidth: 1, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  accessButtonText: { fontSize: 9.5, fontWeight: '900' },
  accessPanel: { borderWidth: 1, borderRadius: 18, padding: 12, gap: 12, alignItems: 'center' },
  qrWrap: { padding: 9, borderRadius: 15, backgroundColor: '#fff' },
  accessCopy: { width: '100%', alignItems: 'center', gap: 6 },
  accessLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  accessCode: { fontSize: 25, fontWeight: '900', letterSpacing: 4 },
  accessHint: { fontSize: 9.5, lineHeight: 15, textAlign: 'center' },
  addBikeButton: { minHeight: 45, borderWidth: 1, borderStyle: 'dashed', borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  addBikeText: { fontSize: 10.5, fontWeight: '900' },
  bikeForm: { gap: 11 },
  twoCol: { flexDirection: 'row', gap: 9 },
  col: { flex: 1 },
  empty: { alignItems: 'center', gap: 9, paddingVertical: 25 },
  emptyTitle: { fontSize: 16, fontWeight: '900' },
  emptyText: { fontSize: 11.5, lineHeight: 18, textAlign: 'center' },
  claimCard: { gap: 11 },
  claimTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  claimTitle: { fontSize: 13.5, fontWeight: '900' },
  claimMeta: { fontSize: 9.5, marginTop: 4 },
  claimStatus: { fontSize: 7.5, fontWeight: '900', letterSpacing: 0.7 },
  claimBike: { minHeight: 68, borderRadius: 16, borderWidth: 1, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 9 },
  claimActions: { flexDirection: 'row', gap: 9 },
  rejectButton: { flex: 1, minHeight: 46, borderWidth: 1, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  rejectText: { fontSize: 10.5, fontWeight: '900' },
  approveButton: { flex: 1.4, minHeight: 46, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  approveText: { color: '#fff', fontSize: 10.5, fontWeight: '900' },
});
