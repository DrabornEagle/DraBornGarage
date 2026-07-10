import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { GlassCard } from './GlassCard';

export function StatCard({ label, value, icon, accent }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap; accent: string }) {
  const { colors } = useTheme();
  return (
    <GlassCard style={styles.card}>
      <View style={styles.topRow}>
        <View style={[styles.iconDepth, { backgroundColor: `${accent}30` }]} />
        <View style={[styles.icon, { backgroundColor: `${accent}16`, borderColor: `${accent}42` }]}> 
          <Ionicons name={icon} size={20} color={accent} />
        </View>
        <View style={[styles.indicator, { backgroundColor: accent }]} />
      </View>
      <Text style={[styles.value, { color: colors.text }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <View style={[styles.gaugeTrack, { backgroundColor: colors.border }]}><View style={[styles.gaugeFill, { backgroundColor: accent }]} /></View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 150, padding: 15, gap: 7 },
  topRow: { height: 42, justifyContent: 'center' },
  iconDepth: { position: 'absolute', width: 38, height: 38, borderRadius: 13, left: 4, top: 4 },
  icon: { width: 38, height: 38, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  indicator: { position: 'absolute', right: 0, top: 4, width: 6, height: 6, borderRadius: 6 },
  value: { fontSize: 21, fontWeight: '900' },
  label: { fontSize: 11, fontWeight: '900', letterSpacing: 0.4 },
  gaugeTrack: { height: 3, borderRadius: 3, overflow: 'hidden', marginTop: 3 },
  gaugeFill: { width: '58%', height: 3, borderRadius: 3 },
});
