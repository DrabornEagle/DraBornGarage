import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';

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
          duration: 620,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(ride, {
          toValue: 0,
          duration: 620,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    const roadLoop = Animated.loop(
      Animated.timing(road, {
        toValue: 1,
        duration: 880,
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

  const width = size * 1.92;
  const cyan = secondaryColor ?? '#25D9F5';
  const pink = '#FF4F78';
  const amber = '#FFB13B';
  const tyre = '#09111F';
  const translateY = ride.interpolate({ inputRange: [0, 1], outputRange: [0.9, -1.35] });
  const translateX = ride.interpolate({ inputRange: [0, 1], outputRange: [-0.45, 0.6] });
  const rotate = ride.interpolate({ inputRange: [0, 1], outputRange: ['-0.9deg', '0.8deg'] });
  const glowOpacity = ride.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.3] });
  const roadTranslate = road.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.62, width * 0.55] });
  const roadOpacity = road.interpolate({ inputRange: [0, 0.12, 0.82, 1], outputRange: [0, 0.48, 0.28, 0] });

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
          width: size * 1.5,
          height: Math.max(2, size * 0.14),
          bottom: size * 0.005,
          borderRadius: 999,
          backgroundColor: cyan,
          opacity: glowOpacity,
          transform: [{ scaleX: 1.08 }],
        }}
      />

      {[0.02, 0.18].map((left, index) => (
        <Animated.View
          key={left}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: width * left,
            bottom: size * (index === 0 ? 0.16 : 0.3),
            width: size * (index === 0 ? 0.42 : 0.25),
            height: Math.max(1.4, size * (index === 0 ? 0.055 : 0.04)),
            borderRadius: 999,
            backgroundColor: index === 0 ? cyan : pink,
            opacity: roadOpacity,
            transform: [{ translateX: roadTranslate }],
          }}
        />
      ))}

      <Svg width={width} height={size} viewBox="0 0 128 68">
        <Defs>
          <SvgLinearGradient id="raceFairing" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color} />
            <Stop offset="0.62" stopColor={cyan} />
            <Stop offset="1" stopColor={pink} />
          </SvgLinearGradient>
          <SvgLinearGradient id="raceRim" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={cyan} />
            <Stop offset="1" stopColor={pink} />
          </SvgLinearGradient>
        </Defs>

        <G strokeLinecap="round" strokeLinejoin="round">
          <Circle cx="26" cy="50" r="13.4" fill={tyre} stroke="url(#raceRim)" strokeWidth="3.4" />
          <Circle cx="26" cy="50" r="7.5" fill="none" stroke="#B8C8DC" strokeWidth="1.5" opacity="0.72" />
          <Circle cx="26" cy="50" r="2.8" fill={amber} />
          <Path d="M26 39 V61 M15 50 H37 M18 42 L34 58 M34 42 L18 58" stroke="#A9BCD1" strokeWidth="1.2" opacity="0.52" />

          <Circle cx="101" cy="50" r="13.4" fill={tyre} stroke="url(#raceRim)" strokeWidth="3.4" />
          <Circle cx="101" cy="50" r="7.5" fill="none" stroke="#B8C8DC" strokeWidth="1.5" opacity="0.72" />
          <Circle cx="101" cy="50" r="2.8" fill={amber} />
          <Path d="M101 39 V61 M90 50 H112 M93 42 L109 58 M109 42 L93 58" stroke="#A9BCD1" strokeWidth="1.2" opacity="0.52" />

          <Path d="M27 50 L47 31 L72 31 L86 42 L101 50" fill="none" stroke="#DCE8F6" strokeWidth="3.2" opacity="0.9" />
          <Path d="M27 50 L55 50 L72 31" fill="none" stroke={color} strokeWidth="3.4" />
          <Path d="M55 50 L86 42" fill="none" stroke={cyan} strokeWidth="3" />

          <Path d="M40 30 C48 18 61 15 78 18 C86 20 91 25 93 31 L82 42 L51 41 L42 35 Z" fill="url(#raceFairing)" stroke="#F8FBFF" strokeWidth="1.7" />
          <Path d="M48 31 C58 24 70 23 85 27 L78 33 L57 35 Z" fill="#07111E" fillOpacity="0.72" />
          <Path d="M57 36 H79 L72 43 H49 Z" fill={pink} fillOpacity="0.9" />
          <Path d="M50 24 H73 C78 24 81 26 79 29 H48 C45 29 45 26 50 24 Z" fill="#111827" stroke={amber} strokeWidth="1.8" />

          <Path d="M43 29 L29 25 L20 31 L28 34 L43 33 Z" fill={pink} stroke="#F8FBFF" strokeWidth="1.4" />
          <Path d="M22 30 L16 32" stroke={amber} strokeWidth="2.4" />

          <Path d="M82 24 L90 13 L101 13 L96 22 Z" fill={cyan} fillOpacity="0.32" stroke={cyan} strokeWidth="1.8" />
          <Path d="M89 24 L98 16 L105 18" fill="none" stroke="#E9F6FF" strokeWidth="2.5" />
          <Path d="M96 18 L100 50" fill="none" stroke="#DCE8F6" strokeWidth="3" />
          <Path d="M97 13 L101 8 L109 9" fill="none" stroke={color} strokeWidth="2.4" />
          <Path d="M108 9 L114 12" fill="none" stroke={pink} strokeWidth="2.3" />
          <Path d="M104 18 L112 18 L116 22 L108 24 Z" fill={amber} fillOpacity="0.92" stroke="#FFF3CE" strokeWidth="1.2" />

          <Path d="M54 41 C58 36 69 35 76 40 L73 49 H54 Z" fill="#0B1727" stroke="#C9D9EA" strokeWidth="1.8" />
          <Circle cx="65" cy="43" r="4.2" fill="none" stroke={amber} strokeWidth="2" />
          <Path d="M54 48 L46 53 M74 48 L84 52" fill="none" stroke="#DCE8F6" strokeWidth="2.4" />

          <Path d="M73 47 C84 47 89 51 94 55" fill="none" stroke={pink} strokeWidth="3.1" />
          <Path d="M91 55 H101" fill="none" stroke={amber} strokeWidth="3.4" />
          <Path d="M84 41 L92 37" fill="none" stroke={cyan} strokeWidth="2.4" />
          <Path d="M92 37 L102 35" fill="none" stroke={pink} strokeWidth="2" opacity="0.82" />
        </G>
      </Svg>
    </Animated.View>
  );
}
