# DraBornGarage — v0.8.4 Devam Dosyası

**Güncel sürüm:** `v0.8.4`  
**Önceki sabit yedek:** `backup/v0.8.3-before-v0.8.4`  
**Sonraki ana sürüm:** `v0.9.0`

## Tamamlanan kapsam
- İşletme üyeliği kayıt formunda işletme adı, adres, telefon, Vergi Dairesi ve Vergi Numarası.
- İşletme başvurusunun müşteri hesabı olarak başlaması.
- Müşteri panelinde “İşletme başvurunuz inceleniyor” bilgisi.
- Admin başvuru onayı/reddi; onayda işletme ve İşletme Sahibi + Usta üyeliğinin otomatik açılması.
- `draborneagle@gmail.com` hesabının kayıt sırasında otomatik Admin olması.
- Yeni müşteri randevularının Takvim gününe girilmeden animasyonlu uyarıyla görünmesi.
- Ana Takvimde yalnız bugün ve gelecek günler; geçmiş randevular için ayrı açılır geçmiş alanı.
- İş emri detaylarının modern açılır/kapanır ana kategorilere ayrılması.
- Daha okunaklı küçük metinler ve modern animasyonlu motosiklet ikonu.

## Veritabanı
- Migration: `supabase/migrations/20260712220000_v0_8_4_business_approval.sql`
- Rollback: `supabase/rollbacks/20260712220000_v0_8_4_business_approval_rollback.sql`
- Kullanıcı ve test verisi temizliği şemadan ayrı, geri döndürülemez bir yönetim işlemi olarak uygulanmıştır.
