# DraBornGarage v1.1.3 Release APK Durumu

- Workflow: **DraBornGarage Release APK**
- Run ID: `29526067770`
- Durum: `completed`
- Sonuç: `success`
- Uygulama kaynak commit’i: `10dc1f6e6c76e109de1f3f6203ba333084065759`
- Artifact ID: `8387059142`
- Artifact: `DraBornGarage-v1.1.3-Production-APK`
- APK: `DraBornGarage-v1.1.3-production.apk`
- Android versionCode: `1`
- APK boyutu: `97,540,954 bytes`
- APK SHA-256: `f3a840e6123a3bd077429868e1acf0cfac57abb7ed8f181de3a871bcd2d5c888`
- Artifact ZIP boyutu: `47,204,970 bytes`
- Artifact digest: `sha256:cd6e9ccc2ddfb31b3f366fb03a2a8814d9a78fe732309214cdb03afda308e0e6`
- Upload sertifikası SHA-256: `61:69:5A:48:64:07:75:75:3A:0C:68:B1:8E:23:AC:34:56:FE:D5:AD:DE:50:E5:FF:92:BD:06:A4:6D:4D:EA:EE`
- APK Signature Scheme: `V2`
- GitHub Actions: https://github.com/DrabornEagle/DraBornGarage/actions/runs/29526067770
- Artifact saklama bitişi: `15 Ağustos 2026`

## v1.1.3 düzeltmesi

- SDK 54 içinde ana `expo-notifications` export nesnesinde görünmeyen token yöntemleri yerine paket içindeki doğrulanmış doğrudan modüller kullanılır.
- `getDevicePushTokenAsync` doğrudan `expo-notifications/build/getDevicePushTokenAsync` yolundan çağrılır.
- `getExpoPushTokenAsync` doğrudan `expo-notifications/build/getExpoPushTokenAsync` yolundan çağrılır.
- Android gerçek FCM tokenı, EAS Project ID, uygulama paketi ve kalıcı cihaz kimliğiyle Expo push tokenına bağlanır.

## Başarılı kontroller

- Doğrudan Expo token modüllerinin paket içinde çözülmesi
- Expo Doctor
- TypeScript
- Android JavaScript bundle
- Login recovery ve push sertleştirme kontrolü
- Firebase Android yapılandırması
- Clean Android prebuild
- Kalıcı production upload keystore
- Production Release APK derlemesi
- Android lint
- Manifest ve yasak izin kontrolü
- Target SDK alt sınırı kontrolü
- APK V2 imza ve sertifika kontrolü
- SHA-256 ve boyut raporu

GitHub prerelease oluşturulmadı; test paketi Actions artifact olarak saklandı.
