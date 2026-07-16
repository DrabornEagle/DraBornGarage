import Constants from 'expo-constants';

export const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
export const APP_VERSION_LABEL = `v${APP_VERSION}`;
export const ANDROID_VERSION_CODE = Constants.expoConfig?.android?.versionCode ?? 1;
