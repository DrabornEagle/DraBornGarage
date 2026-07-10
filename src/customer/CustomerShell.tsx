import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { PremiumBackground } from '../components/PremiumBackground';
import { useTheme } from '../context/ThemeContext';
import { CustomerAccountScreen } from './CustomerAccountScreen';
import { CustomerHomeScreen } from './CustomerHomeScreen';
import { CustomerMotorcyclesScreen } from './CustomerMotorcyclesScreen';
import { CustomerServicesScreen } from './CustomerServicesScreen';

type CustomerTab = 'home' | 'motorcycles' | 'services' | 'account';

export function CustomerShell() {
  const { colors, resolvedMode } = useTheme();
  const [tab, setTab] = useState<CustomerTab>('home');

  const screen = tab === 'home'
    ? <CustomerHomeScreen onOpenServices={() => setTab('services')} />
    : tab === 'motorcycles'
      ? <CustomerMotorcyclesScreen />
      : tab === 'services'
        ? <CustomerServicesScreen />
        : <CustomerAccountScreen />;

  const tabs = useMemo(() => [
    { key: 'home' as const, label: 'Ana Sayfa', icon: 'home-outline' as const, activeIcon: 'home' as const, accent: colors.primary, accent2: colors.primary2 },
    { key: 'motorcycles' as const, label: 'Motorlarım', icon: 'bicycle-outline' as const, activeIcon: 'bicycle' as const, accent: colors.cyan, accent2: colors.primary2 },
    { key: 'services' as const, label: 'Servisler', icon: 'construct-outline' as const, activeIcon: 'construct' as const, accent: colors.orange, accent2: colors.red },
    { key: 'account' as const, label: 'Hesabım', icon: 'person-circle-outline' as const, activeIcon: 'person-circle' as const, accent: colors.green, accent2: colors.cyan },
  ], [colors]);

  return (
    <PremiumBackground>
      <View style={styles.flex}>{screen}</View>
      <View style={[styles.navWrap, { borderColor: `${colors.primary}34`, shadowColor: colors.primary }]}> 
        <BlurView intensity={Platform.OS === 'android' ? 42 : 62} tint={resolvedMode} style={styles.navBlur}>
          <View style={[styles.navBackdrop, { backgroundColor: Platform.OS === 'android' ? colors.cardStrong : 'transparent' }]}> 
            <View style={styles.railRow} pointerEvents="none">
              {[colors.cyan, colors.black, colors.primary, colors.black, colors.orange, colors.black, colors.green].map((color, index) => <View key={`${color}-${index}`} style={[styles.railBlock, { backgroundColor: color }]} />)}
            </View>
            <View style={styles.navInner}>
              {tabs.map((item) => {
                const active = tab === item.key;
                return (
                  <AnimatedPressable key={item.key} onPress={() => setTab(item.key)} style={styles.navItem}>
                    <View style={styles.iconShell}>
                      {active ? (
                        <LinearGradient colors={[item.accent, item.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.activeIcon}><Ionicons name={item.activeIcon} size={22} color="#fff" /></LinearGradient>
                      ) : (
                        <View style={[styles.inactiveIcon, { backgroundColor: `${item.accent}12`, borderColor: `${item.accent}28` }]}><Ionicons name={item.icon} size={21} color={item.accent} /></View>
                      )}
                    </View>
                    <Text numberOfLines={1} maxFontSizeMultiplier={1.02} style={[styles.label, { color: active ? item.accent : colors.textMuted }]}>{item.label}</Text>
                    <View style={[styles.activeLine, { backgroundColor: active ? item.accent : 'transparent', shadowColor: item.accent }]} />
                  </AnimatedPressable>
                );
              })}
            </View>
          </View>
        </BlurView>
      </View>
    </PremiumBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  navWrap: { position: 'absolute', left: 11, right: 11, bottom: 10, borderWidth: 1, borderRadius: 28, overflow: 'hidden', shadowOpacity: 0.26, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 16 },
  navBlur: { overflow: 'hidden' },
  navBackdrop: { minHeight: 88 },
  railRow: { height: 4, flexDirection: 'row', overflow: 'hidden', opacity: 0.85 },
  railBlock: { flex: 1, height: 10, transform: [{ skewX: '-24deg' }], marginHorizontal: 1 },
  navInner: { minHeight: 82, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 4, paddingTop: 7, paddingBottom: 7 },
  navItem: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', gap: 2 },
  iconShell: { width: 46, height: 43, alignItems: 'center', justifyContent: 'center' },
  activeIcon: { width: 43, height: 43, borderRadius: 15, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 8, elevation: 6 },
  inactiveIcon: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 9, fontWeight: '900', textAlign: 'center' },
  activeLine: { width: 19, height: 2.5, borderRadius: 3, marginTop: 2, shadowOpacity: 0.8, shadowRadius: 5 },
});
