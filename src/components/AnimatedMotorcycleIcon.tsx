import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, ViewStyle } from 'react-native';

export function AnimatedMotorcycleIcon({ size = 26, color, style, active = true }: { size?: number; color: string; style?: StyleProp<ViewStyle>; active?: boolean }) {
  const motion = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) { motion.setValue(0); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(motion, { toValue: 1, duration: 850, useNativeDriver: true }),
      Animated.timing(motion, { toValue: 0, duration: 850, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [active, motion]);

  const translateY = motion.interpolate({ inputRange: [0, 1], outputRange: [0, -2.2] });
  const translateX = motion.interpolate({ inputRange: [0, 1], outputRange: [0, 1.4] });
  const rotate = motion.interpolate({ inputRange: [0, 1], outputRange: ['-1deg', '1.5deg'] });

  return <Animated.View style={[style, { transform: [{ translateY }, { translateX }, { rotate }] }]}><MaterialCommunityIcons name="motorbike" size={size} color={color} /></Animated.View>;
}
