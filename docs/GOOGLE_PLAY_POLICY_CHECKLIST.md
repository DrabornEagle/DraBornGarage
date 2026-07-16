# DraBornGarage — Google Play Yayın Öncesi Kontrolü

**Kontrol tarihi:** 16 Temmuz 2026  
**Geliştirme sürümü:** v1.1.4  
**İlk mağaza sürümü:** v1.0 / versionCode 1

## Kod tarafında tamamlananlar

- Kullanılmayan mikrofon, konum, rehber, arama, SMS ve geniş medya/depolama izinleri engellendi.
- Kamera donanımı zorunlu değildir; yalnız kullanıcı QR taramayı açtığında izin istenir.
- Dekont seçimi tek dosyalık Android sistem seçicisiyle yapılır.
- Uygulama içinde erişilebilir Gizlilik ve Hesap merkezi vardır.
- Kullanıcı uygulama içinden hesap silme talebi oluşturabilir ve talebi takip edebilir.
- Push tokenı, bildirim tercihi, isteğe bağlı dekont ve finansal kayıtların kullanım amaçları gizlilik politikasında açıklanır.
- APK/AAB workflow’ları yasak izin, imza, target SDK ve sürüm metadata kontrolleri yapar.
- Platform bedeli kullanıcı ödemesi olarak uygulama içinde tahsil edilmez; işletme ile Admin arasındaki kayıt/takip akışıdır.
- Uygulama telefonun genel bildirim sesini habersiz veya zorla yükseltmez; ses düzeyi ve kanal davranışı Android kullanıcı ayarına bırakılır.
- Pilot test araçları yalnız Admin rolüne görünür; üretim kullanıcılarının iş akışından gizlenir.

## Play Console’a girilecek herkese açık bağlantılar

- Gizlilik politikası: `https://github.com/DrabornEagle/DraBornGarage/blob/main/docs/PRIVACY_POLICY.md`
- Hesap ve veri silme: `https://github.com/DrabornEagle/DraBornGarage/blob/main/docs/ACCOUNT_DELETION.md`

Bu bağlantılar Play Console’a girilmeden önce çıkış yapılmış tarayıcıda açılıp herkese açık oldukları doğrulanmalıdır. Hesap silme sayfası uygulama adını, silme talebi yolunu ve uygulamaya erişemeyen kullanıcı için e-posta başvuru yöntemini içerir.

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

- 16 Temmuz 2026 itibarıyla yeni mobil uygulama ve güncellemelerde en az Android 15 / API 35 hedefi geçerlidir.
- **31 Ağustos 2026’dan itibaren** yeni mobil uygulama ve güncellemeler Android 16 / API 36 veya üstünü hedeflemelidir.
- İlk AAB 31 Ağustos 2026’dan önce alınacaksa workflow’daki API 35 alt sınırı uygundur.
- 31 Ağustos 2026 veya sonrasında AAB alınacaksa Expo/React Native araç zinciri API 36’ya yükseltilmeden production yüklemesi yapılmamalıdır.
- Gerekirse Play Console üzerinden 1 Kasım 2026’ya kadar uzatma yalnız Google’ın sunduğu uygun hesaplarda talep edilebilir; kalıcı çözüm API 36’dır.

## Yayın kapısı

**Kod tarafı yayın öncesi hazırdır; ancak aşağıdaki fiziksel cihaz ve Play Console adımları tamamlanmadan production AAB yüklenmez:**

1. Temiz kurulumda kayıt, giriş ve rol geçişleri.
2. v1.1.4 Release APK kurulduktan sonra Bildirim Merkezi’nde push cihaz kaydı durumunun **Kayıtlı** görünmesi ve Supabase’te en az bir etkin token oluşması.
3. Uygulama tamamen kapalıyken push bildirimi ve farklı kanal sesleri.
4. Bildirim izni reddetme/açma senaryoları.
5. Yüzde %10 ve sabit 50 TL platform bedeli örnek hesapları.
6. İşletmeye özel oran değişikliğinin yalnız yeni ücretlere uygulanması.
7. Hesap silme talebi ve harici sayfa bağlantıları.
8. APK/AAB manifest ve imza raporlarının temiz olması.
9. Play Console Veri Güvenliği beyanının gizlilik politikasıyla birebir eşleşmesi.
10. AAB’nin üretildiği tarihte yürürlükteki target API alt sınırının doğrulanması.
