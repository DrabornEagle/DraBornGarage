# Termux — ZIP ile Kurulum, Güncelleme ve Geri Alma

Bu akışta Python, patch, JDK, Perl, `/tmp` veya Git kullanılmaz.

# v0.4.1 güncellemesi

- **Kurulan yeni sürüm:** `v0.4.1`
- **Kurulumdan önce yedeklenen sürüm:** `v0.4.0`
- **GitHub geri dönüş yedeği:** `backup/v0.4.0-before-v0.4.1-customer-panel-fix`
- **Telefonda oluşturulan yerel yedek:** `DraBornGarage-v0.4.0-local-backup`

## v0.4.0 sürümünü yedekleyip v0.4.1 sürümünü kurma

```bash
cd ~

KURULAN_SURUM="v0.4.1"
YEDEKLENEN_SURUM="v0.4.0"
YEDEK_KLASORU="$HOME/DraBornGarage-v0.4.0-local-backup"
ZIP_DOSYASI="$HOME/DraBornGarage-v0.4.1.zip"

printf '\n========================================\n'
printf 'KURULAN YENİ SÜRÜM: %s\n' "$KURULAN_SURUM"
printf 'YEDEKLENEN MEVCUT SÜRÜM: %s\n' "$YEDEKLENEN_SURUM"
printf 'YEREL YEDEK KLASÖRÜ: %s\n' "$YEDEK_KLASORU"
printf '========================================\n\n'

pkg update -y
pkg install nodejs-lts curl unzip -y

rm -rf "$YEDEK_KLASORU"
rm -rf "$HOME/DraBornGarage-main"
rm -f "$ZIP_DOSYASI"

if [ -d "$HOME/DraBornGarage" ]; then
  mv "$HOME/DraBornGarage" "$YEDEK_KLASORU"
fi

curl -L \
  --retry 10 \
  --retry-delay 3 \
  --connect-timeout 30 \
  --max-time 600 \
  "https://github.com/DrabornEagle/DraBornGarage/archive/refs/heads/main.zip" \
  -o "$ZIP_DOSYASI"

unzip -o "$ZIP_DOSYASI" -d "$HOME"
mv "$HOME/DraBornGarage-main" "$HOME/DraBornGarage"
rm -f "$ZIP_DOSYASI"

if [ -f "$YEDEK_KLASORU/.env" ]; then
  cp "$YEDEK_KLASORU/.env" "$HOME/DraBornGarage/.env"
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

printf '\nKURULUM TAMAMLANDI: %s\n' "$KURULAN_SURUM"
printf 'GERİ DÖNÜŞ İÇİN KORUNAN SÜRÜM: %s\n\n' "$YEDEKLENEN_SURUM"

npx expo start -c --go
```

## Aynı Wi-Fi’da Expo Go bağlanmazsa

```bash
cd ~/DraBornGarage
npx expo start -c --tunnel --go
```

# v0.4.1 sürümünden v0.4.0 sürümüne geri alma

- **Geri dönülen sürüm:** `v0.4.0`
- **Geri alma öncesinde korunan sürüm:** `v0.4.1`
- **Sabit GitHub yedeği:** `backup/v0.4.0-before-v0.4.1-customer-panel-fix`
- **Telefonda korunan v0.4.1 klasörü:** `DraBornGarage-v0.4.1-before-rollback`

```bash
cd ~

GERI_DONULEN_SURUM="v0.4.0"
KORUNAN_MEVCUT_SURUM="v0.4.1"
MEVCUT_SURUM_YEDEGI="$HOME/DraBornGarage-v0.4.1-before-rollback"
ZIP_DOSYASI="$HOME/DraBornGarage-v0.4.0.zip"
ACILAN_KLASOR="$HOME/DraBornGarage-backup-v0.4.0-before-v0.4.1-customer-panel-fix"

printf '\n========================================\n'
printf 'GERİ DÖNÜLEN SÜRÜM: %s\n' "$GERI_DONULEN_SURUM"
printf 'GERİ ALMA ÖNCESİ KORUNAN SÜRÜM: %s\n' "$KORUNAN_MEVCUT_SURUM"
printf 'KORUNAN KLASÖR: %s\n' "$MEVCUT_SURUM_YEDEGI"
printf '========================================\n\n'

pkg install nodejs-lts curl unzip -y

rm -rf "$MEVCUT_SURUM_YEDEGI"
rm -rf "$ACILAN_KLASOR"
rm -f "$ZIP_DOSYASI"

if [ -d "$HOME/DraBornGarage" ]; then
  mv "$HOME/DraBornGarage" "$MEVCUT_SURUM_YEDEGI"
fi

curl -L \
  --retry 10 \
  --retry-delay 3 \
  --connect-timeout 30 \
  --max-time 600 \
  "https://github.com/DrabornEagle/DraBornGarage/archive/refs/heads/backup/v0.4.0-before-v0.4.1-customer-panel-fix.zip" \
  -o "$ZIP_DOSYASI"

unzip -o "$ZIP_DOSYASI" -d "$HOME"
mv "$ACILAN_KLASOR" "$HOME/DraBornGarage"
rm -f "$ZIP_DOSYASI"

if [ -f "$MEVCUT_SURUM_YEDEGI/.env" ]; then
  cp "$MEVCUT_SURUM_YEDEGI/.env" "$HOME/DraBornGarage/.env"
else
  cp "$HOME/DraBornGarage/.env.example" "$HOME/DraBornGarage/.env"
fi

cd "$HOME/DraBornGarage"
npm install --no-audit --no-fund

printf '\nGERİ ALMA TAMAMLANDI: %s\n' "$GERI_DONULEN_SURUM"
printf 'KORUNAN ÖNCEKİ SÜRÜM: %s\n\n' "$KORUNAN_MEVCUT_SURUM"

npx expo start -c --go
```

## Supabase geri alma

v0.4.1 Supabase yapısını değiştirmez. Kayıt standardı için şu no-op dosyası bulunur:

`supabase/rollbacks/rollback_v0_4_1_to_v0_4_0.sql`

Uygulama kodunu v0.4.0 yedeğine döndürmek yeterlidir; canlı veriler ve v0.4.0 ek işlem/onay sistemi korunur.

## v0.4.1 doğrulandıktan sonra yerel yedeği temizleme

```bash
cd ~
rm -rf \
  "$HOME/DraBornGarage-v0.4.0-local-backup" \
  "$HOME/DraBornGarage-v0.4.1-before-rollback" \
  "$HOME/DraBornGarage-v0.4.1.zip" \
  "$HOME/DraBornGarage-v0.4.0.zip"
```

## Bir sonraki sürüm

- v0.4 içindeki yeni küçük değişiklik: `v0.4.2`
- Yol haritasındaki bir sonraki ana aşama: `v0.5.0`
