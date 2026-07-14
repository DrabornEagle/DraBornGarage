# Termux — DraBornGarage v0.9.3 Kurulum

## Temiz güncelleme

Aşağıdaki kodu Termux'a tek parça yapıştır:

```bash
set -e

REPO_URL="https://github.com/DrabornEagle/DraBornGarage.git"
APP_DIR="$HOME/DraBornGarage"
ENV_BACKUP="$HOME/.draborngarage-env-backup"
EXPECTED_VERSION="0.9.3"

pkg update -y
pkg install -y git nodejs-lts

rm -f "$ENV_BACKUP"
if [ -f "$APP_DIR/.env" ]; then
  cp "$APP_DIR/.env" "$ENV_BACKUP"
fi

if [ ! -d "$APP_DIR/.git" ]; then
  rm -rf "$APP_DIR"
  git clone --branch main --single-branch "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"
git fetch origin --prune --tags
git checkout -f main
git reset --hard origin/main
git clean -ffdx

if [ -f "$ENV_BACKUP" ]; then
  mv "$ENV_BACKUP" "$APP_DIR/.env"
else
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"
fi

npm ci --no-audit --no-fund
npm run typecheck

CURRENT_VERSION="$(node -p "require('./package.json').version")"
CURRENT_SHA="$(git rev-parse HEAD)"

echo "Sürüm : $CURRENT_VERSION"
echo "Commit: $CURRENT_SHA"

if [ "$CURRENT_VERSION" != "$EXPECTED_VERSION" ]; then
  echo "HATA: Beklenen sürüm $EXPECTED_VERSION, bulunan $CURRENT_VERSION"
  exit 1
fi

npx expo start -c --go
```

## Sonraki açılışlar

```bash
cd "$HOME/DraBornGarage"
npx expo start -c --go
```

## Termux'ta çalıştırılmaması gereken kontrol

```bash
npm run test:bundle
```

Bu komut Expo'nun Hermes masaüstü derleyicisini kullanır. Termux Android host platformu desteklenmediği için hata verir. Android bundle kontrolü GitHub Actions üzerinde otomatik çalıştırılır.

## Motor Hazır IBAN testi

1. Usta veya İşletme Sahibi + Usta hesabıyla giriş yap.
2. Ayarlar → **Motor Hazır IBAN** bölümünü aç.
3. Banka adı, hesap sahibi ve TR IBAN bilgisini gir.
4. **Müşteriye göster** seçeneğini aç ve kaydet.
5. Ustaya atanmış bir servisi **Motor Hazır** durumuna al.
6. Bağlı müşteri hesabında Servisler → ilgili motor detayını aç.
7. Motor Hazır IBAN kartında Usta, banka, hesap sahibi ve IBAN görünmelidir.
8. Servis başka duruma alındığında kart görünmemelidir.

## Bildirim sesi testi

Expo Go içinde:

1. Bildirim Merkezi'ni aç.
2. **Ayarlar** sekmesine geç.
3. Garage Chime, Garage Pulse, Garage Alert veya Sessiz seç.
4. **Test Bildirimi Gönder** düğmesine dokun.

Expo Go'da yerel bildirim testi çalışır. Uygulama tamamen kapalıyken uzaktan push ve paketlenmiş özel ses için native APK gerekir.

## Native preview APK

Önce `.env` dosyasına EAS proje kimliği eklenir:

```env
EXPO_PUBLIC_EAS_PROJECT_ID=EAS_PROJE_KIMLIGI
```

Ardından:

```bash
cd "$HOME/DraBornGarage"
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build --platform android --profile preview
```

## Production AAB

```bash
cd "$HOME/DraBornGarage"
npx eas-cli build --platform android --profile production
```

## v0.9.2'ye kod geri dönüşü

```bash
set -e

APP_DIR="$HOME/DraBornGarage"
TARGET_SHA="8f2a5155bc5374f35dcbd098f3b46544bbcad852"
ENV_BACKUP="$HOME/.draborngarage-env-backup"

pkg update -y
pkg install -y git nodejs-lts

rm -f "$ENV_BACKUP"
if [ -f "$APP_DIR/.env" ]; then
  cp "$APP_DIR/.env" "$ENV_BACKUP"
fi

cd "$APP_DIR"
git fetch origin --prune --tags
git checkout -f main
git reset --hard "$TARGET_SHA"
git clean -ffdx

if [ -f "$ENV_BACKUP" ]; then
  mv "$ENV_BACKUP" "$APP_DIR/.env"
else
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"
fi

npm ci --no-audit --no-fund
npm run typecheck
npx expo start -c --go
```

## Supabase geri dönüşü

Kod geri dönüşü canlı veritabanını otomatik değiştirmez. Motor Hazır IBAN sütunlarını ve RPC'lerini de kaldırmak için:

```text
supabase/rollbacks/rollback_v0_9_3_to_v0_9_2.sql
```
