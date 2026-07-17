# DraBornGarage — Android Kapalı Uygulama Bildirimi / FCM V1

DraBornGarage Android uygulaması Firebase istemci yapılandırmasını (`google-services.json`) içerir. Ancak Expo Push Service üzerinden gerçek Android bildirimi göndermek için ayrıca Firebase **Service Account JSON** anahtarının EAS projesine yüklenmesi gerekir.

## Tespit edilen hata

Canlı push yanıtı:

```text
InvalidCredentials
Unable to retrieve the FCM server key for the recipient's app.
```

Bu durumda Expo push tokenı oluşturulur ve kapalı uygulama test kaydı hazırlanabilir; fakat gerçek randevu, müşteri bağlantısı ve servis push'ları FCM'e teslim edilemez.

## Güvenli kurulum

1. Firebase Console → Project Settings → Service Accounts.
2. **Generate New Private Key** ile JSON anahtarı oluştur.
3. JSON dosyasını GitHub'a, uygulama ZIP'ine veya herhangi bir herkese açık konuma ekleme.
4. Expo Dashboard → DraBornGarage projesi → Credentials → Android → `com.draborneagle.draborngarage`.
5. Service Credentials → **FCM V1 service account key** → Add/Upload.
6. JSON anahtarını yükle ve kaydet.

Termux/EAS CLI alternatifi:

```bash
cd "$HOME/DraBornGarage"
npx eas-cli@latest credentials -p android
```

Menü sırası:

```text
Android
production
Google Service Account
Manage your Google Service Account Key for Push Notifications (FCM V1)
Set up a Google Service Account Key for Push Notifications (FCM V1)
Upload a new service account key
```

## Doğrulama

Anahtar yüklendikten sonra:

1. v1.1.5 Production APK'yı temiz kur.
2. Bildirim Merkezi'nde telefonu push sistemine kaydet.
3. Başka bir müşteri hesabından yeni randevu oluştur.
4. Uygulamayı tamamen kapat.
5. Gerçek bildirimin gelmesini doğrula.
6. Bildirim Merkezi'ndeki sunucu teslim durumunun hata göstermediğini kontrol et.

`google-services.json` istemci kaydıdır; Service Account JSON ise sunucunun FCM V1 üzerinden bildirim gönderebilmesi için kullanılan gizli kimliktir. İkisi farklı dosyalardır.
