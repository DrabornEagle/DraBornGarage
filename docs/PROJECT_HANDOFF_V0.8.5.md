# DraBornGarage — v0.8.5 Devam Dosyası

**Son güncelleme:** 12 Temmuz 2026  
**Güncel sürüm:** `v0.8.5`  
**GitHub:** `DrabornEagle/DraBornGarage`  
**Supabase:** `xpdiwyxnnrmyvpcqwuyb`  
**Önceki sabit yedek:** `backup/v0.8.4-before-v0.8.5`  
**Sonraki ana sürüm:** `v0.9.0`

## Tamamlanan kapsam
- İşletme paneli ve Usta paneli ayrı sekmeler olarak yeniden sıralandı; İşletme paneli ilk sıraya alındı.
- Hızlı Servis ve Bırakılan Motor oluşturma yalnız `mechanic` ve `owner_mechanic` rollerinde kullanılabilir.
- Sadece işletme sahibi olan kullanıcı servis kaydı oluşturamaz; Usta yetkisi varsa ayrı Usta sekmesinden oluşturur.
- Motoru işletmeyle onaylı eşleşmiş kullanıcı Usta veya Çırak başvurusu gönderebilir.
- İşletme sahibi başvuruyu onayladığında personel üyeliği oluşturulur ve hesap otomatik personel görünümüne geçirilir.
- İşletmeden alınan Usta/Çırak davet kodu müşteri hesabından girilerek başvuru beklemeden personel paneli açılabilir.
- Personel başvuruları Realtime ile işletme ve kullanıcı ekranlarında güncellenir.
- Bisiklet ikonları kaynak koddan kaldırıldı.
- Katmanlı gölge, tekerlek, parlama, far ve hareket animasyonu içeren modern 3D motosiklet simgesi eklendi.
- Küçük metinler, alt menü etiketleri ve durum rozetleri büyütüldü.

## Güvenlik
- Personel başvurusu yalnız kullanıcının ilgili işletmeyle onaylı müşteri/motor bağlantısı varsa gönderilebilir.
- Yalnız ilgili işletmenin sahibi veya Admin personel başvurusunu görebilir ve sonuçlandırabilir.
- Başvurular yalnız Usta veya Çırak rolü isteyebilir; işletme sahibi rolleri bu akıştan verilemez.
- Davet kodları tek kullanımlı ve süre kontrollüdür.
- `draborneagle@gmail.com` kayıt tetikleyicisinde otomatik Admin yapılmaya devam eder.

## Veritabanı ve doğrulama
- Uygulanan migration: `v0_8_5_staff_applications`.
- Migration dosyası: `supabase/migrations/20260712234000_v0_8_5_staff_applications.sql`.
- Rollback: `supabase/rollbacks/20260712234000_v0_8_5_staff_applications_rollback.sql`.
- Usta başvurusu gönderme, işletmenin başvuruyu görmesi, onaylaması, `mechanic` üyeliği oluşturması ve hesabı personel görünümüne geçirmesi transaction içinde uçtan uca test edildi.
- Çırak davet kodu oluşturma, kodu kullanma, `apprentice` üyeliği oluşturma ve personel görünümüne geçiş transaction içinde test edildi.
- Transaction testleri `ROLLBACK` ile geri alındı.
- TypeScript ve Android JavaScript bundle kontrolleri başarılıdır.
- Kaynak kodda `bicycle` ikon adı kalmadığı otomatik kontrolle doğrulandı.

## Temiz başlangıç
- Mevcut iki işletme ve ilişkili servis, randevu, müşteri, motosiklet, ödeme, bildirim, davet ve başvuru kayıtları silindi.
- Mevcut üç Auth kullanıcısı silindi.
- Doğrulama sonucu `auth.users`, `profiles`, `workshops`, `workshop_members`, `customers`, `motorcycles`, `customer_links`, `appointments`, `work_orders`, `work_order_services`, `payments`, `business_applications`, `staff_applications`, `workshop_invites`, `user_notifications` ve `storage.objects` kayıt sayısı `0`.
- Sistemsel tek `platform_global_settings` kaydı korundu.
- İlk yeni hesap kullanıcı tarafından `draborneagle@gmail.com` ile açılmalıdır; bu hesap otomatik Admin olur.

## Sürüm ve geri alma
- Kurulan sürüm: `v0.8.5`.
- Yerel kurulum öncesi yedek: `DraBornGarage-v0.8.4-local-backup`.
- Sabit kod yedeği: `backup/v0.8.4-before-v0.8.5`.
- Silinen kullanıcı ve operasyonel kayıtlar rollback SQL'iyle geri getirilemez.
- Termux kurulum komutu: `docs/TERMUX_INSTALL.md`.

## Sonraki adım
`v0.9.0 — Google Play Uyum, Test ve Pilot` aşamasına geçilir.
