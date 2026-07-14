# DraBornGarage v0.9.6 — Servis Akışı, Fiyat ve Bildirim Düzeltmeleri

**Tarih:** 14 Temmuz 2026

## Düzeltmeler

- Usta Panelindeki günlük Hazır/Tamam sayacı servis değişikliklerinde canlı yenilenir.
- Hemen Başla seçildiğinde net veya tahmini fiyat zorunlu değildir.
- Tahmini fiyat müşteriye fiyat aralığı olarak gösterilir; sıfır toplam ödeme tamamlandı sayılmaz.
- Motor teslim edilmeden önce son net fiyat veya işlem tutarı zorunludur.
- İşletme araması sonuçsuz kaldığında modern bilgi kartı gösterilir.
- Bildirimler en yeni kayıt üstte olacak şekilde sıralanır.
- Bildirim kartında arşivin yanında kalıcı silme aksiyonu bulunur.
- Gizlilik kalkanı Servislerim liste ekranında kalır, motosiklet servis detayında görünmez.

## Canlı veritabanı

Migration: `20260714164000_v0_9_6_pricing_notifications_and_delivery_guard.sql`

- `notification_delete(uuid)` eklendi.
- Bildirim sıralaması tarih öncelikli yapıldı.
- Tamire fiyat girmeden başlanmasına izin verildi.
- Sıfır toplamlı servislerin teslim edilmesi engellendi.

## Sürüm

- Uygulama: 0.9.6
- Android versionCode: 15
- iOS buildNumber: 15
- Yedek: `backup/v0.9.5-before-v0.9.6-20260714`
