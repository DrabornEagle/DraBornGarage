# DraBornGarage — Zorunlu Sürüm, Yedekleme ve Geri Alma Politikası

Bu politika v0.3.1 ile güncellenmiştir. Bundan sonra hiçbir değişiklik sürüm numarası artırılmadan tamamlanmaz ve hiçbir yeni sürüme mevcut sürümün geri dönüş noktası oluşturulmadan başlanmaz.

## Sürüm numarası kuralı

DraBornGarage sürümleri her zaman üç parçalı yazılır:

`vANA.AŞAMA.GÜNCELLEME`

Örnekler:

- `v0.3.0` — v0.3 aşamasının ilk tam sürümü
- `v0.3.1` — v0.3 üzerine gelen ilk güncelleme
- `v0.3.2` — v0.3 üzerine gelen ikinci güncelleme
- `v0.4.0` — yol haritasındaki v0.4 aşamasına geçiş

### Artırma yöntemi

- Aynı yol haritası aşamasında eklenen özellik, hata düzeltmesi, arayüz değişikliği, güvenlik düzenlemesi veya belge/kurulum değişikliği son haneyi artırır.
- `v0.3.1` sonrasında yapılacak bir sonraki değişiklik `v0.3.2` olur.
- Yol haritasında yeni aşamaya geçildiğinde sürüm örneğin `v0.4.0` olur.
- Sürüm numarası `package.json`, `app.json`, uygulama Ayarlar ekranı, README, kurulum belgesi ve değişiklik kaydında aynı olmalıdır.

## Her yeni sürümden önce zorunlu sıra

1. Henüz hiçbir kod veya belge değiştirilmeden mevcut `main` dalı için sabit yedek oluşturulur.
2. Dal adı tam sürüm numaralarıyla `backup/vMEVCUT-before-vYENI` biçiminde yazılır.
3. Örnek: `backup/v0.3.1-before-v0.3.2`.
4. Kurulum komutunda **Kurulan sürüm** ve **Yedeklenen mevcut sürüm** açıkça yazılır.
5. Geri alma komutunda **Geri dönülen sürüm** ve **Geri alma öncesi yedeklenen sürüm** açıkça yazılır.
6. Supabase şema değişikliği varsa migration `supabase/migrations/` altında saklanır.
7. Her sürüm için rollback dosyası `supabase/rollbacks/` altında oluşturulur. Veritabanı değişikliği yoksa dosyada bunun bir no-op rollback olduğu açıkça belirtilir.
8. `package.json` ve `app.json` ancak yedek oluşturulduktan sonra yükseltilir.
9. TypeScript ve Android bundle testleri başarıyla tamamlanmadan sürüm kapatılmaz.
10. Kullanıcıya güncel kurulum komutu ve bir önceki tam sürüme geri alma komutu birlikte verilir.

## v0.3.1 için oluşturulan geri dönüş noktası

- Yedeklenen sürüm: `v0.3.0`
- Kurulan yeni sürüm: `v0.3.1`
- GitHub yedek dalı: `backup/v0.3.0-before-v0.3.1`
- Veritabanı rollback dosyası: `supabase/rollbacks/rollback_v0_3_1_to_v0_3_0.sql`
- Bu güncellemede veritabanı şeması değişmediği için veritabanı rollback dosyası no-op’tur.

## Önceki v0.3 geri dönüş noktası

- Yedeklenen sürüm: `v0.2.0`
- Kurulan sürüm: `v0.3.0`
- GitHub yedek dalı: `backup/v0.2.0-before-v0.3`
- Veritabanı rollback dosyası: `supabase/rollbacks/rollback_v0_3_to_v0_2.sql`

## Uygulama ve veritabanı ayrımı

GitHub yedek dalı uygulama kodunu geri alır. Supabase rollback dosyası yalnız ilgili sürümde yapılan veritabanı değişikliklerini geri alır. Veritabanı değişikliği bulunan sürümlerde uygulama ve veritabanı geri dönüşü birlikte uygulanmalıdır.

## Veri güvenliği

Veri silen bir rollback çalıştırılmadan önce Supabase Dashboard üzerinden ayrıca gerçek veritabanı yedeği alınmalıdır. Rollback dosyasının hangi sürümü hangi sürüme döndürdüğü dosya adında ve dosya açıklamasında açıkça yazılmalıdır.
