# DraBornGarage — Onaylı Mobil Sürüm Yol Haritası

## Ana karar

Önce yalnızca **DraBornGarage** geliştirilecektir. DraBornStyle, DraBornRepair, DraBornWash ve DraBornClinic bu yol haritasına dahil değildir.

Geliştirme sırası:

1. Mobil uygulama v0.1’den v1.0’a kadar tamamlanır.
2. Google Play Store kurallarına uygun hale getirilir.
3. v1.0’dan sonra web sürümü yalnızca opsiyonel olarak değerlendirilir.
4. Bu planda v1.1, v1.2, v2.0, v2.1 veya v3.0 bulunmaz.

**Güncel geliştirme durumu:** v0.1–v0.6 uygulama ve Supabase tarafında tamamlandı. Güncel sürüm `v0.6.0`dır. Fiziksel Expo Go testleri ilgili checklist belgelerinde ayrıca takip edilir.

## v0.1 — Çok İşletmeli Çekirdek Sistem ✅

**Amaç:** DraBornGarage’ın işletme, rol, servis ve temel ödeme altyapısını kurmak.

- [x] Admin paneli
- [x] İşletme ekleme, düzenleme, seçme ve aktif/pasif yapma
- [x] Her işletmeyi ayrı görüntüleme
- [x] İşletme Sahibi rolü
- [x] İşletme Sahibi + Usta rolü
- [x] Birden fazla işletme sahibi desteği
- [x] Usta hesabı
- [x] Çırak hesabı ve kısıtlı panel
- [x] Personel ekleme, rol değiştirme ve pasifleştirme
- [x] Her veriyi işletmeye bağlama
- [x] Temel İşletme Paneli
- [x] Temel kişisel Usta Paneli
- [x] Plakayla kayıtlı motor/müşteri bulma
- [x] Yeni müşteri ve motorla servis kaydı açma
- [x] Hızlı Servis / randevusuz gelen motor
- [x] Bırakılan Motor
- [x] Randevulu Servis veri tipi
- [x] Günlük atölye sırası
- [x] Servis durumlarını değiştirme
- [x] Net fiyat ve tahmini fiyat
- [x] Tamire başlamadan önce ücret zorunluluğu
- [x] Nakit ve IBAN tahsilat kaydı
- [x] İşlem ve kullanılan parçaları manuel kaydetme
- [x] İşletme bazlı RLS ve rol güvenliği

## v0.2 — Müşteri Hesabı ve Motor Eşleştirme ✅

**Amaç:** Müşterinin kendi motorunu ve seçtiği işletmedeki servis sürecini takip etmesi.

- [x] Müşteri kayıt/giriş
- [x] Plaka ile eşleştirme
- [x] Telefon/kod ile güvenli eşleştirme
- [x] Servis takip kodu
- [x] QR kod mantığı
- [x] Usta ve müşteri onaylı eşleştirme
- [x] Müşterinin kendi motorlarını görmesi
- [x] Aktif servis durumu
- [x] Fiyat bilgisi
- [x] Servis geçmişi
- [x] Tekrar gelen müşterinin plakayla otomatik tanınması
- [x] Tek işletmede otomatik giriş
- [x] Birden fazla işletmede işletme seçimi
- [x] Seçilen işletmeye özel geçmiş ve aktif servis

## v0.3 — Randevu, Müsaitlik ve Usta Takvimi ✅

**Amaç:** Ustaların zamanını ve randevulu/randevusuz iş akışını yönetmek.

- [x] Usta çalışma saatleri
- [x] Randevu saatleri
- [x] Müsait/meşgul durumu
- [x] Belirli gün ve saat kapatma
- [x] Ustanın manuel randevu eklemesi
- [x] İşletme Sahibinin randevu yönetmesi
- [x] Admin’in randevu yönetmesi
- [x] Randevuyu servis kaydına dönüştürme
- [x] Günlük randevu listesi
- [x] Randevulu ve randevusuz iş ayrımı

## v0.4 — Ek İşlem, Onay ve Servis Detayları ✅

**Amaç:** Tamir sırasında çıkan ek işleri ve müşteri onaylarını kontrollü yönetmek.

- [x] Ek işlem ve ek ücret
- [x] Uygulamadan onay
- [x] Müşteri yanında onay verdi
- [x] Telefonla onay alındı
- [x] WhatsApp ile onay alındı
- [x] Reddedildi
- [x] Onay geçmişi
- [x] Kullanılan parçalar
- [x] Ayrıntılı servis notları
- [x] İşlem başlangıç/bitiş saatleri
- [x] Parça bekleniyor
- [x] Test ediliyor
- [x] Motor hazır akışı

## v0.5 — Veresiye / Alacak Takibi ✅

**Amaç:** Müşteri borçlarını, kısmi ödemeleri ve ödeme sözlerini takip etmek.

- [x] Borç / veresiye yazıldı
- [x] Kısmi ödeme
- [x] Tam ödendi
- [x] Ödenmedi
- [x] Tahsil edilemedi / kapatıldı
- [x] Toplam, ödenen ve kalan borç
- [x] Ödeme sözü tarihi
- [x] Borç yazılma, son ödeme ve kapanış tarihleri
- [x] Nakit ve IBAN yöntemi
- [x] Alacaklar ekranı
- [x] Bugün ödeme günü olanlar
- [x] Geciken borçlar ve gecikme gün sayısı
- [x] Açık, kısmi, ödenen ve kapatılan filtreleri
- [x] Müşteri, telefon ve plaka araması
- [x] Ödeme al, kısmi ödeme gir, borcu kapat ve yeniden aç
- [x] Personel özel notu
- [x] Müşteriye açık ödeme notu ve uygulama içi hatırlatma
- [x] Tahsilat ve alacak hareket geçmişi
- [x] Müşteri tarafında kalan ödeme ve ödeme geçmişi
- [x] Çırağa finansal verileri ve Alacak sekmesini gizleme
- [x] Çok işletmeli RLS ve rol güvenliği

> Ücretsiz / ikram ayrı bir borç durumu değildir; servis toplamının sıfır olması veya ileride kayıt türü olarak ele alınacaktır.

## v0.6 — Usta Gelir Kayıtları ve İşletme Raporları ✅

**Amaç:** Hangi Ustanın hangi işten ne kadar tutar kaydettiğini ve işletme toplamını göstermek.

- [x] Ustanın kişisel iş geçmişi
- [x] Günlük, haftalık, aylık ve tüm zamanlar kayıtlı tutar
- [x] Saat saat gelen motorlar
- [x] İşlem adı, plaka ve kullanılan parçalar
- [x] Ustanın tahsil ettiği Nakit toplamı
- [x] Ustanın tahsil ettiği IBAN toplamı
- [x] Ustaya atanmış servislerde açık borç/veresiye toplamı
- [x] İşletmenin toplam kaydedilen servis tutarı
- [x] İşçilik ve parça toplamları
- [x] İşletmenin dönemsel Nakit ve IBAN tahsilatları
- [x] İşletmenin güncel açık alacak toplamı
- [x] Usta bazlı iş sayısı ve kayıtlı işlem tutarı
- [x] Usta bazlı parça ve tahsilat özeti
- [x] Günlük kayıtlı tutar grafiği
- [x] Saatlik motor geliş grafiği
- [x] En çok yapılan işlemler
- [x] Son servis kayıtları
- [x] İşletme Sahibi + Usta için İşletme/Kişisel görünüm geçişi
- [x] Admin, Sahip, Usta ve Çırak rol güvenliği

Sistem maaş, yüzde, prim, komisyon, net kâr, ortak payı veya kazanç bölüşümü hesaplamaz.

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
- Usta maaş, prim, yüzde, komisyon veya ortaklık payı hesabı
- v1.1, v1.2, v2.0, v2.1 ve v3.0
