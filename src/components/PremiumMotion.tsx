import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export function AnimatedEntrance({
  children,
  delay = 0,
  distance = 18,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: 1,
      delay,
      speed: 16,
      bounciness: 5,
      useNativeDriver: true,
    }).start();
  }, [delay, progress]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) },
            { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function PulseDot({ color, size = 8 }: { color: string; size?: number }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 950, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 950, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <View style={{ width: size * 2.2, height: size * 2.2, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size,
          backgroundColor: color,
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
          transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.1] }) }],
        }}
      />
      <View style={{ width: size, height: size, borderRadius: size, backgroundColor: color }} />
    </View>
  );
}

export function PremiumGlowCard({
  children,
  accent,
  accent2,
  delay = 0,
  live = false,
  style,
}: {
  children: React.ReactNode;
  accent: string;
  accent2?: string;
  delay?: number;
  live?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const glow = useRef(new Animated.Value(0)).current;
  const sheen = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!live) return;
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ]),
    );
    glowLoop.start();
    return () => glowLoop.stop();
  }, [glow, live]);

  useEffect(() => {
    const sheenLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(1200 + delay),
        Animated.timing(sheen, { toValue: 1, duration: 1350, useNativeDriver: true }),
        Animated.timing(sheen, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.delay(1900),
      ]),
    );
    sheenLoop.start();
    return () => sheenLoop.stop();
  }, [delay, sheen]);

  const second = accent2 ?? colors.primary2;

  return (
    <AnimatedEntrance delay={delay}>
      <Animated.View
        style={[
          styles.shadow,
          style,
          {
            shadowColor: accent,
            shadowOpacity: live
              ? glow.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.42] })
              : 0.2,
          },
        ]}
      >
        <LinearGradient
          colors={[`${accent}20`, colors.cardStrong, `${second}12`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, { borderColor: `${accent}54` }]}
        >
          <LinearGradient colors={[accent, second, accent]} style={styles.rail} />
          <View pointerEvents="none" style={[styles.orb, { backgroundColor: `${accent}18` }]} />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.sheen,
              {
                backgroundColor: `${accent}12`,
                transform: [{ translateX: sheen.interpolate({ inputRange: [0, 1], outputRange: [-220, 420] }) }, { rotate: '16deg' }],
              },
            ]}
          />
          {children}
        </LinearGradient>
      </Animated.View>
    </AnimatedEntrance>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: 24,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  card: {
    borderWidth: 1,
    borderRadius: 24,
    overflow: 'hidden',
    padding: 16,
  },
  rail: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  orb: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 150,
    right: -70,
    top: -72,
  },
  sheen: {
    position: 'absolute',
    top: -100,
    bottom: -100,
    width: 74,
  },
});
