# DraBornGarage v1.0.2 RC

**Tarih:** 15 Temmuz 2026  
**Aşama:** Expo test adayı — APK workflow'u manuel

## Arayüz

- Arka plan grid çizgileri kaldırıldı.
- Giriş ekranındaki `Pilot Test` kartı `Randevu` olarak değiştirildi.
- Android yazılım klavyesi `resize` düzenine geçirildi.
- Kayıt ve ortak/panel yönetimi formları klavye güvenli yapıldı.

## Yeni işletme

- Admin onayından sonra oluşturulan işletmede platform hizmet bedeli otomatik aktif olur.
- Varsayılan bedel Admin'in global tutarından alınır.
- Aylık ödeme günü 1–28 arasından otomatik seçilir.
- İşletme veya Admin ödeme ayarını daha sonra değiştirebilir.

## Ortaklık ve panel erişimi

- Kayıtta `Yeni İşletme` ve `Zaten Bir İşletmem Var` seçenekleri eklendi.
- Mevcut işletme kayıt öncesinde adla aranıp seçilebilir.
- `Ustayım` seçilirse İşletme Sahibi + Usta erişimi istenir.
- Başvuru işletmenin bütün aktif sahiplerine bildirilir.
- Sahip başvuruyu onaylayabilir veya reddedebilir.
- Ekip ekranından kullanıcı ad, telefon veya e-postayla aranabilir.
- Kullanıcıya yalnız İşletme Paneli, yalnız Usta Paneli veya ikisi birlikte açılabilir.
- Birden fazla sahip aynı İşletme Panelini görür.
- Usta erişimi bulunan her kişi yalnız kendi kişisel Usta Panelini ve kayıtlarını görür.

## Güvenlik

- Erişim talepleri RLS açık, doğrudan istemci erişimi kapalı tabloda tutulur.
- Kayıt ekranı yalnız aktif işletmelerin sınırlı genel bilgilerini arar.
- Kullanıcı arama ve erişim verme RPC'leri yalnız aktif işletme sahiplerince çalıştırılabilir.
- Anonim kullanıcı sahiplik ve ekip RPC'lerini çağıramaz.

## Canlı migrationlar

- `20260714232648_v1_0_2_workshop_access_core`
- `20260714232710_v1_0_2_owner_access_management`
- `20260714232731_v1_0_2_submit_access_request`
- `20260714232802_v1_0_2_grant_and_review_access`
- `20260714232820_v1_0_2_platform_fee_defaults`
- `20260714232847_v1_0_2_registration_partner_request`

Rollback: `supabase/rollbacks/rollback_v1_0_2_to_v1_0_1.sql`

## Expo test senaryosu

1. Yeni işletme başvurusu oluştur ve Admin ile onayla.
2. Platform ayarının otomatik açık ve ödeme gününün 1–28 arasında olduğunu doğrula.
3. İkinci kullanıcıyı `Zaten Bir İşletmem Var` seçeneğiyle kaydet.
4. İşletmeyi ara, seç ve `Ustayım` işaretle.
5. İlk sahipte bildirim ve Ekip → Ortak ve Panel Erişimi rozetini doğrula.
6. Başvuruyu onayla.
7. İkinci kullanıcıda aynı İşletme Paneli ile ayrı kişisel Usta Panelinin açıldığını doğrula.
8. Ekip ekranında üçüncü kullanıcıyı arayıp yalnız İşletme, yalnız Usta ve iki panel senaryolarını test et.
9. Klavye açıkken bütün aktif alanların görünür ve kaydırılabilir olduğunu kontrol et.
10. Arka planda grid çizgisi kalmadığını kontrol et.

Bu testler tamamlanmadan `DraBornGarage Release APK` workflow'u çalıştırılmaz.
