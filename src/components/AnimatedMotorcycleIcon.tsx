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
  const suspension = useRef(new Animated.Value(0)).current;
  const speed = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      suspension.stopAnimation();
      speed.stopAnimation();
      suspension.setValue(0);
      speed.setValue(0);
      return;
    }

    const suspensionLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(suspension, {
          toValue: 1,
          duration: 620,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(suspension, {
          toValue: 0,
          duration: 620,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    const speedLoop = Animated.loop(
      Animated.timing(speed, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    suspensionLoop.start();
    speedLoop.start();
    return () => {
      suspensionLoop.stop();
      speedLoop.stop();
    };
  }, [active, speed, suspension]);

  const width = size * 2.08;
  const accent = secondaryColor ?? color;
  const translateY = suspension.interpolate({ inputRange: [0, 1], outputRange: [0.8, -1.05] });
  const translateX = suspension.interpolate({ inputRange: [0, 1], outputRange: [-0.25, 0.45] });
  const rotate = suspension.interpolate({ inputRange: [0, 1], outputRange: ['-0.5deg', '0.7deg'] });
  const shadowOpacity = suspension.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.25] });
  const speedTranslate = speed.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.2, width * 0.58] });
  const speedOpacity = speed.interpolate({ inputRange: [0, 0.12, 0.78, 1], outputRange: [0, 0.42, 0.28, 0] });

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
          width: size * 1.55,
          height: Math.max(2, size * 0.11),
          bottom: size * 0.015,
          borderRadius: 999,
          backgroundColor: color,
          opacity: shadowOpacity,
          transform: [{ scaleX: 1.08 }],
        }}
      />

      {[0.08, 0.2, 0.32].map((topRatio, index) => (
        <Animated.View
          key={topRatio}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: width * 0.02,
            top: size * topRatio,
            width: size * (0.45 - index * 0.07),
            height: Math.max(1.2, size * 0.045),
            borderRadius: 999,
            backgroundColor: index === 1 ? accent : color,
            opacity: speedOpacity,
            transform: [{ translateX: speedTranslate }],
          }}
        />
      ))}

      <Svg width={width} height={size} viewBox="0 0 142 72">
        <G strokeLinecap="round" strokeLinejoin="round">
          <Circle cx="29" cy="55" r="13" fill="none" stroke={color} strokeWidth="4.2" />
          <Circle cx="29" cy="55" r="7.2" fill="none" stroke={color} strokeWidth="1.7" opacity="0.58" />
          <Circle cx="29" cy="55" r="2.8" fill={accent} />
          <Path d="M29 42.5 V67.5 M16.5 55 H41.5 M20 46 L38 64 M38 46 L20 64" stroke={color} strokeWidth="1.2" opacity="0.4" />

          <Circle cx="111" cy="55" r="13" fill="none" stroke={color} strokeWidth="4.2" />
          <Circle cx="111" cy="55" r="7.2" fill="none" stroke={color} strokeWidth="1.7" opacity="0.58" />
          <Circle cx="111" cy="55" r="2.8" fill={accent} />
          <Path d="M111 42.5 V67.5 M98.5 55 H123.5 M102 46 L120 64 M120 46 L102 64" stroke={color} strokeWidth="1.2" opacity="0.4" />

          <Path d="M29 55 L47 38 L78 38 L95 49 L111 55" fill="none" stroke={color} strokeWidth="3.6" />
          <Path d="M29 55 L55 55 L72 34" fill="none" stroke={color} strokeWidth="3.1" />
          <Path d="M55 55 L93 48" fill="none" stroke={color} strokeWidth="2.8" />

          <Path d="M40 43 C48 29 60 22 78 22 C91 22 101 27 108 35 L101 45 L82 49 L52 48 Z" fill={color} fillOpacity="0.25" stroke={color} strokeWidth="2.6" />
          <Path d="M58 25 C67 16 82 14 94 20 L100 27 L79 28 Z" fill={accent} fillOpacity="0.82" stroke={accent} strokeWidth="2" />
          <Path d="M93 20 L103 10 L110 11 L106 23" fill={color} fillOpacity="0.16" stroke={color} strokeWidth="2.4" />
          <Path d="M102 10 L114 12" fill="none" stroke={accent} strokeWidth="2.5" />

          <Path d="M44 35 L27 29 L17 33 L29 40" fill={color} fillOpacity="0.18" stroke={color} strokeWidth="2.4" />
          <Path d="M28 29 L20 25" fill="none" stroke={accent} strokeWidth="2.2" />
          <Path d="M50 31 L39 25 L31 26" fill="none" stroke={color} strokeWidth="2.4" />

          <Path d="M58 40 C65 34 77 33 87 38 L83 49 L61 51 L52 46 Z" fill={color} fillOpacity="0.18" stroke={color} strokeWidth="2.2" />
          <Circle cx="72" cy="43" r="4.6" fill="none" stroke={accent} strokeWidth="2" />
          <Path d="M58 50 L49 56 M84 49 L95 54" fill="none" stroke={color} strokeWidth="2.5" />

          <Path d="M98 35 L107 23 L115 24" fill="none" stroke={color} strokeWidth="3" />
          <Path d="M106 24 L110 55" fill="none" stroke={color} strokeWidth="3.2" />
          <Path d="M111 24 L119 19 L127 21" fill="none" stroke={accent} strokeWidth="2.3" />
          <Path d="M125 21 L134 21" fill="none" stroke={accent} strokeWidth="2.4" opacity="0.72" />

          <Path d="M82 49 C94 50 99 55 103 58" fill="none" stroke={accent} strokeWidth="3.2" />
          <Path d="M100 58 H112" fill="none" stroke={accent} strokeWidth="3.2" />
          <Path d="M41 44 C34 41 27 42 22 46" fill="none" stroke={color} strokeWidth="2.5" />
          <Path d="M95 35 L106 35" fill="none" stroke={accent} strokeWidth="2.2" />
        </G>
      </Svg>
    </Animated.View>
  );
}
