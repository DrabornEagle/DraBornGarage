import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export function FormField({ label, ...props }: TextInputProps & { label: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <View style={[styles.labelRail, { backgroundColor: colors.orange }]} />
        <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      </View>
      <View style={[styles.inputShell, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}> 
        <View style={[styles.inputDepth, { backgroundColor: `${colors.primary2}12` }]} />
        <TextInput
          placeholderTextColor={colors.textMuted}
          {...props}
          style={[
            styles.input,
            { color: colors.text },
            props.multiline && styles.multiline,
            props.style,
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  labelRail: { width: 16, height: 3, borderRadius: 3 },
  label: { fontSize: 11.5, fontWeight: '900', letterSpacing: 0.35 },
  inputShell: { minHeight: 54, borderRadius: 17, borderWidth: 1, overflow: 'hidden' },
  inputDepth: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 5 },
  input: { minHeight: 52, paddingHorizontal: 16, fontSize: 15.5, fontWeight: '700' },
  multiline: { minHeight: 98, paddingTop: 14, textAlignVertical: 'top' },
});
