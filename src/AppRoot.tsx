import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AppShell } from './AppShell';
import { GarageIcon3D } from './components/GarageIcon3D';
import { GarageReveal } from './components/GarageMotion';
import { PremiumBackground } from './components/PremiumBackground';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import { CustomerShell } from './customer/CustomerShell';
import { AuthScreen } from './screens/AuthScreen';
import { WorkshopSetupScreen } from './screens/WorkshopSetupScreen';

export function AppRoot() {
  const { colors } = useTheme();
  const { loading, session, profile, workshop, membership } = useAuth();

  if (loading) {
    return (
      <PremiumBackground>
        <View style={styles.loading}>
          <GarageReveal>
            <GarageIcon3D name="motorbike" size={94} iconSize={45} accent={colors.orange} accent2={colors.primary} animated />
          </GarageReveal>
          <Text style={[styles.eyebrow, { color: colors.orange }]}>GARAGE OS BAŞLATILIYOR</Text>
          <Text style={[styles.title, { color: colors.text }]}>DraBornGarage</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Atölye kontrol merkezi hazırlanıyor…</Text>
          <ActivityIndicator color={colors.cyan} size="large" />
        </View>
      </PremiumBackground>
    );
  }

  if (!session) return <AuthScreen />;
  if (profile?.account_mode === 'customer') return <CustomerShell />;
  if (!workshop || !membership) return <WorkshopSetupScreen />;
  return <AppShell />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 24 },
  eyebrow: { fontSize: 9, fontWeight: '900', letterSpacing: 1.2, marginTop: 8 },
  title: { fontSize: 29, fontWeight: '900', letterSpacing: -1 },
  subtitle: { fontSize: 11.5, marginBottom: 9 },
});
