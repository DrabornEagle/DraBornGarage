# DraBornGarage — v0.8.5 Devam Dosyası

**Son güncelleme:** 12 Temmuz 2026  
**Güncel sürüm:** `v0.8.5`  
**GitHub:** `DrabornEagle/DraBornGarage`  
**Supabase:** `xpdiwyxnnrmyvpcqwuyb`  
**Önceki sabit yedek:** `backup/v0.8.4-before-v0.8.5-20260712`  
**Sonraki ana sürüm:** `v0.9.0`

## Tamamlanan kapsam
- Yeni kayıtta **Usta Adayı** hesap seçeneği.
- İşletme adına göre arama ve işletmeye Usta başvurusu gönderme.
- İşletme sahibi veya Admin tarafından Usta başvurusunu onaylama/reddetme.
- Onaylanan kullanıcıya aktif `mechanic` üyeliğinin verilmesi ve Usta panelinin otomatik açılması.
- Tek kullanımlık personel davet koduyla başvuru beklemeden Usta paneline geçiş.
- Ana sayfada **Usta Panelim** düğmesinin solda, **İşletme Panelim** düğmesinin sağda gösterilmesi.
- Hızlı Servis ve Bırakılan Motor işlemlerinin yalnız **Usta Panelim** görünümünde bulunması.
- İşler ekranındaki yeni servis düğmesinin de yalnız Usta görünümünde aktif olması.
- Bütün bisiklet ikonlarının özel SVG, modern, daha gerçekçi ve animasyonlu motosiklet simgesiyle değiştirilmesi.
- Uygulama genelindeki mikro metinlerin tasarım hiyerarşisi korunarak büyütülmesi.
- `draborneagle@gmail.com` otomatik Ana Admin kuralının korunması.

## Veritabanı ve güvenlik
- Uygulanan migration: `v0_8_5_mechanic_applications`.
- Migration dosyası: `supabase/migrations/20260712111500_v0_8_5_mechanic_applications.sql`.
- Rollback: `supabase/rollbacks/20260712111500_v0_8_5_mechanic_applications_rollback.sql`.
- `mechanic_applications` tablosu ile kullanıcı ve işletme bazlı RLS politikaları eklendi.
- İşletme arama, başvuru gönderme, kullanıcının başvurularını görme, işletmenin başvuruları görmesi ve onay/reddetmesi güvenli RPC'lerle sağlandı.
- Başvuruları yalnız ilgili kullanıcı, ilgili işletme sahibi veya Admin görebilir.
- Başvuru onayında üyelik ve profil görünümü veritabanı transaction'ı içinde birlikte güncellenir.
- `mechanic_applications`, `workshop_members` ve `profiles` Realtime yayınına eklendi.

## Uçtan uca doğrulama
Aşağıdaki sekiz veritabanı testi transaction içinde çalıştırıldı ve tamamı başarılı oldu:

1. İşletme adına göre arama.
2. Usta başvurusunun oluşturulması.
3. İlgili işletme sahibinin başvuruyu görebilmesi.
4. Başvuru onay RPC'sinin çalışması.
5. Aktif `mechanic` üyeliğinin oluşturulması.
6. Kullanıcı profilinin personel görünümüne geçirilmesi.
7. Başvurunun `approved` durumuna alınması.
8. Personel davet kodunun Usta panelini açması.

Test kayıtları `ROLLBACK` ile geri alındı. Uygulama kodu TypeScript ve Android JavaScript bundle kontrollerinden geçti.

## Temiz başlangıç
- Mevcut üç işletme, yedi müşteri, yedi motosiklet, yedi servis kaydı ve ilişkili tüm test/operasyon verileri temizlendi.
- Mevcut `draborneagle@gmail.com` Auth hesabı da silindi.
- Son doğrulamada `auth.users`, `profiles`, `workshops`, `workshop_members`, `customers`, `motorcycles`, `appointments`, `work_orders`, `business_applications`, `mechanic_applications`, `user_notifications` ve `storage.objects` kayıt sayıları `0` oldu.
- Sistemsel tek `platform_global_settings` kaydı korundu.
- Sıradaki `draborneagle@gmail.com` kaydı otomatik Ana Admin olacaktır.
- Silinen kullanıcı ve operasyonel veriler rollback dosyasıyla geri getirilemez.

## Kurulum ve geri alma
- Kurulan sürüm: `v0.8.5`.
- Termux yerel yedeği: `DraBornGarage-v0.8.4-local-backup`.
- Sabit kod yedeği: `backup/v0.8.4-before-v0.8.5-20260712`.
- Termux kurulumu: `docs/TERMUX_INSTALL.md`.

## Sonraki adım
`v0.9.0 — Google Play Uyum, Test ve Pilot` aşamasına geçilir.
