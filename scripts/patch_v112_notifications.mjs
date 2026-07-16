import fs from 'node:fs';

function replaceRequired(text, from, to, file) {
  if (!text.includes(from)) throw new Error(`${file}: expected text not found: ${from.slice(0, 100)}`);
  return text.replace(from, to);
}

function writeJson(path, value) {
  fs.writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
}

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.version = '1.1.2';
writeJson('package.json', pkg);

const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
lock.version = '1.1.2';
lock.packages[''].version = '1.1.2';
writeJson('package-lock.json', lock);

const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
app.expo.version = '1.1.2';
app.expo.android.versionCode = 1;
writeJson('app.json', app);

const contextPath = 'src/notifications/NotificationContextV101.tsx';
let context = fs.readFileSync(contextPath, 'utf8');

context = replaceRequired(
  context,
  "const NATIVE_PUSH_ENABLED = !IS_EXPO_GO && Boolean(EAS_PROJECT_ID) && process.env.EXPO_PUBLIC_NATIVE_PUSH_ENABLED !== 'false';\n",
  `const NATIVE_PUSH_ENABLED = !IS_EXPO_GO && Boolean(EAS_PROJECT_ID) && process.env.EXPO_PUBLIC_NATIVE_PUSH_ENABLED !== 'false';
const ANDROID_APPLICATION_ID = Constants.expoConfig?.android?.package || 'com.draborneagle.draborngarage';

function notificationRegistrationError(error: unknown, stage: string) {
  const raw = error instanceof Error ? error.message : typeof error === 'string' ? error : 'Bilinmeyen hata';
  if (raw.includes('undefined is not a function')) {
    return \`${'${stage}'}: native bildirim köprüsündeki gerekli fonksiyon bulunamadı\`;
  }
  return \`${'${stage}'}: ${'${raw}'}\`;
}

async function getExpoPushTokenForDevice(deviceId: string) {
  if (!EAS_PROJECT_ID) throw new Error('EAS proje kimliği bulunamadı');
  const api = Notifications as typeof Notifications & Record<string, unknown>;
  if (typeof api.getDevicePushTokenAsync !== 'function') {
    throw new Error('getDevicePushTokenAsync kullanılamıyor');
  }

  const devicePushToken = await Promise.resolve(Notifications.getDevicePushTokenAsync());
  const rawDeviceToken = (devicePushToken as { data?: unknown }).data;
  if (typeof rawDeviceToken !== 'string' || rawDeviceToken.trim().length < 20) {
    throw new Error('Geçerli Android FCM cihaz tokenı alınamadı');
  }

  if (typeof api.getExpoPushTokenAsync === 'function') {
    return Promise.resolve(Notifications.getExpoPushTokenAsync({
      projectId: EAS_PROJECT_ID,
      deviceId,
      devicePushToken,
      applicationId: ANDROID_APPLICATION_ID,
    }));
  }

  const response = await fetch('https://exp.host/--/api/v2/push/getExpoPushToken', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      type: Platform.OS === 'ios' ? 'apns' : 'fcm',
      deviceId: deviceId.toLowerCase(),
      development: false,
      appId: ANDROID_APPLICATION_ID,
      deviceToken: rawDeviceToken,
      projectId: EAS_PROJECT_ID,
    }),
  });
  const payload = await response.json().catch(() => null) as { data?: { expoPushToken?: unknown }; errors?: unknown } | null;
  const expoPushToken = payload?.data?.expoPushToken;
  if (!response.ok || typeof expoPushToken !== 'string') {
    throw new Error(\`Expo push token servisi ${'${response.status}'} yanıtı verdi\`);
  }
  return { type: 'expo' as const, data: expoPushToken };
}
`,
  contextPath,
);

context = replaceRequired(
  context,
  "  sendTestNotification: () => Promise<boolean>;\n  sendClosedAppTestNotification: () => Promise<boolean>;\n",
  "  previewNotificationSound: (sound: NotificationSoundKey) => Promise<boolean>;\n  sendTestNotification: () => Promise<boolean>;\n  sendClosedAppTestNotification: () => Promise<boolean>;\n",
  contextPath,
);

const registerStart = "  const registerPushNotifications = useCallback(async () => {\n";
const registerEnd = "  }, [session?.user]);\n\n  const requestLocalNotifications";
const startIndex = context.indexOf(registerStart);
const endIndex = context.indexOf(registerEnd, startIndex);
if (startIndex < 0 || endIndex < 0) throw new Error('NotificationContext: register block not found');
const registerReplacement = `  const registerPushNotifications = useCallback(async () => {
    if (!session?.user || !preferencesRef.current.push_notifications_enabled) return false;
    setPushError(null);
    if (IS_EXPO_GO) {
      setPushStatus('expo_go');
      setPushError('Expo Go uzaktan push tokenı oluşturmaz. DraBornGarage Release APK kullanmalısın.');
      return false;
    }
    if (!NATIVE_PUSH_ENABLED || !EAS_PROJECT_ID) {
      setPushStatus('missing_project');
      setPushError('EAS proje kimliği native uygulama yapılandırmasına eklenmemiş.');
      return false;
    }

    let stage = 'Bildirim kanalları hazırlanamadı';
    try {
      const api = Notifications as typeof Notifications & Record<string, unknown>;
      await ensureAndroidChannels();

      stage = 'Bildirim izni okunamadı';
      if (typeof api.getPermissionsAsync !== 'function') throw new Error('getPermissionsAsync kullanılamıyor');
      const current = await Promise.resolve(Notifications.getPermissionsAsync());

      stage = 'Bildirim izni istenemedi';
      let permission = current;
      if (current.status !== 'granted') {
        if (typeof api.requestPermissionsAsync !== 'function') throw new Error('requestPermissionsAsync kullanılamıyor');
        permission = await Promise.resolve(Notifications.requestPermissionsAsync());
      }
      if (mountedRef.current) setPermissionStatus(permission.status);
      if (permission.status !== 'granted') {
        setPushStatus('denied');
        setPushError('Android bildirim izni verilmedi. Telefon ayarlarından DraBornGarage bildirimlerini aç.');
        return false;
      }

      let deviceId = await AsyncStorage.getItem(DEVICE_ID_STORAGE_KEY);
      if (!deviceId) {
        deviceId = \`garage-${'${Date.now()}'}-${'${Math.random().toString(36).slice(2, 12)}'}\`;
        await AsyncStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
      }

      stage = 'Android FCM ve Expo push tokenı alınamadı';
      const tokenResult = await getExpoPushTokenForDevice(deviceId);
      const token = typeof tokenResult.data === 'string' ? tokenResult.data.trim() : '';
      if (!/^Expo(nent)?PushToken\\[[^\\]]+\\]$/.test(token)) {
        throw new Error('Geçerli Expo push tokenı alınamadı');
      }

      stage = 'Push tokenı DraBornGarage sunucusuna kaydedilemedi';
      const { data, error } = await supabase.rpc('notification_register_push_token', {
        p_expo_push_token: token,
        p_device_id: deviceId,
        p_platform: Platform.OS,
        p_app_version: APP_VERSION,
      });
      if (error) throw error;
      if (!(data as { registered?: boolean } | null)?.registered) throw new Error('Sunucu tokenı doğrulamadı');

      await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
      setPushStatus('registered');
      setPushError(null);
      return true;
    } catch (error) {
      setPushStatus('error');
      setPushError(notificationRegistrationError(error, stage));
      return false;
    }
  }, [session?.user]);

  const requestLocalNotifications`;
context = context.slice(0, startIndex) + registerReplacement + context.slice(endIndex + registerEnd.length);

context = replaceRequired(
  context,
  "      if (merged.push_notifications_enabled && NATIVE_PUSH_ENABLED) await registerPushNotifications();\n",
  "      if (merged.push_notifications_enabled && NATIVE_PUSH_ENABLED) void registerPushNotifications();\n",
  contextPath,
);
context = replaceRequired(
  context,
  "    if (next.push_notifications_enabled && NATIVE_PUSH_ENABLED) await registerPushNotifications();\n",
  "    if (next.push_notifications_enabled && NATIVE_PUSH_ENABLED) void registerPushNotifications();\n",
  contextPath,
);

context = replaceRequired(
  context,
  `    let tokenListener: { remove: () => void } | null = null;
    if (NATIVE_PUSH_ENABLED && !IS_EXPO_GO) {
      try {
        tokenListener = Notifications.addPushTokenListener(() => { registerPushNotifications(); });
      } catch {
        setPushStatus('error');
      }
    }
`,
  `    let tokenListener: { remove: () => void } | null = null;
    const notificationApi = Notifications as typeof Notifications & Record<string, unknown>;
    if (NATIVE_PUSH_ENABLED && !IS_EXPO_GO && typeof notificationApi.addPushTokenListener === 'function') {
      try {
        tokenListener = Notifications.addPushTokenListener(() => { void registerPushNotifications(); });
      } catch (error) {
        setPushStatus('error');
        setPushError(notificationRegistrationError(error, 'Push token değişikliği dinlenemedi'));
      }
    }
`,
  contextPath,
);

const previewMarker = "  const sendTestNotification = useCallback(async () => {\n";
const previewIndex = context.indexOf(previewMarker);
if (previewIndex < 0) throw new Error('NotificationContext: test marker not found');
const previewBlock = `  const previewNotificationSound = useCallback(async (sound: NotificationSoundKey) => {
    const allowed = permissionStatus === 'granted' || await requestLocalNotifications();
    if (!allowed) return false;
    try {
      await ensureAndroidChannels();
      const option = NOTIFICATION_SOUND_OPTIONS.find((item) => item.key === sound);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: option?.label || 'Bildirim sesi seçildi',
          body: sound === 'silent' ? 'Sessiz bildirim ve titreşim önizlemesi.' : 'Bu ses DraBornGarage bildirimlerinde kullanılacak.',
          sound: soundFile(sound),
          data: { source: 'draborngarage', targetTab: 'settings', soundPreview: true },
        },
        trigger: Platform.OS === 'android'
          ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: channelId(sound) }
          : null,
      });
      return true;
    } catch {
      return false;
    }
  }, [permissionStatus, requestLocalNotifications]);

`;
context = context.slice(0, previewIndex) + previewBlock + context.slice(previewIndex);

context = replaceRequired(
  context,
  "    openNotification, updatePreferences, requestLocalNotifications, registerPushNotifications, sendTestNotification, sendClosedAppTestNotification, consumeNavigationTarget,\n",
  "    openNotification, updatePreferences, requestLocalNotifications, registerPushNotifications, previewNotificationSound, sendTestNotification, sendClosedAppTestNotification, consumeNavigationTarget,\n",
  contextPath,
);
context = replaceRequired(
  context,
  "openNotification, updatePreferences, requestLocalNotifications, registerPushNotifications, sendTestNotification, sendClosedAppTestNotification, consumeNavigationTarget]);\n",
  "openNotification, updatePreferences, requestLocalNotifications, registerPushNotifications, previewNotificationSound, sendTestNotification, sendClosedAppTestNotification, consumeNavigationTarget]);\n",
  contextPath,
);
fs.writeFileSync(contextPath, context);

const screenPath = 'src/notifications/NotificationCenterScreen.tsx';
let screen = fs.readFileSync(screenPath, 'utf8');
screen = replaceRequired(
  screen,
  "    registerPushNotifications,\n    sendTestNotification,\n",
  "    registerPushNotifications,\n    previewNotificationSound,\n    sendTestNotification,\n",
  screenPath,
);
screen = replaceRequired(
  screen,
  `  const selectSound = async (sound: NotificationSoundKey) => {
    setSaving(true);
    const error = await updatePreferences({ notification_sound: sound });
    setSaving(false);
    if (error) Alert.alert('Bildirim sesi kaydedilemedi', error);
  };
`,
  `  const selectSound = async (sound: NotificationSoundKey) => {
    setSaving(true);
    const error = await updatePreferences({ notification_sound: sound });
    const previewed = !error && await previewNotificationSound(sound);
    setSaving(false);
    if (error) Alert.alert('Bildirim sesi kaydedilemedi', error);
    else if (!previewed) Alert.alert('Ses seçildi', 'Seçim kaydedildi; önizleme için telefon bildirim iznini ve Bildirim Sesi seviyesini kontrol et.');
  };
`,
  screenPath,
);
screen = replaceRequired(
  screen,
  `    Alert.alert(enabled ? 'Uygulama kapalı bildirimleri hazır' : 'Native APK kurulumu gerekli', enabled
      ? 'Yeni bildirimler uygulama kapalıyken de seçtiğin sesle gelebilir.'
      : 'Expo Go Android uzaktan push alamaz. EAS ile oluşturulan APK kurulduğunda bu özellik otomatik etkinleşir.');
`,
  `    Alert.alert(enabled ? 'Uygulama kapalı bildirimleri hazır' : 'Push kaydı tamamlanamadı', enabled
      ? 'Yeni bildirimler uygulama kapalıyken de seçtiğin sesle gelebilir.'
      : 'Gerçek hata Bildirim Ayarları ekranındaki uyarı kartında gösteriliyor. İnternet bağlantısını kontrol edip tekrar dene.');
`,
  screenPath,
);
fs.writeFileSync(screenPath, screen);

let readme = fs.readFileSync('README.md', 'utf8');
readme = readme.replace('**v1.1.1 — Bildirim İzni ve Zil Sesi Düzeltmesi**', '**v1.1.2 — Kapalı Uygulama Pushu ve Randevu Bildirim Düzeltmesi**');
readme = readme.replace('`v1.1.0`, ardından `v1.1.1`, `v1.1.2`…', '`v1.1.0`, `v1.1.1`, ardından `v1.1.2`…');
fs.writeFileSync('README.md', readme);

const handoffPath = 'docs/DraBornGarage_v1.0.0_TESLIM_VE_DEVAM.md';
if (fs.existsSync(handoffPath)) {
  let handoff = fs.readFileSync(handoffPath, 'utf8');
  handoff = handoff.replace('**Güncel geliştirme sürümü:** `v1.1.1`', '**Güncel geliştirme sürümü:** `v1.1.2`');
  handoff = handoff.replace('içerik v1.1.0 ile günceldir', 'içerik v1.1.2 ile günceldir');
  fs.writeFileSync(handoffPath, handoff);
}

console.log('v1.1.2 notification delivery patch applied');
