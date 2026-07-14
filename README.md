# DraBornGarage

Motosiklet ve oto servis işletmeleri için çok işletmeli, rol tabanlı servis, müşteri, randevu, araç, ek işlem onayı, alacak, raporlama, platform hizmet bedeli ve bildirim sistemi.

## Güncel sürüm

**v0.9.7 — Bugünkü Sıra ve Motor Hazır Ücret Koruması**

v0.9.7; Usta Panelindeki Bugünkü Atölye Sırasını yalnız bugünün kayıtlarıyla sınırlar ve tahsil edilecek son net ücret girilmeden Motor Hazır aşamasına geçilmesini engeller.

## v0.9.7 ile tamamlananlar

- Bugünkü Atölye Sırasında önceki günlerin tamamlanmış işlerinin gösterilmemesi
- Tamire fiyat girmeden başlanabilmesi
- Motor Hazır, Tamamlandı ve Teslim Edildi aşamalarından önce final ücret zorunluluğu
- Ücret eksikse modern uyarı verilmesi ve ücret bölümünün otomatik açılması
- Uygulama ve Supabase tarafında çift katmanlı ücret koruması

## Önceki v0.9.6 düzeltmeleri

- Usta Paneli Hazır/Tamam sayısının servis hareketlerinde canlı yenilenmesi
- Hemen Başla seçeneğinde fiyat zorunluluğunun kaldırılması
- Tahmini fiyatın müşteriye aralık olarak gösterilmesi ve sıfır tutarın ödenmiş sayılmaması
- Motor tesliminden önce son net fiyat koruması
- İşletme aramasında modern sonuç bulunamadı kartı
- Bildirimlerin en yeni kayıt üstte olacak şekilde sıralanması
- Arşiv ikonunun yanına kalıcı silme ikonu
- Kalkanın servis detayından kaldırılıp Servislerim listesinde korunması

- Kalkan simgesinin Randevularım ekranından kaldırılıp Servislerim ekranına taşınması
- Usta Paneli günlük iş tutarının tamamlanan iş emri işçiliğiyle hesaplanması
- Usta Raporu ve İşletme Raporu Usta kırılımının aynı kayıt kuralını kullanması
- İşlem satırı olmayan tamamlanmış motorların atanmış Usta işçiliğine dahil edilmesi
- Motor Hazır, Tamamlandı ve Teslim Edildi durumlarının tamamlanmış iş olarak sayılması
- İş emri tamamlandığında unutulan işlem satırlarının otomatik tamamlanması
- Geçmiş teslim edilmiş kayıtlardaki eksik tamamlanma işaretlerinin onarılması

- “Motor Hazır IBAN” başlığının “IBAN Ayarları” olarak değiştirilmesi
- Usta ve İşletme Sahibi + Usta hesaplarında müşteri görünürlüğünün varsayılan aktif olması
- Motor Hazır veya açık veresiye kaydında atanmış Usta IBAN bilgisinin gösterilmesi
- Müşterinin tutar ve notla “Ödemeyi Yaptım” bildirimi göndermesi
- Bekleyen ödeme bildiriminin Ustanın Alacak ekranında gösterilmesi
- Yalnız atanmış Ustanın onay veya ret verebilmesi
- Usta onayı olmadan tahsilat ve borç değişikliği yapılmaması
- Tam onaylı ödemede borcun otomatik kapanması, kısmi ödemede kalan tutarın güncellenmesi
- Müşteriye onay veya ret sonucu bildirimi gönderilmesi
- Çift onay, fazla tutar ve aynı anda birden fazla bekleyen bildirim koruması
- Google Play finansal hizmet sınırının korunması: uygulama para tutmaz veya transfer başlatmaz

## Ana modüller

### Çok İşletmeli Çekirdek

- Admin, İşletme Sahibi, İşletme Sahibi + Usta, Usta, Çırak ve Müşteri rolleri
- Çok işletmeli güvenli veri ayrımı
- Müşteri, motosiklet ve servis kayıtları
- Hızlı Servis, Bırakılan Motor ve Randevulu Servis
- Günlük atölye sırası ve servis durumları
- Net/tahmini fiyat, Nakit/IBAN tahsilat kaydı
- Yapılan işlemler ve kullanılan parçalar

### Müşteri Hesabı ve Motor Eşleştirme

- Ayrı Müşteri Portalı
- Plaka + telefon, servis takip kodu, QR ve Usta onayı
- Motorlarım ve Servislerim
- Çok işletmeli müşteri seçimi

### Randevu ve Usta Takvimi

- Modern Takvim / Randevu Ekle / Çalışma Saatleri merkezi
- Usta çalışma saatleri, mola ve slot süresi
- Müsait / Meşgul / Kapalı
- Çakışmasız müsait saat motoru
- Müşteri ve personel randevu akışları
- Randevuyu servis kaydına dönüştürme

### Ek İşlem ve Servis Detayları

- Ek işlem, işçilik ve parça bedeli
- Uygulamadan, müşteri yanında, telefonla ve WhatsApp ile onay
- Onay geçmişi ve servis ilerleme kilidi
- İşlem Planlandı / Başladı / Tamamlandı
- Test ve motor hazır zamanları

### Veresiye / Alacak

- Borç, kısmi ödeme ve tam ödeme
- Ödeme sözü tarihi
- Nakit ve IBAN tahsilat geçmişi
- Açık, bugün, geciken, kısmi, ödenen ve kapatılan filtreleri
- Müşteri panelinde kalan borç
- Çırak için finansal verilerin gizlenmesi

### Raporlar

- Ustanın kişisel iş geçmişi
- Günlük, haftalık, aylık ve tüm zamanlar kayıtlı işlem tutarı
- Saat saat gelen motor grafiği
- Ustanın işlemleri, parçaları ve tahsil ettiği ödemeler
- İşletme toplamları ve Usta bazlı döküm

### Platform Hizmet Bedeli

- İşletme bazlı işlem başı platform bedeli
- Haftalık veya aylık ödeme periyodu
- Dönemlik ve devreden borç
- İşletme Sahibi ödeme bildirimi
- Admin onayı veya reddi
- Ödeme bildirimi üzerinden doğrudan ilgili onay kartına geçiş
- Banka/IBAN bilgileri ve opsiyonel private dekont

### Bildirimler

- Personel ve müşteri panelinde bildirim merkezi
- Okunmamış sayı rozeti ve telefon uygulama rozeti
- Bildirimden ilgili ekrana yönlendirme
- Servis, ek işlem, randevu, alacak ve platform bildirimleri
- 24 saat ve 2 saat randevu hatırlatmaları
- Kullanıcıya özel bildirim tercihleri
- Seçilebilir özel bildirim sesleri
- Yerel bildirimler ve native build üzerinde uzaktan push
- Okuma, toplu okuma ve arşivleme

> Sistem Usta maaşı, prim, komisyon, net kâr, ortaklık payı veya kazanç bölüşümü hesaplamaz.

## Çalıştırma

```bash
cp .env.example .env
npm ci --no-audit --no-fund
npx expo start -c --go
```

## Kontroller

```bash
npm run typecheck
npm run test:bundle
# veya
npm run test:release
```

`npm run test:bundle` masaüstü/GitHub Actions ortamında çalıştırılır. Termux Android üzerinde Hermes host derleyicisi desteklenmediği için Expo Go açılışında yalnız `npm run typecheck` kullanılır.

## Native push ve özel ses

Expo Go, Android uzaktan push bildirimi ve paketlenmiş özel ses için yeterli değildir. Native test:

```bash
npx eas-cli build --platform android --profile preview
```

Production AAB:

```bash
npx eas-cli build --platform android --profile production
```

EAS proje kimliği `.env` içinde `EXPO_PUBLIC_EAS_PROJECT_ID` olarak tanımlanır.

## Yedek ve geri dönüş

- **Kurulan sürüm:** `v0.9.1`
- **Yedeklenen sürüm:** `v0.9.0`
- **Kod yedeği:** `backup/v0.9.0-before-v0.9.1-20260714`
- **v0.9 gizlilik migration:** `supabase/migrations/20260714002755_v0_9_privacy_account_deletion_security.sql`
- **v0.9.1 ses/push migration:** `supabase/migrations/20260714090000_v0_9_1_push_sounds_payment_focus.sql`
- **Termux kurulumu:** `docs/TERMUX_INSTALL.md`

## v0.9.1 belgeleri

- `docs/CHANGELOG_V0.9.1.md`
- `docs/V0.9.1_IMPLEMENTATION.md`
- `docs/GOOGLE_PLAY_LISTING_TR.md`
- `docs/GOOGLE_PLAY_ACCOUNT_POSITIONING.md`
- `docs/GOOGLE_PLAY_DATA_SAFETY.md`
- `docs/PRIVACY_POLICY.md`
- `docs/ACCOUNT_DELETION.md`

v0.9.1 kapalı test ve pilot yamasıdır. Google Play Console yüklemesi ve gerçek cihaz kapalı test kabulü v1.0 yayın kapısında yürütülür.
