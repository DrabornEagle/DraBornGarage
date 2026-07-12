import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';

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
  const road = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      suspension.stopAnimation();
      road.stopAnimation();
      glow.stopAnimation();
      suspension.setValue(0);
      road.setValue(0);
      glow.setValue(0);
      return;
    }

    const suspensionLoop = Animated.loop(Animated.sequence([
      Animated.timing(suspension, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(suspension, { toValue: 0, duration: 500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const roadLoop = Animated.loop(Animated.timing(road, { toValue: 1, duration: 720, easing: Easing.linear, useNativeDriver: true }));
    const glowLoop = Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 760, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0, duration: 760, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));

    suspensionLoop.start();
    roadLoop.start();
    glowLoop.start();
    return () => {
      suspensionLoop.stop();
      roadLoop.stop();
      glowLoop.stop();
    };
  }, [active, glow, road, suspension]);

  const width = size * 2.25;
  const accent = secondaryColor ?? '#20D9D2';
  const translateY = suspension.interpolate({ inputRange: [0, 1], outputRange: [0.9, -1.15] });
  const translateX = suspension.interpolate({ inputRange: [0, 1], outputRange: [-0.35, 0.55] });
  const rotate = suspension.interpolate({ inputRange: [0, 1], outputRange: ['-0.45deg', '0.55deg'] });
  const roadTranslate = road.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.62, width * 0.62] });
  const streakOpacity = road.interpolate({ inputRange: [0, 0.1, 0.82, 1], outputRange: [0, 0.7, 0.38, 0] });
  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.3] });

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
          width: size * 1.62,
          height: Math.max(2, size * 0.12),
          bottom: -size * 0.01,
          borderRadius: 999,
          backgroundColor: accent,
          opacity: glowOpacity,
          transform: [{ scaleX: 1.12 }],
        }}
      />

      {[0.02, 0.18, 0.34].map((topRatio, index) => (
        <Animated.View
          key={topRatio}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: width * 0.02,
            top: size * topRatio,
            width: size * (0.62 - index * 0.11),
            height: Math.max(1.2, size * 0.045),
            borderRadius: 999,
            backgroundColor: index === 1 ? '#FFAE45' : accent,
            opacity: streakOpacity,
            transform: [{ translateX: roadTranslate }],
          }}
        />
      ))}

      {[0, 1, 2].map((index) => (
        <Animated.View
          key={`lane-${index}`}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: width * (0.04 + index * 0.3),
            bottom: size * 0.01,
            width: size * 0.34,
            height: Math.max(1.2, size * 0.038),
            borderRadius: 999,
            backgroundColor: '#F4F7FF',
            opacity: streakOpacity,
            transform: [{ translateX: roadTranslate }],
          }}
        />
      ))}

      <Svg width={width} height={size} viewBox="0 0 162 76">
        <Defs>
          <SvgLinearGradient id="fairing" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#8B5CFF" />
            <Stop offset="0.46" stopColor="#4D72FF" />
            <Stop offset="1" stopColor="#20D9D2" />
          </SvgLinearGradient>
          <SvgLinearGradient id="tank" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#7048FF" />
            <Stop offset="1" stopColor="#2BCFEC" />
          </SvgLinearGradient>
          <SvgLinearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#FF8A3D" />
            <Stop offset="1" stopColor="#FFD35A" />
          </SvgLinearGradient>
        </Defs>

        <G strokeLinecap="round" strokeLinejoin="round">
          <Ellipse cx="81" cy="69" rx="62" ry="3" fill={accent} opacity="0.16" />

          <Circle cx="31" cy="57" r="14" fill="#0D1427" stroke="#BFD4FF" strokeWidth="3.8" />
          <Circle cx="31" cy="57" r="8" fill="none" stroke={accent} strokeWidth="2" opacity="0.8" />
          <Circle cx="31" cy="57" r="3" fill="#FFAE45" />
          <Path d="M31 44 V70 M18 57 H44 M22 48 L40 66 M40 48 L22 66" stroke="#D9E5FF" strokeWidth="1.2" opacity="0.5" />

          <Circle cx="126" cy="57" r="14" fill="#0D1427" stroke="#BFD4FF" strokeWidth="3.8" />
          <Circle cx="126" cy="57" r="8" fill="none" stroke={accent} strokeWidth="2" opacity="0.8" />
          <Circle cx="126" cy="57" r="3" fill="#FFAE45" />
          <Path d="M126 44 V70 M113 57 H139 M117 48 L135 66 M135 48 L117 66" stroke="#D9E5FF" strokeWidth="1.2" opacity="0.5" />

          <Path d="M31 57 L52 42 L88 42 L108 52 L126 57" fill="none" stroke="#C9D8FF" strokeWidth="3.4" />
          <Path d="M31 57 L61 57 L79 35" fill="none" stroke="#AFC8FF" strokeWidth="3" />
          <Path d="M61 57 L108 51" fill="none" stroke="#AFC8FF" strokeWidth="2.8" />

          <Path d="M43 44 C50 28 66 19 87 19 C101 19 112 25 121 35 L112 49 L88 54 L56 51 Z" fill="url(#fairing)" stroke={color} strokeWidth="2.5" />
          <Path d="M59 27 C68 16 85 13 100 19 L107 27 L88 31 L69 30 Z" fill="url(#tank)" stroke="#A993FF" strokeWidth="1.8" />
          <Path d="M95 18 L107 8 L116 10 L113 23" fill="#1C2A4A" stroke="#8EBBFF" strokeWidth="2.2" />
          <Path d="M105 9 L119 10" fill="none" stroke="#FFD35A" strokeWidth="2.4" />

          <Path d="M49 35 L30 27 L17 30 L28 39 L45 42" fill="url(#fairing)" stroke={color} strokeWidth="2.3" />
          <Path d="M30 27 L20 22" fill="none" stroke="#FFAE45" strokeWidth="2.4" />
          <Path d="M54 30 L42 22 L31 23" fill="none" stroke="#AFC8FF" strokeWidth="2.3" />

          <Path d="M57 42 C65 34 80 33 95 39 L90 52 L63 55 L51 48 Z" fill="#111B35" stroke="#6F8FFF" strokeWidth="2.2" />
          <Circle cx="76" cy="45" r="5.2" fill="none" stroke="#20D9D2" strokeWidth="2.2" />
          <Path d="M63 52 L52 59 M91 51 L105 57" fill="none" stroke="#C9D8FF" strokeWidth="2.6" />

          <Path d="M111 36 L121 22 L131 23" fill="none" stroke="#BFD4FF" strokeWidth="3" />
          <Path d="M121 23 L125 57" fill="none" stroke="#BFD4FF" strokeWidth="3.2" />
          <Path d="M129 23 L138 18 L147 21" fill="none" stroke="#FFAE45" strokeWidth="2.4" />
          <Path d="M145 21 L157 21" fill="none" stroke="#FFD35A" strokeWidth="2.5" opacity="0.9" />

          <Path d="M88 51 C101 52 108 57 114 62" fill="none" stroke="url(#accent)" strokeWidth="3.5" />
          <Path d="M111 62 H125" fill="none" stroke="#FFAE45" strokeWidth="3.5" />
          <Path d="M44 45 C36 42 27 43 21 48" fill="none" stroke="#AFC8FF" strokeWidth="2.6" />

          <Path d="M51 41 L72 41 L62 49 L48 47 Z" fill="#0E1830" opacity="0.88" />
          <Path d="M100 34 L116 35 L109 42 L94 41 Z" fill="#DDF8FF" opacity="0.7" />
          <Path d="M58 32 L72 30" stroke="#FFD35A" strokeWidth="2.2" />
          <Path d="M84 25 L96 23" stroke="#F4F7FF" strokeWidth="1.8" opacity="0.7" />
        </G>
      </Svg>
    </Animated.View>
  );
}
