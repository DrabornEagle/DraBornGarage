import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { AnimatedPressable } from './AnimatedPressable';

export function ScreenHeader({
  eyebrow,
  title,
  subtitle,
  actionIcon,
  onAction,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actionIcon?: keyof typeof Ionicons.glyphMap;
  onAction?: () => void;
}) {
  const { colors } = useTheme();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.25] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <View style={styles.copy}>
          {!!eyebrow && (
            <View style={styles.eyebrowRow}>
              <Animated.View style={[styles.liveDot, { backgroundColor: colors.green, opacity, transform: [{ scale }] }]} />
              <Text style={[styles.eyebrow, { color: colors.primary }]}>{eyebrow}</Text>
              <View style={[styles.microRail, { backgroundColor: colors.border }]} />
              <Ionicons name="build-outline" size={13} color={colors.textMuted} />
            </View>
          )}
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {!!subtitle && <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>}
        </View>
        {!!actionIcon && !!onAction && (
          <AnimatedPressable onPress={onAction} style={[styles.action, { backgroundColor: colors.cardStrong, borderColor: colors.border }]}> 
            <View style={[styles.actionBolt, { backgroundColor: colors.orange }]} />
            <Ionicons name={actionIcon} size={22} color={colors.text} />
          </AnimatedPressable>
        )}
      </View>
      <View style={styles.railRow}>
        <View style={[styles.railShort, { backgroundColor: colors.orange }]} />
        <View style={[styles.railLong, { backgroundColor: colors.border }]} />
        <View style={[styles.railShort, { backgroundColor: colors.cyan }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  copy: { flex: 1 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 7 },
  eyebrow: { fontSize: 11, fontWeight: '900', letterSpacing: 1.25, textTransform: 'uppercase' },
  microRail: { width: 24, height: 1 },
  title: { fontSize: 29, fontWeight: '900', letterSpacing: -0.8 },
  subtitle: { fontSize: 14, marginTop: 5, lineHeight: 20 },
  action: { position: 'relative', width: 49, height: 49, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  actionBolt: { position: 'absolute', top: 6, right: 6, width: 5, height: 5, borderRadius: 5 },
  railRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  railShort: { width: 32, height: 3, borderRadius: 3 },
  railLong: { flex: 1, height: 1 },
});
