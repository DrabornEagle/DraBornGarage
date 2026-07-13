# DraBornGarage — v0.8.11 Devam Dosyası

**Güncel sürüm:** `v0.8.11`  
**Önceki sabit yedek:** `backup/v0.8.10-before-v0.8.11-20260713`  
**Sonraki sürüm:** `v0.9.0`

## Tamamlanan kapsam
- Eşleştirme talebi bildirim hatasının veritabanı trigger katmanında düzeltilmesi.
- Eşleştirme sekmesi ve bildirim zili animasyonları.
- Müşteri hesabındaki Usta katılımı ve eşleştirme geçmişi kategorileri.
- Motor bağlantısında yalnız İşletme Ara ve QR/Manuel Kod yöntemleri.
- İşletme Paneli ile Usta Panelinin görev ayrımı.
- Usta iş ve randevu kapsamının atanmış kullanıcıyla sınırlandırılması.
- Platform ücret döneminin işletme yerel saatine göre oluşturulması.
- Ücret kaydı servis detay penceresi.
- Teslim sonrası Borç/Veresiye/Tahsilat yönlendirmesi.
- Tespit ve Atölye Notu panelinin kaldırılması.

## Canlı veri düzeltmesi
- Piston Garaj için 13–19 Temmuz haftalık dönemi oluşturuldu.
- 13 Temmuz tarihli iki işlem başı ücret kaydı toplam 100 TL aktif platform borcuna bağlandı.
- Mevcut kullanıcı, işletme ve servis kayıtları korunmuştur.

## Doğrulama
- TypeScript kontrolü.
- Android JavaScript bundle kontrolü.
- Platform dönem ve ücret toplamı kontrolü.
- Eşleştirme trigger ve hedef bildirim verisi kontrolü.

## Kurulum
- Yerel yedek: `DraBornGarage-v0.8.10-local-backup`
- Termux komutu: `docs/TERMUX_INSTALL.md`
