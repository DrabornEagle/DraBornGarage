import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useEffect, useState } from 'react';
import { Alert, Linking, Modal, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';
import { FormField } from './FormField';
import { useTheme } from '../context/ThemeContext';

export function RegistrationCodeField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scannerVisible, setScannerVisible] = useState(false);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    const handleUrl = (url?: string | null) => {
      if (url?.includes('draborngarage://register')) onChange(url);
    };
    Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => subscription.remove();
  }, [onChange]);

  const openScanner = async () => {
    const result = permission?.granted ? permission : await requestPermission();
    if (!result?.granted) {
      Alert.alert('Kamera izni gerekli', 'Ustanın verdiği hesap kayıt QR kodunu taramak için kamera izni ver.');
      return;
    }
    setLocked(false);
    setScannerVisible(true);
  };

  return (
    <View style={[styles.card, { backgroundColor: `${colors.green}0D`, borderColor: `${colors.green}38` }]}>
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: `${colors.green}18` }]}><Ionicons name="link" size={23} color={colors.green} /></View>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: colors.text }]}>Ustanın eklediği müşteri ve motoru bağla</Text>
          <Text style={[styles.text, { color: colors.textMuted }]}>QR kodu okut veya tek kullanımlık kodu gir. Ayrı plaka, marka ve model yazmadan kayıt otomatik eşleşir.</Text>
        </View>
      </View>

      <AnimatedPressable onPress={openScanner} style={[styles.scanButton, { backgroundColor: `${colors.cyan}12`, borderColor: `${colors.cyan}42` }]}>
        <Ionicons name="scan" size={25} color={colors.cyan} />
        <View style={styles.copy}>
          <Text style={[styles.scanTitle, { color: colors.text }]}>Kamerayla QR Tara</Text>
          <Text style={[styles.text, { color: colors.textMuted }]}>Ustanın Müşteriler ekranından oluşturduğu kayıt kartını okut.</Text>
        </View>
      </AnimatedPressable>

      <View style={[styles.orRow, { borderColor: colors.border }]}><Text style={[styles.orText, { color: colors.textMuted }]}>VEYA</Text></View>
      <FormField label="Manuel kayıt kodu" value={value} onChangeText={(next) => onChange(next.trim().toUpperCase())} placeholder="Örn. A7C9F2D4B6" autoCapitalize="characters" />
      <Text style={[styles.helper, { color: colors.textMuted }]}>QR bağlantısının tamamını da bu alana yapıştırabilirsin.</Text>

      <Modal visible={scannerVisible} animationType="slide" transparent onRequestClose={() => setScannerVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.scannerCard, { backgroundColor: colors.cardStrong }]}>
            <View style={styles.scannerHeader}>
              <Text style={[styles.scannerTitle, { color: colors.text }]}>Hesap Kayıt QR Kodunu Tara</Text>
              <AnimatedPressable onPress={() => setScannerVisible(false)}><Ionicons name="close-circle" size={32} color={colors.text} /></AnimatedPressable>
            </View>
            <View style={styles.camera}>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={locked ? undefined : ({ data }) => {
                  setLocked(true);
                  onChange(data);
                  setScannerVisible(false);
                }}
              />
              <View pointerEvents="none" style={[styles.frame, { borderColor: colors.cyan }]} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 19, padding: 13, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  title: { fontSize: 14, fontWeight: '900' },
  text: { fontSize: 12, lineHeight: 17, marginTop: 3 },
  scanButton: { minHeight: 72, borderWidth: 1, borderRadius: 17, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  scanTitle: { fontSize: 13.5, fontWeight: '900' },
  orRow: { borderTopWidth: 1, alignItems: 'center', marginVertical: 3 },
  orText: { marginTop: -9, paddingHorizontal: 10, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  helper: { fontSize: 11.5, lineHeight: 16 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.78)', justifyContent: 'flex-end' },
  scannerCard: { borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 18, gap: 14 },
  scannerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scannerTitle: { fontSize: 18, fontWeight: '900' },
  camera: { height: 390, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  frame: { width: 245, height: 245, borderWidth: 3, borderRadius: 26 },
});
