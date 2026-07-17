from pathlib import Path

path = Path('src/notifications/NotificationContextV101.tsx')
text = path.read_text(encoding='utf-8')
old = "const NATIVE_PUSH_ENABLED = !IS_EXPO_GO && Boolean(EAS_PROJECT_ID) && process.env.EXPO_PUBLIC_NATIVE_PUSH_ENABLED !== 'false';"
new = "const NATIVE_PUSH_ENABLED = false; // Native token registration is handled only by NotificationContextV116."
if old not in text:
    if new in text:
        print('Hotfix already applied')
        raise SystemExit(0)
    raise SystemExit('Legacy native push marker not found')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
print('Disabled duplicate legacy native push registration')
