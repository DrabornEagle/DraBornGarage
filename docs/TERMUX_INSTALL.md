# Termux — DraBornGarage v0.9.7 Kurulum

## Temiz güncelleme

Aşağıdaki kodu Termux'a tek parça yapıştır:

```bash
set -e

REPO_URL="https://github.com/DrabornEagle/DraBornGarage.git"
APP_DIR="$HOME/DraBornGarage"
ENV_BACKUP="$HOME/.draborngarage-env-backup"
EXPECTED_VERSION="0.9.7"

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

## IBAN ve müşteri ödeme bildirimi testi

1. Usta veya İşletme Sahibi + Usta hesabıyla giriş yap.
2. Ayarlar → **IBAN Ayarları** bölümünü aç.
3. **Müşteriye göster** seçeneğinin varsayılan aktif olduğunu doğrula.
4. Banka adı, hesap sahibi ve TR IBAN bilgisini girip kaydet.
5. Ustaya atanmış bir servisi **Motor Hazır** durumuna al veya teslim edilmiş servis için açık veresiye kaydı oluştur.
6. Bağlı müşteri hesabında Servisler → ilgili motor detayını aç.
7. Usta, banka, hesap sahibi, IBAN ve kalan borç görünmelidir.
8. Müşteri tutarı girip **Ödemeyi Yaptım • Ustaya Bildir** düğmesine dokunur.
9. Borcun henüz değişmediğini ve Usta onayı beklendiğini doğrula.
10. Usta hesabında Alacak ekranını aç ve bekleyen bildirimi onayla.
11. Kısmi ödemede kalan tutarın azaldığını; tam ödemede borcun kapandığını doğrula.
12. Ret senaryosunda müşterinin borcunun değişmediğini doğrula.

## Usta rapor tutarlılığı testi

1. Aynı Ustaya atanmış iki motoru Motor Hazır veya Teslim Edildi durumuna getir.
2. İşlerden birinde ayrıntılı işlem satırı olmasın; diğerinde işlem satırı tamamlanmadan motoru hazır yap.
3. **Usta Panelim** günlük kayıtlı tutarını kontrol et.
4. **Merkez → Usta Raporu** ekranında tamamlanan iş sayısı ve kayıtlı tutarı kontrol et.
5. **Merkez → İşletme Raporu → Usta Bazlı İş ve Tutar** değerleriyle karşılaştır.
6. Üç ekranın aynı işçilik tutarını göstermesi; işlem satırı olmayan tamamlanmış işin de bir iş olarak sayılması gerekir.

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

## v0.9.5'e kod geri dönüşü

```bash
set -e

APP_DIR="$HOME/DraBornGarage"
TARGET_SHA="0d9cbdd21245803e5e187e0b3f77e04dc9bc7193"
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

Kod geri dönüşü canlı veritabanını otomatik değiştirmez. v0.9.6 fiyat, bildirim sıralama ve bildirim silme değişikliklerini kaldırmak için:

```text
supabase/rollbacks/rollback_v0_9_6_to_v0_9_5.sql
```
