# DraBornGarage

Motosiklet ve oto tamir işletmeleri için çok işletmeli, rol tabanlı servis, müşteri, randevu, ek işlem onayı ve alacak takip platformu.

## Güncel sürüm

**v0.5.0 — Veresiye / Alacak ve Kısmi Ödeme Takibi**

v0.5.0; servislerde kalan borcun yazılmasını, ödeme sözü tarihini, Nakit/IBAN kısmi tahsilatlarını, geciken borçları, müşteri ödeme görünümünü ve güvenli alacak geçmişini yönetir.

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
- Plaka + telefon, servis takip kodu, QR ve usta onayı
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

- Eşleştirme kartlarının flex yerleşimi düzeltildi
- Android güvenli alan alt menüsü
- İçeriğin menü arkasında kalması önlendi
- Bağlantısız sekmelere kompakt kilitli durum kartları

### v0.5.0 — Veresiye / Alacak Takibi

- Servisten borç / veresiye yazma
- Ödenmedi, Kısmi Ödendi, Tam Ödendi ve Kapatıldı durumları
- Ödeme sözü tarihi, borç yazılma ve kapanış zamanı
- Nakit ve IBAN kısmi tahsilat
- Kalan tutardan fazla tahsilatı engelleme
- Tam ödemede alacağı otomatik kapatma
- Açık, bugün, geciken, kısmi, ödenen ve kapatılan filtreleri
- Müşteri, telefon ve plaka araması
- Ayrıntılı alacak, ödeme, not ve hareket geçmişi
- Müşteri panelinde kalan borç ve ödeme geçmişi
- Müşteriye açık ödeme notları ve hatırlatmalar
- Çırak için finansal verilerin ve Alacak sekmesinin gizlenmesi
- Gecikmiş, bugün, gelecek tarihli ve kapanmış demo kayıtları

> Usta bazlı tutarlar maaş, komisyon, prim, net kâr veya ortaklık payı değildir. Sistem yalnızca hangi ustanın hangi işlem için ne kadar tutar kaydettiğini tutar.

> v0.5 “Hatırlatma gönder” işlemi müşterinin uygulama panelinde ödeme notu oluşturur. Gerçek SMS, WhatsApp ve push kanalları v0.8 kapsamındadır.

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

- **Kurulan sürüm:** `v0.5.0`
- **Yedeklenen sürüm:** `v0.4.1`
- **Kod yedeği:** `backup/v0.4.1-before-v0.5.0`
- **Veritabanı rollback:** [`supabase/rollbacks/rollback_v0_5_0_to_v0_4_1.sql`](supabase/rollbacks/rollback_v0_5_0_to_v0_4_1.sql)
- **Kurulum ve geri alma komutları:** [`docs/TERMUX_INSTALL.md`](docs/TERMUX_INSTALL.md)
- **Zorunlu politika:** [`docs/VERSION_BACKUP_POLICY.md`](docs/VERSION_BACKUP_POLICY.md)

## Proje belgeleri

- [`docs/V0.1_CHECKLIST.md`](docs/V0.1_CHECKLIST.md)
- [`docs/V0.2_CHECKLIST.md`](docs/V0.2_CHECKLIST.md)
- [`docs/V0.3_CHECKLIST.md`](docs/V0.3_CHECKLIST.md)
- [`docs/V0.4_CHECKLIST.md`](docs/V0.4_CHECKLIST.md)
- [`docs/V0.5_CHECKLIST.md`](docs/V0.5_CHECKLIST.md)
- [`docs/V0.4.0_CHANGELOG.md`](docs/V0.4.0_CHANGELOG.md)
- [`docs/V0.4.1_CHANGELOG.md`](docs/V0.4.1_CHANGELOG.md)
- [`docs/V0.5.0_CHANGELOG.md`](docs/V0.5.0_CHANGELOG.md)
- [`docs/ROADMAP.md`](docs/ROADMAP.md)
- [`docs/VERSION_BACKUP_POLICY.md`](docs/VERSION_BACKUP_POLICY.md)
- [`supabase/migrations`](supabase/migrations)
- [`supabase/rollbacks`](supabase/rollbacks)

APK/AAB üretimi v1.0 aşamasındadır. Tam web sürümü v1.0 sonrasında yalnızca opsiyonel olarak değerlendirilecektir.
