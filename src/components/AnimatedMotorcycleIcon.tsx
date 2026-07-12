import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Stop } from 'react-native-svg';

interface AnimatedMotorcycleIconProps {
  size?: number;
  color: string;
  secondaryColor?: string;
  style?: StyleProp<ViewStyle>;
  active?: boolean;
}

export function AnimatedMotorcycleIcon({
  size = 28,
  color,
  secondaryColor = '#FFFFFF',
  style,
  active = true,
}: AnimatedMotorcycleIconProps) {
  const motion = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      motion.stopAnimation();
      motion.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(motion, {
          toValue: 1,
          duration: 760,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(motion, {
          toValue: 0,
          duration: 760,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [active, motion]);

  const translateY = motion.interpolate({ inputRange: [0, 1], outputRange: [0, -2.4] });
  const translateX = motion.interpolate({ inputRange: [0, 1], outputRange: [-0.8, 1.4] });
  const rotate = motion.interpolate({ inputRange: [0, 1], outputRange: ['-1.8deg', '1.4deg'] });
  const glowOpacity = motion.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.42] });
  const width = size * 1.48;

  return (
    <Animated.View
      style={[
        { width, height: size, alignItems: 'center', justifyContent: 'center' },
        style,
        { transform: [{ translateY }, { translateX }, { rotate }] },
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: size * 1.2,
          height: size * 0.42,
          bottom: size * 0.02,
          borderRadius: 999,
          backgroundColor: color,
          opacity: glowOpacity,
          transform: [{ scaleX: 1.05 }],
        }}
      />
      <Svg width={width} height={size} viewBox="0 0 74 48">
        <Defs>
          <LinearGradient id="bikeBody" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={secondaryColor} stopOpacity="0.98" />
            <Stop offset="0.28" stopColor={color} stopOpacity="1" />
            <Stop offset="1" stopColor={color} stopOpacity="0.72" />
          </LinearGradient>
        </Defs>
        <G strokeLinecap="round" strokeLinejoin="round">
          <Circle cx="18" cy="36" r="9.2" fill="none" stroke={color} strokeWidth="3.2" />
          <Circle cx="18" cy="36" r="3.2" fill={color} opacity="0.9" />
          <Circle cx="56" cy="36" r="9.2" fill="none" stroke={color} strokeWidth="3.2" />
          <Circle cx="56" cy="36" r="3.2" fill={color} opacity="0.9" />
          <Path d="M18 36 L29 23 L43 22 L50 29 L56 36" fill="none" stroke={color} strokeWidth="3.3" />
          <Path d="M29 23 L34 15 L45 16 L50 23 L43 27 L31 27 Z" fill="url(#bikeBody)" stroke={color} strokeWidth="1.8" />
          <Path d="M34 15 L29 13 L24 14" fill="none" stroke={color} strokeWidth="2.6" />
          <Path d="M45 16 L51 12 L57 13" fill="none" stroke={color} strokeWidth="2.4" />
          <Path d="M51 12 L54 9" fill="none" stroke={color} strokeWidth="2.2" />
          <Path d="M27 20 L20 20 L17 24" fill="none" stroke={color} strokeWidth="3" />
          <Path d="M40 27 L34 36 L18 36" fill="none" stroke={color} strokeWidth="3" />
          <Path d="M43 27 L56 36" fill="none" stroke={color} strokeWidth="3" />
          <Path d="M30 13 L40 13" fill="none" stroke={secondaryColor} strokeOpacity="0.82" strokeWidth="2.4" />
          <Path d="M49 22 L56 20 L60 23 L54 27" fill={color} opacity="0.9" />
          <Circle cx="60" cy="23" r="1.8" fill={secondaryColor} opacity="0.95" />
        </G>
      </Svg>
    </Animated.View>
  );
}
