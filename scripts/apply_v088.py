from __future__ import annotations

import json
from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


def replace_required(path: str, before: str, after: str) -> None:
    source = read(path)
    if before not in source:
        raise RuntimeError(f"{path}: target not found\n{before[:180]}")
    write(path, source.replace(before, after, 1))


# Notification routing: restore the real working bell on Home, but hide it on Customers and Receivables.
replace_required(
    "src/AppShell.tsx",
    "      {tab !== 'home' && <NotificationBell />}",
    "      {tab !== 'customers' && tab !== 'receivables' && <NotificationBell />}",
)

# Remove the decorative inactive grey bell from the Home header.
replace_required(
    "src/screens/HomeScreen.tsx",
    "        subtitle={`${workshop?.name ?? 'DraBornGarage'} • ${new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}`}\n        actionIcon=\"notifications-outline\"\n        onAction={() => undefined}\n",
    "        subtitle={`${workshop?.name ?? 'DraBornGarage'} • ${new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}`}\n",
)

# Platform payment page: remove New Architecture warning and suppress the old demo instruction text.
replace_required(
    "src/components/PlatformFeesDashboard.tsx",
    "import { Alert, Image, LayoutAnimation, Linking, Platform, ScrollView, Share, StyleSheet, Switch, Text, UIManager, View } from 'react-native';",
    "import { Alert, Image, LayoutAnimation, Linking, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';",
)
replace_required(
    "src/components/PlatformFeesDashboard.tsx",
    "  useEffect(() => {\n    if (Platform.OS === 'android') {\n      const manager = UIManager as typeof UIManager & { setLayoutAnimationEnabledExperimental?: (enabled: boolean) => void };\n      manager.setLayoutAnimationEnabledExperimental?.(true);\n    }\n  }, []);\n\n",
    "",
)
replace_required(
    "src/components/PlatformFeesDashboard.tsx",
    "{settings.payment_note && <Text style={[styles.bankNote, { color: colors.textMuted }]}>{settings.payment_note}</Text>}",
    "{settings.payment_note && settings.payment_note !== 'Açıklamaya işletme adı ve dönem bilgisini yazın.' && <Text style={[styles.bankNote, { color: colors.textMuted }]}>{settings.payment_note}</Text>}",
)

# Reports: modern collapsible main categories.
replace_required(
    "src/components/ReportsDashboard.tsx",
    "function BusinessView({ report }: { report: BusinessReport }) {\n  const { colors } = useTheme();\n  const s = report.summary;",
    "function BusinessView({ report }: { report: BusinessReport }) {\n  const { colors } = useTheme();\n  const [topServicesOpen, setTopServicesOpen] = useState(false);\n  const [recentOrdersOpen, setRecentOrdersOpen] = useState(false);\n  const s = report.summary;",
)
replace_required(
    "src/components/ReportsDashboard.tsx",
    "    <Text style={[styles.listTitle, { color: colors.text }]}>En Çok Yapılan İşlemler</Text>\n    <GlassCard style={styles.listCard}>{report.top_services.length === 0 ? <Empty text=\"İşlem verisi yok.\" /> : report.top_services.map((item, index) => <View key={`${item.title}-${index}`} style={[styles.rankRow, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}><View style={[styles.rank, { backgroundColor: `${colors.primary}16` }]}><Text style={[styles.rankText, { color: colors.primary }]}>{index + 1}</Text></View><View style={styles.copy}><Text style={[styles.rowTitle, { color: colors.text }]}>{item.title}</Text><Text style={[styles.rowMeta, { color: colors.textMuted }]}>{item.service_count} işlem</Text></View><Text style={[styles.rowAmount, { color: colors.green }]}>{money(n(item.recorded_amount))}</Text></View>)}</GlassCard>\n\n    <Text style={[styles.listTitle, { color: colors.text }]}>Son Servis Kayıtları</Text>\n    <View style={styles.stack}>{report.recent_orders.length === 0 ? <Empty text=\"Bu dönemde servis kaydı yok.\" /> : report.recent_orders.slice(0, 30).map((item) => <BusinessJobCard key={item.work_order_id} item={item} />)}</View>",
    "    <ReportAccordion title=\"En Çok Yapılan İşlemler\" subtitle={`${report.top_services.length} işlem türü • seçilen dönem`} icon=\"podium\" accent={colors.primary} open={topServicesOpen} onToggle={() => setTopServicesOpen((value) => !value)}>\n      <GlassCard style={styles.listCard}>{report.top_services.length === 0 ? <Empty text=\"İşlem verisi yok.\" /> : report.top_services.map((item, index) => <View key={`${item.title}-${index}`} style={[styles.rankRow, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}><View style={[styles.rank, { backgroundColor: `${colors.primary}16` }]}><Text style={[styles.rankText, { color: colors.primary }]}>{index + 1}</Text></View><View style={styles.copy}><Text style={[styles.rowTitle, { color: colors.text }]}>{item.title}</Text><Text style={[styles.rowMeta, { color: colors.textMuted }]}>{item.service_count} işlem</Text></View><Text style={[styles.rowAmount, { color: colors.green }]}>{money(n(item.recorded_amount))}</Text></View>)}</GlassCard>\n    </ReportAccordion>\n\n    <ReportAccordion title=\"Son Servis Kayıtları\" subtitle={`${Math.min(report.recent_orders.length, 30)} kayıt gösterilecek`} icon=\"receipt\" accent={colors.orange} open={recentOrdersOpen} onToggle={() => setRecentOrdersOpen((value) => !value)}>\n      <View style={styles.stack}>{report.recent_orders.length === 0 ? <Empty text=\"Bu dönemde servis kaydı yok.\" /> : report.recent_orders.slice(0, 30).map((item) => <BusinessJobCard key={item.work_order_id} item={item} />)}</View>\n    </ReportAccordion>",
)
replace_required(
    "src/components/ReportsDashboard.tsx",
    "function PersonalView({ report }: { report: PersonalReport }) {\n  const { colors } = useTheme();\n  const s = report.summary;",
    "function PersonalView({ report }: { report: PersonalReport }) {\n  const { colors } = useTheme();\n  const [jobsOpen, setJobsOpen] = useState(false);\n  const s = report.summary;",
)
replace_required(
    "src/components/ReportsDashboard.tsx",
    "    <Text style={[styles.listTitle, { color: colors.text }]}>Kişisel İş Geçmişim</Text>\n    <Text style={[styles.listSubtitle, { color: colors.textMuted }]}>Motorun geliş saati, yaptığın işlemler, kaydettiğin tutar ve kullandığın parçalar.</Text>\n    <View style={styles.stack}>{report.jobs.length === 0 ? <Empty text=\"Bu dönemde sana ait iş kaydı yok.\" /> : report.jobs.map((item) => <PersonalJobCard key={item.work_order_id} item={item} />)}</View>",
    "    <ReportAccordion title=\"Kişisel İş Geçmişim\" subtitle={`${report.jobs.length} motor • işlem, parça ve tutar detayları`} icon=\"time\" accent={colors.green} open={jobsOpen} onToggle={() => setJobsOpen((value) => !value)}>\n      <View style={styles.stack}>{report.jobs.length === 0 ? <Empty text=\"Bu dönemde sana ait iş kaydı yok.\" /> : report.jobs.map((item) => <PersonalJobCard key={item.work_order_id} item={item} />)}</View>\n    </ReportAccordion>",
)
replace_required(
    "src/components/ReportsDashboard.tsx",
    "function ChartSection({ title, subtitle, daily, hourly }: { title: string; subtitle: string; daily: DailyPoint[]; hourly: HourlyPoint[] }) {",
    "function ReportAccordion({ title, subtitle, icon, accent, open, onToggle, children }: { title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap; accent: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {\n  const { colors } = useTheme();\n  return <View style={[styles.reportAccordion, { backgroundColor: colors.card, borderColor: open ? `${accent}58` : colors.border }]}>\n    <AnimatedPressable onPress={onToggle} style={styles.reportAccordionHeader}>\n      <View style={[styles.reportAccordionIcon, { backgroundColor: `${accent}16` }]}><Ionicons name={icon} size={22} color={accent} /></View>\n      <View style={styles.copy}><Text style={[styles.reportAccordionTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.reportAccordionSubtitle, { color: colors.textMuted }]}>{subtitle}</Text></View>\n      <View style={[styles.reportAccordionChevron, { backgroundColor: `${accent}12`, borderColor: `${accent}36` }]}><Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={accent} /></View>\n    </AnimatedPressable>\n    {open && <View style={[styles.reportAccordionBody, { borderTopColor: colors.border }]}>{children}</View>}\n  </View>;\n}\n\nfunction ChartSection({ title, subtitle, daily, hourly }: { title: string; subtitle: string; daily: DailyPoint[]; hourly: HourlyPoint[] }) {",
)
replace_required(
    "src/components/ReportsDashboard.tsx",
    "  disclaimer: { fontSize: 12.5, lineHeight: 18, textAlign: 'center' }, listTitle:",
    "  disclaimer: { fontSize: 12.5, lineHeight: 18, textAlign: 'center' }, reportAccordion: { borderWidth: 1, borderRadius: 22, overflow: 'hidden' }, reportAccordionHeader: { minHeight: 82, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 11 }, reportAccordionIcon: { width: 47, height: 47, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, reportAccordionTitle: { fontSize: 15.5, fontWeight: '900' }, reportAccordionSubtitle: { fontSize: 11.5, lineHeight: 15, marginTop: 4 }, reportAccordionChevron: { width: 38, height: 38, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, reportAccordionBody: { borderTopWidth: 1, padding: 12, gap: 12 }, listTitle:",
)

# Version files.
for file_name in ("package.json", "package-lock.json"):
    data = json.loads(read(file_name))
    data["version"] = "0.8.8"
    if file_name == "package-lock.json" and data.get("packages", {}).get(""):
        data["packages"][""]["version"] = "0.8.8"
    write(file_name, json.dumps(data, ensure_ascii=False, indent=2) + "\n")

app_data = json.loads(read("app.json"))
app_data["expo"]["version"] = "0.8.8"
write("app.json", json.dumps(app_data, ensure_ascii=False, indent=2) + "\n")

replace_required("src/screens/SettingsScreen.tsx", "v0.8.7 • Ana Sayfa ve Platform Arayüzü", "v0.8.8 • Bildirim, Rapor ve Sportbike Arayüzü")
replace_required("src/screens/SettingsScreen.tsx", "backup/v0.8.6-before-v0.8.7-20260712", "backup/v0.8.7-before-v0.8.8-ui-fix-20260712")
replace_required("src/screens/SettingsScreen.tsx", "Kod yedeğiyle v0.8.6", "Kod yedeğiyle v0.8.7")

readme = read("README.md")
readme = readme.replace("**Kurulan sürüm:** `v0.8.7`", "**Kurulan sürüm:** `v0.8.8`")
readme = readme.replace("backup/v0.8.6-before-v0.8.7-20260712", "backup/v0.8.7-before-v0.8.8-ui-fix-20260712")
write("README.md", readme)

roadmap = read("docs/ROADMAP.md")
roadmap = roadmap.replace("Güncel sürüm `v0.8.7`dür.", "Güncel sürüm `v0.8.8`dür.")
if "## v0.8.8" not in roadmap:
    roadmap = roadmap.replace(
        "## v0.9 — Google Play Uyum, Test ve Pilot",
        "## v0.8.8 — Bildirim, Rapor ve Sportbike Arayüzü ✅\n\n- [x] Çalışan bildirim zilini ana sayfaya geri getirme\n- [x] Dekoratif gri zil ikonunu kaldırma\n- [x] Müşteri ve Alacak ekranlarında yüzen zili gizleme\n- [x] Rapor detaylarını açılır-kapanır ana kategorilere dönüştürme\n- [x] Modern yarış motosikleti ikonunu yenileme\n- [x] Varsayılan platform açıklama metnini kaldırma\n\n## v0.9 — Google Play Uyum, Test ve Pilot",
    )
write("docs/ROADMAP.md", roadmap)

write(
    "docs/CHANGELOG_V0.8.8.md",
    """# DraBornGarage v0.8.8

Tarih: 12 Temmuz 2026

## Bildirim zili
- Ana sayfada çalışan Bildirim Merkezi zili geri getirildi.
- HomeScreen başlığındaki dekoratif ve işlevsiz gri zil kaldırıldı.
- Müşteriler ve Alacak ekranlarında yüzen zil gizlendi.

## Merkez raporları
- En Çok Yapılan İşlemler açılır-kapanır ana kategori oldu.
- Son Servis Kayıtları açılır-kapanır ana kategori oldu.
- Kişisel İş Geçmişim açılır-kapanır ana kategori oldu.
- Kapalı kategori başlıklarında kayıt sayısı ve kısa özet gösterilir.

## Motosiklet ikonu
- Motosiklet çizimi modern yarış motosikleti / sportbike görünümünde yeniden tasarlandı.
- Aerodinamik grenaj, depo, kuyruk, ön cam, maşa, egzoz ve yarış jantı detayları eklendi.
- Süspansiyon hareketi, zemin gölgesi ve hız çizgileri geliştirildi.

## Platform ödeme bilgileri
- “Açıklamaya işletme adı ve dönem bilgisini yazın.” varsayılan demo metni kaldırıldı.
- New Architecture altında gereksiz uyarı oluşturan eski LayoutAnimation etkinleştirme çağrısı kaldırıldı.
""",
)

write(
    "docs/PROJECT_HANDOFF_V0.8.8.md",
    """# DraBornGarage — v0.8.8 Devam Dosyası

**Güncel sürüm:** `v0.8.8`  
**Önceki sabit yedek:** `backup/v0.8.7-before-v0.8.8-ui-fix-20260712`  
**Sonraki sürüm:** `v0.9.0`

## Tamamlanan kapsam
- Çalışan Bildirim Merkezi zilinin ana sayfaya geri getirilmesi.
- Dekoratif gri zilin HomeScreen başlığından kaldırılması.
- Müşteri ve Alacak sayfalarında yüzen zilin gizlenmesi.
- En Çok Yapılan İşlemler, Son Servis Kayıtları ve Kişisel İş Geçmişim alanlarının açılır-kapanır ana kategorilere dönüştürülmesi.
- Modern animasyonlu sportbike motosiklet SVG çizimi.
- Varsayılan platform ödeme açıklamasının kaldırılması.

## Doğrulama
- TypeScript kontrolü.
- Android JavaScript bundle kontrolü.

## Kurulum
- Yerel yedek: `DraBornGarage-v0.8.7-local-backup`
- Termux komutu: `docs/TERMUX_INSTALL.md`
""",
)

write(
    "docs/TERMUX_INSTALL.md",
    """# Termux — v0.8.7 Yedekle, v0.8.8 Kur

```bash
cd ~

KURULAN_SURUM="v0.8.8"
YEDEKLENEN_SURUM="v0.8.7"
YEDEK_KLASORU="$HOME/DraBornGarage-v0.8.7-local-backup"
ZIP_DOSYASI="$HOME/DraBornGarage-v0.8.8.zip"
ACILAN_KLASOR="$HOME/DraBornGarage-main"

printf '\n========================================\n'
printf 'KURULACAK YENİ SÜRÜM: %s\n' "$KURULAN_SURUM"
printf 'YEDEKLENECEK SÜRÜM: %s\n' "$YEDEKLENEN_SURUM"
printf 'YEDEK KLASÖRÜ: %s\n' "$YEDEK_KLASORU"
printf '========================================\n\n'

pkg update -y
pkg install nodejs-lts curl unzip -y

rm -rf "$YEDEK_KLASORU" "$ACILAN_KLASOR"
rm -f "$ZIP_DOSYASI"

if [ -d "$HOME/DraBornGarage" ]; then
  mv "$HOME/DraBornGarage" "$YEDEK_KLASORU"
  echo "Mevcut v0.8.7 sürümü yedeklendi."
fi

curl -L \
  --retry 10 \
  --retry-delay 3 \
  --connect-timeout 30 \
  --max-time 600 \
  "https://github.com/DrabornEagle/DraBornGarage/archive/refs/heads/main.zip" \
  -o "$ZIP_DOSYASI"

unzip -o "$ZIP_DOSYASI" -d "$HOME"
mv "$ACILAN_KLASOR" "$HOME/DraBornGarage"
rm -f "$ZIP_DOSYASI"

if [ -f "$YEDEK_KLASORU/.env" ]; then
  cp "$YEDEK_KLASORU/.env" "$HOME/DraBornGarage/.env"
  echo "Mevcut .env dosyası yeni sürüme aktarıldı."
else
  cp "$HOME/DraBornGarage/.env.example" "$HOME/DraBornGarage/.env"
  echo "Yeni .env dosyası oluşturuldu."
fi

cd "$HOME/DraBornGarage"
npm config set registry "https://registry.npmjs.org/"
npm config set fetch-retries 10
npm config set fetch-retry-factor 2
npm config set fetch-retry-mintimeout 20000
npm config set fetch-retry-maxtimeout 120000
npm config set fetch-timeout 300000
npm install --no-audit --no-fund
npm run typecheck
node -p "require('./package.json').version"
npx expo start -c --go
```

Beklenen sürüm: `0.8.8`.

Bağlantı sorunu olursa:

```bash
cd ~/DraBornGarage
npx expo start -c --tunnel --go
```

Kod yedeği: `backup/v0.8.7-before-v0.8.8-ui-fix-20260712`.
""",
)

write(
    "supabase/migrations/20260712193000_v0_8_8_remove_default_platform_note.sql",
    """update public.platform_global_settings
set payment_note = null,
    updated_at = now()
where payment_note = 'Açıklamaya işletme adı ve dönem bilgisini yazın.';
""",
)
write(
    "supabase/rollbacks/20260712193000_v0_8_8_remove_default_platform_note_rollback.sql",
    """update public.platform_global_settings
set payment_note = 'Açıklamaya işletme adı ve dönem bilgisini yazın.',
    updated_at = now()
where id = 1 and payment_note is null;
""",
)

print("v0.8.8 changes prepared")
