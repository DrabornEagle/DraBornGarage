import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        {!!eyebrow && <Text style={[styles.eyebrow, { color: colors.primary }]}>{eyebrow}</Text>}
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {!!subtitle && <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>}
      </View>
      {!!actionIcon && !!onAction && (
        <AnimatedPressable onPress={onAction} style={[styles.action, { backgroundColor: colors.cardStrong, borderColor: colors.border }]}> 
          <Ionicons name={actionIcon} size={22} color={colors.text} />
        </AnimatedPressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  copy: { flex: 1 },
  eyebrow: { fontSize: 12, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 5 },
  title: { fontSize: 29, fontWeight: '900', letterSpacing: -0.8 },
  subtitle: { fontSize: 14, marginTop: 5, lineHeight: 20 },
  action: { width: 48, height: 48, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
