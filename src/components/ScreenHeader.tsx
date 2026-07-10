import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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
        Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] });

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <View style={[styles.brandMark, { backgroundColor: `${colors.orange}14`, borderColor: `${colors.orange}42` }]}> 
          <View style={[styles.brandDepth, { backgroundColor: `${colors.primary2}35` }]} />
          <MaterialCommunityIcons name="motorbike" size={22} color={colors.orange} />
        </View>
        <View style={styles.copy}>
          {!!eyebrow && (
            <View style={styles.eyebrowRow}>
              <Animated.View style={[styles.liveDot, { backgroundColor: colors.green, opacity }]} />
              <Text style={[styles.eyebrow, { color: colors.primary }]}>{eyebrow}</Text>
              <View style={[styles.microRail, { backgroundColor: colors.border }]} />
              <Text style={[styles.osLabel, { color: colors.textMuted }]}>GARAGE OS</Text>
            </View>
          )}
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {!!subtitle && <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>}
        </View>
        {!!actionIcon && !!onAction && (
          <AnimatedPressable onPress={onAction} style={[styles.action, { backgroundColor: colors.cardStrong, borderColor: `${colors.primary2}45` }]}> 
            <View style={[styles.actionDepth, { backgroundColor: `${colors.primary2}26` }]} />
            <Ionicons name={actionIcon} size={22} color={colors.text} />
            <View style={[styles.actionBolt, { backgroundColor: colors.orange }]} />
          </AnimatedPressable>
        )}
      </View>
      <View style={styles.railRow}>
        <View style={[styles.railStrong, { backgroundColor: colors.orange }]} />
        <View style={[styles.railLong, { backgroundColor: colors.border }]} />
        <View style={[styles.railStrong, { backgroundColor: colors.cyan }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  brandMark: { width: 48, height: 48, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  brandDepth: { position: 'absolute', width: 38, height: 38, borderRadius: 13, left: 7, top: 7, transform: [{ translateX: 3 }, { translateY: 3 }] },
  copy: { flex: 1, minWidth: 0 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  liveDot: { width: 6, height: 6, borderRadius: 6 },
  eyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  microRail: { width: 17, height: 1 },
  osLabel: { fontSize: 7.5, fontWeight: '900', letterSpacing: 0.9 },
  title: { fontSize: 27, fontWeight: '900', letterSpacing: -0.7 },
  subtitle: { fontSize: 12.5, marginTop: 4, lineHeight: 18 },
  action: { position: 'relative', width: 49, height: 49, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  actionDepth: { position: 'absolute', width: 35, height: 35, borderRadius: 12, transform: [{ translateX: 3 }, { translateY: 3 }] },
  actionBolt: { position: 'absolute', top: 6, right: 6, width: 5, height: 5, borderRadius: 5 },
  railRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  railStrong: { width: 38, height: 3, borderRadius: 3 },
  railLong: { flex: 1, height: 1 },
});
