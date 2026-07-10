import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { FormField } from '../components/FormField';
import { GlassCard } from '../components/GlassCard';
import { PremiumBackground } from '../components/PremiumBackground';
import { PrimaryButton } from '../components/PrimaryButton';
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
  const pulse = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ]),
    );
    const spinLoop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 16000, useNativeDriver: true }),
    );
    const liftLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(lift, { toValue: 1, duration: 2300, useNativeDriver: true }),
        Animated.timing(lift, { toValue: 0, duration: 2300, useNativeDriver: true }),
      ]),
    );
    pulseLoop.start();
    spinLoop.start();
    liftLoop.start();
    return () => {
      pulseLoop.stop();
      spinLoop.stop();
      liftLoop.stop();
    };
  }, [lift, pulse, spin]);

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

  const logoScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.05] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0.7] });
  const ringRotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const toolY = lift.interpolate({ inputRange: [0, 1], outputRange: [4, -5] });

  return (
    <PremiumBackground>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={[styles.systemBadge, { backgroundColor: `${colors.green}14`, borderColor: `${colors.green}48` }]}> 
              <Animated.View style={[styles.onlineDot, { backgroundColor: colors.green, opacity: glowOpacity }]} />
              <Text style={[styles.systemText, { color: colors.green }]} maxFontSizeMultiplier={1.05}>GARAGE OS • SİSTEM HAZIR</Text>
            </View>

            <View style={styles.logoStage}>
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.logoGlow,
                  {
                    backgroundColor: colors.primary,
                    opacity: glowOpacity,
                    transform: [{ scale: logoScale }],
                  },
                ]}
              />
              <Animated.View style={[styles.logoRing, { borderColor: `${colors.cyan}78`, transform: [{ rotate: ringRotate }] }]}> 
                <View style={[styles.ringBolt, styles.ringBoltTop, { backgroundColor: colors.orange }]} />
                <View style={[styles.ringBolt, styles.ringBoltBottom, { backgroundColor: colors.cyan }]} />
              </Animated.View>
              <Animated.View style={{ transform: [{ scale: logoScale }] }}>
                <LinearGradient colors={[colors.primary, colors.primary2, colors.cyan]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logo}>
                  <Animated.View style={{ transform: [{ translateY: toolY }] }}>
                    <Ionicons name="construct" size={39} color="#fff" />
                  </Animated.View>
                </LinearGradient>
              </Animated.View>
              <Animated.View style={[styles.miniGear, { backgroundColor: colors.cardStrong, borderColor: colors.border, transform: [{ rotate: ringRotate }] }]}> 
                <Ionicons name="cog" size={22} color={colors.orange} />
              </Animated.View>
            </View>

            <Text style={[styles.brandTitle, { color: colors.text }]} maxFontSizeMultiplier={1.08}>DraBornGarage</Text>
            <Text style={[styles.brandText, { color: colors.textMuted }]}>Servis kabulünden atölye sırasına, ustalardan tahsilata kadar garajının komuta merkezi.</Text>

            <View style={styles.featureRow}>
              <Feature icon="business" label="Çok İşletmeli" color={colors.cyan} />
              <Feature icon="shield-checkmark" label="Rol Korumalı" color={colors.green} />
              <Feature icon="speedometer" label="Canlı Atölye" color={colors.orange} />
            </View>
          </View>

          <GlassCard style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={[styles.cardEyebrow, { color: colors.primary }]}>GARAJ ERİŞİMİ</Text>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{mode === 'login' ? 'Hesabına bağlan' : 'Yeni hesap oluştur'}</Text>
              </View>
              <View style={[styles.cardHeaderIcon, { backgroundColor: `${colors.orange}16`, borderColor: `${colors.orange}3A` }]}> 
                <Ionicons name={mode === 'login' ? 'key' : 'person-add'} size={21} color={colors.orange} />
              </View>
            </View>

            <View style={[styles.segment, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}> 
              {(['login', 'register'] as const).map((item) => {
                const active = mode === item;
                return (
                  <AnimatedPressable key={item} onPress={() => setMode(item)} style={[styles.segmentButton, { borderColor: active ? `${colors.primary}80` : 'transparent' }]}> 
                    {active && <LinearGradient colors={[`${colors.primary}E8`, `${colors.primary2}E8`]} style={StyleSheet.absoluteFill} />}
                    <Ionicons name={item === 'login' ? 'log-in' : 'person-add'} size={17} color={active ? '#fff' : colors.textMuted} />
                    <Text
                      numberOfLines={1}
                      maxFontSizeMultiplier={1.05}
                      style={[styles.segmentText, { color: active ? '#fff' : colors.textMuted }]}
                    >
                      {item === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
                    </Text>
                  </AnimatedPressable>
                );
              })}
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

            <View style={[styles.secureStrip, { backgroundColor: `${colors.green}0D`, borderColor: `${colors.green}28` }]}> 
              <Ionicons name="lock-closed" size={16} color={colors.green} />
              <Text style={[styles.secureStripText, { color: colors.textMuted }]}>İşletme bazlı yetkilendirme ve Supabase RLS aktif.</Text>
            </View>
          </GlassCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </PremiumBackground>
  );
}

function Feature({ icon, label, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.feature, { backgroundColor: `${color}10`, borderColor: `${color}34` }]}> 
      <Ionicons name={icon} size={16} color={color} />
      <Text numberOfLines={1} maxFontSizeMultiplier={1.02} style={[styles.featureText, { color: colors.textSoft }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingTop: 54, paddingBottom: 42, gap: 20 },
  hero: { alignItems: 'center', gap: 9 },
  systemBadge: { minHeight: 30, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 7 },
  onlineDot: { width: 7, height: 7, borderRadius: 7 },
  systemText: { fontSize: 9, fontWeight: '900', letterSpacing: 1.15 },
  logoStage: { width: 132, height: 132, alignItems: 'center', justifyContent: 'center', marginTop: 3 },
  logoGlow: { position: 'absolute', width: 104, height: 104, borderRadius: 36, shadowColor: '#7C5CFF', shadowOpacity: 0.8, shadowRadius: 30, elevation: 16 },
  logoRing: { position: 'absolute', width: 126, height: 126, borderRadius: 63, borderWidth: 1.5, borderStyle: 'dashed' },
  ringBolt: { position: 'absolute', width: 8, height: 8, borderRadius: 8 },
  ringBoltTop: { top: 8, left: 27 },
  ringBoltBottom: { bottom: 7, right: 24 },
  logo: { width: 88, height: 88, borderRadius: 29, alignItems: 'center', justifyContent: 'center', shadowColor: '#6D5BFF', shadowOpacity: 0.48, shadowRadius: 20, elevation: 12 },
  miniGear: { position: 'absolute', right: 1, bottom: 11, width: 38, height: 38, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  brandTitle: { fontSize: 34, fontWeight: '900', letterSpacing: -1.3 },
  brandText: { textAlign: 'center', maxWidth: 350, lineHeight: 20, fontSize: 13 },
  featureRow: { width: '100%', flexDirection: 'row', gap: 7, marginTop: 5 },
  feature: { flex: 1, minHeight: 42, borderWidth: 1, borderRadius: 14, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  featureText: { fontSize: 9, fontWeight: '900' },
  card: { gap: 15, paddingTop: 18 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  cardEyebrow: { fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  cardTitle: { fontSize: 20, fontWeight: '900', marginTop: 3 },
  cardHeaderIcon: { width: 43, height: 43, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  segment: { flexDirection: 'row', gap: 6, padding: 5, borderRadius: 17, borderWidth: 1, overflow: 'hidden' },
  segmentButton: { flex: 1, minWidth: 0, minHeight: 46, borderRadius: 13, borderWidth: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7, paddingHorizontal: 8 },
  segmentText: { fontSize: 12, fontWeight: '900', textAlign: 'center' },
  secureStrip: { minHeight: 44, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  secureStripText: { flexShrink: 1, fontSize: 11, textAlign: 'center' },
});
