# DraBornGarage v1.1.7 — Teslim ve Devam Belgesi

**Tarih:** 17 Temmuz 2026  
**Geliştirme sürümü:** `v1.1.7`  
**Android test versionCode:** `1`

## Kapsam

- Aynı bildirimi çoğaltan eski push tokenları kullanıcı ve platform bazında pasifleştirilir.
- Push gönderimi her platformda yalnız en güncel etkin tokena yapılır.
- Native push açıkken yerel anlık/yaklaşan yedek bildirimler kapatılarak çift teslim engellenir.
- Toplu silme native API desteği olmayan cihazlarda hata üretmez.
- **Tümünü Sil** yalnız Bildirimler → Tümü sekmesinde gösterilir.
- Türkçe ses tercihi Supabase tarafından kabul edilir.
- Konuşma dosyaları Türkiye Türkçesi doğal kadın sesiyle yenilenir ve Android kanalları v10 olur.

## Yedek

- `backup/v1.1.6-before-v1.1.7-20260717`

## Termux

```bash
cd "$HOME"
KURULAN_SURUM="v1.1.7"
YEDEKLENEN_SURUM="v1.1.6"
TARIH="$(date +%Y%m%d-%H%M%S)"
ENV_YEDEGI="$HOME/DraBornGarage-env-backup-${TARIH}"
[ -f "$HOME/DraBornGarage/.env" ] && cp "$HOME/DraBornGarage/.env" "$ENV_YEDEGI"
[ -d "$HOME/DraBornGarage" ] && mv "$HOME/DraBornGarage" "$HOME/DraBornGarage-${YEDEKLENEN_SURUM}-local-backup-${TARIH}"
curl -L --fail --retry 10 --retry-delay 3 --connect-timeout 30 --max-time 900 \
  "https://github.com/DrabornEagle/DraBornGarage/archive/refs/heads/main.zip" \
  -o "$HOME/DraBornGarage-${KURULAN_SURUM}.zip"
unzip -o "$HOME/DraBornGarage-${KURULAN_SURUM}.zip" -d "$HOME"
mv "$HOME/DraBornGarage-main" "$HOME/DraBornGarage"
rm -f "$HOME/DraBornGarage-${KURULAN_SURUM}.zip"
[ -f "$ENV_YEDEGI" ] && cp "$ENV_YEDEGI" "$HOME/DraBornGarage/.env"
cd "$HOME/DraBornGarage"
npm ci --no-audit --no-fund
npm run typecheck
npx expo start -c --go
```
