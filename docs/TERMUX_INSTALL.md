# Termux — Yalnız ZIP ile Kurulum

Bu akışta Python, patch, JDK, Perl, `/tmp` veya Git kullanılmaz.

## İlk kurulum

```bash
pkg update -y && pkg upgrade -y
pkg install nodejs-lts curl unzip -y
termux-setup-storage
cd ~
rm -rf DraBornGarage DraBornGarage-main DraBornGarage.zip
curl -L https://github.com/DrabornEagle/DraBornGarage/archive/refs/heads/main.zip -o DraBornGarage.zip
unzip DraBornGarage.zip
mv DraBornGarage-main DraBornGarage
cd DraBornGarage
cp .env.example .env
npm install
npx expo start -c --go
```

Expo Go uygulamasından Termux ekranındaki QR kodu okut.

## Aynı Wi-Fi'da bağlantı kurulamazsa

```bash
cd ~/DraBornGarage
npx expo start -c --tunnel --go
```

## Yeni GitHub sürümünü ZIP ile alma

```bash
cd ~
rm -rf DraBornGarage-old DraBornGarage-main DraBornGarage.zip
mv DraBornGarage DraBornGarage-old
curl -L https://github.com/DrabornEagle/DraBornGarage/archive/refs/heads/main.zip -o DraBornGarage.zip
unzip DraBornGarage.zip
mv DraBornGarage-main DraBornGarage
cp DraBornGarage-old/.env DraBornGarage/.env
cd DraBornGarage
npm install
npx expo start -c --go
```

Yeni sürüm doğrulandıktan sonra eski klasörü temizlemek için:

```bash
cd ~
rm -rf DraBornGarage-old DraBornGarage.zip
```
