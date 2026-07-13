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


# Center the remaining amount pill beside the Tahsilat Kaydet heading.
replace_required(
    "src/components/ReceivableManagerCard.tsx",
    "remainingPill: { minWidth: 82, borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 8, alignItems: 'flex-end' },",
    "remainingPill: { minWidth: 82, borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },",
)

# Replace the completed GlassCard with a flat card to remove shadow, glow and top rail.
replace_required(
    "src/components/ReceivableManagerCard.tsx",
    """    </> : <GlassCard style={[styles.completedCard, { borderColor: `${colors.green}42`, backgroundColor: `${colors.green}0C` }]}><View style={[styles.completedIcon, { backgroundColor: `${colors.green}18` }]}><Ionicons name="checkmark-done" size={28} color={colors.green} /></View><View style={styles.copy}><Text style={[styles.completedTitle, { color: colors.text }]}>Tahsilat tamamlandı</Text><Text style={[styles.completedText, { color: colors.textMuted }]}>Bu servis için açık kalan ödeme bulunmuyor.</Text></View></GlassCard>}""",
    """    </> : <View style={[styles.completedCard, { borderColor: colors.border, backgroundColor: colors.card }]}><View style={[styles.completedIcon, { backgroundColor: `${colors.green}14` }]}><Ionicons name="checkmark-done" size={28} color={colors.green} /></View><View style={styles.copy}><Text style={[styles.completedTitle, { color: colors.text }]}>Tahsilat tamamlandı</Text><Text style={[styles.completedText, { color: colors.textMuted }]}>Bu servis için açık kalan ödeme bulunmuyor.</Text></View></View>}""",
)
replace_required(
    "src/components/ReceivableManagerCard.tsx",
    "completedCard: { borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 11 },",
    "completedCard: { borderWidth: 1, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 11, shadowOpacity: 0, shadowRadius: 0, elevation: 0 },",
)

# Move Service Movement History below the payment category so it is the final accordion.
old_order = """    <DetailAccordion title="Servis Hareket Geçmişi" subtitle="Durum, ek işlem, parça, not ve işlem hareketlerinin zaman çizgisi." icon="time" accent={colors.primary} open={openSections.history} onToggle={() => toggleSection('history')} badge={`${events.length} Hareket`}>
    <GlassCard style={styles.listCard}>{events.length === 0 ? <Empty text="Hareket kaydı yok." /> : events.map((item, index) => <View key={item.id} style={[styles.eventRow, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}><View style={[styles.eventDot, { backgroundColor: `${colors.primary}20` }]}><Ionicons name="pulse" size={15} color={colors.primary} /></View><View style={styles.copy}><Text style={[styles.cardTitle, { color: colors.text }]}>{eventLabel[item.event_type] || item.event_type}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{item.old_status && item.new_status ? `${statusLabels[item.old_status]} → ${statusLabels[item.new_status]} • ` : ''}{dateTime(item.created_at)}</Text>{item.note && <Text style={[styles.bodySmall, { color: colors.textSoft }]}>{item.note}</Text>}</View></View>)}</GlassCard>
    </DetailAccordion>

    <DetailAccordion title="Tahsilat Kaydet" subtitle="Nakit, IBAN veya Borç seçerek teslimat finansını tamamla." icon="card" accent={colors.green} open={openSections.receivables} onToggle={() => toggleSection('receivables')} badge={money(Number(order.total_amount || 0) - Number(order.amount_received || 0))}>
      <ReceivableManagerCard orderId={orderId} onChanged={load} />
    </DetailAccordion>
"""
new_order = """    <DetailAccordion title="Tahsilat Kaydet" subtitle="Nakit, IBAN veya Borç seçerek teslimat finansını tamamla." icon="card" accent={colors.green} open={openSections.receivables} onToggle={() => toggleSection('receivables')} badge={money(Number(order.total_amount || 0) - Number(order.amount_received || 0))}>
      <ReceivableManagerCard orderId={orderId} onChanged={load} />
    </DetailAccordion>

    <DetailAccordion title="Servis Hareket Geçmişi" subtitle="Durum, ek işlem, parça, not ve işlem hareketlerinin zaman çizgisi." icon="time" accent={colors.primary} open={openSections.history} onToggle={() => toggleSection('history')} badge={`${events.length} Hareket`}>
    <GlassCard style={styles.listCard}>{events.length === 0 ? <Empty text="Hareket kaydı yok." /> : events.map((item, index) => <View key={item.id} style={[styles.eventRow, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}><View style={[styles.eventDot, { backgroundColor: `${colors.primary}20` }]}><Ionicons name="pulse" size={15} color={colors.primary} /></View><View style={styles.copy}><Text style={[styles.cardTitle, { color: colors.text }]}>{eventLabel[item.event_type] || item.event_type}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{item.old_status && item.new_status ? `${statusLabels[item.old_status]} → ${statusLabels[item.new_status]} • ` : ''}{dateTime(item.created_at)}</Text>{item.note && <Text style={[styles.bodySmall, { color: colors.textSoft }]}>{item.note}</Text>}</View></View>)}</GlassCard>
    </DetailAccordion>
"""
replace_required("src/screens/WorkOrderDetailV04.tsx", old_order, new_order)

# Version metadata.
replace_required("src/screens/AuthScreen.tsx", "GARAGE OS • v0.8.15 AKILLI SERVİS SİSTEMİ", "GARAGE OS • v0.8.16 AKILLI SERVİS SİSTEMİ")
replace_required("src/screens/SettingsScreen.tsx", 'subtitle="v0.8.15 • sürüm ve sistem bilgileri"', 'subtitle="v0.8.16 • sürüm ve sistem bilgileri"')
replace_required("src/screens/SettingsScreen.tsx", 'value="v0.8.15 • Modern Tahsilat ve Otomatik Teslim"', 'value="v0.8.16 • Tahsilat Yerleşim Düzeni"')
replace_required("src/screens/SettingsScreen.tsx", 'value="backup/v0.8.14-before-v0.8.15-20260713"', 'value="backup/v0.8.15-before-v0.8.16-20260713"')
replace_required("src/screens/SettingsScreen.tsx", 'value="Kod yedeğiyle v0.8.14"', 'value="Kod yedeğiyle v0.8.15"')

for file_name in ("package.json", "package-lock.json"):
    data = json.loads(read(file_name))
    data["version"] = "0.8.16"
    if file_name == "package-lock.json" and data.get("packages", {}).get(""):
        data["packages"][""]["version"] = "0.8.16"
    write(file_name, json.dumps(data, ensure_ascii=False, indent=2) + "\n")

app_data = json.loads(read("app.json"))
app_data["expo"]["version"] = "0.8.16"
write("app.json", json.dumps(app_data, ensure_ascii=False, indent=2) + "\n")

readme = read("README.md")
readme = readme.replace("**v0.8.15 — Modern Tahsilat ve Otomatik Teslim**", "**v0.8.16 — Tahsilat Yerleşim Düzeni**")
readme = readme.replace(
    "v0.8.15; Tahsilat Kaydet alanını Nakit, IBAN ve Borç seçenekleriyle ana kategoriye dönüştürür; ödeme veya veresiye kaydı tamamlandığında motosikleti otomatik olarak Teslim Edildi durumuna geçirir.",
    "v0.8.16; Tahsilat Kaydet alanındaki kalan tutarı ortalar, tamamlanan tahsilat kartını düz ve gölgesiz hale getirir ve Servis Hareket Geçmişini servis detayının en altına taşır.",
)
write("README.md", readme)

roadmap = read("docs/ROADMAP.md").replace("Güncel sürüm `v0.8.15`tür.", "Güncel sürüm `v0.8.16`tür.")
write("docs/ROADMAP.md", roadmap)

write("docs/CHANGELOG_V0.8.16.md", """# DraBornGarage v0.8.16

Tarih: 13 Temmuz 2026

## Tahsilat başlığı
- `Tahsilat Kaydet` başlığının yanındaki `KALAN` etiketi ve tutar yatay olarak ortalandı.

## Servis detay sırası
- `Servis Hareket Geçmişi` ana kategorisi servis detayındaki tüm bölümlerin en altına taşındı.
- `Tahsilat Kaydet` kategorisi hareket geçmişinden önce gösteriliyor.

## Tamamlanan tahsilat kartı
- `Tahsilat tamamlandı` kartı GlassCard yapısından çıkarıldı.
- Shadow, elevation, glow, üst renk çizgisi ve dekoratif vidalar kaldırıldı.
- Kart sade arka plan, ince kenarlık ve düz ikon alanıyla gösteriliyor.
""")

write("docs/PROJECT_HANDOFF_V0.8.16.md", """# DraBornGarage — v0.8.16 Devam Dosyası

**Güncel sürüm:** `v0.8.16`  
**Önceki sabit yedek:** `backup/v0.8.15-before-v0.8.16-20260713`  
**Sonraki sürüm:** `v0.9.0`

## Tamamlananlar
- Tahsilat Kaydet başlığındaki kalan tutar ortalandı.
- Servis Hareket Geçmişi servis detayının en altına taşındı.
- Tahsilat tamamlandı kartındaki shadow ve glow efektleri kaldırıldı.
- Sürüm, yedek ve geri alma bilgileri v0.8.16 için güncellendi.
""")

write("docs/TERMUX_INSTALL.md", """# Termux — v0.8.15 Yedekle, v0.8.16 Kur

```bash
cd ~
KURULAN_SURUM="v0.8.16"
YEDEK_KLASORU="$HOME/DraBornGarage-v0.8.15-local-backup"
ZIP_DOSYASI="$HOME/DraBornGarage-v0.8.16.zip"
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

Beklenen sürüm: `0.8.16`.
""")

print("v0.8.16 changes prepared")
