# DraBornGarage v0.9 — Yayın Güvenliği

## Parola koruması

Uygulama yeni hesap kayıtlarında şu kontrolleri uygular:

- En az 10 karakter
- Büyük harf
- Küçük harf
- Rakam
- Özel karakter
- E-posta kullanıcı adını içermeme
- Aşırı tekrar eden karakterleri reddetme
- Yaygın ve sızdırılmış parola örneklerini yerel engel listesiyle reddetme

Mevcut kullanıcıların giriş uyumluluğu korunur; yeni güçlü parola kuralı yalnız yeni kayıt akışında uygulanır.

## Supabase yerleşik Leaked Password Protection

Supabase Auth'un HaveIBeenPwned tabanlı yerleşik Leaked Password Protection özelliği Dashboard ve plan ayarıdır. Mevcut bağlantı araçları bu proje ayarını değiştirmediği için v0.9'da aşağıdaki yaklaşım kullanılır:

- Uygulama tarafı yaygın/sızdırılmış parola engeli aktiftir.
- Yerleşik Supabase anahtarı Play kapalı test hesabının planında Dashboard üzerinden doğrulanmalıdır.
- Yerleşik koruma açıldığında uygulama tarafındaki kontrol ek savunma katmanı olarak kalır.

Bu nedenle belgelerde yerleşik Supabase korumasının açıldığı iddia edilmez.

## Veritabanı güvenliği

- Public şemadaki yeni silme talebi tablosunda RLS açıktır.
- Tabloya istemci rollerinden doğrudan erişim verilmez.
- Kullanıcı işlemleri kontrollü, kimlik doğrulayan RPC'lerden geçer.
- Admin işlemleri RPC içinde Admin rolünü tekrar doğrular.
- Hassas dahili toplam ve bakım fonksiyonlarının `PUBLIC`, `anon` ve `authenticated` çağrı yetkisi kaldırılmıştır.
- İstemcinin kullanması gereken platform fonksiyonları yalnız `authenticated` role verilmiştir.

## Mobil izin güvenliği

Kullanılan izinler:

- Kamera: QR tarama
- Fotoğraf seçimi: isteğe bağlı ödeme dekontu
- Bildirim: servis ve randevu hatırlatmaları

Engellenen izinler:

- Mikrofon
- Hassas ve yaklaşık konum
- Rehber okuma/yazma
- Telefon arama
- Telefon durumu
- SMS okuma/gönderme

## Gizlilik ve silme

- Her oturum açmış kullanıcı uygulama içi gizlilik merkezine erişir.
- Kullanıcı kendi silme talebini oluşturabilir ve bekleyen talebini iptal edebilir.
- Admin talep durumunu kontrollü RPC ile yönetir.
- Açık servis, finansal kayıt veya yetki devri bulunan hesaplar otomatik ve kontrolsüz silinmez.
- Silme süresi ve saklama istisnaları kullanıcıya gösterilir.

## Yayın kalite kapısı

- TypeScript kontrolü
- Android JavaScript bundle kontrolü
- Migration ve rollback
- Rol bazlı negatif test matrisi
- Fiziksel Android pilotu
- Google Play Veri Güvenliği beyanı
- Gizlilik ve hesap silme bağlantıları
