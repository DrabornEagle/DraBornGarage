import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export function GlassCard({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors, resolvedMode } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.cardStrong, borderColor: colors.border }, style]}>
      <LinearGradient
        pointerEvents="none"
        colors={[colors.orange, colors.primary, colors.cyan]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.topRail}
      />
      <View pointerEvents="none" style={[styles.sidePlate, { backgroundColor: `${colors.primary2}12`, borderColor: `${colors.primary2}28` }]} />
      <View pointerEvents="none" style={[styles.cornerCut, { backgroundColor: resolvedMode === 'dark' ? `${colors.orange}20` : `${colors.orange}14` }]} />
      <View pointerEvents="none" style={[styles.bolt, styles.boltLeft, { backgroundColor: resolvedMode === 'dark' ? '#657082' : '#AEB8C6', borderColor: colors.border }]} />
      <View pointerEvents="none" style={[styles.bolt, styles.boltRight, { backgroundColor: resolvedMode === 'dark' ? '#657082' : '#AEB8C6', borderColor: colors.border }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    borderWidth: 1,
    borderRadius: 22,
    padding: 17,
    overflow: 'hidden',
  },
  topRail: { position: 'absolute', top: 0, left: 20, right: 20, height: 3, borderRadius: 3 },
  sidePlate: { position: 'absolute', top: 13, bottom: 13, left: 0, width: 4, borderRightWidth: 1 },
  cornerCut: { position: 'absolute', width: 52, height: 18, right: -17, top: 12, transform: [{ rotate: '45deg' }] },
  bolt: { position: 'absolute', top: 10, width: 6, height: 6, borderRadius: 6, borderWidth: 1, opacity: 0.82 },
  boltLeft: { left: 10 },
  boltRight: { right: 10 },
});
