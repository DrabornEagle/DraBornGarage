# DraBornGarage

Motosiklet ve oto tamir işletmeleri için çok işletmeli, rol tabanlı servis, müşteri, randevu, ek işlem onayı, alacak, raporlama, platform hizmet bedeli ve bildirim sistemi.

## Güncel sürüm

**v0.8.0 — Bildirimler ve Hatırlatmalar**

v0.8.0; servis, fiyat, ödeme, ek işlem, randevu, borç/alacak, müşteri eşleştirme ve platform hareketlerini kullanıcıya özel canlı bildirim akışına dönüştürür. Yaklaşan randevu, borç ve platform ödeme kayıtları Expo yerel bildirim sistemiyle telefonda planlanır.

## Tamamlanan ana modüller

### v0.1 — Çok İşletmeli Çekirdek

- Admin, İşletme Sahibi, İşletme Sahibi + Usta, Usta ve Çırak rolleri
- Çok işletmeli güvenli veri ayrımı
- Müşteri, motosiklet ve servis kayıtları
- Hızlı Servis, Bırakılan Motor ve Randevulu Servis
- Günlük atölye sırası
- Net/tahmini fiyat, Nakit/IBAN tahsilatı
- Yapılan işlemler ve kullanılan parçalar

### v0.2 — Müşteri Hesabı ve Motor Eşleştirme

- Ayrı Müşteri Portalı
- Plaka + telefon, servis takip kodu, QR ve Usta onayı
- Motorlarım ve Servislerim
- Çok işletmeli müşteri seçimi

### v0.3 — Randevu, Müsaitlik ve Usta Takvimi

- Usta çalışma saatleri, mola ve slot süresi
- Müsait / Meşgul / Kapalı
- Çakışmasız müsait saat motoru
- Müşteri ve personel randevu akışları
- Randevuyu servis kaydına dönüştürme

### v0.3.1 — Sürüm ve Yedekleme Standardı

- Her değişiklikte sürüm artırma
- Yeni sürümden önce sabit GitHub yedeği
- Migration ve rollback zorunluluğu

### v0.4.0 — Ek İşlem, Onay ve Servis Detayları

- Ek işlem, işçilik ve parça bedeli
- Uygulamadan, müşteri yanında, telefonla ve WhatsApp ile onay
- Onay geçmişi ve servis ilerleme kilidi
- İşlem Planlandı / Başladı / Tamamlandı
- Test ve motor hazır zamanları

### v0.4.1 — Müşteri Paneli Düzeltmesi

- Android güvenli alan ve alt menü düzeltmeleri
- Bağlantısız sekmelere kompakt kilitli durum kartları

### v0.5.0 — Veresiye / Alacak Takibi

- Borç, kısmi ödeme ve tam ödeme
- Ödeme sözü tarihi
- Nakit ve IBAN tahsilat geçmişi
- Açık, bugün, geciken, kısmi, ödenen ve kapatılan filtreleri
- Müşteri panelinde kalan borç
- Çırak için finansal verilerin gizlenmesi

### v0.6.0 — Usta Gelir Kayıtları ve İşletme Raporları

- Ustanın kişisel iş geçmişi
- Günlük, haftalık, aylık ve tüm zamanlar kayıtlı işlem tutarı
- Saat saat gelen motor grafiği
- Ustanın işlemleri, parçaları ve tahsil ettiği ödemeler
- İşletme toplamları ve Usta bazlı döküm

### v0.7.0 — Platform Hizmet Bedeli Takibi

- İşletme bazlı işlem başı platform bedeli
- Haftalık veya aylık ödeme periyodu
- Dönemlik ve devreden borç
- İşletme Sahibi ödeme bildirimi
- Admin onayı veya reddi
- Banka/IBAN bilgileri
- Opsiyonel private dekont yükleme
- Admin bütün işletmeler platform özeti

### v0.8.0 — Bildirimler ve Hatırlatmalar

- Personel ve müşteri panelinde bildirim zili
- Tümü, Okunmamış, Yaklaşan ve Ayarlar sekmeleri
- Supabase Realtime ile canlı uygulama içi bildirim
- Okunmamış sayı rozeti ve telefon uygulama rozeti
- Bildirimden ilgili ekrana yönlendirme
- Servis teslim alma, fiyat, onay, tamir, parça, test, hazır ve teslim bildirimleri
- Ek işlem onaylandı/reddedildi bildirimleri
- Yeni randevu, onay, değişiklik ve iptal bildirimleri
- Randevudan 24 saat ve 2 saat önce hatırlatma
- Borç ödeme günü ve gecikme
- Platform ödeme günü ve gecikme
- Admin platform ödeme bildirimi ve onay sonucu
- Müşteri eşleştirme talebi ve sonucu
- Kullanıcıya özel bildirim tercihleri
- Expo yerel telefon bildirimleri
- Android yüksek öncelikli bildirim kanalı
- Bildirim okuma, toplu okuma ve arşivleme
- RLS ile kullanıcı ve işletme bazlı güvenlik

> Expo Go Android üzerinde yerel bildirimler kullanılmaktadır. Uzaktan push bildirimi EAS development build / yayın yapısı gerektirdiği için v1.0 kapsamındadır.

> Sistem Usta maaşı, prim, komisyon, net kâr, ortaklık payı veya kazanç bölüşümü hesaplamaz.

## Çalıştırma

```bash
cp .env.example .env
npm install --no-audit --no-fund
npx expo start -c --go
```

## Kontroller

```bash
npm run typecheck
npm run test:bundle
```

## Güncel yedek ve geri dönüş

- **Kurulan sürüm:** `v0.8.0`
- **Yedeklenen sürüm:** `v0.7.0`
- **Kod yedeği:** `backup/v0.7.0-before-v0.8.0`
- **Veritabanı rollback:** [`supabase/rollbacks/rollback_v0_8_0_to_v0_7_0.sql`](supabase/rollbacks/rollback_v0_8_0_to_v0_7_0.sql)
- **Kurulum ve geri alma:** [`docs/TERMUX_INSTALL.md`](docs/TERMUX_INSTALL.md)
- **Zorunlu politika:** [`docs/VERSION_BACKUP_POLICY.md`](docs/VERSION_BACKUP_POLICY.md)

## Proje belgeleri

- [`docs/V0.1_CHECKLIST.md`](docs/V0.1_CHECKLIST.md)
- [`docs/V0.2_CHECKLIST.md`](docs/V0.2_CHECKLIST.md)
- [`docs/V0.3_CHECKLIST.md`](docs/V0.3_CHECKLIST.md)
- [`docs/V0.4_CHECKLIST.md`](docs/V0.4_CHECKLIST.md)
- [`docs/V0.5_CHECKLIST.md`](docs/V0.5_CHECKLIST.md)
- [`docs/V0.6_CHECKLIST.md`](docs/V0.6_CHECKLIST.md)
- [`docs/V0.7_CHECKLIST.md`](docs/V0.7_CHECKLIST.md)
- [`docs/V0.8_CHECKLIST.md`](docs/V0.8_CHECKLIST.md)
- [`docs/V0.7.0_CHANGELOG.md`](docs/V0.7.0_CHANGELOG.md)
- [`docs/V0.7.0_VALIDATION_REPORT.md`](docs/V0.7.0_VALIDATION_REPORT.md)
- [`docs/V0.8.0_CHANGELOG.md`](docs/V0.8.0_CHANGELOG.md)
- [`docs/V0.8.0_VALIDATION_REPORT.md`](docs/V0.8.0_VALIDATION_REPORT.md)
- [`docs/ROADMAP.md`](docs/ROADMAP.md)
- [`docs/VERSION_BACKUP_POLICY.md`](docs/VERSION_BACKUP_POLICY.md)
- [`supabase/migrations`](supabase/migrations)
- [`supabase/rollbacks`](supabase/rollbacks)

APK/AAB ve uzaktan push bildirimi v1.0 aşamasındadır. Tam web sürümü v1.0 sonrasında yalnızca opsiyonel olarak değerlendirilecektir.
