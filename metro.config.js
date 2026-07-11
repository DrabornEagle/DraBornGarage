const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const notificationsCompat = path.resolve(__dirname, 'src/notifications/expoNotificationsCompat.ts');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'expo-notifications') {
    return context.resolveRequest(context, notificationsCompat, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
