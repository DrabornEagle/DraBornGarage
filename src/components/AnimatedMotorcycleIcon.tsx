import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';

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
  secondaryColor,
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
          duration: 920,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(motion, {
          toValue: 0,
          duration: 920,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [active, motion]);

  const translateY = motion.interpolate({ inputRange: [0, 1], outputRange: [0.5, -1.1] });
  const translateX = motion.interpolate({ inputRange: [0, 1], outputRange: [-0.35, 0.55] });
  const rotate = motion.interpolate({ inputRange: [0, 1], outputRange: ['-0.45deg', '0.45deg'] });
  const glowOpacity = motion.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.2] });
  const width = size * 1.7;
  const accent = secondaryColor ?? color;

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
          width: size * 1.12,
          height: Math.max(2, size * 0.16),
          bottom: size * 0.02,
          borderRadius: 999,
          backgroundColor: color,
          opacity: glowOpacity,
          transform: [{ scaleX: 1.08 }],
        }}
      />

      <Svg width={width} height={size} viewBox="0 0 96 56">
        <G strokeLinecap="round" strokeLinejoin="round">
          <Circle cx="21" cy="42" r="10.5" fill="none" stroke={color} strokeWidth="3.3" />
          <Circle cx="21" cy="42" r="2.7" fill={color} opacity="0.88" />
          <Circle cx="74" cy="42" r="10.5" fill="none" stroke={color} strokeWidth="3.3" />
          <Circle cx="74" cy="42" r="2.7" fill={color} opacity="0.88" />

          <Path d="M21 42 L35 25 L53 25 L63 34 L74 42" fill="none" stroke={color} strokeWidth="3.4" />
          <Path d="M21 42 L42 42 L53 25" fill="none" stroke={color} strokeWidth="3.2" />
          <Path d="M42 42 L63 34" fill="none" stroke={color} strokeWidth="3" />

          <Path
            d="M34 25 L40 16 L56 17 L63 24 L55 30 L39 30 Z"
            fill={color}
            fillOpacity="0.22"
            stroke={color}
            strokeWidth="2.4"
          />
          <Path d="M39 15 L50 15" fill="none" stroke={accent} strokeWidth="3" />
          <Path d="M35 24 L29 21 L23 23" fill="none" stroke={color} strokeWidth="2.6" />

          <Path d="M56 18 L65 14 L72 15" fill="none" stroke={color} strokeWidth="2.6" />
          <Path d="M65 14 L68 10" fill="none" stroke={color} strokeWidth="2.2" />
          <Path d="M68 10 L76 9" fill="none" stroke={color} strokeWidth="2.2" />
          <Path d="M63 24 L69 20 L74 42" fill="none" stroke={color} strokeWidth="3" />

          <Path d="M29 28 L23 28 L20 31" fill="none" stroke={color} strokeWidth="2.8" />
          <Path d="M44 31 C47 27 54 27 57 31 L55 38 L43 38 Z" fill={color} fillOpacity="0.16" stroke={color} strokeWidth="2.2" />
          <Circle cx="50" cy="33" r="3.6" fill="none" stroke={accent} strokeWidth="2" />
          <Path d="M43 38 L37 42" fill="none" stroke={color} strokeWidth="2.5" />
          <Path d="M55 38 L63 41" fill="none" stroke={color} strokeWidth="2.5" />
          <Path d="M54 34 L65 36 L69 40" fill="none" stroke={accent} strokeWidth="2.6" />

          <Path d="M72 15 L79 13 L84 17 L79 21 L73 20" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2.1" />
          <Circle cx="84" cy="17" r="2.3" fill={accent} />
        </G>
      </Svg>
    </Animated.View>
  );
}
