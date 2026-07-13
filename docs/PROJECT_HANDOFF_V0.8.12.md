# DraBornGarage — v0.8.12 Devam Dosyası

**Güncel sürüm:** `v0.8.12`  
**Önceki sabit yedek:** `backup/v0.8.11-before-v0.8.12-20260713`  
**Sonraki sürüm:** `v0.9.0`

## Tamamlananlar
- Bildirim zili yeni bildirimlerde kullanıcı dokunana kadar tekrar eden kısa animasyon yapar.
- Randevu ve İş Emri ekranlarından bildirim zili kaldırıldı.
- İşlem Başı Ücret Detayı penceresi yukarı taşındı, siyah perde azaltıldı ve metinler büyütüldü.
- Birincil Admin e-postası için trigger koruması güçlendirildi.

## Canlı veri temizliği
- Tüm Auth kullanıcıları silindi.
- Profiller, işletmeler, personel üyelikleri, müşteriler ve motosikletler sıfırlandı.
- İş emirleri, randevular, bildirimler, tahsilatlar ve platform ücret kayıtları temizlendi.
- Platform genel ayar kaydı korundu.
- Temizlik sonrası kullanıcı ve işlem tabloları `0` kayıt olarak doğrulandı.
- `draborneagle@gmail.com` yeniden kayıt olduğunda hesap otomatik olarak Admin ve personel görünümünde açılır.
