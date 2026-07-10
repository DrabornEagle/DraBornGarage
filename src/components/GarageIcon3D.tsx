import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

type GarageIcon3DProps = {
  name: keyof typeof MaterialCommunityIcons.glyphMap;
  size?: number;
  iconSize?: number;
  accent?: string;
  accent2?: string;
  animated?: boolean;
};

export function GarageIcon3D({
  name,
  size = 64,
  iconSize = 31,
  accent,
  accent2,
  animated = false,
}: GarageIcon3DProps) {
  const { colors } = useTheme();
  const float = useRef(new Animated.Value(0)).current;
  const first = accent ?? colors.orange;
  const second = accent2 ?? colors.primary2;

  useEffect(() => {
    if (!animated) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, { toValue: 1, duration: 1700, useNativeDriver: true }),
        Animated.timing(float, { toValue: 0, duration: 1700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [animated, float]);

  return (
    <Animated.View
      style={[
        styles.stage,
        { width: size, height: size + 7 },
        animated && {
          transform: [
            { translateY: float.interpolate({ inputRange: [0, 1], outputRange: [1, -3] }) },
            { rotate: float.interpolate({ inputRange: [0, 1], outputRange: ['-0.8deg', '0.8deg'] }) },
          ],
        },
      ]}
    >
      <View
        style={[
          styles.depth,
          {
            width: size - 8,
            height: size - 8,
            borderRadius: Math.round(size * 0.28),
            backgroundColor: `${second}45`,
          },
        ]}
      />
      <LinearGradient
        colors={[first, second]}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.front,
          {
            width: size - 8,
            height: size - 8,
            borderRadius: Math.round(size * 0.28),
            borderColor: `${colors.white}35`,
          },
        ]}
      >
        <View style={[styles.highlight, { backgroundColor: `${colors.white}2B` }]} />
        <MaterialCommunityIcons name={name} size={iconSize} color="#FFFFFF" />
        <View style={styles.bolts}>
          <View style={[styles.bolt, { backgroundColor: `${colors.white}A8` }]} />
          <View style={[styles.bolt, { backgroundColor: `${colors.white}66` }]} />
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stage: { alignItems: 'center', justifyContent: 'flex-start' },
  depth: { position: 'absolute', top: 8, left: 8, transform: [{ skewX: '-5deg' }] },
  front: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1 },
  highlight: { position: 'absolute', left: -18, top: -25, width: 60, height: 90, transform: [{ rotate: '28deg' }] },
  bolts: { position: 'absolute', left: 8, right: 8, bottom: 7, flexDirection: 'row', justifyContent: 'space-between' },
  bolt: { width: 4, height: 4, borderRadius: 4 },
});
