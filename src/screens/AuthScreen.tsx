import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FormField } from '../components/FormField';
import { GlassCard } from '../components/GlassCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { PremiumBackground } from '../components/PremiumBackground';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export function AuthScreen() {
  const { colors } = useTheme();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.trim() || password.length < 6 || (mode === 'register' && !fullName.trim())) {
      Alert.alert('Eksik bilgi', 'E-posta, en az 6 karakter şifre ve kayıt sırasında ad soyad gereklidir.');
      return;
    }
    setLoading(true);
    const message = mode === 'login'
      ? await signIn(email, password)
      : await signUp(fullName, phone, email, password);
    setLoading(false);
    if (message) Alert.alert(mode === 'login' ? 'Giriş yapılamadı' : 'Bilgi', message);
  };

  return (
    <PremiumBackground>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <LinearGradient colors={[colors.primary, colors.primary2]} style={styles.logo}>
              <Ionicons name="construct" size={34} color="#fff" />
            </LinearGradient>
            <Text style={[styles.brandTitle, { color: colors.text }]}>DraBornGarage</Text>
            <Text style={[styles.brandText, { color: colors.textMuted }]}>Servisini, ustalarını ve kazancını tek panelden yönet.</Text>
          </View>

          <GlassCard style={styles.card}>
            <View style={[styles.segment, { backgroundColor: colors.surfaceSoft }]}> 
              {(['login', 'register'] as const).map((item) => (
                <AnimatedPressable key={item} onPress={() => setMode(item)} style={[styles.segmentButton, mode === item && { backgroundColor: colors.cardStrong }]}> 
                  <Text style={[styles.segmentText, { color: mode === item ? colors.text : colors.textMuted }]}>{item === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}</Text>
                </AnimatedPressable>
              ))}
            </View>

            {mode === 'register' && (
              <>
                <FormField label="Ad Soyad" value={fullName} onChangeText={setFullName} placeholder="Örn. Ahmet Yılmaz" autoCapitalize="words" />
                <FormField label="Telefon" value={phone} onChangeText={setPhone} placeholder="05xx xxx xx xx" keyboardType="phone-pad" />
              </>
            )}
            <FormField label="E-posta" value={email} onChangeText={setEmail} placeholder="usta@garaj.com" keyboardType="email-address" autoCapitalize="none" />
            <FormField label="Şifre" value={password} onChangeText={setPassword} placeholder="En az 6 karakter" secureTextEntry />
            <PrimaryButton title={mode === 'login' ? 'Garaja Gir' : 'Hesabımı Oluştur'} onPress={submit} loading={loading} />
          </GlassCard>

          <View style={styles.securityRow}>
            <Ionicons name="shield-checkmark" size={17} color={colors.green} />
            <Text style={[styles.securityText, { color: colors.textMuted }]}>Veriler işletme bazlı yetkilendirme ve Supabase RLS ile korunur.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </PremiumBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 44, gap: 24 },
  brand: { alignItems: 'center', gap: 10 },
  logo: { width: 76, height: 76, borderRadius: 26, alignItems: 'center', justifyContent: 'center', shadowColor: '#6D5BFF', shadowOpacity: 0.45, shadowRadius: 20, elevation: 10 },
  brandTitle: { fontSize: 32, fontWeight: '900', letterSpacing: -1.2 },
  brandText: { textAlign: 'center', maxWidth: 330, lineHeight: 21, fontSize: 14 },
  card: { gap: 15 },
  segment: { flexDirection: 'row', padding: 4, borderRadius: 16 },
  segmentButton: { flex: 1, minHeight: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  segmentText: { fontWeight: '800' },
  securityRow: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  securityText: { fontSize: 12, flexShrink: 1, textAlign: 'center' },
});
