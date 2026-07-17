import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppRoot } from './src/AppRoot';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { NotificationCenterScreen } from './src/notifications/NotificationCenterScreen';
import { NotificationProvider } from './src/notifications/NotificationContext';
import { NotificationActionPopup } from './src/notifications/NotificationActionPopup';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';

function StatusBarBridge() {
  const { resolvedMode } = useTheme();
  return <StatusBar style={resolvedMode === 'dark' ? 'light' : 'dark'} />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppErrorBoundary>
            <NotificationProvider>
              <StatusBarBridge />
              <AppRoot />
              <NotificationActionPopup />
              <NotificationCenterScreen />
            </NotificationProvider>
          </AppErrorBoundary>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
