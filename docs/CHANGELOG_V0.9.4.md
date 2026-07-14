# DraBornGarage v0.9.4 — IBAN Ödeme Bildirimi ve Usta Onayı

**Tarih:** 14 Temmuz 2026

## IBAN Ayarları

- “Motor Hazır IBAN” başlığı “IBAN Ayarları” olarak değiştirildi.
- Usta ve İşletme Sahibi + Usta hesaplarında “Müşteriye göster” seçeneği varsayılan aktif hâle getirildi.
- Usta IBAN bilgisi yalnız geçerli banka adı, hesap sahibi ve TR IBAN ile kullanılabilir.
- IBAN bilgisi servisin atanmış Ustasına bağlıdır.

## Müşteriye IBAN gösterimi

Usta IBAN bilgisi aşağıdaki durumlardan birinde müşteriye gösterilir:

1. Servis **Motor Hazır** durumundadır ve kalan ödeme vardır.
2. Motosiklet teslim edilmiş olsa bile servis için **açık borç / veresiye** kaydı ve kalan ödeme vardır.

Müşteri yalnız kendi hesabına onaylı biçimde bağlı servis kaydının IBAN bilgisini görebilir.

## Ödemeyi Yaptım akışı

- Müşteri kendi banka uygulamasından IBAN transferini yapar.
- Servis detayından ödeme tutarını ve isteğe bağlı notunu girer.
- **Ödemeyi Yaptım • Ustaya Bildir** düğmesine dokunur.
- Bu işlem doğrudan tahsilat oluşturmaz ve borcu azaltmaz.
- Atanmış Ustaya acil ödeme bildirimi gönderilir.
- Aynı servis için aynı anda yalnız bir bekleyen ödeme bildirimi bulunabilir.

## Usta onayı

- Usta kendi Alacak ekranının üst kısmında yalnız kendisine atanmış bekleyen bildirimleri görür.
- Usta banka hesabını kontrol ederek bildirimi onaylar veya reddeder.
- Onayda IBAN tahsilatı `payments` tablosuna kaydedilir.
- Motor Hazır ödemesi `service`, açık veresiye ödemesi `receivable` tahsilat kaynağıyla kaydedilir.
- Kısmi ödeme kalan borcu azaltır ve alacağı açık bırakır.
- Tam ödeme kalan borcu sıfırlar ve mevcut finans tetikleyicisi borcu otomatik kapatır.
- Rette finansal kayıt değişmez.
- Müşteriye onay veya ret sonucu bildirilir.

## Güvenlik

- Yeni ödeme bildirim tablosunda RLS aktiftir ve istemcilere doğrudan tablo erişimi verilmez.
- Anonim kullanıcılar yeni RPC’leri çalıştıramaz.
- Müşteri–servis bağlantısı, kalan tutar ve servis durumu sunucu tarafında doğrulanır.
- Bildirilen tutar kalan borçtan fazla olamaz.
- Yalnız servise atanmış aktif Usta bildirimi sonuçlandırabilir.
- Onay satır kilidi ve tek transaction içinde yapılır; aynı bildirim iki kez onaylanamaz.

## Finansal hizmet sınırı

DraBornGarage banka hesabına bağlanmaz, kart işlemez, para tutmaz veya kullanıcı adına transfer göndermez. Müşteri transferi kendi banka uygulamasından yapar. Uygulamadaki bildirim yalnız Ustanın transferi kontrol ederek mevcut servis/alacak kaydını güncellemesi içindir.

## Sürüm

- Uygulama: `0.9.4`
- Android versionCode: `13`
- iOS buildNumber: `13`
- Yedek: `backup/v0.9.3-before-v0.9.4-20260714`
- Ana migration: `20260714104039_v0_9_4_customer_payment_confirmation.sql`
- Tahsilat kaynağı düzeltmesi: `20260714105549_v0_9_4_payment_report_collection_source_fix.sql`
- Rollback: `supabase/rollbacks/rollback_v0_9_4_to_v0_9_3.sql`
