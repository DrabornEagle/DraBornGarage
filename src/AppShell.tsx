import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable } from './components/AnimatedPressable';
import { PremiumBackground } from './components/PremiumBackground';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import { NotificationBell } from './notifications/NotificationBell';
import { useNotifications } from './notifications/NotificationContext';
import { AdminScreen } from './screens/AdminScreen';
import { AppointmentsScreen } from './screens/AppointmentsScreen';
import { CustomersScreen } from './screens/CustomersScreen';
import { HomeScreen, PanelMode } from './screens/HomeScreen';
import { NewWorkOrderScreen } from './screens/NewWorkOrderScreen';
import { ReceivablesScreen } from './screens/ReceivablesScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { TeamScreen } from './screens/TeamScreen';
import { WorkOrdersScreen } from './screens/WorkOrdersScreen';
import { ServiceType, WORKER_ROLES } from './types';

type Tab = 'home' | 'orders' | 'appointments' | 'customers' | 'receivables' | 'team' | 'settings';

type TabItem = {
  key: Tab;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  accent: string;
  accent2: string;
};

const STAFF_NOTIFICATION_TAB_MAP: Record<string, Tab> = {
  home: 'home',
  orders: 'orders',
  services: 'orders',
  motorcycles: 'customers',
  appointments: 'appointments',
  customers: 'customers',
  receivables: 'receivables',
  team: 'team',
  platform: 'team',
  admin: 'team',
  settings: 'settings',
  account: 'settings',
};

export function AppShell() {
  const { colors, resolvedMode } = useTheme();
  const { membership, isAdmin, workshop } = useAuth();
  const { navigationTarget, consumeNavigationTarget } = useNotifications();
  const isPureOwner = membership?.role === 'owner';
  const isOwnerMechanic = membership?.role === 'owner_mechanic';
  const canWork = Boolean(membership && WORKER_ROLES.includes(membership.role));
  const initialPanelMode: PanelMode = isAdmin || isPureOwner ? 'business' : 'mechanic';
  const [tab, setTab] = useState<Tab>(isAdmin ? 'team' : 'home');
  const [newOrderMode, setNewOrderMode] = useState<ServiceType | null>(null);
  const [staffPanelMode, setStaffPanelMode] = useState<PanelMode>(initialPanelMode);
  const [customerInitialTab, setCustomerInitialTab] = useState<'customers' | 'claims'>('customers');
  const [customerNavigationKey, setCustomerNavigationKey] = useState(0);
  const isApprentice = membership?.role === 'apprentice';
  const isOwner = isAdmin || isPureOwner || isOwnerMechanic;
  const businessRestricted = isAdmin || isPureOwner || (isOwnerMechanic && staffPanelMode === 'business');

  const openOrders = () => { if (!businessRestricted) setTab('orders'); };
  const openNew = (mode: ServiceType = 'dropoff') => {
    if (!canWork || staffPanelMode !== 'mechanic' || businessRestricted) return;
    setNewOrderMode(mode);
  };

  useEffect(() => {
    setStaffPanelMode(isAdmin || membership?.role === 'owner' ? 'business' : 'mechanic');
  }, [workshop?.id, membership?.role, isAdmin]);

  useEffect(() => {
    if (isAdmin && tab !== 'team' && tab !== 'settings') setTab('team');
    else if (businessRestricted && !['home', 'team', 'settings'].includes(tab)) setTab('home');
  }, [businessRestricted, isAdmin, tab]);

  useEffect(() => {
    if (!navigationTarget) return;
    const target = navigationTarget.targetTab ? STAFF_NOTIFICATION_TAB_MAP[navigationTarget.targetTab] : undefined;
    if (target) {
      const allowedForApprentice = !isApprentice || target === 'home' || target === 'orders' || target === 'settings';
      const allowedForBusiness = !businessRestricted || target === 'home' || target === 'team' || target === 'settings';
      if (target === 'customers' && navigationTarget.targetSection === 'claims' && allowedForBusiness) {
        setCustomerInitialTab('claims');
        setCustomerNavigationKey((value) => value + 1);
      }
      setTab(allowedForApprentice && allowedForBusiness ? target : isAdmin ? 'team' : 'home');
    }
    consumeNavigationTarget();
  }, [navigationTarget, consumeNavigationTarget, isApprentice, businessRestricted, isAdmin]);

  const screen = tab === 'home'
    ? <HomeScreen onNewOrder={openNew} onOpenOrders={openOrders} panelMode={staffPanelMode} onPanelModeChange={setStaffPanelMode} />
    : tab === 'orders'
      ? <WorkOrdersScreen onNewOrder={() => openNew('dropoff')} allowNewOrder={canWork && staffPanelMode === 'mechanic'} />
      : tab === 'appointments'
        ? <AppointmentsScreen />
        : tab === 'customers'
          ? <CustomersScreen key={`customers-${customerNavigationKey}`} initialTab={customerInitialTab} />
          : tab === 'receivables'
            ? <ReceivablesScreen />
            : tab === 'team'
              ? isAdmin ? <AdminScreen /> : <TeamScreen />
              : <SettingsScreen />;

  const tabs = useMemo<TabItem[]>(() => {
    const all: TabItem[] = [
      { key: 'home', label: isApprentice ? 'Atölye' : 'Panel', icon: 'grid-outline', activeIcon: 'grid', accent: colors.primary, accent2: colors.primary2 },
      { key: 'orders', label: isApprentice ? 'Görevler' : 'İşler', icon: 'construct-outline', activeIcon: 'construct', accent: colors.orange, accent2: colors.red },
      { key: 'appointments', label: 'Takvim', icon: 'calendar-outline', activeIcon: 'calendar', accent: colors.cyan, accent2: colors.primary2 },
      { key: 'customers', label: 'Müşteri', icon: 'people-outline', activeIcon: 'people', accent: colors.primary2, accent2: colors.cyan },
      { key: 'receivables', label: 'Alacak', icon: 'wallet-outline', activeIcon: 'wallet', accent: colors.red, accent2: colors.orange },
      {
        key: 'team',
        label: isAdmin ? 'Admin' : isOwner ? 'Merkez' : 'Rapor',
        icon: isAdmin ? 'shield-checkmark-outline' : isOwner ? 'apps-outline' : 'stats-chart-outline',
        activeIcon: isAdmin ? 'shield-checkmark' : isOwner ? 'apps' : 'stats-chart',
        accent: colors.green,
        accent2: colors.cyan,
      },
      { key: 'settings', label: 'Ayarlar', icon: 'settings-outline', activeIcon: 'settings', accent: colors.primary, accent2: colors.orange },
    ];
    if (isAdmin) return all.filter((item) => ['team', 'settings'].includes(item.key));
    if (businessRestricted) return all.filter((item) => ['home', 'team', 'settings'].includes(item.key));
    return isApprentice ? all.filter((item) => ['home', 'orders', 'settings'].includes(item.key)) : all;
  }, [colors, isAdmin, isOwner, isApprentice, businessRestricted]);

  return (
    <PremiumBackground>
      <View style={styles.flex}>{screen}</View>
      {tab !== 'customers' && tab !== 'receivables' && <NotificationBell />}
      <View style={[styles.navWrap, { borderColor: `${colors.primary}32`, shadowColor: colors.primary }]}> 
        <BlurView intensity={Platform.OS === 'android' ? 42 : 62} tint={resolvedMode} style={styles.navBlur}>
          <View style={[styles.navBackdrop, { backgroundColor: Platform.OS === 'android' ? colors.cardStrong : 'transparent' }]}> 
            <View style={styles.railRow} pointerEvents="none">
              {[colors.orange, colors.black, colors.cyan, colors.black, colors.green, colors.black, colors.red].map((color, index) => (
                <View key={`${color}-${index}`} style={[styles.railBlock, { backgroundColor: color }]} />
              ))}
            </View>
            <View style={styles.navInner}> 
              {tabs.map((item) => {
                const active = tab === item.key;
                return (
                  <AnimatedPressable key={item.key} onPress={() => { if (item.key === 'customers') setCustomerInitialTab('customers'); setTab(item.key); }} style={styles.navItem}>
                    <View style={styles.navIconShell}>
                      {active ? (
                        <LinearGradient colors={[item.accent, item.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.activeIcon}>
                          <Ionicons name={item.activeIcon} size={20} color="#fff" />
                        </LinearGradient>
                      ) : (
                        <View style={[styles.inactiveIcon, { backgroundColor: `${item.accent}12`, borderColor: `${item.accent}28` }]}> 
                          <Ionicons name={item.icon} size={19} color={item.accent} />
                        </View>
                      )}
                    </View>
                    <Text numberOfLines={1} maxFontSizeMultiplier={1.02} style={[styles.navLabel, { color: active ? item.accent : colors.textMuted }]}>{item.label}</Text>
                    <View style={[styles.activeLine, { backgroundColor: active ? item.accent : 'transparent' }]} />
                  </AnimatedPressable>
                );
              })}
            </View>
          </View>
        </BlurView>
      </View>

      {newOrderMode && !isApprentice && canWork && staffPanelMode === 'mechanic' && !businessRestricted && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]}> 
          <PremiumBackground>
            <NewWorkOrderScreen
              initialServiceType={newOrderMode}
              onClose={() => setNewOrderMode(null)}
              onCreated={() => {
                setNewOrderMode(null);
                setTab('orders');
              }}
            />
          </PremiumBackground>
        </View>
      )}
    </PremiumBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  navWrap: { position: 'absolute', left: 8, right: 8, bottom: 9, borderWidth: 1, borderRadius: 28, overflow: 'hidden', shadowOpacity: 0.26, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 16 },
  navBlur: { overflow: 'hidden' },
  navBackdrop: { minHeight: 88 },
  railRow: { height: 4, flexDirection: 'row', overflow: 'hidden', opacity: 0.85 },
  railBlock: { flex: 1, height: 10, transform: [{ skewX: '-24deg' }], marginHorizontal: 1 },
  navInner: { minHeight: 82, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 1, paddingTop: 7, paddingBottom: 7 },
  navItem: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', gap: 2 },
  navIconShell: { width: 39, height: 39, alignItems: 'center', justifyContent: 'center' },
  activeIcon: { width: 37, height: 37, borderRadius: 13, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 8, elevation: 6 },
  inactiveIcon: { width: 35, height: 35, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  navLabel: { fontSize: 10, fontWeight: '900', textAlign: 'center' },
  activeLine: { width: 15, height: 2.5, borderRadius: 3 },
});
