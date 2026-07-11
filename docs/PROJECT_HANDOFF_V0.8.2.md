# DraBornGarage — Yeni Sohbet Devam Dosyası

**Son güncelleme:** 11 Temmuz 2026  
**Güncel uygulama sürümü:** `v0.8.2`  
**GitHub:** `DrabornEagle/DraBornGarage`  
**Supabase proje kimliği:** `xpdiwyxnnrmyvpcqwuyb`  
**Bir sonraki ana sürüm:** `v0.9.0`  

Bu dosya, DraBornGarage geliştirmesine yeni bir sohbet/sayfada aynı noktadan devam etmek için bağlayıcı proje özeti ve çalışma standardıdır.

---

## 1. Ana ürün kararı

Önce yalnızca **DraBornGarage** geliştirilecektir.

DraBornGarage; motosiklet ve oto tamir işletmeleri için çok işletmeli, Usta bazlı, müşteri takipli, servis kaydı, ücret, borç/veresiye ve platform hizmet bedeli takip sistemidir.

Şimdilik geliştirme planına dahil değildir:

- DraBornStyle
- DraBornRepair
- DraBornWash
- DraBornClinic
- Tam web sürümü
- v1.1, v1.2, v2.0, v2.1 ve v3.0

Geliştirme sırası:

1. Mobil uygulama v1.0’a kadar tamamlanır.
2. Google Play’e uygun hale getirilir.
3. APK/AAB yalnız v1.0 aşamasında hazırlanır.
4. Mobil uygulama tamamen hazır olduktan sonra web sürümü opsiyonel değerlendirilir.

---

## 2. Temel platform yapısı

DraBornGarage tek işletmeli değil, çok işletmeli platformdur.

Her kayıt bir işletmeye bağlıdır ve işletmeler birbirinin verilerini göremez:

- Personel
- Müşteriler
- Motorlar
- Servisler
- Randevular
- Alacaklar
- Platform hizmet bedeli
- Ödemeler
- Raporlar
- Bildirimler

Supabase RLS ile işletme ve rol bazlı veri ayrımı uygulanır.

---

## 3. Rol kararları

### Admin

En yetkili rolün adı yalnızca **Admin**’dir. “Super Admin” kullanılmaz.

Admin:

- Tüm işletmeleri görür, ekler, seçer, düzenler ve aktif/pasif yapar.
- İşletme sahiplerini, Ustaları ve Çırakları yönetir.
- Bir işletmede birden fazla işletme sahibi tanımlayabilir.
- İşletme bazlı platform hizmet bedelini ve ödeme periyodunu yönetir.
- Platform ödeme bildirimlerini onaylar veya reddeder.
- Raporlara ve işletme bazlı verilere erişir.

### İşletme Sahibi

Yalnız kendi işletmesini yönetir.

### İşletme Sahibi + Usta

Hem İşletme Paneline hem kişisel Usta Paneline erişir. Bir işletmede birden fazla kişi bu role sahip olabilir.

### Usta

Kendi hesabıyla giriş yapar ve yalnız kendi yaptığı/atandığı işleri, kayıtlı tutarları, parçaları, tahsilatları ve geçmişini görür.

### Çırak

Kısıtlı panel kullanır. Atölye sırasını ve atanmış işleri görür; finansal kayıtları, alacakları, platform bedelini, raporları, işletme ayarlarını ve personel yönetimini göremez.

### Müşteri

Kendi motorlarını, işletmelerini, aktif servis durumunu, servis geçmişini, fiyatları, ek işlem onaylarını, borç/kalan ödemeyi ve randevuları görür.

**Kesin finans kararı:** Sistem maaş, prim, yüzde, komisyon, net kâr, ortak payı veya kazanç bölüşümü hesaplamaz. Yalnız hangi Ustanın hangi işlem için ne kadar tutar kaydettiğini gösterir.

---

## 4. Tamamlanan sürümler

### v0.1 — Çok İşletmeli Çekirdek ✅

- Admin ve çok işletmeli yapı
- İşletme Sahibi, İşletme Sahibi + Usta, Usta, Çırak
- Birden fazla işletme sahibi
- Personel daveti, rol ve aktiflik yönetimi
- İşletme bazlı veri ayrımı ve RLS
- Müşteri ve motosiklet kayıtları
- Hızlı Servis, Bırakılan Motor, Randevulu Servis
- Atölye sırası
- Servis durumları
- Net ve tahmini fiyat
- Nakit ve IBAN tahsilatı
- İşlem ve manuel parça kayıtları

### v0.2 — Müşteri Hesabı ve Motor Eşleştirme ✅

- Müşteri kayıt/giriş
- Plaka + telefon eşleştirmesi
- Servis takip kodu
- QR kod
- Usta onaylı eşleştirme
- Motorlarım ve Servislerim
- Tekrar gelen müşteriyi tanıma
- Tek/çok işletmeli müşteri seçimi

### v0.3 — Randevu, Müsaitlik ve Usta Takvimi ✅

- Çalışma saatleri
- Mola ve slot süresi
- Müsait / Meşgul / Kapalı
- Gün ve saat kapatma
- Çakışmasız müsaitlik
- Müşteri/personel randevusu
- Günlük takvim
- Randevuyu servis kaydına dönüştürme

### v0.3.1 — Sürüm ve Yedekleme Standardı ✅

- Üç parçalı sürüm numarası
- Her güncellemede sürüm artırma
- Her yeni sürümden önce sabit GitHub yedeği
- Migration ve rollback dosyaları
- TypeScript ve Android bundle kontrolü
- ZIP-only Termux kurulum ve geri alma

### v0.4 — Ek İşlem, Onay ve Servis Detayları ✅

- Ek işlem, işçilik ve parça bedeli
- Uygulama, müşteri yanında, telefon ve WhatsApp onayı
- Reddedildi durumu ve onay geçmişi
- Servis ilerleme kilidi
- Planlandı / Başladı / Tamamlandı
- Ayrıntılı servis notları
- Parça bekleniyor, test ediliyor, motor hazır

### v0.4.1 — Müşteri Paneli Düzeltmesi ✅

- Android yerleşim sorunları
- Alt menü güvenli alanı
- Bağlantısız sekme kartları
- Responsive müşteri paneli

### v0.5 — Veresiye / Alacak Takibi ✅

- Borç/veresiye
- Kısmi ve tam ödeme
- Ödenmedi ve kapatıldı durumları
- Ödeme sözü tarihi
- Nakit/IBAN
- Alacak filtreleri ve arama
- Notlar ve hareket geçmişi
- Müşteri borç görünümü
- Çırak finans gizliliği

### v0.6 — Usta Gelir Kayıtları ve İşletme Raporları ✅

- Kişisel Usta iş geçmişi
- Günlük, haftalık, aylık ve tüm zamanlar
- Saat, motor, plaka, işlem ve parça ayrıntıları
- Nakit, IBAN ve açık alacak
- İşletme toplamları
- Usta bazlı işlem/tutar
- Grafikler, popüler işlemler ve son servisler

### v0.7 — Platform Hizmet Bedeli ✅

- İşletme bazlı işlem başı bedel
- Admin varsayılanı ve işletmeye özel bedel
- Haftalık/aylık periyot
- Ödeme günü
- Dönem borcu ve devreden borç
- Kısmi ödeme
- Ödeme bildirimi
- Admin onay/red
- Admin IBAN bilgileri
- Opsiyonel dekont ve private Storage
- Tüm işletmeler platform özeti

### v0.8 — Bildirimler ve Hatırlatmalar ✅

- Kullanıcıya özel uygulama içi bildirim merkezi
- Okunmamış ve yaklaşan bildirimler
- Supabase Realtime
- Bildirimden ilgili ekrana yönlendirme
- Servis, randevu, müşteri eşleştirme, alacak ve platform olayları
- 24 saat ve 2 saat randevu hatırlatmaları
- Bildirim tercihleri
- Okuma, toplu okuma ve arşivleme
- Android yerel bildirim kanalı

### v0.8.1 — Expo Go Android Bildirim Uyumluluğu ✅

- Expo Go Android’de `expo-notifications` açılış hatası giderildi.
- Expo Go içinde native bildirim modülü güvenli şekilde devre dışı kalır.
- Uygulama içi Supabase bildirim merkezi çalışır.
- Development build/APK üzerinde native bildirim desteği korunur.

### v0.8.2 — Ayrı Admin Paneli ✅

- Admin hesabında alt menüde ayrı **Admin** sekmesi
- Yeşil kalkan simgesi
- Doğrudan Admin Yönetim Merkezi
- İşletme/personel yönetimi
- Admin raporları
- Platform ödeme merkezi
- İşletme Sahibi için Merkez, Usta için Rapor, Çırak için kısıtlı menü korunur

---

## 5. Güncel teknik durum

- Expo SDK 54
- React Native 0.81.5
- Strict TypeScript
- Supabase Auth, PostgreSQL, RLS, Realtime ve Storage
- Test yöntemi: Expo Go, `npx expo start -c --go`
- Yerel telefon bildirimleri Expo Go kısıtlarına göre uyumluluk katmanıyla yönetilir.
- Uzaktan push bildirimleri EAS development build/APK aşamasında ele alınır.
- APK/AAB henüz oluşturulmayacak; v1.0 kapsamıdır.
- Her sürümde TypeScript ve Android JavaScript bundle doğrulaması zorunludur.

---

## 6. Sürüm ve yedekleme standardı

Yeni bir özellik veya düzeltme yapılırken sürüm artırılır:

- Güncel `v0.8.2`
- Sonraki küçük düzeltme/özellik: `v0.8.3`
- Sonraki ana yol haritası sürümü: `v0.9.0`

Her güncellemeden önce:

1. Mevcut `main` dalından sabit GitHub yedek dalı oluşturulur.
2. Dal adı şu biçimdedir: `backup/vESKI-before-vYENI`
3. Uygulama sürümü `package.json`, `package-lock.json`, `app.json`, Ayarlar ve belgelerde eşitlenir.
4. Supabase değişikliği varsa migration ve rollback hazırlanır.
5. TypeScript ve Android bundle doğrulanır.
6. Kullanıcıya kurulum ve geri alma komutu birlikte verilir.
7. Komut başında kurulan ve yedeklenen sürüm açıkça yazılır.

Güncel sabit GitHub yedeği:

`backup/v0.8.1-before-v0.8.2`

---

## 7. Termux kurulum standardı

Termux komutlarında kesin kurallar:

- Python yok
- patch yok
- JDK yok
- Perl yok
- `/tmp` yok
- Git kurulumu zorunlu değil
- Yalnız GitHub ZIP indirme + unzip
- `.env` önceki kurulumdan korunur
- Ağ hatalarına karşı `curl --retry` kullanılır
- Başlatma: `npx expo start -c --go`

### Güncel v0.8.2 kurulum ve yerel yedek

```bash
cd ~

KURULAN_SURUM="v0.8.2"
YEDEKLENEN_SURUM="v0.8.1"
YEDEK_KLASORU="$HOME/DraBornGarage-v0.8.1-local-backup"
ZIP_DOSYASI="$HOME/DraBornGarage-v0.8.2.zip"

printf '\n========================================\n'
printf 'KURULAN YENİ SÜRÜM: %s\n' "$KURULAN_SURUM"
printf 'YEDEKLENEN SÜRÜM: %s\n' "$YEDEKLENEN_SURUM"
printf '========================================\n\n'

rm -rf "$YEDEK_KLASORU"
rm -rf "$HOME/DraBornGarage-main"
rm -f "$ZIP_DOSYASI"

if [ -d "$HOME/DraBornGarage" ]; then
  mv "$HOME/DraBornGarage" "$YEDEK_KLASORU"
fi

curl -L \
  --retry 10 \
  --retry-delay 3 \
  --connect-timeout 30 \
  --max-time 600 \
  "https://github.com/DrabornEagle/DraBornGarage/archive/refs/heads/main.zip" \
  -o "$ZIP_DOSYASI"

unzip -o "$ZIP_DOSYASI" -d "$HOME"
mv "$HOME/DraBornGarage-main" "$HOME/DraBornGarage"
rm -f "$ZIP_DOSYASI"

if [ -f "$YEDEK_KLASORU/.env" ]; then
  cp "$YEDEK_KLASORU/.env" "$HOME/DraBornGarage/.env"
else
  cp "$HOME/DraBornGarage/.env.example" "$HOME/DraBornGarage/.env"
fi

cd "$HOME/DraBornGarage"
npm install --no-audit --no-fund
npx expo start -c --go
```

### Güncel v0.8.2’den v0.8.1’e geri alma

```bash
cd ~

GERI_DONULEN_SURUM="v0.8.1"
KORUNAN_SURUM="v0.8.2"
MEVCUT_YEDEK="$HOME/DraBornGarage-v0.8.2-before-rollback"
ZIP_DOSYASI="$HOME/DraBornGarage-v0.8.1.zip"
ACILAN_KLASOR="$HOME/DraBornGarage-backup-v0.8.1-before-v0.8.2"

printf '\n========================================\n'
printf 'GERİ DÖNÜLEN SÜRÜM: %s\n' "$GERI_DONULEN_SURUM"
printf 'KORUNAN MEVCUT SÜRÜM: %s\n' "$KORUNAN_SURUM"
printf '========================================\n\n'

rm -rf "$MEVCUT_YEDEK"
rm -rf "$ACILAN_KLASOR"
rm -f "$ZIP_DOSYASI"

if [ -d "$HOME/DraBornGarage" ]; then
  mv "$HOME/DraBornGarage" "$MEVCUT_YEDEK"
fi

curl -L \
  --retry 10 \
  --retry-delay 3 \
  --connect-timeout 30 \
  --max-time 600 \
  "https://github.com/DrabornEagle/DraBornGarage/archive/refs/heads/backup/v0.8.1-before-v0.8.2.zip" \
  -o "$ZIP_DOSYASI"

unzip -o "$ZIP_DOSYASI" -d "$HOME"
mv "$ACILAN_KLASOR" "$HOME/DraBornGarage"
rm -f "$ZIP_DOSYASI"

if [ -f "$MEVCUT_YEDEK/.env" ]; then
  cp "$MEVCUT_YEDEK/.env" "$HOME/DraBornGarage/.env"
else
  cp "$HOME/DraBornGarage/.env.example" "$HOME/DraBornGarage/.env"
fi

cd "$HOME/DraBornGarage"
npm install --no-audit --no-fund
npx expo start -c --go
```

---

## 8. Gelecek plan

### v0.9.0 — Google Play Uyum, Test ve Pilot

- Gizlilik politikası
- Uygulama içi gizlilik ekranı
- Hesap silme talebi
- Rol bazlı erişim denetimi
- Gereksiz izinleri kaldırma
- Leaked Password Protection ve yayın güvenliği
- Test kullanıcıları
- Pilot işletme
- Gerçek hızlı servis testi
- Randevu testi
- Borç/veresiye testi
- Platform bedeli testi
- Bildirim testi
- Hata düzeltmeleri
- Arayüz sadeleştirme
- Google Play açıklaması
- Kapalı test hazırlığı

### v1.0 — Google Play’e Hazır Mobil DraBornGarage

- v0.1–v0.9 özelliklerinin kararlı birleşimi
- EAS development build
- Uzaktan push bildirim altyapısı
- Android APK test çıktısı
- Google Play AAB
- Uygulama simgesi, splash ve mağaza görselleri
- Son rol, güvenlik, performans ve gerçek cihaz testleri

---

## 9. Yeni sohbet başlangıç cümlesi

Yeni sayfada şu cümle yeterlidir:

> DraBornGarage geliştirmesine `docs/PROJECT_HANDOFF_V0.8.2.md` dosyasındaki güncel durumdan devam ediyoruz.

Yeni sürüm geliştirmesi başlamadan önce bu dosya, `docs/ROADMAP.md`, GitHub `main` dalı ve güncel Supabase migration durumu birlikte kontrol edilmelidir.
