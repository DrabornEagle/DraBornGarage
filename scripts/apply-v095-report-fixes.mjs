import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function write(path, content) {
  fs.writeFileSync(path, content);
}

function replaceOnce(content, from, to, label) {
  if (!content.includes(from)) throw new Error(`${label}: beklenen metin bulunamadı`);
  return content.replace(from, to);
}

// Customer privacy shield: remove from Appointments, show on Services and Account.
{
  const path = 'src/customer/CustomerShell.tsx';
  let content = read(path);
  content = replaceOnce(
    content,
    "{['appointments', 'account'].includes(tab) && <PrivacyCenter />}",
    "{['services', 'account'].includes(tab) && <PrivacyCenter />}",
    path,
  );
  write(path, content);
}

// Mechanic home must use completed work-order labor, not only manually completed service rows.
{
  const path = 'src/screens/HomeScreen.tsx';
  let content = read(path);
  content = replaceOnce(
    content,
    ".select('id,status,assigned_mechanic_id')",
    ".select('id,status,assigned_mechanic_id,labor_amount')",
    `${path} todayOrders select`,
  );
  content = replaceOnce(
    content,
    `    let servicesQuery = supabase
      .from('work_order_services')
      .select('mechanic_id,price,completed')
      .eq('workshop_id', workshop.id)
      .eq('completed', true)
      .gte('created_at', today);
    if (mechanicView) servicesQuery = servicesQuery.eq('mechanic_id', membership.user_id);

`,
    '',
    `${path} services query`,
  );
  content = replaceOnce(
    content,
    '    const [ordersResult, todayOrdersResult, paymentsResult, servicesResult] = await Promise.all([',
    '    const [ordersResult, todayOrdersResult, paymentsResult] = await Promise.all([',
    `${path} promise result`,
  );
  content = replaceOnce(
    content,
    `      supabase.from('payments').select('amount,payment_method,received_by').eq('workshop_id', workshop.id).gte('paid_at', today),
      servicesQuery,
`,
    `      supabase.from('payments').select('amount,payment_method,received_by').eq('workshop_id', workshop.id).gte('paid_at', today),
`,
    `${path} promise calls`,
  );
  content = replaceOnce(
    content,
    '    const services = servicesResult.data ?? [];\n',
    '',
    `${path} services data`,
  );
  content = replaceOnce(
    content,
    '    const recorded = services.reduce((sum, item) => sum + Number(item.price), 0);',
    "    const recorded = todayOrders\n      .filter((order) => completedStatuses.includes(order.status))\n      .reduce((sum, order) => sum + Number(order.labor_amount || 0), 0);",
    `${path} recorded total`,
  );
  write(path, content);
}

// Personal report language and fallback detail for legacy work orders without line items.
{
  const path = 'src/components/ReportsDashboard.tsx';
  let content = read(path);
  content = replaceOnce(
    content,
    "<Text style={styles.heroMeta}>{n(s.completed_service_count)} tamamlanan işlem • {n(s.order_count)} motor</Text>",
    "<Text style={styles.heroMeta}>{n(s.completed_order_count)} tamamlanan iş • {n(s.order_count)} motor</Text>",
    `${path} personal hero`,
  );
  content = replaceOnce(
    content,
    '<SubList icon="construct" title="Yaptığın İşlemler" empty="İşlem satırı yok" items={item.services.map((s) => `${s.title} • ${money(n(s.price))}${s.completed ? \'\' : \' • Devam ediyor\'}`)} />',
    '<SubList icon="construct" title="Yaptığın İşlemler" empty="İşlem kaydı yok" items={item.services.length > 0 ? item.services.map((s) => `${s.title} • ${money(n(s.price))}${s.completed ? \'\' : \' • Devam ediyor\'}`) : n(item.recorded_amount) > 0 ? [`Genel servis işçiliği • ${money(n(item.recorded_amount))}`] : []} />',
    `${path} fallback service detail`,
  );
  write(path, content);
}

// Settings version card.
{
  const path = 'src/screens/SettingsScreen.tsx';
  let content = read(path);
  content = replaceOnce(
    content,
    '<SettingsAccordion title="Uygulama" subtitle="v0.9.4 • IBAN ödeme bildirimi ve Usta onayı"',
    '<SettingsAccordion title="Uygulama" subtitle="v0.9.5 • Usta rapor ve iş sayısı tutarlılığı"',
    `${path} version subtitle`,
  );
  content = replaceOnce(
    content,
    '<Info icon="layers" label="Sürüm" value="v0.9.4 • IBAN Ödeme Bildirimi ve Usta Onayı" />',
    '<Info icon="layers" label="Sürüm" value="v0.9.5 • Usta Rapor ve İş Sayısı Tutarlılığı" />',
    `${path} version info`,
  );
  content = replaceOnce(
    content,
    'backup/v0.9.3-before-v0.9.4-20260714',
    'backup/v0.9.4-before-v0.9.5-20260714',
    `${path} backup`,
  );
  content = replaceOnce(
    content,
    'value="Kod ve veritabanıyla v0.9.3"',
    'value="Kod ve veritabanıyla v0.9.4"',
    `${path} rollback`,
  );
  write(path, content);
}

// Application versions.
{
  const packagePath = 'package.json';
  const pkg = JSON.parse(read(packagePath));
  pkg.version = '0.9.5';
  write(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);

  const lockPath = 'package-lock.json';
  const lock = JSON.parse(read(lockPath));
  lock.version = '0.9.5';
  if (lock.packages?.['']) lock.packages[''].version = '0.9.5';
  write(lockPath, `${JSON.stringify(lock, null, 2)}\n`);

  const appPath = 'app.json';
  const app = JSON.parse(read(appPath));
  app.expo.version = '0.9.5';
  app.expo.android.versionCode = 14;
  app.expo.ios.buildNumber = '14';
  write(appPath, `${JSON.stringify(app, null, 2)}\n`);
}

// README current release summary.
{
  const path = 'README.md';
  let content = read(path);
  content = content.replace(/\*\*v0\.9\.4 —[^\n]*\*\*/, '**v0.9.5 — Usta Rapor ve İş Sayısı Tutarlılığı**');
  content = content.replace(/v0\.9\.4;[^\n]*/, 'v0.9.5; Usta Paneli, Usta Raporu ve İşletme Raporundaki işçilik tutarlarını aynı kurala bağlar; tamamlanan iş sayısını düzeltir ve müşteri kalkanını Servislerim ekranına taşır.');
  content = content.replace('## v0.9.4 ile tamamlananlar', '## v0.9.5 ile tamamlananlar');
  const heading = '## v0.9.5 ile tamamlananlar\n';
  const bullets = `
- Kalkan simgesinin Randevularım ekranından kaldırılıp Servislerim ekranına taşınması
- Usta Paneli günlük iş tutarının tamamlanan iş emri işçiliğiyle hesaplanması
- Usta Raporu ve İşletme Raporu Usta kırılımının aynı kayıt kuralını kullanması
- İşlem satırı olmayan tamamlanmış motorların atanmış Usta işçiliğine dahil edilmesi
- Motor Hazır, Tamamlandı ve Teslim Edildi durumlarının tamamlanmış iş olarak sayılması
- İş emri tamamlandığında unutulan işlem satırlarının otomatik tamamlanması
- Geçmiş teslim edilmiş kayıtlardaki eksik tamamlanma işaretlerinin onarılması
`;
  if (!content.includes('Kalkan simgesinin Randevularım')) content = content.replace(heading, `${heading}${bullets}`);
  write(path, content);
}

// Termux guide version and regression test.
{
  const path = 'docs/TERMUX_INSTALL.md';
  let content = read(path).replaceAll('v0.9.4', 'v0.9.5').replace('EXPECTED_VERSION="0.9.4"', 'EXPECTED_VERSION="0.9.5"');
  const marker = '## Bildirim sesi testi';
  const reportTest = `## Usta rapor tutarlılığı testi

1. Aynı Ustaya atanmış iki motoru Motor Hazır veya Teslim Edildi durumuna getir.
2. İşlerden birinde ayrıntılı işlem satırı olmasın; diğerinde işlem satırı tamamlanmadan motoru hazır yap.
3. **Usta Panelim** günlük kayıtlı tutarını kontrol et.
4. **Merkez → Usta Raporu** ekranında tamamlanan iş sayısı ve kayıtlı tutarı kontrol et.
5. **Merkez → İşletme Raporu → Usta Bazlı İş ve Tutar** değerleriyle karşılaştır.
6. Üç ekranın aynı işçilik tutarını göstermesi; işlem satırı olmayan tamamlanmış işin de bir iş olarak sayılması gerekir.

`;
  if (!content.includes('## Usta rapor tutarlılığı testi')) content = content.replace(marker, `${reportTest}${marker}`);
  write(path, content);
}

write('docs/CHANGELOG_V0.9.5.md', `# DraBornGarage v0.9.5 — Usta Rapor ve İş Sayısı Tutarlılığı

**Tarih:** 14 Temmuz 2026

## Düzeltilen sorunlar

- Kalkan simgesi Randevularım ekranından kaldırıldı ve Servislerim ekranının sağ üstüne taşındı.
- İşletme Raporunda görünen işçilik tutarının Usta Paneli ve Usta Raporunda sıfır görünmesi düzeltildi.
- Tamamlanan iki işin tek işlem olarak görünmesine yol açan işlem-satırı bağımlılığı kaldırıldı.
- İşlem satırı bulunmayan tamamlanmış iş emri, atanmış Ustanın işçilik kaydına dahil edildi.
- Motor Hazır, Tamamlandı ve Teslim Edildi durumları tamamlanmış iş hesabında eşitlendi.
- İş emri tamamlandığında açık kalan işlem satırları otomatik olarak tamamlanır.
- Geçmiş teslim edilmiş servislerde yanlışlıkla açık kalan işlem satırları onarıldı.

## Hesaplama kuralı

Ustanın kayıtlı iş tutarı yalnız işçilik üzerinden hesaplanır. Parça bedeli Usta kazancına eklenmez. Ayrıntılı işlem satırları Ustaya yazılır; işçilik tutarının ayrıntılandırılmamış bölümü servise atanmış Ustaya kaydedilir. Sistem maaş, komisyon veya ortaklık payı hesaplamaz.

## Doğrulanan canlı kayıt

DBGpro / DBGgarage örneğinde:

- Bugünkü kayıtlı Usta iş tutarı: 1.000 TL
- Tüm dönem kayıtlı Usta iş tutarı: 1.900 TL
- Tamamlanan iş sayısı: 2

## Sürüm

- Uygulama: 0.9.5
- Android versionCode: 14
- iOS buildNumber: 14
- Yedek: backup/v0.9.4-before-v0.9.5-20260714
- Migration: 20260714115331_v0_9_5_report_consistency_and_service_completion.sql
- Rollback: supabase/rollbacks/rollback_v0_9_5_to_v0_9_4.sql
`);
