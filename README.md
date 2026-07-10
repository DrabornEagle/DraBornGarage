# DraBornGarage

Motosiklet servisleri için modern, rol tabanlı işletme ve usta yönetim uygulaması.

## v0.1 kapsamı

- İşletme sahibi ve usta hesapları
- Aynı işletmede birden fazla ortak işletme sahibi
- Her usta için yalnız kendi işlerini ve kaydedilen işlem tutarlarını gösteren özel panel
- Müşteri ve motosiklet yönetimi
- Servis kabulü ve iş emri yaşam döngüsü
- Yapılan işlemler, kullanılan parçalar ve tahsilatlar
- İşletme toplamları ve usta bazlı detaylar
- Supabase Auth, PostgreSQL ve Row Level Security
- Expo SDK 54 / Expo Go

> Usta bazlı tutarlar maaş, komisyon, net kâr veya ortaklık payı değildir. Sistem yalnızca servis kayıtlarına girilen işlem tutarlarını toplar.

## Çalıştırma

```bash
cp .env.example .env
npm install
npx expo start -c --go
```

Termux için yalnız ZIP kullanan kopyala-yapıştır kurulum: [`docs/TERMUX_INSTALL.md`](docs/TERMUX_INSTALL.md)

## Kontroller

```bash
npm run typecheck
npm run test:bundle
```

## Proje belgeleri

- [`docs/V0.1_CHECKLIST.md`](docs/V0.1_CHECKLIST.md)
- [`docs/ROADMAP.md`](docs/ROADMAP.md)
- [`supabase/migrations/20260710170000_init_v0_1.sql`](supabase/migrations/20260710170000_init_v0_1.sql)

APK/AAB üretimi v1.0 aşamasına planlanmıştır.
