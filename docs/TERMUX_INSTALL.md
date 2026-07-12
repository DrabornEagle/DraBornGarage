# Termux — v0.8.4 Yedekle, v0.8.5 Kur

Bu akış Python, patch, JDK, Perl, /tmp veya Git kullanmaz. Mevcut .env korunur.

```bash
cd ~
KURULAN_SURUM="v0.8.5"
YEDEKLENEN_SURUM="v0.8.4"
YEDEK_KLASORU="$HOME/DraBornGarage-v0.8.4-local-backup"
ZIP_DOSYASI="$HOME/DraBornGarage-v0.8.5.zip"
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
npm config set fetch-timeout 300000
npm install --no-audit --no-fund
npm run typecheck
node -p "require('./package.json').version"
npx expo start -c --go
```

Beklenen sürüm: `0.8.5`. Kod geri dönüş yedeği: `backup/v0.8.4-before-v0.8.5`. Silinen kullanıcı ve operasyon verileri rollback ile geri getirilemez.
