# DraBornGarage v1.1.8 Termux Yedek ve Kurulum

## v1.1.7 yedeği

```bash
cd ~/DraBornGarage
git status
git add -A
git commit -m "backup: v1.1.7 before v1.1.8" || true
BACKUP_BRANCH="backup/v1.1.7-before-v1.1.8-$(date +%Y%m%d-%H%M)"
git branch "$BACKUP_BRANCH"
git push origin "$BACKUP_BRANCH"
```

## v1.1.8 özellik dalını kur

```bash
cd ~/DraBornGarage
git fetch --all --prune
git switch feature/v1.1.8-qr-customer-mechanic-attribution
git pull --ff-only origin feature/v1.1.8-qr-customer-mechanic-attribution
rm -rf node_modules dist .expo
npm ci
npx expo-doctor
npm run typecheck
npm run test:bundle
npx expo start -c --go
```

## Main birleştirmesinden sonra

```bash
cd ~/DraBornGarage
git switch main
git pull --ff-only origin main
npm ci
npx expo start -c --go
```

Test APK için GitHub Actions üzerinde yalnız **DraBornGarage Release APK**, Google Play AAB için yalnız **DraBornGarage Release AAB** çalıştırılır.
