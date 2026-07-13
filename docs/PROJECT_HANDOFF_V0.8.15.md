# DraBornGarage — v0.8.15 Devam Dosyası

**Güncel sürüm:** `v0.8.15`  
**Önceki sabit yedek:** `backup/v0.8.14-before-v0.8.15-20260713`  
**Sonraki sürüm:** `v0.9.0`

## Tamamlananlar
- Tahsilat Kaydet ana kategori haline getirildi.
- Nakit, IBAN ve Borç olmak üzere üç yöntem seçimi eklendi.
- Borç / Veresiye kartları yalnız Borç seçeneğine taşındı.
- Tahsilat ve borç formları daha modern, ikonlu ve okunaklı hale getirildi.
- Tahsilat veya veresiye kaydı başarılı olduğunda motosiklet otomatik Teslim Edildi durumuna geçer.

## Canlı veritabanı
- `v0_8_15_payment_category_delivery` migration uygulandı.
- `staff_record_payment` ve `staff_open_receivable` başarılı işlem sonunda `update_work_order_status(..., delivered)` çağırır.
