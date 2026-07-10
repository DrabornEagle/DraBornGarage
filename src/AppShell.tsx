import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
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

  const tabs = useMemo(() => {
    const all: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap }[] = [
      { key: 'home', label: isApprentice ? 'Atölye' : 'Panel', icon: 'grid-outline', activeIcon: 'grid' },
      { key: 'orders', label: isApprentice ? 'Görevler' : 'İşler', icon: 'construct-outline', activeIcon: 'construct' },
      { key: 'customers', label: 'Müşteri', icon: 'people-outline', activeIcon: 'people' },
      { key: 'team', label: isAdmin ? 'Admin' : isOwner ? 'Ekip' : 'Kazancım', icon: isAdmin ? 'shield-checkmark-outline' : isOwner ? 'shield-outline' : 'wallet-outline', activeIcon: isAdmin ? 'shield-checkmark' : isOwner ? 'shield' : 'wallet' },
      { key: 'settings', label: 'Ayarlar', icon: 'settings-outline', activeIcon: 'settings' },
    ];
    return isApprentice ? all.filter((item) => ['home', 'orders', 'settings'].includes(item.key)) : all;
  }, [isAdmin, isOwner, isApprentice]);

  return (
    <PremiumBackground>
      <View style={styles.flex}>{screen}</View>
      <View style={[styles.navWrap, { borderColor: colors.border }]}> 
        <BlurView intensity={Platform.OS === 'android' ? 35 : 55} tint={resolvedMode} style={styles.navBlur}>
          <View style={[styles.navInner, { backgroundColor: Platform.OS === 'android' ? colors.cardStrong : 'transparent' }]}> 
            {tabs.map((item) => {
              const active = tab === item.key;
              return (
                <AnimatedPressable key={item.key} onPress={() => setTab(item.key)} style={styles.navItem}>
                  <View style={[styles.navIcon, active && { backgroundColor: `${colors.primary}20` }]}>
                    <Ionicons name={active ? item.activeIcon : item.icon} size={22} color={active ? colors.primary : colors.textMuted} />
                  </View>
                  <Text style={[styles.navLabel, { color: active ? colors.primary : colors.textMuted }]}>{item.label}</Text>
                </AnimatedPressable>
              );
            })}
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
  navWrap: { position: 'absolute', left: 12, right: 12, bottom: 12, borderWidth: 1, borderRadius: 25, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.26, shadowRadius: 18, shadowOffset: { width: 0, height: 9 }, elevation: 14 },
  navBlur: { overflow: 'hidden' },
  navInner: { minHeight: 78, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 4, paddingTop: 7, paddingBottom: 8 },
  navItem: { flex: 1, alignItems: 'center', gap: 3 },
  navIcon: { width: 41, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  navLabel: { fontSize: 9, fontWeight: '900' },
});
