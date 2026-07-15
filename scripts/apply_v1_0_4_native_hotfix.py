from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text, encoding='utf-8')


def replace_exact(path: str, old: str, new: str, count: int = 1) -> None:
    text = read(path)
    actual = text.count(old)
    if actual < count:
        raise RuntimeError(f'{path}: beklenen parça bulunamadı ({actual}/{count})\n{old[:220]}')
    write(path, text.replace(old, new, count))


# Android edge-to-edge sistem çubuğu için resmi uyum katmanı.
package_path = ROOT / 'package.json'
package = json.loads(package_path.read_text(encoding='utf-8'))
package['dependencies']['react-native-edge-to-edge'] = '1.8.1'
package_path.write_text(json.dumps(package, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

app_path = ROOT / 'app.json'
app = json.loads(app_path.read_text(encoding='utf-8'))
expo = app['expo']
expo.pop('androidNavigationBar', None)
expo['android']['versionCode'] = 22
expo['ios']['buildNumber'] = '22'
plugins = expo.setdefault('plugins', [])
edge_plugin = [
    'react-native-edge-to-edge',
    {
        'android': {
            'parentTheme': 'Default',
            'enforceNavigationBarContrast': False,
        }
    },
]
replaced = False
for index, plugin in enumerate(plugins):
    name = plugin[0] if isinstance(plugin, list) and plugin else plugin
    if name == 'react-native-edge-to-edge':
        plugins[index] = edge_plugin
        replaced = True
        break
if not replaced:
    plugins.append(edge_plugin)
app_path.write_text(json.dumps(app, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

replace_exact(
    'App.tsx',
    "import { StatusBar } from 'expo-status-bar';\n",
    "import { SystemBars } from 'react-native-edge-to-edge';\n",
)
replace_exact(
    'App.tsx',
    "  return <StatusBar style={resolvedMode === 'dark' ? 'light' : 'dark'} />;",
    "  return <SystemBars style={resolvedMode === 'dark' ? 'light' : 'dark'} />;",
)

# Görünür sürüm metni artık app.json'dan okunur.
replace_exact(
    'src/screens/AuthScreen.tsx',
    "import { LinearGradient } from 'expo-linear-gradient';\n",
    "import Constants from 'expo-constants';\nimport { LinearGradient } from 'expo-linear-gradient';\n",
)
replace_exact(
    'src/screens/AuthScreen.tsx',
    "type BusinessEntryMode = 'new' | 'existing';\n",
    "type BusinessEntryMode = 'new' | 'existing';\n\nconst APP_VERSION = Constants.expoConfig?.version ?? '1.0.4';\n",
)
replace_exact(
    'src/screens/AuthScreen.tsx',
    '>GARAGE OS • v1.0.3 EXPO TEST</Text>',
    '>{`GARAGE OS • v${APP_VERSION} TEST APK`}</Text>',
)

# Plain Gradle test APK EAS/FCM kimlik bilgisi taşımıyor. Remote token yolu final FCM kurulana kadar kapalıdır.
replace_exact(
    'src/notifications/NotificationContextV101.tsx',
    "const IS_EXPO_GO = Constants.appOwnership === 'expo';\n",
    "const IS_EXPO_GO = Constants.appOwnership === 'expo';\nconst NATIVE_PUSH_ENABLED = process.env.EXPO_PUBLIC_NATIVE_PUSH_ENABLED === 'true';\nconst APP_VERSION = Constants.expoConfig?.version ?? '1.0.4';\n",
)
replace_exact(
    'src/notifications/NotificationContextV101.tsx',
    "  const registerPushNotifications = useCallback(async () => {\n    if (!session?.user || !preferencesRef.current.push_notifications_enabled) return false;\n    if (Platform.OS === 'android' && IS_EXPO_GO) {",
    "  const registerPushNotifications = useCallback(async () => {\n    if (!session?.user || !preferencesRef.current.push_notifications_enabled) return false;\n    if (!NATIVE_PUSH_ENABLED) {\n      setPushStatus('missing_project');\n      return false;\n    }\n    if (Platform.OS === 'android' && IS_EXPO_GO) {",
)
replace_exact(
    'src/notifications/NotificationContextV101.tsx',
    "        p_app_version: Constants.expoConfig?.version || '1.0.1',",
    "        p_app_version: APP_VERSION,",
)
replace_exact(
    'src/notifications/NotificationContextV101.tsx',
    "      if (merged.push_notifications_enabled) await registerPushNotifications();",
    "      if (merged.push_notifications_enabled && NATIVE_PUSH_ENABLED) await registerPushNotifications();",
)
replace_exact(
    'src/notifications/NotificationContextV101.tsx',
    "    const tokenListener = IS_EXPO_GO ? null : Notifications.addPushTokenListener(() => { registerPushNotifications(); });",
    "    const tokenListener = !NATIVE_PUSH_ENABLED || IS_EXPO_GO ? null : Notifications.addPushTokenListener(() => { registerPushNotifications(); });",
)
replace_exact(
    'src/notifications/NotificationContextV101.tsx',
    "    if (next.push_notifications_enabled) await registerPushNotifications();",
    "    if (next.push_notifications_enabled && NATIVE_PUSH_ENABLED) await registerPushNotifications();",
)
replace_exact(
    'src/notifications/NotificationContextV101.tsx',
    "          title: 'DraBornGarage v1.0.1 bildirim testi',",
    "          title: `DraBornGarage v${APP_VERSION} bildirim testi`,",
)

# Xiaomi üç tuşlu navigasyonda safe-area 0 dönebildiği için güvenli alt mesafe.
replace_exact(
    'src/AppShellV102.tsx',
    "  const navBottom = Math.max(insets.bottom, 8);\n  const reservedBottom = navBottom + 96;",
    "  const navBottom = Platform.OS === 'android' ? Math.max(insets.bottom, 36) : Math.max(insets.bottom, 8);\n  const reservedBottom = navBottom + 100;",
)
replace_exact(
    'src/customer/CustomerShell.tsx',
    "  const navBottom = Math.max(insets.bottom, 8);\n  const reservedBottom = navBottom + 96;",
    "  const navBottom = Platform.OS === 'android' ? Math.max(insets.bottom, 36) : Math.max(insets.bottom, 8);\n  const reservedBottom = navBottom + 100;",
)

# v1.0.3 kalan görünür metinleri v1.0.4 ile eşitle.
for path in (ROOT / 'src').rglob('*.tsx'):
    text = path.read_text(encoding='utf-8')
    updated = text.replace('v1.0.3', 'v1.0.4')
    if updated != text:
        path.write_text(updated, encoding='utf-8')

# Release workflow aynı v1.0.4 etiketinde hotfix APK'yı yeniler.
workflow_path = ROOT / '.github/workflows/release-apk.yml'
workflow = workflow_path.read_text(encoding='utf-8')
workflow = workflow.replace("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_cu71JQGPiRusMw_YeZzUbg_6r9r13TG' }}", "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_cu71JQGPiRusMw_YeZzUbg_6r9r13TG' }}\n  EXPO_PUBLIC_NATIVE_PUSH_ENABLED: \"false\"")
workflow = workflow.replace("app.android?.versionCode !== 21 || app.ios?.buildNumber !== '21'", "app.android?.versionCode !== 22 || app.ios?.buildNumber !== '22'")
workflow = workflow.replace('Native sürüm bilgileri 1.0.4 / 21 ile eşleşmiyor.', 'Native sürüm bilgileri 1.0.4 / 22 ile eşleşmiyor.')
workflow = workflow.replace("console.log('Release metadata OK: 1.0.4 / 21');", "console.log('Release metadata OK: 1.0.4 / 22');")
workflow = workflow.replace('Android versionCode: 21', 'Android versionCode: 22')
workflow = workflow.replace('- Android versionCode: **21**', '- Android versionCode: **22**')
workflow = workflow.replace('          make_latest: false\n          files:', '          make_latest: false\n          overwrite_files: true\n          files:')
workflow_path.write_text(workflow, encoding='utf-8')

request_path = ROOT / '.github/apk-build-request-v1.0.4.txt'
request = request_path.read_text(encoding='utf-8')
request += '\nRetry: notification crash + Android system navigation + dynamic version hotfix\nExpected Android versionCode: 22\n'
request_path.write_text(request, encoding='utf-8')

changelog = ROOT / 'docs/CHANGELOG_V1.0.4_NATIVE_HOTFIX.md'
changelog.write_text('''# DraBornGarage v1.0.4 Native Hotfix\n\n- Bildirim izni sonrası MIUI native kapanma riski giderildi.\n- EAS/FCM kimlik bilgisi bulunmayan GitHub test APK'sında remote push token kaydı devre dışı.\n- Yerel bildirim merkezi ve yerel cihaz bildirimleri çalışmaya devam eder.\n- Remote push, Google Play final aşamasında FCM V1 kimlik bilgileriyle tekrar açılacak.\n- Android üç tuşlu navigasyon çubuğu tam şeffaf edge-to-edge yapılandırmasına alındı.\n- Personel ve müşteri alt menülerine Xiaomi safe-area yedeği eklendi.\n- Giriş ekranı sürüm bilgisi app.json'dan dinamik okunur.\n- Android test build versionCode 22.\n''', encoding='utf-8')

print('v1.0.4 native hotfix applied')
