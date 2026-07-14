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
| Ödeme/tahsilat kayıtları | Evet | Nakit/IBAN, alacak ve platform takibi | İşleme göre |
| Fotoğraf/dosya | İsteğe bağlı | Platform ödeme dekontu | Hayır |
| Uygulama etkileşimleri | Evet | Bildirim okundu/arşiv ve hata inceleme | İşleve göre |
| Konum | Hayır | Kullanılmıyor | Hayır |
| Mikrofon/ses | Hayır | Kullanılmıyor | Hayır |
| Rehber | Hayır | Kullanılmıyor | Hayır |
| SMS/arama geçmişi | Hayır | Kullanılmıyor | Hayır |
| Kredi kartı bilgisi | Hayır | Uygulama kartlı ödeme almaz | Hayır |

## Veri paylaşımı

- Veriler reklam ağlarıyla paylaşılmaz.
- Supabase veri işleme altyapısı olarak kullanılır.
- Yetkili işletme ve rol kapsamındaki personel yalnız servis yürütmek için gerekli verilere erişir.
- Yasal talep veya güvenlik zorunluluğu dışında üçüncü taraflara aktarım yapılmaz.

## Güvenlik uygulamaları

- Aktarım sırasında HTTPS/TLS.
- Supabase Auth oturumları.
- RLS ve rol tabanlı RPC kontrolleri.
- İşletme bazlı veri ayrımı.
- Private Storage ve yetkili dosya erişimi.
- Güçlü parola kuralı ve yaygın parola engeli.
- Hesap silme talebi uygulama içinden sunulur.

## Hesap silme bağlantıları

- Gizlilik: `docs/PRIVACY_POLICY.md`
- Silme açıklaması: `docs/ACCOUNT_DELETION.md`
- Uygulama içi yol: sol üst kalkan → Gizlilik ve Hesap → Hesap Silme Talebi Oluştur

## İzin açıklamaları

- Kamera yalnız QR tarama sırasında.
- Fotoğraf erişimi yalnız kullanıcı dekont seçtiğinde.
- Bildirim izni servis/randevu hatırlatmaları için.
- Konum, mikrofon, rehber, SMS ve telefon izinleri Android yapılandırmasında engellenmiştir.
