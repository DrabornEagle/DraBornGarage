# DraBornGarage — Onaylı Mobil Sürüm Yol Haritası

## Ana karar

Önce yalnızca **DraBornGarage** geliştirilecektir. DraBornStyle, DraBornRepair, DraBornWash ve DraBornClinic bu yol haritasına dahil değildir.

Geliştirme sırası:

1. Mobil uygulama v0.1’den v1.0’a kadar tamamlanır.
2. Google Play Store kurallarına uygun hale getirilir.
3. v1.0’dan sonra web sürümü yalnızca opsiyonel olarak değerlendirilir.
4. Bu planda v1.1, v1.2, v2.0, v2.1 veya v3.0 bulunmaz.

**Güncel geliştirme durumu:** v0.1–v0.9 uygulama ve Supabase geliştirmesi tamamlandı. Güncel sürüm `v0.9.0`dır. Fiziksel cihaz pilotu ve Play Console kapalı test yürütmesi v1.0 yayın kapısında ayrıca takip edilir.

## v0.1 — Çok İşletmeli Çekirdek Sistem ✅

**Amaç:** İşletme, rol, servis ve temel ödeme altyapısı.

- [x] Admin paneli
- [x] Çok işletme ekleme, seçme, düzenleme ve aktif/pasif yapma
- [x] İşletme Sahibi
- [x] İşletme Sahibi + Usta
- [x] Birden fazla işletme sahibi
- [x] Usta ve Çırak hesapları
- [x] Personel daveti, rol ve aktiflik yönetimi
- [x] İşletme bazlı veri ayrımı
- [x] Müşteri ve motosiklet kayıtları
- [x] Hızlı Servis, Bırakılan Motor ve Randevulu Servis
- [x] Atölye sırası ve servis durumları
- [x] Net/tahmini fiyat
- [x] Nakit ve IBAN tahsilatı
- [x] İşlem ve parça kayıtları
- [x] RLS ve rol güvenliği

## v0.2 — Müşteri Hesabı ve Motor Eşleştirme ✅

- [x] Müşteri kayıt/giriş
- [x] Plaka + telefon eşleştirmesi
- [x] Servis takip kodu
- [x] QR kod
- [x] Usta onaylı eşleştirme
- [x] Motorlarım
- [x] Aktif servis ve fiyat
- [x] Servis geçmişi
- [x] Tekrar gelen müşteriyi tanıma
- [x] Çok işletmeli müşteri seçimi

## v0.3 — Randevu, Müsaitlik ve Usta Takvimi ✅

- [x] Usta çalışma saatleri
- [x] Mola ve slot süresi
- [x] Müsait / Meşgul / Kapalı
- [x] Belirli gün ve saat kapatma
- [x] Çakışmasız müsaitlik motoru
- [x] Müşteri randevusu
- [x] Personel manuel randevusu
- [x] Günlük takvim
- [x] Randevuyu servis kaydına dönüştürme

## v0.3.1 — Sürüm ve Yedekleme Standardı ✅

- [x] Üç parçalı sürüm numarası
- [x] Her yeni sürümden önce sabit GitHub yedeği
- [x] Migration ve rollback dosyaları
- [x] TypeScript ve Android bundle zorunluluğu
- [x] Termux kurulum ve geri alma

## v0.4 — Ek İşlem, Onay ve Servis Detayları ✅

- [x] Ek işlem, işçilik ve parça bedeli
- [x] Uygulama, müşteri yanında, telefon ve WhatsApp onayı
- [x] Reddedildi durumu
- [x] Onay geçmişi
- [x] Servis ilerleme kilidi
- [x] İşlem Planlandı / Başladı / Tamamlandı
- [x] Ayrıntılı servis notları
- [x] Parça bekleniyor
- [x] Test ediliyor
- [x] Motor hazır

## v0.5 — Veresiye / Alacak Takibi ✅

- [x] Borç / veresiye yazma
- [x] Kısmi ve tam ödeme
- [x] Ödenmedi, kısmi, ödenmiş, gecikmiş ve kapatıldı durumları
- [x] Ödeme sözü tarihi
- [x] Nakit ve IBAN
- [x] Arama ve filtreler
- [x] Alacak notları ve hareket geçmişi
- [x] Müşteri tarafında kalan borç ve ödeme geçmişi
- [x] Çırağa finansal verileri gizleme
- [x] Çok işletmeli güvenlik

## v0.6 — Usta Kayıtları ve İşletme Raporları ✅

- [x] Ustanın kişisel iş geçmişi
- [x] Günlük, haftalık, aylık ve tüm zamanlar tutarı
- [x] Saat saat gelen motorlar
- [x] İşlem adı, plaka ve parçalar
- [x] Ustanın tahsil ettiği Nakit ve IBAN
- [x] Ustaya atanmış açık alacak
- [x] İşletme toplamları
- [x] Usta bazlı iş, işlem, parça ve tutar
- [x] Grafikler, en çok yapılan işlemler ve son servisler
- [x] İşletme / Kişisel Usta görünümü
- [x] Rol güvenliği

Sistem maaş, yüzde, prim, komisyon, net kâr, ortak payı veya kazanç bölüşümü hesaplamaz.

## v0.7 — Platform Hizmet Bedeli Takibi ✅

- [x] İşletme bazlı işlem başı bedel
- [x] Admin varsayılan ve işletmeye özel bedel
- [x] Takibi açma/kapatma ve başlangıç tarihi
- [x] Tamamlanan servis için tek ücret
- [x] İptal edilen serviste ücreti geçersiz kılma
- [x] Haftalık ve aylık ödeme periyodu
- [x] Dönemlik ve devreden borç
- [x] Kısmi ödeme
- [x] Ödeme günü, gecikme ve bildirim durumları
- [x] İşletme ödeme bildirimi
- [x] Admin onayı/reddi
- [x] Bekleyen bildirimi iptal etme
- [x] En eski borçtan dağıtım
- [x] Banka, hesap sahibi ve IBAN
- [x] Opsiyonel private dekont
- [x] Admin bütün işletmeler özeti
- [x] İşletmeler arası RLS ve rol güvenliği

## v0.8 — Bildirimler ve Hatırlatmalar ✅

- [x] Personel ve müşteri panelinde canlı bildirim merkezi
- [x] Okunmamış bildirim sayısı ve yaklaşan hatırlatmalar
- [x] Supabase Realtime kullanıcı akışı
- [x] Bildirimden ilgili ekrana yönlendirme
- [x] Servis, fiyat, onay, işlem, parça, test, hazır ve teslim bildirimleri
- [x] Müşteri eşleştirme bildirimleri
- [x] Randevu oluşturma, onay, değişiklik ve iptal bildirimleri
- [x] 24 saat ve 2 saat randevu hatırlatmaları
- [x] Borç ödeme günü ve gecikme bildirimleri
- [x] Platform ödeme günü, gecikme, bildirim, onay ve ret sonuçları
- [x] Kullanıcıya özel bildirim tercihleri
- [x] Okuma, toplu okuma ve arşivleme
- [x] Android yerel bildirim kanalı
- [x] Expo yerel anlık ve planlı telefon bildirimleri
- [x] Uygulama bildirim rozeti
- [x] RLS ve rol tabanlı bildirim güvenliği

Expo Go Android üzerinde yerel bildirimler kullanılır. Uzaktan push bildirimi EAS development build ve üretim yayın yapısı gerektirdiği için v1.0 kapsamındadır.

## v0.8.3–v0.8.16 — Gerçek Kullanım ve Arayüz Düzeltmeleri ✅

- [x] Zorunlu plaka, marka ve model
- [x] Vergi Dairesi ve Vergi Numarası
- [x] Plakayla kayıtlı müşteri arama ve Usta onayı
- [x] Admin onaylı işletme başvurusu
- [x] Usta başvurusu ve davet kodu
- [x] Bağlantı olmadan işletme/Usta seçerek randevu
- [x] Güncel takvim ve geçmiş randevu arşivi
- [x] Bildirim zili, canlı vurgu ve sekme yönlendirmeleri
- [x] İşletme ve kişisel Usta panel ayrımı
- [x] Ustanın yalnız kendi işlerini görmesi
- [x] Platform borcunun işletme yerel tarihine göre dönemlenmesi
- [x] Modern rapor, alacak ve servis detayları
- [x] Tahsilat kategorisi, otomatik teslim ve hareket geçmişi düzeni
- [x] Güncel kararlı temel: v0.8.16

## v0.9 — Google Play Uyum, Test ve Pilot ✅

**Amaç:** Uygulamayı gerçek işletme pilotuna ve mağaza kapalı testine hazırlamak.

- [x] Gizlilik politikası
- [x] Uygulama içi gizlilik ekranı
- [x] Hesap silme talebi
- [x] Talep durumu ve iptal akışı
- [x] Admin hesap silme yönetimi RPC'leri
- [x] Rol bazlı erişim denetimi
- [x] Hassas RPC güvenlik sıkılaştırması
- [x] Gereksiz Android izinlerini kaldırma/engelleme
- [x] Uygulama tarafı yaygın/sızdırılmış parola engeli
- [x] Güçlü parola kuralları
- [x] Test kullanıcı matrisi
- [x] Pilot işletme kurulum planı
- [x] Hızlı servis test planı
- [x] Randevu test planı
- [x] Ek işlem onayı test planı
- [x] Alacak/veresiye test planı
- [x] Platform bedeli test planı
- [x] Bildirim test planı
- [x] Rol bazlı negatif testler
- [x] Gizlilik ve hesap silme testleri
- [x] Ayarlar içinde pilot veri merkezi
- [x] Arayüz ve yayın bilgisi sadeleştirmesi
- [x] Google Play kısa ve tam açıklaması
- [x] Veri Güvenliği form taslağı
- [x] Kapalı test planı
- [x] TypeScript ve Android bundle GitHub Actions kalite kapısı
- [x] Canlı Supabase migration
- [x] v0.8.16 kod yedeği ve v0.9 rollback

Fiziksel cihazlarda ayrı gerçek rol hesaplarıyla pilot yürütme ve Play Console AAB yüklemesi geliştirme maddesi değil, v1.0 yayın kabul kapısıdır.

## v1.0 — Google Play’e Hazır Mobil DraBornGarage

**Amaç:** Yayınlanabilir ilk tam mobil sürüm.

v1.0; v0.1–v0.9 arasındaki onaylanan özelliklerin kararlı, güvenli ve gerçek cihazlarda test edilmiş birleşimidir.

- [ ] GitHub kalite kontrollerinin yeşil olması
- [ ] Admin, İşletme Sahibi, Sahip + Usta, Usta, Çırak ve Müşteri fiziksel testleri
- [ ] Gerçek pilot işletmede ana akışların tamamlanması
- [ ] Kritik hata sayısının sıfır olması
- [ ] Android AAB üretimi
- [ ] Google Play kapalı test yüklemesi
- [ ] Veri Güvenliği ve izin beyanının üretim paketiyle eşleşmesi
- [ ] Gizlilik ve hesap silme bağlantılarının herkese açık olması
- [ ] Kapalı test geri bildirimlerinin kapatılması
- [ ] Google Play yayın adayı onayı

## v1.0 sonrası

- Web sürümü yalnız ihtiyaç oluşursa değerlendirilir.
- Bu yol haritasına otomatik olarak yeni büyük sürüm eklenmez.
