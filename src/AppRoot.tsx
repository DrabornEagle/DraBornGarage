import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AppShellV102 } from './AppShellV102';
import { PremiumBackground } from './components/PremiumBackground';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import { CustomerShell } from './customer/CustomerShell';
import { ApplicationEntryScreen } from './screens/ApplicationEntryScreen';
import { AuthScreen } from './screens/AuthScreen';
import { WelcomeScreen } from './screens/WelcomeScreen';

export function AppRoot() {
  const { colors } = useTheme();
  const { loading, session, workshop, membership, isAdmin, accountMode } = useAuth();
  const [welcomeCompleted, setWelcomeCompleted] = useState(false);

  useEffect(() => {
    if (session) setWelcomeCompleted(true);
  }, [session]);

  if (loading) {
    return <PremiumBackground><View style={styles.loading}><View style={[styles.logo, { backgroundColor: `${colors.primary}20` }]}><Ionicons name="construct" size={34} color={colors.primary} /></View><Text style={[styles.title, { color: colors.text }]}>DraBornGarage</Text><ActivityIndicator color={colors.primary} size="large" /></View></PremiumBackground>;
  }

  if (!session && !welcomeCompleted) return <WelcomeScreen onStart={() => setWelcomeCompleted(true)} />;
  if (!session) return <AuthScreen />;
  if (isAdmin) return <AppShellV102 />;
  if (workshop && membership) return <AppShellV102 />;
  if (accountMode === 'staff') return <ApplicationEntryScreen />;
  return <CustomerShell />;
}

const styles = StyleSheet.create({ loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }, logo: { width: 74, height: 74, borderRadius: 25, alignItems: 'center', justifyContent: 'center' }, title: { fontSize: 28, fontWeight: '900', letterSpacing: -1 } });
