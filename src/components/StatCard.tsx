import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { GlassCard } from './GlassCard';

export function StatCard({ label, value, icon, accent }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap; accent: string }) {
  const { colors } = useTheme();
  return (
    <GlassCard style={styles.card}>
      <View style={[styles.icon, { backgroundColor: `${accent}20` }]}> 
        <Ionicons name={icon} size={20} color={accent} />
      </View>
      <Text style={[styles.value, { color: colors.text }]} numberOfLines={1}>{value}</Text>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 150, padding: 16, gap: 8 },
  icon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  value: { fontSize: 22, fontWeight: '900' },
  label: { fontSize: 13, fontWeight: '700' },
});
