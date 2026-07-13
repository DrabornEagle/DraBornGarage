import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, LayoutAnimation, Linking, Modal, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { money } from '../lib/format';
import { supabase } from '../lib/supabase';
import { AnimatedPressable } from './AnimatedPressable';
import { FormField } from './FormField';
import { GlassCard } from './GlassCard';
import { PrimaryButton } from './PrimaryButton';

type PlatformStatus = 'disabled' | 'open' | 'due_today' | 'overdue' | 'payment_reported' | 'partially_paid' | 'paid';
type ReportStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
type BillingCycle = 'weekly' | 'monthly';
type PlatformAccordionKey = 'paymentInfo' | 'paymentForm' | 'paymentReports' | 'periods' | 'charges';

type PlatformSummary = {
  status: PlatformStatus;
  total_charged: number;
  total_approved: number;
  total_pending: number;
  total_outstanding: number;
  available_to_report: number;
  credit_balance: number;
  carryover_amount: number;
  oldest_due_date?: string | null;
  current_due_date?: string | null;
  current_cycle_start?: string | null;
  current_cycle_end?: string | null;
  current_period_charge: number;
  current_period_approved: number;
  current_period_pending: number;
  current_period_remaining: number;
  charge_count: number;
};

type PlatformSettings = {
  workshop_id: string;
  fee_per_order: number;
  billing_cycle: BillingCycle;
  weekly_due_day: number;
  monthly_due_day: number;
  starts_on: string;
  is_enabled: boolean;
};

type GlobalSettings = {
  default_fee_per_order: number;
  bank_name?: string | null;
  account_holder?: string | null;
  iban?: string | null;
  payment_note?: string | null;
};

type PeriodRow = {
  id: string;
  cycle_start: string;
  cycle_end: string;
  due_date: string;
  charge_amount: number;
  approved_amount: number;
  pending_amount: number;
  remaining_amount: number;
  status: PlatformStatus;
};

type AllocationRow = { statement_id: string; amount: number; cycle_start: string; cycle_end: string; due_date: string };

type PaymentReport = {
  id: string;
  amount: number;
  payment_date: string;
  note?: string | null;
  receipt_path?: string | null;
  status: ReportStatus;
  admin_note?: string | null;
  reported_by_name: string;
  reviewed_by_name?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  allocations: AllocationRow[];
};

type ChargeRow = {
  id: string;
  work_order_id: string;
  amount: number;
  fee_per_order: number;
  charge_date: string;
  source_status: string;
  voided_at?: string | null;
  customer_name: string;
  brand: string;
  model: string;
  plate?: string | null;
  complaint: string;
};

type ChargeDetail = {
  charge: { id: string; amount: number; fee_per_order: number; charge_date: string; source_status: string; charged_at?: string | null; voided_at?: string | null };
  work_order: { id: string; status: string; service_type: string; complaint: string; total_amount: number; amount_received: number; remaining_amount: number; payment_status: string; receivable_status: string; arrived_at?: string | null; started_at?: string | null; ready_at?: string | null; delivered_at?: string | null };
  customer: { id: string; full_name: string; phone?: string | null };
  motorcycle: { id: string; brand: string; model: string; plate?: string | null; odometer?: number | null };
  mechanic?: { id?: string | null; full_name?: string | null } | null;
  services: { id: string; title: string; description?: string | null; price: number; completed: boolean }[];
  parts: { id: string; part_name: string; quantity: number; unit_price: number; total_price: number }[];
};

type Dashboard = {
  is_admin: boolean;
  settings: PlatformSettings;
  global_settings: GlobalSettings;
  summary: PlatformSummary;
  periods: PeriodRow[];
  payment_reports: PaymentReport[];
  charges: ChargeRow[];
};

type OverviewBusiness = {
  workshop_id: string;
  workshop_name: string;
  workshop_active: boolean;
  is_enabled: boolean;
  fee_per_order: number;
  billing_cycle: BillingCycle;
  total_charged: number;
  total_approved: number;
  total_pending: number;
  total_outstanding: number;
  oldest_due_date?: string | null;
  overdue_period_count: number;
  status: PlatformStatus;
};

type Overview = {
  summary: {
    business_count: number;
    enabled_business_count: number;
    overdue_business_count: number;
    pending_report_business_count: number;
    total_charged: number;
    total_approved: number;
    total_pending: number;
    total_outstanding: number;
  };
  businesses: OverviewBusiness[];
};

type ReceiptAsset = { uri: string; fileName?: string | null; mimeType?: string | null };

const WEEK_DAYS = [
  { value: 1, label: 'Pzt' }, { value: 2, label: 'Sal' }, { value: 3, label: 'Çar' },
  { value: 4, label: 'Per' }, { value: 5, label: 'Cum' }, { value: 6, label: 'Cmt' }, { value: 7, label: 'Paz' },
];
const MONTH_DAYS = [1, 5, 10, 15, 20, 25, 28, 0];

const statusLabel: Record<PlatformStatus, string> = {
  disabled: 'Takip kapalı',
  open: 'Dönem devam ediyor',
  due_today: 'Ödeme günü geldi',
  overdue: 'Ödeme gecikti',
  payment_reported: 'Ödeme bildirildi',
  partially_paid: 'Kısmi ödendi',
  paid: 'Borç yok / ödendi',
};

const reportLabel: Record<ReportStatus, string> = {
  pending: 'Admin onayı bekliyor',
  approved: 'Admin onayladı',
  rejected: 'Admin reddetti',
  cancelled: 'İşletme iptal etti',
};

function number(value: unknown) { return Number(value || 0); }
function todayText() { return new Date().toISOString().slice(0, 10); }
function dateText(value?: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`));
}
function dateTime(value?: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export function PlatformFeesDashboard() {
  const { colors } = useTheme();
  const { workshop, workshops, isAdmin, selectWorkshop } = useAuth();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayText());
  const [paymentNote, setPaymentNote] = useState('');
  const [receipt, setReceipt] = useState<ReceiptAsset | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [fee, setFee] = useState('20');
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [weeklyDueDay, setWeeklyDueDay] = useState(1);
  const [monthlyDueDay, setMonthlyDueDay] = useState(1);
  const [startsOn, setStartsOn] = useState(todayText());
  const [enabled, setEnabled] = useState(false);
  const [defaultFee, setDefaultFee] = useState('20');
  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [iban, setIban] = useState('');
  const [globalNote, setGlobalNote] = useState('');
  const [selectedCharge, setSelectedCharge] = useState<ChargeDetail | null>(null);
  const [chargeDetailLoading, setChargeDetailLoading] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<PlatformAccordionKey, boolean>>({
    paymentInfo: true,
    paymentForm: false,
    paymentReports: false,
    periods: false,
    charges: false,
  });

  const load = useCallback(async () => {
    if (!workshop) return;
    setLoading(true);
    const calls = [supabase.rpc('platform_get_dashboard', { p_workshop_id: workshop.id })];
    if (isAdmin) calls.push(supabase.rpc('admin_get_platform_overview'));
    const results = await Promise.all(calls);
    setLoading(false);
    const selected = results[0];
    if (selected.error) return Alert.alert('Platform raporu alınamadı', selected.error.message);
    const data = selected.data as Dashboard;
    setDashboard(data);
    setFee(String(data.settings.fee_per_order ?? 20));
    setCycle(data.settings.billing_cycle ?? 'monthly');
    setWeeklyDueDay(number(data.settings.weekly_due_day) || 1);
    setMonthlyDueDay(number(data.settings.monthly_due_day));
    setStartsOn(data.settings.starts_on || todayText());
    setEnabled(Boolean(data.settings.is_enabled));
    setDefaultFee(String(data.global_settings.default_fee_per_order ?? 20));
    setBankName(data.global_settings.bank_name || '');
    setAccountHolder(data.global_settings.account_holder || '');
    setIban(data.global_settings.iban || '');
    setGlobalNote(data.global_settings.payment_note || '');
    if (isAdmin) {
      const adminResult = results[1];
      if (adminResult.error) Alert.alert('Admin özeti alınamadı', adminResult.error.message);
      else setOverview(adminResult.data as Overview);
    }
  }, [workshop, isAdmin]);

  useEffect(() => { load(); }, [load]);
  const toggleSection = (key: PlatformAccordionKey) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSections((current) => ({ ...current, [key]: !current[key] }));
  };

  const statusAccent = useMemo(() => {
    const status = dashboard?.summary.status;
    if (status === 'paid') return colors.green;
    if (status === 'overdue') return colors.red;
    if (status === 'due_today') return colors.orange;
    if (status === 'payment_reported') return colors.cyan;
    if (status === 'partially_paid') return colors.primary;
    return colors.textMuted;
  }, [dashboard?.summary.status, colors]);

  const pickReceipt = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert('Galeri izni gerekli', 'Dekont seçebilmek için fotoğraf erişimine izin ver.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.82 });
    if (!result.canceled && result.assets[0]) setReceipt(result.assets[0]);
  };

  const uploadReceipt = async () => {
    if (!receipt || !workshop) return null;
    const ext = (receipt.fileName?.split('.').pop() || receipt.mimeType?.split('/').pop() || 'jpg').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const path = `${workshop.id}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext || 'jpg'}`;
    const response = await fetch(receipt.uri);
    const bytes = await response.arrayBuffer();
    const { error } = await supabase.storage.from('platform-receipts').upload(path, bytes, { contentType: receipt.mimeType || 'image/jpeg', upsert: false });
    if (error) throw error;
    return path;
  };

  const reportPayment = async () => {
    if (!workshop || !dashboard) return;
    const numericAmount = Number(amount.replace(',', '.'));
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return Alert.alert('Tutar gerekli');
    if (numericAmount > number(dashboard.summary.available_to_report) + 0.009) return Alert.alert('Tutar çok yüksek', `Bildirilebilecek en yüksek tutar ${money(number(dashboard.summary.available_to_report))}.`);
    setSaving(true);
    let receiptPath: string | null = null;
    try {
      receiptPath = await uploadReceipt();
      const { error } = await supabase.rpc('owner_report_platform_payment', {
        p_workshop_id: workshop.id,
        p_amount: numericAmount,
        p_payment_date: paymentDate,
        p_note: paymentNote.trim() || null,
        p_receipt_path: receiptPath,
      });
      if (error) throw error;
      setAmount(''); setPaymentNote(''); setReceipt(null); setPaymentDate(todayText());
      await load();
      Alert.alert('Ödeme bildirildi', 'Bildirim Admin onayına gönderildi. Onaylanana kadar bekleyen ödeme olarak görünür.');
    } catch (error: any) {
      if (receiptPath) await supabase.storage.from('platform-receipts').remove([receiptPath]);
      Alert.alert('Ödeme bildirilemedi', error?.message || 'Bilinmeyen hata');
    } finally { setSaving(false); }
  };

  const openChargeDetail = async (chargeId: string) => {
    setChargeDetailLoading(chargeId);
    const { data, error } = await supabase.rpc('platform_get_charge_detail', { p_charge_id: chargeId });
    setChargeDetailLoading(null);
    if (error) return Alert.alert('Ücret kaydı açılamadı', error.message);
    setSelectedCharge(data as ChargeDetail);
  };

  const saveGlobal = async () => {
    setSaving(true);
    const { error } = await supabase.rpc('admin_update_platform_global_settings', {
      p_default_fee_per_order: Number(defaultFee.replace(',', '.')),
      p_bank_name: bankName.trim() || null,
      p_account_holder: accountHolder.trim() || null,
      p_iban: iban.trim() || null,
      p_payment_note: globalNote.trim() || null,
    });
    setSaving(false);
    if (error) return Alert.alert('Platform ödeme bilgileri kaydedilemedi', error.message);
    await load();
    Alert.alert('Platform ödeme bilgileri güncellendi');
  };

  const saveWorkshopSettings = async () => {
    if (!workshop) return;
    setSaving(true);
    const { error } = await supabase.rpc('admin_update_workshop_platform_settings', {
      p_workshop_id: workshop.id,
      p_fee_per_order: Number(fee.replace(',', '.')),
      p_billing_cycle: cycle,
      p_weekly_due_day: weeklyDueDay,
      p_monthly_due_day: monthlyDueDay,
      p_starts_on: startsOn,
      p_is_enabled: enabled,
    });
    setSaving(false);
    if (error) return Alert.alert('İşletme bedeli kaydedilemedi', error.message);
    await load();
    Alert.alert('İşletme platform ayarı güncellendi', 'Yeni işlem bedeli yalnız yeni oluşan ücret kayıtlarına uygulanır.');
  };

  const review = async (id: string, approve: boolean) => {
    setSaving(true);
    const { error } = await supabase.rpc('admin_review_platform_payment', { p_payment_report_id: id, p_approve: approve, p_admin_note: reviewNotes[id]?.trim() || null });
    setSaving(false);
    if (error) return Alert.alert('İşlem tamamlanamadı', error.message);
    await load();
    Alert.alert(approve ? 'Ödeme onaylandı' : 'Ödeme reddedildi');
  };

  const cancelReport = (id: string) => Alert.alert('Ödeme bildirimi iptal edilsin mi?', 'Yalnız Admin tarafından henüz incelenmemiş bildirim iptal edilir.', [
    { text: 'Vazgeç' },
    { text: 'İptal Et', style: 'destructive', onPress: async () => { const { error } = await supabase.rpc('owner_cancel_platform_payment_report', { p_payment_report_id: id }); if (error) return Alert.alert('İptal edilemedi', error.message); await load(); } },
  ]);

  const openReceipt = async (path: string) => {
    const { data, error } = await supabase.storage.from('platform-receipts').createSignedUrl(path, 600);
    if (error || !data?.signedUrl) return Alert.alert('Dekont açılamadı', error?.message || 'Bağlantı oluşturulamadı');
    await Linking.openURL(data.signedUrl);
  };

  if (!workshop) return <GlassCard><Text style={[styles.empty, { color: colors.textMuted }]}>Önce bir işletme seç.</Text></GlassCard>;
  if (loading && !dashboard) return <GlassCard style={styles.loading}><Ionicons name="sync" size={23} color={colors.primary} /><Text style={[styles.loadingText, { color: colors.textMuted }]}>Platform hesapları hazırlanıyor…</Text></GlassCard>;
  if (!dashboard) return null;

  const s = dashboard.summary;
  const g = dashboard.global_settings;

  return <View style={styles.stack}>
    {isAdmin && overview && <AdminOverview overview={overview} selectedId={workshop.id} onSelect={async (id) => { await selectWorkshop(id); }} />}

    <View style={styles.sectionHeader}>
      <View style={styles.copy}><Text style={[styles.sectionTitle, { color: colors.text }]}>Seçili İşletme Platform Hesabı</Text><Text style={[styles.sectionSub, { color: colors.textMuted }]}>{workshop.name} • işlem başı {money(number(dashboard.settings.fee_per_order))}</Text></View>
      <AnimatedPressable onPress={load} style={[styles.refresh, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}35` }]}><Ionicons name="refresh" size={18} color={colors.primary} /></AnimatedPressable>
    </View>

    <LinearGradient colors={[statusAccent, colors.primary2, colors.black]} style={styles.hero}>
      <View style={styles.copy}><Text style={styles.heroEyebrow}>{statusLabel[s.status]}</Text><Text style={styles.heroValue}>{money(number(s.total_outstanding))}</Text><Text style={styles.heroSub}>Toplam kalan platform borcu • {number(s.charge_count)} ücret kaydı</Text></View>
      <View style={styles.heroRight}><Ionicons name={s.status === 'paid' ? 'checkmark-circle' : s.status === 'overdue' ? 'alert-circle' : 'wallet'} size={34} color="#fff" /><Text style={styles.heroRightText}>{s.oldest_due_date ? `En eski ödeme\n${dateText(s.oldest_due_date)}` : 'Aktif borç\nbulunmuyor'}</Text></View>
    </LinearGradient>

    <View style={styles.metricGrid}>
      <Metric icon="receipt" label="Bu Dönem" value={money(number(s.current_period_charge))} accent={colors.primary} />
      <Metric icon="return-down-forward" label="Devreden Borç" value={money(number(s.carryover_amount))} accent={colors.orange} />
      <Metric icon="hourglass" label="Onay Bekleyen" value={money(number(s.total_pending))} accent={colors.cyan} />
      <Metric icon="checkmark-done" label="Onaylanan" value={money(number(s.total_approved))} accent={colors.green} />
      <Metric icon="calendar" label="Ödeme Günü" value={dateText(s.current_due_date)} accent={colors.orange} />
      <Metric icon="send" label="Bildirilebilir" value={money(number(s.available_to_report))} accent={colors.primary2} />
    </View>

    {!dashboard.settings.is_enabled && <GlassCard style={[styles.notice, { borderColor: `${colors.orange}45` }]}><Ionicons name="pause-circle" size={25} color={colors.orange} /><View style={styles.copy}><Text style={[styles.noticeTitle, { color: colors.text }]}>Platform bedeli bu işletmede kapalı</Text><Text style={[styles.noticeText, { color: colors.textMuted }]}>Admin etkinleştirdiğinde tamamlanan her servis için belirlenen işlem bedeli otomatik kaydedilir.</Text></View></GlassCard>}

    <AccordionSection
      title="Platform Ödeme Bilgileri"
      subtitle={g.iban ? [g.bank_name || 'Banka', 'IBAN tanımlı'].join(' • ') : 'Banka ve IBAN bilgileri henüz tanımlanmadı'}
      icon="business"
      accent={colors.cyan}
      open={expandedSections.paymentInfo}
      onToggle={() => toggleSection('paymentInfo')}
    >
      <BankCard settings={g} />
    </AccordionSection>

    <AccordionSection
      title="Ödeme Bildir"
      subtitle={number(s.available_to_report) > 0 ? 'Bildirilebilir tutar ' + money(number(s.available_to_report)) : 'Bildirilebilir açık borç bulunmuyor'}
      icon="paper-plane"
      accent={colors.green}
      open={expandedSections.paymentForm}
      onToggle={() => toggleSection('paymentForm')}
    >
      {number(s.available_to_report) > 0 ? <GlassCard style={styles.formCard}>
        <View style={styles.formTitleRow}><View style={[styles.formIcon, { backgroundColor: colors.green + '15' }]}><Ionicons name="paper-plane" size={23} color={colors.green} /></View><View style={styles.copy}><Text style={[styles.formTitle, { color: colors.text }]}>Yeni Ödeme Bildirimi</Text><Text style={[styles.formText, { color: colors.textMuted }]}>Gönderdiğin tutar en eski borç döneminden başlayarak otomatik dağıtılır.</Text></View></View>
        <FormField label={'Gönderilen tutar • En fazla ' + money(number(s.available_to_report))} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0,00" />
        <FormField label="Ödeme tarihi • YYYY-MM-DD" value={paymentDate} onChangeText={setPaymentDate} autoCapitalize="none" />
        <FormField label="Açıklama" value={paymentNote} onChangeText={setPaymentNote} multiline placeholder="Örn. Temmuz dönemi platform ödemesi" />
        <AnimatedPressable onPress={pickReceipt} style={[styles.receiptPicker, { backgroundColor: colors.surfaceSoft, borderColor: receipt ? colors.green : colors.border }]}>
          {receipt ? <Image source={{ uri: receipt.uri }} style={styles.receiptPreview} /> : <View style={[styles.receiptPlaceholder, { backgroundColor: colors.primary + '12' }]}><Ionicons name="image" size={26} color={colors.primary} /></View>}
          <View style={styles.copy}><Text style={[styles.receiptTitle, { color: colors.text }]}>{receipt ? 'Dekont seçildi' : 'Opsiyonel dekont ekle'}</Text><Text style={[styles.receiptText, { color: colors.textMuted }]}>{receipt?.fileName || 'Galeriden JPG, PNG veya WEBP seçebilirsin.'}</Text></View>
          <Ionicons name={receipt ? 'checkmark-circle' : 'add-circle'} size={23} color={receipt ? colors.green : colors.primary} />
        </AnimatedPressable>
        {receipt && <AnimatedPressable onPress={() => setReceipt(null)}><Text style={[styles.removeReceipt, { color: colors.red }]}>Dekontu kaldır</Text></AnimatedPressable>}
        <PrimaryButton title="Ödemeyi Admin Onayına Gönder" onPress={reportPayment} loading={saving} />
      </GlassCard> : <Empty text="Şu anda bildirilebilecek açık platform borcu yok." />}
    </AccordionSection>

    {isAdmin && <>
      <Text style={[styles.listTitle, { color: colors.text }]}>Admin Platform Ayarları</Text>
      <GlassCard style={styles.formCard}>
        <View style={styles.formTitleRow}><Ionicons name="card" size={26} color={colors.cyan} /><View style={styles.copy}><Text style={[styles.formTitle, { color: colors.text }]}>Platform IBAN ve Varsayılan Bedel</Text><Text style={[styles.formText, { color: colors.textMuted }]}>Yeni işletmelerin varsayılan işlem bedeli ve işletmelere gösterilecek ödeme bilgileri.</Text></View></View>
        <FormField label="Varsayılan işlem başı bedel" value={defaultFee} onChangeText={setDefaultFee} keyboardType="decimal-pad" />
        <FormField label="Banka adı" value={bankName} onChangeText={setBankName} />
        <FormField label="Hesap sahibi" value={accountHolder} onChangeText={setAccountHolder} />
        <FormField label="IBAN" value={iban} onChangeText={setIban} autoCapitalize="characters" />
        <FormField label="Ödeme açıklaması / notu" value={globalNote} onChangeText={setGlobalNote} multiline />
        <PrimaryButton title="Platform Ödeme Bilgilerini Kaydet" onPress={saveGlobal} loading={saving} />
      </GlassCard>

      <GlassCard style={styles.formCard}>
        <View style={styles.formTitleRow}><Ionicons name="options" size={26} color={colors.orange} /><View style={styles.copy}><Text style={[styles.formTitle, { color: colors.text }]}>İşletmeye Özel Bedel ve Periyot</Text><Text style={[styles.formText, { color: colors.textMuted }]}>Mevcut ücret kayıtları değişmez; yeni işlem bedeli yalnız sonraki tamamlanan servislerde kullanılır.</Text></View></View>
        <View style={[styles.toggleRow, { backgroundColor: colors.surfaceSoft }]}><View style={styles.copy}><Text style={[styles.toggleTitle, { color: colors.text }]}>Platform bedeli aktif</Text><Text style={[styles.toggleText, { color: colors.textMuted }]}>Tamamlanan servislerde otomatik ücret kaydı oluştur.</Text></View><Switch value={enabled} onValueChange={setEnabled} trackColor={{ false: colors.border, true: `${colors.green}80` }} thumbColor={enabled ? colors.green : colors.textMuted} /></View>
        <FormField label="İşlem başı özel bedel" value={fee} onChangeText={setFee} keyboardType="decimal-pad" />
        <FormField label="Takip başlangıç tarihi • YYYY-MM-DD" value={startsOn} onChangeText={setStartsOn} autoCapitalize="none" />
        <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>ÖDEME PERİYODU</Text>
        <View style={styles.segment}><Choice active={cycle === 'weekly'} label="Haftalık" icon="calendar" onPress={() => setCycle('weekly')} /><Choice active={cycle === 'monthly'} label="Aylık" icon="calendar-number" onPress={() => setCycle('monthly')} /></View>
        {cycle === 'weekly' ? <><Text style={[styles.fieldLabel, { color: colors.textMuted }]}>HAFTALIK ÖDEME GÜNÜ</Text><View style={styles.choiceWrap}>{WEEK_DAYS.map((day) => <SmallChoice key={day.value} active={weeklyDueDay === day.value} label={day.label} onPress={() => setWeeklyDueDay(day.value)} />)}</View></> : <><Text style={[styles.fieldLabel, { color: colors.textMuted }]}>AYLIK ÖDEME GÜNÜ</Text><View style={styles.choiceWrap}>{MONTH_DAYS.map((day) => <SmallChoice key={day} active={monthlyDueDay === day} label={day === 0 ? 'Son Gün' : String(day)} onPress={() => setMonthlyDueDay(day)} />)}</View></>}
        <PrimaryButton title="İşletme Platform Ayarını Kaydet" onPress={saveWorkshopSettings} loading={saving} />
      </GlassCard>
    </>}

    <AccordionSection
      title="Ödeme Bildirimleri"
      subtitle={dashboard.payment_reports.length + ' bildirim • ' + money(number(s.total_pending)) + ' onay bekliyor'}
      icon="notifications"
      accent={colors.cyan}
      open={expandedSections.paymentReports}
      onToggle={() => toggleSection('paymentReports')}
    >
      <View style={styles.stack}>{dashboard.payment_reports.length === 0 ? <Empty text="Henüz ödeme bildirimi yok." /> : dashboard.payment_reports.map((report) => <PaymentReportCard key={report.id} report={report} isAdmin={isAdmin} reviewNote={reviewNotes[report.id] || ''} onReviewNote={(value) => setReviewNotes((current) => ({ ...current, [report.id]: value }))} onApprove={() => review(report.id, true)} onReject={() => review(report.id, false)} onCancel={() => cancelReport(report.id)} onOpenReceipt={() => report.receipt_path && openReceipt(report.receipt_path)} loading={saving} />)}</View>
    </AccordionSection>

    <AccordionSection
      title="Dönem Borçları"
      subtitle={dashboard.periods.length + ' dönem • Kalan ' + money(number(s.total_outstanding))}
      icon="calendar-number"
      accent={colors.orange}
      open={expandedSections.periods}
      onToggle={() => toggleSection('periods')}
    >
      <View style={styles.stack}>{dashboard.periods.length === 0 ? <Empty text="Henüz platform dönemi oluşmadı." /> : dashboard.periods.map((period) => <PeriodCard key={period.id} period={period} />)}</View>
    </AccordionSection>

    <AccordionSection
      title="İşlem Başı Ücret Kayıtları"
      subtitle={dashboard.charges.length + ' kayıt • İşlem başı ' + money(number(dashboard.settings.fee_per_order))}
      icon="receipt"
      accent={colors.primary}
      open={expandedSections.charges}
      onToggle={() => toggleSection('charges')}
    >
      <View style={styles.stack}>{dashboard.charges.length === 0 ? <Empty text="Tamamlanan servise bağlı ücret kaydı bulunmuyor." /> : dashboard.charges.map((charge) => <ChargeCard key={charge.id} charge={charge} loading={chargeDetailLoading === charge.id} onPress={() => openChargeDetail(charge.id)} />)}</View>
    </AccordionSection>
    <ChargeDetailModal detail={selectedCharge} onClose={() => setSelectedCharge(null)} />
  </View>;
}

function AdminOverview({ overview, selectedId, onSelect }: { overview: Overview; selectedId: string; onSelect: (id: string) => void }) {
  const { colors } = useTheme();
  return <View style={styles.stack}>
    <LinearGradient colors={[colors.red, colors.orange, colors.primary]} style={styles.adminHero}>
      <View><Text style={styles.heroEyebrow}>PLATFORM GENEL ALACAĞI</Text><Text style={styles.adminHeroValue}>{money(number(overview.summary.total_outstanding))}</Text><Text style={styles.heroSub}>{overview.summary.enabled_business_count} aktif işletme • {overview.summary.pending_report_business_count} ödeme bildirimi</Text></View>
      <View style={styles.heroRight}><Ionicons name="shield-checkmark" size={34} color="#fff" /><Text style={styles.heroRightText}>{overview.summary.overdue_business_count} geciken{`\n`}{money(number(overview.summary.total_pending))} bekleyen</Text></View>
    </LinearGradient>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.businessRow}>
      {overview.businesses.map((item) => {
        const active = item.workshop_id === selectedId;
        const accent = item.status === 'overdue' ? colors.red : item.status === 'payment_reported' ? colors.cyan : item.status === 'paid' ? colors.green : colors.orange;
        return <AnimatedPressable key={item.workshop_id} onPress={() => onSelect(item.workshop_id)} style={[styles.businessCard, { backgroundColor: active ? `${colors.primary}18` : colors.card, borderColor: active ? colors.primary : colors.border }]}><View style={styles.businessHead}><Ionicons name="business" size={20} color={accent} /><Text numberOfLines={1} style={[styles.businessName, { color: colors.text }]}>{item.workshop_name}</Text></View><Text style={[styles.businessAmount, { color: accent }]}>{money(number(item.total_outstanding))}</Text><Text style={[styles.businessMeta, { color: colors.textMuted }]}>{statusLabel[item.status]} • {money(number(item.fee_per_order))}/işlem</Text></AnimatedPressable>;
      })}
    </ScrollView>
  </View>;
}

function AccordionSection({ title, subtitle, icon, accent, open, onToggle, children }: { title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap; accent: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  const { colors } = useTheme();
  return <View style={[styles.accordion, { backgroundColor: colors.card, borderColor: open ? accent + '55' : colors.border }]}>
    <AnimatedPressable onPress={onToggle} style={styles.accordionHeader}>
      <View style={[styles.accordionIcon, { backgroundColor: accent + '15' }]}><Ionicons name={icon} size={23} color={accent} /></View>
      <View style={styles.copy}><Text style={[styles.accordionTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.accordionSub, { color: colors.textMuted }]}>{subtitle}</Text></View>
      <View style={[styles.accordionChevron, { backgroundColor: accent + '12', borderColor: accent + '35' }]}><Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={accent} /></View>
    </AnimatedPressable>
    {open && <View style={[styles.accordionBody, { borderTopColor: colors.border }]}>{children}</View>}
  </View>;
}

function BankCard({ settings }: { settings: GlobalSettings }) {
  const { colors } = useTheme();
  const hasIban = Boolean(settings.iban);
  return <GlassCard style={styles.bankCard}>
    <View style={[styles.bankIcon, { backgroundColor: `${colors.cyan}15` }]}><Ionicons name="business" size={25} color={colors.cyan} /></View>
    <View style={styles.copy}><Text style={[styles.bankTitle, { color: colors.text }]}>Banka ve IBAN Bilgileri</Text><Text style={[styles.bankName, { color: colors.textMuted }]}>{settings.bank_name || 'Banka bilgisi Admin tarafından girilmedi'} • {settings.account_holder || 'Hesap sahibi yok'}</Text><Text selectable style={[styles.iban, { color: hasIban ? colors.text : colors.textMuted }]}>{settings.iban || 'IBAN henüz tanımlanmadı'}</Text>{settings.payment_note && settings.payment_note !== 'Açıklamaya işletme adı ve dönem bilgisini yazın.' && <Text style={[styles.bankNote, { color: colors.textMuted }]}>{settings.payment_note}</Text>}</View>
    {hasIban && <AnimatedPressable onPress={() => Share.share({ message: `${settings.bank_name || ''}\n${settings.account_holder || ''}\n${settings.iban}\n${settings.payment_note || ''}` })}><Ionicons name="share-social" size={23} color={colors.primary} /></AnimatedPressable>}
  </GlassCard>;
}

function PaymentReportCard({ report, isAdmin, reviewNote, onReviewNote, onApprove, onReject, onCancel, onOpenReceipt, loading }: { report: PaymentReport; isAdmin: boolean; reviewNote: string; onReviewNote: (value: string) => void; onApprove: () => void; onReject: () => void; onCancel: () => void; onOpenReceipt: () => void; loading: boolean }) {
  const { colors } = useTheme();
  const accent = report.status === 'approved' ? colors.green : report.status === 'rejected' || report.status === 'cancelled' ? colors.red : colors.cyan;
  return <GlassCard style={styles.reportCard}>
    <View style={styles.row}><View style={[styles.reportIcon, { backgroundColor: `${accent}15` }]}><Ionicons name={report.status === 'approved' ? 'checkmark-done' : report.status === 'rejected' ? 'close-circle' : 'hourglass'} size={23} color={accent} /></View><View style={styles.copy}><Text style={[styles.rowTitle, { color: colors.text }]}>{money(number(report.amount))} • {reportLabel[report.status]}</Text><Text style={[styles.rowMeta, { color: colors.textMuted }]}>{report.reported_by_name} • Ödeme {dateText(report.payment_date)} • Bildirim {dateTime(report.created_at)}</Text></View></View>
    {report.note && <Text style={[styles.note, { color: colors.textSoft }]}>{report.note}</Text>}
    <View style={styles.allocationWrap}>{report.allocations.map((item) => <View key={item.statement_id} style={[styles.allocation, { backgroundColor: colors.surfaceSoft }]}><Text style={[styles.allocationText, { color: colors.textMuted }]}>{dateText(item.cycle_start)}–{dateText(item.cycle_end)}</Text><Text style={[styles.allocationAmount, { color: colors.text }]}>{money(number(item.amount))}</Text></View>)}</View>
    {report.receipt_path && <AnimatedPressable onPress={onOpenReceipt} style={[styles.receiptOpen, { borderColor: `${colors.cyan}40` }]}><Ionicons name="document-attach" size={18} color={colors.cyan} /><Text style={[styles.receiptOpenText, { color: colors.cyan }]}>Dekontu güvenli bağlantıyla aç</Text></AnimatedPressable>}
    {report.admin_note && <View style={[styles.adminNote, { backgroundColor: `${accent}0D`, borderColor: `${accent}30` }]}><Ionicons name="shield" size={16} color={accent} /><Text style={[styles.adminNoteText, { color: colors.textMuted }]}>{report.admin_note}</Text></View>}
    {report.status === 'pending' && isAdmin && <View style={styles.reviewBox}><FormField label="Admin inceleme notu" value={reviewNote} onChangeText={onReviewNote} multiline placeholder="Opsiyonel onay veya ret açıklaması" /><View style={styles.actionRow}><AnimatedPressable disabled={loading} onPress={onReject} style={[styles.actionButton, { backgroundColor: `${colors.red}12`, borderColor: `${colors.red}35` }]}><Ionicons name="close" size={18} color={colors.red} /><Text style={[styles.actionText, { color: colors.red }]}>Reddet</Text></AnimatedPressable><AnimatedPressable disabled={loading} onPress={onApprove} style={[styles.actionButton, { backgroundColor: `${colors.green}12`, borderColor: `${colors.green}35` }]}><Ionicons name="checkmark" size={18} color={colors.green} /><Text style={[styles.actionText, { color: colors.green }]}>Onayla</Text></AnimatedPressable></View></View>}
    {report.status === 'pending' && !isAdmin && <AnimatedPressable onPress={onCancel} style={[styles.cancelButton, { borderColor: `${colors.red}35` }]}><Text style={[styles.cancelText, { color: colors.red }]}>Bekleyen bildirimi iptal et</Text></AnimatedPressable>}
  </GlassCard>;
}

function PeriodCard({ period }: { period: PeriodRow }) {
  const { colors } = useTheme();
  const accent = period.status === 'paid' ? colors.green : period.status === 'overdue' ? colors.red : period.status === 'payment_reported' ? colors.cyan : colors.orange;
  return <GlassCard style={styles.periodCard}><View style={styles.row}><View style={[styles.periodIcon, { backgroundColor: `${accent}15` }]}><Ionicons name="calendar-number" size={22} color={accent} /></View><View style={styles.copy}><Text style={[styles.rowTitle, { color: colors.text }]}>{dateText(period.cycle_start)} – {dateText(period.cycle_end)}</Text><Text style={[styles.rowMeta, { color: colors.textMuted }]}>Son ödeme {dateText(period.due_date)} • {statusLabel[period.status]}</Text></View><Text style={[styles.rowAmount, { color: accent }]}>{money(number(period.remaining_amount))}</Text></View><View style={styles.periodMetrics}><Mini label="Oluşan" value={money(number(period.charge_amount))} /><Mini label="Onaylanan" value={money(number(period.approved_amount))} accent={colors.green} /><Mini label="Bekleyen" value={money(number(period.pending_amount))} accent={colors.cyan} /></View></GlassCard>;
}

function ChargeCard({ charge, onPress, loading }: { charge: ChargeRow; onPress: () => void; loading: boolean }) {
  const { colors } = useTheme();
  return <AnimatedPressable onPress={onPress} style={[styles.chargeCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: charge.voided_at ? 0.55 : 1 }]}>
    <View style={styles.row}><View style={[styles.chargeIcon, { backgroundColor: `${colors.primary}15` }]}><Ionicons name={loading ? 'sync' : 'receipt'} size={21} color={colors.primary} /></View><View style={styles.copy}><Text style={[styles.rowTitle, { color: colors.text }]}>{charge.customer_name} • {charge.plate || 'Plaka yok'}</Text><Text style={[styles.rowMeta, { color: colors.textMuted }]}>{charge.brand} {charge.model} • {dateText(charge.charge_date)} • {charge.source_status}</Text></View><Text style={[styles.rowAmount, { color: charge.voided_at ? colors.textMuted : colors.green }]}>{money(number(charge.amount))}</Text><Ionicons name="chevron-forward" size={20} color={colors.textMuted} /></View>
    <Text style={[styles.note, { color: colors.textSoft }]}>{charge.complaint}</Text>
  </AnimatedPressable>;
}

function ChargeDetailModal({ detail, onClose }: { detail: ChargeDetail | null; onClose: () => void }) {
  const { colors } = useTheme();
  if (!detail) return null;
  const order = detail.work_order;
  return <Modal visible animationType="slide" transparent onRequestClose={onClose}>
    <View style={styles.detailOverlay}>
      <View style={[styles.detailModal, { backgroundColor: colors.cardStrong, borderColor: colors.border }]}>
        <View style={styles.detailHeader}><View style={[styles.detailHeaderIcon, { backgroundColor: `${colors.primary}16` }]}><Ionicons name="receipt" size={24} color={colors.primary} /></View><View style={styles.copy}><Text style={[styles.detailTitle, { color: colors.text }]}>İşlem Başı Ücret Detayı</Text><Text style={[styles.rowMeta, { color: colors.textMuted }]}>{detail.motorcycle.brand} {detail.motorcycle.model} • {detail.motorcycle.plate || 'Plaka yok'}</Text></View><AnimatedPressable onPress={onClose}><Ionicons name="close-circle" size={31} color={colors.textMuted} /></AnimatedPressable></View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScroll}>
          <LinearGradient colors={[colors.primary, colors.primary2, colors.cyan]} style={styles.detailHero}><View><Text style={styles.heroEyebrow}>PLATFORM ÜCRETİ</Text><Text style={styles.detailHeroValue}>{money(number(detail.charge.amount))}</Text><Text style={styles.heroSub}>{dateText(detail.charge.charge_date)} • {detail.charge.source_status}</Text></View><Ionicons name="checkmark-done-circle" size={36} color="#fff" /></LinearGradient>
          <GlassCard style={styles.detailCard}><DetailLine icon="person" label="Müşteri" value={detail.customer.full_name} /><DetailLine icon="call" label="Telefon" value={detail.customer.phone || '-'} /><DetailLine icon="construct" label="Usta" value={detail.mechanic?.full_name || 'Atanmamış'} /><DetailLine icon="speedometer" label="Motosiklet" value={`${detail.motorcycle.brand} ${detail.motorcycle.model} • ${detail.motorcycle.plate || 'Plaka yok'}`} /></GlassCard>
          <GlassCard style={styles.detailCard}><Text style={[styles.detailSectionTitle, { color: colors.text }]}>Servis ve Tahsilat</Text><Text style={[styles.note, { color: colors.textSoft }]}>{order.complaint}</Text><View style={styles.periodMetrics}><Mini label="Toplam" value={money(number(order.total_amount))} /><Mini label="Ödenen" value={money(number(order.amount_received))} accent={colors.green} /><Mini label="Kalan" value={money(number(order.remaining_amount))} accent={number(order.remaining_amount) > 0 ? colors.red : colors.green} /></View><DetailLine icon="time" label="Geliş" value={dateTime(order.arrived_at)} /><DetailLine icon="checkmark-circle" label="Teslim" value={dateTime(order.delivered_at || order.ready_at)} /></GlassCard>
          <GlassCard style={styles.detailCard}><Text style={[styles.detailSectionTitle, { color: colors.text }]}>Yapılan İşlemler</Text>{detail.services.length === 0 ? <Text style={[styles.empty, { color: colors.textMuted }]}>İşlem satırı yok.</Text> : detail.services.map((item) => <View key={item.id} style={[styles.detailItem, { borderBottomColor: colors.border }]}><View style={styles.copy}><Text style={[styles.rowTitle, { color: colors.text }]}>{item.title}</Text>{item.description && <Text style={[styles.rowMeta, { color: colors.textMuted }]}>{item.description}</Text>}</View><Text style={[styles.rowAmount, { color: colors.green }]}>{money(number(item.price))}</Text></View>)}</GlassCard>
          <GlassCard style={styles.detailCard}><Text style={[styles.detailSectionTitle, { color: colors.text }]}>Kullanılan Parçalar</Text>{detail.parts.length === 0 ? <Text style={[styles.empty, { color: colors.textMuted }]}>Parça kaydı yok.</Text> : detail.parts.map((item) => <View key={item.id} style={[styles.detailItem, { borderBottomColor: colors.border }]}><View style={styles.copy}><Text style={[styles.rowTitle, { color: colors.text }]}>{item.part_name}</Text><Text style={[styles.rowMeta, { color: colors.textMuted }]}>{number(item.quantity)} adet × {money(number(item.unit_price))}</Text></View><Text style={[styles.rowAmount, { color: colors.text }]}>{money(number(item.total_price))}</Text></View>)}</GlassCard>
        </ScrollView>
      </View>
    </View>
  </Modal>;
}

function DetailLine({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) { const { colors } = useTheme(); return <View style={[styles.detailLine, { borderBottomColor: colors.border }]}><Ionicons name={icon} size={18} color={colors.textMuted} /><View style={styles.copy}><Text style={[styles.miniLabel, { color: colors.textMuted }]}>{label}</Text><Text style={[styles.detailValue, { color: colors.text }]}>{value}</Text></View></View>; }

function Metric({ icon, label, value, accent }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; accent: string }) {
  const { colors } = useTheme();
  return <View style={[styles.metric, { backgroundColor: colors.card, borderColor: `${accent}35` }]}><View style={[styles.metricIcon, { backgroundColor: `${accent}14` }]}><Ionicons name={icon} size={19} color={accent} /></View><Text numberOfLines={1} adjustsFontSizeToFit style={[styles.metricValue, { color: colors.text }]}>{value}</Text><Text style={[styles.metricLabel, { color: colors.textMuted }]}>{label}</Text></View>;
}
function Mini({ label, value, accent }: { label: string; value: string; accent?: string }) { const { colors } = useTheme(); return <View style={[styles.mini, { backgroundColor: colors.surfaceSoft }]}><Text numberOfLines={1} adjustsFontSizeToFit style={[styles.miniValue, { color: accent || colors.text }]}>{value}</Text><Text style={[styles.miniLabel, { color: colors.textMuted }]}>{label}</Text></View>; }
function Choice({ active, label, icon, onPress }: { active: boolean; label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) { const { colors } = useTheme(); return <AnimatedPressable onPress={onPress} style={[styles.choice, { backgroundColor: active ? `${colors.primary}18` : colors.surfaceSoft, borderColor: active ? colors.primary : colors.border }]}><Ionicons name={icon} size={18} color={active ? colors.primary : colors.textMuted} /><Text style={[styles.choiceText, { color: active ? colors.text : colors.textMuted }]}>{label}</Text></AnimatedPressable>; }
function SmallChoice({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) { const { colors } = useTheme(); return <AnimatedPressable onPress={onPress} style={[styles.smallChoice, { backgroundColor: active ? colors.primary : colors.surfaceSoft, borderColor: active ? colors.primary : colors.border }]}><Text style={[styles.smallChoiceText, { color: active ? '#fff' : colors.textMuted }]}>{label}</Text></AnimatedPressable>; }
function Empty({ text }: { text: string }) { const { colors } = useTheme(); return <GlassCard><Text style={[styles.empty, { color: colors.textMuted }]}>{text}</Text></GlassCard>; }

const styles = StyleSheet.create({
  stack: { gap: 12 }, copy: { flex: 1, minWidth: 0 }, row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }, loadingText: { fontSize: 12.5, fontWeight: '800' }, empty: { textAlign: 'center', paddingVertical: 10, fontSize: 12.5 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 }, sectionTitle: { fontSize: 19, fontWeight: '900' }, sectionSub: { fontSize: 12, marginTop: 4 }, refresh: { width: 42, height: 42, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  hero: { minHeight: 154, borderRadius: 27, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 12 }, heroEyebrow: { color: 'rgba(255,255,255,0.82)', fontSize: 11, fontWeight: '900', letterSpacing: 1 }, heroValue: { color: '#fff', fontSize: 31, fontWeight: '900', marginTop: 8 }, heroSub: { color: 'rgba(255,255,255,0.76)', fontSize: 12, marginTop: 5 }, heroRight: { alignItems: 'flex-end', gap: 10 }, heroRightText: { color: '#fff', fontSize: 11, lineHeight: 15, textAlign: 'right', fontWeight: '800' },
  adminHero: { minHeight: 132, borderRadius: 25, padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, adminHeroValue: { color: '#fff', fontSize: 28, fontWeight: '900', marginTop: 7 }, businessRow: { gap: 9, paddingRight: 8 }, businessCard: { width: 215, minHeight: 112, borderRadius: 19, borderWidth: 1, padding: 13, gap: 7 }, businessHead: { flexDirection: 'row', alignItems: 'center', gap: 7 }, businessName: { flex: 1, fontSize: 12.5, fontWeight: '900' }, businessAmount: { fontSize: 20, fontWeight: '900' }, businessMeta: { fontSize: 10, lineHeight: 13 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, metric: { width: '31.5%', minHeight: 105, borderRadius: 19, borderWidth: 1, padding: 10 }, metricIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, metricValue: { fontSize: 13, fontWeight: '900', marginTop: 8 }, metricLabel: { fontSize: 10, lineHeight: 12, fontWeight: '800', marginTop: 4 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 11 }, noticeTitle: { fontSize: 14, fontWeight: '900' }, noticeText: { fontSize: 12, lineHeight: 16, marginTop: 4 },
  accordion: { borderWidth: 1, borderRadius: 22, overflow: 'hidden' }, accordionHeader: { minHeight: 82, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 11 }, accordionIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, accordionTitle: { fontSize: 15.5, fontWeight: '900' }, accordionSub: { fontSize: 11.5, lineHeight: 15, marginTop: 4 }, accordionChevron: { width: 38, height: 38, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, accordionBody: { borderTopWidth: 1, padding: 12, gap: 12 },
  bankCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 }, bankIcon: { width: 47, height: 47, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, bankTitle: { fontSize: 15, fontWeight: '900' }, bankName: { fontSize: 11, marginTop: 4 }, iban: { fontSize: 13.5, fontWeight: '900', letterSpacing: 0.5, marginTop: 8 }, bankNote: { fontSize: 11, lineHeight: 14, marginTop: 6 },
  formCard: { gap: 13 }, formTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, formIcon: { width: 45, height: 45, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, formTitle: { fontSize: 16, fontWeight: '900' }, formText: { fontSize: 12, lineHeight: 16, marginTop: 3 },
  receiptPicker: { minHeight: 76, borderRadius: 18, borderWidth: 1, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }, receiptPreview: { width: 54, height: 54, borderRadius: 14 }, receiptPlaceholder: { width: 54, height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, receiptTitle: { fontSize: 13, fontWeight: '900' }, receiptText: { fontSize: 11, marginTop: 4 }, removeReceipt: { fontSize: 12.5, fontWeight: '900', textAlign: 'center' },
  toggleRow: { minHeight: 72, borderRadius: 17, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }, toggleTitle: { fontSize: 13.5, fontWeight: '900' }, toggleText: { fontSize: 11, lineHeight: 14, marginTop: 4 }, fieldLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1 }, segment: { flexDirection: 'row', gap: 8 }, choice: { flex: 1, minHeight: 50, borderRadius: 15, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, choiceText: { fontSize: 12.5, fontWeight: '900' }, choiceWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, smallChoice: { minWidth: 48, minHeight: 41, borderRadius: 13, borderWidth: 1, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' }, smallChoiceText: { fontSize: 12, fontWeight: '900' },
  listTitle: { fontSize: 19, fontWeight: '900', marginTop: 3 }, reportCard: { gap: 11 }, reportIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, rowTitle: { fontSize: 15, fontWeight: '900' }, rowMeta: { fontSize: 12.5, lineHeight: 17, marginTop: 4 }, rowAmount: { fontSize: 14.5, fontWeight: '900' }, note: { fontSize: 13.5, lineHeight: 19 }, allocationWrap: { gap: 7 }, allocation: { minHeight: 46, borderRadius: 13, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, allocationText: { fontSize: 11.5 }, allocationAmount: { fontSize: 13.5, fontWeight: '900' }, receiptOpen: { minHeight: 46, borderRadius: 13, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, receiptOpenText: { fontSize: 13, fontWeight: '900' }, adminNote: { minHeight: 48, borderRadius: 13, borderWidth: 1, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 8 }, adminNoteText: { flex: 1, fontSize: 12.5, lineHeight: 17 }, reviewBox: { gap: 10 }, actionRow: { flexDirection: 'row', gap: 8 }, actionButton: { flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, actionText: { fontSize: 13, fontWeight: '900' }, cancelButton: { minHeight: 45, borderWidth: 1, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, cancelText: { fontSize: 13, fontWeight: '900' },
  detailOverlay: { flex: 1, backgroundColor: 'rgba(5,9,20,0.28)', justifyContent: 'flex-end' }, detailModal: { maxHeight: '97%', borderTopLeftRadius: 27, borderTopRightRadius: 27, borderWidth: 1, paddingTop: 8, overflow: 'hidden' }, detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingTop: 5, paddingBottom: 14 }, detailHeaderIcon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, detailTitle: { fontSize: 21, fontWeight: '900' }, detailScroll: { paddingHorizontal: 17, paddingBottom: 44, gap: 14 }, detailHero: { minHeight: 142, borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, detailHeroValue: { color: '#fff', fontSize: 35, fontWeight: '900', marginTop: 8 }, detailCard: { gap: 11 }, detailSectionTitle: { fontSize: 18.5, fontWeight: '900' }, detailLine: { minHeight: 66, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 11 }, detailValue: { fontSize: 15.5, lineHeight: 20, fontWeight: '800', marginTop: 4 }, detailItem: { minHeight: 68, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 11 },
  periodCard: { gap: 11 }, periodIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, periodMetrics: { flexDirection: 'row', gap: 7 }, mini: { flex: 1, minWidth: 0, minHeight: 66, borderRadius: 14, padding: 9, justifyContent: 'center' }, miniValue: { fontSize: 14.5, fontWeight: '900' }, miniLabel: { fontSize: 11.5, lineHeight: 14, fontWeight: '800', marginTop: 5 }, chargeCard: { gap: 9, borderWidth: 1, borderRadius: 18, padding: 14 }, chargeIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
