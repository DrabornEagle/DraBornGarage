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
        raise RuntimeError(f"{path}: hedef bulunamadı\n{before[:400]}")
    write(path, source.replace(before, after, count))


replace_required(
    "src/screens/AuthScreen.tsx",
    '<Feature icon="calendar" label="Zamanlı Hatırlatma" color={colors.cyan} />',
    '<Feature icon="calendar" label="Zamanlı Hatırlatma" color={colors.cyan} contentOffset={5} />',
)

replace_required(
    "src/screens/AuthScreen.tsx",
    "function Feature({ icon, label, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; color: string }) {\n  const { colors } = useTheme();\n  return <View style={[styles.feature, { backgroundColor: `${color}10`, borderColor: `${color}34` }]}><Ionicons name={icon} size={16} color={color} /><Text style={[styles.featureText, { color: colors.textSoft }]}>{label}</Text></View>;\n}",
    "function Feature({ icon, label, color, contentOffset = 0 }: { icon: keyof typeof Ionicons.glyphMap; label: string; color: string; contentOffset?: number }) {\n  const { colors } = useTheme();\n  return <View style={[styles.feature, { backgroundColor: `${color}10`, borderColor: `${color}34` }]}><View style={[styles.featureContent, contentOffset ? { transform: [{ translateX: contentOffset }] } : undefined]}><Ionicons name={icon} size={16} color={color} /><Text style={[styles.featureText, { color: colors.textSoft }]}>{label}</Text></View></View>;\n}",
)

replace_required(
    "src/screens/AuthScreen.tsx",
    "feature: { flex: 1, minHeight: 42, borderWidth: 1, borderRadius: 14, paddingHorizontal: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }, featureText: { fontSize: 12, fontWeight: '900' },",
    "feature: { flex: 1, minHeight: 42, borderWidth: 1, borderRadius: 14, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center' }, featureContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }, featureText: { fontSize: 12, fontWeight: '900' },",
)

replace_required(
    "src/screens/AuthScreen.tsx",
    "GARAGE OS • v0.8.12 AKILLI SERVİS SİSTEMİ",
    "GARAGE OS • v0.8.13 AKILLI SERVİS SİSTEMİ",
)

replace_required(
    "src/screens/SettingsScreen.tsx",
    'title="Uygulama" subtitle="v0.8.10 • sürüm ve sistem bilgileri"',
    'title="Uygulama" subtitle="v0.8.13 • sürüm ve sistem bilgileri"',
)

replace_required(
    "src/screens/SettingsScreen.tsx",
    'value="v0.8.10 • Admin Rapor ve Ayarlar Düzeni"',
    'value="v0.8.13 • Giriş Düzeni ve Sürüm Bilgisi"',
)

replace_required(
    "src/screens/SettingsScreen.tsx",
    'value="backup/v0.8.9-before-v0.8.10-20260713"',
    'value="backup/v0.8.12-before-v0.8.13-20260713"',
)

replace_required(
    "src/screens/SettingsScreen.tsx",
    'value="Kod yedeğiyle v0.8.9"',
    'value="Kod yedeğiyle v0.8.12"',
)

replace_required(
    "README.md",
    "**v0.8.6 — İşletme Keşfi, Bağımsız Randevu ve Manuel Kod**",
    "**v0.8.13 — Giriş Düzeni ve Sürüm Bilgisi**",
)

replace_required(
    "README.md",
    "v0.8.0; servis, fiyat, ödeme, ek işlem, randevu, borç/alacak, müşteri eşleştirme ve platform hareketlerini kullanıcıya özel canlı bildirim akışına dönüştürür. Yaklaşan randevu, borç ve platform ödeme kayıtları Expo yerel bildirim sistemiyle telefonda planlanır.",
    "v0.8.13; giriş ekranındaki özellik kartlarını dengeler, uygulama içindeki sürüm/yedek bilgilerini güncel tutar ve v0.8 bildirim, servis, randevu, alacak ve platform altyapısını korur.",
)

replace_required(
    "docs/ROADMAP.md",
    "Güncel sürüm `v0.8.12`dir.",
    "Güncel sürüm `v0.8.13`tür.",
)

for file_name in ("package.json", "package-lock.json"):
    data = json.loads(read(file_name))
    data["version"] = "0.8.13"
    if file_name == "package-lock.json" and data.get("packages", {}).get(""):
        data["packages"][""]["version"] = "0.8.13"
    write(file_name, json.dumps(data, ensure_ascii=False, indent=2) + "\n")

app_data = json.loads(read("app.json"))
app_data["expo"]["version"] = "0.8.13"
write("app.json", json.dumps(app_data, ensure_ascii=False, indent=2) + "\n")

write("docs/CHANGELOG_V0.8.13.md", """# DraBornGarage v0.8.13

Tarih: 13 Temmuz 2026

## Giriş ekranı
- `Zamanlı Hatırlatma` kartındaki takvim simgesi ve metin grubu 5 piksel sağa taşındı.
- Kartın dış ölçüsü ve üçlü özellik satırının dengesi korunarak yalnızca iç içerik hizası düzeltildi.

## Uygulama bilgileri
- Ayarlar > Uygulama bölümündeki eski `v0.8.10` bilgileri `v0.8.13` olarak güncellendi.
- Sürüm açıklaması `Giriş Düzeni ve Sürüm Bilgisi` oldu.
- Önceki sürüm yedeği `backup/v0.8.12-before-v0.8.13-20260713` olarak güncellendi.
- Geri alma sürümü `v0.8.12` olarak düzeltildi.

## Teknik
- Paket ve Expo sürümü `0.8.13` oldu.
""")

write("docs/PROJECT_HANDOFF_V0.8.13.md", """# DraBornGarage — v0.8.13 Devam Dosyası

**Güncel sürüm:** `v0.8.13`  
**Önceki sabit yedek:** `backup/v0.8.12-before-v0.8.13-20260713`  
**Sonraki sürüm:** `v0.9.0`

## Tamamlananlar
- Giriş ekranındaki `Zamanlı Hatırlatma` simgesi ve metni biraz sağa taşındı.
- Ayarlar > Uygulama bölümündeki sürüm, yedek ve geri alma bilgileri güncellendi.
- Giriş ekranı sürüm rozeti `v0.8.13` oldu.
- README ve yol haritasındaki güncel sürüm bilgileri düzeltildi.
""")

write("docs/TERMUX_INSTALL.md", """# Termux — v0.8.12 Yedekle, v0.8.13 Kur

```bash
cd ~
YEDEK_KLASORU="$HOME/DraBornGarage-v0.8.12-local-backup"
ZIP_DOSYASI="$HOME/DraBornGarage-v0.8.13.zip"
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

Beklenen sürüm: `0.8.13`.
""")

print("v0.8.13 changes prepared")
