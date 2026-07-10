# DraBornGarage — Onaylı Mobil Sürüm Yol Haritası

## Ana karar

Önce yalnızca **DraBornGarage** geliştirilecektir. DraBornStyle, DraBornRepair, DraBornWash ve DraBornClinic bu yol haritasına dahil değildir.

Geliştirme sırası:

1. Mobil uygulama v0.1’den v1.0’a kadar tamamlanır.
2. Google Play Store kurallarına uygun hale getirilir.
3. v1.0’dan sonra web sürümü yalnızca opsiyonel olarak değerlendirilir.
4. Bu planda v1.1, v1.2, v2.0, v2.1 veya v3.0 bulunmaz.

## v0.1 — Çok İşletmeli Çekirdek Sistem

**Amaç:** DraBornGarage’ın işletme, rol, servis ve temel ödeme altyapısını kurmak.

- Admin paneli
- İşletme ekleme, düzenleme, seçme ve aktif/pasif yapma
- Her işletmeyi ayrı görüntüleme
- İşletme Sahibi rolü
- İşletme Sahibi + Usta rolü
- Birden fazla işletme sahibi desteği
- Usta hesabı
- Çırak hesabı ve kısıtlı panel
- Personel ekleme, rol değiştirme ve pasifleştirme
- Her veriyi işletmeye bağlama
- Temel İşletme Paneli
- Temel kişisel Usta Paneli
- Plakayla kayıtlı motor/müşteri bulma
- Yeni müşteri ve motorla servis kaydı açma
- Hızlı Servis / randevusuz gelen motor
- Bırakılan Motor
- Randevulu Servis veri tipi
- Günlük atölye sırası
- Servis durumlarını değiştirme
- Net fiyat ve tahmini fiyat
- Tamire başlamadan önce ücret zorunluluğu
- Nakit ve IBAN tahsilat kaydı
- İşlem ve kullanılan parçaları manuel kaydetme
- İşletme bazlı RLS ve rol güvenliği

## v0.2 — Müşteri Hesabı ve Motor Eşleştirme

**Amaç:** Müşterinin kendi motorunu ve seçtiği işletmedeki servis sürecini takip etmesi.

- Müşteri kayıt/giriş
- Plaka ile eşleştirme
- Telefon/kod ile güvenli eşleştirme
- Servis takip kodu
- QR kod mantığı
- Usta ve müşteri onaylı eşleştirme
- Müşterinin kendi motorlarını görmesi
- Aktif servis durumu
- Fiyat bilgisi
- Servis geçmişi
- Tekrar gelen müşterinin plakayla otomatik tanınması
- Tek işletmede otomatik giriş
- Birden fazla işletmede işletme seçimi
- Seçilen işletmeye özel geçmiş ve aktif servis

## v0.3 — Randevu, Müsaitlik ve Usta Takvimi

**Amaç:** Ustaların zamanını ve randevulu/randevusuz iş akışını yönetmek.

- Usta çalışma saatleri
- Randevu saatleri
- Müsait/meşgul durumu
- Belirli gün ve saat kapatma
- Ustanın manuel randevu eklemesi
- İşletme sahibinin randevu yönetmesi
- Admin’in randevu yönetmesi
- Randevuyu servis kaydına dönüştürme
- Günlük randevu listesi
- Randevulu ve randevusuz iş ayrımı

## v0.4 — Ek İşlem, Onay ve Servis Detayları

**Amaç:** Tamir sırasında çıkan ek işleri ve müşteri onaylarını kontrollü yönetmek.

- Ek işlem ve ek ücret
- Uygulamadan onay
- Müşteri yanında onay verdi
- Telefonla onay alındı
- WhatsApp ile onay alındı
- Reddedildi
- Onay geçmişi
- Kullanılan parçalar
- Ayrıntılı servis notları
- İşlem başlangıç/bitiş saatleri
- Parça bekleniyor
- Test ediliyor
- Motor hazır akışı

## v0.5 — Veresiye / Alacak Takibi

**Amaç:** Müşteri borçlarını, kısmi ödemeleri ve ödeme sözlerini takip etmek.

- Borç yazıldı
- Kısmi ödeme
- Tam ödendi
- Ödenmedi
- Ücretsiz / ikram
- Tahsil edilemedi / iptal
- Toplam, ödenen ve kalan borç
- Ödeme sözü tarihi
- Ödendiği tarih
- Nakit/IBAN yöntemi
- Alacaklar ekranı
- Bugün ödeme günü olanlar
- Geciken borçlar
- Müşteri/plaka/tarih filtreleri
- Ödeme al, kısmi ödeme gir, borcu kapat, not ekle
- Müşteri tarafında kalan ödeme görünümü
- Çırağa finansal verileri gizleme

## v0.6 — Usta Gelir Kayıtları ve İşletme Raporları

**Amaç:** Hangi ustanın hangi işten ne kadar tutar kaydettiğini ve işletme toplamını göstermek.

- Ustanın kişisel iş geçmişi
- Günlük, haftalık ve aylık kayıtlı tutar
- Saat saat gelen motorlar
- İşlem adı, plaka ve kullanılan parçalar
- Nakit toplamı
- IBAN toplamı
- Borç/veresiye toplamı
- İşletmenin toplam kaydedilen tutarı
- Usta bazlı iş sayısı ve tutar
- Temel raporlar

Sistem maaş, yüzde, prim, ortak payı veya kazanç bölüşümü hesaplamaz.

## v0.7 — Platform Hizmet Bedeli Takibi

**Amaç:** İşletmelerin DraBornGarage’a ödeyeceği işletme bazlı hizmet bedelini takip etmek.

- İşletme bazlı işlem başı bedel
- Admin tarafından özel bedel ayarı
- Haftalık veya aylık ödeme periyodu
- Ödeme günü seçimi
- Dönemlik platform borcu
- Devreden borç
- Kısmi ödeme
- Ödeme bekleniyor
- Ödeme günü geldi
- Ödeme bildirildi
- Admin onayı bekleniyor
- Admin onayı veya reddi
- Admin IBAN bilgisi
- Gönderilen tutar, tarih, açıklama ve opsiyonel dekont

## v0.8 — Bildirimler ve Hatırlatmalar

**Amaç:** Müşteri, personel, işletme ve Admin’e doğru zamanda bilgi vermek.

- Motor teslim alındı
- Ücret girildi
- Müşteri onayı bekleniyor
- Tamire başlandı
- Ek işlem onayı
- Parça bekleniyor
- Test ediliyor
- Motor hazır
- Teslim edildi
- Ödeme bilgisi değişti
- Yeni servis ve müşteri eşleşme bildirimleri
- Randevu hatırlatması
- Borç ödeme günü ve gecikme bildirimi
- Platform ödeme günü bildirimi
- Admin platform ödeme onayı bildirimi

## v0.9 — Google Play Uyum, Test ve Pilot

**Amaç:** Uygulamayı gerçek işletmede pilot test etmek ve mağaza yayınına hazırlamak.

- Gizlilik politikası
- Uygulama içi gizlilik ekranı
- Hesap silme talebi
- Rol bazlı erişim denetimi
- Gereksiz izinleri kaldırma
- Test kullanıcıları
- Pilot işletme
- Hızlı servis testi
- Randevu testi
- Alacak/veresiye testi
- Platform bedeli testi
- Bildirim testi
- Hata düzeltmeleri
- Arayüz sadeleştirme
- Google Play açıklaması
- Kapalı test hazırlığı

## v1.0 — Google Play’e Hazır Mobil DraBornGarage

**Amaç:** Yayınlanabilir ilk tam mobil sürüm.

v1.0; v0.1–v0.9 arasındaki onaylanan özelliklerin kararlı, güvenli ve test edilmiş birleşimidir:

- Admin ve çok işletmeli platform
- İşletme Sahibi, İşletme Sahibi + Usta, Usta, Çırak ve Müşteri rolleri
- Personel yönetimi
- Müşteri hesabı ve güvenli motor eşleştirme
- İşletme seçimi
- Randevu ve müsaitlik
- Hızlı servis, bırakılan motor ve atölye sırası
- Ayrıntılı servis durumları
- Fiyat ve ek işlem onayı
- Nakit/IBAN ödeme
- Veresiye/alacak takibi
- Usta kişisel kayıtları ve işletme raporları
- Manuel parça kayıtları
- Platform hizmet bedeli ve ödeme onayı
- Bildirimler
- Google Play uyum hazırlığı
- Android APK test çıktısı ve Google Play AAB hazırlığı

## v1.0 dışında kalanlar

- DraBornStyle bağlantısı
- DraBornRepair
- DraBornWash
- DraBornClinic
- Tam web sürümü
- Sanal POS, kart veya Google Play içi tamir ödemesi
- Usta maaş, prim, yüzde veya ortaklık payı hesabı
- v1.1, v1.2, v2.0, v2.1 ve v3.0
