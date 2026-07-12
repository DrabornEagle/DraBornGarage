import fs from 'node:fs';
import path from 'node:path';

const read = (file) => fs.readFileSync(file, 'utf8');
const write = (file, value) => fs.writeFileSync(file, value);

function replaceRequired(file, before, after) {
  const source = read(file);
  if (!source.includes(before)) throw new Error(`${file}: target not found\n${before.slice(0, 160)}`);
  write(file, source.replace(before, after));
}

function replaceBlock(file, startMarker, endMarker, replacement) {
  const source = read(file);
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`${file}: start marker not found`);
  const endStart = source.indexOf(endMarker, start);
  if (endStart < 0) throw new Error(`${file}: end marker not found`);
  const end = endStart + endMarker.length;
  write(file, source.slice(0, start) + replacement + source.slice(end));
}

function walk(dir, callback) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, callback);
    else callback(full);
  }
}

replaceRequired(
  'src/AppShell.tsx',
  "      {tab !== 'home' && <NotificationBell />}",
  "      {!['customers', 'receivables'].includes(tab) && <NotificationBell />}",
);

replaceRequired(
  'src/screens/HomeScreen.tsx',
  `        subtitle={\`${'${'}workshop?.name ?? 'DraBornGarage'} • ${'${'}new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}\`}
        actionIcon="notifications-outline"
        onAction={() => undefined}`,
  `        subtitle={\`${'${'}workshop?.name ?? 'DraBornGarage'} • ${'${'}new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}\`}`,
);

const platformFile = 'src/components/PlatformFeesDashboard.tsx';
replaceRequired(
  platformFile,
  "type PlatformAccordionKey = 'paymentInfo' | 'paymentForm' | 'paymentReports' | 'periods' | 'charges';",
  "type PlatformAccordionKey = 'paymentInfo' | 'periods' | 'charges';",
);
replaceRequired(
  platformFile,
  `  const [expandedSections, setExpandedSections] = useState<Record<PlatformAccordionKey, boolean>>({
    paymentInfo: true,
    paymentForm: false,
    paymentReports: false,
    periods: false,
    charges: false,
  });`,
  `  const [expandedSections, setExpandedSections] = useState<Record<PlatformAccordionKey, boolean>>({
    paymentInfo: true,
    periods: false,
    charges: false,
  });`,
);

replaceBlock(
  platformFile,
  `    <AccordionSection
      title="Ödeme Bildir"`,
  `    </AccordionSection>`,
  `    <View style={styles.staticSection}>
      <StaticSectionHeader
        title="Ödeme Bildir"
        subtitle={number(s.available_to_report) > 0 ? 'Bildirilebilir tutar ' + money(number(s.available_to_report)) : 'Bildirilebilir açık borç bulunmuyor'}
        icon="paper-plane"
        accent={colors.green}
      />
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
    </View>`,
);

replaceBlock(
  platformFile,
  `    <AccordionSection
      title="Ödeme Bildirimleri"`,
  `    </AccordionSection>`,
  `    <View style={styles.staticSection}>
      <StaticSectionHeader
        title="Ödeme Bildirimleri"
        subtitle={dashboard.payment_reports.length + ' bildirim • ' + money(number(s.total_pending)) + ' onay bekliyor'}
        icon="notifications"
        accent={colors.cyan}
      />
      <View style={styles.stack}>{dashboard.payment_reports.length === 0 ? <Empty text="Henüz ödeme bildirimi yok." /> : dashboard.payment_reports.map((report) => <PaymentReportCard key={report.id} report={report} isAdmin={isAdmin} reviewNote={reviewNotes[report.id] || ''} onReviewNote={(value) => setReviewNotes((current) => ({ ...current, [report.id]: value }))} onApprove={() => review(report.id, true)} onReject={() => review(report.id, false)} onCancel={() => cancelReport(report.id)} onOpenReceipt={() => report.receipt_path && openReceipt(report.receipt_path)} loading={saving} />)}</View>
    </View>`,
);

replaceRequired(
  platformFile,
  `function BankCard({ settings }: { settings: GlobalSettings }) {`,
  `function StaticSectionHeader({ title, subtitle, icon, accent }: { title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap; accent: string }) {
  const { colors } = useTheme();
  return <View style={[styles.staticHeader, { backgroundColor: colors.card, borderColor: accent + '42' }]}>
    <View style={[styles.accordionIcon, { backgroundColor: accent + '15' }]}><Ionicons name={icon} size={23} color={accent} /></View>
    <View style={styles.copy}><Text style={[styles.accordionTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.accordionSub, { color: colors.textMuted }]}>{subtitle}</Text></View>
  </View>;
}

function BankCard({ settings }: { settings: GlobalSettings }) {`,
);
replaceRequired(
  platformFile,
  "  accordion: { borderWidth: 1, borderRadius: 22, overflow: 'hidden' }, accordionHeader:",
  "  staticSection: { gap: 10 }, staticHeader: { minHeight: 82, padding: 14, borderWidth: 1, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 11 },\n  accordion: { borderWidth: 1, borderRadius: 22, overflow: 'hidden' }, accordionHeader:",
);

const reportsFile = 'src/components/ReportsDashboard.tsx';
replaceRequired(
  reportsFile,
  "import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';",
  "import { Alert, LayoutAnimation, Platform, ScrollView, StyleSheet, Text, UIManager, View } from 'react-native';",
);
replaceRequired(
  reportsFile,
  `  useEffect(() => { setViewMode(isOwner ? 'business' : 'personal'); }, [isOwner, workshop?.id]);`,
  `  useEffect(() => { setViewMode(isOwner ? 'business' : 'personal'); }, [isOwner, workshop?.id]);
  useEffect(() => {
    if (Platform.OS === 'android') {
      const manager = UIManager as typeof UIManager & { setLayoutAnimationEnabledExperimental?: (enabled: boolean) => void };
      manager.setLayoutAnimationEnabledExperimental?.(true);
    }
  }, []);`,
);
replaceRequired(
  reportsFile,
  `function BusinessView({ report }: { report: BusinessReport }) {
  const { colors } = useTheme();
  const s = report.summary;`,
  `function BusinessView({ report }: { report: BusinessReport }) {
  const { colors } = useTheme();
  const [openSections, setOpenSections] = useState({ topServices: false, recentOrders: false });
  const toggleSection = (key: 'topServices' | 'recentOrders') => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenSections((current) => ({ ...current, [key]: !current[key] }));
  };
  const s = report.summary;`,
);
replaceBlock(
  reportsFile,
  `    <Text style={[styles.listTitle, { color: colors.text }]}>En Çok Yapılan İşlemler</Text>`,
  `    <View style={styles.stack}>{report.recent_orders.length === 0 ? <Empty text="Bu dönemde servis kaydı yok." /> : report.recent_orders.slice(0, 30).map((item) => <BusinessJobCard key={item.work_order_id} item={item} />)}</View>`,
  `    <ReportAccordionSection
      title="En Çok Yapılan İşlemler"
      subtitle={report.top_services.length + ' işlem türü • seçilen dönem'}
      icon="podium"
      accent={colors.primary}
      open={openSections.topServices}
      onToggle={() => toggleSection('topServices')}
    >
      <GlassCard style={styles.listCard}>{report.top_services.length === 0 ? <Empty text="İşlem verisi yok." /> : report.top_services.map((item, index) => <View key={item.title + '-' + index} style={[styles.rankRow, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}><View style={[styles.rank, { backgroundColor: colors.primary + '16' }]}><Text style={[styles.rankText, { color: colors.primary }]}>{index + 1}</Text></View><View style={styles.copy}><Text style={[styles.rowTitle, { color: colors.text }]}>{item.title}</Text><Text style={[styles.rowMeta, { color: colors.textMuted }]}>{item.service_count} işlem</Text></View><Text style={[styles.rowAmount, { color: colors.green }]}>{money(n(item.recorded_amount))}</Text></View>)}</GlassCard>
    </ReportAccordionSection>

    <ReportAccordionSection
      title="Son Servis Kayıtları"
      subtitle={report.recent_orders.length + ' servis kaydı • en yeni önce'}
      icon="time"
      accent={colors.orange}
      open={openSections.recentOrders}
      onToggle={() => toggleSection('recentOrders')}
    >
      <View style={styles.stack}>{report.recent_orders.length === 0 ? <Empty text="Bu dönemde servis kaydı yok." /> : report.recent_orders.slice(0, 30).map((item) => <BusinessJobCard key={item.work_order_id} item={item} />)}</View>
    </ReportAccordionSection>`,
);
replaceRequired(
  reportsFile,
  `function PersonalView({ report }: { report: PersonalReport }) {
  const { colors } = useTheme();
  const s = report.summary;`,
  `function PersonalView({ report }: { report: PersonalReport }) {
  const { colors } = useTheme();
  const [historyOpen, setHistoryOpen] = useState(false);
  const toggleHistory = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setHistoryOpen((current) => !current);
  };
  const s = report.summary;`,
);
replaceBlock(
  reportsFile,
  `    <Text style={[styles.listTitle, { color: colors.text }]}>Kişisel İş Geçmişim</Text>`,
  `    <View style={styles.stack}>{report.jobs.length === 0 ? <Empty text="Bu dönemde sana ait iş kaydı yok." /> : report.jobs.map((item) => <PersonalJobCard key={item.work_order_id} item={item} />)}</View>`,
  `    <ReportAccordionSection
      title="Kişisel İş Geçmişim"
      subtitle={report.jobs.length + ' motor • işlem, tutar ve parça ayrıntıları'}
      icon="person-circle"
      accent={colors.green}
      open={historyOpen}
      onToggle={toggleHistory}
    >
      <Text style={[styles.listSubtitle, { color: colors.textMuted }]}>Motorun geliş saati, yaptığın işlemler, kaydettiğin tutar ve kullandığın parçalar.</Text>
      <View style={styles.stack}>{report.jobs.length === 0 ? <Empty text="Bu dönemde sana ait iş kaydı yok." /> : report.jobs.map((item) => <PersonalJobCard key={item.work_order_id} item={item} />)}</View>
    </ReportAccordionSection>`,
);
replaceRequired(
  reportsFile,
  `function ChartSection({ title, subtitle, daily, hourly }: { title: string; subtitle: string; daily: DailyPoint[]; hourly: HourlyPoint[] }) {`,
  `function ReportAccordionSection({ title, subtitle, icon, accent, open, onToggle, children }: { title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap; accent: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  const { colors } = useTheme();
  return <View style={[styles.reportAccordion, { backgroundColor: colors.card, borderColor: open ? accent + '55' : colors.border }]}>
    <AnimatedPressable onPress={onToggle} style={styles.reportAccordionHeader}>
      <View style={[styles.reportAccordionIcon, { backgroundColor: accent + '16' }]}><Ionicons name={icon} size={22} color={accent} /></View>
      <View style={styles.copy}><Text style={[styles.reportAccordionTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.reportAccordionSubtitle, { color: colors.textMuted }]}>{subtitle}</Text></View>
      <View style={[styles.reportAccordionChevron, { backgroundColor: accent + '12', borderColor: accent + '35' }]}><Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={accent} /></View>
    </AnimatedPressable>
    {open && <View style={[styles.reportAccordionBody, { borderTopColor: colors.border }]}>{children}</View>}
  </View>;
}

function ChartSection({ title, subtitle, daily, hourly }: { title: string; subtitle: string; daily: DailyPoint[]; hourly: HourlyPoint[] }) {`,
);
replaceRequired(
  reportsFile,
  "  disclaimer: { fontSize: 12.5, lineHeight: 18, textAlign: 'center' }, listTitle:",
  "  reportAccordion: { borderWidth: 1, borderRadius: 22, overflow: 'hidden' }, reportAccordionHeader: { minHeight: 82, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 11 }, reportAccordionIcon: { width: 47, height: 47, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, reportAccordionTitle: { fontSize: 15.5, fontWeight: '900' }, reportAccordionSubtitle: { fontSize: 11.5, lineHeight: 15, marginTop: 4 }, reportAccordionChevron: { width: 38, height: 38, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, reportAccordionBody: { borderTopWidth: 1, padding: 12, gap: 12 },\n  disclaimer: { fontSize: 12.5, lineHeight: 18, textAlign: 'center' }, listTitle:",
);

walk('src', (file) => {
  if (!/\.(ts|tsx)$/.test(file)) return;
  const original = read(file);
  const updated = original
    .replace(/<Text[^>]*>\s*Açıklamaya işletme adı ve dönem bilgisini yazın\.\s*<\/Text>/g, '')
    .replace(/Açıklamaya işletme adı ve dönem bilgisini yazın\./g, '');
  if (updated !== original) write(file, updated);
});

const pkg = JSON.parse(read('package.json'));
pkg.version = '0.8.8';
write('package.json', `${JSON.stringify(pkg, null, 2)}\n`);
const lock = JSON.parse(read('package-lock.json'));
lock.version = '0.8.8';
if (lock.packages?.['']) lock.packages[''].version = '0.8.8';
write('package-lock.json', `${JSON.stringify(lock, null, 2)}\n`);
const app = JSON.parse(read('app.json'));
app.expo.version = '0.8.8';
write('app.json', `${JSON.stringify(app, null, 2)}\n`);

replaceRequired('src/screens/SettingsScreen.tsx', 'v0.8.7 • Ana Sayfa ve Platform Arayüzü', 'v0.8.8 • Bildirim, Rapor ve Yarış Motoru Arayüzü');
replaceRequired('src/screens/SettingsScreen.tsx', 'backup/v0.8.6-before-v0.8.7-20260712', 'backup/v0.8.7-before-v0.8.8-20260712');
replaceRequired('src/screens/SettingsScreen.tsx', 'Kod yedeğiyle v0.8.6', 'Kod yedeğiyle v0.8.7');

write('docs/CHANGELOG_V0.8.8.md', `# DraBornGarage v0.8.8\n\nTarih: 12 Temmuz 2026\n\n## Bildirim zili\n- Ana sayfadaki çalışan Bildirim Merkezi zili geri getirildi.\n- ScreenHeader içindeki işlevsiz gri zil kaldırıldı.\n- Müşteriler ve Alacak sayfalarında yüzen zil gizlendi.\n\n## Platform Ödeme Merkezi\n- Ödeme Bildir ve Ödeme Bildirimleri sürekli açık, doğrudan erişilebilir bölümler yapıldı.\n- Platform Ödeme Bilgileri, Dönem Borçları ve İşlem Başı Ücret Kayıtları açılır-kapanır kalmaya devam eder.\n- İstenmeyen işletme adı ve dönem açıklama yardım metni kaldırıldı.\n\n## Rapor Merkezi\n- En Çok Yapılan İşlemler, Son Servis Kayıtları ve Kişisel İş Geçmişim açılır-kapanır ana kategorilere dönüştürüldü.\n- Kategori başlıklarında kayıt sayısı ve dönem özeti gösterilir.\n\n## Motosiklet ikonu\n- Modern, renkli yarış motosikleti görünümü eklendi.\n- Renkli grenaj, yarış jantları, far, egzoz, ön cam ve hareket çizgileriyle animasyon yenilendi.\n`);

write('docs/PROJECT_HANDOFF_V0.8.8.md', `# DraBornGarage — v0.8.8 Devam Dosyası\n\n**Güncel sürüm:** \`v0.8.8\`  \n**Önceki sabit yedek:** \`backup/v0.8.7-before-v0.8.8-20260712\`  \n**Sonraki sürüm:** \`v0.9.0\`\n\n## Tamamlanan kapsam\n- Ana sayfada çalışan Bildirim Merkezi zilinin geri gelmesi ve gri işlevsiz zilinin kaldırılması.\n- Müşteriler ve Alacak sayfalarında yüzen zilin gizlenmesi.\n- Platform ekranında Ödeme Bildir ve Ödeme Bildirimleri bölümlerinin sürekli açık olması.\n- Rapor Merkezi'nde üç büyük kayıt alanının açılır-kapanır ana kategori olması.\n- Modern renkli animasyonlu yarış motosikleti SVG çizimi.\n- İstenmeyen açıklama yardım metninin kaldırılması.\n\n## Doğrulama\n- TypeScript kontrolü.\n- Android JavaScript bundle kontrolü.\n\n## Kurulum\n- Yerel yedek: \`DraBornGarage-v0.8.7-local-backup\`\n- Termux komutu: \`docs/TERMUX_INSTALL.md\`\n`);

let roadmap = read('docs/ROADMAP.md');
if (!roadmap.includes('## v0.8.8')) roadmap = roadmap.replace('## v0.9', `## v0.8.8 — Bildirim, Rapor ve Yarış Motoru Arayüzü ✅\n\n- [x] Ana sayfada çalışan bildirim zilini geri getirme\n- [x] Müşteri ve Alacak ekranlarında zili gizleme\n- [x] Rapor kayıtlarını açılır-kapanır ana kategorilere dönüştürme\n- [x] Ödeme Bildir ve Ödeme Bildirimleri alanlarını sürekli açık tutma\n- [x] Renkli yarış motosikleti ikonu\n\n## v0.9`);
roadmap = roadmap.replace('Güncel sürüm `v0.8.7`dür.', 'Güncel sürüm `v0.8.8`dür.');
write('docs/ROADMAP.md', roadmap);

let readme = read('README.md');
readme = readme.replace(/`v0\.8\.7`/g, '`v0.8.8`');
readme = readme.replace(/backup\/v0\.8\.6-before-v0\.8\.7-20260712/g, 'backup/v0.8.7-before-v0.8.8-20260712');
write('README.md', readme);

write('docs/TERMUX_INSTALL.md', `# Termux — v0.8.7 Yedekle, v0.8.8 Kur\n\n\`\`\`bash\ncd ~\nKURULAN_SURUM="v0.8.8"\nYEDEKLENEN_SURUM="v0.8.7"\nYEDEK_KLASORU="$HOME/DraBornGarage-v0.8.7-local-backup"\nZIP_DOSYASI="$HOME/DraBornGarage-v0.8.8.zip"\nACILAN_KLASOR="$HOME/DraBornGarage-main"\n\npkg update -y\npkg install nodejs-lts curl unzip -y\nrm -rf "$YEDEK_KLASORU" "$ACILAN_KLASOR"\nrm -f "$ZIP_DOSYASI"\nif [ -d "$HOME/DraBornGarage" ]; then mv "$HOME/DraBornGarage" "$YEDEK_KLASORU"; fi\ncurl -L --retry 10 --retry-delay 3 --connect-timeout 30 --max-time 600 "https://github.com/DrabornEagle/DraBornGarage/archive/refs/heads/main.zip" -o "$ZIP_DOSYASI"\nunzip -o "$ZIP_DOSYASI" -d "$HOME"\nmv "$ACILAN_KLASOR" "$HOME/DraBornGarage"\nrm -f "$ZIP_DOSYASI"\nif [ -f "$YEDEK_KLASORU/.env" ]; then cp "$YEDEK_KLASORU/.env" "$HOME/DraBornGarage/.env"; else cp "$HOME/DraBornGarage/.env.example" "$HOME/DraBornGarage/.env"; fi\ncd "$HOME/DraBornGarage"\nnpm config set registry "https://registry.npmjs.org/"\nnpm config set fetch-retries 10\nnpm config set fetch-retry-factor 2\nnpm config set fetch-retry-mintimeout 20000\nnpm config set fetch-retry-maxtimeout 120000\nnpm config set fetch-timeout 300000\nnpm install --no-audit --no-fund\nnpm run typecheck\nnode -p "require('./package.json').version"\nnpx expo start -c --go\n\`\`\`\n\nBeklenen sürüm: \`0.8.8\`. Bağlantı sorunu olursa: \`npx expo start -c --tunnel --go\`.\n\nKod yedeği: \`backup/v0.8.7-before-v0.8.8-20260712\`.\n`);

for (const file of ['docs/V088_REQUIREMENTS.md']) if (fs.existsSync(file)) fs.rmSync(file);
console.log('v0.8.8 UI changes prepared.');
