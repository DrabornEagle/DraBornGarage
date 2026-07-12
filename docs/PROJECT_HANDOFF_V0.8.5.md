# DraBornGarage — v0.8.5 Devam Dosyası

**Güncel sürüm:** `v0.8.5`  
**Önceki sabit yedek:** `backup/v0.8.4-before-v0.8.5`  
**Sonraki ana sürüm:** `v0.9.0`

## Tamamlanan kapsam
- İşletme paneli ve Usta paneli ayrı sekmeler olarak yeniden sıralandı.
- İş emri oluşturma yalnız aktif Usta rollerinde kullanılabilir.
- Usta/Çırak başvurusu, işletme onayı ve Realtime panel açılışı eklendi.
- Personel davet kodu müşteri hesabına eklendi.
- 3D animasyonlu motosiklet simgesi ve okunabilirlik iyileştirmeleri tamamlandı.

## Veritabanı
- Migration: `supabase/migrations/20260712234000_v0_8_5_staff_applications.sql`
- Rollback: `supabase/rollbacks/20260712234000_v0_8_5_staff_applications_rollback.sql`
- Kullanıcı ve operasyon verisi temizliği şema rollback işleminden ayrıdır ve geri döndürülemez.
