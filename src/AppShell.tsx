import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable } from './components/AnimatedPressable';
import { GarageBlink, GarageReveal } from './components/GarageMotion';
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
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  activeIcon: keyof typeof MaterialCommunityIcons.glyphMap;
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
      { key: 'home', label: isApprentice ? 'Atölye' : 'Panel', icon: 'view-dashboard-outline', activeIcon: 'view-dashboard', accent: colors.primary, accent2: colors.primary2 },
      { key: 'orders', label: isApprentice ? 'Görevler' : 'İşler', icon: 'wrench-outline', activeIcon: 'wrench', accent: colors.orange, accent2: colors.red },
      { key: 'customers', label: 'Müşteri', icon: 'account-group-outline', activeIcon: 'account-group', accent: colors.cyan, accent2: colors.primary2 },
      { key: 'team', label: isAdmin ? 'Admin' : isOwner ? 'Ekip' : 'Kazancım', icon: isAdmin ? 'shield-account-outline' : isOwner ? 'account-hard-hat-outline' : 'wallet-outline', activeIcon: isAdmin ? 'shield-account' : isOwner ? 'account-hard-hat' : 'wallet', accent: colors.green, accent2: colors.cyan },
      { key: 'settings', label: 'Ayarlar', icon: 'cog-outline', activeIcon: 'cog', accent: colors.red, accent2: colors.orange },
    ];
    return isApprentice ? all.filter((item) => ['home', 'orders', 'settings'].includes(item.key)) : all;
  }, [colors, isAdmin, isOwner, isApprentice]);

  return (
    <PremiumBackground>
      <View style={styles.flex}>{screen}</View>

      <GarageReveal delay={120} style={styles.navPosition}>
        <View style={[styles.navWrap, { borderColor: `${colors.primary2}38` }]}> 
          <BlurView intensity={Platform.OS === 'android' ? 34 : 52} tint={resolvedMode} style={styles.navBlur}>
            <View style={[styles.navBackdrop, { backgroundColor: Platform.OS === 'android' ? colors.cardStrong : 'transparent' }]}> 
              <View style={styles.pitRail} pointerEvents="none">
                {Array.from({ length: 16 }).map((_, index) => (
                  <View key={index} style={[styles.pitBlock, { backgroundColor: index % 2 === 0 ? colors.orange : colors.black }]} />
                ))}
              </View>
              <View style={styles.navInner}> 
                {tabs.map((item) => {
                  const active = tab === item.key;
                  return (
                    <AnimatedPressable key={item.key} onPress={() => setTab(item.key)} style={styles.navItem}>
                      <View style={[styles.navModule, { borderColor: active ? `${item.accent}60` : 'transparent', backgroundColor: active ? `${item.accent}12` : 'transparent' }]}> 
                        {active && <View style={[styles.moduleDepth, { backgroundColor: `${item.accent2}28` }]} />}
                        {active ? (
                          <LinearGradient colors={[item.accent, item.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.activeIcon}>
                            <MaterialCommunityIcons name={item.activeIcon} size={21} color="#fff" />
                          </LinearGradient>
                        ) : (
                          <View style={[styles.inactiveIcon, { backgroundColor: `${item.accent}10`, borderColor: `${item.accent}24` }]}> 
                            <MaterialCommunityIcons name={item.icon} size={20} color={item.accent} />
                          </View>
                        )}
                        <Text numberOfLines={1} maxFontSizeMultiplier={1.02} style={[styles.navLabel, { color: active ? colors.text : colors.textMuted }]}>{item.label}</Text>
                        {active && (
                          <GarageBlink>
                            <View style={[styles.activeSignal, { backgroundColor: item.accent }]} />
                          </GarageBlink>
                        )}
                      </View>
                    </AnimatedPressable>
                  );
                })}
              </View>
            </View>
          </BlurView>
        </View>
      </GarageReveal>

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
  navPosition: { position: 'absolute', left: 10, right: 10, bottom: 9 },
  navWrap: { borderWidth: 1, borderRadius: 24, overflow: 'hidden' },
  navBlur: { overflow: 'hidden' },
  navBackdrop: { minHeight: 84 },
  pitRail: { height: 4, flexDirection: 'row', overflow: 'hidden' },
  pitBlock: { width: 26, height: 11, transform: [{ skewX: '-25deg' }], marginRight: 2 },
  navInner: { minHeight: 80, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 4, paddingTop: 5, paddingBottom: 6 },
  navItem: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center' },
  navModule: { width: '94%', minHeight: 66, borderWidth: 1, borderRadius: 17, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', paddingTop: 4 },
  moduleDepth: { position: 'absolute', left: 8, right: 8, bottom: 5, height: 7, borderRadius: 7 },
  activeIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  inactiveIcon: { width: 36, height: 36, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  navLabel: { fontSize: 8.5, fontWeight: '900', textAlign: 'center', marginTop: 2 },
  activeSignal: { width: 16, height: 2, borderRadius: 2, marginTop: 3 },
});
