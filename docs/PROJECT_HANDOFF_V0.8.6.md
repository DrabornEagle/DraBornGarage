# DraBornGarage — v0.8.6 Devam Dosyası

**Son güncelleme:** 12 Temmuz 2026  
**Güncel sürüm:** `v0.8.6`  
**GitHub:** `DrabornEagle/DraBornGarage`  
**Supabase:** `xpdiwyxnnrmyvpcqwuyb`  
**Önceki sabit yedek:** `backup/v0.8.5-before-v0.8.6-20260712`  
**Sonraki ana sürüm:** `v0.9.0`

## Tamamlanan kapsam
- Eski `WorkshopSetupScreen` ara ekranı normal kullanıcı akışından çıkarıldı.
- Admin veya aktif işletme üyeliği bulunmayan kullanıcı doğrudan müşteri paneline açılır.
- Motor eşleştirmede işletme adına göre arama, işletme seçimi ve seçili işletmeye Usta onay talebi.
- İşletmede müşteri/motor kaydı bulunmasa bile talebin görünmesi; onayda kayıtların ve güvenli bağlantının oluşturulması.
- İşletme bağlantısı olmadan işletme, Usta, tarih ve müsait saat seçerek randevu oluşturma.
- Randevunun işletme/Usta takvimine düşmesi ve mevcut Usta onay akışının korunması.
- Kullanıcının farklı işletmelerdeki bütün randevularını tek ekranda görmesi ve uygun randevuyu iptal edebilmesi.
- QR taramaya ek manuel servis/eşleştirme kodu alanı.
- Manuel alanda QR bağlantısı, UUID eşleştirme anahtarı veya 8 haneli servis takip kodunun kabul edilmesi.

## Veritabanı ve güvenlik
- Uygulanan migration: `v0_8_6_customer_discovery_booking`.
- Migration: `supabase/migrations/20260712160000_v0_8_6_customer_discovery_booking.sql`.
- Rollback: `supabase/rollbacks/20260712160000_v0_8_6_customer_discovery_booking_rollback.sql`.
- Seçili işletmeye motor bağlantı talebi, randevuya açık işletme arama, bağlantısız randevu oluşturma ve kullanıcının tüm randevularını getirme işlemleri güvenli RPC'lerle sağlandı.
- İşletme/Usta, yalnız kendi işletmesine gelen eşleştirme ve randevu taleplerini mevcut yetki denetimleriyle görür ve sonuçlandırır.

## Doğrulama
- TypeScript kontrolü başarılı.
- Android JavaScript bundle kontrolü başarılı.
- Transaction içinde şu sekiz akış uçtan uca doğrulandı: işletme arama, bağlantısız Usta listesi, seçili işletmeye motor talebi, Ustanın henüz kaydı olmayan motor talebini görmesi, onayda müşteri/motor oluşturma, onaylı bağlantı, bağlantısız randevu oluşturma ve tüm randevuları listeleme.
- Transaction testleri `ROLLBACK` ile geri alındı.
- 8 haneli gerçek servis takip kodunun manuel kod alanı üzerinden motor eşleştirmesi yaptığı ayrıca doğrulandı ve test işlemi geri alındı.

## Kurulum ve geri alma
- Kurulan sürüm: `v0.8.6`.
- Yerel yedek: `DraBornGarage-v0.8.5-local-backup`.
- Sabit kod yedeği: `backup/v0.8.5-before-v0.8.6-20260712`.
- Termux komutu: `docs/TERMUX_INSTALL.md`.

## Sonraki adım
`v0.9.0 — Google Play Uyum, Test ve Pilot` aşamasına geçilir.
