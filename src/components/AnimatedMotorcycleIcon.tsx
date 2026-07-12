import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

export function AnimatedMotorcycleIcon({ size = 30, color, style, active = true }: { size?: number; color: string; style?: StyleProp<ViewStyle>; active?: boolean }) {
  const ride = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) { ride.setValue(0); glow.setValue(0); return; }
    const rideLoop = Animated.loop(Animated.sequence([
      Animated.timing(ride, { toValue: 1, duration: 620, useNativeDriver: true }),
      Animated.timing(ride, { toValue: 0, duration: 620, useNativeDriver: true }),
    ]));
    const glowLoop = Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 760, useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0, duration: 760, useNativeDriver: true }),
    ]));
    rideLoop.start(); glowLoop.start();
    return () => { rideLoop.stop(); glowLoop.stop(); };
  }, [active, glow, ride]);

  const translateY = ride.interpolate({ inputRange: [0, 1], outputRange: [0, -2.4] });
  const translateX = ride.interpolate({ inputRange: [0, 1], outputRange: [-0.8, 1.5] });
  const rotate = ride.interpolate({ inputRange: [0, 1], outputRange: ['-1.4deg', '1.8deg'] });
  const headlightOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });
  const shellWidth = size * 1.5;
  const shellHeight = size * 1.08;

  return <Animated.View style={[styles.wrap, { width: shellWidth, height: shellHeight, transform: [{ translateY }, { translateX }, { rotate }] }, style]}>
    <Animated.View style={[styles.roadShadow, { width: size * 1.18, opacity: headlightOpacity }]} />
    <View style={[styles.wheel, styles.rearWheel, { width: size * 0.29, height: size * 0.29, borderRadius: size, borderColor: color }]}><View style={styles.wheelHub} /></View>
    <View style={[styles.wheel, styles.frontWheel, { width: size * 0.29, height: size * 0.29, borderRadius: size, borderColor: color }]}><View style={styles.wheelHub} /></View>
    <MaterialCommunityIcons name="motorbike" size={size} color="rgba(0,0,0,0.72)" style={[styles.layer, { transform: [{ translateX: 1.8 }, { translateY: 2.2 }] }]} />
    <MaterialCommunityIcons name="motorbike" size={size} color={color} style={styles.layer} />
    <MaterialCommunityIcons name="motorbike" size={size} color="rgba(255,255,255,0.42)" style={[styles.layer, { transform: [{ translateX: -0.8 }, { translateY: -0.9 }], opacity: 0.48 }]} />
    <LinearGradient colors={["rgba(255,255,255,0.48)", "rgba(255,255,255,0)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.bodyHighlight, { width: size * 0.68, height: size * 0.18 }]} />
    <Animated.View style={[styles.headlight, { right: size * 0.09, top: size * 0.29, opacity: headlightOpacity, shadowColor: color }]} />
  </Animated.View>;
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  layer: { position: 'absolute' },
  roadShadow: { position: 'absolute', bottom: 0, height: 5, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.34)', transform: [{ scaleX: 1.1 }] },
  wheel: { position: 'absolute', bottom: 2, borderWidth: 2.2, backgroundColor: '#080A10', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.55, shadowRadius: 3, elevation: 4 },
  rearWheel: { left: '17%' },
  frontWheel: { right: '15%' },
  wheelHub: { width: '32%', height: '32%', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.72)' },
  bodyHighlight: { position: 'absolute', top: '24%', left: '27%', borderRadius: 999, transform: [{ rotate: '-12deg' }] },
  headlight: { position: 'absolute', width: 5.5, height: 5.5, borderRadius: 999, backgroundColor: '#FFF7C2', shadowOpacity: 0.95, shadowRadius: 7, elevation: 7 },
});
