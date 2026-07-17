import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Share, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Motorcycle } from '../types';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { AnimatedPressable } from './AnimatedPressable';
import { PrimaryButton } from './PrimaryButton';

type RegistrationAccess = {
  registration_code: string;
  registration_token: string;
  qr_payload: string;
  expires_at: string;
};

export function CustomerRegistrationAccessCard({ motorcycle }: { motorcycle: Motorcycle }) {
  const { colors } = useTheme();
  const [access, setAccess] = useState<RegistrationAccess | null>(null);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (access) {
      setAccess(null);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc('staff_create_customer_registration_link', { p_motorcycle_id: motorcycle.id });
    setLoading(false);
    if (error) {
      Alert.alert('Kayıt kodu oluşturulamadı', error.message);
      return;
    }
    const value = ((data as RegistrationAccess[] | null) ?? [])[0];
    if (!value) {
      Alert.alert('Kayıt kodu oluşturulamadı', 'Müşteri ve motosiklet kaydı doğrulanamadı.');
      return;
    }
    setAccess(value);
  };

  return (
    <View style={styles.root}>
      <AnimatedPressable
        onPress={toggle}
        disabled={loading}
        style={[styles.button, { borderColor: `${colors.green}45`, backgroundColor: `${colors.green}0D` }]}
      >
        <Ionicons name={access ? 'close-circle-outline' : 'person-add'} size={18} color={colors.green} />
        <Text style={[styles.buttonText, { color: colors.green }]}>{loading ? 'Kod hazırlanıyor…' : access ? 'Hesap Kayıt Kartını Kapat' : 'Hesap Kayıt QR / Kod'}</Text>
      </AnimatedPressable>

      {access && (
        <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.qr}><QRCode value={access.qr_payload} size={145} /></View>
          <Text style={[styles.label, { color: colors.textMuted }]}>TEK KULLANIMLIK HESAP KAYIT KODU</Text>
          <Text style={[styles.code, { color: colors.text }]}>{access.registration_code}</Text>
          <Text style={[styles.helper, { color: colors.textMuted }]}>Müşteri Kayıt Ol → QR / Kod seçeneğinden bu kartı okutur. Bu motosiklet ve işletme hesabına otomatik bağlanır.</Text>
          <PrimaryButton
            title="Müşteriyle Paylaş"
            secondary
            onPress={() => Share.share({
              message: `DraBornGarage hesap kaydı\n${motorcycle.brand} ${motorcycle.model} • ${motorcycle.plate || 'Plaka yok'}\nKayıt kodu: ${access.registration_code}\n${access.qr_payload}`,
            })}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 8 },
  button: { minHeight: 41, borderWidth: 1, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  buttonText: { fontSize: 12, fontWeight: '900' },
  panel: { borderWidth: 1, borderRadius: 17, padding: 12, alignItems: 'center', gap: 8 },
  qr: { backgroundColor: '#fff', padding: 9, borderRadius: 14 },
  label: { fontSize: 10, fontWeight: '900', letterSpacing: 1, textAlign: 'center' },
  code: { fontSize: 24, fontWeight: '900', letterSpacing: 2.5 },
  helper: { fontSize: 11.5, lineHeight: 17, textAlign: 'center' },
});
