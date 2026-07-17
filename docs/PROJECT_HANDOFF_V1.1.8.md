# DraBornGarage v1.1.8 Teslim ve Devam Notu

## Sürüm politikası

- Expo/Test APK geliştirme sürümü: `1.1.8`
- Android test `versionCode`: `1`
- Google Play ilk AAB: `versionName=1.0`, `versionCode=1`
- İlk Play yayınından sonra her mağaza güncellemesinde hem versionName hem versionCode artırılır.

## v1.1.8 kapsamı

- Ustanın oluşturduğu müşteri ve motosiklet için tek kullanımlık **Hesap Kayıt QR / Kod** kartı.
- Giriş ekranı → Kayıt Ol → Kullanıcı altında **Motor Bilgisi** ve **QR / Kod** seçenekleri.
- QR/Kod ile kayıt olan müşteri mevcut işletme müşteri/motosiklet kaydına otomatik bağlanır.
- İş emrinde seçilen `assigned_mechanic_id` kayıtlı iş tutarının tek sahibidir.
- İşletme raporu tüm Ustaların toplamını ve Usta kırılımını gösterir; servis işlemi İşletme Paneline ait sayılmaz.
- Kalıcı workflow envanteri yalnız `DraBornGarage Release APK` ve `DraBornGarage Release AAB` olarak korunur.

## Test sınırı

Expo Go ile arayüz, QR kamera, form doğrulama ve normal veri akışları test edilir. Uygulama kapalıyken remote push, özel Android ses kanalları ve gerçek release imzası yalnız yeni Test APK ile doğrulanır.

## Veritabanı

Migration: `supabase/migrations/20260717193000_v1_1_8_signup_link_and_mechanic_report_ownership.sql`

Rollback: `supabase/rollbacks/rollback_v1_1_8_to_v1_1_7.sql`
