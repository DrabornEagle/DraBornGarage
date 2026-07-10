# DraBornGarage

Motosiklet ve oto tamir işletmeleri için çok işletmeli, rol tabanlı servis ve müşteri takip platformu.

## Ana ürün kararı

Şu anda yalnızca **DraBornGarage** geliştirilmektedir. DraBornStyle, DraBornRepair, DraBornWash ve DraBornClinic bu yol haritasında yer almaz. Öncelik mobil uygulamanın v1.0’a kadar tamamlanması ve Google Play’e hazırlanmasıdır.

## v0.1 — Çok İşletmeli Çekirdek

- `Admin` paneli; Super Admin adı kullanılmaz
- Birden fazla işletme ve işletmeler arasında güvenli seçim
- İşletme ekleme, düzenleme, aktif/pasif yapma
- İşletme Sahibi
- İşletme Sahibi + Usta
- Usta
- Finansal verileri göremeyen kısıtlı Çırak Paneli
- Personel daveti, rol değişimi ve pasifleştirme
- Plakayla tekrar gelen müşteri/motor bulma
- Hızlı Servis, Bırakılan Motor ve Randevulu Servis veri tipi
- Günlük atölye sırası
- Ayrıntılı servis durumları
- Net fiyat ve tahmini fiyat
- Tamire başlamadan önce zorunlu ücret kontrolü
- Nakit ve IBAN tahsilatı
- Yapılan işlemler ve kullanılan parçalar
- İşletme bazlı Supabase RLS

## v0.2 — Müşteri Hesabı ve Motor Eşleştirme

- Müşteri ve İşletme/Usta hesap türüyle kayıt
- Ayrı modern Müşteri Portalı
- Plaka + telefon ile güvenli motor eşleştirme
- Benzersiz 8 haneli servis takip kodu
- QR kod ve `draborngarage://claim` derin bağlantısı
- Usta onayı isteyen eşleştirme talebi
- İşletme tarafında talep onaylama/reddetme
- Tek işletmede otomatik giriş
- Birden fazla işletmede işletme seçimi
- İşletmeye özel motorlar ve servis geçmişi
- Aktif servis durumu ve servis zaman çizgisi
- Net/tahmini fiyat, ödenen ve kalan tutar
- Motorlarım ekranı
- Servislerim ve ayrıntılı servis ekranı
- Müşteri bağlantısı ve talep geçmişi
- Personel ve müşteri görünümü arasında geçiş
- İşletmenin iç notlarını müşteriye göstermeyen güvenli RPC katmanı

> Usta bazlı tutarlar maaş, komisyon, prim, net kâr veya ortaklık payı değildir. Sistem yalnızca hangi ustanın hangi işlem için ne kadar tutar kaydettiğini tutar.

## Çalıştırma

```bash
cp .env.example .env
npm install --no-audit --no-fund
npx expo start -c --go
```

Termux için yalnız ZIP kullanan kopyala-yapıştır kurulum: [`docs/TERMUX_INSTALL.md`](docs/TERMUX_INSTALL.md)

## Kontroller

```bash
npm run typecheck
npm run test:bundle
```

## Proje belgeleri

- [`docs/V0.1_CHECKLIST.md`](docs/V0.1_CHECKLIST.md) — v0.1 çekirdek kontrol listesi
- [`docs/V0.2_CHECKLIST.md`](docs/V0.2_CHECKLIST.md) — müşteri hesabı ve güvenli motor eşleştirme kontrol listesi
- [`docs/DEMO_TEST.md`](docs/DEMO_TEST.md) — çok işletmeli test verisi akışı
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — yalnız v0.1–v1.0 onaylı mobil plan
- [`supabase/migrations`](supabase/migrations) — tekrar kurulabilir şema, RPC, RLS ve demo migration’ları

APK/AAB üretimi v1.0 aşamasındadır. Tam web sürümü v1.0 sonrasında yalnızca opsiyonel olarak değerlendirilecektir.
