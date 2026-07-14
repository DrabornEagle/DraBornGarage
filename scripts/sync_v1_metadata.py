from pathlib import Path

replacements = {
    'src/notifications/NotificationCenterScreen.tsx': [
        ('v0.9.7 • SESLİ BİLDİRİM MERKEZİ', 'v1.0.0 RC • SESLİ BİLDİRİM MERKEZİ'),
    ],
    'src/notifications/NotificationContext.tsx': [
        ("Constants.expoConfig?.version || '0.9.7'", "Constants.expoConfig?.version || '1.0.0'"),
    ],
    'src/screens/SettingsScreen.tsx': [
        ('v0.9.7 • Bugünkü sıra ve Motor Hazır ücret koruması', 'v1.0.0 RC • İlk Release APK test süreci'),
        ('v0.9.7 • Bugünkü Sıra ve Ücret Koruması', 'v1.0.0 RC • Release APK Adayı'),
        ('backup/v0.9.6-before-v0.9.7-20260714', 'backup/v0.9.7-before-v1.0-20260714'),
        ('Kod ve veritabanıyla v0.9.6', 'Kod yedeğiyle v0.9.7'),
        ('Expo Go + Android bundle + pilot checklist', 'GitHub Release APK + fiziksel cihaz testleri'),
        ('Auto & Vehicles • finansal hizmet değildir', 'APK testinde • AAB henüz yayınlanmadı'),
    ],
    'docs/TERMUX_INSTALL.md': [
        ('DraBornGarage v0.9.7', 'DraBornGarage v1.0.0 RC'),
        ('EXPECTED_VERSION="0.9.7"', 'EXPECTED_VERSION="1.0.0"'),
    ],
}

for filename, pairs in replacements.items():
    path = Path(filename)
    text = path.read_text()
    for old, new in pairs:
        if old in text:
            text = text.replace(old, new)
        elif new not in text:
            raise SystemExit(f'Expected release label not found in {filename}: {old}')
    path.write_text(text)

readme = Path('README.md')
text = readme.read_text()
old = '''## Güncel sürüm

**v0.9.7 — Bugünkü Sıra ve Motor Hazır Ücret Koruması**

v0.9.7; Usta Panelindeki Bugünkü Atölye Sırasını yalnız bugünün kayıtlarıyla sınırlar ve tahsil edilecek son net ücret girilmeden Motor Hazır aşamasına geçilmesini engeller.

## v0.9.7 ile tamamlananlar
'''
new = '''## Güncel sürüm

**v1.0.0 RC — İlk GitHub Release APK Adayı**

v1.0.0 RC; v0.1–v0.9.7 arasındaki mobil özellikleri ilk kurulabilir GitHub Release APK çıktısında birleştirir. APK fiziksel cihaz testlerinden geçtikten sonra kalıcı Android upload key ve Google Play AAB aşamasına alınacaktır.

## v1.0 Release APK hazırlığı

- GitHub üzerinde DraBornGarage Release APK workflow'u
- TypeScript, Expo Doctor, public config ve Android lint raporları
- Temiz Expo prebuild ve native Android release derlemesi
- APK imza doğrulaması ve SHA-256 checksum
- Fiziksel cihaz test planı
- v0.9.7 geri dönüş yedeği

## v0.9.7 ile tamamlananlar
'''
if old in text:
    text = text.replace(old, new)
elif '**v1.0.0 RC — İlk GitHub Release APK Adayı**' not in text:
    raise SystemExit('README release block not found')
readme.write_text(text)
