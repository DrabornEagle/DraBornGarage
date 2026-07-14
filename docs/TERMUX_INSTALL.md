# Termux — DraBornGarage v0.9.1 Kurulum

## Temiz güncelleme

Aşağıdaki kodu Termux'a tek parça yapıştır:

```bash
set -e

REPO_URL="https://github.com/DrabornEagle/DraBornGarage.git"
APP_DIR="$HOME/DraBornGarage"
ENV_BACKUP="$HOME/.draborngarage-env-backup"
EXPECTED_VERSION="0.9.1"

pkg update -y
pkg install -y git nodejs-lts

rm -f "$ENV_BACKUP"
if [ -f "$APP_DIR/.env" ]; then
  cp "$APP_DIR/.env" "$ENV_BACKUP"
fi

rm -rf "$APP_DIR"
git clone --branch main --single-branch "$REPO_URL" "$APP_DIR"
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

Ardından EAS hesabıyla:

```bash
cd "$HOME/DraBornGarage"
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build --platform android --profile preview
```

Bu işlem özel WAV seslerini içeren test APK'sı üretir. APK fiziksel telefona kurulduktan sonra uygulama kapalıyken push testi yapılır.

## Production AAB

```bash
cd "$HOME/DraBornGarage"
npx eas-cli build --platform android --profile production
```

Production çıktısı Google Play'e yüklenecek AAB dosyasıdır.

## v0.9.0'a kod geri dönüşü

```bash
set -e

APP_DIR="$HOME/DraBornGarage"
TARGET_SHA="3d592a00aaab01a726bbd5333273c1b07f2b4005"
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

v0.9.1 ses ve push altyapısını kaldırmak için:

```text
supabase/rollbacks/rollback_v0_9_1_to_v0_9_0.sql
```

Bu rollback v0.9 gizlilik ve hesap silme altyapısını korur; yalnız v0.9.1 push tokenı, ses tercihi ve dağıtım nesnelerini kaldırır.
