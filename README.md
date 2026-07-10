# DraBornGarage

Motosiklet ve oto tamir işletmeleri için çok işletmeli, rol tabanlı servis, müşteri ve randevu yönetim platformu.

## Güncel sürüm

**v0.3.0 — Randevu, Müsaitlik ve Usta Takvimi**

## Tamamlanan ana modüller

### v0.1 — Çok İşletmeli Çekirdek

- Admin, İşletme Sahibi, İşletme Sahibi + Usta, Usta ve Çırak rolleri
- Çok işletmeli güvenli veri ayrımı
- Müşteri, motosiklet ve servis kayıtları
- Hızlı Servis, Bırakılan Motor ve Randevulu Servis tipi
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
- İşletmede eşleştirme talebi onaylama/reddetme

### v0.3 — Randevu, Müsaitlik ve Usta Takvimi

- Usta haftalık çalışma saatleri
- Mola ve randevu slot süresi
- Müsait / Meşgul / Kapalı durumu
- Belirli gün ve saat kapatma
- Çakışmasız gerçek müsait saat motoru
- Müşteri uygulamasından randevu talebi
- Otomatik onay veya usta onayı
- İşletme Sahibi/Admin/Usta günlük takvimi
- Manuel randevu ekleme
- Yeniden planlama ve başka ustaya aktarma yetkileri
- Onaylandı, Geldi, Gelmedi, İptal ve Servise Dönüştü akışları
- Randevuyu tek dokunuşla servis kaydına dönüştürme
- Randevu hareket geçmişi
- İşletme randevu ayarları
- Veritabanı seviyesinde çift randevu engeli

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

v0.3 için GitHub Actions bağımlılık kurulumu, TypeScript ve Android JavaScript bundle adımları başarıyla tamamlanmıştır.

## Yedek ve geri dönüş

Yeni sürüme geçmeden önce yedek oluşturmak zorunludur.

- v0.2 kod yedeği: `backup/v0.2.0-before-v0.3`
- v0.3 → v0.2 veritabanı rollback: [`supabase/rollbacks/rollback_v0_3_to_v0_2.sql`](supabase/rollbacks/rollback_v0_3_to_v0_2.sql)
- Politika: [`docs/VERSION_BACKUP_POLICY.md`](docs/VERSION_BACKUP_POLICY.md)

## Proje belgeleri

- [`docs/V0.1_CHECKLIST.md`](docs/V0.1_CHECKLIST.md)
- [`docs/V0.2_CHECKLIST.md`](docs/V0.2_CHECKLIST.md)
- [`docs/V0.3_CHECKLIST.md`](docs/V0.3_CHECKLIST.md)
- [`docs/ROADMAP.md`](docs/ROADMAP.md)
- [`docs/VERSION_BACKUP_POLICY.md`](docs/VERSION_BACKUP_POLICY.md)
- [`supabase/migrations`](supabase/migrations)
- [`supabase/rollbacks`](supabase/rollbacks)

APK/AAB üretimi v1.0 aşamasındadır. Tam web sürümü v1.0 sonrasında yalnızca opsiyonel olarak değerlendirilecektir.
