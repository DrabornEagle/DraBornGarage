# DraBornGarage

Motosiklet ve oto tamir işletmeleri için çok işletmeli, rol tabanlı servis, müşteri, randevu ve ek işlem onay platformu.

## Güncel sürüm

**v0.4.1 — Müşteri Paneli Yerleşim ve Navigasyon Düzeltmesi**

v0.4.1; v0.4.0 özelliklerini korur, müşteri eşleştirme ekranındaki bozuk yöntem kartlarını, alt navigasyon çakışmasını ve bağlantısız sekmelerde tekrarlanan uzun form sorununu düzeltir.

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

- Usta haftalık çalışma saatleri, mola ve slot süresi
- Müsait / Meşgul / Kapalı durumu
- Belirli gün ve saat kapatma
- Çakışmasız gerçek müsait saat motoru
- Müşteri uygulamasından randevu
- İşletme Sahibi/Admin/Usta günlük takvimi
- Manuel randevu, yeniden planlama ve başka ustaya aktarma
- Randevuyu servis kaydına dönüştürme

### v0.3.1 — Sürüm ve Yedekleme Standardı

- Her tamamlanan değişiklikte sürüm artırma
- Yeni sürüm başlamadan önce sabit GitHub yedeği
- Kurulum ve geri alma komutlarında tam sürüm bilgisi
- Her sürüm için migration ve rollback kaydı

### v0.4.0 — Ek İşlem, Onay ve Servis Detayları

- Ek işlem adı, açıklaması, ek işçilik ve ek parça bedeli
- Uygulamadan, müşteri yanında, telefonla ve WhatsApp ile onay
- Reddedildi kaydı ve onay geçmişi
- Bekleyen ek onay varken servis ilerleme kilidi
- Onaylanan ek tutarın otomatik toplam hesabı
- İşlem Planlandı / Başladı / Tamamlandı akışı
- Kullanılan parçalar ve parça kullanım zamanı
- Tespit, dahili not ve müşteriye açık not
- Test başladı ve motor hazır zamanları
- Müşteri servis detayında onaylama/reddetme
- Çırak için finans ve onay bilgilerinin gizlenmesi

### v0.4.1 — Müşteri Paneli Düzeltmesi

- `AnimatedPressable` flex ve genişlik ölçüm hatası giderildi
- Eşleştirme yöntemleri yeniden düzgün iki sütun halinde gösterildi
- Uzun boş dikey çubuk görünümü kaldırıldı
- Alt menü Android güvenli alanına göre konumlandırıldı
- İçerik ve eşleştirme butonunun alt menünün arkasında kalması önlendi
- Motorlar, Randevu ve Servisler sekmelerindeki tekrarlanan uzun form kaldırıldı
- Bağlantısız sekmelere kompakt kilitli durum kartı eklendi
- Kilitli kartlardan Ana Sayfa eşleştirme ekranına yönlendirme eklendi

> Usta bazlı tutarlar maaş, komisyon, prim, net kâr veya ortaklık payı değildir. Sistem yalnızca hangi ustanın hangi işlem için ne kadar tutar kaydettiğini tutar.

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

- **Kurulan sürüm:** `v0.4.1`
- **Yedeklenen sürüm:** `v0.4.0`
- **Kod yedeği:** `backup/v0.4.0-before-v0.4.1-customer-panel-fix`
- **Veritabanı rollback:** [`supabase/rollbacks/rollback_v0_4_1_to_v0_4_0.sql`](supabase/rollbacks/rollback_v0_4_1_to_v0_4_0.sql)
- **Kurulum ve geri alma komutları:** [`docs/TERMUX_INSTALL.md`](docs/TERMUX_INSTALL.md)
- **Zorunlu politika:** [`docs/VERSION_BACKUP_POLICY.md`](docs/VERSION_BACKUP_POLICY.md)

## Proje belgeleri

- [`docs/V0.1_CHECKLIST.md`](docs/V0.1_CHECKLIST.md)
- [`docs/V0.2_CHECKLIST.md`](docs/V0.2_CHECKLIST.md)
- [`docs/V0.3_CHECKLIST.md`](docs/V0.3_CHECKLIST.md)
- [`docs/V0.4_CHECKLIST.md`](docs/V0.4_CHECKLIST.md)
- [`docs/V0.4.0_CHANGELOG.md`](docs/V0.4.0_CHANGELOG.md)
- [`docs/V0.4.1_CHANGELOG.md`](docs/V0.4.1_CHANGELOG.md)
- [`docs/ROADMAP.md`](docs/ROADMAP.md)
- [`docs/VERSION_BACKUP_POLICY.md`](docs/VERSION_BACKUP_POLICY.md)
- [`supabase/migrations`](supabase/migrations)
- [`supabase/rollbacks`](supabase/rollbacks)

APK/AAB üretimi v1.0 aşamasındadır. Tam web sürümü v1.0 sonrasında yalnızca opsiyonel olarak değerlendirilecektir.
