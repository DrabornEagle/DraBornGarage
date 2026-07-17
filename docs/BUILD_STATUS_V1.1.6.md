# DraBornGarage v1.1.6 Release APK Durumu

- Workflow: **DraBornGarage Release APK**
- Run ID: `29564294352`
- Durum: `completed`
- Sonuç: `success`
- Uygulama kaynak commit’i: `d08350d7895233a3ba239edd36f3a7748b611d6d`
- Artifact ID: `8400799344`
- Artifact: `DraBornGarage-v1.1.6-Production-APK`
- APK: `DraBornGarage-v1.1.6-production.apk`
- Android versionCode: `1`
- APK boyutu: `105,331,533 bytes`
- APK SHA-256: `618b80536d4f8390cbf7f468b8c8943ad192d02fe3e8a896d72fa8ca8b641d52`
- Artifact ZIP boyutu: `53,114,857 bytes`
- Artifact digest: `sha256:4340bc5f07b9b32d68c5fcb95068eaa89523104b0a712ac7f814dc063eca49bf`
- Upload sertifikası SHA-256: `61:69:5A:48:64:07:75:75:3A:0C:68:B1:8E:23:AC:34:56:FE:D5:AD:DE:50:E5:FF:92:BD:06:A4:6D:4D:EA:EE`
- APK Signature Scheme: `V2`
- GitHub Actions: https://github.com/DrabornEagle/DraBornGarage/actions/runs/29564294352
- Artifact saklama bitişi: `16 Ağustos 2026`

## v1.1.6 doğrulanan kapsam

- Uçak modu ve internet bağlantısı kontrolü
- Geçici FCM `SERVICE_NOT_AVAILABLE` hatalarında kademeli yeniden deneme
- Bağlantı geri geldiğinde otomatik token kaydı denemesi
- Eski ve yeni context’in aynı anda token istemesini engelleyen tek native kayıt yolu
- Bildirim Ayarlarında Bütün Bildirimleri Temizle
- Tümü sekmesinde ilk 4 bildirim ve her dokunuşta 10 yeni kayıt
- Daha yavaş, kısa ve normalize edilmiş Türkçe ses dosyaları
- Türkçe bildirim kanallarının v9 kimlikleri

## Başarılı kontroller

- Kaynak ve release secret doğrulaması
- Kalıcı production upload keystore doğrulaması
- Expo Doctor
- TypeScript
- Android JavaScript bundle
- Login recovery ve push sertleştirme
- Firebase Android yapılandırması
- Clean Android prebuild
- Production Release APK derlemesi
- Android lint
- Manifest ve yasak izin kontrolü
- Target SDK alt sınırı kontrolü
- APK V2 imza ve sertifika kontrolü
- SHA-256 ve boyut raporu

GitHub prerelease oluşturulmadı; test paketi Actions artifact olarak saklandı.
