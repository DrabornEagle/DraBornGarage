# DraBornGarage — Google Play Yayın Öncesi Kontrolü

**Kontrol tarihi:** 16 Temmuz 2026  
**Geliştirme sürümü:** v1.1.0  
**İlk mağaza sürümü:** v1.0 / versionCode 1

## Kod tarafında tamamlananlar

- Kullanılmayan mikrofon, konum, rehber, arama, SMS ve geniş medya/depolama izinleri engellendi.
- Kamera donanımı zorunlu değildir; yalnız kullanıcı QR taramayı açtığında izin istenir.
- Dekont seçimi tek dosyalık Android sistem seçicisiyle yapılır.
- Uygulama içinde erişilebilir Gizlilik ve Hesap merkezi vardır.
- Kullanıcı uygulama içinden hesap silme talebi oluşturabilir ve talebi takip edebilir.
- Gizlilik politikası ve hesap silme açıklaması herkese açık URL’de tutulur.
- Push tokenı, bildirim tercihi, isteğe bağlı dekont ve finansal kayıtların kullanım amaçları gizlilik politikasında açıklanır.
- APK/AAB workflow’ları yasak izin, imza, target SDK ve sürüm metadata kontrolleri yapar.

## Play Console’da manuel tamamlanacaklar

- Uygulama erişimi: test hesabı ve rol bazlı inceleme talimatları.
- Veri Güvenliği formu: ad/e-posta/telefon, müşteri-araç-servis verileri, finansal kayıtlar, push tokenı ve isteğe bağlı dekontla birebir uyumlu doldurulmalı.
- Gizlilik politikası URL’si eklenmeli.
- Hesap silme web URL’si eklenmeli.
- İçerik derecelendirme ve hedef kitle beyanı doldurulmalı.
- Reklam kullanılmadığı doğru biçimde beyan edilmeli.
- Finans özellikleri bölümünde uygulamanın ödeme işlemediği, yalnız kayıt/takip yaptığı belirtilmeli.
- Yeni kişisel geliştirici hesabı kapsamındaysa production erişiminden önce Google’ın zorunlu kapalı test süreci tamamlanmalı.

## Target SDK zaman çizgisi

- 16 Temmuz 2026 itibarıyla workflow en az API 35 hedefini doğrular.
- 31 Ağustos 2026 ve sonrasında yapılacak yeni uygulama/güncelleme yüklemelerinde Google Play’in o tarihte istediği API seviyesi yeniden kontrol edilmelidir; workflow alt sınırı gerektiğinde API 36’ya çıkarılacaktır.

## Yayın kapısı

Aşağıdakiler tamamlanmadan production AAB yüklenmez:

1. Temiz kurulumda kayıt, giriş ve rol geçişleri.
2. Uygulama tamamen kapalıyken push bildirimi ve farklı kanal sesleri.
3. Bildirim izni reddetme/açma senaryoları.
4. Yüzde %10 ve sabit 50 TL platform bedeli örnek hesapları.
5. İşletmeye özel oran değişikliğinin yalnız yeni ücretlere uygulanması.
6. Hesap silme talebi ve harici sayfa bağlantıları.
7. APK/AAB manifest ve imza raporlarının temiz olması.
8. Play Console Veri Güvenliği beyanının gizlilik politikasıyla birebir eşleşmesi.
