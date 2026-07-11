import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { PremiumBackground } from '../components/PremiumBackground';
import { useTheme } from '../context/ThemeContext';
import { NotificationBell } from '../notifications/NotificationBell';
import { useNotifications } from '../notifications/NotificationContext';
import { CustomerAccountScreen } from './CustomerAccountScreen';
import { CustomerAppointmentsScreen } from './CustomerAppointmentsScreen';
import { CustomerHomeScreen } from './CustomerHomeScreen';
import { CustomerMotorcyclesScreen } from './CustomerMotorcyclesScreen';
import { CustomerServicesScreen } from './CustomerServicesScreen';

type Tab = 'home' | 'motorcycles' | 'appointments' | 'services' | 'account';

const CUSTOMER_NOTIFICATION_TAB_MAP: Record<string, Tab> = {
  home: 'home',
  motorcycles: 'motorcycles',
  customers: 'motorcycles',
  appointments: 'appointments',
  services: 'services',
  orders: 'services',
  receivables: 'services',
  team: 'services',
  platform: 'services',
  account: 'account',
  settings: 'account',
};

export function CustomerShell() {
  const { colors, resolvedMode } = useTheme();
  const insets = useSafeAreaInsets();
  const { navigationTarget, consumeNavigationTarget } = useNotifications();
  const [tab, setTab] = useState<Tab>('home');
  const openLinking = () => setTab('home');

  useEffect(() => {
    if (!navigationTarget) return;
    const target = navigationTarget.targetTab ? CUSTOMER_NOTIFICATION_TAB_MAP[navigationTarget.targetTab] : undefined;
    if (target) setTab(target);
    consumeNavigationTarget();
  }, [navigationTarget, consumeNavigationTarget]);

  const screen = tab === 'home'
    ? <CustomerHomeScreen onOpenServices={() => setTab('services')} onOpenAppointments={() => setTab('appointments')} />
    : tab === 'motorcycles'
      ? <CustomerMotorcyclesScreen onStartLink={openLinking} />
      : tab === 'appointments'
        ? <CustomerAppointmentsScreen onStartLink={openLinking} />
        : tab === 'services'
          ? <CustomerServicesScreen onStartLink={openLinking} />
          : <CustomerAccountScreen />;

  const tabs = useMemo(() => [
    { key: 'home' as const, label: 'Ana Sayfa', icon: 'home-outline' as const, active: 'home' as const, a: colors.primary, b: colors.primary2 },
    { key: 'motorcycles' as const, label: 'Motorlar', icon: 'bicycle-outline' as const, active: 'bicycle' as const, a: colors.cyan, b: colors.primary2 },
    { key: 'appointments' as const, label: 'Randevu', icon: 'calendar-outline' as const, active: 'calendar' as const, a: colors.orange, b: colors.red },
    { key: 'services' as const, label: 'Servisler', icon: 'construct-outline' as const, active: 'construct' as const, a: colors.green, b: colors.cyan },
    { key: 'account' as const, label: 'Hesabım', icon: 'person-circle-outline' as const, active: 'person-circle' as const, a: colors.primary2, b: colors.cyan },
  ], [colors]);

  const navBottom = Math.max(insets.bottom, 8);
  const reservedBottom = navBottom + 96;

  return <PremiumBackground>
    <View style={[styles.flex, { paddingBottom: reservedBottom }]}>{screen}</View>
    <NotificationBell />
    <View style={[styles.navWrap, { bottom: navBottom, borderColor: `${colors.primary}32`, shadowColor: colors.primary }]}>
      <BlurView intensity={Platform.OS === 'android' ? 42 : 62} tint={resolvedMode} style={styles.navBlur}>
        <View style={[styles.navBackdrop, { backgroundColor: Platform.OS === 'android' ? colors.cardStrong : 'transparent' }]}>
          <View style={styles.rail}>{[colors.cyan, colors.black, colors.orange, colors.black, colors.green].map((color, index) => <View key={`${color}-${index}`} style={[styles.railItem, { backgroundColor: color }]} />)}</View>
          <View style={styles.navInner}>{tabs.map((item) => { const selected = tab === item.key; return <AnimatedPressable key={item.key} onPress={() => setTab(item.key)} style={styles.navItem}><View style={styles.iconShell}>{selected ? <LinearGradient colors={[item.a, item.b]} style={styles.activeIcon}><Ionicons name={item.active} size={21} color="#fff" /></LinearGradient> : <View style={[styles.inactiveIcon, { backgroundColor: `${item.a}12`, borderColor: `${item.a}28` }]}><Ionicons name={item.icon} size={20} color={item.a} /></View>}</View><Text numberOfLines={1} style={[styles.label, { color: selected ? item.a : colors.textMuted }]}>{item.label}</Text><View style={[styles.line, { backgroundColor: selected ? item.a : 'transparent' }]} /></AnimatedPressable>; })}</View>
        </View>
      </BlurView>
    </View>
  </PremiumBackground>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  navWrap: { position: 'absolute', left: 10, right: 10, borderWidth: 1, borderRadius: 28, overflow: 'hidden', shadowOpacity: 0.25, shadowRadius: 20, elevation: 15 },
  navBlur: { overflow: 'hidden' },
  navBackdrop: { minHeight: 88 },
  rail: { height: 4, flexDirection: 'row' },
  railItem: { flex: 1, transform: [{ skewX: '-24deg' }] },
  navInner: { minHeight: 82, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 2, paddingTop: 6, paddingBottom: 7 },
  navItem: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', gap: 2 },
  iconShell: { width: 43, height: 42, alignItems: 'center', justifyContent: 'center' },
  activeIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  inactiveIcon: { width: 39, height: 39, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 8, fontWeight: '900', textAlign: 'center' },
  line: { width: 17, height: 2.5, borderRadius: 3 },
});
