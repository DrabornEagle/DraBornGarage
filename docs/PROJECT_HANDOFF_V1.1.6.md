# DraBornGarage v1.1.6 — Teslim ve Devam Belgesi

**Tarih:** 17 Temmuz 2026  
**Geliştirme sürümü:** `v1.1.6`  
**Android test versionCode:** `1`  
**İlk Google Play sürümü:** `v1.0 / versionCode 1`

## v1.1.6 kapsamı

- Android FCM kaydından önce internet bağlantısı ve uçak modu kontrol edilir.
- Geçici `SERVICE_NOT_AVAILABLE`, zaman aşımı ve ağ hatalarında cihaz tokenı kademeli olarak yeniden denenir.
- İnternet geri geldiğinde ve uygulama yeniden öne çıktığında push kaydı otomatik tekrarlanır.
- Native token kaydı yalnız `NotificationContextV116` üzerinden çalışır; eski temel kayıt yolu kapalıdır.
- Bildirim Ayarlarına **Bütün Bildirimleri Temizle** eklendi.
- Bildirimler → Tümü ilk 4 kaydı gösterir; her **Daha Fazla** dokunuşunda 10 kayıt daha açılır.
- Türkçe konuşma cümleleri kısaltıldı, yavaşlatıldı, filtrelendi ve normalize edildi.
- Türkçe bildirim kanalları `v9` kimliklerine taşındı.
- Canlı Supabase’e `notification_clear_all()` ve v9 kanal migrationı uygulandı.

## Yedek ve geri alma

- GitHub yedek dalı: `backup/v1.1.5-before-v1.1.6-20260717`
- Yerel geri alma sürümü: `v1.1.5`
- Kalıcı APK workflow: **DraBornGarage Release APK**
- Kalıcı AAB workflow: **DraBornGarage Release AAB**

## Release APK

- Run ID: `29564294352`
- Artifact: `DraBornGarage-v1.1.6-Production-APK`
- APK SHA-256: `618b80536d4f8390cbf7f468b8c8943ad192d02fe3e8a896d72fa8ca8b641d52`
- Production upload keystore ve APK Signature Scheme V2 doğrulandı.
- Expo Doctor, TypeScript, Android bundle, Gradle, lint, manifest, Firebase ve izin kontrolleri geçti.

## Termux yedek + kurulum

```bash
cd "$HOME"
KURULAN_SURUM="v1.1.6"
YEDEKLENEN_SURUM="v1.1.5"
TARIH="$(date +%Y%m%d-%H%M%S)"

YEDEK_KLASORU="$HOME/DraBornGarage-${YEDEKLENEN_SURUM}-local-backup-${TARIH}"
ZIP_DOSYASI="$HOME/DraBornGarage-${KURULAN_SURUM}.zip"
ENV_YEDEGI="$HOME/DraBornGarage-env-backup-${TARIH}"

if [ -f "$HOME/DraBornGarage/.env" ]; then
  cp "$HOME/DraBornGarage/.env" "$ENV_YEDEGI"
fi

if [ -d "$HOME/DraBornGarage" ]; then
  mv "$HOME/DraBornGarage" "$YEDEK_KLASORU"
fi

curl -L --fail --retry 10 --retry-delay 3 --connect-timeout 30 --max-time 900 \
  "https://github.com/DrabornEagle/DraBornGarage/archive/refs/heads/main.zip" \
  -o "$ZIP_DOSYASI"

unzip -o "$ZIP_DOSYASI" -d "$HOME"
mv "$HOME/DraBornGarage-main" "$HOME/DraBornGarage"
rm -f "$ZIP_DOSYASI"

if [ -f "$ENV_YEDEGI" ]; then
  cp "$ENV_YEDEGI" "$HOME/DraBornGarage/.env"
fi

cd "$HOME/DraBornGarage"
npm ci --no-audit --no-fund
npm run typecheck
npx expo start -c --go
```

## Yerel geri alma

Yeni klasörü ayrı bir adla taşı ve oluşturulan `DraBornGarage-v1.1.5-local-backup-...` klasörünü yeniden `DraBornGarage` adına getir. Sonra `npm ci --no-audit --no-fund` ve `npx expo start -c --go` çalıştır.
