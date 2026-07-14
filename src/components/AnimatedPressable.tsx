import * as Haptics from 'expo-haptics';
import React, { useRef } from 'react';
import { AccessibilityRole, AccessibilityState, Animated, Pressable, StyleProp, ViewStyle } from 'react-native';

const NativeAnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function AnimatedPressable({
  children,
  onPress,
  style,
  disabled,
  accessibilityRole,
  accessibilityLabel,
  accessibilityState,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityState?: AccessibilityState;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const animate = (value: number) =>
    Animated.spring(scale, { toValue: value, useNativeDriver: true, speed: 32, bounciness: 5 }).start();

  return (
    <NativeAnimatedPressable
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ ...accessibilityState, disabled: Boolean(disabled) }}
      onPressIn={() => animate(0.97)}
      onPressOut={() => animate(1)}
      onPress={() => {
        Haptics.selectionAsync().catch(() => undefined);
        onPress?.();
      }}
      style={[style, { transform: [{ scale }], opacity: disabled ? 0.5 : 1 }]}
    >
      {children}
    </NativeAnimatedPressable>
  );
}
