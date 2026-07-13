# DraBornGarage v0.8.14

Tarih: 13 Temmuz 2026

## Giriş ekranı
- `Zamanlı Hatırlatma` simgesi ve metni toplam 10 piksel sağa hizalandı.

## Bildirim rolleri
- İşletme Sahibi + Usta hesapları işletme ve Usta bildirimlerini çift almıyor.
- Bu hesaplarda servis ve randevu operasyon bildirimleri yalnız Usta rolü üzerinden gelir.
- Saf İşletme Sahibi rolü işletme bildirimlerini almaya devam eder.

## Motor Hazır ve tahsilat
- Eski sistem `Motosiklet teslim edildi` uyarısı kaldırıldı.
- `Motor Hazır` seçildiğinde modern `Motosiklet Hazır` penceresi açılır.
- Pencere servis toplamını ve kalan tutarı gösterir.
- `Borç, Veresiye ve Tahsilata Git` düğmesi ilgili kategoriyi açıp sayfayı aşağı taşır.

## Finans düzeltmesi
- Net fiyat girilen ancak işlem/parça satırı olmayan randevulu servislerde toplam tutarın sıfır kalması düzeltildi.
- Net fiyat artık iş emrinin toplamına ve kalan borcuna yansır.
- Mevcut RKS VRS servis kaydı `₺900` toplam ve `₺900` kalan olarak canlı veritabanında düzeltildi.
