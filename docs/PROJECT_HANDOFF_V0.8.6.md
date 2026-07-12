# DraBornGarage — v0.8.6 Devam Dosyası

**Güncel sürüm:** `v0.8.6`  
**Önceki sabit yedek:** `backup/v0.8.5-before-v0.8.6-20260712`  
**Sonraki ana sürüm:** `v0.9.0`

## Tamamlanan kapsam
- Eski WorkshopSetup ara ekranı normal kullanıcı akışından çıkarıldı.
- Motor eşleştirmede işletme arama ve seçili işletmeye Usta onay talebi.
- İşletme bağlantısı olmadan işletme/Usta/tarih/saat seçerek randevu oluşturma.
- İşletme ve Usta takviminde mevcut onay akışının korunması.
- QR taramaya ek manuel takip/eşleştirme kodu alanı.
- Kullanıcının bütün işletmelerdeki randevularını tek listede görmesi.

## Veritabanı
- Migration: `supabase/migrations/20260712160000_v0_8_6_customer_discovery_booking.sql`
- Rollback: `supabase/rollbacks/20260712160000_v0_8_6_customer_discovery_booking_rollback.sql`

## Kurulum
- Yerel yedek: `DraBornGarage-v0.8.5-local-backup`
- Termux komutu: `docs/TERMUX_INSTALL.md`
