import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable } from './components/AnimatedPressable';
import { PremiumBackground } from './components/PremiumBackground';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import { CustomersScreen } from './screens/CustomersScreen';
import { HomeScreen } from './screens/HomeScreen';
import { NewWorkOrderScreen } from './screens/NewWorkOrderScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { TeamScreen } from './screens/TeamScreen';
import { WorkOrdersScreen } from './screens/WorkOrdersScreen';
import { ServiceType } from './types';

type Tab = 'home' | 'orders' | 'customers' | 'team' | 'settings';

type TabItem = {
  key: Tab;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  accent: string;
  accent2: string;
};

export function AppShell() {
  const { colors, resolvedMode } = useTheme();
  const { membership, isAdmin } = useAuth();
  const [tab, setTab] = useState<Tab>('home');
  const [newOrderMode, setNewOrderMode] = useState<ServiceType | null>(null);
  const isApprentice = membership?.role === 'apprentice';
  const isOwner = isAdmin || membership?.role === 'owner' || membership?.role === 'owner_mechanic';

  const openOrders = () => setTab('orders');
  const openNew = (mode: ServiceType = 'dropoff') => setNewOrderMode(mode);

  const screen = tab === 'home'
    ? <HomeScreen onNewOrder={openNew} onOpenOrders={openOrders} />
    : tab === 'orders'
      ? <WorkOrdersScreen onNewOrder={() => openNew('dropoff')} />
      : tab === 'customers'
        ? <CustomersScreen />
        : tab === 'team'
          ? <TeamScreen />
          : <SettingsScreen />;

  const tabs = useMemo<TabItem[]>(() => {
    const all: TabItem[] = [
      { key: 'home', label: isApprentice ? 'Atölye' : 'Panel', icon: 'grid-outline', activeIcon: 'grid', accent: colors.primary, accent2: colors.primary2 },
      { key: 'orders', label: isApprentice ? 'Görevler' : 'İşler', icon: 'construct-outline', activeIcon: 'construct', accent: colors.orange, accent2: colors.red },
      { key: 'customers', label: 'Müşteri', icon: 'people-outline', activeIcon: 'people', accent: colors.cyan, accent2: colors.primary2 },
      { key: 'team', label: isAdmin ? 'Admin' : isOwner ? 'Ekip' : 'Kazancım', icon: isAdmin ? 'shield-checkmark-outline' : isOwner ? 'shield-outline' : 'wallet-outline', activeIcon: isAdmin ? 'shield-checkmark' : isOwner ? 'shield' : 'wallet', accent: colors.green, accent2: colors.cyan },
      { key: 'settings', label: 'Ayarlar', icon: 'settings-outline', activeIcon: 'settings', accent: colors.red, accent2: colors.orange },
    ];
    return isApprentice ? all.filter((item) => ['home', 'orders', 'settings'].includes(item.key)) : all;
  }, [colors, isAdmin, isOwner, isApprentice]);

  return (
    <PremiumBackground>
      <View style={styles.flex}>{screen}</View>
      <View style={[styles.navWrap, { borderColor: `${colors.primary}32`, shadowColor: colors.primary }]}> 
        <BlurView intensity={Platform.OS === 'android' ? 42 : 62} tint={resolvedMode} style={styles.navBlur}>
          <View style={[styles.navBackdrop, { backgroundColor: Platform.OS === 'android' ? colors.cardStrong : 'transparent' }]}> 
            <View style={styles.railRow} pointerEvents="none">
              {[colors.orange, colors.black, colors.orange, colors.black, colors.cyan, colors.black, colors.cyan].map((color, index) => (
                <View key={`${color}-${index}`} style={[styles.railBlock, { backgroundColor: color }]} />
              ))}
            </View>
            <View style={styles.navInner}> 
              {tabs.map((item) => {
                const active = tab === item.key;
                return (
                  <AnimatedPressable key={item.key} onPress={() => setTab(item.key)} style={styles.navItem}>
                    <View style={styles.navIconShell}>
                      {active ? (
                        <LinearGradient colors={[item.accent, item.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.activeIcon}>
                          <Ionicons name={item.activeIcon} size={22} color="#fff" />
                        </LinearGradient>
                      ) : (
                        <View style={[styles.inactiveIcon, { backgroundColor: `${item.accent}12`, borderColor: `${item.accent}28` }]}> 
                          <Ionicons name={item.icon} size={21} color={item.accent} />
                        </View>
                      )}
                      {active && <View style={[styles.activeSpark, { backgroundColor: item.accent2 }]} />}
                    </View>
                    <Text
                      numberOfLines={1}
                      maxFontSizeMultiplier={1.02}
                      style={[styles.navLabel, { color: active ? item.accent : colors.textMuted }]}
                    >
                      {item.label}
                    </Text>
                    <View style={[styles.activeLine, { backgroundColor: active ? item.accent : 'transparent', shadowColor: item.accent }]} />
                  </AnimatedPressable>
                );
              })}
            </View>
          </View>
        </BlurView>
      </View>

      {newOrderMode && !isApprentice && (
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
  navWrap: {
    position: 'absolute',
    left: 11,
    right: 11,
    bottom: 10,
    borderWidth: 1,
    borderRadius: 28,
    overflow: 'hidden',
    shadowOpacity: 0.26,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 16,
  },
  navBlur: { overflow: 'hidden' },
  navBackdrop: { minHeight: 88 },
  railRow: { height: 4, flexDirection: 'row', overflow: 'hidden', opacity: 0.85 },
  railBlock: { flex: 1, height: 10, transform: [{ skewX: '-24deg' }], marginHorizontal: 1 },
  navInner: { minHeight: 82, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 4, paddingTop: 7, paddingBottom: 7 },
  navItem: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', gap: 2 },
  navIconShell: { width: 46, height: 43, alignItems: 'center', justifyContent: 'center' },
  activeIcon: { width: 43, height: 43, borderRadius: 15, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 8, elevation: 6 },
  inactiveIcon: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  activeSpark: { position: 'absolute', width: 6, height: 6, borderRadius: 6, right: 0, top: 2, shadowOpacity: 0.75, shadowRadius: 6 },
  navLabel: { fontSize: 9, fontWeight: '900', textAlign: 'center' },
  activeLine: { width: 19, height: 2.5, borderRadius: 3, marginTop: 2, shadowOpacity: 0.8, shadowRadius: 5 },
});
