# DraBornGarage

Motosiklet ve oto tamir işletmeleri için çok işletmeli, rol tabanlı servis, müşteri, randevu, ek işlem onayı, alacak ve raporlama platformu.

## Güncel sürüm

**v0.6.0 — Usta Gelir Kayıtları ve İşletme Raporları**

v0.6.0; her Ustanın yalnız kendi iş geçmişini ve işlem satırlarına kaydedilen tutarları görmesini, İşletme Sahibi/Admin’in ise işletme toplamlarını, Nakit/IBAN tahsilatlarını, açık alacakları ve Usta bazlı raporları izlemesini sağlar.

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

- Müşteri ve personel hesap türleri
- Ayrı Müşteri Portalı
- Plaka + telefon, servis takip kodu, QR ve Usta onayı
- Uygulama içi QR kamera tarayıcısı
- Motorlarım, Servislerim ve müşteri hesap yönetimi
- Çok işletmeli müşteri seçimi

### v0.3 — Randevu, Müsaitlik ve Usta Takvimi

- Usta çalışma saatleri, mola ve slot süresi
- Müsait / Meşgul / Kapalı durumu
- Belirli gün ve saat kapatma
- Çakışmasız müsait saat motoru
- Müşteri uygulamasından randevu
- İşletme Sahibi/Admin/Usta günlük takvimi
- Manuel randevu ve servis kaydına dönüştürme

### v0.3.1 — Sürüm ve Yedekleme Standardı

- Her tamamlanan değişiklikte sürüm artırma
- Yeni sürüm başlamadan önce sabit GitHub yedeği
- Kurulum ve geri alma komutlarında tam sürüm bilgisi
- Her sürüm için migration ve rollback kaydı

### v0.4.0 — Ek İşlem, Onay ve Servis Detayları

- Ek işlem, işçilik ve parça bedeli
- Uygulamadan, müşteri yanında, telefonla ve WhatsApp ile onay
- Onay geçmişi ve servis ilerleme kilidi
- Güvenli toplam hesaplama
- İşlem Planlandı / Başladı / Tamamlandı akışı
- Parça, tespit, dahili not ve müşteriye açık not
- Test ve motor hazır zamanları

### v0.4.1 — Müşteri Paneli Düzeltmesi

- Android güvenli alan ve alt menü düzeltmeleri
- İçeriğin menü arkasında kalmasının önlenmesi
- Bağlantısız sekmelere kompakt kilitli durum kartları

### v0.5.0 — Veresiye / Alacak Takibi

- Servisten borç / veresiye yazma
- Ödenmedi, Kısmi Ödendi, Tam Ödendi ve Kapatıldı durumları
- Ödeme sözü tarihi ve alacak hareket geçmişi
- Nakit ve IBAN kısmi tahsilat
- Açık, bugün, geciken, kısmi, ödenen ve kapatılan filtreleri
- Müşteri panelinde kalan borç ve ödeme geçmişi
- Çırak için finansal verilerin gizlenmesi

### v0.6.0 — Usta Gelir Kayıtları ve İşletme Raporları

- Alt menüde ortak Rapor merkezi
- Bugün, Bu Hafta, Bu Ay ve Tüm Zamanlar filtreleri
- Ustanın yalnız kendi kişisel iş geçmişi
- Motorun geliş saati, plaka, müşteri ve yapılan işlemler
- Ustanın işlem satırlarına kaydettiği tutar
- Ustanın kullandığı parçalar
- Ustanın tahsil ettiği Nakit ve IBAN hareketleri
- Saat saat gelen motor grafiği
- Günlük kayıtlı işlem tutarı grafiği
- İşletmenin toplam kaydedilen servis tutarı
- İşçilik, parça, Nakit, IBAN ve açık alacak özetleri
- Usta bazlı iş sayısı ve kayıtlı tutar
- En çok yapılan işlemler ve son servis kayıtları
- İşletme Sahibi + Usta için İşletme/Kişisel görünüm geçişi
- Admin, Sahip, Usta ve Çırak için sunucu taraflı rol denetimi

> Usta bazlı tutarlar maaş, komisyon, prim, net kâr veya ortaklık payı değildir. Sistem yalnızca Ustanın tamamlanan işlem satırlarına kaydedilen tutarı gösterir. Ay sonu bölüşümü işletmenin kendi özel anlaşmasına göre sistem dışında yapılır.

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

- **Kurulan sürüm:** `v0.6.0`
- **Yedeklenen sürüm:** `v0.5.0`
- **Kod yedeği:** `backup/v0.5.0-before-v0.6.0`
- **Veritabanı rollback:** [`supabase/rollbacks/rollback_v0_6_0_to_v0_5_0.sql`](supabase/rollbacks/rollback_v0_6_0_to_v0_5_0.sql)
- **Kurulum ve geri alma komutları:** [`docs/TERMUX_INSTALL.md`](docs/TERMUX_INSTALL.md)
- **Zorunlu politika:** [`docs/VERSION_BACKUP_POLICY.md`](docs/VERSION_BACKUP_POLICY.md)

## Proje belgeleri

- [`docs/V0.1_CHECKLIST.md`](docs/V0.1_CHECKLIST.md)
- [`docs/V0.2_CHECKLIST.md`](docs/V0.2_CHECKLIST.md)
- [`docs/V0.3_CHECKLIST.md`](docs/V0.3_CHECKLIST.md)
- [`docs/V0.4_CHECKLIST.md`](docs/V0.4_CHECKLIST.md)
- [`docs/V0.5_CHECKLIST.md`](docs/V0.5_CHECKLIST.md)
- [`docs/V0.6_CHECKLIST.md`](docs/V0.6_CHECKLIST.md)
- [`docs/V0.5.0_CHANGELOG.md`](docs/V0.5.0_CHANGELOG.md)
- [`docs/V0.5.0_VALIDATION_REPORT.md`](docs/V0.5.0_VALIDATION_REPORT.md)
- [`docs/V0.6.0_CHANGELOG.md`](docs/V0.6.0_CHANGELOG.md)
- [`docs/V0.6.0_VALIDATION_REPORT.md`](docs/V0.6.0_VALIDATION_REPORT.md)
- [`docs/ROADMAP.md`](docs/ROADMAP.md)
- [`docs/VERSION_BACKUP_POLICY.md`](docs/VERSION_BACKUP_POLICY.md)
- [`supabase/migrations`](supabase/migrations)
- [`supabase/rollbacks`](supabase/rollbacks)

APK/AAB üretimi v1.0 aşamasındadır. Tam web sürümü v1.0 sonrasında yalnızca opsiyonel olarak değerlendirilecektir.
