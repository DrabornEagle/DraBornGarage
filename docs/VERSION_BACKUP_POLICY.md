# DraBornGarage — Zorunlu Sürüm Yedekleme ve Geri Alma Politikası

Bu politika v0.3 ile birlikte yürürlüğe girmiştir. Bundan sonraki hiçbir sürüme, mevcut sürümün geri dönüş noktası oluşturulmadan başlanmaz.

## Her yeni sürümden önce zorunlu sıra

1. Mevcut `main` dalı için sabit bir yedek dalı oluşturulur.
2. Dal adı `backup/vESKI_SURUM-before-vYENI_SURUM` biçimindedir.
3. Supabase şema değişiklikleri başlamadan önce mevcut veritabanı yapısı not edilir.
4. Yeni sürüm migration dosyaları `supabase/migrations/` altında saklanır.
5. Aynı sürüm için tersine migration dosyası `supabase/rollbacks/` altında oluşturulur.
6. `package.json` ve `app.json` sürüm numarası ancak yedek oluşturulduktan sonra yükseltilir.
7. TypeScript ve Android bundle testleri başarıyla tamamlanmadan sürüm kapatılmaz.
8. Kullanıcıya hem güncelleme hem de uygulama kodunu geri alma komutu verilir.

## v0.3 için oluşturulan geri dönüş noktası

- Önceki sürüm: `v0.2.0`
- Yeni sürüm: `v0.3.0`
- GitHub yedek dalı: `backup/v0.2.0-before-v0.3`
- Veritabanı geri alma dosyası: `supabase/rollbacks/rollback_v0_3_to_v0_2.sql`

## Önemli ayrım

GitHub yedek dalı uygulama kodunu geri alır. Supabase rollback dosyası ise v0.3 ile eklenen randevu tablolarını, fonksiyonlarını ve kolonlarını kaldırarak veritabanını v0.2 yapısına döndürür. Uygulama ve veritabanı geri dönüşü birlikte uygulanmalıdır.

## Veri güvenliği

Rollback, v0.3 randevu kayıtlarını siler. Gerçek ortamda rollback çalıştırılmadan önce Supabase Dashboard üzerinden ayrıca veritabanı yedeği alınmalıdır. Servis, müşteri, motor, ödeme ve v0.2 eşleştirme kayıtlarına dokunulmaz.
