# Termux — v0.9.0 Temiz Kurulum ve v0.8.16 Geri Dönüş

## v0.9.0 temiz kurulum

Aşağıdaki kodu Termux'a tek parça yapıştır:

```bash
set -e

REPO_URL="https://github.com/DrabornEagle/DraBornGarage.git"
TARGET_BRANCH="main"
EXPECTED_VERSION="0.9.0"
APP_DIR="$HOME/DraBornGarage"
ENV_BACKUP="$HOME/.draborngarage-env-backup"

pkg update -y
pkg install -y git nodejs-lts

rm -f "$ENV_BACKUP"
if [ -f "$APP_DIR/.env" ]; then
  cp "$APP_DIR/.env" "$ENV_BACKUP"
fi

rm -rf "$APP_DIR"
git clone --branch "$TARGET_BRANCH" --single-branch "$REPO_URL" "$APP_DIR"
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
npm run test:bundle

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

## v0.8.16'ya kesin geri dönüş

```bash
set -e

APP_DIR="$HOME/DraBornGarage"
TARGET_SHA="6c7f238b8dd4928af83b96264a0668ccc67626b5"
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

CURRENT_VERSION="$(node -p "require('./package.json').version")"
CURRENT_SHA="$(git rev-parse HEAD)"

echo "Sürüm : $CURRENT_VERSION"
echo "Commit: $CURRENT_SHA"

if [ "$CURRENT_VERSION" != "0.8.16" ]; then
  echo "HATA: Geri dönüş sürümü 0.8.16 değil."
  exit 1
fi

npx expo start -c --go
```

## Supabase geri dönüşü

Kodun v0.8.16'ya alınması canlı veritabanını otomatik değiştirmez. v0.9 veritabanı özelliklerini de kaldırmak için şu rollback uygulanır:

```text
supabase/rollbacks/rollback_v0_9_0_to_v0_8_16.sql
```

Rollback; hesap silme talepleri tablosunu ve v0.9 gizlilik RPC'lerini kaldırır. Güvenlik nedeniyle kapatılan dahili servis yardımcıları genel istemci erişimine tekrar açılmaz.
