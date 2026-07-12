import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

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
  const ride = useRef(new Animated.Value(0)).current;
  const road = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      ride.stopAnimation();
      road.stopAnimation();
      ride.setValue(0);
      road.setValue(0);
      return;
    }

    const rideLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(ride, {
          toValue: 1,
          duration: 760,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(ride, {
          toValue: 0,
          duration: 760,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    const roadLoop = Animated.loop(
      Animated.timing(road, {
        toValue: 1,
        duration: 1120,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    rideLoop.start();
    roadLoop.start();
    return () => {
      rideLoop.stop();
      roadLoop.stop();
    };
  }, [active, ride, road]);

  const width = size * 1.86;
  const accent = secondaryColor ?? color;
  const translateY = ride.interpolate({ inputRange: [0, 1], outputRange: [0.8, -1.25] });
  const translateX = ride.interpolate({ inputRange: [0, 1], outputRange: [-0.35, 0.45] });
  const rotate = ride.interpolate({ inputRange: [0, 1], outputRange: ['-0.7deg', '0.7deg'] });
  const glowOpacity = ride.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.24] });
  const roadTranslate = road.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.58, width * 0.55] });
  const roadOpacity = road.interpolate({ inputRange: [0, 0.15, 0.82, 1], outputRange: [0, 0.35, 0.24, 0] });

  return (
    <Animated.View
      style={[
        { width, height: size, alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
        style,
        { transform: [{ translateY }, { translateX }, { rotate }] },
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: size * 1.42,
          height: Math.max(2, size * 0.13),
          bottom: size * 0.015,
          borderRadius: 999,
          backgroundColor: color,
          opacity: glowOpacity,
          transform: [{ scaleX: 1.06 }],
        }}
      />

      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: width * 0.06,
          bottom: size * 0.14,
          width: size * 0.36,
          height: Math.max(1.5, size * 0.055),
          borderRadius: 999,
          backgroundColor: accent,
          opacity: roadOpacity,
          transform: [{ translateX: roadTranslate }],
        }}
      />
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: width * 0.2,
          bottom: size * 0.28,
          width: size * 0.21,
          height: Math.max(1.2, size * 0.04),
          borderRadius: 999,
          backgroundColor: color,
          opacity: roadOpacity,
          transform: [{ translateX: roadTranslate }],
        }}
      />

      <Svg width={width} height={size} viewBox="0 0 124 68">
        <G strokeLinecap="round" strokeLinejoin="round">
          <Circle cx="27" cy="51" r="13" fill="none" stroke={color} strokeWidth="4" />
          <Circle cx="27" cy="51" r="7.5" fill="none" stroke={color} strokeWidth="1.8" opacity="0.62" />
          <Circle cx="27" cy="51" r="2.9" fill={accent} />
          <Path d="M27 39.5 V62.5 M15.5 51 H38.5 M19 43 L35 59 M35 43 L19 59" stroke={color} strokeWidth="1.35" opacity="0.42" />

          <Circle cx="98" cy="51" r="13" fill="none" stroke={color} strokeWidth="4" />
          <Circle cx="98" cy="51" r="7.5" fill="none" stroke={color} strokeWidth="1.8" opacity="0.62" />
          <Circle cx="98" cy="51" r="2.9" fill={accent} />
          <Path d="M98 39.5 V62.5 M86.5 51 H109.5 M90 43 L106 59 M106 43 L90 59" stroke={color} strokeWidth="1.35" opacity="0.42" />

          <Path d="M27 51 L43 32 L68 32 L82 43 L98 51" fill="none" stroke={color} strokeWidth="3.8" />
          <Path d="M27 51 L51 51 L68 32" fill="none" stroke={color} strokeWidth="3.3" />
          <Path d="M51 51 L82 43" fill="none" stroke={color} strokeWidth="3" />

          <Path d="M41 31 C46 22 55 18 69 19 C77 20 82 24 84 30 L75 39 L49 39 Z" fill={color} fillOpacity="0.24" stroke={color} strokeWidth="2.5" />
          <Path d="M50 18 H72 C77 18 80 20 79 24 H49 C46 24 45 21 50 18 Z" fill={accent} fillOpacity="0.9" />
          <Path d="M43 27 L32 24 L24 29" fill="none" stroke={color} strokeWidth="2.7" />
          <Path d="M24 29 L19 32" fill="none" stroke={accent} strokeWidth="2.2" />

          <Rect x="50" y="37" width="20" height="13" rx="5" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="2.2" />
          <Circle cx="60" cy="43.5" r="4.2" fill="none" stroke={accent} strokeWidth="2" />
          <Path d="M49 49 L42 53 M70 49 L80 52" fill="none" stroke={color} strokeWidth="2.5" />

          <Path d="M82 29 L91 18 L99 17" fill="none" stroke={color} strokeWidth="3" />
          <Path d="M91 18 L96 51" fill="none" stroke={color} strokeWidth="3.2" />
          <Path d="M88 18 L92 10 L101 10" fill="none" stroke={color} strokeWidth="2.5" />
          <Path d="M99 10 L106 13" fill="none" stroke={accent} strokeWidth="2.3" />
          <Circle cx="106.5" cy="16" r="4.2" fill={accent} fillOpacity="0.28" stroke={accent} strokeWidth="2" />
          <Path d="M110 16 L117 16" fill="none" stroke={accent} strokeWidth="2.6" opacity="0.72" />

          <Path d="M67 47 C77 48 82 53 88 55" fill="none" stroke={accent} strokeWidth="3" />
          <Path d="M86 55 H95" fill="none" stroke={accent} strokeWidth="3.2" />
          <Path d="M39 37 C32 35 27 36 23 40" fill="none" stroke={color} strokeWidth="2.5" />
        </G>
      </Svg>
    </Animated.View>
  );
}
