import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { FormField } from '../components/FormField';
import { GlassCard } from '../components/GlassCard';
import { AnimatedEntrance, PremiumGlowCard, PulseDot } from '../components/PremiumMotion';
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
  const activeOrders = workOrders.filter((item) => !['ready', 'completed', 'delivered', 'cancelled'].includes(item.status));
  const totalOutstanding = workOrders.reduce((sum, item) => sum + Math.max(0, Number(item.total_amount) - Number(item.amount_received)), 0);

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

      <PremiumGlowCard accent={colors.cyan} accent2={colors.primary} delay={40} live>
        <View style={styles.overviewTop}>
          <View style={styles.copy}>
            <View style={styles.overviewLive}><PulseDot color={colors.cyan} size={6} /><Text style={[styles.overviewEyebrow, { color: colors.cyan }]}>CANLI MÜŞTERİ MERKEZİ</Text></View>
            <Text style={[styles.overviewTitle, { color: colors.text }]}>{customers.length} müşteri • {motorcycles.length} motor</Text>
            <Text style={[styles.overviewText, { color: colors.textMuted }]}>Aktif servisleri, borçları ve hesap eşleşmelerini tek yerden izle.</Text>
          </View>
          <LinearGradient colors={[colors.cyan, colors.primary]} style={styles.overviewIcon}><Ionicons name="people" size={28} color="#fff" /></LinearGradient>
        </View>
        <View style={styles.overviewMetrics}>
          <CustomerMetric label="AKTİF SERVİS" value={String(activeOrders.length)} icon="construct" accent={colors.orange} />
          <CustomerMetric label="BEKLEYEN ONAY" value={String(pendingClaims.length)} icon="shield-checkmark" accent={colors.primary2} />
          <CustomerMetric label="AÇIK BAKİYE" value={money(totalOutstanding)} icon="wallet" accent={totalOutstanding > 0 ? colors.red : colors.green} compact />
        </View>
      </PremiumGlowCard>

      <AnimatedEntrance delay={85}>
        <View style={[styles.tabs, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}> 
          <AnimatedPressable onPress={() => setTab('customers')} style={[styles.tabButton, { borderColor: tab === 'customers' ? `${colors.cyan}72` : 'transparent' }]}> 
            {tab === 'customers' && <LinearGradient colors={[`${colors.cyan}30`, `${colors.primary}20`]} style={StyleSheet.absoluteFill} />}
            <View style={[styles.tabIcon, { backgroundColor: `${colors.cyan}16` }]}><Ionicons name="people" size={19} color={tab === 'customers' ? colors.cyan : colors.textMuted} /></View>
            <View style={styles.tabCopy}><Text style={[styles.tabTitle, { color: tab === 'customers' ? colors.text : colors.textMuted }]}>Müşteriler</Text><Text style={[styles.tabHint, { color: tab === 'customers' ? colors.cyan : colors.textMuted }]}>{customers.length} kayıtlı kişi</Text></View>
            {tab === 'customers' && <Ionicons name="checkmark-circle" size={19} color={colors.cyan} />}
          </AnimatedPressable>
          <AnimatedPressable onPress={() => setTab('claims')} style={[styles.tabButton, { borderColor: tab === 'claims' ? `${colors.orange}72` : 'transparent' }]}> 
            {tab === 'claims' && <LinearGradient colors={[`${colors.orange}30`, `${colors.red}16`]} style={StyleSheet.absoluteFill} />}
            <View style={[styles.tabIcon, { backgroundColor: `${colors.orange}16` }]}><Ionicons name="shield-checkmark" size={19} color={tab === 'claims' ? colors.orange : colors.textMuted} /></View>
            <View style={styles.tabCopy}><Text style={[styles.tabTitle, { color: tab === 'claims' ? colors.text : colors.textMuted }]}>Eşleşmeler</Text><Text style={[styles.tabHint, { color: tab === 'claims' ? colors.orange : colors.textMuted }]}>{pendingClaims.length} onay bekliyor</Text></View>
            {pendingClaims.length > 0 && <View style={[styles.badge, { backgroundColor: colors.red }]}><Text style={styles.badgeText}>{pendingClaims.length}</Text></View>}
          </AnimatedPressable>
        </View>
      </AnimatedEntrance>

      {tab === 'customers' ? (
        <>
          <AnimatedEntrance delay={120}>
            <View style={[styles.search, { backgroundColor: colors.card, borderColor: query ? `${colors.cyan}65` : colors.border, shadowColor: colors.cyan }]}> 
              <View style={[styles.searchIcon, { backgroundColor: `${colors.cyan}15` }]}><Ionicons name="search" size={20} color={colors.cyan} /></View>
              <TextInput value={query} onChangeText={setQuery} placeholder="Ad, telefon, marka veya plaka ara" placeholderTextColor={colors.textMuted} style={[styles.searchInput, { color: colors.text }]} />
              {!!query && <AnimatedPressable onPress={() => setQuery('')} style={[styles.clearSearch, { backgroundColor: colors.surfaceSoft }]}><Ionicons name="close" size={17} color={colors.textMuted} /></AnimatedPressable>}
            </View>
          </AnimatedEntrance>

          {showNew && (
            <AnimatedEntrance delay={40}>
              <PremiumGlowCard accent={colors.primary} accent2={colors.cyan} live>
                <View style={styles.formHeader}><View style={[styles.formIcon, { backgroundColor: `${colors.primary}18` }]}><Ionicons name="person-add" size={23} color={colors.primary} /></View><View style={styles.copy}><Text style={[styles.formTitle, { color: colors.text }]}>Yeni müşteri oluştur</Text><Text style={[styles.formText, { color: colors.textMuted }]}>Telefon ve özel not daha sonra düzenlenebilir.</Text></View></View>
                <View style={styles.form}><FormField label="Ad Soyad" value={name} onChangeText={setName} placeholder="Müşteri adı" /><FormField label="Telefon" value={phone} onChangeText={setPhone} placeholder="05xx xxx xx xx" keyboardType="phone-pad" /><FormField label="Not" value={note} onChangeText={setNote} placeholder="Özel müşteri notu" multiline /><PrimaryButton title="Müşteriyi Kaydet" onPress={addCustomer} loading={saving} /></View>
              </PremiumGlowCard>
            </AnimatedEntrance>
          )}

          <View style={styles.list}>
            {visible.length === 0 ? (
              <PremiumGlowCard accent={colors.primary2} accent2={colors.cyan} delay={170}>
                <View style={styles.empty}><Ionicons name="people-outline" size={40} color={colors.textMuted} /><Text style={[styles.emptyTitle, { color: colors.text }]}>Müşteri bulunamadı</Text><Text style={[styles.emptyText, { color: colors.textMuted }]}>Arama filtresini temizle veya yeni müşteri ekle.</Text></View>
              </PremiumGlowCard>
            ) : visible.map((customer, index) => {
              const bikes = motorcycles.filter((bike) => bike.customer_id === customer.id);
              const customerOrders = workOrders.filter((order) => order.customer_id === customer.id);
              const expanded = selected === customer.id;
              const outstanding = customerOrders.reduce((sum, item) => sum + Math.max(0, Number(item.total_amount) - Number(item.amount_received)), 0);
              const latestOrder = customerOrders[0];
              const accent = outstanding > 0 ? colors.orange : latestOrder && !['delivered', 'cancelled'].includes(latestOrder.status) ? colors.cyan : colors.green;
              return (
                <AnimatedEntrance key={customer.id} delay={160 + Math.min(index, 8) * 45}>
                  <View style={[styles.customerCard, { backgroundColor: colors.card, borderColor: `${accent}45`, shadowColor: accent }]}> 
                    <LinearGradient colors={[accent, `${accent}18`]} style={styles.customerRail} />
                    <AnimatedPressable onPress={() => { setSelected(expanded ? null : customer.id); setShowBike(false); setAccessBikeId(null); setAccess(null); }} style={styles.customerTop}>
                      <LinearGradient colors={[`${accent}70`, `${colors.primary}70`]} style={styles.avatar}><Text style={styles.avatarText}>{customer.full_name.charAt(0).toUpperCase()}</Text></LinearGradient>
                      <View style={styles.customerCopy}>
                        <View style={styles.customerNameRow}><Text style={[styles.customerName, { color: colors.text }]}>{customer.full_name}</Text>{latestOrder && !['delivered', 'cancelled'].includes(latestOrder.status) && <PulseDot color={accent} size={5} />}</View>
                        <Text style={[styles.customerMeta, { color: colors.textMuted }]}>{customer.phone || 'Telefon yok'}</Text>
                        <View style={styles.customerChips}><InfoChip icon="bicycle" text={`${bikes.length} motor`} accent={colors.cyan} /><InfoChip icon="construct" text={`${customerOrders.length} servis`} accent={colors.primary2} /></View>
                      </View>
                      <View style={styles.customerRight}>
                        {outstanding > 0 ? <View style={[styles.debtPill, { backgroundColor: `${colors.orange}16`, borderColor: `${colors.orange}38` }]}><Text style={[styles.debtLabel, { color: colors.orange }]}>AÇIK</Text><Text style={[styles.debt, { color: colors.orange }]}>{money(outstanding)}</Text></View> : <View style={[styles.clearPill, { backgroundColor: `${colors.green}14` }]}><Ionicons name="checkmark-circle" size={16} color={colors.green} /><Text style={[styles.clearText, { color: colors.green }]}>Temiz</Text></View>}
                        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={21} color={accent} />
                      </View>
                    </AnimatedPressable>

                    {expanded && (
                      <AnimatedEntrance delay={0} distance={10}>
                        <View style={[styles.expanded, { borderTopColor: `${accent}35` }]}> 
                          <View style={styles.expandedHeader}><View><Text style={[styles.expandedTitle, { color: colors.text }]}>Müşteri Garajı</Text><Text style={[styles.expandedSubtitle, { color: colors.textMuted }]}>Motorlar, son servis ve erişim kodları.</Text></View>{latestOrder && <StatusPill status={latestOrder.status} />}</View>
                          {bikes.length === 0 ? <Text style={[styles.noBike, { color: colors.textMuted }]}>Bu müşteriye ait motosiklet kaydı yok.</Text> : bikes.map((bike) => {
                            const bikeOrders = customerOrders.filter((order) => order.motorcycle_id === bike.id);
                            const latest = bikeOrders[0];
                            return (
                              <View key={bike.id} style={[styles.bikeBlock, { backgroundColor: colors.surfaceSoft, borderColor: `${colors.cyan}30` }]}> 
                                <View style={styles.bikeRow}>
                                  <LinearGradient colors={[`${colors.cyan}32`, `${colors.primary2}25`]} style={styles.bikeIcon}><Ionicons name="bicycle" size={24} color={colors.cyan} /></LinearGradient>
                                  <View style={styles.customerCopy}><Text style={[styles.bikeTitle, { color: colors.text }]}>{bike.brand} {bike.model}</Text><Text style={[styles.customerMeta, { color: colors.textMuted }]}>{bike.plate || 'Plaka yok'}{bike.odometer ? ` • ${bike.odometer.toLocaleString('tr-TR')} km` : ''} • {bikeOrders.length} servis</Text>{latest && <Text style={[styles.lastService, { color: colors.textMuted }]}>Son işlem: {latest.complaint} • {shortDate(latest.arrived_at)}</Text>}</View>
                                  {latest && <StatusPill status={latest.status} />}
                                </View>
                                <AnimatedPressable onPress={() => openAccess(bike.id)} style={[styles.accessButton, { borderColor: `${colors.cyan}48`, backgroundColor: `${colors.cyan}0E` }]}><Ionicons name="qr-code" size={19} color={colors.cyan} /><Text style={[styles.accessButtonText, { color: colors.cyan }]}>{accessBikeId === bike.id ? 'Erişim Kartını Kapat' : 'Takip Kodu ve QR Oluştur'}</Text><Ionicons name={accessBikeId === bike.id ? 'chevron-up' : 'chevron-forward'} size={17} color={colors.cyan} /></AnimatedPressable>
                                {accessBikeId === bike.id && access && (
                                  <AnimatedEntrance delay={0} distance={8}>
                                    <PremiumGlowCard accent={colors.cyan} accent2={colors.primary} live>
                                      <View style={styles.accessPanel}> 
                                        <View style={styles.qrWrap}><QRCode value={access.qr_payload} size={142} backgroundColor="#FFFFFF" color="#111827" /></View>
                                        <View style={styles.accessCopy}><Text style={[styles.accessLabel, { color: colors.cyan }]}>SERVİS TAKİP KODU</Text><Text style={[styles.accessCode, { color: colors.text }]}>{access.tracking_code}</Text><Text style={[styles.accessHint, { color: colors.textMuted }]}>Müşteri kodu girebilir veya QR bağlantısını kamerayla tarayabilir.</Text><PrimaryButton title="Kodu ve QR Bağlantısını Paylaş" onPress={() => shareAccess(bike)} secondary /></View>
                                      </View>
                                    </PremiumGlowCard>
                                  </AnimatedEntrance>
                                )}
                              </View>
                            );
                          })}
                          <AnimatedPressable onPress={() => setShowBike((value) => !value)} style={[styles.addBikeButton, { borderColor: `${colors.primary}45`, backgroundColor: `${colors.primary}0D` }]}><Ionicons name={showBike ? 'close' : 'add-circle-outline'} size={20} color={colors.primary} /><Text style={[styles.addBikeText, { color: colors.primary }]}>{showBike ? 'Formu kapat' : 'Motosiklet ekle'}</Text></AnimatedPressable>
                          {showBike && (
                            <AnimatedEntrance delay={0} distance={8} style={styles.bikeForm}>
                              <View style={styles.twoCol}><View style={styles.col}><FormField label="Marka" value={brand} onChangeText={setBrand} placeholder="Yamaha" /></View><View style={styles.col}><FormField label="Model" value={model} onChangeText={setModel} placeholder="NMAX" /></View></View>
                              <FormField label="Plaka" value={plate} onChangeText={(value) => setPlate(value.toUpperCase())} placeholder="06 ABC 123" />
                              <PrimaryButton title="Motosikleti Kaydet" onPress={addBike} loading={saving} secondary />
                            </AnimatedEntrance>
                          )}
                        </View>
                      </AnimatedEntrance>
                    )}
                  </View>
                </AnimatedEntrance>
              );
            })}
          </View>
        </>
      ) : (
        <View style={styles.list}>
          {claims.length === 0 ? (
            <PremiumGlowCard accent={colors.green} accent2={colors.cyan} delay={140}>
              <View style={styles.empty}><Ionicons name="shield-checkmark-outline" size={42} color={colors.green} /><Text style={[styles.emptyTitle, { color: colors.text }]}>Eşleşme talebi yok</Text><Text style={[styles.emptyText, { color: colors.textMuted }]}>Müşteri usta onayı istediğinde burada görünür.</Text></View>
            </PremiumGlowCard>
          ) : claims.map((claim, index) => {
            const accent = claim.status === 'approved' ? colors.green : claim.status === 'pending' ? colors.orange : colors.red;
            return (
              <AnimatedEntrance key={claim.id} delay={140 + Math.min(index, 8) * 50}>
                <View style={[styles.claimCard, { backgroundColor: colors.card, borderColor: `${accent}48`, shadowColor: accent }]}> 
                  <LinearGradient colors={[accent, `${accent}18`]} style={styles.claimRail} />
                  <View style={styles.claimTop}>
                    <View style={[styles.claimIcon, { backgroundColor: `${accent}18` }]}><Ionicons name={claim.status === 'approved' ? 'checkmark-circle' : claim.status === 'pending' ? 'time' : 'close-circle'} size={25} color={accent} /></View>
                    <View style={styles.customerCopy}><Text style={[styles.claimTitle, { color: colors.text }]}>{claim.claimant_name}</Text><Text style={[styles.claimMeta, { color: colors.textMuted }]}>Hesap telefonu: {claim.claimant_phone || 'Yok'} • {shortDate(claim.created_at)}</Text></View>
                    <View style={[styles.claimStatusPill, { backgroundColor: `${accent}14`, borderColor: `${accent}38` }]}>{claim.status === 'pending' && <PulseDot color={accent} size={5} />}<Text style={[styles.claimStatus, { color: accent }]}>{claim.status === 'pending' ? 'BEKLİYOR' : claim.status === 'approved' ? 'ONAYLI' : 'REDDEDİLDİ'}</Text></View>
                  </View>
                  <LinearGradient colors={[`${colors.primary2}13`, `${colors.cyan}0B`]} style={[styles.claimBike, { borderColor: `${colors.primary2}30` }]}><Ionicons name="bicycle" size={24} color={colors.primary2} /><View style={styles.customerCopy}><Text style={[styles.bikeTitle, { color: colors.text }]}>{claim.brand} {claim.model} • {claim.plate}</Text><Text style={[styles.customerMeta, { color: colors.textMuted }]}>İşletme kaydı: {claim.customer_name}</Text><Text style={[styles.claimMethod, { color: colors.cyan }]}>{claimMethodLabel[claim.method]}</Text>{claim.submitted_phone && <Text style={[styles.customerMeta, { color: colors.textMuted }]}>Gönderilen telefon: {claim.submitted_phone}</Text>}</View></LinearGradient>
                  {claim.status === 'pending' && <View style={styles.claimActions}><AnimatedPressable onPress={() => reviewClaim(claim, false)} style={[styles.rejectButton, { borderColor: `${colors.red}45`, backgroundColor: `${colors.red}0E` }]}><Ionicons name="close" size={19} color={colors.red} /><Text style={[styles.rejectText, { color: colors.red }]}>Reddet</Text></AnimatedPressable><AnimatedPressable onPress={() => reviewClaim(claim, true)} style={styles.approveButton}><LinearGradient colors={[colors.green, colors.cyan]} style={StyleSheet.absoluteFill} /><Ionicons name="checkmark" size={19} color="#fff" /><Text style={styles.approveText}>Motorla Eşleştir</Text></AnimatedPressable></View>}
                </View>
              </AnimatedEntrance>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

function CustomerMetric({ label, value, icon, accent, compact = false }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap; accent: string; compact?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.metric, { backgroundColor: `${accent}0F`, borderColor: `${accent}2F` }]}>
      <Ionicons name={icon} size={17} color={accent} />
      <Text numberOfLines={1} style={[compact ? styles.metricValueCompact : styles.metricValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

function InfoChip({ icon, text, accent }: { icon: keyof typeof Ionicons.glyphMap; text: string; accent: string }) {
  return <View style={[styles.infoChip, { backgroundColor: `${accent}11`, borderColor: `${accent}2E` }]}><Ionicons name={icon} size={12} color={accent} /><Text style={[styles.infoChipText, { color: accent }]}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 56, paddingBottom: 120, gap: 16 },
  copy: { flex: 1, minWidth: 0 },
  overviewTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  overviewLive: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  overviewEyebrow: { fontSize: 9.5, fontWeight: '900', letterSpacing: 1 },
  overviewTitle: { fontSize: 22, fontWeight: '900', marginTop: 7 },
  overviewText: { fontSize: 11, lineHeight: 17, marginTop: 5 },
  overviewIcon: { width: 56, height: 56, borderRadius: 19, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.24, shadowRadius: 10, elevation: 7 },
  overviewMetrics: { flexDirection: 'row', gap: 7, marginTop: 15 },
  metric: { flex: 1, minHeight: 72, borderWidth: 1, borderRadius: 16, padding: 8, justifyContent: 'center' },
  metricValue: { fontSize: 18, fontWeight: '900', marginTop: 4 },
  metricValueCompact: { fontSize: 12.5, fontWeight: '900', marginTop: 5 },
  metricLabel: { fontSize: 7, fontWeight: '900', letterSpacing: 0.5, marginTop: 3 },
  tabs: { flexDirection: 'row', gap: 7, padding: 5, borderRadius: 20, borderWidth: 1 },
  tabButton: { flex: 1, minHeight: 68, borderRadius: 16, borderWidth: 1, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 9 },
  tabIcon: { width: 37, height: 37, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  tabCopy: { flex: 1, minWidth: 0 },
  tabTitle: { fontSize: 11, fontWeight: '900' },
  tabHint: { fontSize: 8.5, fontWeight: '800', marginTop: 3 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  search: { minHeight: 60, borderWidth: 1, borderRadius: 20, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 10, shadowOpacity: 0.12, shadowRadius: 12, elevation: 4 },
  searchIcon: { width: 39, height: 39, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  searchInput: { flex: 1, fontSize: 14, fontWeight: '700' },
  clearSearch: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  formHeader: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 13 },
  formIcon: { width: 47, height: 47, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  form: { gap: 13 },
  formTitle: { fontSize: 17, fontWeight: '900' },
  formText: { fontSize: 10.5, lineHeight: 16, marginTop: 4 },
  list: { gap: 12 },
  customerCard: { borderWidth: 1, borderRadius: 24, padding: 14, overflow: 'hidden', shadowOpacity: 0.14, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  customerRail: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  customerTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  avatar: { width: 53, height: 53, borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 7, elevation: 5 },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '900' },
  customerCopy: { flex: 1, minWidth: 0 },
  customerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  customerName: { fontSize: 16, fontWeight: '900' },
  customerMeta: { fontSize: 10.5, marginTop: 4 },
  customerChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 7 },
  infoChip: { minHeight: 25, borderWidth: 1, borderRadius: 999, paddingHorizontal: 7, flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoChipText: { fontSize: 8.5, fontWeight: '900' },
  customerRight: { alignItems: 'flex-end', gap: 9 },
  debtPill: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 6, alignItems: 'flex-end' },
  debtLabel: { fontSize: 7, fontWeight: '900', letterSpacing: 0.7 },
  debt: { fontSize: 11.5, fontWeight: '900', marginTop: 2 },
  clearPill: { minHeight: 31, borderRadius: 11, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  clearText: { fontSize: 9, fontWeight: '900' },
  expanded: { borderTopWidth: 1, marginTop: 15, paddingTop: 14, gap: 11 },
  expandedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  expandedTitle: { fontSize: 15, fontWeight: '900' },
  expandedSubtitle: { fontSize: 9.5, marginTop: 3 },
  bikeBlock: { borderWidth: 1, borderRadius: 19, padding: 11, gap: 10 },
  bikeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bikeIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  bikeTitle: { fontSize: 13, fontWeight: '900' },
  lastService: { fontSize: 9, marginTop: 4 },
  noBike: { textAlign: 'center', paddingVertical: 10, fontSize: 12 },
  accessButton: { minHeight: 45, borderWidth: 1, borderRadius: 14, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  accessButtonText: { flex: 1, fontSize: 10, fontWeight: '900', textAlign: 'center' },
  accessPanel: { gap: 13, alignItems: 'center' },
  qrWrap: { padding: 10, borderRadius: 16, backgroundColor: '#fff' },
  accessCopy: { width: '100%', alignItems: 'center', gap: 7 },
  accessLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  accessCode: { fontSize: 27, fontWeight: '900', letterSpacing: 4 },
  accessHint: { fontSize: 10.5, lineHeight: 16, textAlign: 'center' },
  addBikeButton: { minHeight: 46, borderWidth: 1, borderStyle: 'dashed', borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  addBikeText: { fontSize: 12, fontWeight: '900' },
  bikeForm: { gap: 11 },
  twoCol: { flexDirection: 'row', gap: 9 },
  col: { flex: 1 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 14 },
  emptyTitle: { fontSize: 17, fontWeight: '900' },
  emptyText: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
  claimCard: { borderWidth: 1, borderRadius: 24, padding: 15, gap: 12, overflow: 'hidden', shadowOpacity: 0.14, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  claimRail: { position: 'absolute', left: 0, top: 0, right: 0, height: 3 },
  claimTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  claimIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  claimTitle: { fontSize: 14, fontWeight: '900' },
  claimMeta: { fontSize: 10, marginTop: 4 },
  claimStatusPill: { minHeight: 31, borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 2 },
  claimStatus: { fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },
  claimBike: { minHeight: 78, borderRadius: 17, borderWidth: 1, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10 },
  claimMethod: { fontSize: 9, fontWeight: '900', marginTop: 4 },
  claimActions: { flexDirection: 'row', gap: 9 },
  rejectButton: { flex: 1, minHeight: 48, borderWidth: 1, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  rejectText: { fontSize: 11, fontWeight: '900' },
  approveButton: { flex: 1.45, minHeight: 48, borderRadius: 15, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  approveText: { color: '#fff', fontSize: 11, fontWeight: '900' },
});
