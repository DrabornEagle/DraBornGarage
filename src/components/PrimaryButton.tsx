import React from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedPressable } from './AnimatedPressable';
import { useTheme } from '../context/ThemeContext';

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
        colors={secondary ? [colors.surfaceSoft, colors.surfaceSoft] : [colors.primary, colors.primary2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.button, { borderColor: secondary ? colors.border : 'transparent' }]}
      >
        {loading ? (
          <ActivityIndicator color={secondary ? colors.text : '#fff'} />
        ) : (
          <Text style={[styles.text, { color: secondary ? colors.text : '#fff' }]}>{title}</Text>
        )}
      </LinearGradient>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  text: { fontSize: 16, fontWeight: '800' },
});
