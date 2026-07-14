# DraBornGarage v0.9.1 — Changelog

**Tarih:** 14 Temmuz 2026  
**Başlık:** Takvim, Bildirim Sesi, Push ve Ödeme Odağı

## Arayüz

- Ayarlar ekranındaki sağ üst bildirim zili kaldırıldı.
- Gizlilik ve Hesap kalkanı yalnız Takvim ile Ayarlar/Hesabım ekranında gösteriliyor.
- Kalkan simgesi sağ üst köşeye taşındı.
- Takvim, Randevu Ekle ve Çalışma Saatleri seçimi modern açıklamalı kartlara dönüştürüldü.

## Bildirimler

- Garage Chime, Garage Pulse, Garage Alert ve Sessiz seçenekleri eklendi.
- Bildirim Merkezi ayarlarından ses seçme ve test etme eklendi.
- Android bildirim kanalları seçilen sese göre ayrıldı.
- Native APK/AAB içinde özel WAV sesleri paketleniyor.
- Expo push token kaydı ve Supabase push dağıtım altyapısı eklendi.
- Uygulama kapalıyken gelen bildirimlerin native build üzerinde sesli çalışması hazırlandı.

## Ödeme bildirimi

- İşletmeden ödeme geldi bildirimi daha güçlü metin ve görsel vurgu aldı.
- Bildirime dokunulduğunda doğru işletme seçiliyor.
- Admin doğrudan Platform Ödeme Merkezi'ndeki ilgili onay kartına yönlendiriliyor.
- İlgili ödeme kartı yeşil çerçeve ve “İŞLETMEDEN ÖDEME GELDİ” alanıyla vurgulanıyor.

## Google Play

- Mağaza kategorisi Auto & Vehicles olarak düzenlendi.
- Uygulamanın finansal hizmet veya ödeme kuruluşu olmadığı açıklandı.
- Kişisel/kuruluş geliştirici hesabı seçiminin yayıncının gerçek durumuna göre yapılması belgelendi.

## Teknik

- Uygulama sürümü: `0.9.1`
- Android versionCode: `10`
- iOS buildNumber: `10`
- Önceki sürüm yedeği: `backup/v0.9.0-before-v0.9.1-20260714`
- Supabase migration: `v0_9_1_push_sounds_payment_focus`

## Native test notu

Expo Go üzerinde arayüz ve uygulama açıkken yerel bildirim testi yapılabilir. Uygulama kapalıyken uzaktan push ve pakete eklenmiş özel ses için EAS preview veya production build gereklidir.
