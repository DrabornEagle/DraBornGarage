# DraBornGarage — Teslim ve Devam Dosyası

**Son güncelleme:** 16 Temmuz 2026  
**Güncel geliştirme sürümü:** `v1.1.3`  
**Android test versionCode:** `1`  
**İlk Google Play sürümü:** `v1.0 / versionCode 1`  
**GitHub:** `DrabornEagle/DraBornGarage`  
**Supabase:** `xpdiwyxnnrmyvpcqwuyb`

> Dosya adı geçmiş bağlantıları bozmamak için korunmuştur; içerik v1.1.3 ile günceldir.

## Sürüm standardı

- Geliştirme sürümleri `v1.1.0`, `v1.1.1`, `v1.1.2`, `v1.1.3` şeklinde ilerler.
- İlk AAB alınana kadar Android `versionCode=1` sabit kalır.
- Küçük testler Expo Go ile yapılır.
- Native bildirim ve gerçek cihaz testleri **DraBornGarage Release APK** workflow’u ile yapılır.
- Google Play paketi **DraBornGarage Release AAB** workflow’u ile oluşturulur.
- İlk Play paketi `versionName=1.0`, `versionCode=1` ile başlar.
- İlk mağaza yayınından sonra sürüm adı ve versionCode birlikte artırılır.

## v1.1.3 — Push token modülü düzeltmesi

- v1.1.2 fiziksel cihaz testinde `getDevicePushTokenAsync kullanılamıyor` hatası görüldü.
- APK incelemesinde native `ExpoPushTokenManager` sınıfı ve FCM token metodu APK içinde doğrulandı.
- Sorunun Firebase veya native derleme değil, `expo-notifications` ana export nesnesinden fonksiyona erişim olduğu belirlendi.
- SDK 54 token modülleri doğrudan kullanılır:
  - `expo-notifications/build/getDevicePushTokenAsync`
  - `expo-notifications/build/getExpoPushTokenAsync`
- Android FCM tokenı doğrulanır, ardından EAS proje kimliği ve uygulama kimliğiyle Expo push tokenı oluşturulur.
- Expo tokenı Supabase’e kaydedilmeden kapalı uygulama testi açılmaz.
- Hatalar izin, FCM, Expo servisi ve Supabase kayıt aşamalarına göre ayrı gösterilir.
- `package.json`, `app.json` ve `package-lock.json` sürümü `1.1.3` olarak eşitlendi.
- Android `versionCode` değeri `1` olarak korundu.

## v1.1.2 — Bildirim teslimatı

- Zil sesi seçilince seçilen ses yerel bildirimle önizlenir.
- `owner_mechanic` rolündeki ortaklar yeni müşteri randevusu ve randevu durum bildirimlerini alır.
- Aynı kişi hem ortak hem atanmış ustaysa çift bildirim engellenir.
- Canlı Supabase’de kaçırılmış aktif randevu bildirimleri yeniden oluşturuldu.

## Platform hizmet bedeli

- Varsayılan hesaplama türü yüzde, varsayılan oran `%10`.
- Sabit seçenek varsayılanı `50 TL`.
- Admin global veya işletmeye özel yüzde/sabit hesaplama seçebilir.
- Yüzde hesabı `servis toplamı × oran / 100` şeklindedir.
- Geçmiş ücret kayıtları topluca değiştirilmez.

## Kalıcı ürün kararları

- Sistem çok işletmelidir ve işletme verileri Supabase RLS ile ayrılır.
- Roller: Admin, İşletme Sahibi, İşletme Sahibi + Usta, Usta, Çırak, Müşteri.
- Bir işletmede birden fazla ortak sahip olabilir.
- Usta yalnız kendi kişisel iş ve kayıtlı tutar geçmişini görür.
- Maaş, prim, komisyon, ortak payı veya net kâr hesaplanmaz.
- Müşteri ödemesi Nakit veya IBAN olarak teslim sırasında kaydedilir.

## Her güncellemede zorunlu işlem

1. Yerel proje klasörünü sürüm ve tarih bilgisiyle yedekle.
2. Güncel `main` ZIP’ini indir.
3. `.env` dosyasını koru ve geri yükle.
4. `npm ci` ve TypeScript kontrolünü çalıştır.
5. Expo testini temiz önbellekle başlat.
6. Native değişiklikte Release APK workflow’unu çalıştır.
7. Supabase değişikliği varsa migration ve rollback dosyasını birlikte sakla.

## v1.1.3 Termux yedek + kurulum

```bash
cd "$HOME"
KURULAN_SURUM="v1.1.3"
YEDEKLENEN_SURUM="v1.1.2"
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

Yeni klasörü silmek yerine hata durumunda ayrı bir adla taşı ve oluşturulan `v1.1.2` yedek klasörünü tekrar `DraBornGarage` adına getir. Ardından `npm ci` ve `npx expo start -c --go` çalıştır.
