# DraBornGarage — v0.8.14 Devam Dosyası

**Güncel sürüm:** `v0.8.14`  
**Önceki sabit yedek:** `backup/v0.8.13-before-v0.8.14-20260713`  
**Sonraki sürüm:** `v0.9.0`

## Tamamlananlar
- Zamanlı Hatırlatma içeriği daha sağa hizalandı.
- İşletme Sahibi + Usta hesaplarında bildirimler Usta rolüne indirildi.
- Motor Hazır aşamasına modern tahsilat yönlendirme penceresi eklendi.
- Teslim Edildi aşamasındaki eski sistem popupı kaldırıldı.
- Net fiyatın toplam tutar ve Borç/Veresiye hesabına yansımama hatası düzeltildi.

## Canlı veritabanı
- `v0_8_14_mechanic_notifications_ready_payment` migration uygulandı.
- `notify_workshop_owners` yalnız saf `owner` rolüne bildirim gönderir.
- Sabit fiyat, normal işlem/parça toplamının altına düşmeyecek şekilde finans toplamına katılır.
- Mevcut kayıtlar yeniden hesaplandı.
