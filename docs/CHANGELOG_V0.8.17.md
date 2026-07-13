# DraBornGarage v0.8.17

Tarih: 14 Temmuz 2026

## Bildirim sesleri
- Garage Chime, Garage Pulse, Garage Alert ve Sessiz seçenekleri eklendi.
- Bildirim Merkezi > Ayarlar içinden ses değiştirilebilir.
- Android için her ses ayrı ve sürümlenmiş bildirim kanalında çalışır.
- Seçilen ses yerel, zamanlı ve native push bildirimlerine uygulanır.

## Uygulama kapalıyken bildirim
- Expo push tokenı native APK içinde otomatik kaydedilir.
- Supabase `pg_net` ile yeni bildirimleri Expo Push Service'e gönderir.
- `pg_cron` yaklaşan bildirimleri dakikalık olarak kontrol eder.
- Bildirime dokunma, uygulama kapalıyken açılışta da hedef sayfaya yönlendirir.

## İşletme ödemesi
- Bildirim başlığı `İşletmeden ödeme geldi` olarak netleştirildi.
- Tutar, işletme ve Admin onayı bilgisi daha güçlü vurgulanır.
- Bildirime dokunulduğunda Admin > Platform açılır, doğru işletme seçilir ve ödeme onay kartı üstte gösterilir.
- Ödeme Bildirimleri kategorisi otomatik açılır.

## Native test notu
- Android Expo Go, SDK 53 ve sonrasında uzaktan push desteklemez.
- Kapalı uygulama pushu ve özel ses testi EAS preview APK ile yapılır.
