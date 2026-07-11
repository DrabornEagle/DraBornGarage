import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AppShell } from './AppShell';
import { PremiumBackground } from './components/PremiumBackground';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import { CustomerShell } from './customer/CustomerShell';
import { AuthScreen } from './screens/AuthScreen';
import { WorkshopSetupScreen } from './screens/WorkshopSetupScreen';

export function AppRoot() {
  const { colors } = useTheme();
  const { loading, session, profile, workshop, membership, isAdmin } = useAuth();

  if (loading) {
    return <PremiumBackground><View style={styles.loading}><View style={[styles.logo, { backgroundColor: `${colors.primary}20` }]}><Ionicons name="construct" size={34} color={colors.primary} /></View><Text style={[styles.title, { color: colors.text }]}>DraBornGarage</Text><ActivityIndicator color={colors.primary} size="large" /></View></PremiumBackground>;
  }

  if (!session) return <AuthScreen />;
  if (isAdmin) return <AppShell />;
  if (profile?.account_mode === 'customer') return <CustomerShell />;
  if (!workshop || !membership) return <WorkshopSetupScreen />;
  return <AppShell />;
}

const styles = StyleSheet.create({ loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }, logo: { width: 74, height: 74, borderRadius: 25, alignItems: 'center', justifyContent: 'center' }, title: { fontSize: 28, fontWeight: '900', letterSpacing: -1 } });
