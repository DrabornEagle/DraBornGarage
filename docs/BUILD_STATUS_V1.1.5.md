# DraBornGarage v1.1.5 Release APK Durumu

- Workflow: **DraBornGarage Release APK**
- Run ID: `29545813969`
- Durum: `completed`
- Sonuç: `success`
- Uygulama kaynak commit’i: `c820a2b2897ffe87f5e9276610ee35740da6528c`
- Artifact ID: `8394165017`
- Artifact: `DraBornGarage-v1.1.5-Production-APK`
- APK: `DraBornGarage-v1.1.5-production.apk`
- Android versionCode: `1`
- APK boyutu: `103,976,221 bytes`
- APK SHA-256: `f204e1af6efe07c5c098b188aee42a603b4d0a9404489201a592dbd9b9d911e2`
- Artifact ZIP boyutu: `52,565,914 bytes`
- Artifact digest: `sha256:fedb4e93cf85db4114a22c9d0b533629c1b70342b009170ee978e408e0bdc366`
- Upload sertifikası SHA-256: `61:69:5A:48:64:07:75:75:3A:0C:68:B1:8E:23:AC:34:56:FE:D5:AD:DE:50:E5:FF:92:BD:06:A4:6D:4D:EA:EE`
- APK Signature Scheme: `V2`
- Artifact saklama bitişi: `16 Ağustos 2026`

## Başarılı kontroller

- Expo Doctor
- TypeScript
- Android JavaScript bundle
- Push sertleştirme kaynak kontrolü
- Firebase Android istemci yapılandırması
- Clean Android prebuild
- Kalıcı production upload keystore
- Production Release APK derlemesi
- Android lint
- Manifest ve yasak izin kontrolü
- Target SDK alt sınırı kontrolü
- APK V2 imza ve sertifika kontrolü
- SHA-256 ve boyut raporu

## Canlı bildirim durumu

Supabase v1.1.5 migrationları uygulanmıştır. Expo push ticket yanıtı artık gerçek biçimde doğrulanır; başarısız teslimatlar `push_sent_at` olarak işaretlenmez. Atanmış Usta için bekleyen randevu aksiyon hatırlatmaları oluşturulmaktadır.

Canlı ticket doğrulaması, Expo/EAS projesindeki Android FCM V1 gönderici kimliğinin henüz yapılandırılmadığını `InvalidCredentials` yanıtıyla göstermiştir. Gerçek kapalı uygulama push teslimi için `docs/FCM_V1_SETUP.md` içindeki güvenli credential kurulumu tamamlanmalıdır. Bu anahtar repoya eklenmemelidir.

GitHub prerelease oluşturulmadı; test paketi Actions artifact olarak saklandı.
