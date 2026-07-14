# DraBornGarage v0.9.7 — Bugünkü Sıra ve Motor Hazır Ücret Koruması

**Tarih:** 14 Temmuz 2026

## Düzeltilen sorunlar

- Usta Panelindeki **Bugünkü Atölye Sırası** önceki günlerin tamamlanmış işlerini de gösteriyordu.
- Bugünkü tamamlanan iş sayısı 2 olmasına rağmen listede 13 Temmuz tarihli RKS VRS kaydıyla birlikte 3 kart görünüyordu.
- Son net ücret girilmeden Motor Hazır aşamasına geçilebiliyordu.

## Yeni kurallar

- Bugünkü Atölye Sırası yalnız cihazın yerel gün başlangıcından sonraki servis kayıtlarını getirir.
- **Hemen Başla** fiyat olmadan kullanılabilir.
- **Motor Hazır**, **Tamamlandı** ve **Teslim Edildi** aşamalarına geçmeden önce iş emrinin final toplamı sıfırdan büyük olmalıdır.
- Tahmini fiyat tek başına final tahsilat tutarı sayılmaz.
- Ücret eksikse durum değişikliği yapılmaz, ücret bölümü otomatik açılır ve Ustaya açıklayıcı uyarı gösterilir.
- Aynı kural Supabase fonksiyonu ve tablo doğrulama tetikleyicisinde de uygulanır.

## Canlı doğrulama örneği

DBGpro için:

- 14 Temmuz: Test 2 ve Test1 — 2 tamamlanan iş
- 13 Temmuz: RKS VRS — Bugünkü Atölye Sırasında gösterilmez
- Bugünkü kayıtlı iş tutarı: 1.400 TL

## Sürüm

- Uygulama: 0.9.7
- Android versionCode: 16
- iOS buildNumber: 16
- Yedek: `backup/v0.9.6-before-v0.9.7-20260714`
- Migration: `20260714190500_v0_9_7_today_queue_and_ready_price_guard.sql`
- Rollback: `supabase/rollbacks/rollback_v0_9_7_to_v0_9_6.sql`
