# DraBornGarage Geçici Demo Testi

Demo sistemi gerçek verilerden ayrı çalışır. Demo müşterileri ve iş emirleri `demo_batch_id` ile işaretlenir; temizleme işlemi yalnızca bu kayıtları kaldırır.

## Yüklenen örnekler

- 5 müşteri
- 5 motosiklet
- Bekleyen, işlemde, tamamlanan ve teslim edilen servis kayıtları
- 6 servis/işçilik kaydı
- 5 kullanılan parça kaydı
- Kısmi ve tam tahsilat örnekleri
- Yamaha NMAX 125, Honda PCX 125, Bajaj Pulsar NS200, KTM Duke 250 ve Vespa Primavera 150

## Uygulamadan yönetme

1. **Ayarlar** sekmesini aç.
2. **Test Atölyesi** kartına gir.
3. Demo yoksa **Demo Atölyesini Yükle** düğmesine bas.
4. Panel, Müşteriler ve İş Emirleri ekranlarını test et.
5. Test bitince aynı karttan **Demo Verilerini Temizle** düğmesine bas.

Demo yükleme ve temizleme yalnızca `İşletme Sahibi` rolündeki hesaplarda görünür.

## Güvenlik

`clear_demo_data` fonksiyonu önce `demo_batch_id` taşıyan iş emirlerini, ardından demo müşterilerini ve demo batch kaydını siler. Demo iş emirlerine bağlı servis işlemleri, kullanılan parçalar ve tahsilatlar foreign key cascade ile kaldırılır. Gerçek kayıtlar bu koşula uymadığı için silinmez.
