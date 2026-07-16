# DraBornGarage Gizlilik Politikası

**Yürürlük tarihi:** 16 Temmuz 2026  
**Politika sürümü:** 1.3 — DraBornGarage v1.1.4

DraBornGarage; motosiklet ve araç servis işletmelerinin müşteri, servis, randevu, tahsilat, alacak ve platform hizmet bedeli süreçlerini yönetmesine yardımcı olan rol tabanlı bir mobil uygulamadır.

## 1. Veri sorumlusu ve iletişim

Gizlilik, veri erişimi veya hesap silme konuları için:

- E-posta: **draborneagle@gmail.com**
- Proje: **DraBornGarage**

## 2. İşlenen veriler

Uygulamadaki rolüne ve kullandığın özelliklere göre aşağıdaki veriler işlenebilir:

- Hesap: ad soyad, e-posta, telefon, profil ve hesap rolü.
- İşletme: işletme adı, telefon, adres, vergi dairesi, vergi numarası, üyelik ve personel rolleri.
- Müşteri ve araç: müşteri adı, telefon, plaka, marka, model, kilometre ve işletme bağlantıları.
- Servis: randevu, iş emri, teşhis, işlem, parça, fiyat, onay, durum ve servis geçmişi.
- Finansal kayıt: nakit/IBAN yöntemi, tahsilat, alacak/veresiye, ödeme sözü ve platform hizmet bedeli kayıtları.
- Usta ödeme bilgisi: Usta özelliği isteğe bağlı açarsa banka adı, hesap sahibi ve IBAN.
- Bildirim: bildirim tercihleri, okundu/arşivlendi bilgisi, push tokenı, cihaz kurulum kimliği ve zamanlı hatırlatmalar.
- Dosya: yalnız kullanıcı sistem fotoğraf seçicisinden tek bir dosya seçerse platform ödeme dekontu.
- Teknik güvenlik: oturum, kullanıcı kimliği, uygulama sürümü, cihaz platformu, hata ve güvenlik denetimi için gerekli teknik kayıtlar.

DraBornGarage kredi kartı bilgisi toplamaz, uygulama içinde tamir ödemesi işlemez, para tutmaz ve banka hesabına bağlanmaz.

## 3. Verilerin kullanım amaçları

Veriler yalnız şu amaçlarla kullanılır:

- Hesap oluşturma ve güvenli oturum açma.
- Kullanıcıyı Admin, İşletme Sahibi, İşletme Sahibi + Usta, Usta, Çırak veya Müşteri rolüne göre yetkilendirme.
- Servis, randevu, müşteri, araç, parça ve ödeme kayıtlarını yönetme.
- Müşteri ile işletme arasındaki araç/servis bağlantısını doğrulama.
- Alacak ve platform hizmet bedeli takibi yapma.
- Ustanın açık rızasıyla kaydettiği IBAN bilgisini yalnız kendisine atanmış ve Motor Hazır durumundaki servisin bağlı müşterisine göstermek.
- İlgili kullanıcıya uygulama içi, yerel veya uzaktan telefon bildirimi göstermek.
- Hata tespiti, güvenlik denetimi ve pilot test yürütmek.
- Yasal yükümlülüklere uymak ve uyuşmazlıkları çözmek.

Veriler reklam amacıyla satılmaz.

## 4. Motor Hazır IBAN görünürlüğü

- IBAN özelliği varsayılan olarak kapalıdır.
- Usta banka adı, hesap sahibi ve IBAN bilgisini kendisi girer ve görünürlüğü kendisi açar.
- Bilgi yalnız Ustaya atanmış servis `Motor Hazır` durumundayken gösterilir.
- Yalnız ilgili işletmeye onaylı biçimde bağlı müşteri kendi servisinde bilgiyi görebilir.
- Servis başka bir durumdaysa veya görünürlük kapalıysa IBAN gösterilmez.
- DraBornGarage havale/EFT başlatmaz; müşteri transferi kendi banka uygulamasında gerçekleştirir.

## 5. Rol bazlı erişim

- Admin, platform kapsamındaki işletme ve ödeme yönetimi alanlarına erişebilir.
- İşletme Sahibi yalnız yetkili olduğu işletmenin işletme ve rapor alanlarını görür.
- Usta yalnız kendi görev, servis, işlem, kayıtlı tutar ve kendi isteğe bağlı IBAN ayarını görür.
- Çırak finansal alanlara erişemez ve yalnız izin verilen görev alanlarını görür.
- Müşteri yalnız kendi hesabına güvenli biçimde bağlanan araç ve servis kayıtlarını görür.
- İşletmeler birbirlerinin verilerine erişemez; erişim Supabase RLS ve güvenlik fonksiyonlarıyla sınırlandırılır.

## 6. Telefon izinleri

DraBornGarage yalnız gerekli izinleri ister:

- **Kamera:** servis QR kodu taramak için.
- **Fotoğraf seçici:** kullanıcı isterse Android sistem seçicisinden tek bir platform ödeme dekontu seçmek için; geniş galeri/depolama erişimi istenmez.
- **Bildirimler:** servis, randevu, alacak ve platform hatırlatmalarını göstermek için.

Konum, mikrofon, rehber, telefon araması ve SMS izinleri kullanılmaz ve Android yapılandırmasında engellenir.

DraBornGarage telefonun genel bildirim ses düzeyini habersiz veya zorla değiştirmez. Bildirim kanalı sesi ve ses seviyesi Android kullanıcı ayarları tarafından yönetilir.

## 7. Altyapı ve veri paylaşımı

Supabase; kimlik doğrulama, veritabanı, dosya depolama, erişim kontrolü ve canlı güncelleme altyapısı olarak kullanılır. Expo Push Service yalnız bildirim izni veren cihazlara bildirim ulaştırmak için push tokenını ve rastgele oluşturulan uygulama kurulum kimliğini işler.

Yetkili servis işletmesi ve rol kapsamındaki personel yalnız hizmetin yürütülmesi için gerekli verilere erişebilir. İsteğe bağlı Usta IBAN bilgisi, yalnız yukarıdaki Motor Hazır koşulları gerçekleştiğinde ilgili müşteriyle paylaşılır.

## 8. Saklama ve silme

- Hesap ve operasyon verileri hesap aktif olduğu ve hizmet için gerektiği sürece saklanır.
- Usta IBAN görünürlüğünü istediği anda kapatabilir veya bilgilerini değiştirebilir.
- Hesap silme talebi uygulama içindeki **Gizlilik ve Hesap** merkezinden veya [Hesap Silme Açıklaması](ACCOUNT_DELETION.md) üzerinden başlatılabilir.
- Talepler en geç 30 gün içinde incelenir.
- Açık servis, alacak, işletme sorumluluğu veya yasal saklama zorunluluğu bulunan kayıtlar doğrudan silinmek yerine erişimi sınırlandırılarak gerekli süre boyunca tutulabilir.
- Silinmesi mümkün kişisel bağlantılar kaldırılır veya anonimleştirilir.
- Kullanıcının push tokenı ve uygulama kurulum kimliği hesap silme işlemi kapsamında silinir veya anonimleştirilir.

## 9. Güvenlik

- Supabase Auth ile kimlik doğrulama.
- Güçlü parola kuralı ve yaygın/sızdırılmış parola engeli.
- Rol bazlı erişim ve satır seviyesinde güvenlik.
- İşletme bazlı veri ayrımı.
- Usta IBAN ayarlarında oturum ve Usta rolü doğrulaması.
- Müşteri IBAN erişiminde onaylı müşteri–işletme bağlantısı ve Motor Hazır durumu doğrulaması.
- Private Storage ve imzalı dosya erişimi.
- Yayın öncesi rol, izin ve güvenlik denetimleri.

## 10. Kullanıcı hakları

Kullanıcılar hesaplarıyla ilgili bilgi, düzeltme, erişim sınırlandırma ve silme talebinde bulunabilir. Talep için uygulama içindeki gizlilik merkezini veya iletişim e-postasını kullanabilirsin.

## 11. Politika değişiklikleri

Politika güncellendiğinde yürürlük tarihi ve sürüm numarası değiştirilir. Önemli değişiklikler uygulama içinden duyurulur.
