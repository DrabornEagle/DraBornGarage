# DraBornGarage

Motosiklet ve oto tamir işletmeleri için çok işletmeli, rol tabanlı servis, müşteri, randevu ve ek işlem onay platformu.

## Güncel sürüm

**v0.4.0 — Ek İşlem, Müşteri Onayı ve Servis Detayları**

v0.4.0; tamir sırasında ortaya çıkan ek işçilik ve parça masraflarını kontrollü biçimde yönetir. Müşteri uygulamadan onaylayabilir veya işletme; müşterinin yanında, telefonla ya da WhatsApp üzerinden verdiği onayı kayıt altına alabilir.

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
- Uygulamadan müşteri onayı bekleme
- Müşteri yanında onay verdi kaydı
- Telefonla onay alındı kaydı
- WhatsApp ile onay alındı kaydı
- Reddedildi kaydı
- Onay yöntemi, yanıt notu ve zaman geçmişi
- Bekleyen ek onay varken tamir/test/hazır/teslim adımlarını kilitleme
- Onaylanan ek tutarı işletme toplamına otomatik ekleme
- Reddedilen veya bekleyen tutarı toplama eklememe
- Aynı ek tutarı işlem/parça satırlarında ikinci kez saymama
- İşlem kalemi için Planlandı / Başladı / Tamamlandı
- İşlem başlangıç ve bitiş zamanları
- Kullanılan parçaları manuel ekleme ve silme
- Parça kullanım zamanı
- Tespit ve dahili atölye notları
- Müşteriye açık servis notları
- Test başladı ve motor hazır zamanları
- Servis hareket geçmişi
- Müşteri ana sayfasında bekleyen onay uyarısı
- Müşteri servis detayında ek işlemi onaylama/reddetme
- Onay geçmişi, parça ve servis kalemlerini müşteri tarafında görme
- Çırak için finans ve onay bilgilerinin gizli kalması
- v0.4’e özel geçici demo verileri

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

- **Kurulan sürüm:** `v0.4.0`
- **Yedeklenen sürüm:** `v0.3.1`
- **Kod yedeği:** `backup/v0.3.1-before-v0.4.0`
- **Veritabanı rollback:** [`supabase/rollbacks/rollback_v0_4_0_to_v0_3_1.sql`](supabase/rollbacks/rollback_v0_4_0_to_v0_3_1.sql)
- **Kurulum ve geri alma komutları:** [`docs/TERMUX_INSTALL.md`](docs/TERMUX_INSTALL.md)
- **Zorunlu politika:** [`docs/VERSION_BACKUP_POLICY.md`](docs/VERSION_BACKUP_POLICY.md)

## Proje belgeleri

- [`docs/V0.1_CHECKLIST.md`](docs/V0.1_CHECKLIST.md)
- [`docs/V0.2_CHECKLIST.md`](docs/V0.2_CHECKLIST.md)
- [`docs/V0.3_CHECKLIST.md`](docs/V0.3_CHECKLIST.md)
- [`docs/V0.4_CHECKLIST.md`](docs/V0.4_CHECKLIST.md)
- [`docs/V0.4.0_CHANGELOG.md`](docs/V0.4.0_CHANGELOG.md)
- [`docs/ROADMAP.md`](docs/ROADMAP.md)
- [`docs/VERSION_BACKUP_POLICY.md`](docs/VERSION_BACKUP_POLICY.md)
- [`supabase/migrations`](supabase/migrations)
- [`supabase/rollbacks`](supabase/rollbacks)

APK/AAB üretimi v1.0 aşamasındadır. Tam web sürümü v1.0 sonrasında yalnızca opsiyonel olarak değerlendirilecektir.
