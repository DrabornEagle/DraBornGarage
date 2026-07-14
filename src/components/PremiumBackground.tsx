import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { ThemeMode } from '../types';

const WARNING_BLOCKS = Array.from({ length: 18 });

function themeGradient(mode: ThemeMode, resolvedMode: 'light' | 'dark'): [string, string, string, string] {
  if (mode === 'light' || (mode === 'system' && resolvedMode === 'light')) {
    return ['#F7F9FC', '#EDF2F8', '#F8FAFC', '#EEF3FA'];
  }
  if (mode === 'carbon') return ['#030405', '#0A0C0E', '#16191C', '#050607'];
  if (mode === 'racing') return ['#090405', '#1A090D', '#270C13', '#080405'];
  if (mode === 'electric') return ['#01070D', '#041522', '#07263A', '#020A12'];
  if (mode === 'sunset') return ['#0E0507', '#241018', '#371526', '#12070A'];
  return ['#040609', '#0A1018', '#101827', '#070A0F'];
}

export function PremiumBackground({ children }: { children: React.ReactNode }) {
  const { mode, resolvedMode, colors } = useTheme();
  const drift = useRef(new Animated.Value(0)).current;
  const rotation = useRef(new Animated.Value(0)).current;
  const scan = useRef(new Animated.Value(0)).current;
  const spark = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const driftLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 7600, useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 7600, useNativeDriver: true }),
      ]),
    );
    const rotationLoop = Animated.loop(
      Animated.timing(rotation, { toValue: 1, duration: 18000, useNativeDriver: true }),
    );
    const scanLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scan, { toValue: 1, duration: 5200, useNativeDriver: true }),
        Animated.delay(1000),
        Animated.timing(scan, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    const sparkLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(spark, { toValue: 1, duration: 1900, useNativeDriver: true }),
        Animated.timing(spark, { toValue: 0, duration: 0, useNativeDriver: true }),
        Animated.delay(1400),
      ]),
    );

    driftLoop.start();
    rotationLoop.start();
    scanLoop.start();
    sparkLoop.start();

    return () => {
      driftLoop.stop();
      rotationLoop.stop();
      scanLoop.stop();
      sparkLoop.stop();
    };
  }, [drift, rotation, scan, spark]);

  const { width, height } = Dimensions.get('window');
  const translateX = drift.interpolate({ inputRange: [0, 1], outputRange: [-24, 34] });
  const translateY = drift.interpolate({ inputRange: [0, 1], outputRange: [0, 52] });
  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const reverseRotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
  const scanY = scan.interpolate({ inputRange: [0, 1], outputRange: [-20, height + 20] });
  const sparkY = spark.interpolate({ inputRange: [0, 1], outputRange: [0, -90] });
  const sparkX = spark.interpolate({ inputRange: [0, 1], outputRange: [0, 36] });
  const sparkOpacity = spark.interpolate({ inputRange: [0, 0.18, 0.8, 1], outputRange: [0, 1, 0.7, 0] });
  const gradient = themeGradient(mode, resolvedMode);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}> 
      <LinearGradient colors={gradient} locations={[0, 0.38, 0.72, 1]} style={StyleSheet.absoluteFill} />

      <View pointerEvents="none" style={styles.warningRail}>
        {WARNING_BLOCKS.map((_, index) => (
          <View key={index} style={[styles.warningBlock, { backgroundColor: index % 2 === 0 ? colors.orange : colors.black }]} />
        ))}
      </View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.orb,
          {
            width: width * 0.96,
            height: width * 0.96,
            backgroundColor: colors.primary,
            transform: [{ translateX }, { translateY }],
            opacity: resolvedMode === 'dark' ? 0.14 : 0.08,
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.orbTwo,
          {
            width: width * 0.72,
            height: width * 0.72,
            backgroundColor: colors.cyan,
            transform: [{ translateX: Animated.multiply(translateX, -0.7) }],
            opacity: resolvedMode === 'dark' ? 0.09 : 0.06,
          },
        ]}
      />

      <Animated.View pointerEvents="none" style={[styles.gearLarge, { transform: [{ rotate }], opacity: resolvedMode === 'dark' ? 0.12 : 0.07 }]}> 
        <Ionicons name="cog" size={190} color={colors.textSoft} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.gearSmall, { transform: [{ rotate: reverseRotate }], opacity: resolvedMode === 'dark' ? 0.1 : 0.06 }]}> 
        <Ionicons name="cog" size={118} color={colors.primary2} />
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.scanLine,
          {
            backgroundColor: colors.cyan,
            transform: [{ translateY: scanY }],
            opacity: resolvedMode === 'dark' ? 0.12 : 0.06,
          },
        ]}
      />

      <View pointerEvents="none" style={styles.sparkOrigin}>
        {[0, 1, 2].map((item) => (
          <Animated.View
            key={item}
            style={[
              styles.spark,
              {
                backgroundColor: item === 1 ? colors.orange : colors.cyan,
                opacity: sparkOpacity,
                transform: [
                  { translateY: Animated.multiply(sparkY, 0.7 + item * 0.18) },
                  { translateX: Animated.multiply(sparkX, item === 0 ? -0.8 : item === 1 ? 0.35 : 1) },
                  { scale: 0.8 + item * 0.18 },
                ],
              },
            ]}
          />
        ))}
      </View>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  orb: { position: 'absolute', borderRadius: 999, top: -220, right: -195 },
  orbTwo: { position: 'absolute', borderRadius: 999, bottom: -190, left: -155 },
  warningRail: { position: 'absolute', top: 0, left: 0, right: 0, height: 7, flexDirection: 'row', overflow: 'hidden', opacity: 0.72 },
  warningBlock: { flex: 1, height: 16, transform: [{ skewX: '-28deg' }], marginHorizontal: 1 },
  gearLarge: { position: 'absolute', right: -78, top: 92 },
  gearSmall: { position: 'absolute', left: -46, bottom: 116 },
  scanLine: { position: 'absolute', left: 0, right: 0, height: 2, shadowColor: '#2EF2E8', shadowOpacity: 0.55, shadowRadius: 8 },
  sparkOrigin: { position: 'absolute', right: 54, bottom: 168, width: 20, height: 20 },
  spark: { position: 'absolute', width: 4, height: 4, borderRadius: 4 },
});
