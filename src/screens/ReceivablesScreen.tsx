import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { FormField } from '../components/FormField';
import { GlassCard } from '../components/GlassCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { money } from '../lib/format';
import { supabase } from '../lib/supabase';

type ReceivableFilter = 'open' | 'today' | 'overdue' | 'partial' | 'paid' | 'cancelled' | 'all';
type ReceivableStatus = 'not_set' | 'open' | 'closed' | 'cancelled';
type PaymentMethod = 'cash' | 'transfer';
type NoteVisibility = 'staff' | 'customer';

interface ReceivableSummary {
  open_count: number;
  overdue_count: number;
  today_count: number;
  open_amount: number;
  overdue_amount: number;
  collected_amount: number;
}

interface ReceivableItem {
  work_order_id: string;
  customer_id: string;
  customer_name: string;
  customer_phone?: string | null;
  motorcycle_id: string;
  brand: string;
  model: string;
  plate?: string | null;
  complaint: string;
  arrived_at: string;
  total_amount: number;
  amount_received: number;
  remaining_amount: number;
  payment_status: string;
  receivable_status: ReceivableStatus;
  debt_promised_date?: string | null;
  debt_written_at?: string | null;
  debt_closed_at?: string | null;
  last_payment_at?: string | null;
  cash_total: number;
  transfer_total: number;
  days_overdue: number;
  debt_note?: string | null;
  debt_customer_note?: string | null;
}

interface PaymentRow {
  id: string;
  amount: number;
  payment_method: PaymentMethod;
  note?: string | null;
  paid_at: string;
  collection_source?: string;
}

interface ReceivableNote {
  id: string;
  visibility: NoteVisibility;
  note: string;
  author_name?: string | null;
  created_at: string;
}

interface ReceivableEvent {
  id: string;
  event_type: string;
  amount?: number | null;
  payment_method?: PaymentMethod | null;
  old_status?: ReceivableStatus | null;
  new_status?: ReceivableStatus | null;
  note?: string | null;
  actor_name?: string | null;
  created_at: string;
}

interface ReceivableDetail extends ReceivableItem {
  payments: PaymentRow[];
  notes: ReceivableNote[];
  events: ReceivableEvent[];
}

const EMPTY_SUMMARY: ReceivableSummary = {
  open_count: 0,
  overdue_count: 0,
  today_count: 0,
  open_amount: 0,
  overdue_amount: 0,
  collected_amount: 0,
};

const FILTERS: { value: ReceivableFilter; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'open', label: 'Açık', icon: 'wallet' },
  { value: 'today', label: 'Bugün', icon: 'today' },
  { value: 'overdue', label: 'Geciken', icon: 'alert-circle' },
  { value: 'partial', label: 'Kısmi', icon: 'pie-chart' },
  { value: 'paid', label: 'Ödenen', icon: 'checkmark-done' },
  { value: 'cancelled', label: 'Kapatılan', icon: 'close-circle' },
  { value: 'all', label: 'Tümü', icon: 'albums' },
];

const EVENT_LABELS: Record<string, string> = {
  receivable_opened: 'Borç / veresiye açıldı',
  receivable_updated: 'Alacak bilgisi güncellendi',
  receivable_cancelled: 'Tahsil edilemedi / kapatıldı',
  receivable_reopened: 'Alacak yeniden açıldı',
  payment_added: 'Tahsilat kaydedildi',
  payment_removed: 'Tahsilat silindi',
  customer_note_added: 'Müşteri notu eklendi',
  staff_note_added: 'Personel notu eklendi',
  reminder_created: 'Müşteri hatırlatması oluşturuldu',
  demo_receivable_ready: 'Demo alacak kaydı hazırlandı',
};

function dateTime(value?: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value));
}

function dateOnly(value?: string | null) {
  if (!value) return 'Tarih belirlenmedi';
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(`${value}T12:00:00`));
}

function statusLabel(item: Pick<ReceivableItem, 'receivable_status' | 'payment_status' | 'days_overdue' | 'debt_promised_date'>) {
  if (item.receivable_status === 'closed') return 'Tam ödendi';
  if (item.receivable_status === 'cancelled') return 'Kapatıldı';
  if (item.days_overdue > 0) return `${item.days_overdue} gün gecikti`;
  if (item.debt_promised_date === new Date().toISOString().slice(0, 10)) return 'Bugün ödeme günü';
  if (item.payment_status === 'partial') return 'Kısmi ödendi';
  return 'Ödenmedi';
}

export function ReceivablesScreen() {
  const { colors } = useTheme();
  const { workshop, membership, isAdmin } = useAuth();
  const [filter, setFilter] = useState<ReceivableFilter>('open');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<ReceivableItem[]>([]);
  const [summary, setSummary] = useState<ReceivableSummary>(EMPTY_SUMMARY);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const canView = isAdmin || membership?.role === 'owner' || membership?.role === 'owner_mechanic' || membership?.role === 'mechanic';

  const load = useCallback(async () => {
    if (!workshop || !canView) { setItems([]); setSummary(EMPTY_SUMMARY); return; }
    const [listResult, summaryResult] = await Promise.all([
      supabase.rpc('staff_get_receivables', { p_workshop_id: workshop.id, p_filter: filter, p_search: search.trim() || null }),
      supabase.rpc('staff_get_receivable_summary', { p_workshop_id: workshop.id }),
    ]);
    if (listResult.error) Alert.alert('Alacaklar alınamadı', listResult.error.message);
    else setItems((listResult.data as ReceivableItem[] | null) ?? []);
    if (!summaryResult.error && summaryResult.data) setSummary(summaryResult.data as ReceivableSummary);
  }, [workshop, canView, filter, search]);

  useEffect(() => {
    const timer = setTimeout(load, 260);
    return () => clearTimeout(timer);
  }, [load]);

  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  if (!canView) return <ScrollView contentContainerStyle={styles.content}><ScreenHeader eyebrow="FİNANS GİZLİ" title="Alacaklar" subtitle="Çırak hesabı müşteri borç ve tahsilat bilgilerini göremez." /><GlassCard style={styles.empty}><Ionicons name="eye-off" size={45} color={colors.orange} /><Text style={[styles.emptyTitle, { color: colors.text }]}>Bu ekran yetkin dışında</Text><Text style={[styles.emptyText, { color: colors.textMuted }]}>Finansal bilgiler yalnız Admin, İşletme Sahibi ve yetkili Usta hesaplarında gösterilir.</Text></GlassCard></ScrollView>;

  if (selectedId) return <ReceivableDetailView orderId={selectedId} onBack={() => { setSelectedId(null); load(); }} />;

  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}>
    <ScreenHeader eyebrow="v0.5 ALACAK TAKİBİ" title="Alacaklar" subtitle={`${workshop?.name ?? 'DraBornGarage'} • Borç, kısmi ödeme ve söz tarihi merkezi`} actionIcon="refresh" onAction={load} />

    <LinearGradient colors={[colors.primary, colors.primary2, colors.cyan]} style={styles.hero}>
      <View><Text style={styles.heroLabel}>AÇIK ALACAK</Text><Text style={styles.heroValue}>{money(summary.open_amount)}</Text><Text style={styles.heroMeta}>{summary.open_count} açık kayıt</Text></View>
      <View style={styles.heroRight}><View style={styles.heroIcon}><Ionicons name="wallet" size={27} color="#fff" /></View><Text style={styles.heroSmall}>Geciken {money(summary.overdue_amount)}</Text></View>
    </LinearGradient>

    <View style={styles.summaryRow}>
      <SummaryCard label="Bugün" value={String(summary.today_count)} icon="today" accent={colors.orange} />
      <SummaryCard label="Geciken" value={String(summary.overdue_count)} icon="alert-circle" accent={colors.red} />
      <SummaryCard label="Toplanan" value={money(summary.collected_amount)} icon="checkmark-done" accent={colors.green} />
    </View>

    <GlassCard style={styles.searchCard}><FormField label="Müşteri, telefon veya plaka ara" value={search} onChangeText={setSearch} placeholder="Örn. Ahmet veya 31 ABC 123" /></GlassCard>

    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
      {FILTERS.map((item) => {
        const active = filter === item.value;
        return <AnimatedPressable key={item.value} onPress={() => setFilter(item.value)} style={[styles.filter, { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border }]}><Ionicons name={item.icon} size={16} color={active ? '#fff' : colors.textMuted} /><Text style={[styles.filterText, { color: active ? '#fff' : colors.textMuted }]}>{item.label}</Text></AnimatedPressable>;
      })}
    </ScrollView>

    {items.length === 0 ? <GlassCard style={styles.empty}><Ionicons name="receipt-outline" size={44} color={colors.textMuted} /><Text style={[styles.emptyTitle, { color: colors.text }]}>Kayıt bulunamadı</Text><Text style={[styles.emptyText, { color: colors.textMuted }]}>Bu filtreye uyan alacak veya ödeme kaydı yok.</Text></GlassCard> : items.map((item) => <ReceivableCard key={item.work_order_id} item={item} onPress={() => setSelectedId(item.work_order_id)} />)}
  </ScrollView>;
}

function ReceivableCard({ item, onPress }: { item: ReceivableItem; onPress: () => void }) {
  const { colors } = useTheme();
  const accent = item.receivable_status === 'closed' ? colors.green : item.receivable_status === 'cancelled' ? colors.textMuted : item.days_overdue > 0 ? colors.red : item.payment_status === 'partial' ? colors.orange : colors.primary;
  return <AnimatedPressable onPress={onPress} style={[styles.card, { backgroundColor: colors.card, borderColor: `${accent}65` }]}>
    <View style={styles.cardTop}><View style={[styles.cardIcon, { backgroundColor: `${accent}18` }]}><Ionicons name={item.receivable_status === 'closed' ? 'checkmark-done' : item.days_overdue > 0 ? 'alert' : 'wallet'} size={23} color={accent} /></View><View style={styles.copy}><Text style={[styles.cardTitle, { color: colors.text }]}>{item.customer_name}</Text><Text style={[styles.cardMeta, { color: colors.textMuted }]}>{item.brand} {item.model} • {item.plate || 'Plaka yok'}</Text></View><View style={[styles.badge, { backgroundColor: `${accent}16`, borderColor: `${accent}45` }]}><Text style={[styles.badgeText, { color: accent }]}>{statusLabel(item)}</Text></View></View>
    <Text numberOfLines={2} style={[styles.complaint, { color: colors.textSoft }]}>{item.complaint}</Text>
    <View style={styles.amountGrid}><Amount label="TOPLAM" value={money(item.total_amount)} /><Amount label="ÖDENEN" value={money(item.amount_received)} accent={colors.green} /><Amount label="KALAN" value={money(item.remaining_amount)} accent={item.remaining_amount > 0 ? accent : colors.green} /></View>
    <View style={[styles.dueRow, { borderTopColor: colors.border }]}><Ionicons name="calendar" size={17} color={accent} /><Text style={[styles.dueText, { color: colors.textMuted }]}>Söz tarihi: {dateOnly(item.debt_promised_date)}</Text><Ionicons name="chevron-forward" size={18} color={colors.textMuted} /></View>
  </AnimatedPressable>;
}

function ReceivableDetailView({ orderId, onBack }: { orderId: string; onBack: () => void }) {
  const { colors } = useTheme();
  const [detail, setDetail] = useState<ReceivableDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [staffNote, setStaffNote] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentNote, setPaymentNote] = useState('');
  const [newNote, setNewNote] = useState('');
  const [noteVisibility, setNoteVisibility] = useState<NoteVisibility>('staff');

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('staff_get_receivable_detail', { p_work_order_id: orderId });
    if (error) return Alert.alert('Alacak detayı alınamadı', error.message);
    const next = data as ReceivableDetail;
    setDetail(next);
    setDueDate(next.debt_promised_date ?? '');
    setStaffNote(next.debt_note ?? '');
    setCustomerNote(next.debt_customer_note ?? '');
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  const run = async (promise: PromiseLike<{ error: any }>, success?: string) => {
    setLoading(true);
    const result = await promise;
    setLoading(false);
    if (result.error) return Alert.alert('İşlem tamamlanamadı', result.error.message);
    await load();
    if (success) Alert.alert(success);
  };

  const saveReceivable = async () => {
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return Alert.alert('Tarih biçimi', 'Tarihi YYYY-AA-GG şeklinde gir. Örn. 2026-07-20');
    await run(supabase.rpc('staff_open_receivable', {
      p_work_order_id: orderId,
      p_due_date: dueDate || null,
      p_staff_note: staffNote.trim() || null,
      p_customer_note: customerNote.trim() || null,
    }), detail?.receivable_status === 'open' ? 'Alacak bilgisi güncellendi' : 'Borç / veresiye kaydı açıldı');
  };

  const recordPayment = async () => {
    const amount = Number(paymentAmount.replace(',', '.'));
    if (amount <= 0) return Alert.alert('Geçerli tahsilat tutarı gir');
    await run(supabase.rpc('staff_record_payment', {
      p_work_order_id: orderId,
      p_amount: amount,
      p_method: paymentMethod,
      p_note: paymentNote.trim() || null,
      p_paid_at: new Date().toISOString(),
      p_collection_source: 'receivable',
    }), 'Tahsilat kaydedildi');
    setPaymentAmount(''); setPaymentNote('');
  };

  const addNote = async () => {
    if (newNote.trim().length < 2) return Alert.alert('Not çok kısa');
    await run(supabase.rpc('staff_add_receivable_note', { p_work_order_id: orderId, p_note: newNote.trim(), p_visibility: noteVisibility }), 'Not eklendi');
    setNewNote('');
  };

  const reminder = () => Alert.alert('Müşteri hatırlatması', 'Müşterinin panelinde görünecek bir ödeme hatırlatması oluşturulsun mu?', [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Oluştur', onPress: () => run(supabase.rpc('staff_create_receivable_reminder', { p_work_order_id: orderId, p_note: null }), 'Hatırlatma müşteri paneline eklendi') },
  ]);

  const cancel = () => Alert.alert('Tahsil edilemedi / kapat', 'Kalan tutar silinmez; kayıt kapatılmış alacak olarak geçmişte tutulur.', [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Kaydı Kapat', style: 'destructive', onPress: () => run(supabase.rpc('staff_cancel_receivable', { p_work_order_id: orderId, p_note: staffNote.trim() || 'Tahsil edilemedi / kapatıldı' }), 'Alacak kaydı kapatıldı') },
  ]);

  const reopen = () => run(supabase.rpc('staff_reopen_receivable', { p_work_order_id: orderId, p_due_date: dueDate || null, p_note: 'Personel tarafından yeniden açıldı' }), 'Alacak yeniden açıldı');

  if (!detail) return <View style={styles.loading}><Text style={{ color: colors.textMuted }}>Alacak detayı yükleniyor…</Text></View>;

  const statusAccent = detail.receivable_status === 'closed' ? colors.green : detail.receivable_status === 'cancelled' ? colors.red : detail.days_overdue > 0 ? colors.red : colors.orange;

  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.detailHeader}><AnimatedPressable onPress={onBack} style={[styles.back, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="arrow-back" size={22} color={colors.text} /></AnimatedPressable><View style={styles.copy}><Text style={[styles.detailTitle, { color: colors.text }]}>{detail.customer_name}</Text><Text style={[styles.cardMeta, { color: colors.textMuted }]}>{detail.brand} {detail.model} • {detail.plate || 'Plaka yok'}</Text></View><View style={[styles.badge, { backgroundColor: `${statusAccent}16`, borderColor: `${statusAccent}45` }]}><Text style={[styles.badgeText, { color: statusAccent }]}>{statusLabel(detail)}</Text></View></View>

    <LinearGradient colors={[colors.primary, colors.primary2, colors.cyan]} style={styles.detailHero}><View><Text style={styles.heroLabel}>KALAN BORÇ</Text><Text style={styles.detailHeroValue}>{money(detail.remaining_amount)}</Text><Text style={styles.heroMeta}>Toplam {money(detail.total_amount)}</Text></View><View style={styles.heroRight}><Text style={styles.heroLabel}>ÖDENEN</Text><Text style={styles.detailPaid}>{money(detail.amount_received)}</Text></View></LinearGradient>

    <GlassCard style={styles.stack}><View style={styles.cardTop}><View style={[styles.cardIcon, { backgroundColor: `${statusAccent}18` }]}><Ionicons name="calendar" size={22} color={statusAccent} /></View><View style={styles.copy}><Text style={[styles.cardTitle, { color: colors.text }]}>Ödeme sözü</Text><Text style={[styles.cardMeta, { color: colors.textMuted }]}>{dateOnly(detail.debt_promised_date)} • Açılış {dateTime(detail.debt_written_at)}</Text></View></View>{detail.debt_customer_note && <Text style={[styles.customerMessage, { color: colors.textSoft, backgroundColor: `${colors.cyan}0E`, borderColor: `${colors.cyan}35` }]}>{detail.debt_customer_note}</Text>}</GlassCard>

    <Section title="Borç / veresiye bilgisi" subtitle="Söz tarihi, personel notu ve müşterinin göreceği açıklama." />
    <GlassCard style={styles.stack}>
      <FormField label="Ödeme sözü tarihi (YYYY-AA-GG)" value={dueDate} onChangeText={setDueDate} placeholder="2026-07-20" />
      <FormField label="Personel özel notu" value={staffNote} onChangeText={setStaffNote} multiline placeholder="Müşterinin ödeme sözü veya dahili bilgi" />
      <FormField label="Müşterinin göreceği ödeme notu" value={customerNote} onChangeText={setCustomerNote} multiline placeholder="Kalan ödeme ve tarih bilgisi" />
      {detail.remaining_amount > 0 && <PrimaryButton title={detail.receivable_status === 'open' ? 'Alacak Bilgisini Güncelle' : 'Borç / Veresiye Kaydını Aç'} onPress={saveReceivable} loading={loading} />}
      {detail.receivable_status !== 'open' && detail.remaining_amount > 0 && <PrimaryButton title="Alacağı Yeniden Aç" onPress={reopen} loading={loading} secondary />}
    </GlassCard>

    {detail.receivable_status === 'open' && detail.remaining_amount > 0 && <>
      <Section title="Ödeme al" subtitle="Yalnız Nakit veya IBAN / banka transferi kaydedilir." />
      <GlassCard style={styles.stack}>
        <Toggle active={paymentMethod} onChange={setPaymentMethod} values={[['cash','Nakit'],['transfer','IBAN']]} />
        <FormField label="Tahsilat tutarı" value={paymentAmount} onChangeText={setPaymentAmount} keyboardType="decimal-pad" placeholder={String(detail.remaining_amount)} />
        <FormField label="Tahsilat notu (opsiyonel)" value={paymentNote} onChangeText={setPaymentNote} />
        <PrimaryButton title="Tahsilatı Kaydet" onPress={recordPayment} loading={loading} />
        <View style={styles.twoCol}><View style={styles.flex}><PrimaryButton title="Hatırlatma Gönder" onPress={reminder} loading={loading} secondary /></View><View style={styles.flex}><PrimaryButton title="Tahsil Edilemedi / Kapat" onPress={cancel} loading={loading} secondary /></View></View>
      </GlassCard>
    </>}

    <Section title="Tahsilat geçmişi" subtitle={`Nakit ve IBAN hareketleri • Son ödeme ${dateTime(detail.last_payment_at)}`} />
    <GlassCard style={styles.listCard}>{detail.payments.length === 0 ? <Empty text="Henüz tahsilat yok." /> : detail.payments.map((item, index) => <View key={item.id} style={[styles.listRow, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}><View style={[styles.smallIcon, { backgroundColor: item.payment_method === 'cash' ? `${colors.green}16` : `${colors.cyan}16` }]}><Ionicons name={item.payment_method === 'cash' ? 'cash' : 'business'} size={18} color={item.payment_method === 'cash' ? colors.green : colors.cyan} /></View><View style={styles.copy}><Text style={[styles.cardTitle, { color: colors.text }]}>{item.payment_method === 'cash' ? 'Nakit' : 'IBAN / Banka Transferi'}</Text><Text style={[styles.cardMeta, { color: colors.textMuted }]}>{dateTime(item.paid_at)}{item.note ? ` • ${item.note}` : ''}</Text></View><Text style={[styles.paymentValue, { color: colors.green }]}>{money(item.amount)}</Text></View>)}</GlassCard>

    <Section title="Müşteri ve personel notları" subtitle="Müşteri notları uygulamada görünür; özel notlar yalnız yetkili personeldedir." />
    <GlassCard style={styles.listCard}>{detail.notes.length === 0 ? <Empty text="Alacak notu yok." /> : detail.notes.map((item, index) => <View key={item.id} style={[styles.listRow, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}><View style={[styles.smallIcon, { backgroundColor: item.visibility === 'customer' ? `${colors.cyan}16` : `${colors.primary}16` }]}><Ionicons name={item.visibility === 'customer' ? 'eye' : 'lock-closed'} size={18} color={item.visibility === 'customer' ? colors.cyan : colors.primary} /></View><View style={styles.copy}><Text style={[styles.noteText, { color: colors.text }]}>{item.note}</Text><Text style={[styles.cardMeta, { color: colors.textMuted }]}>{item.visibility === 'customer' ? 'Müşteri görebilir' : 'Yalnız personel'} • {item.author_name || 'Personel'} • {dateTime(item.created_at)}</Text></View></View>)}</GlassCard>
    <GlassCard style={styles.stack}><Toggle active={noteVisibility} onChange={setNoteVisibility} values={[['staff','Personel Özel'],['customer','Müşteriye Açık']]} /><FormField label="Yeni alacak notu" value={newNote} onChangeText={setNewNote} multiline /><PrimaryButton title="Notu Ekle" onPress={addNote} loading={loading} /></GlassCard>

    <Section title="Alacak hareketleri" subtitle="Borç açma, ödeme, hatırlatma ve kapanış kayıtları." />
    <GlassCard style={styles.listCard}>{detail.events.length === 0 ? <Empty text="Hareket kaydı yok." /> : detail.events.map((item, index) => <View key={item.id} style={[styles.eventRow, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}><View style={[styles.eventDot, { backgroundColor: `${colors.primary}20` }]}><Ionicons name="pulse" size={15} color={colors.primary} /></View><View style={styles.copy}><Text style={[styles.cardTitle, { color: colors.text }]}>{EVENT_LABELS[item.event_type] || item.event_type}</Text><Text style={[styles.cardMeta, { color: colors.textMuted }]}>{dateTime(item.created_at)} • {item.actor_name || 'Sistem'}{item.amount ? ` • ${money(item.amount)}` : ''}</Text>{item.note && <Text style={[styles.eventNote, { color: colors.textSoft }]}>{item.note}</Text>}</View></View>)}</GlassCard>
  </ScrollView>;
}

function SummaryCard({ label, value, icon, accent }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap; accent: string }) {
  const { colors } = useTheme();
  return <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: `${accent}35` }]}><View style={[styles.summaryIcon, { backgroundColor: `${accent}16` }]}><Ionicons name={icon} size={19} color={accent} /></View><Text numberOfLines={1} style={[styles.summaryValue, { color: colors.text }]}>{value}</Text><Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{label}</Text></View>;
}

function Amount({ label, value, accent }: { label: string; value: string; accent?: string }) { const { colors } = useTheme(); return <View style={[styles.amountBox, { backgroundColor: colors.surfaceSoft }]}><Text style={[styles.amountLabel, { color: colors.textMuted }]}>{label}</Text><Text numberOfLines={1} style={[styles.amountValue, { color: accent ?? colors.text }]}>{value}</Text></View>; }
function Section({ title, subtitle }: { title: string; subtitle: string }) { const { colors } = useTheme(); return <View><Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.sectionSub, { color: colors.textMuted }]}>{subtitle}</Text></View>; }
function Empty({ text }: { text: string }) { const { colors } = useTheme(); return <Text style={[styles.emptyText, { color: colors.textMuted }]}>{text}</Text>; }

function Toggle<T extends string>({ values, active, onChange }: { values: [T,string][]; active: T; onChange: (value: T) => void }) {
  const { colors } = useTheme();
  return <View style={[styles.toggle, { backgroundColor: colors.surfaceSoft }]}>{values.map(([value,label]) => <AnimatedPressable key={value} onPress={() => onChange(value)} style={[styles.toggleItem, active === value && { backgroundColor: colors.cardStrong }]}><Text style={[styles.toggleText, { color: active === value ? colors.text : colors.textMuted }]}>{label}</Text></AnimatedPressable>)}</View>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 18, paddingTop: 56, paddingBottom: 120, gap: 15 },
  hero: { minHeight: 154, borderRadius: 28, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLabel: { color: 'rgba(255,255,255,0.82)', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  heroValue: { color: '#fff', fontSize: 37, fontWeight: '900', marginTop: 7 },
  heroMeta: { color: 'rgba(255,255,255,0.82)', fontSize: 14, marginTop: 5 },
  heroRight: { alignItems: 'flex-end', gap: 11 },
  heroIcon: { width: 55, height: 55, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  heroSmall: { color: '#fff', fontSize: 14.5, fontWeight: '800' },
  summaryRow: { flexDirection: 'row', gap: 8 },
  summaryCard: { flex: 1, minWidth: 0, borderWidth: 1, borderRadius: 20, padding: 12, minHeight: 112 },
  summaryIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  summaryValue: { fontSize: 16, fontWeight: '900', marginTop: 9 },
  summaryLabel: { fontSize: 12, fontWeight: '800', marginTop: 3 },
  searchCard: { padding: 12 },
  filters: { gap: 8, paddingRight: 16 },
  filter: { minHeight: 48, borderWidth: 1, borderRadius: 999, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 6 },
  filterText: { fontSize: 14, fontWeight: '900' },
  card: { borderWidth: 1, borderRadius: 24, padding: 16, gap: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 17, fontWeight: '900' },
  cardMeta: { fontSize: 13.5, lineHeight: 18, marginTop: 3 },
  badge: { maxWidth: 132, borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 },
  badgeText: { fontSize: 12, fontWeight: '900', textAlign: 'center' },
  complaint: { fontSize: 15, lineHeight: 21 },
  amountGrid: { flexDirection: 'row', gap: 7 },
  amountBox: { flex: 1, minWidth: 0, borderRadius: 15, padding: 10, minHeight: 70, justifyContent: 'center' },
  amountLabel: { fontSize: 11, fontWeight: '900' },
  amountValue: { fontSize: 15.5, fontWeight: '900', marginTop: 5 },
  dueRow: { borderTopWidth: 1, paddingTop: 11, flexDirection: 'row', alignItems: 'center', gap: 7 },
  dueText: { flex: 1, fontSize: 14, lineHeight: 19 },
  empty: { alignItems: 'center', gap: 9, paddingVertical: 32 },
  emptyTitle: { fontSize: 17, fontWeight: '900' },
  emptyText: { fontSize: 14, lineHeight: 20, textAlign: 'center', paddingVertical: 8 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  back: { width: 46, height: 46, borderWidth: 1, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  detailTitle: { fontSize: 23, fontWeight: '900' },
  detailHero: { minHeight: 135, borderRadius: 25, padding: 19, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  detailHeroValue: { color: '#fff', fontSize: 31, fontWeight: '900', marginTop: 6 },
  detailPaid: { color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 7 },
  stack: { gap: 12 },
  customerMessage: { borderWidth: 1, borderRadius: 15, padding: 12, fontSize: 14.5, lineHeight: 20 },
  sectionTitle: { fontSize: 20, fontWeight: '900' },
  sectionSub: { fontSize: 14, lineHeight: 19, marginTop: 4 },
  twoCol: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
  toggle: { flexDirection: 'row', padding: 4, borderRadius: 15 },
  toggleItem: { flex: 1, minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  toggleText: { fontSize: 14, fontWeight: '900' },
  listCard: { paddingVertical: 4 },
  listRow: { minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 9 },
  smallIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  paymentValue: { fontSize: 15.5, fontWeight: '900' },
  noteText: { fontSize: 14.5, lineHeight: 20, fontWeight: '700' },
  eventRow: { minHeight: 62, flexDirection: 'row', alignItems: 'flex-start', gap: 9, paddingVertical: 10 },
  eventDot: { width: 30, height: 30, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  eventNote: { fontSize: 14, lineHeight: 19, marginTop: 4 },
});
