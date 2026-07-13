# DraBornGarage v0.8.15

Tarih: 13 Temmuz 2026

## Tahsilat ana kategorisi
- Servis detayındaki ana finans kategorisinin adı `Tahsilat Kaydet` olarak değiştirildi.
- NAKİT, IBAN ve BORÇ olmak üzere üç belirgin seçim eklendi.
- Seçenek kartları ikonlu, daha okunaklı ve güncel durum vurgulu hale getirildi.

## Nakit ve IBAN
- Nakit ve IBAN için ayrı, modern tahsilat formları oluşturuldu.
- Kalan tutar, toplam ve ödenen tutar daha belirgin gösteriliyor.
- Kısmi ödeme desteği korunuyor.

## Borç / Veresiye
- Borç / Veresiye kartları yalnız BORÇ seçeneği altında gösteriliyor.
- Ödeme sözü tarihi, personel notu ve müşterinin göreceği not aynı akışta korunuyor.

## Otomatik teslim
- `Tahsilatı Kaydet` başarıyla tamamlandığında iş emri otomatik olarak `Teslim Edildi` olur.
- `Borç / Veresiye Yaz` başarıyla tamamlandığında iş emri otomatik olarak `Teslim Edildi` olur.
- Bu davranış yalnız ekranda değil, Supabase RPC fonksiyonlarında da güvenli şekilde uygulanır.
