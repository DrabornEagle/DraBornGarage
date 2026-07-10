# Termux — ZIP ile Kurulum, Güncelleme ve Geri Alma

Bu akışta Python, patch, JDK, Perl, `/tmp` veya Git kullanılmaz.

# v0.3.1 güncellemesi

- **Kurulan yeni sürüm:** `v0.3.1`
- **Kurulumdan önce yedeklenen sürüm:** `v0.3.0`
- **GitHub geri dönüş yedeği:** `backup/v0.3.0-before-v0.3.1`
- **Telefonda oluşturulan yerel yedek:** `DraBornGarage-v0.3.0-local-backup`

## v0.3.0 sürümünü yedekleyip v0.3.1 sürümünü kurma

Mevcut `.env` dosyası korunur. Komut başlamadan önce hangi sürümün kurulacağını ve hangisinin yedekleneceğini ekranda gösterir.

```bash
cd ~

KURULAN_SURUM="v0.3.1"
YEDEKLENEN_SURUM="v0.3.0"
YEDEK_KLASORU="$HOME/DraBornGarage-v0.3.0-local-backup"

printf '\n========================================\n'
printf 'KURULAN YENİ SÜRÜM: %s\n' "$KURULAN_SURUM"
printf 'YEDEKLENEN MEVCUT SÜRÜM: %s\n' "$YEDEKLENEN_SURUM"
printf 'YEREL YEDEK KLASÖRÜ: %s\n' "$YEDEK_KLASORU"
printf '========================================\n\n'

pkg update -y
pkg install nodejs-lts curl unzip -y

rm -rf "$YEDEK_KLASORU"
rm -rf "$HOME/DraBornGarage-main"
rm -f "$HOME/DraBornGarage-$KURULAN_SURUM.zip"

if [ -d "$HOME/DraBornGarage" ]; then
  mv "$HOME/DraBornGarage" "$YEDEK_KLASORU"
fi

curl -L \
  --retry 10 \
  --retry-delay 3 \
  --connect-timeout 30 \
  --max-time 600 \
  "https://github.com/DrabornEagle/DraBornGarage/archive/refs/heads/main.zip" \
  -o "$HOME/DraBornGarage-$KURULAN_SURUM.zip"

unzip -o "$HOME/DraBornGarage-$KURULAN_SURUM.zip" -d "$HOME"
mv "$HOME/DraBornGarage-main" "$HOME/DraBornGarage"
rm -f "$HOME/DraBornGarage-$KURULAN_SURUM.zip"

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

## Aynı Wi-Fi’da bağlantı kurulamazsa

```bash
cd ~/DraBornGarage
npx expo start -c --tunnel --go
```

# v0.3.1 sürümünden v0.3.0 sürümüne geri alma

- **Geri dönülen sürüm:** `v0.3.0`
- **Geri alma öncesinde yedeklenen sürüm:** `v0.3.1`
- **İndirilen sabit GitHub yedeği:** `backup/v0.3.0-before-v0.3.1`
- **Telefonda korunan v0.3.1 klasörü:** `DraBornGarage-v0.3.1-before-rollback`

## v0.3.1 sürümünü yedekleyip v0.3.0 sürümünü geri yükleme

```bash
cd ~

GERI_DONULEN_SURUM="v0.3.0"
YEDEKLENEN_SURUM="v0.3.1"
MEVCUT_SURUM_YEDEGI="$HOME/DraBornGarage-v0.3.1-before-rollback"
ZIP_DOSYASI="$HOME/DraBornGarage-$GERI_DONULEN_SURUM.zip"

printf '\n========================================\n'
printf 'GERİ DÖNÜLEN SÜRÜM: %s\n' "$GERI_DONULEN_SURUM"
printf 'GERİ ALMA ÖNCESİ YEDEKLENEN SÜRÜM: %s\n' "$YEDEKLENEN_SURUM"
printf 'KORUNAN KLASÖR: %s\n' "$MEVCUT_SURUM_YEDEGI"
printf '========================================\n\n'

pkg install nodejs-lts curl unzip -y

rm -rf "$MEVCUT_SURUM_YEDEGI"
rm -rf "$HOME/DraBornGarage-backup-v0.3.0-before-v0.3.1"
rm -f "$ZIP_DOSYASI"

if [ -d "$HOME/DraBornGarage" ]; then
  mv "$HOME/DraBornGarage" "$MEVCUT_SURUM_YEDEGI"
fi

curl -L \
  --retry 10 \
  --retry-delay 3 \
  --connect-timeout 30 \
  --max-time 600 \
  "https://github.com/DrabornEagle/DraBornGarage/archive/refs/heads/backup/v0.3.0-before-v0.3.1.zip" \
  -o "$ZIP_DOSYASI"

unzip -o "$ZIP_DOSYASI" -d "$HOME"
mv "$HOME/DraBornGarage-backup-v0.3.0-before-v0.3.1" "$HOME/DraBornGarage"
rm -f "$ZIP_DOSYASI"

if [ -f "$MEVCUT_SURUM_YEDEGI/.env" ]; then
  cp "$MEVCUT_SURUM_YEDEGI/.env" "$HOME/DraBornGarage/.env"
else
  cp "$HOME/DraBornGarage/.env.example" "$HOME/DraBornGarage/.env"
fi

cd "$HOME/DraBornGarage"
npm install --no-audit --no-fund

printf '\nGERİ ALMA TAMAMLANDI: %s\n' "$GERI_DONULEN_SURUM"
printf 'KORUNAN ÖNCEKİ SÜRÜM: %s\n\n' "$YEDEKLENEN_SURUM"

npx expo start -c --go
```

## Supabase veritabanı geri alma durumu

`v0.3.1`, yalnız sürümleme, yedekleme ve kurulum standardını günceller. Supabase veritabanı şeması değişmedi.

Bu nedenle v0.3.1 → v0.3.0 veritabanı rollback dosyası no-op’tur:

`supabase/rollbacks/rollback_v0_3_1_to_v0_3_0.sql`

SQL Editor’da herhangi bir tablo veya veri silme işlemi gerekmez.

## Güncelleme doğrulandıktan sonra yerel yedeği temizleme

Aşağıdaki komut yalnız yedek klasörlerine artık ihtiyaç kalmadığında çalıştırılır:

```bash
cd ~
rm -rf \
  "$HOME/DraBornGarage-v0.3.0-local-backup" \
  "$HOME/DraBornGarage-v0.3.1-before-rollback" \
  "$HOME/DraBornGarage-v0.3.1.zip" \
  "$HOME/DraBornGarage-v0.3.0.zip"
```

## Bundan sonraki sürümlerde örnek

`v0.3.1` üzerine yeni bir değişiklik eklenirse:

- Yeni sürüm: `v0.3.2`
- Yedeklenen sürüm: `v0.3.1`
- Yedek dalı: `backup/v0.3.1-before-v0.3.2`

Kurulum ve geri alma komutlarının başında bu üç bilgi açıkça yazılacaktır.
