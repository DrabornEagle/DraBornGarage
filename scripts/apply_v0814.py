from __future__ import annotations

import json
from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


def replace_required(path: str, before: str, after: str, count: int = 1) -> None:
    source = read(path)
    if before not in source:
        raise RuntimeError(f"{path}: hedef bulunamadı\n{before[:500]}")
    write(path, source.replace(before, after, count))


# Login feature alignment and version badge.
replace_required(
    "src/screens/AuthScreen.tsx",
    'contentOffset={5}',
    'contentOffset={10}',
)
replace_required(
    "src/screens/AuthScreen.tsx",
    'GARAGE OS • v0.8.13 AKILLI SERVİS SİSTEMİ',
    'GARAGE OS • v0.8.14 AKILLI SERVİS SİSTEMİ',
)

# Ready state opens a modern finance prompt; delivered no longer opens the old system Alert.
replace_required(
    "src/screens/WorkOrderDetailV04.tsx",
    "import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';",
    "import { Alert, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';",
)
replace_required(
    "src/screens/WorkOrderDetailV04.tsx",
    "  const [saving, setSaving] = useState(false);\n  const [openSections, setOpenSections]",
    "  const [saving, setSaving] = useState(false);\n  const [readyPaymentPromptVisible, setReadyPaymentPromptVisible] = useState(false);\n  const [openSections, setOpenSections]",
)
replace_required(
    "src/screens/WorkOrderDetailV04.tsx",
    """    if (status === 'delivered' && !isApprentice) {
      Alert.alert('Motosiklet teslim edildi', 'Şimdi tahsilat, açık borç veya veresiye kaydını kontrol et.', [
        { text: 'Daha Sonra', style: 'cancel' },
        { text: 'Borç ve Tahsilata Git', onPress: openReceivableFlow },
      ]);
    }
""",
    """    if (status === 'ready' && !isApprentice) {
      setReadyPaymentPromptVisible(true);
    }
""",
)
replace_required(
    "src/screens/WorkOrderDetailV04.tsx",
    "  return <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>",
    "  return <>\n    <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>",
)
replace_required(
    "src/screens/WorkOrderDetailV04.tsx",
    """    <DetailAccordion title="Borç, Veresiye ve Tahsilat" subtitle="Kalan borç, ödeme sözü, Nakit/IBAN tahsilatı ve müşteri notları." icon="wallet" accent={colors.red} open={openSections.receivables} onToggle={() => toggleSection('receivables')} badge={money(Number(order.total_amount || 0) - Number(order.amount_received || 0))}>
      <ReceivableManagerCard orderId={orderId} onChanged={load} />
    </DetailAccordion>
  </ScrollView>;
}
""",
    """    <DetailAccordion title="Borç, Veresiye ve Tahsilat" subtitle="Kalan borç, ödeme sözü, Nakit/IBAN tahsilatı ve müşteri notları." icon="wallet" accent={colors.red} open={openSections.receivables} onToggle={() => toggleSection('receivables')} badge={money(Number(order.total_amount || 0) - Number(order.amount_received || 0))}>
      <ReceivableManagerCard orderId={orderId} onChanged={load} />
    </DetailAccordion>
    </ScrollView>
    <ReadyPaymentModal
      visible={readyPaymentPromptVisible}
      total={Number(order.total_amount || order.quoted_price || 0)}
      received={Number(order.amount_received || 0)}
      onClose={() => setReadyPaymentPromptVisible(false)}
      onOpenFinance={() => {
        setReadyPaymentPromptVisible(false);
        openReceivableFlow();
      }}
    />
  </>;
}
""",
)
replace_required(
    "src/screens/WorkOrderDetailV04.tsx",
    "function DetailAccordion({ title, subtitle, icon, accent, open, onToggle, badge, children }:",
    """function ReadyPaymentModal({ visible, total, received, onClose, onOpenFinance }: { visible: boolean; total: number; received: number; onClose: () => void; onOpenFinance: () => void }) {
  const { colors } = useTheme();
  const remaining = Math.max(total - received, 0);
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.readyOverlay}>
      <View style={[styles.readyModal, { backgroundColor: colors.cardStrong, borderColor: `${colors.green}55` }]}>
        <View style={[styles.readyIcon, { backgroundColor: `${colors.green}18`, borderColor: `${colors.green}45` }]}><Ionicons name="checkmark-circle" size={36} color={colors.green} /></View>
        <Text style={[styles.readyTitle, { color: colors.text }]}>Motosiklet Hazır</Text>
        <Text style={[styles.readyText, { color: colors.textMuted }]}>Teslimden önce tahsilatı kaydet veya kalan tutarı Borç / Veresiye olarak aç.</Text>
        <View style={[styles.readyAmountCard, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}>
          <View><Text style={[styles.readyAmountLabel, { color: colors.textMuted }]}>SERVİS TOPLAMI</Text><Text style={[styles.readyAmount, { color: colors.text }]}>{money(total)}</Text></View>
          <View style={styles.readyAmountDivider} />
          <View><Text style={[styles.readyAmountLabel, { color: colors.textMuted }]}>KALAN</Text><Text style={[styles.readyAmount, { color: remaining > 0 ? colors.orange : colors.green }]}>{money(remaining)}</Text></View>
        </View>
        <AnimatedPressable onPress={onOpenFinance} style={[styles.readyPrimary, { backgroundColor: colors.green }]}><Ionicons name="wallet" size={20} color="#07131B" /><Text style={styles.readyPrimaryText}>Borç, Veresiye ve Tahsilata Git</Text></AnimatedPressable>
        <AnimatedPressable onPress={onClose} style={[styles.readySecondary, { borderColor: colors.border }]}><Text style={[styles.readySecondaryText, { color: colors.textMuted }]}>Şimdilik Kapat</Text></AnimatedPressable>
      </View>
    </View>
  </Modal>;
}

function DetailAccordion({ title, subtitle, icon, accent, open, onToggle, badge, children }:""",
)
replace_required(
    "src/screens/WorkOrderDetailV04.tsx",
    "  accordionBody: { borderTopWidth: 1, padding: 14, gap: 12 },\n});",
    """  accordionBody: { borderTopWidth: 1, padding: 14, gap: 12 },
  readyOverlay: { flex: 1, backgroundColor: 'rgba(2,7,16,0.72)', alignItems: 'center', justifyContent: 'center', padding: 22 },
  readyModal: { width: '100%', maxWidth: 430, borderWidth: 1, borderRadius: 27, padding: 20, alignItems: 'center' },
  readyIcon: { width: 68, height: 68, borderRadius: 23, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  readyTitle: { fontSize: 24, fontWeight: '900', marginTop: 15 },
  readyText: { fontSize: 14.5, lineHeight: 21, textAlign: 'center', marginTop: 8 },
  readyAmountCard: { width: '100%', minHeight: 88, borderWidth: 1, borderRadius: 19, marginTop: 17, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  readyAmountDivider: { width: 1, height: 46, backgroundColor: 'rgba(148,163,184,0.22)' },
  readyAmountLabel: { fontSize: 10.5, fontWeight: '900', letterSpacing: 0.8 },
  readyAmount: { fontSize: 20, fontWeight: '900', marginTop: 5 },
  readyPrimary: { width: '100%', minHeight: 54, borderRadius: 17, marginTop: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  readyPrimaryText: { color: '#07131B', fontSize: 14, fontWeight: '900' },
  readySecondary: { width: '100%', minHeight: 48, borderRadius: 16, borderWidth: 1, marginTop: 9, alignItems: 'center', justifyContent: 'center' },
  readySecondaryText: { fontSize: 13, fontWeight: '900' },
});""",
)

# Settings version information.
replace_required(
    "src/screens/SettingsScreen.tsx",
    'subtitle="v0.8.13 • sürüm ve sistem bilgileri"',
    'subtitle="v0.8.14 • sürüm ve sistem bilgileri"',
)
replace_required(
    "src/screens/SettingsScreen.tsx",
    'value="v0.8.13 • Giriş Düzeni ve Sürüm Bilgisi"',
    'value="v0.8.14 • Usta Bildirimi ve Tahsilat Akışı"',
)
replace_required(
    "src/screens/SettingsScreen.tsx",
    'value="backup/v0.8.12-before-v0.8.13-20260713"',
    'value="backup/v0.8.13-before-v0.8.14-20260713"',
)
replace_required(
    "src/screens/SettingsScreen.tsx",
    'value="Kod yedeğiyle v0.8.12"',
    'value="Kod yedeğiyle v0.8.13"',
)

# Package versions.
for file_name in ("package.json", "package-lock.json"):
    data = json.loads(read(file_name))
    data["version"] = "0.8.14"
    if file_name == "package-lock.json" and data.get("packages", {}).get(""):
        data["packages"][""]["version"] = "0.8.14"
    write(file_name, json.dumps(data, ensure_ascii=False, indent=2) + "\n")

app_data = json.loads(read("app.json"))
app_data["expo"]["version"] = "0.8.14"
write("app.json", json.dumps(app_data, ensure_ascii=False, indent=2) + "\n")

readme = read("README.md").replace("**v0.8.13 — Giriş Düzeni ve Sürüm Bilgisi**", "**v0.8.14 — Usta Bildirimi ve Tahsilat Akışı**")
readme = readme.replace("v0.8.13; giriş ekranındaki özellik kartlarını dengeler, uygulama içindeki sürüm/yedek bilgilerini güncel tutar ve v0.8 bildirim, servis, randevu, alacak ve platform altyapısını korur.", "v0.8.14; İşletme Sahibi + Usta hesaplarında bildirimleri Usta rolüne indirger, Motor Hazır aşamasında tahsilat akışını açar ve net fiyatın Borç/Veresiye hesabına doğru yansımasını sağlar.")
write("README.md", readme)

roadmap = read("docs/ROADMAP.md").replace("Güncel sürüm `v0.8.13`tür.", "Güncel sürüm `v0.8.14`tür.")
write("docs/ROADMAP.md", roadmap)

write("docs/CHANGELOG_V0.8.14.md", """# DraBornGarage v0.8.14

Tarih: 13 Temmuz 2026

## Giriş ekranı
- `Zamanlı Hatırlatma` simgesi ve metni toplam 10 piksel sağa hizalandı.

## Bildirim rolleri
- İşletme Sahibi + Usta hesapları işletme ve Usta bildirimlerini çift almıyor.
- Bu hesaplarda servis ve randevu operasyon bildirimleri yalnız Usta rolü üzerinden gelir.
- Saf İşletme Sahibi rolü işletme bildirimlerini almaya devam eder.

## Motor Hazır ve tahsilat
- Eski sistem `Motosiklet teslim edildi` uyarısı kaldırıldı.
- `Motor Hazır` seçildiğinde modern `Motosiklet Hazır` penceresi açılır.
- Pencere servis toplamını ve kalan tutarı gösterir.
- `Borç, Veresiye ve Tahsilata Git` düğmesi ilgili kategoriyi açıp sayfayı aşağı taşır.

## Finans düzeltmesi
- Net fiyat girilen ancak işlem/parça satırı olmayan randevulu servislerde toplam tutarın sıfır kalması düzeltildi.
- Net fiyat artık iş emrinin toplamına ve kalan borcuna yansır.
- Mevcut RKS VRS servis kaydı `₺900` toplam ve `₺900` kalan olarak canlı veritabanında düzeltildi.
""")

write("docs/PROJECT_HANDOFF_V0.8.14.md", """# DraBornGarage — v0.8.14 Devam Dosyası

**Güncel sürüm:** `v0.8.14`  
**Önceki sabit yedek:** `backup/v0.8.13-before-v0.8.14-20260713`  
**Sonraki sürüm:** `v0.9.0`

## Tamamlananlar
- Zamanlı Hatırlatma içeriği daha sağa hizalandı.
- İşletme Sahibi + Usta hesaplarında bildirimler Usta rolüne indirildi.
- Motor Hazır aşamasına modern tahsilat yönlendirme penceresi eklendi.
- Teslim Edildi aşamasındaki eski sistem popupı kaldırıldı.
- Net fiyatın toplam tutar ve Borç/Veresiye hesabına yansımama hatası düzeltildi.

## Canlı veritabanı
- `v0_8_14_mechanic_notifications_ready_payment` migration uygulandı.
- `notify_workshop_owners` yalnız saf `owner` rolüne bildirim gönderir.
- Sabit fiyat, normal işlem/parça toplamının altına düşmeyecek şekilde finans toplamına katılır.
- Mevcut kayıtlar yeniden hesaplandı.
""")

write("docs/TERMUX_INSTALL.md", """# Termux — v0.8.13 Yedekle, v0.8.14 Kur

```bash
cd ~
KURULAN_SURUM="v0.8.14"
YEDEK_KLASORU="$HOME/DraBornGarage-v0.8.13-local-backup"
ZIP_DOSYASI="$HOME/DraBornGarage-v0.8.14.zip"
ACILAN_KLASOR="$HOME/DraBornGarage-main"

pkg update -y
pkg install nodejs-lts curl unzip -y
rm -rf "$ACILAN_KLASOR"
rm -f "$ZIP_DOSYASI"

if [ -d "$HOME/DraBornGarage" ]; then
  rm -rf "$YEDEK_KLASORU"
  mv "$HOME/DraBornGarage" "$YEDEK_KLASORU"
fi

curl -L --retry 10 --retry-delay 3 --connect-timeout 30 --max-time 600 \
  "https://github.com/DrabornEagle/DraBornGarage/archive/refs/heads/main.zip" \
  -o "$ZIP_DOSYASI"

unzip -o "$ZIP_DOSYASI" -d "$HOME"
mv "$ACILAN_KLASOR" "$HOME/DraBornGarage"
rm -f "$ZIP_DOSYASI"

if [ -f "$YEDEK_KLASORU/.env" ]; then
  cp "$YEDEK_KLASORU/.env" "$HOME/DraBornGarage/.env"
else
  cp "$HOME/DraBornGarage/.env.example" "$HOME/DraBornGarage/.env"
fi

cd "$HOME/DraBornGarage"
npm install --no-audit --no-fund
npm run typecheck
node -p "require('./package.json').version"
npx expo start -c --go
```

Beklenen sürüm: `0.8.14`.
""")

print("v0.8.14 changes prepared")
