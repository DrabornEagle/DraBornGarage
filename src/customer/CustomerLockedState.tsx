import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AnimatedMotorcycleIcon } from '../components/AnimatedMotorcycleIcon';
import { GlassCard } from '../components/GlassCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { useTheme } from '../context/ThemeContext';

export function CustomerLockedState({
  title,
  description,
  icon,
  onStartLink,
}: {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap | 'motorcycle';
  onStartLink: () => void;
}) {
  const { colors } = useTheme();

  return (
    <GlassCard style={styles.card}>
      <View style={[styles.icon, { backgroundColor: `${colors.primary}18` }]}>
        {icon === 'motorcycle' ? <AnimatedMotorcycleIcon size={38} color={colors.primary} /> : <Ionicons name={icon} size={32} color={colors.primary} />}
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.description, { color: colors.textMuted }]}>{description}</Text>
      <View style={[styles.notice, { backgroundColor: `${colors.cyan}0F`, borderColor: `${colors.cyan}35` }]}>
        <Ionicons name="shield-checkmark" size={18} color={colors.cyan} />
        <Text style={[styles.noticeText, { color: colors.textSoft }]}>Plaka tek başına yeterli değildir. Telefon, takip kodu, QR veya usta onayı kullanılır.</Text>
      </View>
      <View style={styles.buttonWrap}><PrimaryButton title="Motorumu Eşleştir" onPress={onStartLink} /></View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: 12, paddingVertical: 28 },
  icon: { width: 70, height: 70, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 19, fontWeight: '900', textAlign: 'center' },
  description: { fontSize: 13, lineHeight: 19, textAlign: 'center', maxWidth: 320 },
  notice: { width: '100%', borderWidth: 1, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
  noticeText: { flex: 1, fontSize: 12, lineHeight: 16 },
  buttonWrap: { width: '100%' },
});
