# DraBornGarage

Motosiklet ve oto servis işletmeleri için çok işletmeli, rol tabanlı servis, müşteri, randevu, araç, alacak, raporlama, platform hizmet bedeli ve bildirim sistemi.

## Güncel sürüm

**v1.0.3 RC — Başvuru Merkezi ve Erişim Düzeni**

v1.0.3 RC; işletme/Usta başvurularını ilk girişte müşteri hesabına göndermeyen Başvurum merkezini, Hesabım üzerinden isteğe bağlı müşteri geçişini, Ekip sayfasına özel İşletme ve Usta Erişimi yönetimini ve açılır İşletmemi Güncelle kategorisini Expo üzerinde test eder.

## v1.0.3 ile tamamlananlar

- Arka plan grid çizgilerinin kaldırılması
- Android klavye düzeninin `resize` yapılması
- Kayıt ve Ekip formlarında klavyenin yazı alanını kapatmaması
- Giriş ekranında `Pilot Test` yerine `Randevu` gösterilmesi
- `Yeni İşletme` ve `Zaten Bir İşletmem Var` kayıt seçenekleri
- Kayıt sırasında aktif işletme arama ve seçme
- Mevcut işletmeye İşletme Sahibi veya İşletme Sahibi + Usta başvurusu
- Başvurunun mevcut işletme sahiplerine bildirilmesi
- İşletme sahibinin başvuruyu onaylaması veya reddetmesi
- Ekip ekranında kayıtlı kullanıcıyı ad, telefon veya e-posta ile arama
- Kullanıcıya yalnız İşletme Paneli, yalnız Usta Paneli veya iki paneli birlikte açma
- Birden fazla ortağın aynı İşletme Paneline erişmesi
- Her Ustanın yalnız kendi kişisel Usta Paneli, iş geçmişi ve kayıtlı tutarlarını görmesi
- Yeni işletmede platform hizmet bedelinin otomatik aktif olması
- Aylık ödeme gününün 1–28 arasından otomatik seçilmesi
- Uygulama, kilit dosyası, Android ve iOS sürümlerinin eşitlenmesi

## Roller

- **Admin:** bütün işletmeler, başvurular ve platform ödemeleri
- **İşletme Sahibi:** yetkili olduğu işletmenin ortak İşletme Paneli ve ekip yönetimi
- **İşletme Sahibi + Usta:** ortak İşletme Paneli ile yalnız kendisine ait Usta Paneli
- **Usta:** yalnız kişisel Usta Paneli, atanmış işler ve kendi kayıtları
- **Çırak:** kısıtlı görev görünümü, finansal alanlar kapalı
- **Müşteri:** yalnız güvenli biçimde bağlı motor, servis, randevu ve borç kayıtları

## Ana modüller

### Servis ve Atölye

- Hızlı Servis, Bırakılan Motor ve Randevulu Servis
- Günlük atölye sırası ve servis durumları
- Net/tahmini fiyat, Nakit/IBAN tahsilat kaydı
- Yapılan işlemler, kullanılan parçalar ve ek işlem onayı
- Motor Hazır ve teslimden önce kesin fiyat koruması

### Müşteri ve Motosiklet Hafızası

- Plaka, telefon, takip kodu, QR ve Usta onayıyla eşleştirme
- Müşterinin bütün motosikletleri ve servis geçmişi
- Tarih/saat, kilometre, yapılan işlemler, parçalar ve Usta notları
- Son bakım bilgisi ve bir sonraki gelişte yapılacak iş notu

### Randevu

- Usta çalışma saatleri, mola ve slot süresi
- Müsait / Meşgul / Kapalı
- Çakışmasız saat seçimi
- Müşteri ve personel randevu akışları
- Randevuyu servis kaydına dönüştürme

### Alacak ve Ödemeler

- Borç, kısmi ödeme ve tam ödeme
- Ödeme sözü tarihi
- Nakit ve IBAN tahsilat geçmişi
- Müşterinin `Ödemeyi Yaptım` bildirimi
- Atanmış Ustanın banka hesabını kontrol ederek onay veya ret vermesi
- Tam onaylı ödemede borcun otomatik kapanması

### Raporlar

- Ustanın kişisel iş geçmişi ve kayıtlı işçilik tutarı
- Günlük, haftalık, aylık ve tüm zamanlar raporları
- İşletme toplamları ve Usta bazlı döküm
- Maaş, prim, komisyon, net kâr veya ortaklık payı hesaplanmaz

### Platform Hizmet Bedeli

- İşletme bazlı işlem başı bedel
- Yeni işletmede otomatik aktif takip
- Haftalık veya aylık ödeme periyodu
- İşletme ödeme bildirimi ve Admin onayı
- Opsiyonel private dekont

### Bildirimler

- Personel ve müşteri bildirim merkezi
- Bildirimden ilgili ekrana yönlendirme
- Servis, randevu, alacak, müşteri bağlantısı ve platform bildirimleri
- Seçilebilir özel bildirim sesleri
- Yerel bildirimler ve native build üzerinde uzaktan push

## Sürüm ve yedek

- **Uygulama:** `1.0.3 RC`
- **Android versionCode:** `20`
- **iOS buildNumber:** `20`
- **Önceki sürüm yedeği:** `backup/v1.0.2-before-v1.0.3-20260715`
- **Veritabanı rollback:** `supabase/rollbacks/rollback_v1_0_3_to_v1_0_2.sql`
- **APK workflow:** `DraBornGarage Release APK` — yalnız manuel çalışır

## Çalıştırma

```bash
cp .env.example .env
npm ci --no-audit --no-fund
npx expo start -c --go
```

Termux Android üzerinde Hermes host derleyicisi desteklenmediği için yalnız TypeScript kontrolü çalıştırılır:

```bash
npm run typecheck
npx expo start -c --go
```

Masaüstü ve GitHub Actions kalite kontrolü:

```bash
npm run test:release
```

## Veritabanı migrationları

- `20260714232648_v1_0_2_workshop_access_core.sql`
- `20260714232710_v1_0_2_owner_access_management.sql`
- `20260714232731_v1_0_2_submit_access_request.sql`
- `20260714232802_v1_0_2_grant_and_review_access.sql`
- `20260714232820_v1_0_2_platform_fee_defaults.sql`
- `20260714232847_v1_0_2_registration_partner_request.sql`

v1.0.3 RC Expo test sürümüdür. Bu turda otomatik APK üretilmez; Expo testleri tamamlandıktan sonra `DraBornGarage Release APK` workflow’u manuel başlatılır.
