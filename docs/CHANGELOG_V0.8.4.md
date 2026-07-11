# DraBornGarage v0.8.4

Tarih: 12 Temmuz 2026

## İşletme başvurusu ve Admin onayı
- İşletme başvurusuna işletme adı, telefon, adres, Vergi Dairesi ve Vergi Numarası eklendi.
- Başvuru yapan kullanıcı Admin onayına kadar normal müşteri hesabıyla devam eder.
- Müşteri panelinde başvurunun incelendiği veya reddedildiği gösterilir.
- Admin onayında işletme ve `İşletme Sahibi + Usta` üyeliği otomatik oluşturulur.
- Onay olmadan personel moduna geçiş veritabanında engellenir.
- `draborneagle@gmail.com` ile açılan ilk hesap otomatik Admin olur.

## Takvim ve randevu
- Yeni müşteri randevuları tarihine girilmeden animasyonlu dikkat kartında görünür.
- Bekleyen müşteri randevuları Realtime ile otomatik yenilenir.
- Ana Takvim yalnız bugün ve gelecekteki günleri gösterir.
- Geçmiş randevular gün bazlı açılır arşivde korunur.

## İş emri ve arayüz
- Servis durumu, tespit/not, ücret, ek işlem, işlemler, parçalar, servis notları, hareket geçmişi ve alacak bölümleri açılır/kapanır modern kategorilere ayrıldı.
- Küçük arayüz metinleri tasarımı bozmadan büyütüldü.
- Bisiklet görünümlü ikon modern ve animasyonlu motosiklet ikonuyla değiştirildi.

## Veritabanı
- `business_applications` tablosu, RLS politikaları ve Admin RPC'leri eklendi.
- Başvuru tablosu Supabase Realtime yayınına eklendi.
- Yetki ve Admin onay akışı transaction içinde uçtan uca doğrulandı.
- Mevcut üç test kullanıcısı ile tüm işletme/operasyon test kayıtları temizlendi.
- Sistemsel `platform_global_settings` kaydı korundu.

## Sürüm ve yedek
- Sürüm: `v0.8.4`
- Kod yedeği: `backup/v0.8.3-before-v0.8.4`
- Yerel yedek klasörü: `DraBornGarage-v0.8.3-local-backup`
- Kurulum: `docs/TERMUX_INSTALL.md`
- Silinen kullanıcı ve operasyonel veriler rollback ile geri getirilemez.
