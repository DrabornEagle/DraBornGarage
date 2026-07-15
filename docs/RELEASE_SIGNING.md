# DraBornGarage Android Release Signing

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
