import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from './NotificationContext';

export function NotificationBell() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { unreadCount, upcomingCount, openCenter, loading } = useNotifications();
  const badge = unreadCount > 99 ? '99+' : String(unreadCount);
  const emphasis = useRef(new Animated.Value(0)).current;
  const [acknowledgedUnreadCount, setAcknowledgedUnreadCount] = useState(0);
  const needsAttention = unreadCount > 0 && unreadCount > acknowledgedUnreadCount;

  useEffect(() => {
    if (unreadCount === 0) setAcknowledgedUnreadCount(0);
  }, [unreadCount]);

  useEffect(() => {
    emphasis.stopAnimation();
    emphasis.setValue(0);
    if (!needsAttention) return;

    const loop = Animated.loop(Animated.sequence([
      Animated.timing(emphasis, { toValue: 1, duration: 90, useNativeDriver: true }),
      Animated.timing(emphasis, { toValue: -1, duration: 90, useNativeDriver: true }),
      Animated.timing(emphasis, { toValue: 1, duration: 90, useNativeDriver: true }),
      Animated.timing(emphasis, { toValue: -1, duration: 90, useNativeDriver: true }),
      Animated.timing(emphasis, { toValue: 0, duration: 110, useNativeDriver: true }),
      Animated.delay(180),
    ]));
    loop.start();
    return () => loop.stop();
  }, [needsAttention, emphasis]);

  const handlePress = () => {
    setAcknowledgedUnreadCount(unreadCount);
    emphasis.stopAnimation();
    emphasis.setValue(0);
    openCenter();
  };

  const rotate = emphasis.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-11deg', '0deg', '11deg'] });
  const scale = emphasis.interpolate({ inputRange: [-1, 0, 1], outputRange: [1.08, 1, 1.08] });
  const haloOpacity = emphasis.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.72, 0.28, 0.72] });

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: Math.max(insets.top + 8, 18) }]}>
      {needsAttention && <Animated.View pointerEvents="none" style={[styles.halo, { borderColor: colors.orange, opacity: haloOpacity, transform: [{ scale }] }]} />}
      <Animated.View style={{ transform: [{ rotate }, { scale }] }}>
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel={`${unreadCount} okunmamış bildirim`}
          onPress={handlePress}
          style={[styles.button, { backgroundColor: colors.cardStrong, borderColor: unreadCount > 0 ? `${colors.orange}8A` : colors.border, shadowColor: colors.primary }]}
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
          {unreadCount > 0 && <Animated.View style={[styles.badge, { backgroundColor: colors.red, borderColor: colors.cardStrong, transform: [{ scale }] }]}><Text style={styles.badgeText}>{badge}</Text></Animated.View>}
          {unreadCount === 0 && upcomingCount > 0 && <View style={[styles.futureDot, { backgroundColor: colors.cyan, borderColor: colors.cardStrong }]} />}
        </AnimatedPressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: 16, zIndex: 90, elevation: 22 },
  halo: { position: 'absolute', left: -7, right: -7, top: -7, bottom: -7, borderRadius: 25, borderWidth: 2 },
  button: { width: 49, height: 49, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 12 },
  iconShell: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -5, right: -6, minWidth: 22, height: 22, paddingHorizontal: 5, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  futureDot: { position: 'absolute', top: 2, right: 2, width: 11, height: 11, borderRadius: 6, borderWidth: 2 },
});
