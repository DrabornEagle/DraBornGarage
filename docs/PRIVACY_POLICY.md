# DraBornGarage Gizlilik Politikası

**Yürürlük tarihi:** 14 Temmuz 2026  
**Sürüm:** 1.0 — DraBornGarage v0.9.0

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
- Bildirim: bildirim tercihleri, okundu/arşivlendi bilgisi ve zamanlı hatırlatmalar.
- Dosya: yalnız kullanıcı seçerse platform ödeme dekontu.
- Teknik güvenlik: oturum, kullanıcı kimliği, hata ve güvenlik denetimi için gerekli teknik kayıtlar.

DraBornGarage kredi kartı bilgisi veya uygulama içi tamir ödemesi toplamaz.

## 3. Verilerin kullanım amaçları

Veriler yalnız şu amaçlarla kullanılır:

- Hesap oluşturma ve güvenli oturum açma.
- Kullanıcıyı Admin, İşletme Sahibi, İşletme Sahibi + Usta, Usta, Çırak veya Müşteri rolüne göre yetkilendirme.
- Servis, randevu, müşteri, araç, parça ve ödeme kayıtlarını yönetme.
- Müşteri ile işletme arasındaki araç/servis bağlantısını doğrulama.
- Alacak ve platform hizmet bedeli takibi yapma.
- İlgili kullanıcıya uygulama içi veya yerel telefon bildirimi gösterme.
- Hata tespiti, güvenlik denetimi ve pilot test yürütme.
- Yasal yükümlülüklere uyma ve uyuşmazlıkları çözme.

Veriler reklam amacıyla satılmaz.

## 4. Rol bazlı erişim

- Admin, platform kapsamındaki işletme ve ödeme yönetimi alanlarına erişebilir.
- İşletme Sahibi yalnız yetkili olduğu işletmenin işletme ve rapor alanlarını görür.
- Usta yalnız kendi görev, servis, işlem ve kayıtlı tutar kapsamını görür.
- Çırak finansal alanlara erişemez ve yalnız izin verilen görev alanlarını görür.
- Müşteri yalnız kendi hesabına güvenli biçimde bağlanan araç ve servis kayıtlarını görür.
- İşletmeler birbirlerinin verilerine erişemez; erişim Supabase RLS ve güvenlik fonksiyonlarıyla sınırlandırılır.

## 5. Telefon izinleri

DraBornGarage yalnız gerekli izinleri ister:

- **Kamera:** servis QR kodu taramak için.
- **Fotoğraflar:** kullanıcı isterse platform ödeme dekontu seçmek için.
- **Bildirimler:** servis, randevu, alacak ve platform hatırlatmalarını göstermek için.

Konum, mikrofon, rehber, telefon araması ve SMS izinleri kullanılmaz ve Android yapılandırmasında engellenir.

## 6. Altyapı ve veri paylaşımı

Supabase; kimlik doğrulama, veritabanı, dosya depolama, erişim kontrolü ve canlı güncelleme altyapısı olarak kullanılır. Veriler yalnız hizmetin çalışması, güvenlik ve yasal gereklilikler kapsamında işlenir.

Yetkili servis işletmesi ve rol kapsamındaki personel, yalnız hizmetin yürütülmesi için gerekli verilere erişebilir.

## 7. Saklama ve silme

- Hesap ve operasyon verileri hesap aktif olduğu ve hizmet için gerektiği sürece saklanır.
- Hesap silme talebi uygulama içindeki **Gizlilik ve Hesap** merkezinden veya [Hesap Silme Açıklaması](ACCOUNT_DELETION.md) üzerinden başlatılabilir.
- Talepler en geç 30 gün içinde incelenir.
- Açık servis, alacak, işletme sorumluluğu veya yasal saklama zorunluluğu bulunan kayıtlar doğrudan silinmek yerine erişimi sınırlandırılarak gerekli süre boyunca tutulabilir.
- Silinmesi mümkün kişisel bağlantılar kaldırılır veya anonimleştirilir.

## 8. Güvenlik

- Supabase Auth ile kimlik doğrulama.
- Güçlü parola kuralı ve yaygın/sızdırılmış parola engeli.
- Rol bazlı erişim ve satır seviyesinde güvenlik.
- İşletme bazlı veri ayrımı.
- Private Storage ve imzalı dosya erişimi.
- Yayın öncesi rol, izin ve güvenlik denetimleri.

## 9. Kullanıcı hakları

Kullanıcılar hesaplarıyla ilgili bilgi, düzeltme, erişim sınırlandırma ve silme talebinde bulunabilir. Talep için uygulama içindeki gizlilik merkezini veya iletişim e-postasını kullanabilirsin.

## 10. Politika değişiklikleri

Politika güncellendiğinde yürürlük tarihi ve sürüm numarası değiştirilir. Önemli değişiklikler uygulama içinden duyurulur.
