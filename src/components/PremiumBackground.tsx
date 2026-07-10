import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { ThemeMode } from '../types';

const HORIZONTAL_GRID = Array.from({ length: 12 });
const VERTICAL_GRID = Array.from({ length: 8 });
const WARNING_BLOCKS = Array.from({ length: 22 });

function themeGradient(mode: ThemeMode, resolvedMode: 'light' | 'dark'): [string, string, string, string] {
  if (mode === 'light' || (mode === 'system' && resolvedMode === 'light')) return ['#F8FAFD', '#EEF4FA', '#F7FAFC', '#EDF3F8'];
  if (mode === 'carbon') return ['#040505', '#0B0D0F', '#111418', '#050607'];
  if (mode === 'racing') return ['#080405', '#18070B', '#220A10', '#090405'];
  if (mode === 'electric') return ['#02080E', '#06131F', '#082235', '#020A12'];
  if (mode === 'sunset') return ['#100508', '#241018', '#321322', '#12070A'];
  return ['#05080D', '#0A111B', '#101927', '#070A12'];
}

export function PremiumBackground({ children }: { children: React.ReactNode }) {
  const { mode, resolvedMode, colors } = useTheme();
  const bike = useRef(new Animated.Value(0)).current;
  const gear = useRef(new Animated.Value(0)).current;
  const conveyor = useRef(new Animated.Value(0)).current;
  const { width, height } = Dimensions.get('window');

  useEffect(() => {
    const bikeLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bike, { toValue: 1, duration: 11000, useNativeDriver: true }),
        Animated.timing(bike, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.delay(1100),
      ]),
    );
    const gearLoop = Animated.loop(Animated.timing(gear, { toValue: 1, duration: 24000, useNativeDriver: true }));
    const conveyorLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(conveyor, { toValue: 1, duration: 4200, useNativeDriver: true }),
        Animated.timing(conveyor, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    bikeLoop.start();
    gearLoop.start();
    conveyorLoop.start();
    return () => {
      bikeLoop.stop();
      gearLoop.stop();
      conveyorLoop.stop();
    };
  }, [bike, conveyor, gear]);

  const bikeX = bike.interpolate({ inputRange: [0, 1], outputRange: [-110, width + 80] });
  const bikeBob = bike.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -5, 0] });
  const rotate = gear.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const stripeX = conveyor.interpolate({ inputRange: [0, 1], outputRange: [-50, 0] });
  const gradient = themeGradient(mode, resolvedMode);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}> 
      <LinearGradient colors={gradient} locations={[0, 0.38, 0.72, 1]} style={StyleSheet.absoluteFill} />

      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: resolvedMode === 'dark' ? 0.12 : 0.07 }]}> 
        {HORIZONTAL_GRID.map((_, index) => <View key={`h-${index}`} style={[styles.gridHorizontal, { top: index * (height / 11), backgroundColor: colors.cyan }]} />)}
        {VERTICAL_GRID.map((_, index) => <View key={`v-${index}`} style={[styles.gridVertical, { left: index * (width / 7), backgroundColor: colors.primary2 }]} />)}
      </View>

      <View pointerEvents="none" style={styles.warningRail}>
        <Animated.View style={[styles.warningTrack, { transform: [{ translateX: stripeX }] }]}> 
          {WARNING_BLOCKS.map((_, index) => <View key={index} style={[styles.warningBlock, { backgroundColor: index % 2 === 0 ? colors.orange : colors.black }]} />)}
        </Animated.View>
      </View>

      <View pointerEvents="none" style={[styles.blueprintCircle, { borderColor: `${colors.cyan}24` }]} />
      <View pointerEvents="none" style={[styles.blueprintCircleSmall, { borderColor: `${colors.orange}20` }]} />

      <Animated.View pointerEvents="none" style={[styles.gearLarge, { transform: [{ rotate }], opacity: resolvedMode === 'dark' ? 0.08 : 0.04 }]}> 
        <MaterialCommunityIcons name="cog-outline" size={205} color={colors.textSoft} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.engine, { transform: [{ rotate: rotate }], opacity: resolvedMode === 'dark' ? 0.075 : 0.035 }]}> 
        <MaterialCommunityIcons name="engine-outline" size={110} color={colors.orange} />
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.movingBike,
          {
            opacity: resolvedMode === 'dark' ? 0.12 : 0.06,
            transform: [{ translateX: bikeX }, { translateY: bikeBob }],
          },
        ]}
      >
        <MaterialCommunityIcons name="motorbike" size={82} color={colors.cyan} />
        <View style={[styles.bikeRoad, { backgroundColor: `${colors.cyan}35` }]} />
      </Animated.View>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  gridHorizontal: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth },
  gridVertical: { position: 'absolute', top: 0, bottom: 0, width: StyleSheet.hairlineWidth },
  warningRail: { position: 'absolute', top: 0, left: 0, right: 0, height: 7, overflow: 'hidden', opacity: 0.86 },
  warningTrack: { width: '120%', height: 7, flexDirection: 'row' },
  warningBlock: { width: 34, height: 15, transform: [{ skewX: '-28deg' }], marginRight: 3 },
  blueprintCircle: { position: 'absolute', width: 330, height: 330, borderRadius: 330, borderWidth: 1, right: -180, top: 72 },
  blueprintCircleSmall: { position: 'absolute', width: 190, height: 190, borderRadius: 190, borderWidth: 1, left: -95, bottom: 92 },
  gearLarge: { position: 'absolute', right: -92, top: 110 },
  engine: { position: 'absolute', left: -28, bottom: 88 },
  movingBike: { position: 'absolute', bottom: 105, left: 0, width: 96, alignItems: 'center' },
  bikeRoad: { width: 88, height: 2, borderRadius: 2, marginTop: -4 },
});
