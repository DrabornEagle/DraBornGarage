# DraBornGarage — Zorunlu Sürüm, Yedekleme ve Geri Alma Politikası

Bu politika v0.3.1 ile yürürlüğe girmiştir; v0.4.0, v0.4.1, v0.5.0, v0.6.0, v0.7.0 ve v0.8.0 geçişlerinde uygulanmıştır. Hiçbir değişiklik sürüm numarası artırılmadan tamamlanmaz ve hiçbir yeni sürüme mevcut sürümün geri dönüş noktası oluşturulmadan başlanmaz.

## Sürüm numarası kuralı

DraBornGarage sürümleri her zaman üç parçalı yazılır:

`vANA.AŞAMA.GÜNCELLEME`

- `v0.7.0` — yol haritasındaki v0.7 ana aşaması
- `v0.7.1` — v0.7 üzerine gelebilecek küçük güncelleme
- `v0.8.0` — yol haritasındaki v0.8 ana aşaması
- `v0.8.1` — v0.8 üzerine gelecek ilk küçük güncelleme

### Artırma yöntemi

- Aynı yol haritası aşamasındaki özellik, hata düzeltmesi, arayüz, güvenlik, veritabanı veya belge değişikliği son haneyi artırır.
- `v0.8.0` sonrasında yapılacak ilk küçük değişiklik `v0.8.1` olur.
- Yol haritasındaki bir sonraki ana aşamaya geçildiğinde sürüm `v0.9.0` olur.
- Sürüm numarası `package.json`, `package-lock.json`, `app.json`, Ayarlar, giriş ekranı, README, kurulum belgesi ve değişiklik kaydında aynı olmalıdır.

## Her yeni sürümden önce zorunlu sıra

1. Kod, belge veya Supabase şeması değiştirilmeden mevcut `main` dalı için sabit yedek oluşturulur.
2. Dal adı `backup/vMEVCUT-before-vYENI` biçimindedir.
3. Kurulum komutunda **Kurulan sürüm** ve **Yedeklenen mevcut sürüm** yazılır.
4. Geri alma komutunda **Geri dönülen sürüm** ve **Geri alma öncesi korunan sürüm** yazılır.
5. Supabase değişikliği varsa migration dosyaları `supabase/migrations/` altında tutulur.
6. Her sürüm için `supabase/rollbacks/` altında rollback dosyası oluşturulur.
7. `package.json`, `package-lock.json` ve `app.json` ancak yedek oluşturulduktan sonra yükseltilir.
8. TypeScript ve Android JavaScript bundle testleri geçmeden sürüm kapatılmaz.
9. Veritabanı değişikliği bulunan sürümlerde rollback transaction testi yapılır.
10. Kullanıcıya güncel ZIP kurulum ve bir önceki sürüme geri alma komutları birlikte verilir.

## v0.8.0 geri dönüş noktası

- Yedeklenen sürüm: `v0.7.0`
- Kurulan yeni sürüm: `v0.8.0`
- GitHub yedek dalı: `backup/v0.7.0-before-v0.8.0`
- Veritabanı rollback: `supabase/rollbacks/rollback_v0_8_0_to_v0_7_0.sql`
- Rollback; v0.8 bildirim geçmişini ve kullanıcı bildirim tercihlerini kaldırır.
- Servis, ek işlem, randevu, müşteri eşleştirme ve platform bildirim trigger’larını kaldırır.
- Randevu, borç/alacak ve platform zamanlı hatırlatma fonksiyonlarını kaldırır.
- Bildirim tablosunu Supabase Realtime yayınından çıkarır.
- Uygulama içi bildirim RPC’lerini kaldırır.
- v0.7 müşteri, motor, servis, randevu, ek işlem, ödeme, alacak, rapor ve platform hizmet bedeli kayıtlarını korur.
- Bildirim geçmişi silineceği için gerçek veritabanında rollback öncesi yedek zorunludur.

## Önceki geri dönüş noktaları

### v0.7.0

- Yedeklenen sürüm: `v0.6.0`
- Kurulan sürüm: `v0.7.0`
- GitHub yedek dalı: `backup/v0.6.0-before-v0.7.0`
- Veritabanı rollback: `supabase/rollbacks/rollback_v0_7_0_to_v0_6_0.sql`
- Platform ücret, dönem, ödeme bildirimi, dağıtım ve dekont erişim yapılarını kaldırır; v0.6 verilerini korur.

### v0.6.0

- Yedeklenen sürüm: `v0.5.0`
- Kurulan sürüm: `v0.6.0`
- GitHub yedek dalı: `backup/v0.5.0-before-v0.6.0`
- Veritabanı rollback: `supabase/rollbacks/rollback_v0_6_0_to_v0_5_0.sql`
- Kişisel Usta ve işletme rapor RPC’lerini kaldırır; temel iş verisini korur.

### v0.5.0

- Yedeklenen sürüm: `v0.4.1`
- Kurulan sürüm: `v0.5.0`
- GitHub yedek dalı: `backup/v0.4.1-before-v0.5.0`
- Veritabanı rollback: `supabase/rollbacks/rollback_v0_5_0_to_v0_4_1.sql`
- Alacak notlarını, hareket geçmişini ve borç meta verilerini kaldırır.

### v0.4.1

- Yedeklenen sürüm: `v0.4.0`
- Kurulan sürüm: `v0.4.1`
- GitHub yedek dalı: `backup/v0.4.0-before-v0.4.1-customer-panel-fix`
- Veritabanı rollback: `supabase/rollbacks/rollback_v0_4_1_to_v0_4_0.sql`

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

## Uygulama ve veritabanı ayrımı

GitHub yedek dalı uygulama kodunu geri alır. Supabase rollback dosyası veritabanındaki sürüme özel fonksiyon, tablo, trigger, politika, publication kaydı ve indeksleri geri alır. v0.8.0 geri alınırken uygulama kodu ve Supabase bildirim şeması birlikte v0.7.0’a döndürülmelidir.

Telefonun işletim sisteminde planlanan yerel bildirimler veritabanı rollback’iyle otomatik silinmez. v0.7.0 uygulaması açıldığında v0.8 uygulama kodu artık çalışmayacağı için bu planlar yeniden oluşturulmaz; geri alma öncesinde uygulamadan çıkış yapmak veya DraBornGarage bildirimlerini telefon ayarlarından temizlemek önerilir.

## Veri güvenliği

Veri silen rollback çalıştırılmadan önce Supabase Dashboard üzerinden gerçek veritabanı yedeği alınmalıdır. v0.8.0 rollback müşteri, motor, servis, randevu, ödeme, alacak, rapor veya platform bedeli satırlarını silmez; ancak kullanıcı bildirim geçmişi ve bildirim tercihlerini kaldırır. Yayın veya gerçek işletme veritabanında her rollback öncesi yedek zorunludur.
