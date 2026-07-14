# DraBornGarage v0.9.5 — Usta Rapor ve İş Sayısı Tutarlılığı

**Tarih:** 14 Temmuz 2026

## Düzeltilen sorunlar

- Kalkan simgesi Randevularım ekranından kaldırıldı ve Servislerim ekranının sağ üstüne taşındı.
- İşletme Raporunda görünen işçilik tutarının Usta Paneli ve Usta Raporunda sıfır görünmesi düzeltildi.
- Tamamlanan iki işin tek işlem olarak görünmesine yol açan işlem-satırı bağımlılığı kaldırıldı.
- İşlem satırı bulunmayan tamamlanmış iş emri, atanmış Ustanın işçilik kaydına dahil edildi.
- Motor Hazır, Tamamlandı ve Teslim Edildi durumları tamamlanmış iş hesabında eşitlendi.
- İş emri tamamlandığında açık kalan işlem satırları otomatik olarak tamamlanır.
- Geçmiş teslim edilmiş servislerde yanlışlıkla açık kalan işlem satırları onarıldı.

## Hesaplama kuralı

Ustanın kayıtlı iş tutarı yalnız işçilik üzerinden hesaplanır. Parça bedeli Usta kazancına eklenmez. Ayrıntılı işlem satırları Ustaya yazılır; işçilik tutarının ayrıntılandırılmamış bölümü servise atanmış Ustaya kaydedilir. Sistem maaş, komisyon veya ortaklık payı hesaplamaz.

## Doğrulanan canlı kayıt

DBGpro / DBGgarage örneğinde:

- Bugünkü kayıtlı Usta iş tutarı: 1.000 TL
- Tüm dönem kayıtlı Usta iş tutarı: 1.900 TL
- Tamamlanan iş sayısı: 2

## Sürüm

- Uygulama: 0.9.5
- Android versionCode: 14
- iOS buildNumber: 14
- Yedek: backup/v0.9.4-before-v0.9.5-20260714
- Migration: 20260714115331_v0_9_5_report_consistency_and_service_completion.sql
- Rollback: supabase/rollbacks/rollback_v0_9_5_to_v0_9_4.sql
