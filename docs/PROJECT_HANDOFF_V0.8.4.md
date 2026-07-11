# DraBornGarage — v0.8.4 Devam Dosyası

**Son güncelleme:** 12 Temmuz 2026  
**Güncel sürüm:** `v0.8.4`  
**GitHub:** `DrabornEagle/DraBornGarage`  
**Supabase:** `xpdiwyxnnrmyvpcqwuyb`  
**Önceki sabit yedek:** `backup/v0.8.3-before-v0.8.4`  
**Sonraki ana sürüm:** `v0.9.0`

## Tamamlanan kapsam
- İşletme başvuru formunda işletme adı, telefon, adres, Vergi Dairesi ve Vergi Numarası.
- İşletme başvurusu yapan hesabın Admin onayına kadar normal müşteri hesabı olarak başlaması.
- Müşteri panelinde “İşletme başvurunuz inceleniyor” veya ret sonucu kartı.
- Admin başvuru onayı/reddi; onayda işletme ile `İşletme Sahibi + Usta` üyeliğinin otomatik oluşturulması.
- `draborneagle@gmail.com` adresiyle açılan hesabın kayıt tetikleyicisinde otomatik Admin yapılması.
- Yeni müşteri randevularının randevu gününe girilmeden animasyonlu dikkat kartında gösterilmesi.
- Ana Takvimde yalnız bugün ve gelecek günler; geçmiş randevuların gün bazlı açılır arşivde tutulması.
- Randevu Realtime değişikliklerinin Takvim ekranını otomatik yenilemesi.
- İş emri detaylarının modern açılır/kapanır ana kategorilere ayrılması.
- Küçük metinlerin okunabilirliğinin artırılması.
- Bisiklet görünümlü simgelerin modern ve animasyonlu motosiklet simgesiyle değiştirilmesi.

## Güvenlik kararları
- İşletme başvurusu tek başına işletme/personel paneli açmaz.
- `set_profile_account_mode('staff')`, Admin olmayan ve aktif işletme üyeliği bulunmayan kullanıcıyı reddeder.
- İşletme oluşturma yalnız Admin yetkisiyle yapılabilir.
- Başvuru inceleme RPC'leri kendi içinde Admin yetkisini doğrular.
- Başvuru tablosunda kullanıcı yalnız kendi başvurusunu, Admin ise bütün başvuruları görebilir.
- Yeni RPC'lerde anonim çalıştırma yetkisi yoktur.

## Veritabanı ve doğrulama
- Uygulanan migration: `20260711230640_v0_8_4_business_approval`.
- Uygulanan Realtime migration: `20260711230648_v0_8_4_business_application_realtime`.
- Yetkisiz bekleyen başvuru sahibinin personel moduna geçişi veritabanında engellendi.
- Admin onayı; işletme oluşturma, `owner_mechanic` üyeliği, başvuru onayı ve profilin personel moduna geçirilmesiyle transaction içinde uçtan uca test edildi.
- Transaction testi `ROLLBACK` ile geri alındı.
- TypeScript ve Android JavaScript bundle kontrolleri başarılıdır.

## Temiz başlangıç
- Önce mevcut işletmeler silindi; ilişkili randevu, servis, müşteri, motosiklet, bildirim, platform dönemleri ve diğer işletme verileri foreign-key cascade ile temizlendi.
- Ardından mevcut üç Auth kullanıcısı silindi.
- Doğrulama sonucu: `auth.users`, `profiles`, `workshops`, `workshop_members`, `customers`, `motorcycles`, `appointments`, `work_orders`, `business_applications` ve `user_notifications` tablolarında kayıt sayısı `0`.
- Sistemsel tek `platform_global_settings` kaydı korundu; eski kullanıcı bağlantısı `NULL` oldu.
- Sıradaki ilk hesap `draborneagle@gmail.com` ile kullanıcı tarafından açılmalıdır; bu hesap otomatik Admin olur.

## Sürüm, kurulum ve geri alma
- Kurulan sürüm: `v0.8.4`
- Yerel kurulum öncesi yedek: `DraBornGarage-v0.8.3-local-backup`
- Sabit kod yedeği: `backup/v0.8.3-before-v0.8.4`
- Ana migration: `supabase/migrations/20260712220000_v0_8_4_business_approval.sql`
- Realtime migration: `supabase/migrations/20260712221000_v0_8_4_business_application_realtime.sql`
- Şema rollback: `supabase/rollbacks/20260712220000_v0_8_4_business_approval_rollback.sql`
- Realtime rollback: `supabase/rollbacks/20260712221000_v0_8_4_business_application_realtime_rollback.sql`
- Silinen kullanıcı ve operasyonel kayıtlar rollback SQL'iyle geri getirilemez.
- Termux komutu: `docs/TERMUX_INSTALL.md`

## Sonraki adım
`v0.9.0 — Google Play Uyum, Test ve Pilot` aşamasına geçilir.
