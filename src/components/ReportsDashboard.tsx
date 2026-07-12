import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { money } from '../lib/format';
import { supabase } from '../lib/supabase';
import { AnimatedPressable } from './AnimatedPressable';
import { GlassCard } from './GlassCard';

type Period = 'today' | 'week' | 'month' | 'all';
type ViewMode = 'business' | 'personal';

type Summary = Record<string, number | string>;

type HourlyPoint = { hour: number; order_count: number; recorded_amount?: number };
type DailyPoint = { date: string; order_count: number; recorded_amount: number; received_amount?: number };

type MechanicRow = {
  user_id: string;
  full_name: string;
  phone?: string | null;
  role: string;
  is_active: boolean;
  order_count: number;
  active_order_count: number;
  service_count: number;
  completed_service_count: number;
  recorded_amount: number;
  parts_count: number;
  cash_collected: number;
  transfer_collected: number;
};

type ServiceRow = { id?: string; title: string; description?: string | null; price: number; completed: boolean; started_at?: string | null; completed_at?: string | null; mechanic_name?: string | null };
type PartRow = { id?: string; part_name: string; quantity: number; unit_price?: number; total_price: number; used_at?: string | null };

type JobRow = {
  work_order_id: string;
  arrived_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  delivered_at?: string | null;
  status: string;
  complaint: string;
  customer_name: string;
  brand: string;
  model: string;
  plate?: string | null;
  recorded_amount: number;
  total_amount?: number;
  amount_received?: number;
  remaining_amount?: number;
  payment_status?: string;
  receivable_status?: string;
  mechanic_name?: string | null;
  services: ServiceRow[];
  parts: PartRow[];
};

type TopService = { title: string; service_count: number; recorded_amount: number };

type PersonalReport = { summary: Summary; hourly_arrivals: HourlyPoint[]; daily_trend: DailyPoint[]; jobs: JobRow[] };
type BusinessReport = { summary: Summary; mechanics: MechanicRow[]; hourly_arrivals: HourlyPoint[]; daily_trend: DailyPoint[]; top_services: TopService[]; recent_orders: JobRow[] };

const PERIODS: { value: Period; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'today', label: 'Bugün', icon: 'today' },
  { value: 'week', label: 'Bu Hafta', icon: 'calendar' },
  { value: 'month', label: 'Bu Ay', icon: 'stats-chart' },
  { value: 'all', label: 'Tümü', icon: 'infinite' },
];

function rangeFor(period: Period) {
  const now = new Date();
  const from = new Date(now);
  if (period === 'today') from.setHours(0, 0, 0, 0);
  if (period === 'week') {
    const day = from.getDay() || 7;
    from.setDate(from.getDate() - day + 1);
    from.setHours(0, 0, 0, 0);
  }
  if (period === 'month') {
    from.setDate(1);
    from.setHours(0, 0, 0, 0);
  }
  if (period === 'all') from.setFullYear(2020, 0, 1), from.setHours(0, 0, 0, 0);
  const to = new Date(now.getTime() + 60_000);
  return { from: from.toISOString(), to: to.toISOString() };
}

function dateTime(value?: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function dayLabel(value: string) {
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short' }).format(new Date(`${value}T12:00:00`));
}

function n(value: unknown) { return Number(value || 0); }

export function ReportsDashboard() {
  const { colors } = useTheme();
  const { workshop, membership, isAdmin } = useAuth();
  const isOwner = isAdmin || membership?.role === 'owner' || membership?.role === 'owner_mechanic';
  const isMechanic = membership?.role === 'mechanic' || membership?.role === 'owner_mechanic';
  const [period, setPeriod] = useState<Period>('month');
  const [viewMode, setViewMode] = useState<ViewMode>(isOwner ? 'business' : 'personal');
  const [personal, setPersonal] = useState<PersonalReport | null>(null);
  const [business, setBusiness] = useState<BusinessReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setViewMode(isOwner ? 'business' : 'personal'); }, [isOwner, workshop?.id]);

  const load = useCallback(async () => {
    if (!workshop || membership?.role === 'apprentice') return;
    setLoading(true);
    const range = rangeFor(period);
    const calls: PromiseLike<any>[] = [];
    if (isOwner) calls.push(supabase.rpc('owner_get_business_report', { p_workshop_id: workshop.id, p_from: range.from, p_to: range.to }));
    if (isMechanic) calls.push(supabase.rpc('staff_get_personal_report', { p_workshop_id: workshop.id, p_from: range.from, p_to: range.to }));
    const results = await Promise.all(calls);
    setLoading(false);
    let index = 0;
    if (isOwner) {
      const result = results[index++];
      if (result.error) Alert.alert('İşletme raporu alınamadı', result.error.message);
      else setBusiness(result.data as BusinessReport);
    }
    if (isMechanic) {
      const result = results[index];
      if (result.error) Alert.alert('Kişisel usta raporu alınamadı', result.error.message);
      else setPersonal(result.data as PersonalReport);
    }
  }, [workshop, membership?.role, period, isOwner, isMechanic]);

  useEffect(() => { load(); }, [load]);

  if (membership?.role === 'apprentice') return null;

  return <View style={styles.root}>
    <View style={styles.sectionHeader}>
      <View style={styles.copy}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>v0.6 Rapor Merkezi</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>Kayıtlı işlem tutarları, tahsilatlar, alacaklar ve usta iş geçmişi.</Text>
      </View>
      <AnimatedPressable onPress={load} style={[styles.refresh, { backgroundColor: `${colors.primary}14`, borderColor: `${colors.primary}40` }]}><Ionicons name="refresh" size={18} color={colors.primary} /></AnimatedPressable>
    </View>

    {isOwner && isMechanic && <View style={[styles.modeSwitch, { backgroundColor: colors.surfaceSoft }]}>
      <ModeButton active={viewMode === 'business'} label="İşletme" icon="business" onPress={() => setViewMode('business')} />
      <ModeButton active={viewMode === 'personal'} label="Kişisel Usta" icon="person" onPress={() => setViewMode('personal')} />
    </View>}

    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periods}>
      {PERIODS.map((item) => <AnimatedPressable key={item.value} onPress={() => setPeriod(item.value)} style={[styles.periodButton, { backgroundColor: period === item.value ? colors.primary : colors.card, borderColor: period === item.value ? colors.primary : colors.border }]}><Ionicons name={item.icon} size={16} color={period === item.value ? '#fff' : colors.textMuted} /><Text style={[styles.periodText, { color: period === item.value ? '#fff' : colors.textMuted }]}>{item.label}</Text></AnimatedPressable>)}
    </ScrollView>

    {loading && <GlassCard style={styles.loading}><Ionicons name="sync" size={22} color={colors.primary} /><Text style={[styles.loadingText, { color: colors.textMuted }]}>Raporlar yenileniyor…</Text></GlassCard>}

    {!loading && viewMode === 'business' && isOwner && business && <BusinessView report={business} />}
    {!loading && viewMode === 'personal' && isMechanic && personal && <PersonalView report={personal} />}
  </View>;
}

function BusinessView({ report }: { report: BusinessReport }) {
  const { colors } = useTheme();
  const s = report.summary;
  const totalCollected = n(s.period_cash_collected) + n(s.period_transfer_collected);
  return <View style={styles.stack}>
    <LinearGradient colors={[colors.primary, colors.primary2, colors.cyan]} style={styles.hero}>
      <View><Text style={styles.heroLabel}>İŞLETMEDE KAYDEDİLEN TOPLAM</Text><Text style={styles.heroValue}>{money(n(s.total_recorded_amount))}</Text><Text style={styles.heroMeta}>{n(s.order_count)} servis kaydı • {n(s.customer_count)} müşteri</Text></View>
      <View style={styles.heroSide}><Ionicons name="analytics" size={29} color="#fff" /><Text style={styles.heroSideText}>Tahsil edilen{`\n`}{money(totalCollected)}</Text></View>
    </LinearGradient>

    <View style={styles.metricGrid}>
      <Metric icon="cash" label="Nakit" value={money(n(s.period_cash_collected))} accent={colors.green} />
      <Metric icon="business" label="IBAN" value={money(n(s.period_transfer_collected))} accent={colors.cyan} />
      <Metric icon="wallet" label="Açık Alacak" value={money(n(s.current_open_receivable))} accent={colors.red} />
      <Metric icon="construct" label="İşçilik" value={money(n(s.labor_amount))} accent={colors.primary} />
      <Metric icon="cog" label="Parça" value={money(n(s.parts_amount))} accent={colors.orange} />
      <Metric icon="checkmark-done" label="Tamamlanan" value={String(n(s.completed_order_count))} accent={colors.green} />
    </View>

    <ChartSection title="Günlük servis ve tutar" subtitle="Seçilen dönemde işletmeye gelen motorlar ve kaydedilen toplamlar." daily={report.daily_trend} hourly={report.hourly_arrivals} />

    <Text style={[styles.listTitle, { color: colors.text }]}>Usta Bazlı İş ve Tutar</Text>
    <Text style={[styles.listSubtitle, { color: colors.textMuted }]}>Bu rakamlar maaş, prim, yüzde veya ortaklık payı değildir; yalnız ustanın işlem satırlarına kaydedilen tutardır.</Text>
    <View style={styles.stack}>{report.mechanics.length === 0 ? <Empty text="Usta kaydı bulunamadı." /> : report.mechanics.map((item) => <MechanicCard key={item.user_id} item={item} />)}</View>

    <Text style={[styles.listTitle, { color: colors.text }]}>En Çok Yapılan İşlemler</Text>
    <GlassCard style={styles.listCard}>{report.top_services.length === 0 ? <Empty text="İşlem verisi yok." /> : report.top_services.map((item, index) => <View key={`${item.title}-${index}`} style={[styles.rankRow, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}><View style={[styles.rank, { backgroundColor: `${colors.primary}16` }]}><Text style={[styles.rankText, { color: colors.primary }]}>{index + 1}</Text></View><View style={styles.copy}><Text style={[styles.rowTitle, { color: colors.text }]}>{item.title}</Text><Text style={[styles.rowMeta, { color: colors.textMuted }]}>{item.service_count} işlem</Text></View><Text style={[styles.rowAmount, { color: colors.green }]}>{money(n(item.recorded_amount))}</Text></View>)}</GlassCard>

    <Text style={[styles.listTitle, { color: colors.text }]}>Son Servis Kayıtları</Text>
    <View style={styles.stack}>{report.recent_orders.length === 0 ? <Empty text="Bu dönemde servis kaydı yok." /> : report.recent_orders.slice(0, 30).map((item) => <BusinessJobCard key={item.work_order_id} item={item} />)}</View>
  </View>;
}

function PersonalView({ report }: { report: PersonalReport }) {
  const { colors } = useTheme();
  const s = report.summary;
  return <View style={styles.stack}>
    <LinearGradient colors={[colors.green, colors.cyan, colors.primary]} style={styles.hero}>
      <View><Text style={styles.heroLabel}>KAYDETTİĞİN TAMAMLANMIŞ İŞLEM TUTARI</Text><Text style={styles.heroValue}>{money(n(s.recorded_amount))}</Text><Text style={styles.heroMeta}>{n(s.completed_service_count)} tamamlanan işlem • {n(s.order_count)} motor</Text></View>
      <View style={styles.heroSide}><Ionicons name="person-circle" size={31} color="#fff" /><Text style={styles.heroSideText}>Aktif iş{`\n`}{n(s.active_order_count)}</Text></View>
    </LinearGradient>

    <View style={styles.metricGrid}>
      <Metric icon="cash" label="Tahsil Ettiğin Nakit" value={money(n(s.cash_collected))} accent={colors.green} />
      <Metric icon="business" label="Tahsil Ettiğin IBAN" value={money(n(s.transfer_collected))} accent={colors.cyan} />
      <Metric icon="wallet" label="Atanmış Açık Borç" value={money(n(s.open_receivable_amount))} accent={colors.red} />
      <Metric icon="construct" label="İşlem Sayısı" value={String(n(s.service_count))} accent={colors.primary} />
      <Metric icon="cog" label="Kullandığın Parça" value={String(n(s.parts_count))} accent={colors.orange} />
      <Metric icon="checkmark-circle" label="Tamamlanan Motor" value={String(n(s.completed_order_count))} accent={colors.green} />
    </View>

    <GlassCard><Text style={[styles.disclaimer, { color: colors.textMuted }]}>Kayıtlı işlem tutarı maaş, komisyon, prim, net kâr veya ortaklık payı değildir. Nakit ve IBAN kartları yalnız senin sisteme tahsil eden kişi olarak kaydedildiğin ödemeleri gösterir.</Text></GlassCard>

    <ChartSection title="Kişisel İş Akışın" subtitle="Saat saat gelen motorlar ve günlük kaydettiğin işlem tutarı." daily={report.daily_trend} hourly={report.hourly_arrivals} />

    <Text style={[styles.listTitle, { color: colors.text }]}>Kişisel İş Geçmişim</Text>
    <Text style={[styles.listSubtitle, { color: colors.textMuted }]}>Motorun geliş saati, yaptığın işlemler, kaydettiğin tutar ve kullandığın parçalar.</Text>
    <View style={styles.stack}>{report.jobs.length === 0 ? <Empty text="Bu dönemde sana ait iş kaydı yok." /> : report.jobs.map((item) => <PersonalJobCard key={item.work_order_id} item={item} />)}</View>
  </View>;
}

function ChartSection({ title, subtitle, daily, hourly }: { title: string; subtitle: string; daily: DailyPoint[]; hourly: HourlyPoint[] }) {
  const { colors } = useTheme();
  const dailyMax = Math.max(1, ...daily.map((item) => n(item.recorded_amount)));
  const hourlyMax = Math.max(1, ...hourly.map((item) => n(item.order_count)));
  return <View style={styles.stack}>
    <View><Text style={[styles.listTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.listSubtitle, { color: colors.textMuted }]}>{subtitle}</Text></View>
    <GlassCard style={styles.chartCard}>
      <Text style={[styles.chartLabel, { color: colors.textMuted }]}>GÜNLÜK KAYITLI TUTAR</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bars}>
        {daily.slice(-31).map((item) => <View key={item.date} style={styles.barColumn}><Text style={[styles.barValue, { color: colors.text }]}>{n(item.recorded_amount) > 0 ? `${Math.round(n(item.recorded_amount) / 100) / 10}K` : '0'}</Text><View style={[styles.barTrack, { backgroundColor: colors.surfaceSoft }]}><LinearGradient colors={[colors.primary, colors.cyan]} style={[styles.barFill, { height: `${Math.max(5, (n(item.recorded_amount) / dailyMax) * 100)}%` }]} /></View><Text style={[styles.barLabel, { color: colors.textMuted }]}>{dayLabel(item.date)}</Text></View>)}
      </ScrollView>
    </GlassCard>
    <GlassCard style={styles.chartCard}>
      <Text style={[styles.chartLabel, { color: colors.textMuted }]}>SAAT SAAT GELEN MOTOR</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hourBars}>
        {hourly.map((item) => <View key={item.hour} style={styles.hourColumn}><Text style={[styles.hourValue, { color: colors.text }]}>{item.order_count}</Text><View style={[styles.hourTrack, { backgroundColor: colors.surfaceSoft }]}><View style={[styles.hourFill, { backgroundColor: colors.orange, height: `${Math.max(5, (n(item.order_count) / hourlyMax) * 100)}%` }]} /></View><Text style={[styles.barLabel, { color: colors.textMuted }]}>{String(item.hour).padStart(2, '0')}</Text></View>)}
      </ScrollView>
    </GlassCard>
  </View>;
}

function MechanicCard({ item }: { item: MechanicRow }) {
  const { colors } = useTheme();
  return <GlassCard style={styles.mechanicCard}>
    <View style={styles.row}><View style={[styles.avatar, { backgroundColor: `${colors.primary}18` }]}><Text style={[styles.avatarText, { color: colors.primary }]}>{item.full_name?.charAt(0) || 'U'}</Text></View><View style={styles.copy}><Text style={[styles.rowTitle, { color: colors.text }]}>{item.full_name}</Text><Text style={[styles.rowMeta, { color: colors.textMuted }]}>{item.role === 'owner_mechanic' ? 'İşletme Sahibi + Usta' : 'Usta'} • {item.is_active ? 'Aktif' : 'Pasif'}</Text></View><Text style={[styles.rowAmount, { color: colors.green }]}>{money(n(item.recorded_amount))}</Text></View>
    <View style={styles.miniGrid}><Mini label="Motor" value={String(n(item.order_count))} /><Mini label="İşlem" value={String(n(item.completed_service_count))} /><Mini label="Aktif" value={String(n(item.active_order_count))} /><Mini label="Parça" value={String(n(item.parts_count))} /></View>
    <View style={[styles.collectionRow, { borderTopColor: colors.border }]}><Text style={[styles.collectionText, { color: colors.textMuted }]}>Tahsil ettiği Nakit <Text style={{ color: colors.green, fontWeight: '900' }}>{money(n(item.cash_collected))}</Text></Text><Text style={[styles.collectionText, { color: colors.textMuted }]}>IBAN <Text style={{ color: colors.cyan, fontWeight: '900' }}>{money(n(item.transfer_collected))}</Text></Text></View>
  </GlassCard>;
}

function PersonalJobCard({ item }: { item: JobRow }) {
  const { colors } = useTheme();
  return <GlassCard style={styles.jobCard}>
    <View style={styles.row}><View style={[styles.jobIcon, { backgroundColor: `${colors.primary}18` }]}><Ionicons name="construct" size={22} color={colors.primary} /></View><View style={styles.copy}><Text style={[styles.rowTitle, { color: colors.text }]}>{item.brand} {item.model} • {item.plate || 'Plaka yok'}</Text><Text style={[styles.rowMeta, { color: colors.textMuted }]}>{item.customer_name} • Geliş {dateTime(item.arrived_at)}</Text></View><Text style={[styles.rowAmount, { color: colors.green }]}>{money(n(item.recorded_amount))}</Text></View>
    <Text style={[styles.complaint, { color: colors.textSoft }]}>{item.complaint}</Text>
    <SubList icon="construct" title="Yaptığın İşlemler" empty="İşlem satırı yok" items={item.services.map((s) => `${s.title} • ${money(n(s.price))}${s.completed ? '' : ' • Devam ediyor'}`)} />
    <SubList icon="cog" title="Kullandığın Parçalar" empty="Parça kaydı yok" items={item.parts.map((p) => `${p.part_name} • ${p.quantity} adet • ${money(n(p.total_price))}`)} />
  </GlassCard>;
}

function BusinessJobCard({ item }: { item: JobRow }) {
  const { colors } = useTheme();
  const remaining = n(item.remaining_amount);
  return <GlassCard style={styles.jobCard}>
    <View style={styles.row}><View style={[styles.jobIcon, { backgroundColor: `${colors.orange}18` }]}><Ionicons name="receipt" size={22} color={colors.orange} /></View><View style={styles.copy}><Text style={[styles.rowTitle, { color: colors.text }]}>{item.customer_name} • {item.plate || 'Plaka yok'}</Text><Text style={[styles.rowMeta, { color: colors.textMuted }]}>{item.brand} {item.model} • {item.mechanic_name || 'Usta atanmamış'} • {dateTime(item.arrived_at)}</Text></View><Text style={[styles.rowAmount, { color: colors.text }]}>{money(n(item.total_amount))}</Text></View>
    <View style={styles.miniGrid}><Mini label="Ödenen" value={money(n(item.amount_received))} accent={colors.green} /><Mini label="Kalan" value={money(remaining)} accent={remaining > 0 ? colors.red : colors.green} /><Mini label="İşlem" value={String(item.services?.length || 0)} /><Mini label="Parça" value={String(item.parts?.length || 0)} /></View>
  </GlassCard>;
}

function Metric({ icon, label, value, accent }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; accent: string }) {
  const { colors } = useTheme();
  return <View style={[styles.metric, { backgroundColor: colors.card, borderColor: `${accent}35` }]}><View style={[styles.metricIcon, { backgroundColor: `${accent}16` }]}><Ionicons name={icon} size={19} color={accent} /></View><Text numberOfLines={1} style={[styles.metricValue, { color: colors.text }]}>{value}</Text><Text style={[styles.metricLabel, { color: colors.textMuted }]}>{label}</Text></View>;
}

function Mini({ label, value, accent }: { label: string; value: string; accent?: string }) { const { colors } = useTheme(); return <View style={[styles.mini, { backgroundColor: colors.surfaceSoft }]}><Text numberOfLines={1} style={[styles.miniValue, { color: accent || colors.text }]}>{value}</Text><Text style={[styles.miniLabel, { color: colors.textMuted }]}>{label}</Text></View>; }

function SubList({ icon, title, items, empty }: { icon: keyof typeof Ionicons.glyphMap; title: string; items: string[]; empty: string }) { const { colors } = useTheme(); return <View style={[styles.subList, { borderTopColor: colors.border }]}><View style={styles.subHeader}><Ionicons name={icon} size={16} color={colors.textMuted} /><Text style={[styles.subTitle, { color: colors.textMuted }]}>{title}</Text></View>{items.length === 0 ? <Text style={[styles.subItem, { color: colors.textMuted }]}>{empty}</Text> : items.map((item, index) => <Text key={`${item}-${index}`} style={[styles.subItem, { color: colors.textSoft }]}>• {item}</Text>)}</View>; }

function ModeButton({ active, label, icon, onPress }: { active: boolean; label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) { const { colors } = useTheme(); return <AnimatedPressable onPress={onPress} style={[styles.modeButton, active && { backgroundColor: colors.cardStrong }]}><Ionicons name={icon} size={17} color={active ? colors.primary : colors.textMuted} /><Text style={[styles.modeText, { color: active ? colors.text : colors.textMuted }]}>{label}</Text></AnimatedPressable>; }
function Empty({ text }: { text: string }) { const { colors } = useTheme(); return <GlassCard><Text style={[styles.empty, { color: colors.textMuted }]}>{text}</Text></GlassCard>; }

const styles = StyleSheet.create({
  root: { gap: 14 }, stack: { gap: 12 }, copy: { flex: 1, minWidth: 0 }, row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 }, sectionTitle: { fontSize: 20, fontWeight: '900' }, sectionSubtitle: { fontSize: 10.5, lineHeight: 16, marginTop: 4 },
  refresh: { width: 42, height: 42, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  modeSwitch: { flexDirection: 'row', padding: 4, borderRadius: 16 }, modeButton: { flex: 1, minHeight: 44, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, modeText: { fontSize: 11, fontWeight: '900' },
  periods: { gap: 8, paddingRight: 10 }, periodButton: { minHeight: 42, borderWidth: 1, borderRadius: 999, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 6 }, periodText: { fontSize: 10, fontWeight: '900' },
  loading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, loadingText: { fontSize: 11, fontWeight: '800' },
  hero: { minHeight: 155, borderRadius: 27, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, heroLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 9, fontWeight: '900', letterSpacing: 1 }, heroValue: { color: '#fff', fontSize: 31, fontWeight: '900', marginTop: 8 }, heroMeta: { color: 'rgba(255,255,255,0.78)', fontSize: 10.5, marginTop: 5 }, heroSide: { alignItems: 'flex-end', gap: 12 }, heroSideText: { color: '#fff', fontSize: 10.5, lineHeight: 16, fontWeight: '800', textAlign: 'right' },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, metric: { width: '31.5%', minWidth: 0, minHeight: 107, borderWidth: 1, borderRadius: 19, padding: 10 }, metricIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, metricValue: { fontSize: 12.5, fontWeight: '900', marginTop: 9 }, metricLabel: { fontSize: 8.2, lineHeight: 12, fontWeight: '800', marginTop: 4 },
  disclaimer: { fontSize: 11.5, lineHeight: 18, textAlign: 'center' }, listTitle: { fontSize: 18, fontWeight: '900', marginTop: 3 }, listSubtitle: { fontSize: 10.5, lineHeight: 16, marginTop: -7 },
  chartCard: { gap: 12 }, chartLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1 }, bars: { alignItems: 'flex-end', gap: 8, minHeight: 150, paddingRight: 8 }, barColumn: { width: 42, alignItems: 'center', gap: 6 }, barValue: { fontSize: 8, fontWeight: '900' }, barTrack: { width: 20, height: 100, borderRadius: 8, overflow: 'hidden', justifyContent: 'flex-end' }, barFill: { width: '100%', borderRadius: 8 }, barLabel: { fontSize: 7.5, fontWeight: '800' },
  hourBars: { alignItems: 'flex-end', gap: 5, minHeight: 130, paddingRight: 8 }, hourColumn: { width: 27, alignItems: 'center', gap: 5 }, hourValue: { fontSize: 8, fontWeight: '900' }, hourTrack: { width: 12, height: 82, borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end' }, hourFill: { width: '100%', borderRadius: 6 },
  mechanicCard: { gap: 11 }, avatar: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, avatarText: { fontSize: 18, fontWeight: '900' }, rowTitle: { fontSize: 13.5, fontWeight: '900' }, rowMeta: { fontSize: 9.5, lineHeight: 14, marginTop: 3 }, rowAmount: { fontSize: 13, fontWeight: '900' },
  miniGrid: { flexDirection: 'row', gap: 6 }, mini: { flex: 1, minWidth: 0, minHeight: 58, borderRadius: 13, padding: 8, justifyContent: 'center' }, miniValue: { fontSize: 10.5, fontWeight: '900' }, miniLabel: { fontSize: 7.5, fontWeight: '800', marginTop: 4 },
  collectionRow: { borderTopWidth: 1, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between', gap: 8 }, collectionText: { fontSize: 8.5, flex: 1 },
  listCard: { paddingVertical: 4 }, rankRow: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 8 }, rank: { width: 35, height: 35, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, rankText: { fontSize: 13, fontWeight: '900' },
  jobCard: { gap: 10 }, jobIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, complaint: { fontSize: 11, lineHeight: 17 }, subList: { borderTopWidth: 1, paddingTop: 10, gap: 5 }, subHeader: { flexDirection: 'row', gap: 6, alignItems: 'center' }, subTitle: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 }, subItem: { fontSize: 10.5, lineHeight: 16 }, empty: { textAlign: 'center', paddingVertical: 10, fontSize: 11.5 },
});
