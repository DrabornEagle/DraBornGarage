# DraBornGarage v0.9.3 — Changelog

**Tarih:** 14 Temmuz 2026  
**Başlık:** Motor Hazır IBAN ve Görsel Düzeltmeler

## Düzeltilenler

- Ayarlar ekranındaki sabit `v0.9.1` metinleri güncel sürümle eşitlendi.
- Bildirim Merkezi ve Takvim üzerindeki görünür sürüm etiketleri `v0.9.3` yapıldı.
- Gizlilik ve Hesap kalkan düğmesi daha büyük, daha belirgin ve dokunması kolay hâle getirildi.

## Motor Hazır IBAN

- Usta ve İşletme Sahibi + Usta hesaplarına kişisel IBAN ayarı eklendi.
- Usta, müşteri görünürlüğünü açıp kapatabilir.
- Banka adı, hesap sahibi ve Türk IBAN doğrulaması eklendi.
- IBAN yalnız ilgili Ustaya atanmış servis `Motor Hazır` durumundayken gösterilir.
- Yalnız servise onaylı bağlantısı bulunan müşteri bilgiyi okuyabilir.
- Servis teslim edildiğinde veya başka bir durumda IBAN kartı gösterilmez.
- Müşteri kartında Usta, banka, hesap sahibi, IBAN ve transfer açıklaması gösterilir.
- IBAN ve transfer açıklaması seçilebilir metin olarak sunulur.

## Ödeme sınırı

DraBornGarage:

- Kart işlemez.
- Banka hesabına bağlanmaz.
- Para tutmaz.
- Otomatik havale/EFT göndermez.
- Ödeme kuruluşu veya finansal hizmet sağlayıcısı değildir.

IBAN yalnız servis işletmesi ile müşteri arasında, uygulama dışında gerçekleştirilecek banka transferi için bilgi olarak gösterilir.

## Güvenlik

- IBAN alanları `workshop_members` üzerinde yalnız Ustanın kendi üyeliğine bağlıdır.
- Anonim erişim kapalıdır.
- Usta ayar RPC'leri oturum ve rolü yeniden doğrular.
- Müşteri RPC'si onaylı müşteri–işletme bağlantısını doğrular.
- Müşteri yalnız kendi bağlı servisinde ve yalnız `ready` durumunda bilgi alabilir.

## Sürüm

- Uygulama: `0.9.3`
- Android versionCode: `12`
- iOS buildNumber: `12`
- Önceki sürüm yedeği: `backup/v0.9.2-before-v0.9.3-20260714`
- Migration: `20260714123500_v0_9_3_ready_payment_details.sql`
- Rollback: `rollback_v0_9_3_to_v0_9_2.sql`
