# DraBornGarage — Google Play Veri Güvenliği Taslağı

Bu belge Play Console Veri Güvenliği formu doldurulurken kullanılacak teknik taslaktır. Nihai beyan, yayınlanan üretim paketi ve aktif hizmet sağlayıcılarıyla tekrar karşılaştırılmalıdır.

## Veri toplama özeti

| Veri türü | Toplanır mı? | Amaç | Zorunlu mu? |
|---|---:|---|---:|
| Ad soyad | Evet | Hesap ve servis kimliği | Evet |
| E-posta | Evet | Giriş, doğrulama ve hesap iletişimi | Evet |
| Telefon | Evet | Müşteri/işletme iletişimi ve eşleştirme | Role göre |
| Kullanıcı kimliği | Evet | Kimlik doğrulama ve rol erişimi | Evet |
| İşletme bilgileri | Evet | İşletme başvurusu ve servis yönetimi | İşletme için |
| Vergi bilgileri | Evet | İşletme doğrulama başvurusu | İşletme için |
| Araç/plaka bilgileri | Evet | Motosiklet ve servis takibi | Müşteri için |
| Randevu ve servis verileri | Evet | Temel uygulama işlevi | Evet |
| Ödeme/tahsilat kayıtları | Evet | Uygulama dışı Nakit/IBAN, alacak ve platform kayıt takibi | İşleme göre |
| Usta banka adı, hesap sahibi ve IBAN | İsteğe bağlı | Motor Hazır servisinde bağlı müşteriye harici transfer bilgisi göstermek | Hayır |
| Fotoğraf/dosya | İsteğe bağlı | Platform ödeme dekontu | Hayır |
| Uygulama etkileşimleri | Evet | Bildirim okundu/arşiv ve hata inceleme | İşleve göre |
| Expo push tokenı ve uygulama cihaz kimliği | İsteğe bağlı | Kullanıcı izin verirse cihaz bildirimini yönlendirme | Hayır |
| Uygulama sürümü ve cihaz platformu | Evet | Bildirim uyumluluğu ve hata inceleme | Bildirim özelliğinde |
| Konum | Hayır | Kullanılmıyor | Hayır |
| Mikrofon/ses kaydı | Hayır | Kullanılmıyor | Hayır |
| Rehber | Hayır | Kullanılmıyor | Hayır |
| SMS/arama geçmişi | Hayır | Kullanılmıyor | Hayır |
| Kredi kartı bilgisi | Hayır | Uygulama kartlı ödeme almaz | Hayır |

## Usta IBAN özelliğinin sınırı

- Özellik varsayılan olarak kapalıdır.
- Usta bilgiyi kendisi girer ve görünürlüğü kendisi açar.
- Bilgi yalnız ilgili Ustaya atanmış servis `Motor Hazır` durumundayken gösterilir.
- Yalnız onaylı biçimde bağlı müşteri kendi servisinde bilgiyi görebilir.
- Uygulama havale/EFT başlatmaz, banka hesabına bağlanmaz, para tutmaz ve ödeme işlemez.
- Play Console Veri Güvenliği formunda banka hesabı/finansal bilgi kategorisi, üretim özelliğiyle uyumlu biçimde isteğe bağlı toplanan veri olarak beyan edilmelidir.

## Veri paylaşımı ve hizmet sağlayıcılar

- Veriler reklam ağlarıyla paylaşılmaz ve satılmaz.
- Supabase kimlik doğrulama, veritabanı, depolama ve sunucu bildirim dağıtımı için kullanılır.
- Expo Push Service, yalnız bildirim izni veren cihazlara bildirim ulaştırmak için Expo push tokenını işler.
- Yetkili işletme ve rol kapsamındaki personel yalnız servis yürütmek için gerekli verilere erişir.
- Usta IBAN bilgisi yalnız Ustanın açtığı görünürlük kapsamında ve yalnız ilgili Motor Hazır servisinin bağlı müşterisine gösterilir.
- Yasal talep veya güvenlik zorunluluğu dışında üçüncü taraflara aktarım yapılmaz.

## Güvenlik uygulamaları

- Aktarım sırasında HTTPS/TLS.
- Supabase Auth oturumları.
- RLS ve rol tabanlı RPC kontrolleri.
- İşletme bazlı veri ayrımı.
- Usta IBAN ayarlarında oturum, işletme üyeliği ve Usta rolü doğrulaması.
- Müşteri IBAN erişiminde onaylı bağlantı, atanmış Usta ve Motor Hazır durumu doğrulaması.
- Push tokenlarında kullanıcı bazlı RLS ve devre dışı bırakma.
- Private Storage ve yetkili dosya erişimi.
- Güçlü parola kuralı ve yaygın parola engeli.
- Hesap silme talebi uygulama içinden sunulur.

## Hesap silme bağlantıları

- Gizlilik: `docs/PRIVACY_POLICY.md`
- Silme açıklaması: `docs/ACCOUNT_DELETION.md`
- Uygulama içi yol: Takvim veya Ayarlar/Hesabım sağ üst kalkan → Gizlilik ve Hesap → Hesap Silme Talebi Oluştur

## İzin açıklamaları

- Kamera yalnız QR tarama sırasında.
- Fotoğraf erişimi yalnız kullanıcı dekont seçtiğinde.
- Bildirim izni servis, randevu, alacak ve platform hatırlatmaları için.
- Kullanıcı bildirim sesini uygulama içinden değiştirebilir.
- Konum, mikrofon, rehber, SMS ve telefon izinleri Android yapılandırmasında engellenmiştir.
