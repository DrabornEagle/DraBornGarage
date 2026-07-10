import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

export function PremiumBackground({ children }: { children: React.ReactNode }) {
  const { resolvedMode, colors } = useTheme();
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 7000, useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 7000, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [drift]);

  const width = Dimensions.get('window').width;
  const translateX = drift.interpolate({ inputRange: [0, 1], outputRange: [-24, 32] });
  const translateY = drift.interpolate({ inputRange: [0, 1], outputRange: [0, 48] });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={
          resolvedMode === 'dark'
            ? ['#050711', '#0B1020', '#070A12']
            : ['#F7F9FF', '#EEF3FF', '#F4F7FC']
        }
        style={StyleSheet.absoluteFill}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.orb,
          {
            width: width * 0.95,
            height: width * 0.95,
            backgroundColor: colors.primary,
            transform: [{ translateX }, { translateY }],
            opacity: resolvedMode === 'dark' ? 0.16 : 0.1,
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.orbTwo,
          {
            width: width * 0.7,
            height: width * 0.7,
            backgroundColor: colors.cyan,
            transform: [{ translateX: Animated.multiply(translateX, -0.7) }],
            opacity: resolvedMode === 'dark' ? 0.1 : 0.08,
          },
        ]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  orb: { position: 'absolute', borderRadius: 999, top: -210, right: -190 },
  orbTwo: { position: 'absolute', borderRadius: 999, bottom: -180, left: -150 },
});
