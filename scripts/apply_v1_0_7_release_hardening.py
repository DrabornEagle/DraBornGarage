from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        if new in text:
            return text
        raise RuntimeError(f"Patch target not found: {label}")
    return text.replace(old, new, 1)


# Version metadata
app_path = ROOT / "app.json"
app = json.loads(app_path.read_text(encoding="utf-8"))
expo = app["expo"]
expo["version"] = "1.0.7"
expo.setdefault("android", {})["versionCode"] = 25
expo.setdefault("ios", {})["buildNumber"] = "25"
app_path.write_text(json.dumps(app, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

pkg_path = ROOT / "package.json"
pkg = json.loads(pkg_path.read_text(encoding="utf-8"))
pkg["version"] = "1.0.7"
pkg_path.write_text(json.dumps(pkg, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

lock_path = ROOT / "package-lock.json"
lock = json.loads(lock_path.read_text(encoding="utf-8"))
lock["version"] = "1.0.7"
lock.setdefault("packages", {}).setdefault("", {})["version"] = "1.0.7"
lock_path.write_text(json.dumps(lock, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

# Profile loading: keep login alive even if the optional mileage column is temporarily unavailable.
auth = read("src/context/AuthContext.tsx")
auth = replace_once(
    auth,
    "supabase.from('profiles').select('id, full_name, phone, avatar_url, is_admin, account_mode, customer_plate, customer_motorcycle_brand, customer_motorcycle_model, customer_motorcycle_odometer').eq('id', userId).maybeSingle(),",
    "supabase.from('profiles').select('id, full_name, phone, avatar_url, is_admin, account_mode, customer_plate, customer_motorcycle_brand, customer_motorcycle_model').eq('id', userId).maybeSingle(),",
    "safe base profile query",
)
auth = replace_once(
    auth,
    "    if (!profileError && !profileData) {\n      await supabase.auth.signOut({ scope: 'local' });\n      setSession(null);\n      clearState();\n      setLoading(false);\n      return;\n    }\n\n    const nextProfile = (profileData as Profile | null) ?? null;",
    "    if (profileError || !profileData) {\n      await supabase.auth.signOut({ scope: 'local' });\n      setSession(null);\n      clearState();\n      setLoading(false);\n      return;\n    }\n\n    const { data: odometerProfile } = await supabase\n      .from('profiles')\n      .select('customer_motorcycle_odometer')\n      .eq('id', userId)\n      .maybeSingle();\n    const nextProfile = {\n      ...(profileData as Profile),\n      customer_motorcycle_odometer: Number.isFinite(Number(odometerProfile?.customer_motorcycle_odometer))\n        ? Number(odometerProfile?.customer_motorcycle_odometer)\n        : null,\n    } as Profile;",
    "best effort odometer query",
)
write("src/context/AuthContext.tsx", auth)

# Push initialization: never install native token listeners without a real project ID.
notification = read("src/notifications/NotificationContextV101.tsx")
notification = replace_once(
    notification,
    "const IS_EXPO_GO = Constants.appOwnership === 'expo';\nconst NATIVE_PUSH_ENABLED = process.env.EXPO_PUBLIC_NATIVE_PUSH_ENABLED === 'true';\nconst APP_VERSION = Constants.expoConfig?.version ?? '1.0.6';",
    "const IS_EXPO_GO = Constants.appOwnership === 'expo';\nconst EAS_PROJECT_ID = process.env.EXPO_PUBLIC_EAS_PROJECT_ID\n  || Constants.expoConfig?.extra?.eas?.projectId\n  || Constants.easConfig?.projectId\n  || null;\nconst NATIVE_PUSH_ENABLED = process.env.EXPO_PUBLIC_NATIVE_PUSH_ENABLED === 'true' && Boolean(EAS_PROJECT_ID);\nconst APP_VERSION = Constants.expoConfig?.version ?? '1.0.7';",
    "push project constants",
)
notification = replace_once(
    notification,
    "  const pushStatusRef = useRef<PushRegistrationStatus>('idle');\n\n  useEffect(() => { preferencesRef.current = preferences; }, [preferences]);\n  useEffect(() => { pushStatusRef.current = pushStatus; }, [pushStatus]);",
    "  const pushStatusRef = useRef<PushRegistrationStatus>('idle');\n  const unreadCountRef = useRef(0);\n\n  useEffect(() => { preferencesRef.current = preferences; }, [preferences]);\n  useEffect(() => { pushStatusRef.current = pushStatus; }, [pushStatus]);\n  useEffect(() => { unreadCountRef.current = unreadCount; }, [unreadCount]);",
    "unread count ref",
)
notification = replace_once(
    notification,
    "      const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID\n        || Constants.expoConfig?.extra?.eas?.projectId\n        || Constants.easConfig?.projectId;\n      if (!projectId) {\n        setPushStatus('missing_project');\n        return false;\n      }",
    "      if (!EAS_PROJECT_ID) {\n        setPushStatus('missing_project');\n        return false;\n      }",
    "single EAS project source",
)
notification = replace_once(
    notification,
    "      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;",
    "      const token = (await Notifications.getExpoPushTokenAsync({ projectId: EAS_PROJECT_ID })).data;",
    "push token project ID",
)
notification = replace_once(
    notification,
    "          presentDueNotifications([payload.new as GarageNotification], preferencesRef.current, unreadCount + 1);",
    "          presentDueNotifications([payload.new as GarageNotification], preferencesRef.current, unreadCountRef.current + 1);",
    "stable unread count callback",
)
notification = replace_once(
    notification,
    "    const tokenListener = !NATIVE_PUSH_ENABLED || IS_EXPO_GO ? null : Notifications.addPushTokenListener(() => { registerPushNotifications(); });\n    return () => {\n      appState.remove();\n      tokenListener?.remove();\n      supabase.removeChannel(channel);\n    };\n  }, [session?.user, refresh, presentDueNotifications, cancelGarageSchedules, registerPushNotifications, unreadCount]);",
    "    let tokenListener: { remove: () => void } | null = null;\n    if (NATIVE_PUSH_ENABLED && !IS_EXPO_GO) {\n      try {\n        tokenListener = Notifications.addPushTokenListener(() => { registerPushNotifications(); });\n      } catch {\n        setPushStatus('error');\n      }\n    }\n    return () => {\n      appState.remove();\n      tokenListener?.remove();\n      supabase.removeChannel(channel);\n    };\n  }, [session?.user, refresh, presentDueNotifications, cancelGarageSchedules, registerPushNotifications]);",
    "safe push listener",
)
write("src/notifications/NotificationContextV101.tsx", notification)

# App-level recovery screen for render/effect failures after login.
write(
    "src/components/AppErrorBoundary.tsx",
    """import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { AnimatedPressable } from './AnimatedPressable';

type BoundaryProps = {
  children: React.ReactNode;
  fallback: (error: Error, reset: () => void) => React.ReactNode;
};

type BoundaryState = { error: Error | null };

class Boundary extends React.Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('DraBornGarage recovered from an application error', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    return this.state.error ? this.props.fallback(this.state.error, this.reset) : this.props.children;
  }
}

function RecoveryScreen({ error, reset }: { error: Error; reset: () => void }) {
  const { signOut } = useAuth();
  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>DraBornGarage • Güvenli Kurtarma</Text>
        <Text style={styles.title}>Uygulama kapanmadan hata yakalandı</Text>
        <Text style={styles.body}>Oturum veya bildirim başlatılırken beklenmeyen bir sorun oluştu. Önce yeniden dene; devam ederse oturumu temizleyip tekrar giriş yap.</Text>
        <View style={styles.errorBox}><Text selectable style={styles.errorText}>{error.message || 'Bilinmeyen uygulama hatası'}</Text></View>
        <AnimatedPressable onPress={reset} style={styles.primary}><Text style={styles.primaryText}>Yeniden Dene</Text></AnimatedPressable>
        <AnimatedPressable onPress={() => signOut()} style={styles.secondary}><Text style={styles.secondaryText}>Oturumu Temizle</Text></AnimatedPressable>
      </ScrollView>
    </View>
  );
}

export function AppErrorBoundary({ children }: { children: React.ReactNode }) {
  return <Boundary fallback={(error, reset) => <RecoveryScreen error={error} reset={reset} />}>{children}</Boundary>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#071019' },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 16 },
  eyebrow: { color: '#35E0C1', fontSize: 12, fontWeight: '900', letterSpacing: 1.1 },
  title: { color: '#FFFFFF', fontSize: 27, lineHeight: 33, fontWeight: '900' },
  body: { color: '#AAB6C5', fontSize: 15, lineHeight: 23 },
  errorBox: { borderWidth: 1, borderColor: '#F05A67AA', borderRadius: 16, padding: 14, backgroundColor: '#F05A6712' },
  errorText: { color: '#FFD6DA', fontSize: 12, lineHeight: 18 },
  primary: { minHeight: 54, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7C5CFF' },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  secondary: { minHeight: 54, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#526176' },
  secondaryText: { color: '#D8E1EC', fontSize: 15, fontWeight: '900' },
});
""",
)

app_tsx = read("App.tsx")
app_tsx = replace_once(
    app_tsx,
    "import { NotificationProvider } from './src/notifications/NotificationContext';",
    "import { NotificationProvider } from './src/notifications/NotificationContext';\nimport { AppErrorBoundary } from './src/components/AppErrorBoundary';",
    "error boundary import",
)
app_tsx = replace_once(
    app_tsx,
    "        <AuthProvider>\n          <NotificationProvider>\n            <StatusBarBridge />\n            <AppRoot />\n            <NotificationCenterScreen />\n          </NotificationProvider>\n        </AuthProvider>",
    "        <AuthProvider>\n          <AppErrorBoundary>\n            <NotificationProvider>\n              <StatusBarBridge />\n              <AppRoot />\n              <NotificationCenterScreen />\n            </NotificationProvider>\n          </AppErrorBoundary>\n        </AuthProvider>",
    "app error boundary wrapper",
)
write("App.tsx", app_tsx)

# Signing patch used by both APK and AAB workflows after Expo prebuild.
write(
    "scripts/configure_android_signing.py",
    """from pathlib import Path

path = Path('android/app/build.gradle')
text = path.read_text(encoding='utf-8')
marker = '// DRABORNGARAGE_PRODUCTION_SIGNING'
if marker not in text:
    text += '''\n\n// DRABORNGARAGE_PRODUCTION_SIGNING\nandroid {\n    signingConfigs {\n        draborngarageRelease {\n            storeFile file(System.getenv('DRABORNGARAGE_KEYSTORE_PATH'))\n            storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')\n            keyAlias System.getenv('ANDROID_KEY_ALIAS')\n            keyPassword System.getenv('ANDROID_KEY_PASSWORD')\n        }\n    }\n    buildTypes {\n        release {\n            signingConfig signingConfigs.draborngarageRelease\n        }\n    }\n}\n'''
path.write_text(text, encoding='utf-8')
""",
)

write(
    "eas.json",
    json.dumps({
        "cli": {"version": ">= 21.0.1"},
        "build": {
            "production": {"credentialsSource": "local", "android": {"buildType": "app-bundle"}},
            "preview-apk": {"credentialsSource": "local", "distribution": "internal", "android": {"buildType": "apk"}},
        },
    }, indent=2) + "\n",
)

# Never commit local signing secrets.
gitignore_path = ROOT / ".gitignore"
gitignore = gitignore_path.read_text(encoding="utf-8") if gitignore_path.exists() else ""
for line in ["credentials.json", "android/keystores/", "*.jks", "*.keystore", "firebase-service-account*.json"]:
    if line not in gitignore.splitlines():
        gitignore += ("\n" if gitignore and not gitignore.endswith("\n") else "") + line + "\n"
gitignore_path.write_text(gitignore, encoding="utf-8")

write(
    "docs/RELEASE_SIGNING.md",
    """# DraBornGarage Android Release Signing

All future APK and AAB builds use the same production upload keystore.

Required GitHub Actions secrets:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`
- `EXPO_TOKEN` (required to create/link the EAS project when `extra.eas.projectId` is not yet present)

Optional until FCM V1 upload is completed:

- `FIREBASE_SERVICE_ACCOUNT_JSON`

The EAS project ID is public project configuration, not a password. Release workflows obtain it through `eas project:init`, write it to `app.json` under `expo.extra.eas.projectId`, and expose it to the build as `EXPO_PUBLIC_EAS_PROJECT_ID`.

Production upload certificate SHA-256:

`61:69:5A:48:64:07:75:75:3A:0C:68:B1:8E:23:AC:34:56:FE:D5:AD:DE:50:E5:FF:92:BD:06:A4:6D:4D:EA:EE`

Never commit the keystore, credentials.json, passwords, or Firebase service-account private key.
""",
)

print("DraBornGarage v1.0.7 release hardening patch applied")
