# DraBornGarage v0.8.6

Tarih: 12 Temmuz 2026

## Giriş ve yönlendirme
- Normal kullanıcı artık giriş veya kayıt sonrasında eski “İşletme oluştur / Ekibe katıl” ara ekranına gönderilmez.
- Admin veya aktif işletme üyeliği olmayan her hesap doğrudan müşteri paneline açılır.

## Motoru işletmeye bağlama
- Kullanıcı bağlanmak istediği işletmeyi adına göre arar ve seçer.
- Plaka, marka, model ve telefon bilgileri seçilen işletmeye Usta onay talebi olarak gönderilir.
- İşletmede henüz müşteri veya motor kaydı yoksa Usta onayında güvenli biçimde oluşturulur.

## Bağlantısız randevu
- Randevu almak için işletmeye önceden bağlı olma şartı kaldırıldı.
- Kullanıcı randevuya açık işletmeyi arar, Ustayı, tarihi ve boş saati seçer.
- Randevu işletme/Usta takvimine düşer ve Usta panelinden onaylanabilir.
- Kullanıcı bütün işletmelerdeki kendi randevularını tek ekranda görür ve uygun durumdakileri iptal edebilir.

## QR ve manuel kod
- QR ekranına açık bir manuel servis/eşleştirme kodu alanı eklendi.
- Alan QR bağlantısı, UUID claim token veya 8 haneli servis takip kodunu kabul eder.
