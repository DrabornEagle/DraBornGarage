from pathlib import Path


def replace(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'Expected pattern missing in {path}: {old[:80]!r}')
    file.write_text(text.replace(old, new), encoding='utf-8')


replace(
    'src/notifications/NotificationCenterScreen.tsx',
    'v1.0.1 RC • GÜÇLÜ BİLDİRİM MERKEZİ',
    'v1.0.2 RC • GÜÇLÜ BİLDİRİM MERKEZİ',
)

replace(
    'src/screens/SettingsScreen.tsx',
    'subtitle="v1.0.1 RC • Expo düzeltme testleri"',
    'subtitle="v1.0.2 RC • Ortaklık ve panel erişimi"',
)
replace(
    'src/screens/SettingsScreen.tsx',
    'value="v1.0.1 RC • Expo Test Adayı"',
    'value="v1.0.2 RC • Expo Test Adayı"',
)
replace(
    'src/screens/SettingsScreen.tsx',
    'value="backup/v1.0.0-rc-before-v1.0.1-20260715"',
    'value="backup/v1.0.1-before-v1.0.2-20260715"',
)
replace(
    'src/screens/SettingsScreen.tsx',
    'value="Kod yedeğiyle v1.0.0 RC"',
    'value="Kod ve veritabanıyla v1.0.1 RC"',
)

replace(
    'src/screens/TeamScreenV102.tsx',
    "  useEffect(() => {\n    if (visible) loadRequests();\n  }, [visible, loadRequests]);",
    "  useEffect(() => {\n    loadRequests();\n  }, [loadRequests]);",
)
replace(
    'src/screens/TeamScreenV102.tsx',
    '      <TeamScreen />',
    "      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><TeamScreen /></KeyboardAvoidingView>",
)
replace(
    'src/screens/TeamScreenV102.tsx',
    "const styles = StyleSheet.create({\n  root: { flex: 1 },",
    "const styles = StyleSheet.create({\n  root: { flex: 1 },\n  flex: { flex: 1 },",
)

for path in ['README.md', 'docs/TERMUX_INSTALL.md']:
    file = Path(path)
    if file.exists():
        text = file.read_text(encoding='utf-8')
        text = text.replace('v1.0.1 RC', 'v1.0.2 RC')
        text = text.replace('"1.0.1"', '"1.0.2"')
        text = text.replace('backup/v1.0.0-rc-before-v1.0.1-20260715', 'backup/v1.0.1-before-v1.0.2-20260715')
        file.write_text(text, encoding='utf-8')
