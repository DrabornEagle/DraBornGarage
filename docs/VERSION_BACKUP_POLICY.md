# DraBornGarage — Zorunlu Sürüm, Yedekleme ve Geri Alma Politikası

Bu politika v0.3.1 ile yürürlüğe girmiştir; v0.4.0, v0.4.1 ve v0.5.0 geçişlerinde uygulanmıştır. Hiçbir değişiklik sürüm numarası artırılmadan tamamlanmaz ve hiçbir yeni sürüme mevcut sürümün geri dönüş noktası oluşturulmadan başlanmaz.

## Sürüm numarası kuralı

DraBornGarage sürümleri her zaman üç parçalı yazılır:

`vANA.AŞAMA.GÜNCELLEME`

- `v0.4.0` — yol haritasındaki v0.4 ana aşaması
- `v0.4.1` — v0.4 üzerine gelen küçük düzeltme
- `v0.5.0` — yol haritasındaki v0.5 ana aşaması
- `v0.5.1` — v0.5 üzerine gelecek ilk küçük güncelleme

### Artırma yöntemi

- Aynı yol haritası aşamasındaki özellik, hata düzeltmesi, arayüz, güvenlik, veritabanı veya belge değişikliği son haneyi artırır.
- `v0.5.0` sonrasında yapılacak ilk değişiklik `v0.5.1` olur.
- Yol haritasındaki bir sonraki ana aşamaya geçildiğinde sürüm `v0.6.0` olur.
- Sürüm numarası `package.json`, `app.json`, Ayarlar, giriş ekranı, README, kurulum belgesi ve değişiklik kaydında aynı olmalıdır.

## Her yeni sürümden önce zorunlu sıra

1. Kod, belge veya Supabase şeması değiştirilmeden mevcut `main` dalı için sabit yedek oluşturulur.
2. Dal adı `backup/vMEVCUT-before-vYENI` biçimindedir.
3. Kurulum komutunda **Kurulan sürüm** ve **Yedeklenen mevcut sürüm** yazılır.
4. Geri alma komutunda **Geri dönülen sürüm** ve **Geri alma öncesi korunan sürüm** yazılır.
5. Supabase değişikliği varsa migration dosyaları `supabase/migrations/` altında tutulur.
6. Her sürüm için `supabase/rollbacks/` altında rollback dosyası oluşturulur.
7. `package.json` ve `app.json` ancak yedek oluşturulduktan sonra yükseltilir.
8. TypeScript ve Android JavaScript bundle testleri geçmeden sürüm kapatılmaz.
9. Veritabanı değişikliği bulunan sürümlerde rollback transaction testi yapılır.
10. Kullanıcıya güncel ZIP kurulum ve bir önceki sürüme geri alma komutları birlikte verilir.

## v0.5.0 geri dönüş noktası

- Yedeklenen sürüm: `v0.4.1`
- Kurulan yeni sürüm: `v0.5.0`
- GitHub yedek dalı: `backup/v0.4.1-before-v0.5.0`
- Veritabanı rollback: `supabase/rollbacks/rollback_v0_5_0_to_v0_4_1.sql`
- Rollback; v0.5 alacak notlarını, alacak hareketlerini ve borç meta verilerini kaldırır.
- Temel müşteri, motosiklet, servis, randevu, ek işlem ve mevcut ödeme satırlarını korur.
- `payments.collection_source` kaldırılır fakat ödeme kayıtları silinmez.

## Önceki geri dönüş noktaları

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

GitHub yedek dalı uygulama kodunu geri alır. Supabase rollback dosyası veritabanını önceki sürüm yapısına döndürür. v0.5.0 geri alınırken hem uygulama kodu hem Supabase şeması birlikte geri alınmalıdır.

## Veri güvenliği

Veri silen rollback çalıştırılmadan önce Supabase Dashboard üzerinden gerçek veritabanı yedeği alınmalıdır. v0.5.0 rollback işlemi alacak notlarını, hareket geçmişini, söz tarihlerini ve borç durumlarını kaldırır. Temel servisler ve tahsilat satırları korunur; fakat v0.5’e özel alacak sınıflandırması kaybolur.
