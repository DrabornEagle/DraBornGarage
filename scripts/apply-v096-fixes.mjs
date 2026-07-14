import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

function write(path, content) {
  fs.writeFileSync(path, content);
}

function replaceOnce(content, search, replacement, label) {
  if (!content.includes(search)) {
    throw new Error(`Kalıp bulunamadı: ${label}`);
  }
  return content.replace(search, replacement);
}

function patch(path, transform) {
  const before = read(path);
  const after = transform(before);
  if (before === after) throw new Error(`Dosyada değişiklik oluşmadı: ${path}`);
  write(path, after);
}

patch('src/screens/NewWorkOrderScreen.tsx', (source) => {
  source = replaceOnce(source,
`    if (startImmediately && !priceComplete) {
      return Alert.alert('Ücret gerekli', 'Tamire başlamadan önce ücret veya tahmini ücret girmeniz gerekiyor.');
    }
`, '', 'Hemen Başla fiyat zorunluluğu');
  source = replaceOnce(source,
`            <View style={[styles.warning, { backgroundColor: \`${'${colors.orange}'}12\`, borderColor: \`${'${colors.orange}'}38\` }]}><Ionicons name="warning" size={19} color={colors.orange} /><Text style={[styles.warningText, { color: colors.textMuted }]}>Hemen başlatmak için net veya tahmini ücret zorunludur.</Text></View>`,
`            <View style={[styles.warning, { backgroundColor: \`${'${colors.cyan}'}12\`, borderColor: \`${'${colors.cyan}'}38\` }]}><Ionicons name="information-circle" size={19} color={colors.cyan} /><Text style={[styles.warningText, { color: colors.textMuted }]}>Ücret şimdi girilmeden tamire başlanabilir. Tahmini fiyat müşteriye aralık olarak gösterilir; motor teslim edilmeden önce son net fiyat kaydedilir.</Text></View>`,
'Hemen Başla bilgi kartı');
  source = replaceOnce(source,
'Plakayı ara, ücreti belirle ve motoru sıraya al veya hemen başlat.',
'Plakayı ara; ücreti şimdi belirle veya tamire başlayıp daha sonra netleştir.',
'Yeni servis alt başlığı');
  return source;
});

patch('src/screens/HomeScreen.tsx', (source) => replaceOnce(source,
`  useEffect(() => { load(); }, [load]);
`,
`  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!workshop?.id || isApprentice) return;
    const refreshLiveStats = () => { load().catch(() => undefined); };
    const channel = supabase
      .channel(\`home-live-stats-\${workshop.id}-\${membership?.user_id ?? 'staff'}\`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_orders', filter: \`workshop_id=eq.\${workshop.id}\` }, refreshLiveStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_order_services', filter: \`workshop_id=eq.\${workshop.id}\` }, refreshLiveStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments', filter: \`workshop_id=eq.\${workshop.id}\` }, refreshLiveStats)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [workshop?.id, membership?.user_id, isApprentice, load]);
`, 'Panel canlı sayaçları'));

patch('src/customer/CustomerAppointmentsScreen.tsx', (source) => {
  source = replaceOnce(source,
`  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);`,
`  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [refreshing, setRefreshing] = useState(false);`,
'İşletme arama durumu');
  source = replaceOnce(source,
`    setSearching(false);
    if (error) return Alert.alert('İşletmeler aranamadı', error.message);
    const next = (data as WorkshopSearchResult[] | null) ?? [];`,
`    setSearching(false);
    if (error) return Alert.alert('İşletmeler aranamadı', error.message);
    setSearched(true);
    const next = (data as WorkshopSearchResult[] | null) ?? [];`,
'Arama tamamlandı durumu');
  source = replaceOnce(source,
`        <FormField label="İşletme adı" value={workshopQuery} onChangeText={setWorkshopQuery} placeholder="Örn. Ankara Merkez Garage" autoCapitalize="words" />`,
`        <FormField label="İşletme adı" value={workshopQuery} onChangeText={(value) => { setWorkshopQuery(value); setSearched(false); }} placeholder="Örn. Ankara Merkez Garage" autoCapitalize="words" />`,
'Arama alanı sıfırlama');
  source = replaceOnce(source,
`        {workshopResults.length > 0 && <View style={styles.chips}>{workshopResults.map((item) => <WorkshopChoice key={item.id} item={item} active={selectedWorkshop?.id === item.id} onPress={() => selectWorkshop(item)} />)}</View>}

        {selectedWorkshop && <>`,
`        {workshopResults.length > 0 && <View style={styles.chips}>{workshopResults.map((item) => <WorkshopChoice key={item.id} item={item} active={selectedWorkshop?.id === item.id} onPress={() => selectWorkshop(item)} />)}</View>}
        {searched && workshopResults.length === 0 && <View style={[styles.searchEmpty, { backgroundColor: \`${'${colors.cyan}'}0D\`, borderColor: \`${'${colors.cyan}'}38\` }]}><View style={[styles.searchEmptyIcon, { backgroundColor: \`${'${colors.cyan}'}18\` }]}><Ionicons name="search" size={25} color={colors.cyan} /></View><View style={styles.copy}><Text style={[styles.searchEmptyTitle, { color: colors.text }]}>Bu adla işletme bulunamadı</Text><Text style={[styles.searchEmptyText, { color: colors.textMuted }]}>İşletme adını farklı yazarak tekrar dene. Yalnız randevuya açık işletmeler sonuçlarda gösterilir.</Text></View></View>}

        {selectedWorkshop && <>`,
'Arama boş durumu');
  source = replaceOnce(source,
`emptyTitle: { fontSize: 16, fontWeight: '900' }, card:`,
`emptyTitle: { fontSize: 16, fontWeight: '900' }, searchEmpty: { minHeight: 92, borderWidth: 1, borderRadius: 19, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11 }, searchEmptyIcon: { width: 49, height: 49, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, searchEmptyTitle: { fontSize: 15, fontWeight: '900' }, searchEmptyText: { fontSize: 12, lineHeight: 17, marginTop: 4 }, card:`,
'Arama boş durum stilleri');
  return source;
});

patch('src/customer/CustomerShell.tsx', (source) => {
  source = replaceOnce(source,
`  const [tab, setTab] = useState<Tab>('home');
  const openLinking = () => setTab('home');`,
`  const [tab, setTab] = useState<Tab>('home');
  const [serviceDetailOpen, setServiceDetailOpen] = useState(false);
  const openLinking = () => setTab('home');`,
'Servis detay görünümü');
  source = replaceOnce(source,
`  }, [navigationTarget, consumeNavigationTarget]);

  const screen`,
`  }, [navigationTarget, consumeNavigationTarget]);

  useEffect(() => {
    if (tab !== 'services') setServiceDetailOpen(false);
  }, [tab]);

  const screen`,
'Servis detay sıfırlama');
  source = replaceOnce(source,
`          ? <CustomerServicesScreen onStartLink={openLinking} />`,
`          ? <CustomerServicesScreen onStartLink={openLinking} onDetailStateChange={setServiceDetailOpen} />`,
'Servis detay callback');
  source = replaceOnce(source,
`    {['services', 'account'].includes(tab) && <PrivacyCenter />}`,
`    {((tab === 'services' && !serviceDetailOpen) || tab === 'account') && <PrivacyCenter />}`,
'Kalkan detay gizleme');
  return source;
});

patch('src/customer/CustomerServicesScreen.tsx', (source) => {
  source = replaceOnce(source,
`function dateTime(value?: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export function CustomerServicesScreen({ onStartLink }: { onStartLink: () => void }) {`,
`function dateTime(value?: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function hasFinalPrice(item: { total_amount?: number | null }) {
  return Number(item.total_amount || 0) > 0;
}

function displayedPrice(item: { total_amount?: number | null; price_type?: string | null; estimated_price_min?: number | null; estimated_price_max?: number | null }) {
  if (hasFinalPrice(item)) return money(item.total_amount);
  if (item.price_type === 'estimated' && Number(item.estimated_price_min || 0) > 0 && Number(item.estimated_price_max || 0) >= Number(item.estimated_price_min || 0)) {
    return \`Tahmini \${money(item.estimated_price_min)} – \${money(item.estimated_price_max)}\`;
  }
  return 'Son fiyat bekleniyor';
}

export function CustomerServicesScreen({ onStartLink, onDetailStateChange }: { onStartLink: () => void; onDetailStateChange?: (open: boolean) => void }) {`,
'Fiyat gösterim yardımcıları');
  source = replaceOnce(source,
`  useEffect(() => { load(); }, [load]);

  const visible`,
`  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    onDetailStateChange?.(Boolean(selectedId));
    return () => { onDetailStateChange?.(false); };
  }, [selectedId, onDetailStateChange]);

  const visible`,
'Detay görünüm bildirimi');
  source = replaceOnce(source,
`      <View style={styles.moneyRow}><Text style={[styles.amount, { color: colors.text }]}>{money(item.total_amount)}</Text><Text style={[styles.amount, { color: item.remaining_amount > 0 ? colors.orange : colors.green }]}>Kalan {money(item.remaining_amount)}</Text></View>`,
`      <View style={styles.moneyRow}><Text style={[styles.amount, { color: hasFinalPrice(item) ? colors.text : colors.orange }]}>{displayedPrice(item)}</Text><Text style={[styles.amount, { color: hasFinalPrice(item) ? (item.remaining_amount > 0 ? colors.orange : colors.green) : colors.textMuted }]}>{hasFinalPrice(item) ? \`Kalan \${money(item.remaining_amount)}\` : 'Ödeme durumu bekliyor'}</Text></View>`,
'Servis listesi fiyat görünümü');
  source = replaceOnce(source,
`  const current = timeline.indexOf(detail.status);
  const pending = detail.extra_requests?.filter((item) => item.status === 'pending') ?? [];`,
`  const current = timeline.indexOf(detail.status);
  const pending = detail.extra_requests?.filter((item) => item.status === 'pending') ?? [];
  const finalPriceReady = hasFinalPrice(detail);`,
'Detay final fiyat durumu');
  source = replaceOnce(source,
`    <GlassCard style={styles.summary}><Text style={[styles.summaryTitle, { color: colors.text }]}>{detail.complaint}</Text>{detail.diagnosis && <Text style={[styles.diagnosis, { color: colors.textSoft }]}>Tespit: {detail.diagnosis}</Text>}<Text style={[styles.meta, { color: colors.textMuted }]}>{shortDate(detail.arrived_at)}</Text><View style={styles.priceGrid}><Price label="İŞÇİLİK" value={money(detail.labor_amount)} /><Price label="PARÇA" value={money(detail.parts_amount)} /><Price label="TOPLAM" value={money(detail.total_amount)} accent={colors.green} /></View><View style={styles.priceGrid}><Price label="ÖDENEN" value={money(detail.amount_received)} accent={colors.green} /><Price label="KALAN" value={money(detail.remaining_amount)} accent={detail.remaining_amount > 0 ? colors.orange : colors.green} /><Price label="HAZIR" value={dateTime(detail.ready_at)} /></View></GlassCard>`,
`    <GlassCard style={styles.summary}><Text style={[styles.summaryTitle, { color: colors.text }]}>{detail.complaint}</Text>{detail.diagnosis && <Text style={[styles.diagnosis, { color: colors.textSoft }]}>Tespit: {detail.diagnosis}</Text>}<Text style={[styles.meta, { color: colors.textMuted }]}>{shortDate(detail.arrived_at)}</Text><View style={styles.priceGrid}><Price label="İŞÇİLİK" value={money(detail.labor_amount)} /><Price label="PARÇA" value={money(detail.parts_amount)} /><Price label="TOPLAM" value={displayedPrice(detail)} accent={finalPriceReady ? colors.green : colors.orange} /></View><View style={styles.priceGrid}><Price label="ÖDENEN" value={money(detail.amount_received)} accent={colors.green} /><Price label="KALAN" value={finalPriceReady ? money(detail.remaining_amount) : 'Belirlenmedi'} accent={finalPriceReady ? (detail.remaining_amount > 0 ? colors.orange : colors.green) : colors.textMuted} /><Price label="HAZIR" value={dateTime(detail.ready_at)} /></View>{!finalPriceReady && <View style={[styles.pricePending, { backgroundColor: \`${'${colors.orange}'}0D\`, borderColor: \`${'${colors.orange}'}38\` }]}><Ionicons name="information-circle" size={20} color={colors.orange} /><Text style={[styles.pricePendingText, { color: colors.textMuted }]}>Bu tutar henüz kesinleşmedi. Tahmini aralık bilgi amaçlıdır; ödeme tamamlandı sayılmaz. İşletme motoru teslim etmeden önce son net fiyatı kaydedecek.</Text></View>}</GlassCard>`,
'Servis detayı fiyat görünümü');
  source = replaceOnce(source,
`  summaryTitle: { fontSize: 16, fontWeight: '900' },
  diagnosis:`,
`  summaryTitle: { fontSize: 16, fontWeight: '900' },
  pricePending: { minHeight: 66, borderWidth: 1, borderRadius: 16, padding: 11, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  pricePendingText: { flex: 1, fontSize: 11.5, lineHeight: 16 },
  diagnosis:`,
'Fiyat bekliyor stilleri');
  return source;
});

patch('src/notifications/NotificationContext.tsx', (source) => {
  source = replaceOnce(source,
`  archive: (notificationId: string) => Promise<void>;
  openNotification:`,
`  archive: (notificationId: string) => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  openNotification:`,
'Bildirim silme arayüzü');
  source = replaceOnce(source,
`      setNotifications(payload.notifications || []);
      setUpcoming(payload.upcoming || []);`,
`      const sortedNotifications = [...(payload.notifications || [])].sort((a, b) => new Date(b.deliver_at).getTime() - new Date(a.deliver_at).getTime());
      setNotifications(sortedNotifications);
      setUpcoming(payload.upcoming || []);`,
'Bildirim istemci sıralaması');
  source = replaceOnce(source,
`  const openNotification = useCallback(async (notification: GarageNotification) => {`,
`  const deleteNotification = useCallback(async (notificationId: string) => {
    await supabase.rpc('notification_delete', { p_notification_id: notificationId });
    setNotifications((items) => items.filter((item) => item.id !== notificationId));
    setUpcoming((items) => items.filter((item) => item.id !== notificationId));
    await Notifications.cancelScheduledNotificationAsync(\`draborngarage-\${notificationId}\`).catch(() => undefined);
    await refresh();
  }, [refresh]);

  const openNotification = useCallback(async (notification: GarageNotification) => {`,
'Bildirim silme işlemi');
  source = replaceOnce(source,
`    archive,
    openNotification,`,
`    archive,
    deleteNotification,
    openNotification,`,
'Bildirim context değeri');
  source = replaceOnce(source,
`markAllRead, archive, openNotification, updatePreferences`,
`markAllRead, archive, deleteNotification, openNotification, updatePreferences`,
'Bildirim context bağımlılığı');
  source = source.replace("Constants.expoConfig?.version || '0.9.3'", "Constants.expoConfig?.version || '0.9.6'");
  return source;
});

patch('src/notifications/NotificationCenterScreen.tsx', (source) => {
  source = replaceOnce(source,
`    archive,
    openNotification,`,
`    archive,
    deleteNotification,
    openNotification,`,
'Bildirim ekranı silme destructure');
  source = replaceOnce(source,
`  const visible = useMemo(() => {
    if (tab === 'unread') return notifications.filter((item) => !item.read_at);
    if (tab === 'upcoming') return upcoming;
    return notifications;
  }, [tab, notifications, upcoming]);`,
`  const visible = useMemo(() => {
    if (tab === 'upcoming') return upcoming;
    const sourceItems = tab === 'unread' ? notifications.filter((item) => !item.read_at) : notifications;
    return [...sourceItems].sort((a, b) => new Date(b.deliver_at).getTime() - new Date(a.deliver_at).getTime());
  }, [tab, notifications, upcoming]);`,
'Bildirim görünür liste sıralaması');
  source = source.replace('v0.9.3 • SESLİ BİLDİRİM MERKEZİ', 'v0.9.6 • SESLİ BİLDİRİM MERKEZİ');
  source = replaceOnce(source,
`                 onArchive={() => Alert.alert('Bildirim arşivlensin mi?', item.title, [
                   { text: 'Vazgeç' },
                   { text: 'Arşivle', onPress: () => archive(item.id) },
                 ])}
               />`,
`                 onArchive={() => Alert.alert('Bildirim arşivlensin mi?', item.title, [
                   { text: 'Vazgeç' },
                   { text: 'Arşivle', onPress: () => archive(item.id) },
                 ])}
                 onDelete={() => Alert.alert('Bildirim kalıcı olarak silinsin mi?', item.title, [
                   { text: 'Vazgeç' },
                   { text: 'Sil', style: 'destructive', onPress: () => deleteNotification(item.id) },
                 ])}
               />`,
'Bildirim kartı silme aksiyonu');
  source = replaceOnce(source,
`function NotificationCard({ item, upcoming, onOpen, onArchive }: { item: GarageNotification; upcoming: boolean; onOpen: () => void; onArchive: () => void }) {`,
`function NotificationCard({ item, upcoming, onOpen, onArchive, onDelete }: { item: GarageNotification; upcoming: boolean; onOpen: () => void; onArchive: () => void; onDelete: () => void }) {`,
'Bildirim kartı silme prop');
  source = replaceOnce(source,
`      <AnimatedPressable onPress={onArchive} style={[styles.archive, { backgroundColor: \`${'${colors.textMuted}'}0D\` }]}>
        <Ionicons name="archive-outline" size={17} color={colors.textMuted} />
      </AnimatedPressable>`,
`      <View style={styles.notificationActions}>
        <AnimatedPressable onPress={onArchive} style={[styles.archive, { backgroundColor: \`${'${colors.textMuted}'}0D\` }]}>
          <Ionicons name="archive-outline" size={17} color={colors.textMuted} />
        </AnimatedPressable>
        <AnimatedPressable onPress={onDelete} style={[styles.deleteAction, { backgroundColor: \`${'${colors.red}'}10\`, borderColor: \`${'${colors.red}'}35\` }]}>
          <Ionicons name="trash-outline" size={15} color={colors.red} />
        </AnimatedPressable>
      </View>`,
'Bildirim kartı aksiyon ikonları');
  source = replaceOnce(source,
`  archive: { width: 31, height: 31, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },`,
`  notificationActions: { gap: 7, alignItems: 'center' },
  archive: { width: 31, height: 31, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  deleteAction: { width: 27, height: 27, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },`,
'Bildirim aksiyon stilleri');
  return source;
});

patch('src/screens/WorkOrderDetailV04.tsx', (source) => replaceOnce(source,
`  const changeStatus = async (status: WorkOrderStatus) => {
    const { error } = await supabase.rpc('update_work_order_status', { p_work_order_id: orderId, p_status: status });`,
`  const changeStatus = async (status: WorkOrderStatus) => {
    if (status === 'delivered' && Number(order?.total_amount || 0) <= 0) {
      setPriceType('fixed');
      setFixedPrice('');
      setOpenSections((current) => ({ ...current, price: true, status: false }));
      setTimeout(() => scrollRef.current?.scrollTo({ y: 420, animated: true }), 180);
      Alert.alert('Son net fiyat gerekli', 'Motor Hazır durumunda tahmini fiyat gösterilebilir; ancak teslim edilmeden önce son net fiyatı veya yapılan işlem tutarını kaydetmelisin.');
      return;
    }
    const { error } = await supabase.rpc('update_work_order_status', { p_work_order_id: orderId, p_status: status });`,
'Teslim öncesi son fiyat koruması'));

patch('package.json', (source) => source.replace('"version": "0.9.5"', '"version": "0.9.6"'));

const packageLock = JSON.parse(read('package-lock.json'));
packageLock.version = '0.9.6';
packageLock.packages[''].version = '0.9.6';
write('package-lock.json', `${JSON.stringify(packageLock, null, 2)}\n`);

const appJson = JSON.parse(read('app.json'));
appJson.expo.version = '0.9.6';
appJson.expo.android.versionCode = 15;
appJson.expo.ios.buildNumber = '15';
write('app.json', `${JSON.stringify(appJson, null, 2)}\n`);

patch('src/screens/SettingsScreen.tsx', (source) => replaceOnce(source,
`    <SettingsAccordion title="Uygulama" subtitle="v0.9.5 • Usta rapor ve iş sayısı tutarlılığı" icon="information-circle" accent={colors.green} open={openSection === 'app'} onToggle={() => toggleSection('app')}>
      <GlassCard style={styles.info}><Info icon="layers" label="Sürüm" value="v0.9.5 • Usta Rapor ve İş Sayısı Tutarlılığı" /><Info icon="shield-checkmark" label="Gizlilik" value="Uygulama içi politika + hesap silme talebi" /><Info icon="key" label="Şifre güvenliği" value="10 karakter + karmaşıklık + yaygın şifre engeli" /><Info icon="archive" label="Bu sürüm öncesi yedek" value="backup/v0.9.4-before-v0.9.5-20260714" /><Info icon="refresh" label="Geri alma" value="Kod ve veritabanıyla v0.9.4" /><Info icon="phone-portrait" label="Test yöntemi" value="Expo Go + Android bundle + pilot checklist" /><Info icon="storefront" label="Mağaza durumu" value="Auto & Vehicles • finansal hizmet değildir" /></GlassCard>`,
`    <SettingsAccordion title="Uygulama" subtitle="v0.9.6 • Servis fiyatı, bildirim ve canlı sayaç düzeltmeleri" icon="information-circle" accent={colors.green} open={openSection === 'app'} onToggle={() => toggleSection('app')}>
      <GlassCard style={styles.info}><Info icon="layers" label="Sürüm" value="v0.9.6 • Servis Akışı ve Bildirim Düzeltmeleri" /><Info icon="shield-checkmark" label="Gizlilik" value="Kalkan Servislerim listesinde ve Hesabımda" /><Info icon="key" label="Şifre güvenliği" value="10 karakter + karmaşıklık + yaygın şifre engeli" /><Info icon="archive" label="Bu sürüm öncesi yedek" value="backup/v0.9.5-before-v0.9.6-20260714" /><Info icon="refresh" label="Geri alma" value="Kod ve veritabanıyla v0.9.5" /><Info icon="phone-portrait" label="Test yöntemi" value="Expo Go + Android bundle + pilot checklist" /><Info icon="storefront" label="Mağaza durumu" value="Auto & Vehicles • finansal hizmet değildir" /></GlassCard>`,
'Sürüm ayar kartı'));

patch('README.md', (source) => {
  source = source.replace('**v0.9.5 — Usta Rapor ve İş Sayısı Tutarlılığı**', '**v0.9.6 — Servis Akışı, Fiyat ve Bildirim Düzeltmeleri**');
  source = source.replace('v0.9.5; Usta Paneli, Usta Raporu ve İşletme Raporundaki işçilik tutarlarını aynı kurala bağlar; tamamlanan iş sayısını düzeltir ve müşteri kalkanını Servislerim ekranına taşır.', 'v0.9.6; canlı panel sayaçlarını yeniler, fiyat girmeden tamire başlamayı destekler, tahmini fiyatı doğru gösterir, bildirimleri yeniden sıralar ve müşteri servis detayındaki kalkanı kaldırır.');
  source = source.replace('## v0.9.5 ile tamamlananlar', '## v0.9.6 ile tamamlananlar');
  const marker = '## v0.9.6 ile tamamlananlar\n\n';
  source = replaceOnce(source, marker, `${marker}- Usta Paneli Hazır/Tamam sayısının servis hareketlerinde canlı yenilenmesi\n- Hemen Başla seçeneğinde fiyat zorunluluğunun kaldırılması\n- Tahmini fiyatın müşteriye aralık olarak gösterilmesi ve sıfır tutarın ödenmiş sayılmaması\n- Motor tesliminden önce son net fiyat koruması\n- İşletme aramasında modern sonuç bulunamadı kartı\n- Bildirimlerin en yeni kayıt üstte olacak şekilde sıralanması\n- Arşiv ikonunun yanına kalıcı silme ikonu\n- Kalkanın servis detayından kaldırılıp Servislerim listesinde korunması\n\n`, 'README v0.9.6 maddeleri');
  return source;
});

patch('docs/TERMUX_INSTALL.md', (source) => {
  source = source.replace('# Termux — DraBornGarage v0.9.5 Kurulum', '# Termux — DraBornGarage v0.9.6 Kurulum');
  source = source.replace('EXPECTED_VERSION="0.9.5"', 'EXPECTED_VERSION="0.9.6"');
  source = source.replace('## v0.9.4’e kod geri dönüşü', '## v0.9.5’e kod geri dönüşü');
  source = source.replace('## v0.9.4\'e kod geri dönüşü', '## v0.9.5\'e kod geri dönüşü');
  source = source.replace('TARGET_SHA="fc0ce7eb9a9ccb19841330e1ab7913c738e14aad"', 'TARGET_SHA="0d9cbdd21245803e5e187e0b3f77e04dc9bc7193"');
  source = source.replace('supabase/rollbacks/rollback_v0_9_5_to_v0_9_4.sql', 'supabase/rollbacks/rollback_v0_9_6_to_v0_9_5.sql');
  source = source.replace('v0.9.5 Usta rapor tutarlılığı fonksiyonlarını ve otomatik işlem tamamlama tetikleyicisini kaldırmak için:', 'v0.9.6 fiyat, bildirim sıralama ve bildirim silme değişikliklerini kaldırmak için:');
  return source;
});

console.log('v0.9.6 uygulama düzeltmeleri başarıyla uygulandı.');
