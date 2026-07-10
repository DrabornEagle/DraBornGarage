import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export function GlassCard({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors, resolvedMode } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style]}>
      <LinearGradient
        pointerEvents="none"
        colors={[`${colors.cyan}00`, `${colors.cyan}80`, `${colors.primary}9A`, `${colors.primary}00`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.topRail}
      />
      <View pointerEvents="none" style={[styles.bolt, styles.boltLeft, { backgroundColor: resolvedMode === 'dark' ? '#4D5969' : '#C5CEDA', borderColor: colors.border }]} />
      <View pointerEvents="none" style={[styles.bolt, styles.boltRight, { backgroundColor: resolvedMode === 'dark' ? '#4D5969' : '#C5CEDA', borderColor: colors.border }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
  },
  topRail: { position: 'absolute', top: 0, left: 25, right: 25, height: 2, borderRadius: 2 },
  bolt: { position: 'absolute', top: 9, width: 7, height: 7, borderRadius: 7, borderWidth: 1, opacity: 0.72 },
  boltLeft: { left: 11 },
  boltRight: { right: 11 },
});
