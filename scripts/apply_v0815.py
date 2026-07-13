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


replace_required(
    "src/screens/WorkOrderDetailV04.tsx",
    '<DetailAccordion title="Borç, Veresiye ve Tahsilat" subtitle="Kalan borç, ödeme sözü, Nakit/IBAN tahsilatı ve müşteri notları." icon="wallet" accent={colors.red}',
    '<DetailAccordion title="Tahsilat Kaydet" subtitle="Nakit, IBAN veya Borç seçerek teslimat finansını tamamla." icon="card" accent={colors.green}',
)
replace_required(
    "src/screens/WorkOrderDetailV04.tsx",
    '>Borç, Veresiye ve Tahsilata Git</Text>',
    '>Tahsilat Kaydet Alanına Git</Text>',
)

replace_required(
    "src/screens/AuthScreen.tsx",
    'GARAGE OS • v0.8.14 AKILLI SERVİS SİSTEMİ',
    'GARAGE OS • v0.8.15 AKILLI SERVİS SİSTEMİ',
)

replace_required(
    "src/screens/SettingsScreen.tsx",
    'subtitle="v0.8.14 • sürüm ve sistem bilgileri"',
    'subtitle="v0.8.15 • sürüm ve sistem bilgileri"',
)
replace_required(
    "src/screens/SettingsScreen.tsx",
    'value="v0.8.14 • Usta Bildirimi ve Tahsilat Akışı"',
    'value="v0.8.15 • Modern Tahsilat ve Otomatik Teslim"',
)
replace_required(
    "src/screens/SettingsScreen.tsx",
    'value="backup/v0.8.13-before-v0.8.14-20260713"',
    'value="backup/v0.8.14-before-v0.8.15-20260713"',
)
replace_required(
    "src/screens/SettingsScreen.tsx",
    'value="Kod yedeğiyle v0.8.13"',
    'value="Kod yedeğiyle v0.8.14"',
)

for file_name in ("package.json", "package-lock.json"):
    data = json.loads(read(file_name))
    data["version"] = "0.8.15"
    if file_name == "package-lock.json" and data.get("packages", {}).get(""):
        data["packages"][""]["version"] = "0.8.15"
    write(file_name, json.dumps(data, ensure_ascii=False, indent=2) + "\n")

app_data = json.loads(read("app.json"))
app_data["expo"]["version"] = "0.8.15"
write("app.json", json.dumps(app_data, ensure_ascii=False, indent=2) + "\n")

readme = read("README.md")
readme = readme.replace("**v0.8.14 — Usta Bildirimi ve Tahsilat Akışı**", "**v0.8.15 — Modern Tahsilat ve Otomatik Teslim**")
readme = readme.replace(
    "v0.8.14; İşletme Sahibi + Usta hesaplarında bildirimleri Usta rolüne indirger, Motor Hazır aşamasında tahsilat akışını açar ve net fiyatın Borç/Veresiye hesabına doğru yansımasını sağlar.",
    "v0.8.15; Tahsilat Kaydet alanını Nakit, IBAN ve Borç seçenekleriyle ana kategoriye dönüştürür; ödeme veya veresiye kaydı tamamlandığında motosikleti otomatik olarak Teslim Edildi durumuna geçirir.",
)
write("README.md", readme)

roadmap = read("docs/ROADMAP.md").replace("Güncel sürüm `v0.8.14`tür.", "Güncel sürüm `v0.8.15`tür.")
write("docs/ROADMAP.md", roadmap)

write("docs/CHANGELOG_V0.8.15.md", """# DraBornGarage v0.8.15

Tarih: 13 Temmuz 2026

## Tahsilat ana kategorisi
- Servis detayındaki ana finans kategorisinin adı `Tahsilat Kaydet` olarak değiştirildi.
- NAKİT, IBAN ve BORÇ olmak üzere üç belirgin seçim eklendi.
- Seçenek kartları ikonlu, daha okunaklı ve güncel durum vurgulu hale getirildi.

## Nakit ve IBAN
- Nakit ve IBAN için ayrı, modern tahsilat formları oluşturuldu.
- Kalan tutar, toplam ve ödenen tutar daha belirgin gösteriliyor.
- Kısmi ödeme desteği korunuyor.

## Borç / Veresiye
- Borç / Veresiye kartları yalnız BORÇ seçeneği altında gösteriliyor.
- Ödeme sözü tarihi, personel notu ve müşterinin göreceği not aynı akışta korunuyor.

## Otomatik teslim
- `Tahsilatı Kaydet` başarıyla tamamlandığında iş emri otomatik olarak `Teslim Edildi` olur.
- `Borç / Veresiye Yaz` başarıyla tamamlandığında iş emri otomatik olarak `Teslim Edildi` olur.
- Bu davranış yalnız ekranda değil, Supabase RPC fonksiyonlarında da güvenli şekilde uygulanır.
""")

write("docs/PROJECT_HANDOFF_V0.8.15.md", """# DraBornGarage — v0.8.15 Devam Dosyası

**Güncel sürüm:** `v0.8.15`  
**Önceki sabit yedek:** `backup/v0.8.14-before-v0.8.15-20260713`  
**Sonraki sürüm:** `v0.9.0`

## Tamamlananlar
- Tahsilat Kaydet ana kategori haline getirildi.
- Nakit, IBAN ve Borç olmak üzere üç yöntem seçimi eklendi.
- Borç / Veresiye kartları yalnız Borç seçeneğine taşındı.
- Tahsilat ve borç formları daha modern, ikonlu ve okunaklı hale getirildi.
- Tahsilat veya veresiye kaydı başarılı olduğunda motosiklet otomatik Teslim Edildi durumuna geçer.

## Canlı veritabanı
- `v0_8_15_payment_category_delivery` migration uygulandı.
- `staff_record_payment` ve `staff_open_receivable` başarılı işlem sonunda `update_work_order_status(..., delivered)` çağırır.
""")

write("docs/TERMUX_INSTALL.md", """# Termux — v0.8.14 Yedekle, v0.8.15 Kur

```bash
cd ~
KURULAN_SURUM="v0.8.15"
YEDEK_KLASORU="$HOME/DraBornGarage-v0.8.14-local-backup"
ZIP_DOSYASI="$HOME/DraBornGarage-v0.8.15.zip"
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

Beklenen sürüm: `0.8.15`.
""")

print("v0.8.15 changes prepared")
