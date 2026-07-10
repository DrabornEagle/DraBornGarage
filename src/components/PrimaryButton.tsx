import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { AnimatedPressable } from './AnimatedPressable';

export function PrimaryButton({
  title,
  onPress,
  loading,
  secondary,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  secondary?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <AnimatedPressable onPress={onPress} disabled={loading}>
      <LinearGradient
        colors={secondary ? [colors.surfaceSoft, colors.cardStrong] : [colors.orange, colors.primary, colors.primary2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.button, { borderColor: secondary ? colors.border : `${colors.white}28` }]}
      >
        <View style={[styles.depth, { backgroundColor: secondary ? `${colors.primary2}18` : 'rgba(0,0,0,0.16)' }]} />
        <View style={[styles.bolt, styles.boltLeft, { backgroundColor: secondary ? colors.textMuted : '#FFFFFFAA' }]} />
        <View style={[styles.bolt, styles.boltRight, { backgroundColor: secondary ? colors.textMuted : '#FFFFFF88' }]} />
        {loading ? (
          <ActivityIndicator color={secondary ? colors.text : '#fff'} />
        ) : (
          <View style={styles.content}>
            <Text style={[styles.text, { color: secondary ? colors.text : '#fff' }]}>{title}</Text>
            <Ionicons name="chevron-forward" size={18} color={secondary ? colors.primary : '#fff'} />
          </View>
        )}
      </LinearGradient>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, overflow: 'hidden', paddingHorizontal: 18 },
  depth: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 7 },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  text: { fontSize: 15, fontWeight: '900' },
  bolt: { position: 'absolute', top: 8, width: 4, height: 4, borderRadius: 4 },
  boltLeft: { left: 10 },
  boltRight: { right: 10 },
});
