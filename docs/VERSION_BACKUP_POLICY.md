# DraBornGarage — Zorunlu Sürüm, Yedekleme ve Geri Alma Politikası

Bu politika v0.3.1 ile yürürlüğe girmiştir; v0.4.0 ve v0.4.1 geçişlerinde uygulanmıştır. Hiçbir değişiklik sürüm numarası artırılmadan tamamlanmaz ve hiçbir yeni sürüme mevcut sürümün geri dönüş noktası oluşturulmadan başlanmaz.

## Sürüm numarası kuralı

DraBornGarage sürümleri her zaman üç parçalı yazılır:

`vANA.AŞAMA.GÜNCELLEME`

Örnekler:

- `v0.3.0` — v0.3 aşamasının ilk tam sürümü
- `v0.3.1` — v0.3 üzerine gelen ilk güncelleme
- `v0.4.0` — yol haritasındaki v0.4 ana aşaması
- `v0.4.1` — v0.4 üzerine gelen müşteri paneli düzeltmesi

### Artırma yöntemi

- Aynı yol haritası aşamasındaki özellik, hata düzeltmesi, arayüz, güvenlik, veritabanı veya belge değişikliği son haneyi artırır.
- `v0.4.1` sonrasında yapılacak ilk değişiklik `v0.4.2` olur.
- Yol haritasındaki bir sonraki ana aşamaya geçildiğinde sürüm `v0.5.0` olur.
- Sürüm numarası `package.json`, `app.json`, uygulama Ayarlar ekranı, giriş ekranı, README, kurulum belgesi ve değişiklik kaydında aynı olmalıdır.

## Her yeni sürümden önce zorunlu sıra

1. Henüz hiçbir kod, belge veya Supabase şeması değiştirilmeden mevcut `main` dalı için sabit yedek oluşturulur.
2. Dal adı tam sürüm numaralarıyla `backup/vMEVCUT-before-vYENI` biçimindedir.
3. Kurulum komutunda **Kurulan sürüm** ve **Yedeklenen mevcut sürüm** açıkça yazılır.
4. Geri alma komutunda **Geri dönülen sürüm** ve **Geri alma öncesi korunan sürüm** açıkça yazılır.
5. Supabase şema değişikliği varsa migration dosyaları `supabase/migrations/` altında saklanır.
6. Her sürüm için rollback dosyası `supabase/rollbacks/` altında oluşturulur. Veritabanı değişikliği yoksa no-op rollback yazılır.
7. `package.json` ve `app.json` ancak yedek oluşturulduktan sonra yükseltilir.
8. TypeScript ve Android JavaScript bundle testleri başarıyla tamamlanmadan sürüm kapatılmaz.
9. Kullanıcıya güncel ZIP kurulum komutu ve bir önceki tam sürüme geri alma komutu birlikte verilir.

## v0.4.1 için oluşturulan geri dönüş noktası

- Yedeklenen sürüm: `v0.4.0`
- Kurulan yeni sürüm: `v0.4.1`
- GitHub yedek dalı: `backup/v0.4.0-before-v0.4.1-customer-panel-fix`
- Veritabanı rollback dosyası: `supabase/rollbacks/rollback_v0_4_1_to_v0_4_0.sql`
- Supabase değişikliği bulunmadığı için rollback no-op’tur; v0.4.0 veritabanı yapısı korunur.

## Önceki geri dönüş noktaları

### v0.4.0

- Yedeklenen sürüm: `v0.3.1`
- Kurulan sürüm: `v0.4.0`
- GitHub yedek dalı: `backup/v0.3.1-before-v0.4.0`
- Veritabanı rollback: `supabase/rollbacks/rollback_v0_4_0_to_v0_3_1.sql`

### v0.3.1

- Yedeklenen sürüm: `v0.3.0`
- Kurulan sürüm: `v0.3.1`
- GitHub yedek dalı: `backup/v0.3.0-before-v0.3.1`
- Veritabanı rollback: `supabase/rollbacks/rollback_v0_3_1_to_v0_3_0.sql`

### v0.3.0

- Yedeklenen sürüm: `v0.2.0`
- Kurulan sürüm: `v0.3.0`
- GitHub yedek dalı: `backup/v0.2.0-before-v0.3`
- Veritabanı rollback: `supabase/rollbacks/rollback_v0_3_to_v0_2.sql`

## Uygulama ve veritabanı ayrımı

GitHub yedek dalı uygulama kodunu geri alır. Supabase rollback dosyası ilgili sürümde yapılan veritabanı değişikliklerini geri alır. v0.4.1 yalnız mobil arayüz değişikliği olduğu için uygulama kodunun geri alınması yeterlidir; no-op SQL dosyası kayıt bütünlüğü için tutulur.

## Veri güvenliği

Veri silen rollback çalıştırılmadan önce Supabase Dashboard üzerinden gerçek veritabanı yedeği alınmalıdır. v0.4.1 rollback veri silmez. v0.4.0 rollback işlemi ek işlem onayları, servis hareketleri ve v0.4 servis notlarını kaldırır; müşteri, motosiklet, temel servis, ödeme, randevu ve v0.3 müşteri eşleştirme kayıtlarını korur.
