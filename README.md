# DraBornGarage

Motosiklet ve oto servis işletmeleri için çok işletmeli, rol tabanlı servis, müşteri, randevu, araç, alacak, raporlama, platform hizmet bedeli ve bildirim sistemi.

## Güncel geliştirme sürümü

**v1.1.5 — Gerçek Push Teslimi, Aksiyon Popup ve Canlı Yenileme**

- Geliştirme/test sürümleri: `v1.1.0`, `v1.1.1`, `v1.1.2`, `v1.1.3`, `v1.1.4`, ardından `v1.1.5`…
- AAB alınana kadar Android `versionCode` sabit: `1`
- Expo: küçük arayüz ve işlev testleri
- Native bildirim ve gerçek cihaz testleri: **DraBornGarage Release APK**
- Google Play paketi: **DraBornGarage Release AAB**
- İlk Google Play yayını: uygulama `versionName` **1.0**, `versionCode` **1**
- İlk Play yayınından sonra her mağaza güncellemesinde hem sürüm hem `versionCode` artırılır.

## v1.1.6 düzeltmeleri

- `SERVICE_NOT_AVAILABLE` için bağlantı ve uçak modu kontrolü eklendi.
- FCM cihaz tokenı kademeli beklemeyle dört kez yeniden denenir; bağlantı geri geldiğinde kayıt otomatik tekrarlanır.
- Bildirim Ayarlarına Bütün Bildirimleri Temizle eklendi.
- Tümü sekmesi ilk 4 bildirimi gösterir; her Daha Fazla dokunuşunda 10 bildirim daha açılır.
- Türkçe konuşma cümleleri kısaltıldı, hız düşürüldü ve ses temizleme/normalizasyon uygulandı.
- Türkçe ses kanalları v9'a taşındı.
- Yedek dalı: `backup/v1.1.5-before-v1.1.6-20260717`.

## v1.1.5 düzeltmeleri

- Expo push HTTP isteğinin yalnız kuyruğa alınması artık teslim edildi sayılmaz; Expo ticket yanıtları ayrı tabloda doğrulanır.
- `InvalidCredentials` gibi FCM V1 hataları Bildirim Merkezi'nde görünür ve sahte `push_sent_at` kaydı oluşturmaz.
- Atanmış Ustaya müşteri randevusu beklediği sürece 5 dakikada bir aksiyon bildirimi hazırlanır.
- Uygulama açıldığında yeni randevu ve müşteri eşleştirme talebi için modern yönlendirme popup'ı açılır.
- Zil önizlemesi Android bildirim kanalına bağlı kalmadan `expo-audio` ile doğrudan çalınır.
- Türkçe Sesli Uyarı seçeneği eklendi; randevu, müşteri bağlantısı, servis ve ödeme için ayrı sabit Türkçe ses dosyaları kullanılır.
- Rapor Merkezi'nde Usta Raporu ve İşletme Raporu kartlarının sırası değiştirildi.
- Hemen Başla servis kayıtlarında `started_at` ilk kayıtta yazılır.
- Servis, randevu, müşteri, motosiklet ve eşleştirme işlemlerinden sonra ortak veri yenileme olayı gönderilir.
- Geri alma dalı: `backup/v1.1.4-final-before-v1.1.5-20260717-02`.

## v1.1.4 düzeltmeleri

- Expo servisinin kabul ettiği RFC 4122 UUID biçiminde kalıcı cihaz kimliği oluşturulur; eski geçersiz `garage-...` kimliği temizlenir.
- Android bildirim kanalları v7 kimlikleriyle oluşturulur; yüksek önem ve güçlü titreşim korunur.
- Ses seçildiğinde seçilen kanal anında önizlenir.
- Bildirim Sesi ve Bildirim Tercihleri ana açılır/kapanır kategorilere dönüştürülür.
- Telefonun genel ses seviyesi habersiz değiştirilmez; kullanıcı doğrudan Android bildirim ayarına yönlendirilir.
- Pilot Test Atölyesi yalnız Admin’e görünür; işletme sahibi ve usta hesaplarında Müşteri Görünümüne Geç kartı gösterilmez.
- Müşteri Hafızası ve Müşteriler ekranı ilk 4 kaydı gösterir; her Daha Fazla dokunuşunda 10 kayıt daha açılır.
- Güncel geri alma noktası `backup/v1.1.3-before-v1.1.4-20260716` olarak tanımlanır.

## v1.1.3 düzeltmeleri

- Expo SDK 54 içindeki `getDevicePushTokenAsync` ve `getExpoPushTokenAsync` modülleri paket ana export nesnesi yerine doğrudan yüklenir.
- APK içinde bulunan native `ExpoPushTokenManager` sınıfına doğrudan SDK modülü üzerinden erişilir.
- Android FCM tokenı biçim ve uzunluk açısından doğrulandıktan sonra Expo push tokenı oluşturulur.
- Token kaydı aşamaları ayrı hata mesajlarıyla gösterilir: izin, FCM, Expo servisi ve Supabase kaydı.
- Fiziksel cihazdaki `getDevicePushTokenAsync kullanılamıyor` ana-export hatası kaldırılır.

## v1.1.2 düzeltmeleri

- Android’in gerçek FCM cihaz tokenı alınarak Expo push tokenına açıkça bağlanır.
- Uygulama kapalıyken bildirim için cihaz kaydı yeniden tasarlandı ve aşama bazlı hata gösterimi eklendi.
- Zil sesi seçildiğinde seçilen kanal bir saniyelik bildirimle otomatik önizlenir.
- `owner_mechanic` rolündeki işletme ortakları yeni müşteri randevusu, saat değişikliği ve durum bildirimlerini alır.
- Atanmış usta aynı zamanda işletme ortağıysa aynı randevu hareketi çift bildirim oluşturmaz.
- Kaçırılmış aktif müşteri randevularının işletme sahibi bildirimleri yeniden oluşturuldu.

## v1.1.1 düzeltmeleri

- Android bildirim izni açma akışındaki native yöntem hatası giderildi.
- Tüm zil sesleri Supabase tercih kaydında kabul edilir.
- Android bildirim kanalları temiz `v6` kimlikleriyle yeniden oluşturulur.

## v1.1.0 ile yapılanlar

- Native APK’da Expo push tokenı kaydını engelleyen ortam kapısı düzeltildi.
- Push kayıt hatası Bildirim Merkezi’nde görünür ve yeniden denenebilir hale getirildi.
- Uygulama kapalı testinden önce cihaz tokenı sunucuda doğrulanıyor.
- Android’in değiştirilemeyen kanal davranışı nedeniyle yeni `v5` kanal kimlikleri oluşturuldu.
- Telefonun varsayılan sesi ve birbirinden gerçekten farklı dokuz özel bildirim sesi eklendi.
- Platform hizmet bedeline yüzde ve sabit tutar seçenekleri eklendi.
- Genel varsayılan yüzde `%10`; sabit seçenek için varsayılan `50 TL`.
- Admin her işletme için ayrı yüzde veya sabit bedel belirleyebilir.
- Eski ücret kayıtları korunur; yeni ayar yalnız yeni oluşan ücretlere uygulanır.
- Geniş fotoğraf/depolama izinleri engellenerek dekont seçimi sistem seçicisine bırakıldı.
- README, teslim/devam belgesi, gizlilik ve Google Play kontrol listesi güncellendi.

## Ana roller

- **Admin:** tüm işletmeler, başvurular, platform ayarları ve ödeme onayları
- **İşletme Sahibi:** yetkili olduğu işletmenin ortak işletme paneli ve ekip yönetimi
- **İşletme Sahibi + Usta:** ortak işletme paneli ve yalnız kendi Usta paneli
- **Usta:** atanmış işler, kişisel geçmiş ve kendi kaydettiği tutarlar
- **Çırak:** kısıtlı görev görünümü; finansal alanlar kapalı
- **Müşteri:** güvenli biçimde bağlı motor, servis, randevu ve borç kayıtları

## Test ve yayın komutları

```bash
npm ci --no-audit --no-fund
npm run typecheck
npm run test:bundle
npx expo start -c --go
```

Native test APK ve Google Play AAB yalnız GitHub Actions içindeki iki manuel workflow ile üretilir.

## Belgeler

- [Güncel teslim ve devam belgesi](docs/PROJECT_HANDOFF_V0.8.2.md)
- [Google Play politika kontrolü](docs/GOOGLE_PLAY_POLICY_CHECKLIST.md)
- [Android FCM V1 kurulumu](docs/FCM_V1_SETUP.md)
- [Gizlilik Politikası](docs/PRIVACY_POLICY.md)
- [Hesap ve Veri Silme](docs/ACCOUNT_DELETION.md)
