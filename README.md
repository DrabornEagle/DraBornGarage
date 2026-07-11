# DraBornGarage

Motosiklet ve oto tamir işletmeleri için çok işletmeli, rol tabanlı servis, müşteri, randevu, ek işlem onayı, alacak, raporlama ve platform hizmet bedeli takip sistemi.

## Güncel sürüm

**v0.7.0 — Platform Hizmet Bedeli Takibi**

v0.7.0; tamamlanan servislerden işletme bazlı işlem bedeli oluşturur, haftalık veya aylık dönem borcunu hesaplar, devreden borcu taşır, İşletme Sahibinin Nakit/IBAN ödeme bildirimi ve opsiyonel dekont göndermesini, Admin’in bildirimi onaylamasını veya reddetmesini sağlar.

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
- Müsait / Meşgul / Kapalı durumu
- Çakışmasız müsait saat motoru
- Müşteri ve personel randevu akışları
- Randevuyu servis kaydına dönüştürme

### v0.3.1 — Sürüm ve Yedekleme Standardı

- Her tamamlanan değişiklikte sürüm artırma
- Yeni sürüm başlamadan önce sabit GitHub yedeği
- Her sürüm için migration ve rollback

### v0.4.0 — Ek İşlem, Onay ve Servis Detayları

- Ek işlem, işçilik ve parça bedeli
- Uygulamadan, müşteri yanında, telefonla ve WhatsApp ile onay
- Onay geçmişi ve servis ilerleme kilidi
- İşlem Planlandı / Başladı / Tamamlandı akışı
- Test ve motor hazır zamanları

### v0.4.1 — Müşteri Paneli Düzeltmesi

- Android güvenli alan ve alt menü düzeltmeleri
- Bağlantısız sekmelere kompakt kilitli durum kartları

### v0.5.0 — Veresiye / Alacak Takibi

- Borç / veresiye, kısmi ödeme ve tam ödeme
- Ödeme sözü tarihi
- Nakit ve IBAN tahsilat geçmişi
- Açık, bugün, geciken, kısmi, ödenen ve kapatılan filtreleri
- Müşteri panelinde kalan borç
- Çırak için finansal verilerin gizlenmesi

### v0.6.0 — Usta Gelir Kayıtları ve İşletme Raporları

- Ustanın yalnız kendi kişisel iş geçmişi
- Günlük, haftalık, aylık ve tüm zamanlar kayıtlı işlem tutarı
- Saat saat gelen motor grafiği
- Ustanın işlemleri, parçaları ve tahsil ettiği ödemeler
- İşletme toplamları
- Usta bazlı iş ve kayıtlı tutar dökümü
- En çok yapılan işlemler ve son servisler

### v0.7.0 — Platform Hizmet Bedeli Takibi

- İşletme bazlı işlem başı platform bedeli
- Admin varsayılan bedeli ve işletmeye özel bedel
- Platform takibini işletme bazında açma/kapatma
- Servis Hazır/Tamamlandı/Teslim Edildi olduğunda otomatik ücret kaydı
- İptal edilen serviste ücret kaydını geçersiz kılma
- Haftalık veya aylık ödeme periyodu
- Haftalık ödeme günü
- Aylık 1–28 veya son gün seçimi
- Dönemlik borç ve devreden borç
- Ödeme günü geldi ve geciken borç durumları
- Kısmi ödeme
- İşletme Sahibi ödeme bildirimi
- Ödemeyi en eski dönemden başlayarak otomatik dağıtma
- Admin onayı veya reddi
- Admin banka, hesap sahibi ve IBAN bilgileri
- Opsiyonel dekont yükleme
- Private Supabase Storage ve imzalı dekont bağlantısı
- Admin bütün işletmeler platform özeti
- İşletme Sahibi/Admin için Merkez: Raporlar, Platform ve Ekip

> Platform hizmet bedeli DraBornGarage’a ödenecek işletme bedelidir. Usta maaşı, prim, komisyon, net kâr, ortaklık payı veya ay sonu kazanç bölüşümü hesaplanmaz.

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

- **Kurulan sürüm:** `v0.7.0`
- **Yedeklenen sürüm:** `v0.6.0`
- **Kod yedeği:** `backup/v0.6.0-before-v0.7.0`
- **Veritabanı rollback:** [`supabase/rollbacks/rollback_v0_7_0_to_v0_6_0.sql`](supabase/rollbacks/rollback_v0_7_0_to_v0_6_0.sql)
- **Kurulum ve geri alma komutları:** [`docs/TERMUX_INSTALL.md`](docs/TERMUX_INSTALL.md)
- **Zorunlu politika:** [`docs/VERSION_BACKUP_POLICY.md`](docs/VERSION_BACKUP_POLICY.md)

## Proje belgeleri

- [`docs/V0.1_CHECKLIST.md`](docs/V0.1_CHECKLIST.md)
- [`docs/V0.2_CHECKLIST.md`](docs/V0.2_CHECKLIST.md)
- [`docs/V0.3_CHECKLIST.md`](docs/V0.3_CHECKLIST.md)
- [`docs/V0.4_CHECKLIST.md`](docs/V0.4_CHECKLIST.md)
- [`docs/V0.5_CHECKLIST.md`](docs/V0.5_CHECKLIST.md)
- [`docs/V0.6_CHECKLIST.md`](docs/V0.6_CHECKLIST.md)
- [`docs/V0.7_CHECKLIST.md`](docs/V0.7_CHECKLIST.md)
- [`docs/V0.6.0_CHANGELOG.md`](docs/V0.6.0_CHANGELOG.md)
- [`docs/V0.6.0_VALIDATION_REPORT.md`](docs/V0.6.0_VALIDATION_REPORT.md)
- [`docs/V0.7.0_CHANGELOG.md`](docs/V0.7.0_CHANGELOG.md)
- [`docs/V0.7.0_VALIDATION_REPORT.md`](docs/V0.7.0_VALIDATION_REPORT.md)
- [`docs/ROADMAP.md`](docs/ROADMAP.md)
- [`docs/VERSION_BACKUP_POLICY.md`](docs/VERSION_BACKUP_POLICY.md)
- [`supabase/migrations`](supabase/migrations)
- [`supabase/rollbacks`](supabase/rollbacks)

APK/AAB üretimi v1.0 aşamasındadır. Tam web sürümü v1.0 sonrasında yalnızca opsiyonel olarak değerlendirilecektir.
