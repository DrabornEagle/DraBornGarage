import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const write = (path, content) => fs.writeFileSync(path, content);

function replaceOnce(source, from, to, label) {
  if (!source.includes(from)) throw new Error(`Kalıp bulunamadı: ${label}`);
  return source.replace(from, to);
}

function patch(path, transform) {
  const before = read(path);
  const after = transform(before);
  if (before !== after) write(path, after);
}

const packageJson = JSON.parse(read('package.json'));
if (packageJson.version === '0.9.7') {
  console.log('v0.9.7 kaynak düzeltmeleri zaten uygulanmış.');
  process.exit(0);
}

patch('src/types.ts', (source) => replaceOnce(
  source,
  `export interface DashboardStats {\n  activeOrders: number;\n  waitingOrders: number;\n  todayCompleted: number;\n  todayIncome: number;\n  mechanicRecordedTotal: number;\n}`,
  `export interface DashboardStats {\n  activeOrders: number;\n  waitingOrders: number;\n  totalCompleted: number;\n  todayIncome: number;\n  mechanicRecordedTotal: number;\n}`,
  'DashboardStats toplam tamamlanan alanı',
));

patch('src/screens/HomeScreen.tsx', (source) => {
  source = replaceOnce(
    source,
    `  const [stats, setStats] = useState<DashboardStats>({ activeOrders: 0, waitingOrders: 0, todayCompleted: 0, todayIncome: 0, mechanicRecordedTotal: 0 });`,
    `  const [stats, setStats] = useState<DashboardStats>({ activeOrders: 0, waitingOrders: 0, totalCompleted: 0, todayIncome: 0, mechanicRecordedTotal: 0 });`,
    'Panel başlangıç istatistikleri',
  );

  source = replaceOnce(
    source,
    `    const [ordersResult, todayOrdersResult, paymentsResult] = await Promise.all([\n      orderQuery,\n      todayOrdersQuery,\n      supabase.from('payments').select('amount,payment_method,received_by').eq('workshop_id', workshop.id).gte('paid_at', today),\n    ]);`,
    `    let completedOrdersQuery = supabase\n      .from('work_orders')\n      .select('id', { count: 'exact', head: true })\n      .eq('workshop_id', workshop.id)\n      .in('status', ['ready', 'completed', 'delivered']);\n    if (mechanicView) completedOrdersQuery = completedOrdersQuery.eq('assigned_mechanic_id', membership.user_id);\n\n    const [ordersResult, todayOrdersResult, completedOrdersResult, paymentsResult] = await Promise.all([\n      orderQuery,\n      todayOrdersQuery,\n      completedOrdersQuery,\n      supabase.from('payments').select('amount,payment_method,received_by').eq('workshop_id', workshop.id).gte('paid_at', today),\n    ]);`,
    'Toplam tamamlanan iş sorgusu',
  );

  source = replaceOnce(
    source,
    `      todayCompleted: todayOrders.filter((order) => completedStatuses.includes(order.status)).length,`,
    `      totalCompleted: completedOrdersResult.count ?? 0,`,
    'Panel toplam tamamlanan değeri',
  );

  source = replaceOnce(
    source,
    `          <Text style={styles.heroHint}>{stats.activeOrders} aktif motosiklet • {stats.todayCompleted} hazır/tamamlanan iş</Text>`,
    `          <Text style={styles.heroHint}>{stats.activeOrders} aktif motosiklet • {stats.totalCompleted} toplam hazır/tamamlanan iş</Text>`,
    'Hero toplam tamamlanan metni',
  );

  source = replaceOnce(
    source,
    `            <StatCard label="Hazır/Tamam" value={String(stats.todayCompleted)} icon="checkmark-done" accent={colors.green} />`,
    `            <StatCard label="Hazır/Tamam" value={String(stats.totalCompleted)} icon="checkmark-done" accent={colors.green} />`,
    'Hazır Tamam kartı toplam sayısı',
  );

  return source;
});

patch('src/screens/WorkOrderDetailV04.tsx', (source) => {
  source = replaceOnce(
    source,
    `  const changeStatus = async (status: WorkOrderStatus) => {\n    if (status === 'delivered' && Number(order?.total_amount || 0) <= 0) {`,
    `  const changeStatus = async (status: WorkOrderStatus) => {\n    if (status === 'ready' && Number(order?.total_amount || 0) <= 0) {\n      setPriceType('fixed');\n      setFixedPrice('');\n      setOpenSections((current) => ({ ...current, price: true, status: false }));\n      setTimeout(() => scrollRef.current?.scrollTo({ y: 420, animated: true }), 180);\n      Alert.alert('Tahsilat ücreti gerekli', 'Motoru hazır yapmadan önce müşteriden tahsil edilecek son net servis ücretini veya yapılan işlem tutarını kaydetmelisin. Tahmini fiyat tek başına yeterli değildir.');\n      return;\n    }\n    if (status === 'delivered' && Number(order?.total_amount || 0) <= 0) {`,
    'Motor Hazır ücret engeli',
  );

  source = replaceOnce(
    source,
    `    <DetailAccordion title="Servis Durumu" subtitle="Tamir akışını ve motorun güncel aşamasını yönet." icon="speedometer" accent={colors.primary} open={openSections.status} onToggle={() => toggleSection('status')} badge={statusLabels[order.status as WorkOrderStatus]}>\n      <View style={styles.grid}>{statusFlow.map((status) => <StatusButton key={status} status={status} active={order.status === status} onPress={() => changeStatus(status)} />)}</View>`,
    `    <DetailAccordion title="Servis Durumu" subtitle="Tamir akışını ve motorun güncel aşamasını yönet." icon="speedometer" accent={colors.primary} open={openSections.status} onToggle={() => toggleSection('status')} badge={statusLabels[order.status as WorkOrderStatus]}>\n      {Number(order.total_amount || 0) <= 0 && <View style={[styles.notice, { backgroundColor: \\`${'${colors.orange}'}10\\`, borderColor: \\`${'${colors.orange}'}35\\` }]}><Ionicons name="warning" size={20} color={colors.orange} /><Text style={[styles.noticeText, { color: colors.textMuted }]}>Motor Hazır seçilemez. Önce son net tahsilat ücretini kaydet veya Yapılan İşlemler bölümüne ücretli işlem kalemi ekle. Tahmini fiyat bilgi amaçlıdır.</Text></View>}\n      <View style={styles.grid}>{statusFlow.map((status) => <StatusButton key={status} status={status} active={order.status === status} onPress={() => changeStatus(status)} />)}</View>`,
    'Servis durumu ücret bilgi kartı',
  );

  source = replaceOnce(
    source,
    `<DetailAccordion title="Ücret ve Tahmini Fiyat" subtitle="Tamire başlamadan önce net veya tahmini fiyatı kaydet." icon="pricetag" accent={colors.green}`,
    `<DetailAccordion title="Ücret ve Tahmini Fiyat" subtitle="Motor Hazır öncesi son net tahsilat ücretini kaydet. Tahmini fiyat yalnız bilgi amaçlıdır." icon="pricetag" accent={colors.green}`,
    'Ücret bölümü açıklaması',
  );

  return source;
});

patch('src/screens/SettingsScreen.tsx', (source) => replaceOnce(
  source,
  `    <SettingsAccordion title="Uygulama" subtitle="v0.9.6 • Servis fiyatı, bildirim ve canlı sayaç düzeltmeleri" icon="information-circle" accent={colors.green} open={openSection === 'app'} onToggle={() => toggleSection('app')}>\n      <GlassCard style={styles.info}><Info icon="layers" label="Sürüm" value="v0.9.6 • Servis Akışı ve Bildirim Düzeltmeleri" /><Info icon="shield-checkmark" label="Gizlilik" value="Kalkan Servislerim listesinde ve Hesabımda" /><Info icon="key" label="Şifre güvenliği" value="10 karakter + karmaşıklık + yaygın şifre engeli" /><Info icon="archive" label="Bu sürüm öncesi yedek" value="backup/v0.9.5-before-v0.9.6-20260714" /><Info icon="refresh" label="Geri alma" value="Kod ve veritabanıyla v0.9.5" /><Info icon="phone-portrait" label="Test yöntemi" value="Expo Go + Android bundle + pilot checklist" /><Info icon="storefront" label="Mağaza durumu" value="Auto & Vehicles • finansal hizmet değildir" /></GlassCard>`,
  `    <SettingsAccordion title="Uygulama" subtitle="v0.9.7 • Toplam iş sayısı ve Motor Hazır ücret koruması" icon="information-circle" accent={colors.green} open={openSection === 'app'} onToggle={() => toggleSection('app')}>\n      <GlassCard style={styles.info}><Info icon="layers" label="Sürüm" value="v0.9.7 • Toplam Tamamlanan İş ve Ücret Koruması" /><Info icon="shield-checkmark" label="Gizlilik" value="Kalkan Servislerim listesinde ve Hesabımda" /><Info icon="key" label="Şifre güvenliği" value="10 karakter + karmaşıklık + yaygın şifre engeli" /><Info icon="archive" label="Bu sürüm öncesi yedek" value="backup/v0.9.6-before-v0.9.7-20260714" /><Info icon="refresh" label="Geri alma" value="Kod ve veritabanıyla v0.9.6" /><Info icon="phone-portrait" label="Test yöntemi" value="Expo Go + Android bundle + pilot checklist" /><Info icon="storefront" label="Mağaza durumu" value="Auto & Vehicles • finansal hizmet değildir" /></GlassCard>`,
  'Ayarlar sürüm bilgisi',
));

patch('src/notifications/NotificationCenterScreen.tsx', (source) => source.replace('v0.9.6 • SESLİ BİLDİRİM MERKEZİ', 'v0.9.7 • SESLİ BİLDİRİM MERKEZİ'));
patch('src/notifications/NotificationContext.tsx', (source) => source.replace("Constants.expoConfig?.version || '0.9.6'", "Constants.expoConfig?.version || '0.9.7'"));

patch('README.md', (source) => replaceOnce(
  source,
  `**v0.9.6 — Servis Akışı, Fiyat ve Bildirim Düzeltmeleri**\n\nv0.9.6; canlı panel sayaçlarını yeniler, fiyat girmeden tamire başlamayı destekler, tahmini fiyatı doğru gösterir, bildirimleri yeniden sıralar ve müşteri servis detayındaki kalkanı kaldırır.\n\n## v0.9.6 ile tamamlananlar`,
  `**v0.9.7 — Toplam Tamamlanan İş ve Motor Hazır Ücret Koruması**\n\nv0.9.7; Hazır/Tamam sayısını tüm dönem tamamlanan işlerle eşitler ve son net tahsilat ücreti oluşmadan Motor Hazır aşamasına geçilmesini engeller. Günlük kayıtlı tutar günlük kalmaya devam eder.\n\n## v0.9.7 ile tamamlananlar\n\n- Hazır/Tamam sayacının yalnız bugünü değil tüm tamamlanan işleri göstermesi\n- Usta görünümünde yalnız seçili Ustanın toplamının hesaplanması\n- İşletme görünümünde seçili işletmenin toplamının hesaplanması\n- Son net tahsilat ücreti olmadan Motor Hazır geçişinin engellenmesi\n- Motor Hazır seçildiğinde ücret bölümünün otomatik açılması ve açıklayıcı uyarı\n- Tahmini fiyatın final tahsilat ücreti sayılmaması\n- Veritabanında Motor Hazır, Tamamlandı ve Teslim Edildi ücret koruması\n\n## v0.9.6 ile tamamlananlar`,
  'README güncel sürüm',
));

patch('docs/TERMUX_INSTALL.md', (source) => source
  .replace('# Termux — DraBornGarage v0.9.6 Kurulum', '# Termux — DraBornGarage v0.9.7 Kurulum')
  .replace('EXPECTED_VERSION="0.9.6"', 'EXPECTED_VERSION="0.9.7"'));

const appJson = JSON.parse(read('app.json'));
appJson.expo.version = '0.9.7';
appJson.expo.ios.buildNumber = '16';
appJson.expo.android.versionCode = 16;
write('app.json', `${JSON.stringify(appJson, null, 2)}\n`);

packageJson.version = '0.9.7';
write('package.json', `${JSON.stringify(packageJson, null, 2)}\n`);

const lockJson = JSON.parse(read('package-lock.json'));
lockJson.version = '0.9.7';
if (lockJson.packages?.['']) lockJson.packages[''].version = '0.9.7';
write('package-lock.json', `${JSON.stringify(lockJson, null, 2)}\n`);

console.log('v0.9.7 kaynak düzeltmeleri başarıyla uygulandı.');
