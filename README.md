# DraBornGarage

Motosiklet ve oto tamir işletmeleri için çok işletmeli, rol tabanlı servis, müşteri, randevu, ek işlem onayı, alacak, raporlama, platform hizmet bedeli ve bildirim sistemi.

## Güncel sürüm

**v0.9.0 — Google Play Uyum, Test ve Pilot**

v0.9.0; uygulama içi gizlilik ve hesap silme merkezini, hesap silme talep altyapısını, güçlü parola kontrolünü, rol erişim denetimini, gereksiz Android izin engellerini, pilot test paketini ve Google Play kapalı test belgelerini tamamlar.

## v0.9.0 ile tamamlananlar

- Uygulamadaki bütün oturum açmış roller için Gizlilik ve Hesap merkezi
- Hesap silme talebi oluşturma, durum görüntüleme ve iptal etme
- Admin silme talepleri listeleme ve durum güncelleme RPC'leri
- RLS korumalı `account_deletion_requests` tablosu
- Güçlü parola: en az 10 karakter, karmaşıklık ve yaygın/sızdırılmış parola engeli
- Anonim erişime açık hassas `SECURITY DEFINER` yardımcılarının kapatılması
- Oturum bazlı rol erişim denetimi
- Kamera, fotoğraf ve bildirim izinlerinin amaçla sınırlandırılması
- Konum, mikrofon, rehber, SMS ve arama izinlerinin Android'de engellenmesi
- Hızlı servis, randevu, alacak, platform ve bildirim için pilot test merkezi
- TypeScript ve Android bundle GitHub Actions kalite kapısı
- Gizlilik politikası, hesap silme sayfası ve Play Veri Güvenliği taslağı
- Türkçe Google Play mağaza metinleri ve kapalı test planı
- v0.8.16 kod yedeği ve v0.9 veritabanı rollback dosyası

## Ana modüller

### Çok İşletmeli Çekirdek

- Admin, İşletme Sahibi, İşletme Sahibi + Usta, Usta, Çırak ve Müşteri rolleri
- Çok işletmeli güvenli veri ayrımı
- Müşteri, motosiklet ve servis kayıtları
- Hızlı Servis, Bırakılan Motor ve Randevulu Servis
- Günlük atölye sırası
- Net/tahmini fiyat, Nakit/IBAN tahsilatı
- Yapılan işlemler ve kullanılan parçalar

### Müşteri Hesabı ve Motor Eşleştirme

- Ayrı Müşteri Portalı
- Plaka + telefon, servis takip kodu, QR ve Usta onayı
- Motorlarım ve Servislerim
- Çok işletmeli müşteri seçimi

### Randevu ve Usta Takvimi

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
- Banka/IBAN bilgileri
- Opsiyonel private dekont yükleme

### Bildirimler

- Personel ve müşteri panelinde bildirim merkezi
- Okunmamış sayı rozeti ve telefon uygulama rozeti
- Bildirimden ilgili ekrana yönlendirme
- Servis, ek işlem, randevu, alacak ve platform bildirimleri
- 24 saat ve 2 saat randevu hatırlatmaları
- Kullanıcıya özel bildirim tercihleri
- Expo yerel telefon bildirimleri
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

## Yedek ve geri dönüş

- **Kurulan sürüm:** `v0.9.0`
- **Yedeklenen sürüm:** `v0.8.16`
- **Kod yedeği:** `backup/v0.8.16-before-v0.9-20260714`
- **Veritabanı migration:** [`supabase/migrations/20260714002755_v0_9_privacy_account_deletion_security.sql`](supabase/migrations/20260714002755_v0_9_privacy_account_deletion_security.sql)
- **Veritabanı rollback:** [`supabase/rollbacks/rollback_v0_9_0_to_v0_8_16.sql`](supabase/rollbacks/rollback_v0_9_0_to_v0_8_16.sql)
- **Termux kurulumu:** [`docs/TERMUX_INSTALL.md`](docs/TERMUX_INSTALL.md)

## v0.9 belgeleri

- [`docs/V0.9_CHECKLIST.md`](docs/V0.9_CHECKLIST.md)
- [`docs/V0.9_PILOT_TEST_CHECKLIST.md`](docs/V0.9_PILOT_TEST_CHECKLIST.md)
- [`docs/V0.9_ROLE_ACCESS_AUDIT.md`](docs/V0.9_ROLE_ACCESS_AUDIT.md)
- [`docs/PRIVACY_POLICY.md`](docs/PRIVACY_POLICY.md)
- [`docs/ACCOUNT_DELETION.md`](docs/ACCOUNT_DELETION.md)
- [`docs/GOOGLE_PLAY_DATA_SAFETY.md`](docs/GOOGLE_PLAY_DATA_SAFETY.md)
- [`docs/GOOGLE_PLAY_LISTING_TR.md`](docs/GOOGLE_PLAY_LISTING_TR.md)
- [`docs/GOOGLE_PLAY_CLOSED_TEST.md`](docs/GOOGLE_PLAY_CLOSED_TEST.md)
- [`docs/CHANGELOG_V0.9.0.md`](docs/CHANGELOG_V0.9.0.md)
- [`docs/ROADMAP.md`](docs/ROADMAP.md)

v0.9 kapalı test ve pilot sürümüdür. AAB üretimi ve Play Console'a fiili yükleme v1.0 yayın adımıdır.
