# DraBornGarage v1.0.3 RC

**Tarih:** 15 Temmuz 2026  
**Aşama:** Expo Go test adayı — APK workflow'u manuel

## Tamamlananlar

- Kayıt ekranındaki `Zaten Bir İşletmem Var` seçeneği `İşletmem Var` olarak kısaltıldı.
- İşletmem Var seçeneğinin ikonu ve metni kartın merkezine hizalandı.
- Giriş ekranındaki `Rol Güvenliği` metni `Güvenli Hizmet` olarak değiştirildi.
- `Ortak ve Panel Erişimi` adı `İşletme ve Usta Erişimi` olarak değiştirildi.
- İşletme ve Usta Erişimi kartı yalnız `Ekip` kategorisinde gösterilecek şekilde taşındı.
- `Seçili İşletme` alanı `İşletmemi Güncelle` adında açılır/kapanır ana kategoriye dönüştürüldü.
- İşletmem Var ve Ustayım seçenekleriyle kayıt olan kullanıcı artık ilk girişte Müşteri Hesabı ile karşılanmaz.
- Üyeliği henüz onaylanmamış işletme/Usta başvuruları için ayrı `Başvurum` ekranı eklendi.
- Başvuru ekranında yeni işletme, mevcut işletme erişimi ve Usta başvurusu durumları gösterilir.
- `Hesabım` bölümünden isteğe bağlı olarak Müşteri Hesabına geçiş eklendi; başvuru kaydı korunur.
- Yeni personel kayıtlarında profil `account_mode` değeri başvuru tamamlanana kadar `staff` olarak tutulur.
- Geçmişte yanlışlıkla müşteri görünümüne düşen başvuru hesapları güvenli biçimde `staff` moduna taşındı.
- Uygulama sürümü `1.0.3`, Android `versionCode 20`, iOS `buildNumber 20` olarak eşitlendi.

## Supabase

- `customer_get_workshop_access_requests()` RPC'si eklendi.
- RPC yalnız oturum açmış kullanıcının kendi erişim başvurularını döndürür.
- `handle_new_user()` personel başvurularını müşteri modu yerine başvuru modunda oluşturacak şekilde güncellendi.
- Migration: `20260715024249_v1_0_3_application_entry.sql`
- Rollback: `rollback_v1_0_3_to_v1_0_2.sql`

## Expo test senaryosu

1. Yeni kullanıcı olarak `İşletme > İşletmem Var` seç.
2. Bir işletme bul, `Ustayım` seçeneğini aç ve kaydı tamamla.
3. İlk girişte Müşteri Hesabı yerine `Başvurum` ekranının açıldığını doğrula.
4. İşletme adı, istenen `İşletme + Usta` erişimi ve `Onay Bekliyor` durumunu kontrol et.
5. `Hesabım` bölümünden Müşteri Hesabına geçişi test et.
6. İşletme sahibi hesabında `Merkez > Ekip` sayfasını aç.
7. `İşletme ve Usta Erişimi` kartının yalnız Ekip kategorisinde göründüğünü doğrula.
8. Raporlar ve Platform kategorilerinde erişim kartının görünmediğini kontrol et.
9. `İşletmemi Güncelle` kategorisinin açılıp kapandığını ve bilgilerin kaydedilebildiğini doğrula.
10. Giriş ekranında `Güvenli Hizmet` ve `İşletmem Var` metinlerini kontrol et.

Bu testler tamamlanmadan `DraBornGarage Release APK` workflow'u çalıştırılmaz.
