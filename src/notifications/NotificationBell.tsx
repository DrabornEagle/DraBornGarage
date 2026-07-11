import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from './NotificationContext';

export function NotificationBell() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { unreadCount, upcomingCount, openCenter, loading } = useNotifications();
  const badge = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: Math.max(insets.top + 8, 18) }]}>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={`${unreadCount} okunmamış bildirim`}
        onPress={openCenter}
        style={[styles.button, { backgroundColor: colors.cardStrong, borderColor: unreadCount > 0 ? `${colors.orange}78` : colors.border, shadowColor: colors.primary }]}
      >
        {unreadCount > 0 ? (
          <LinearGradient colors={[colors.orange, colors.red]} style={styles.iconShell}>
            <Ionicons name="notifications" size={20} color="#fff" />
          </LinearGradient>
        ) : (
          <View style={[styles.iconShell, { backgroundColor: `${colors.primary}15` }]}>
            <Ionicons name={loading ? 'sync' : 'notifications-outline'} size={20} color={colors.primary} />
          </View>
        )}
        {unreadCount > 0 && <View style={[styles.badge, { backgroundColor: colors.red, borderColor: colors.cardStrong }]}><Text style={styles.badgeText}>{badge}</Text></View>}
        {unreadCount === 0 && upcomingCount > 0 && <View style={[styles.futureDot, { backgroundColor: colors.cyan, borderColor: colors.cardStrong }]} />}
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: 16, zIndex: 90, elevation: 22 },
  button: { width: 49, height: 49, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 12 },
  iconShell: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -5, right: -6, minWidth: 22, height: 22, paddingHorizontal: 5, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: 8.5, fontWeight: '900' },
  futureDot: { position: 'absolute', top: 2, right: 2, width: 11, height: 11, borderRadius: 6, borderWidth: 2 },
});
