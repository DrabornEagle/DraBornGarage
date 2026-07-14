# DraBornGarage — Google Play Kapalı Test Planı

## Hedef

v0.9.0 sürümünü gerçek cihazlarda, ayrı rollerle ve en az bir pilot işletmede doğrulamak; v1.0 AAB yayınından önce kritik hataları kapatmak.

## Test grubu

- Admin
- Pilot işletmenin en az iki sahibi
- En az iki Usta
- Bir Çırak
- En az üç Müşteri
- İşletmeye henüz bağlı olmayan bir yeni kullanıcı

## Dağıtım

1. Android paket adı: `com.draborneagle.draborngarage`
2. Sürüm: `0.9.0`
3. Android versionCode: `9`
4. Kapalı test kanalına AAB yükle.
5. Gizlilik politikası bağlantısını ekle.
6. Hesap silme bağlantısını ekle.
7. Veri Güvenliği formunu `GOOGLE_PLAY_DATA_SAFETY.md` ile karşılaştır.
8. Test kullanıcılarını e-posta listesine veya Google Group'a ekle.
9. Sürüm notunu `GOOGLE_PLAY_LISTING_TR.md` dosyasından kullan.

## Test süresi ve raporlama

- Her testçi en az iki ayrı gün uygulamayı kullanır.
- Her ana akış en az iki kez tamamlanır.
- Hata kaydında rol, cihaz, Android sürümü, adımlar, beklenen sonuç ve ekran görüntüsü bulunur.
- Kritik hata varsa yeni kapalı test yapısı hazırlanır.

## Kritik hata tanımı

- İşletmeler arası veri görünmesi
- Yanlış kullanıcıya finansal veri veya bildirim gitmesi
- Servis toplamı, borç veya platform bedelinin hatalı hesaplanması
- Hesap silme talebinin kaydolmaması
- Uygulamanın açılmaması veya veri kaybı
- Yetkisiz rolün Admin/işletme alanına erişmesi

## Yayın kapısı

v1.0 hazırlığına geçmek için:

- TypeScript ve Android bundle başarılı olmalı.
- Supabase migration uygulanmış ve rollback doğrulanmış olmalı.
- Kritik hata sayısı sıfır olmalı.
- Pilot checklist ana akışları tamamlanmış olmalı.
- Gizlilik ve hesap silme bağlantıları herkese açık olmalı.
- Play Console izin ve veri güvenliği beyanı üretim paketiyle eşleşmeli.
