# DraBornGarage — Teslim ve Devam Dosyası

**Son güncelleme:** 16 Temmuz 2026  
**Güncel geliştirme sürümü:** `v1.1.0`  
**Android test versionCode:** `1`  
**İlk Google Play sürümü:** `v1.0 / versionCode 1`  
**GitHub:** `DrabornEagle/DraBornGarage`  
**Supabase:** `xpdiwyxnnrmyvpcqwuyb`

> Dosya adı geçmiş bağlantıları bozmamak için korunmuştur; içerik v1.1.0 ile günceldir.

## Bağlayıcı sürüm standardı

- Geliştirme çizgisi `v1.1.0` ile başlar.
- Sonraki her güncelleme `v1.1.1`, `v1.1.2`, `v1.1.3` şeklinde ilerler.
- İlk AAB alınana kadar `versionCode=1` sabit kalır; yalnız geliştirme sürümü artırılır.
- Küçük testler Expo Go üzerinden yapılır.
- Bildirim, Firebase, native izin ve gerçek cihaz testleri Release APK ile yapılır.
- Test APK workflow: **DraBornGarage Release APK**.
- Google Play AAB workflow: **DraBornGarage Release AAB**.
- İlk Play AAB, geliştirme sürümünden bağımsız olarak `versionName=1.0`, `versionCode=1` üretir.
- Play’e ilk yüklemeden sonra her yeni mağaza sürümünde sürüm adı ve versionCode birlikte artırılır.
- Her güncellemede README, bu dosya, migration/rollback ve Termux komutları güncel tutulur.

## v1.1.0 kapsamı

### Bildirimler

- Canlı veritabanındaki cron dağıtıcısı her dakika çalışmaktadır.
- Tespit edilen kök neden: native cihaz tokenı `notification_push_tokens` tablosuna kaydolmuyordu.
- Native push etkinliği artık Expo Go dışında, geçerli EAS proje kimliği varsa otomatik açılır.
- Token kaydı başarısız olduğunda hata kullanıcıdan saklanmaz.
- Kapalı uygulama testi token kaydı doğrulandıktan sonra planlanır.
- Android kanal kimlikleri `v5` olarak yenilendi; böylece eski değiştirilemeyen ses ayarları taşınmaz.
- Sistem sesi, sessiz ve dokuz farklı özel ses bulunur.

### Platform hizmet bedeli

- Varsayılan hesaplama türü: yüzde.
- Varsayılan oran: `%10`.
- Sabit hesaplama seçeneğinin varsayılanı: `50 TL`.
- Admin global varsayılanı ve her işletmenin özel hesaplama türünü değiştirebilir.
- Yüzde hesabı: `servis toplam tutarı × oran / 100`.
- Ücret, servis tamamlanınca iki ondalık haneye yuvarlanarak kaydedilir.
- Geçmiş ücret kayıtları sonradan yeniden hesaplanmaz.

### Google Play hazırlığı

- Gereksiz mikrofon, konum, rehber, telefon, SMS ve geniş medya/depolama izinleri engellenir.
- Kamera yalnız QR tarama için opsiyonel donanım olarak kalır.
- Dekont seçiminde Android sistem fotoğraf seçicisi kullanılır.
- Uygulama içi gizlilik merkezi ve hesap silme talebi korunur.
- Harici gizlilik ve hesap silme sayfaları günceldir.
- AAB workflow manifest, imza, izin, target SDK, TypeScript, bundle ve lint kontrolleri yapar.

## Kalıcı ürün kararları

- Sistem çok işletmelidir; işletme verileri Supabase RLS ile ayrılır.
- Roller: Admin, İşletme Sahibi, İşletme Sahibi + Usta, Usta, Çırak, Müşteri.
- Bir işletmede birden fazla ortak sahip olabilir.
- Usta yalnız kendi kişisel iş ve kayıtlı tutar geçmişini görür.
- Maaş, prim, komisyon, ortak payı veya net kâr hesaplanmaz.
- Müşteri tamir ödemesi yalnız Nakit veya IBAN olarak işletmede teslim sırasında kaydedilir.
- Platform ödemeleri işletme bildirimi ve Admin onayıyla takip edilir.

## Her güncellemede zorunlu işlem

1. Eski yerel klasörü sürüm adıyla yedekle.
2. Yeni GitHub ZIP’ini indir.
3. `.env` dosyasını koru ve geri yükle.
4. `npm ci` çalıştır; bildirim sesleri otomatik üretilir.
5. TypeScript kontrolü yap.
6. Expo testi başlat.
7. Native değişiklik varsa Release APK al ve temiz kurulumla test et.
8. Supabase değişikliği varsa migration ve rollback dosyalarını birlikte sakla.

## v1.1.0 Termux yedek + kurulum

```bash
cd "$HOME"
KURULAN_SURUM="v1.1.0"
YEDEKLENEN_SURUM="v1.0.0"
YEDEK_KLASORU="$HOME/DraBornGarage-${YEDEKLENEN_SURUM}-local-backup"
ZIP_DOSYASI="$HOME/DraBornGarage-${KURULAN_SURUM}.zip"
ENV_YEDEGI="$HOME/DraBornGarage-env-backup"

rm -rf "$YEDEK_KLASORU" "$HOME/DraBornGarage-agent-v1.1.0-notifications-platform-policy" "$ENV_YEDEGI"
rm -f "$ZIP_DOSYASI"

if [ -f "$HOME/DraBornGarage/.env" ]; then cp "$HOME/DraBornGarage/.env" "$ENV_YEDEGI"; fi
if [ -d "$HOME/DraBornGarage" ]; then mv "$HOME/DraBornGarage" "$YEDEK_KLASORU"; fi

curl -L --fail --retry 10 --retry-delay 3 --connect-timeout 30 --max-time 900   "https://github.com/DrabornEagle/DraBornGarage/archive/refs/heads/agent/v1.1.0-notifications-platform-policy.zip"   -o "$ZIP_DOSYASI"

unzip -o "$ZIP_DOSYASI" -d "$HOME"
mv "$HOME/DraBornGarage-agent-v1.1.0-notifications-platform-policy" "$HOME/DraBornGarage"
rm -f "$ZIP_DOSYASI"

if [ -f "$ENV_YEDEGI" ]; then mv "$ENV_YEDEGI" "$HOME/DraBornGarage/.env"; fi
cd "$HOME/DraBornGarage"
npm ci --no-audit --no-fund
npm run typecheck
npx expo start -c --go
```

## Yerel geri alma

```bash
cd "$HOME"
rm -rf "$HOME/DraBornGarage"
mv "$HOME/DraBornGarage-v1.0.0-local-backup" "$HOME/DraBornGarage"
cd "$HOME/DraBornGarage"
npm ci --no-audit --no-fund
npx expo start -c --go
```
