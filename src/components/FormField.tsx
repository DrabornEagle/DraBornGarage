import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export function FormField({ label, ...props }: TextInputProps & { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        {...props}
        style={[
          styles.input,
          { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceSoft },
          props.multiline && styles.multiline,
          props.style,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { fontSize: 13, fontWeight: '700' },
  input: { minHeight: 52, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, fontSize: 16 },
  multiline: { minHeight: 96, paddingTop: 14, textAlignVertical: 'top' },
});
