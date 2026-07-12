# DraBornGarage v0.8.5

Tarih: 12 Temmuz 2026

## Usta üyeliği
- Yeni kayıtta **Usta Adayı** hesap seçeneği eklendi.
- Kullanıcı işletme adını arayıp Usta başvurusu gönderebilir.
- İşletme sahibi başvuruyu İşletme ve Ekip ekranından onaylar veya reddeder.
- Onaylanan hesabın aktif Usta üyeliği oluşturulur ve Usta paneli otomatik açılır.
- İşletmenin oluşturduğu tek kullanımlık Usta davet kodu ile başvuru beklemeden Usta paneline geçilebilir.

## İşletme ve Usta paneli
- Ana ekranda **Usta Panelim** solda, **İşletme Panelim** sağda gösterilir.
- Hızlı Servis ve Bırakılan Motor işlemleri yalnız Usta Panelim görünümünde gösterilir.
- İş Emirleri ekranındaki yeni servis düğmesi de yalnız Usta görünümünde aktiftir.

## Arayüz
- Bisiklet simgelerinin tamamı özel çizilmiş, daha gerçekçi ve animasyonlu motosiklet simgesiyle değiştirildi.
- Uygulama genelindeki çok küçük metinler okunabilirliği artıracak şekilde büyütüldü.

## Veritabanı ve güvenlik
- `mechanic_applications` tablosu, RLS politikaları ve güvenli RPC akışları eklendi.
- Başvuru, profil ve işletme üyeliği değişiklikleri Realtime ile panele yansır.
- İşletme başvurularını yalnız ilgili işletme sahibi veya Admin görebilir ve sonuçlandırabilir.
- `draborneagle@gmail.com` otomatik Ana Admin kuralı korunur.
