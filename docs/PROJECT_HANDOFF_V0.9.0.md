# DraBornGarage v0.9.0 — Proje Devir Notu

## Sürüm özeti

v0.9.0, DraBornGarage'ı gerçek işletme pilotuna ve Google Play kapalı test hazırlığına taşıyan gizlilik, güvenlik, izin ve test sürümüdür.

## Kod durumu

- Ana geliştirme dalı: `feature/v0.9-google-play-pilot`
- Önceki kararlı commit: `6c7f238b8dd4928af83b96264a0668ccc67626b5`
- Önceki sürüm yedeği: `backup/v0.8.16-before-v0.9-20260714`
- Uygulama sürümü: `0.9.0`
- Android versionCode: `9`
- iOS buildNumber: `9`

## Canlı Supabase durumu

Proje: `DraBornGarage`

Uygulanan migration:

```text
20260714002755_v0_9_privacy_account_deletion_security
```

Eklenen ana nesneler:

- `public.account_deletion_requests`
- `account_privacy_status()`
- `account_request_deletion(text)`
- `account_cancel_deletion()`
- `account_role_access_snapshot()`
- `admin_get_account_deletion_requests()`
- `admin_update_account_deletion_request(uuid,text,text)`

Doğrulanan güvenlik sonuçları:

- RLS açık.
- Silme talebi tablosuna doğrudan anonim veya oturumlu istemci erişimi yok.
- Kullanıcı gizlilik RPC'leri yalnız oturumlu kullanıcıya açık.
- Admin fonksiyonları iç kontrol yapıyor.
- Dahili servis toplamı yardımcıları istemci RPC yüzeyinden kapalı.

## Geri alma

Kod:

```bash
git fetch origin --prune
git checkout -f main
git reset --hard 6c7f238b8dd4928af83b96264a0668ccc67626b5
git clean -ffdx -e .env -e .env.local
```

Veritabanı:

```text
supabase/rollbacks/rollback_v0_9_0_to_v0_8_16.sql
```

Rollback hesap silme tablosunu ve v0.9 RPC'lerini kaldırır. v0.9'da kapatılan dahili yardımcı RPC'ler güvenlik nedeniyle genel erişime tekrar açılmaz.

## Test komutları

```bash
npm ci --no-audit --no-fund
npm run typecheck
npm run test:bundle
```

Tek komut:

```bash
npm run test:release
```

## Pilot akışı

1. Ayarlar → Pilot Test Atölyesi.
2. Geçici pilot verilerini yükle.
3. `V0.9_PILOT_TEST_CHECKLIST.md` sırasıyla uygulanır.
4. Admin, İşletme Sahibi, Sahip + Usta, Usta, Çırak ve Müşteri ayrı hesaplarla test edilir.
5. Test sonrası geçici pilot verileri temizlenir.

## Yayın öncesi açık yürütme maddeleri

Bunlar kod eksikliği değil, dış sistem veya fiziksel yürütme maddeleridir:

- GitHub Actions kalite işlerinin yeşil sonucu.
- Fiziksel Android cihazlarda ayrı rol testleri.
- Gerçek pilot işletmede iki günlük kullanım.
- Play Console kapalı test AAB yüklemesi.
- Supabase Auth Dashboard'da yerleşik HaveIBeenPwned parola korumasının plan uygunluğu.

Bu maddeler tamamlanmadan sürüm `v1.0 mağaza yayını` olarak adlandırılmaz.
