# Termux — v0.8.16 Yedekle, v0.8.17 Kur

```bash
cd ~
KURULAN_SURUM="v0.8.17"
YEDEK_KLASORU="$HOME/DraBornGarage-v0.8.16-local-backup"
ZIP_DOSYASI="$HOME/DraBornGarage-v0.8.17.zip"
ACILAN_KLASOR="$HOME/DraBornGarage-main"

pkg update -y
pkg install nodejs-lts curl unzip -y
rm -rf "$ACILAN_KLASOR"
rm -f "$ZIP_DOSYASI"

if [ -d "$HOME/DraBornGarage" ]; then
  rm -rf "$YEDEK_KLASORU"
  mv "$HOME/DraBornGarage" "$YEDEK_KLASORU"
fi

curl -L --retry 10 --retry-delay 3 --connect-timeout 30 --max-time 600   "https://github.com/DrabornEagle/DraBornGarage/archive/refs/heads/main.zip"   -o "$ZIP_DOSYASI"

unzip -o "$ZIP_DOSYASI" -d "$HOME"
mv "$ACILAN_KLASOR" "$HOME/DraBornGarage"
rm -f "$ZIP_DOSYASI"

if [ -f "$YEDEK_KLASORU/.env" ]; then
  cp "$YEDEK_KLASORU/.env" "$HOME/DraBornGarage/.env"
else
  cp "$HOME/DraBornGarage/.env.example" "$HOME/DraBornGarage/.env"
fi

cd "$HOME/DraBornGarage"
npm install --no-audit --no-fund
npm run typecheck
node -p "require('./package.json').version"
npx expo start -c --go
```

Beklenen sürüm: `0.8.17`.

Kapalı uygulama pushu ve özel ses için Expo Go yerine EAS preview APK kurulmalıdır.
