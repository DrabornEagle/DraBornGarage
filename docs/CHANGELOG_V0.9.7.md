# DraBornGarage v0.9.7 — Toplam Tamamlanan İş ve Motor Hazır Ücret Koruması

**Tarih:** 14 Temmuz 2026

## Düzeltilen sorunlar

- Usta Panelindeki Hazır/Tamam sayacı yalnız bugünkü kayıtları değil, seçili Ustanın tüm hazır, tamamlanmış ve teslim edilmiş işlerini sayar.
- İşletme Panelindeki aynı sayaç seçili işletmenin tüm tamamlanan işlerini gösterir.
- Günlük gelir ve kayıtlı iş tutarı günlük kalmaya devam eder; yalnız tamamlanan iş sayısı toplam olarak gösterilir.
- Son net tahsilat/servis ücreti oluşmadan Motor Hazır seçilemez.
- Motor Hazır engelinde Ücret ve Tahmini Fiyat bölümü otomatik açılır ve açıklayıcı uyarı gösterilir.
- Tahmini fiyat tek başına final tahsilat tutarı sayılmaz.
- Veritabanı; Motor Hazır, Tamamlandı ve Teslim Edildi geçişlerini toplam tutar sıfırken engeller.

## Canlı doğrulama

DBGpro / DBGgarage örneğinde:

- Tüm dönem hazır/tamamlanan iş: 3
- Bugün hazır/tamamlanan iş: 2
- Bugün kayıtlı işçilik: 1.400 TL

Bu nedenle panelde günlük tutar **1.400 TL**, Hazır/Tamam sayısı ise **3** görünmelidir.

## Sürüm

- Uygulama: 0.9.7
- Android versionCode: 16
- iOS buildNumber: 16
- Yedek: `backup/v0.9.6-before-v0.9.7-20260714`
- Migration: `20260714173000_v0_9_7_total_completed_and_ready_price_guard.sql`
- Rollback: `supabase/rollbacks/rollback_v0_9_7_to_v0_9_6.sql`
