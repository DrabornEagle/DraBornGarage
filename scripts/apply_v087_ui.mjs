import fs from 'node:fs';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, value) { fs.writeFileSync(path, value); }
function replaceRequired(path, before, after) {
  const source = read(path);
  if (!source.includes(before)) throw new Error(`${path}: target not found`);
  write(path, source.replace(before, after));
}
function replaceBlock(path, startMarker, endMarker, replacement) {
  const source = read(path);
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`${path}: start marker not found`);
  const endStart = source.indexOf(endMarker, start);
  if (endStart < 0) throw new Error(`${path}: end marker not found`);
  const end = endStart + endMarker.length;
  write(path, source.slice(0, start) + replacement + source.slice(end));
}

replaceRequired(
  'src/AppShell.tsx',
  '      <NotificationBell />',
  "      {tab !== 'home' && <NotificationBell />}",
);

replaceRequired(
  'src/components/PlatformFeesDashboard.tsx',
  "import { Alert, Image, Linking, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';",
  "import { Alert, Image, LayoutAnimation, Linking, Platform, ScrollView, Share, StyleSheet, Switch, Text, UIManager, View } from 'react-native';",
);

replaceRequired(
  'src/components/PlatformFeesDashboard.tsx',
  "type BillingCycle = 'weekly' | 'monthly';",
  "type BillingCycle = 'weekly' | 'monthly';\ntype PlatformAccordionKey = 'paymentInfo' | 'paymentForm' | 'paymentReports' | 'periods' | 'charges';",
);

replaceRequired(
  'src/components/PlatformFeesDashboard.tsx',
  "  const [globalNote, setGlobalNote] = useState('');",
  `  const [globalNote, setGlobalNote] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<PlatformAccordionKey, boolean>>({
    paymentInfo: true,
    paymentForm: false,
    paymentReports: false,
    periods: false,
    charges: false,
  });`,
);

replaceRequired(
  'src/components/PlatformFeesDashboard.tsx',
  '  useEffect(() => { load(); }, [load]);',
  `  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (Platform.OS === 'android') {
      const manager = UIManager as typeof UIManager & { setLayoutAnimationEnabledExperimental?: (enabled: boolean) => void };
      manager.setLayoutAnimationEnabledExperimental?.(true);
    }
  }, []);

  const toggleSection = (key: PlatformAccordionKey) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSections((current) => ({ ...current, [key]: !current[key] }));
  };`,
);

replaceRequired(
  'src/components/PlatformFeesDashboard.tsx',
  '    <BankCard settings={g} />',
  `    <AccordionSection
      title="Platform Ödeme Bilgileri"
      subtitle={g.iban ? \\`${g.bank_name || 'Banka'} • IBAN tanımlı\\` : 'Banka ve IBAN bilgileri henüz tanımlanmadı'}
      icon="business"
      accent={colors.cyan}
      open={expandedSections.paymentInfo}
      onToggle={() => toggleSection('paymentInfo')}
    >
      <BankCard settings={g} />
    </AccordionSection>`,
);

replaceBlock(
  'src/components/PlatformFeesDashboard.tsx',
  '    {number(s.available_to_report) > 0 && <GlassCard style={styles.formCard}>',
  '      <PrimaryButton title="Ödemeyi Admin Onayına Gönder" onPress={reportPayment} loading={saving} />\n    </GlassCard>}',
  `    <AccordionSection
      title="Ödeme Bildir"
      subtitle={number(s.available_to_report) > 0 ? \\`Bildirilebilir tutar ${money(number(s.available_to_report))}\\` : 'Bildirilebilir açık borç bulunmuyor'}
      icon="paper-plane"
      accent={colors.green}
      open={expandedSections.paymentForm}
      onToggle={() => toggleSection('paymentForm')}
    >
      {number(s.available_to_report) > 0 ? <GlassCard style={styles.formCard}>
        <View style={styles.formTitleRow}><View style={[styles.formIcon, { backgroundColor: \\`${colors.green}15\\` }]}><Ionicons name="paper-plane" size={23} color={colors.green} /></View><View style={styles.copy}><Text style={[styles.formTitle, { color: colors.text }]}>Yeni Ödeme Bildirimi</Text><Text style={[styles.formText, { color: colors.textMuted }]}>Gönderdiğin tutar en eski borç döneminden başlayarak otomatik dağıtılır.</Text></View></View>
        <FormField label={\\`Gönderilen tutar • En fazla ${money(number(s.available_to_report))}\\`} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0,00" />
        <FormField label="Ödeme tarihi • YYYY-MM-DD" value={paymentDate} onChangeText={setPaymentDate} autoCapitalize="none" />
        <FormField label="Açıklama" value={paymentNote} onChangeText={setPaymentNote} multiline placeholder="Örn. Temmuz dönemi platform ödemesi" />
        <AnimatedPressable onPress={pickReceipt} style={[styles.receiptPicker, { backgroundColor: colors.surfaceSoft, borderColor: receipt ? colors.green : colors.border }]}>
          {receipt ? <Image source={{ uri: receipt.uri }} style={styles.receiptPreview} /> : <View style={[styles.receiptPlaceholder, { backgroundColor: \\`${colors.primary}12\\` }]}><Ionicons name="image" size={26} color={colors.primary} /></View>}
          <View style={styles.copy}><Text style={[styles.receiptTitle, { color: colors.text }]}>{receipt ? 'Dekont seçildi' : 'Opsiyonel dekont ekle'}</Text><Text style={[styles.receiptText, { color: colors.textMuted }]}>{receipt?.fileName || 'Galeriden JPG, PNG veya WEBP seçebilirsin.'}</Text></View>
          <Ionicons name={receipt ? 'checkmark-circle' : 'add-circle'} size={23} color={receipt ? colors.green : colors.primary} />
        </AnimatedPressable>
        {receipt && <AnimatedPressable onPress={() => setReceipt(null)}><Text style={[styles.removeReceipt, { color: colors.red }]}>Dekontu kaldır</Text></AnimatedPressable>}
        <PrimaryButton title="Ödemeyi Admin Onayına Gönder" onPress={reportPayment} loading={saving} />
      </GlassCard> : <Empty text="Şu anda bildirilebilecek açık platform borcu yok." />}
    </AccordionSection>`,
);

replaceBlock(
  'src/components/PlatformFeesDashboard.tsx',
  '    <Text style={[styles.listTitle, { color: colors.text }]}>Ödeme Bildirimleri</Text>',
  '    <View style={styles.stack}>{dashboard.charges.length === 0 ? <Empty text="Tamamlanan servise bağlı ücret kaydı bulunmuyor." /> : dashboard.charges.map((charge) => <ChargeCard key={charge.id} charge={charge} />)}</View>',
  `    <AccordionSection
      title="Ödeme Bildirimleri"
      subtitle={\\`${dashboard.payment_reports.length} bildirim • ${money(number(s.total_pending))} onay bekliyor\\`}
      icon="notifications"
      accent={colors.cyan}
      open={expandedSections.paymentReports}
      onToggle={() => toggleSection('paymentReports')}
    >
      <View style={styles.stack}>{dashboard.payment_reports.length === 0 ? <Empty text="Henüz ödeme bildirimi yok." /> : dashboard.payment_reports.map((report) => <PaymentReportCard key={report.id} report={report} isAdmin={isAdmin} reviewNote={reviewNotes[report.id] || ''} onReviewNote={(value) => setReviewNotes((current) => ({ ...current, [report.id]: value }))} onApprove={() => review(report.id, true)} onReject={() => review(report.id, false)} onCancel={() => cancelReport(report.id)} onOpenReceipt={() => report.receipt_path && openReceipt(report.receipt_path)} loading={saving} />)}</View>
    </AccordionSection>

    <AccordionSection
      title="Dönem Borçları"
      subtitle={\\`${dashboard.periods.length} dönem • Kalan ${money(number(s.total_outstanding))}\\`}
      icon="calendar-number"
      accent={colors.orange}
      open={expandedSections.periods}
      onToggle={() => toggleSection('periods')}
    >
      <View style={styles.stack}>{dashboard.periods.length === 0 ? <Empty text="Henüz platform dönemi oluşmadı." /> : dashboard.periods.map((period) => <PeriodCard key={period.id} period={period} />)}</View>
    </AccordionSection>

    <AccordionSection
      title="İşlem Başı Ücret Kayıtları"
      subtitle={\\`${dashboard.charges.length} kayıt • İşlem başı ${money(number(dashboard.settings.fee_per_order))}\\`}
      icon="receipt"
      accent={colors.primary}
      open={expandedSections.charges}
      onToggle={() => toggleSection('charges')}
    >
      <View style={styles.stack}>{dashboard.charges.length === 0 ? <Empty text="Tamamlanan servise bağlı ücret kaydı bulunmuyor." /> : dashboard.charges.map((charge) => <ChargeCard key={charge.id} charge={charge} />)}</View>
    </AccordionSection>`,
);

replaceRequired(
  'src/components/PlatformFeesDashboard.tsx',
  'function BankCard({ settings }: { settings: GlobalSettings }) {',
  `function AccordionSection({ title, subtitle, icon, accent, open, onToggle, children }: { title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap; accent: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  const { colors } = useTheme();
  return <View style={[styles.accordion, { backgroundColor: colors.card, borderColor: open ? \\`${accent}55\\` : colors.border }]}>
    <AnimatedPressable onPress={onToggle} style={styles.accordionHeader}>
      <View style={[styles.accordionIcon, { backgroundColor: \\`${accent}15\\` }]}><Ionicons name={icon} size={23} color={accent} /></View>
      <View style={styles.copy}><Text style={[styles.accordionTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.accordionSub, { color: colors.textMuted }]}>{subtitle}</Text></View>
      <View style={[styles.accordionChevron, { backgroundColor: \\`${accent}12\\`, borderColor: \\`${accent}35\\` }]}><Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={accent} /></View>
    </AnimatedPressable>
    {open && <View style={[styles.accordionBody, { borderTopColor: colors.border }]}>{children}</View>}
  </View>;
}

function BankCard({ settings }: { settings: GlobalSettings }) {`,
);

replaceRequired(
  'src/components/PlatformFeesDashboard.tsx',
  '>Platform Ödeme Bilgileri</Text>',
  '>Banka ve IBAN Bilgileri</Text>',
);

replaceRequired(
  'src/components/PlatformFeesDashboard.tsx',
  "  bankCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 }, bankIcon:",
  "  accordion: { borderWidth: 1, borderRadius: 22, overflow: 'hidden' }, accordionHeader: { minHeight: 82, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 11 }, accordionIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, accordionTitle: { fontSize: 15.5, fontWeight: '900' }, accordionSub: { fontSize: 11.5, lineHeight: 15, marginTop: 4 }, accordionChevron: { width: 38, height: 38, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, accordionBody: { borderTopWidth: 1, padding: 12, gap: 12 },\n  bankCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 }, bankIcon:",
);

const pkg = JSON.parse(read('package.json'));
pkg.version = '0.8.7';
write('package.json', `${JSON.stringify(pkg, null, 2)}\n`);

const lock = JSON.parse(read('package-lock.json'));
lock.version = '0.8.7';
if (lock.packages?.['']) lock.packages[''].version = '0.8.7';
write('package-lock.json', `${JSON.stringify(lock, null, 2)}\n`);

const app = JSON.parse(read('app.json'));
app.expo.version = '0.8.7';
write('app.json', `${JSON.stringify(app, null, 2)}\n`);

replaceRequired('src/screens/SettingsScreen.tsx', 'v0.8.6 • İşletme Keşfi ve Bağımsız Randevu', 'v0.8.7 • Ana Sayfa ve Platform Arayüzü');
replaceRequired('src/screens/SettingsScreen.tsx', 'backup/v0.8.5-before-v0.8.6-20260712', 'backup/v0.8.6-before-v0.8.7-20260712');
replaceRequired('src/screens/SettingsScreen.tsx', 'Kod yedeğiyle v0.8.5', 'Kod yedeğiyle v0.8.6');

write('docs/CHANGELOG_V0.8.7.md', `# DraBornGarage v0.8.7\n\nTarih: 12 Temmuz 2026\n\n## Ana sayfa\n- Usta/işletme ana sayfasındaki sağ üst yüzen bildirim zili kaldırıldı.\n- Bildirim Merkezi Ayarlar içinden ve diğer ekranlardaki bildirim erişiminden kullanılmaya devam eder.\n\n## Platform Ödeme Merkezi\n- Platform Ödeme Bilgileri, Ödeme Bildir, Ödeme Bildirimleri, Dönem Borçları ve İşlem Başı Ücret Kayıtları bağımsız açılır-kapanır ana kategorilere dönüştürüldü.\n- Her kategori kapalıyken özet tutar, kayıt sayısı veya durum bilgisini gösterir.\n- Açılıp kapanırken yerleşim animasyonu kullanılır.\n\n## Motosiklet ikonu\n- Daha anlaşılır modern yan profil motosiklet çizimi hazırlandı.\n- Jant, gövde, sele, motor bloğu, egzoz, ön maşa, gidon ve far ayrıntıları eklendi.\n- Sürüş salınımı, zemin parlaması ve hareket çizgileriyle animasyon geliştirildi.\n`);

write('docs/PROJECT_HANDOFF_V0.8.7.md', `# DraBornGarage — v0.8.7 Devam Dosyası\n\n**Güncel sürüm:** \`v0.8.7\`  \n**Önceki sabit yedek:** \`backup/v0.8.6-before-v0.8.7-20260712\`  \n**Sonraki sürüm:** \`v0.9.0\`\n\n## Tamamlanan kapsam\n- Ana sayfada yüzen bildirim zilinin kaldırılması.\n- Platform Ödeme Merkezi'ndeki beş detay alanının açılır-kapanır ana kategori yapısı.\n- Kategori başlıklarında kayıt/tutar/durum özetleri.\n- Modern ve daha okunabilir animasyonlu motosiklet SVG çizimi.\n\n## Doğrulama\n- TypeScript kontrolü.\n- Android JavaScript bundle kontrolü.\n\n## Kurulum\n- Yerel yedek: \`DraBornGarage-v0.8.6-local-backup\`\n- Termux komutu: \`docs/TERMUX_INSTALL.md\`\n`);

let roadmap = read('docs/ROADMAP.md');
if (!roadmap.includes('## v0.8.7')) {
  roadmap = roadmap.replace('## v0.9', `## v0.8.7 — Ana Sayfa ve Platform Arayüzü ✅\n\n- [x] Ana sayfadaki yüzen bildirim zilini kaldırma\n- [x] Platform ödeme detaylarını açılır-kapanır kategoriler yapma\n- [x] Modern animasyonlu motosiklet ikonu\n\n## v0.9`);
}
roadmap = roadmap.replace('Güncel sürüm `v0.8.6`dür.', 'Güncel sürüm `v0.8.7`dür.');
write('docs/ROADMAP.md', roadmap);

let readme = read('README.md');
readme = readme.replace(/`v0\.8\.6`/g, '`v0.8.7`');
readme = readme.replace(/backup\/v0\.8\.5-before-v0\.8\.6-20260712/g, 'backup/v0.8.6-before-v0.8.7-20260712');
write('README.md', readme);

write('docs/TERMUX_INSTALL.md', `# Termux — v0.8.6 Yedekle, v0.8.7 Kur\n\n\`\`\`bash\ncd ~\nKURULAN_SURUM="v0.8.7"\nYEDEKLENEN_SURUM="v0.8.6"\nYEDEK_KLASORU="$HOME/DraBornGarage-v0.8.6-local-backup"\nZIP_DOSYASI="$HOME/DraBornGarage-v0.8.7.zip"\nACILAN_KLASOR="$HOME/DraBornGarage-main"\n\npkg update -y\npkg install nodejs-lts curl unzip -y\nrm -rf "$YEDEK_KLASORU" "$ACILAN_KLASOR"\nrm -f "$ZIP_DOSYASI"\nif [ -d "$HOME/DraBornGarage" ]; then mv "$HOME/DraBornGarage" "$YEDEK_KLASORU"; fi\ncurl -L --retry 10 --retry-delay 3 --connect-timeout 30 --max-time 600 "https://github.com/DrabornEagle/DraBornGarage/archive/refs/heads/main.zip" -o "$ZIP_DOSYASI"\nunzip -o "$ZIP_DOSYASI" -d "$HOME"\nmv "$ACILAN_KLASOR" "$HOME/DraBornGarage"\nrm -f "$ZIP_DOSYASI"\nif [ -f "$YEDEK_KLASORU/.env" ]; then cp "$YEDEK_KLASORU/.env" "$HOME/DraBornGarage/.env"; else cp "$HOME/DraBornGarage/.env.example" "$HOME/DraBornGarage/.env"; fi\ncd "$HOME/DraBornGarage"\nnpm config set registry "https://registry.npmjs.org/"\nnpm config set fetch-retries 10\nnpm config set fetch-timeout 300000\nnpm install --no-audit --no-fund\nnpm run typecheck\nnode -p "require('./package.json').version"\nnpx expo start -c --go\n\`\`\`\n\nBeklenen sürüm: \`0.8.7\`. Bağlantı sorunu olursa: \`npx expo start -c --tunnel --go\`.\n\nKod yedeği: \`backup/v0.8.6-before-v0.8.7-20260712\`.\n`);

for (const file of ['docs/V087_PLAN.md', 'docs/.v087_marker', 'docs/V087_WORKING_BRANCH_NOTE.md', 'docs/.keep-v087', 'docs/.v087-start']) {
  if (fs.existsSync(file)) fs.rmSync(file);
}

console.log('v0.8.7 UI changes prepared.');
