# DraBornGarage — Onaylı Mobil Sürüm Yol Haritası

## Ana karar

Önce yalnızca **DraBornGarage** geliştirilecektir. DraBornStyle, DraBornRepair, DraBornWash ve DraBornClinic bu yol haritasına dahil değildir.

Geliştirme sırası:

1. Mobil uygulama v0.1’den v1.0’a kadar tamamlanır.
2. Google Play Store kurallarına uygun hale getirilir.
3. v1.0’dan sonra web sürümü yalnızca opsiyonel olarak değerlendirilir.
4. Bu planda v1.1, v1.2, v2.0, v2.1 veya v3.0 bulunmaz.

**Güncel geliştirme durumu:** v0.1–v0.8 uygulama ve Supabase tarafında tamamlandı. Güncel sürüm `v0.8.5`dür. Fiziksel Expo Go ve ayrı gerçek rol hesabı testleri ilgili checklist belgelerinde ayrıca takip edilir.

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
- [x] Atölye sırası
- [x] Servis durumları
- [x] Net ve tahmini fiyat
- [x] Nakit ve IBAN tahsilatı
- [x] İşlem ve parça kayıtları
- [x] RLS ve rol güvenliği

## v0.2 — Müşteri Hesabı ve Motor Eşleştirme ✅

**Amaç:** Müşterinin kendi motorunu ve servis sürecini güvenli takip etmesi.

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

**Amaç:** Usta çalışma zamanını ve randevulu/randevusuz iş akışını yönetmek.

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
- [x] ZIP-only Termux kurulum ve geri alma

## v0.4 — Ek İşlem, Onay ve Servis Detayları ✅

**Amaç:** Tamir sırasında çıkan ek işleri müşteri onayıyla yönetmek.

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
- [x] Android müşteri paneli düzeltmeleri

## v0.5 — Veresiye / Alacak Takibi ✅

**Amaç:** Müşteri borçlarını, kısmi ödemeleri ve ödeme sözlerini takip etmek.

- [x] Borç / veresiye yazma
- [x] Kısmi ödeme
- [x] Tam ödeme
- [x] Ödenmedi ve kapatıldı durumları
- [x] Ödeme sözü tarihi
- [x] Nakit ve IBAN
- [x] Açık, bugün, geciken, kısmi, ödenen ve kapatılan filtreleri
- [x] Müşteri, telefon ve plaka araması
- [x] Alacak notları ve hareket geçmişi
- [x] Müşteri tarafında kalan borç ve ödeme geçmişi
- [x] Çırağa finansal verileri gizleme
- [x] Çok işletmeli güvenlik

## v0.6 — Usta Gelir Kayıtları ve İşletme Raporları ✅

**Amaç:** Hangi Ustanın hangi işlem için ne kadar tutar kaydettiğini ve işletme toplamlarını göstermek.

- [x] Ustanın kişisel iş geçmişi
- [x] Günlük, haftalık, aylık ve tüm zamanlar tutarı
- [x] Saat saat gelen motorlar
- [x] İşlem adı, plaka ve parçalar
- [x] Ustanın tahsil ettiği Nakit ve IBAN
- [x] Ustaya atanmış açık alacak
- [x] İşletmenin toplam kaydedilen servis tutarı
- [x] İşçilik ve parça toplamı
- [x] İşletmenin dönemsel tahsilatları
- [x] Usta bazlı iş, işlem, parça ve tutar
- [x] Günlük ve saatlik grafikler
- [x] En çok yapılan işlemler
- [x] Son servis kayıtları
- [x] İşletme / Kişisel Usta görünümü
- [x] Rol güvenliği

Sistem maaş, yüzde, prim, komisyon, net kâr, ortak payı veya kazanç bölüşümü hesaplamaz.

## v0.7 — Platform Hizmet Bedeli Takibi ✅

**Amaç:** İşletmelerin DraBornGarage’a ödeyeceği işletme bazlı hizmet bedelini takip etmek.

- [x] İşletme bazlı işlem başı bedel
- [x] Admin varsayılan bedeli
- [x] Admin işletmeye özel bedeli
- [x] Platform takibini işletme bazında açma/kapatma
- [x] Takip başlangıç tarihi
- [x] Servis Hazır/Tamamlandı/Teslim Edildi olduğunda otomatik ücret
- [x] Aynı servis için tek ücret
- [x] İptal edilen serviste ücreti geçersiz kılma
- [x] Haftalık ödeme periyodu
- [x] Aylık ödeme periyodu
- [x] Haftalık ödeme günü
- [x] Aylık 1–28 veya son gün
- [x] Dönemlik platform borcu
- [x] Devreden borç
- [x] Kısmi ödeme
- [x] Ödeme günü geldi
- [x] Ödeme gecikti
- [x] Ödeme bildirildi
- [x] Admin onayı bekleniyor
- [x] Admin onayı veya reddi
- [x] Bekleyen bildirimi iptal etme
- [x] Ödemeyi en eski borçtan başlayarak dağıtma
- [x] Admin banka, hesap sahibi ve IBAN bilgileri
- [x] Gönderilen tutar, tarih ve açıklama
- [x] Opsiyonel dekont
- [x] Private Supabase Storage
- [x] Admin bütün işletmeler platform özeti
- [x] İşletme Sahibi/Admin Merkez ekranı
- [x] İşletmeler arası RLS ve rol güvenliği

## v0.8 — Bildirimler ve Hatırlatmalar ✅

**Amaç:** Müşteri, personel, işletme ve Admin’e doğru zamanda bilgi vermek.

- [x] Personel ve müşteri panelinde canlı bildirim merkezi
- [x] Okunmamış bildirim sayısı ve yaklaşan hatırlatmalar
- [x] Supabase Realtime ile kullanıcıya özel canlı akış
- [x] Bildirimden ilgili uygulama ekranına yönlendirme
- [x] Motor teslim alındı
- [x] Ücret girildi
- [x] Müşteri onayı bekleniyor
- [x] Tamire başlandı
- [x] Ek işlem onayı
- [x] Parça bekleniyor
- [x] Test ediliyor
- [x] Motor hazır
- [x] Teslim edildi
- [x] Ödeme bilgisi değişti
- [x] Yeni servis ve Ustaya atama bildirimi
- [x] Müşteri eşleştirme talebi ve sonucu
- [x] Yeni randevu, onay, değişiklik ve iptal bildirimleri
- [x] Randevudan 24 saat önce hatırlatma
- [x] Randevudan 2 saat önce hatırlatma
- [x] Borç ödeme günü ve gecikme bildirimi
- [x] İşletme Sahibine alacak günü ve gecikme
- [x] Platform ödeme günü ve gecikme bildirimi
- [x] Admin’e platform ödeme bildirimi
- [x] Platform ödeme onayı, reddi ve iptal sonucu
- [x] Kullanıcıya özel bildirim tercihleri
- [x] Bildirimi okuma, toplu okuma ve arşivleme
- [x] Android yerel bildirim kanalı
- [x] Expo yerel anlık ve planlı telefon bildirimleri
- [x] Uygulama bildirim rozeti
- [x] RLS ve rol tabanlı bildirim güvenliği

Expo Go Android üzerinde yerel bildirimler kullanılır. Uzaktan push bildirimi EAS development build ve yayın yapısı gerektirdiği için v1.0 kapsamındadır.

## v0.8.3 — Kayıtlı Motor, Vergi Bilgileri ve Plaka Eşleştirme ✅

**Amaç:** Müşteri ve işletme kayıtlarını gerçek kullanım için tamamlamak; Ustanın plakayla hesabı güvenli eşleştirmesini sağlamak.

- [x] Müşteri kaydında zorunlu plaka, motosiklet marka ve model
- [x] Kayıtlı motor bilgisinin müşteri profilinde saklanması
- [x] Müşterinin plakayla Usta onayı istemesi
- [x] Ustanın Eşleşme Talepleri ekranından onay vermesi
- [x] Ustanın plakayla kayıtlı müşteri hesabı araması
- [x] İşletme kaydı yoksa müşteri/motor kaydının güvenli oluşturulması
- [x] İşletme oluştururken Vergi Dairesi ve Vergi Numarası
- [x] Admin işletme oluşturma/düzenleme ekranında vergi bilgileri
- [x] RLS/SECURITY DEFINER yetki kontrolleri, migration ve rollback

## v0.8.4 — İşletme Onayı, Takvim Dikkat Merkezi ve Modern Servis Detayı ✅

- [x] Admin onaylı işletme başvurusu
- [x] Vergi bilgileri kayıt formu
- [x] Bekleyen başvuru müşteri paneli
- [x] Yeni randevu animasyonlu uyarısı
- [x] Güncel Takvim + geçmiş randevu arşivi
- [x] Açılır/kapanır iş emri kategorileri
- [x] Okunabilirlik iyileştirmesi
- [x] Modern animasyonlu motosiklet ikonu
- [x] Otomatik ana Admin hesabı

## v0.8.5 — Usta Başvuruları ve Okunabilir Arayüz ✅

- [x] Usta adayı kaydı
- [x] İşletme arama ve Usta başvurusu
- [x] İşletme onayıyla otomatik Usta paneli
- [x] Usta davet koduyla doğrudan katılım
- [x] İşletme/Usta panel işlem ayrımı
- [x] Modern animasyonlu motosiklet simgesi
- [x] Genel tipografi iyileştirmesi
- [x] Temiz kullanıcı başlangıcı ve Ana Admin

## v0.9 — Google Play Uyum, Test ve Pilot

**Amaç:** Uygulamayı gerçek işletmede pilot test etmek ve mağazaya hazırlamak.

- Gizlilik politikası
- Uygulama içi gizlilik ekranı
- Hesap silme talebi
- Rol bazlı erişim denetimi
- Gereksiz izinleri kaldırma
- Leaked Password Protection ve yayın güvenliği
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
- Randevu ve müsaitlik
- Hızlı servis, bırakılan motor ve atölye sırası
- Ayrıntılı servis durumları
- Fiyat ve ek işlem onayı
- Nakit/IBAN ödeme
- Veresiye/alacak takibi
- Usta kişisel kayıtları ve işletme raporları
- Manuel parça kayıtları
- Platform hizmet bedeli ve ödeme onayı
- Canlı uygulama içi bildirimler ve yerel hatırlatmalar
- EAS development build üzerinde uzaktan push bildirim altyapısı
- Google Play uyum hazırlığı
- Android APK test çıktısı
- Google Play AAB hazırlığı

## v1.0 dışında kalanlar

- DraBornStyle bağlantısı
- DraBornRepair
- DraBornWash
- DraBornClinic
- Tam web sürümü
- Sanal POS, kart veya Google Play içi tamir ödemesi
- Usta maaş, prim, yüzde, komisyon veya ortaklık payı hesabı
- v1.1, v1.2, v2.0, v2.1 ve v3.0
