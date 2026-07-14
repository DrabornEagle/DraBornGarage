from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


def replace_once(path: str, old: str, new: str) -> None:
    content = read(path)
    if old not in content:
        raise RuntimeError(f"Pattern not found in {path}: {old[:120]!r}")
    write(path, content.replace(old, new, 1))


# Privacy button: only shells decide visibility; button itself belongs in the top-right corner.
replace_once(
    "src/privacy/PrivacyCenter.tsx",
    "floatingButton: { position: 'absolute', zIndex: 80, top: 50, left: 14,",
    "floatingButton: { position: 'absolute', zIndex: 80, top: 50, right: 14,",
)

# Modern and explanatory calendar mode cards.
replace_once(
    "src/screens/AppointmentsScreen.tsx",
    "import { Ionicons } from '@expo/vector-icons';\n",
    "import { Ionicons } from '@expo/vector-icons';\nimport { LinearGradient } from 'expo-linear-gradient';\n",
)
replace_once(
    "src/screens/AppointmentsScreen.tsx",
    """    <View style={[styles.tabs, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}>
      {([['calendar', 'Takvim', 'calendar'], ['new', editing ? 'Yeniden Planla' : 'Randevu Ekle', 'add-circle'], ['schedule', 'Çalışma Saatleri', 'time']] as [Tab, string, keyof typeof Ionicons.glyphMap][]).map(([value, label, icon]) => <AnimatedPressable key={value} onPress={() => { setTab(value); if (value !== 'new') setEditing(null); }} style={[styles.tab, tab === value && { backgroundColor: colors.cardStrong, borderColor: `${colors.primary}60` }]}><Ionicons name={icon} size={18} color={tab === value ? colors.primary : colors.textMuted} /><Text style={[styles.tabText, { color: tab === value ? colors.text : colors.textMuted }]}>{label}</Text></AnimatedPressable>)}
    </View>""",
    """    <View style={styles.modeGrid}>
      <AppointmentModeCard
        active={tab === 'calendar'}
        title="Takvim"
        subtitle="Günlük randevuları gör, onayla ve yönet"
        icon="calendar"
        accent={colors.cyan}
        onPress={() => { setTab('calendar'); setEditing(null); }}
      />
      <AppointmentModeCard
        active={tab === 'new'}
        title={editing ? 'Yeniden Planla' : 'Randevu Ekle'}
        subtitle={editing ? 'Seçili randevunun tarih ve saatini değiştir' : 'Müşteri ve Usta için yeni randevu oluştur'}
        icon="add-circle"
        accent={colors.green}
        onPress={() => setTab('new')}
      />
      <AppointmentModeCard
        active={tab === 'schedule'}
        title="Çalışma Saatleri"
        subtitle="Müsaitlik, mola ve kapalı zamanları düzenle"
        icon="time"
        accent={colors.orange}
        onPress={() => { setTab('schedule'); setEditing(null); }}
      />
    </View>""",
)
marker = "function Choice({ active, title, sub, onPress }:"
helper = """function AppointmentModeCard({ active, title, subtitle, icon, accent, onPress }: { active: boolean; title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap; accent: string; onPress: () => void }) {
  const { colors } = useTheme();
  return <AnimatedPressable
    accessibilityRole="button"
    accessibilityState={{ selected: active }}
    onPress={onPress}
    style={[styles.modeCard, {
      backgroundColor: active ? 'transparent' : colors.card,
      borderColor: active ? accent : colors.border,
      shadowColor: active ? accent : colors.black,
    }]}
  >
    {active && <LinearGradient
      colors={[`${accent}EE`, `${colors.primary2}E8`, `${colors.black}F2`]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
    />}
    <View style={[styles.modeIcon, {
      backgroundColor: active ? 'rgba(255,255,255,0.16)' : `${accent}15`,
      borderColor: active ? 'rgba(255,255,255,0.26)' : `${accent}35`,
    }]}>
      <Ionicons name={icon} size={24} color={active ? '#fff' : accent} />
    </View>
    <View style={styles.copy}>
      <Text numberOfLines={1} style={[styles.modeTitle, { color: active ? '#fff' : colors.text }]}>{title}</Text>
      <Text numberOfLines={2} style={[styles.modeSubtitle, { color: active ? 'rgba(255,255,255,0.78)' : colors.textMuted }]}>{subtitle}</Text>
    </View>
    <Ionicons name={active ? 'checkmark-circle' : 'chevron-forward-circle'} size={22} color={active ? '#fff' : accent} />
  </AnimatedPressable>;
}

"""
content = read("src/screens/AppointmentsScreen.tsx")
if marker not in content:
    raise RuntimeError("Appointment helper insertion marker was not found")
write("src/screens/AppointmentsScreen.tsx", content.replace(marker, helper + marker, 1))
replace_once(
    "src/screens/AppointmentsScreen.tsx",
    "content: { paddingHorizontal: 18, paddingTop: 56, paddingBottom: 120, gap: 15 }, tabs: { flexDirection: 'row', gap: 5, padding: 5, borderWidth: 1, borderRadius: 18 }, tab: { flex: 1, minHeight: 48, borderWidth: 1, borderColor: 'transparent', borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 3 }, tabText: { fontSize: 12, fontWeight: '900', textAlign: 'center' }, sectionGap:",
    "content: { paddingHorizontal: 18, paddingTop: 56, paddingBottom: 120, gap: 15 }, modeGrid: { gap: 9 }, modeCard: { minHeight: 82, borderWidth: 1, borderRadius: 23, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden', shadowOpacity: 0.2, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 6 }, modeIcon: { width: 50, height: 50, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, modeTitle: { fontSize: 15.5, fontWeight: '900' }, modeSubtitle: { fontSize: 11.5, lineHeight: 16, marginTop: 4 }, sectionGap:",
)

# v0.9.1 metadata and native notification sounds.
app_path = ROOT / "app.json"
app = json.loads(app_path.read_text(encoding="utf-8"))
expo = app["expo"]
expo["version"] = "0.9.1"
expo["ios"]["buildNumber"] = "10"
expo["android"]["versionCode"] = 10
for plugin in expo.get("plugins", []):
    if isinstance(plugin, list) and plugin and plugin[0] == "expo-notifications":
        settings = plugin[1]
        settings["defaultChannel"] = "draborngarage-chime-v1"
        settings["sounds"] = [
            "./assets/sounds/garage_chime.wav",
            "./assets/sounds/garage_pulse.wav",
            "./assets/sounds/garage_alert.wav",
        ]
app_path.write_text(json.dumps(app, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

package_path = ROOT / "package.json"
package = json.loads(package_path.read_text(encoding="utf-8"))
package["version"] = "0.9.1"
package_path.write_text(json.dumps(package, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

lock_path = ROOT / "package-lock.json"
lock = json.loads(lock_path.read_text(encoding="utf-8"))
lock["version"] = "0.9.1"
lock.setdefault("packages", {}).setdefault("", {})["version"] = "0.9.1"
lock_path.write_text(json.dumps(lock, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

notification_context = read("src/notifications/NotificationContext.tsx").replace("'0.8.17'", "'0.9.1'")
write("src/notifications/NotificationContext.tsx", notification_context)

# Google Play positioning: this is an automotive workshop utility, not a financial service.
listing_path = "docs/GOOGLE_PLAY_LISTING_TR.md"
listing = read(listing_path)
listing = listing.replace("**İş / Business**", "**Otomobil ve Araçlar / Auto & Vehicles**")
listing = listing.replace(
    "## Sürüm notu — v0.9.0",
    "## Google Play hizmet sınıflandırması\n\nDraBornGarage bir bankacılık, kredi, yatırım, kripto, dijital cüzdan veya ödeme işleme uygulaması değildir. Uygulama yalnız servis işletmesinin kendi Nakit/IBAN tahsilat durumunu ve platform hizmet bedeli bildirimini kayıt altına alır; kullanıcı adına para transferi yapmaz.\n\n## Sürüm notu — v0.9.1",
)
write(listing_path, listing)

write("docs/GOOGLE_PLAY_PERSONAL_ACCOUNT_POSITIONING.md", """# DraBornGarage — Google Play Kişisel Hesap Konumlandırması

## Doğru uygulama sınıfı

- Kategori: **Otomobil ve Araçlar / Auto & Vehicles**
- Temel işlev: motosiklet/oto servis randevusu, iş emri, atölye, müşteri ve araç takibi
- Finansal hizmet sunmaz
- Bankacılık, kredi, yatırım, kripto, cüzdan veya para transferi yapmaz
- Kredi kartı işlemez ve kullanıcı parasını tutmaz
- Nakit/IBAN alanları yalnız işletmenin tamamlanmış servis tahsilatını manuel kaydetmesi içindir
- Platform hizmet bedeli alanı yalnız bildirim/onay kaydıdır; uygulama içinden ödeme alınmaz

## Play Console hesap türü

Google Play'de kişisel ve kuruluş hesapları aynı yayın özelliklerine erişebilir. Yayıncı gerçekten bireysel, hobi veya amatör geliştirici olarak hareket ediyorsa **Kişisel** hesap kullanılabilir. Uygulama bir şirket veya ticari kuruluş adına yayınlanıyorsa Google'ın kurallarına göre kuruluş hesabı seçilmelidir.

Kod veya mağaza metni, Google'ın kimlik ve hesap türü doğrulamasını atlatamaz. Bu dosyanın amacı uygulamayı yanlışlıkla “finansal hizmet” kategorisine sokabilecek ifadeleri kaldırmak ve uygulamanın gerçek işlevini açıkça anlatmaktır.

## Play Console beyanlarında kullanılacak net cevaplar

- Uygulama finansal ürün/hizmet sunuyor mu? **Hayır**
- Uygulama ödeme işliyor veya para transfer ediyor mu? **Hayır**
- Uygulama kredi kartı ya da banka hesabına erişiyor mu? **Hayır**
- Uygulamadaki IBAN ne için? **İşletmenin kendi dış transfer bilgisini göstermesi ve manuel ödeme bildirimi kaydı**
- Ana hedef kitle: **Motosiklet/oto servis işletmeleri, Ustalar ve servis müşterileri**
- Uygulamanın değeri: **Servis operasyonlarını, randevuları ve araç geçmişini tek yerde düzenlemek**

## Kişisel hesap kapalı test şartı

Yeni kişisel geliştirici hesaplarında Google Play'in kapalı test şartları ayrıca uygulanır. Kurumsal hesap gerekmemesi, kapalı test yükümlülüğünün ortadan kalktığı anlamına gelmez.
""")

write("docs/CHANGELOG_V0.9.1.md", """# DraBornGarage v0.9.1 — Changelog

**Tarih:** 14 Temmuz 2026

- Ayarlar ekranındaki sağ üst bildirim zili kaldırıldı.
- Gizlilik ve Hesap kalkanı yalnız Takvim ve Ayarlar/Hesabım ekranında sağ üste taşındı.
- Takvim, Randevu Ekle ve Çalışma Saatleri seçimi modern açıklamalı kartlara dönüştürüldü.
- Garage Chime, Garage Pulse, Garage Alert ve Sessiz seçenekleri eklendi.
- Bildirim Merkezi ayarlarından ses seçimi ve ses testi eklendi.
- EAS native build için özel WAV sesleri paket yapılandırmasına eklendi.
- Expo push token kaydı ve Supabase pg_net/pg_cron push dağıtımı hazırlandı.
- Uygulama kapalıyken uzaktan bildirim için EAS preview/production build yolu eklendi.
- İşletme ödeme bildirimi güçlü görsel vurgu kazandı.
- Ödeme bildirimine dokununca doğru işletme ve ilgili Admin onay kartı açılıyor.
- Google Play kategorisi Auto & Vehicles olarak netleştirildi.
- Uygulamanın finansal hizmet sunmadığı mağaza ve hesap türü belgelerinde açıklandı.
""")

readme = read("README.md")
readme = readme.replace("**v0.9.0 — Google Play Uyum, Test ve Pilot**", "**v0.9.1 — Bildirim Sesi, Ödeme Odağı ve Takvim Arayüzü**")
readme = readme.replace("v0.9.0; uygulama içi", "v0.9.1; modern takvim kartları, seçilebilir özel bildirim sesleri, uygulama kapalıyken push altyapısı ve doğrudan ödeme onayıyla birlikte v0.9.0'ın uygulama içi")
write("README.md", readme)

# Restore the normal quality workflow and remove temporary patch workflows from the release diff.
write(".github/workflows/quality.yml", """name: DraBornGarage Quality Gate

on:
  push:
    branches: [main, "feature/**"]
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  android-quality:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install locked dependencies
        run: npm ci --no-audit --no-fund

      - name: TypeScript
        run: npm run typecheck

      - name: Android JavaScript bundle
        run: npm run test:bundle
""")
for temporary in [
    ROOT / ".github/workflows/apply-v091-ui-patch.yml",
]:
    if temporary.exists():
        temporary.unlink()

print("v0.9.1 finalizer completed")
