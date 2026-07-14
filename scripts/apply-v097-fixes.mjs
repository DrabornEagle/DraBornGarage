import fs from 'node:fs';

function patch(path, transform) {
  const before = fs.readFileSync(path, 'utf8');
  const after = transform(before);
  if (after === before) throw new Error(`Dosyada değişiklik oluşmadı: ${path}`);
  fs.writeFileSync(path, after);
}

function replaceOnce(source, from, to, label) {
  if (!source.includes(from)) throw new Error(`Kalıp bulunamadı: ${label}`);
  return source.replace(from, to);
}

patch('src/screens/HomeScreen.tsx', (source) => replaceOnce(
  source,
  `.eq('workshop_id', workshop.id)\n      .order('queue_position', { ascending: true })`,
  `.eq('workshop_id', workshop.id)\n      .gte('arrived_at', today)\n      .order('queue_position', { ascending: true })`,
  'Bugünkü atölye sırası tarih filtresi',
));

patch('src/screens/WorkOrderDetailV04.tsx', (source) => replaceOnce(
  source,
  `  const changeStatus = async (status: WorkOrderStatus) => {\n    if (status === 'delivered' && Number(order?.total_amount || 0) <= 0) {\n      setPriceType('fixed');\n      setFixedPrice('');\n      setOpenSections((current) => ({ ...current, price: true, status: false }));\n      setTimeout(() => scrollRef.current?.scrollTo({ y: 420, animated: true }), 180);\n      Alert.alert('Son net fiyat gerekli', 'Motor Hazır durumunda tahmini fiyat gösterilebilir; ancak teslim edilmeden önce son net fiyatı veya yapılan işlem tutarını kaydetmelisin.');\n      return;\n    }`,
  `  const changeStatus = async (status: WorkOrderStatus) => {\n    const requiresFinalCharge = ['ready', 'completed', 'delivered'].includes(status);\n    if (requiresFinalCharge && Number(order?.total_amount || 0) <= 0) {\n      setPriceType('fixed');\n      setFixedPrice('');\n      setOpenSections((current) => ({ ...current, price: true, status: false }));\n      setTimeout(() => scrollRef.current?.scrollTo({ y: 420, animated: true }), 180);\n      Alert.alert(\n        'Tahsil edilecek ücret gerekli',\n        'Motor Hazır yapılmadan önce müşteriden tahsil edilecek son net ücreti veya yapılan işlem tutarını kaydetmelisin.',\n      );\n      return;\n    }`,
  'Motor Hazır final ücret koruması',
));

patch('package.json', (source) => replaceOnce(source, '"version": "0.9.6"', '"version": "0.9.7"', 'package sürümü'));

patch('package-lock.json', (source) => {
  let next = replaceOnce(source, '"version": "0.9.6"', '"version": "0.9.7"', 'lock kök sürümü');
  next = replaceOnce(next, '"version": "0.9.6"', '"version": "0.9.7"', 'lock paket sürümü');
  return next;
});

patch('app.json', (source) => {
  let next = replaceOnce(source, '"version": "0.9.6"', '"version": "0.9.7"', 'Expo sürümü');
  next = replaceOnce(next, '"buildNumber": "15"', '"buildNumber": "16"', 'iOS build');
  next = replaceOnce(next, '"versionCode": 15', '"versionCode": 16', 'Android build');
  return next;
});

patch('src/screens/SettingsScreen.tsx', (source) => replaceOnce(
  source,
  `<SettingsAccordion title="Uygulama" subtitle="v0.9.6 • Servis fiyatı, bildirim ve canlı sayaç düzeltmeleri" icon="information-circle" accent={colors.green} open={openSection === 'app'} onToggle={() => toggleSection('app')}>\n      <GlassCard style={styles.info}><Info icon="layers" label="Sürüm" value="v0.9.6 • Servis Akışı ve Bildirim Düzeltmeleri" /><Info icon="shield-checkmark" label="Gizlilik" value="Kalkan Servislerim listesinde ve Hesabımda" /><Info icon="key" label="Şifre güvenliği" value="10 karakter + karmaşıklık + yaygın şifre engeli" /><Info icon="archive" label="Bu sürüm öncesi yedek" value="backup/v0.9.5-before-v0.9.6-20260714" /><Info icon="refresh" label="Geri alma" value="Kod ve veritabanıyla v0.9.5" /><Info icon="phone-portrait" label="Test yöntemi" value="Expo Go + Android bundle + pilot checklist" /><Info icon="storefront" label="Mağaza durumu" value="Auto & Vehicles • finansal hizmet değildir" /></GlassCard>`,
  `<SettingsAccordion title="Uygulama" subtitle="v0.9.7 • Bugünkü sıra ve Motor Hazır ücret koruması" icon="information-circle" accent={colors.green} open={openSection === 'app'} onToggle={() => toggleSection('app')}>\n      <GlassCard style={styles.info}><Info icon="layers" label="Sürüm" value="v0.9.7 • Bugünkü Sıra ve Ücret Koruması" /><Info icon="shield-checkmark" label="Motor Hazır kuralı" value="Son net ücret girilmeden Motor Hazır yapılamaz" /><Info icon="key" label="Şifre güvenliği" value="10 karakter + karmaşıklık + yaygın şifre engeli" /><Info icon="archive" label="Bu sürüm öncesi yedek" value="backup/v0.9.6-before-v0.9.7-20260714" /><Info icon="refresh" label="Geri alma" value="Kod ve veritabanıyla v0.9.6" /><Info icon="phone-portrait" label="Test yöntemi" value="Expo Go + Android bundle + pilot checklist" /><Info icon="storefront" label="Mağaza durumu" value="Auto & Vehicles • finansal hizmet değildir" /></GlassCard>`,
  'Ayarlar sürüm kartı',
));

patch('README.md', (source) => replaceOnce(
  source,
  `**v0.9.6 — Servis Akışı, Fiyat ve Bildirim Düzeltmeleri**\n\nv0.9.6; canlı panel sayaçlarını yeniler, fiyat girmeden tamire başlamayı destekler, tahmini fiyatı doğru gösterir, bildirimleri yeniden sıralar ve müşteri servis detayındaki kalkanı kaldırır.\n\n## v0.9.6 ile tamamlananlar\n\n- Usta Paneli Hazır/Tamam sayısının servis hareketlerinde canlı yenilenmesi`,
  `**v0.9.7 — Bugünkü Sıra ve Motor Hazır Ücret Koruması**\n\nv0.9.7; Usta Panelindeki Bugünkü Atölye Sırasını yalnız bugünün kayıtlarıyla sınırlar ve tahsil edilecek son net ücret girilmeden Motor Hazır aşamasına geçilmesini engeller.\n\n## v0.9.7 ile tamamlananlar\n\n- Bugünkü Atölye Sırasında önceki günlerin tamamlanmış işlerinin gösterilmemesi\n- Tamire fiyat girmeden başlanabilmesi\n- Motor Hazır, Tamamlandı ve Teslim Edildi aşamalarından önce final ücret zorunluluğu\n- Ücret eksikse modern uyarı verilmesi ve ücret bölümünün otomatik açılması\n- Uygulama ve Supabase tarafında çift katmanlı ücret koruması\n\n## Önceki v0.9.6 düzeltmeleri\n\n- Usta Paneli Hazır/Tamam sayısının servis hareketlerinde canlı yenilenmesi`,
  'README sürüm özeti',
));

patch('docs/TERMUX_INSTALL.md', (source) => {
  let next = replaceOnce(source, '# Termux — DraBornGarage v0.9.6 Kurulum', '# Termux — DraBornGarage v0.9.7 Kurulum', 'Termux başlık');
  next = replaceOnce(next, 'EXPECTED_VERSION="0.9.6"', 'EXPECTED_VERSION="0.9.7"', 'Termux beklenen sürüm');
  return next;
});

patch('src/notifications/NotificationContext.tsx', (source) => source.replace("Constants.expoConfig?.version || '0.9.6'", "Constants.expoConfig?.version || '0.9.7'"));
patch('src/notifications/NotificationCenterScreen.tsx', (source) => source.replace('v0.9.6 • SESLİ BİLDİRİM MERKEZİ', 'v0.9.7 • SESLİ BİLDİRİM MERKEZİ'));

console.log('v0.9.7 uygulama düzeltmeleri başarıyla uygulandı.');
