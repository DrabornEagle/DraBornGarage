# Termux — ZIP ile Kurulum, Güncelleme ve Geri Alma

Bu akışta Python, patch, JDK, Perl, `/tmp` veya Git kullanılmaz.

## v0.3 güncel sürümü kurma

Mevcut `.env` dosyası korunur. Eski uygulama klasörü ayrıca `DraBornGarage-local-backup` adıyla yedeklenir.

```bash
cd ~

pkg update -y
pkg install nodejs-lts curl unzip -y

rm -rf DraBornGarage-local-backup DraBornGarage-main DraBornGarage.zip

if [ -d "$HOME/DraBornGarage" ]; then
  mv "$HOME/DraBornGarage" "$HOME/DraBornGarage-local-backup"
fi

curl -L \
  --retry 10 \
  --retry-delay 3 \
  --connect-timeout 30 \
  --max-time 600 \
  "https://github.com/DrabornEagle/DraBornGarage/archive/refs/heads/main.zip" \
  -o "$HOME/DraBornGarage.zip"

unzip -o "$HOME/DraBornGarage.zip" -d "$HOME"
mv "$HOME/DraBornGarage-main" "$HOME/DraBornGarage"
rm -f "$HOME/DraBornGarage.zip"

if [ -f "$HOME/DraBornGarage-local-backup/.env" ]; then
  cp "$HOME/DraBornGarage-local-backup/.env" "$HOME/DraBornGarage/.env"
else
  cp "$HOME/DraBornGarage/.env.example" "$HOME/DraBornGarage/.env"
fi

cd "$HOME/DraBornGarage"

npm config set registry "https://registry.npmjs.org/"
npm config set fetch-retries 10
npm config set fetch-retry-factor 2
npm config set fetch-retry-mintimeout 20000
npm config set fetch-retry-maxtimeout 120000
npm config set fetch-timeout 300000

npm install --no-audit --no-fund
npx expo start -c --go
```

## Aynı Wi-Fi'da bağlantı kurulamazsa

```bash
cd ~/DraBornGarage
npx expo start -c --tunnel --go
```

## Uygulama kodunu v0.2 yedeğine geri alma

Bu komut GitHub’daki sabit `backup/v0.2.0-before-v0.3` dalını indirir. Mevcut v0.3 klasörü `DraBornGarage-v0.3-backup` adıyla korunur.

```bash
cd ~

pkg install nodejs-lts curl unzip -y

rm -rf DraBornGarage-v0.3-backup DraBornGarage-backup-v0.2.0-before-v0.3 DraBornGarage-v0.2.zip

if [ -d "$HOME/DraBornGarage" ]; then
  mv "$HOME/DraBornGarage" "$HOME/DraBornGarage-v0.3-backup"
fi

curl -L \
  --retry 10 \
  --retry-delay 3 \
  --connect-timeout 30 \
  --max-time 600 \
  "https://github.com/DrabornEagle/DraBornGarage/archive/refs/heads/backup/v0.2.0-before-v0.3.zip" \
  -o "$HOME/DraBornGarage-v0.2.zip"

unzip -o "$HOME/DraBornGarage-v0.2.zip" -d "$HOME"
mv "$HOME/DraBornGarage-backup-v0.2.0-before-v0.3" "$HOME/DraBornGarage"
rm -f "$HOME/DraBornGarage-v0.2.zip"

if [ -f "$HOME/DraBornGarage-v0.3-backup/.env" ]; then
  cp "$HOME/DraBornGarage-v0.3-backup/.env" "$HOME/DraBornGarage/.env"
else
  cp "$HOME/DraBornGarage/.env.example" "$HOME/DraBornGarage/.env"
fi

cd "$HOME/DraBornGarage"
npm install --no-audit --no-fund
npx expo start -c --go
```

## Supabase veritabanını v0.2 yapısına geri alma

Uygulama kodunu geri almak Supabase şemasını otomatik değiştirmez. Supabase Dashboard → SQL Editor bölümünde aşağıdaki dosyanın tamamı çalıştırılmalıdır:

`supabase/rollbacks/rollback_v0_3_to_v0_2.sql`

Rollback v0.3 randevu kayıtlarını siler. Çalıştırmadan önce Supabase Dashboard üzerinden gerçek veritabanı yedeği alınmalıdır. Müşteri, motosiklet, servis, ödeme ve v0.2 motor eşleştirme verileri korunur.

## Yeni sürüm doğrulandıktan sonra yerel yedeği temizleme

```bash
cd ~
rm -rf DraBornGarage-local-backup DraBornGarage-v0.3-backup DraBornGarage.zip DraBornGarage-v0.2.zip
```
