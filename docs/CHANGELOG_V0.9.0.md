# DraBornGarage v0.9.0 — Changelog

**Tarih:** 14 Temmuz 2026  
**Başlık:** Google Play Uyum, Test ve Pilot

## Yeni özellikler

- Bütün oturum açmış kullanıcılar için uygulama içi **Gizlilik ve Hesap** merkezi.
- Hesap silme talebi oluşturma, durum görüntüleme ve bekleyen talebi iptal etme.
- Admin için hesap silme taleplerini listeleme ve durum/not güncelleme RPC'leri.
- Rol, üyelik ve temel yetenek özetini gösteren erişim denetimi.
- Ayarlar içinde v0.9 pilot veri yükleme, temizleme ve test merkezi.
- Yeni kayıtlar için güçlü parola politikası ve yaygın/sızdırılmış parola engeli.

## Güvenlik

- `account_deletion_requests` tablosu RLS ile korundu.
- Hesap silme tablosunun doğrudan istemci erişimi kapatıldı; işlemler kontrollü RPC üzerinden yürütülüyor.
- Gizlilik RPC'leri yalnız `authenticated` role açıldı.
- Admin RPC'leri sunucu tarafında `is_admin()` kontrolü yapıyor.
- Hassas dahili `SECURITY DEFINER` yardımcılarının genel çağrı yetkileri kaldırıldı.
- Platform detay fonksiyonlarının anonim erişimi kaldırıldı.
- Android'de mikrofon, konum, rehber, telefon ve SMS izinleri engellendi.

## Uygulama arayüzü

- Sol üstte tüm rollere açık gizlilik kalkanı eklendi.
- Gizlilik ekranında veri grupları, izinler, paylaşım ve saklama bilgileri gösteriliyor.
- Giriş/kayıt ekranı v0.9 pilot ve rol güvenliği mesajlarıyla güncellendi.
- Ayarlar ekranı pilot, yayın güvenliği ve uygulama bilgileriyle sadeleştirildi.

## Google Play hazırlığı

- Türkçe gizlilik politikası.
- Uygulama dışı hesap silme açıklaması.
- Google Play Veri Güvenliği taslağı.
- Türkçe kısa ve tam mağaza açıklaması.
- Kapalı test planı ve kritik hata kabul kriterleri.
- Ayrıntılı gerçek rol/pilot kontrol listesi.

## Teknik

- Uygulama sürümü `0.9.0`.
- Android `versionCode`: `9`.
- iOS `buildNumber`: `9`.
- `npm run test:release` kalite komutu.
- GitHub Actions üzerinde TypeScript ve Android bundle kalite kapısı.
- Canlı Supabase migration: `20260714002755_v0_9_privacy_account_deletion_security.sql`.
- Rollback: `rollback_v0_9_0_to_v0_8_16.sql`.
- Yedek: `backup/v0.8.16-before-v0.9-20260714`.

## Bilinen yayın sınırı

v0.9 kapalı test ve pilot hazırlık sürümüdür. Fiziksel cihaz pilotu, Play Console'a AAB yükleme ve mağaza kapalı test sürecinin fiilen tamamlanması v1.0 yayın kapısında takip edilir.
