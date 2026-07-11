import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppRoot } from './src/AppRoot';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { NotificationCenterScreen } from './src/notifications/NotificationCenterScreen';
import { NotificationProvider } from './src/notifications/NotificationContext';

function StatusBarBridge() {
  const { resolvedMode } = useTheme();
  return <StatusBar style={resolvedMode === 'dark' ? 'light' : 'dark'} />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <StatusBarBridge />
            <AppRoot />
            <NotificationCenterScreen />
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
