# DraBornGarage — Teslim ve Devam Dosyası

**Son güncelleme:** 16 Temmuz 2026  
**Güncel geliştirme sürümü:** `v1.1.6`  
**Android test versionCode:** `1`  
**İlk Google Play sürümü:** `v1.0 / versionCode 1`  
**GitHub:** `DrabornEagle/DraBornGarage`  
**Supabase:** `xpdiwyxnnrmyvpcqwuyb`

> Dosya adı geçmiş bağlantıları bozmamak için korunmuştur; içerik v1.1.6 ile günceldir.

## Sürüm standardı

- Geliştirme sürümleri `v1.1.0`, `v1.1.1`, `v1.1.2`, `v1.1.3`, `v1.1.4`, `v1.1.5` şeklinde ilerler.
- İlk AAB alınana kadar Android `versionCode=1` sabit kalır.
- Küçük testler Expo Go ile yapılır.
- Native bildirim ve gerçek cihaz testleri **DraBornGarage Release APK** workflow’u ile yapılır.
- Google Play paketi **DraBornGarage Release AAB** workflow’u ile oluşturulur.
- İlk Play paketi `versionName=1.0`, `versionCode=1` ile başlar.
- İlk mağaza yayınından sonra sürüm adı ve versionCode birlikte artırılır.

## v1.1.5 — Gerçek bildirim ve canlı veri düzenlemesi

- Expo push ticket yanıtları doğrulanır; gerçek teslim olmadan `push_sent_at` yazılmaz.
- Atanmış Ustaya bekleyen müşteri randevusu için 5 dakikalık aksiyon hatırlatması hazırlanır.
- Randevu ve müşteri bağlantı talepleri uygulama açılış popup'ından ilgili ekrana yönlenir.
- Bildirim sesi önizlemesi doğrudan ses oynatıcıyla çalışır.
- Türkçe konuşan kategori sesleri eklendi.
- Hemen Başla servisinde başlangıç tarih-saat bilgisi ilk kayıtta oluşturulur.
- Ortak veri yenileme sinyali servis, randevu, müşteri, motor ve eşleştirme akışlarında kullanılır.
- FCM V1 Service Account anahtarı Expo/EAS'e ayrıca yüklenmelidir: `docs/FCM_V1_SETUP.md`.
- Geri alma dalı: `backup/v1.1.4-final-before-v1.1.5-20260717-02`.

## v1.1.4 — Yayın öncesi son düzenlemeler

- Geçersiz cihaz kimliği yerine RFC 4122 UUID v4 kullanılır.
- Android bildirim kanalları v7’ye taşınır; ses seçimi anında önizlenir.
- Bildirim Sesi ve Bildirim Tercihleri açılır/kapanır ana kategorilerdir.
- Telefon sesini zorla yükseltmek yerine Android bildirim ayarına açık kullanıcı yönlendirmesi sunulur.
- Pilot Test Atölyesi yalnız Admin’e görünür.
- İşletme sahibi ve usta hesaplarında Müşteri Görünümüne Geç gösterilmez.
- Müşteri listeleri 4 kayıtla başlar ve her dokunuşta 10 kayıt daha açılır.
- Geri alma dalı: `backup/v1.1.3-before-v1.1.4-20260716`.

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

## v1.1.6 Termux yedek + kurulum

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

Yeni klasörü silmek yerine hata durumunda ayrı bir adla taşı ve oluşturulan `v1.1.4` yedek klasörünü tekrar `DraBornGarage` adına getir. Ardından `npm ci` ve `npx expo start -c --go` çalıştır.
