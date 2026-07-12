# Termux — v0.8.7 Yedekle, v0.8.8 Kur

```bash
cd ~
KURULAN_SURUM="v0.8.8"
YEDEKLENEN_SURUM="v0.8.7"
YEDEK_KLASORU="$HOME/DraBornGarage-v0.8.7-local-backup"
ZIP_DOSYASI="$HOME/DraBornGarage-v0.8.8.zip"
ACILAN_KLASOR="$HOME/DraBornGarage-main"

pkg update -y
pkg install nodejs-lts curl unzip -y
rm -rf "$YEDEK_KLASORU" "$ACILAN_KLASOR"
rm -f "$ZIP_DOSYASI"
if [ -d "$HOME/DraBornGarage" ]; then mv "$HOME/DraBornGarage" "$YEDEK_KLASORU"; fi
curl -L --retry 10 --retry-delay 3 --connect-timeout 30 --max-time 600 "https://github.com/DrabornEagle/DraBornGarage/archive/refs/heads/main.zip" -o "$ZIP_DOSYASI"
unzip -o "$ZIP_DOSYASI" -d "$HOME"
mv "$ACILAN_KLASOR" "$HOME/DraBornGarage"
rm -f "$ZIP_DOSYASI"
if [ -f "$YEDEK_KLASORU/.env" ]; then cp "$YEDEK_KLASORU/.env" "$HOME/DraBornGarage/.env"; else cp "$HOME/DraBornGarage/.env.example" "$HOME/DraBornGarage/.env"; fi
cd "$HOME/DraBornGarage"
npm config set registry "https://registry.npmjs.org/"
npm config set fetch-retries 10
npm config set fetch-retry-factor 2
npm config set fetch-retry-mintimeout 20000
npm config set fetch-retry-maxtimeout 120000
npm config set fetch-timeout 300000
npm install --no-audit --no-fund
npm run typecheck
node -p "require('./package.json').version"
npx expo start -c --go
```

Beklenen sürüm: `0.8.8`. Bağlantı sorunu olursa: `npx expo start -c --tunnel --go`.

Kod yedeği: `backup/v0.8.7-before-v0.8.8-20260712`.
