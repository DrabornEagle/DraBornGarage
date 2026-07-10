import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { FormField } from '../components/FormField';
import { GarageIcon3D } from '../components/GarageIcon3D';
import { GarageBlink, GarageReveal } from '../components/GarageMotion';
import { GlassCard } from '../components/GlassCard';
import { PremiumBackground } from '../components/PremiumBackground';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { AccountMode } from '../types';

export function AuthScreen() {
  const { colors } = useTheme();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [registerMode, setRegisterMode] = useState<AccountMode>('customer');
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
      : await signUp(fullName, phone, email, password, registerMode);
    setLoading(false);
    if (message) Alert.alert(mode === 'login' ? 'Giriş yapılamadı' : 'Bilgi', message);
  };

  return (
    <PremiumBackground>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <GarageReveal delay={30}>
            <View style={[styles.heroConsole, { backgroundColor: colors.cardStrong, borderColor: colors.border }]}> 
              <View style={styles.heroTop}>
                <View style={styles.heroCopy}>
                  <View style={[styles.systemBadge, { backgroundColor: `${colors.green}12`, borderColor: `${colors.green}3C` }]}> 
                    <GarageBlink><View style={[styles.onlineDot, { backgroundColor: colors.green }]} /></GarageBlink>
                    <Text style={[styles.systemText, { color: colors.green }]}>GARAGE OS • ÇEVRİMİÇİ</Text>
                  </View>
                  <Text style={[styles.brandTitle, { color: colors.text }]}>DraBornGarage</Text>
                  <Text style={[styles.brandText, { color: colors.textMuted }]}>Servis kabulünden teslimata kadar tüm motosiklet akışını tek kontrol merkezinden yönet.</Text>
                </View>
                <GarageIcon3D name="motorbike" size={92} iconSize={46} accent={colors.orange} accent2={colors.primary} animated />
              </View>

              <View style={styles.dashboardStrip}>
                <ConsoleMetric icon="garage-variant" value="Çok İşletmeli" accent={colors.cyan} />
                <ConsoleMetric icon="wrench-clock" value="Canlı Servis" accent={colors.orange} />
                <ConsoleMetric icon="shield-check" value="Güvenli" accent={colors.green} />
              </View>

              <View style={styles.roadLine}>
                <View style={[styles.roadDash, { backgroundColor: colors.orange }]} />
                <View style={[styles.roadDashLong, { backgroundColor: colors.border }]} />
                <MaterialCommunityIcons name="motorbike" size={18} color={colors.cyan} />
              </View>
            </View>
          </GarageReveal>

          <GarageReveal delay={100}>
            <GlassCard style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderCopy}>
                  <Text style={[styles.cardEyebrow, { color: colors.orange }]}>GARAJ ERİŞİM PANELİ</Text>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>{mode === 'login' ? 'Tekrar hoş geldin' : 'Yeni hesap oluştur'}</Text>
                  <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>{mode === 'login' ? 'Garaj kontrol paneline güvenli giriş yap.' : 'Müşteri veya işletme hesabı türünü seçerek başla.'}</Text>
                </View>
                <GarageIcon3D name={mode === 'login' ? 'key-variant' : 'account-plus'} size={58} iconSize={27} accent={colors.primary} accent2={colors.cyan} />
              </View>

              <View style={[styles.segment, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}> 
                {(['login', 'register'] as const).map((item) => {
                  const active = mode === item;
                  return (
                    <AnimatedPressable key={item} onPress={() => setMode(item)} style={[styles.segmentButton, { borderColor: active ? `${colors.primary}68` : 'transparent' }]}> 
                      {active && <LinearGradient colors={[colors.primary, colors.primary2]} style={StyleSheet.absoluteFill} />}
                      <Ionicons name={item === 'login' ? 'log-in' : 'person-add'} size={17} color={active ? '#fff' : colors.textMuted} />
                      <Text style={[styles.segmentText, { color: active ? '#fff' : colors.textMuted }]}>{item === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}</Text>
                    </AnimatedPressable>
                  );
                })}
              </View>

              {mode === 'register' && (
                <>
                  <Text style={[styles.roleLabel, { color: colors.textMuted }]}>HESAP TÜRÜ</Text>
                  <View style={styles.accountModeRow}>
                    <AccountModeCard
                      active={registerMode === 'customer'}
                      title="Müşteri"
                      subtitle="Motorumu ve servis durumumu takip edeceğim."
                      icon="motorbike"
                      accent={colors.cyan}
                      onPress={() => setRegisterMode('customer')}
                    />
                    <AccountModeCard
                      active={registerMode === 'staff'}
                      title="İşletme / Usta"
                      subtitle="Garaj, servis ve personel yönetimi yapacağım."
                      icon="account-hard-hat"
                      accent={colors.orange}
                      onPress={() => setRegisterMode('staff')}
                    />
                  </View>
                  <FormField label="Ad Soyad" value={fullName} onChangeText={setFullName} placeholder="Örn. Ahmet Yılmaz" autoCapitalize="words" />
                  <FormField label="Telefon" value={phone} onChangeText={setPhone} placeholder="05xx xxx xx xx" keyboardType="phone-pad" />
                </>
              )}

              <FormField label="E-posta" value={email} onChangeText={setEmail} placeholder={mode === 'register' && registerMode === 'customer' ? 'musteri@email.com' : 'usta@garaj.com'} keyboardType="email-address" autoCapitalize="none" />
              <FormField label="Şifre" value={password} onChangeText={setPassword} placeholder="En az 6 karakter" secureTextEntry />
              <PrimaryButton title={mode === 'login' ? 'Garaj Kontrol Merkezine Gir' : registerMode === 'customer' ? 'Müşteri Hesabımı Oluştur' : 'Personel Hesabımı Oluştur'} onPress={submit} loading={loading} />

              <View style={[styles.secureStrip, { backgroundColor: `${colors.green}0C`, borderColor: `${colors.green}2C` }]}>
                <View style={[styles.secureIcon, { backgroundColor: `${colors.green}18` }]}><Ionicons name="lock-closed" size={16} color={colors.green} /></View>
                <Text style={[styles.secureStripText, { color: colors.textMuted }]}>Plaka tek başına hesap bağlantısı kurmaz; telefon, servis kodu, QR veya usta onayı gerekir.</Text>
              </View>
            </GlassCard>
          </GarageReveal>
        </ScrollView>
      </KeyboardAvoidingView>
    </PremiumBackground>
  );
}

function ConsoleMetric({ icon, value, accent }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; value: string; accent: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.metric, { backgroundColor: `${accent}0E`, borderColor: `${accent}30` }]}> 
      <View style={[styles.metricIcon, { backgroundColor: `${accent}18` }]}><MaterialCommunityIcons name={icon} size={18} color={accent} /></View>
      <Text numberOfLines={1} style={[styles.metricText, { color: colors.textSoft }]}>{value}</Text>
    </View>
  );
}

function AccountModeCard({ active, title, subtitle, icon, accent, onPress }: { active: boolean; title: string; subtitle: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; accent: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <AnimatedPressable onPress={onPress} style={[styles.accountModeCard, { backgroundColor: active ? `${accent}15` : colors.surfaceSoft, borderColor: active ? `${accent}75` : colors.border }]}> 
      <View style={styles.accountTop}>
        <View style={[styles.accountIconDepth, { backgroundColor: `${accent}28` }]} />
        <View style={[styles.accountModeIcon, { backgroundColor: `${accent}14`, borderColor: `${accent}3C` }]}><MaterialCommunityIcons name={icon} size={23} color={accent} /></View>
        <Ionicons name={active ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={active ? accent : colors.textMuted} />
      </View>
      <Text style={[styles.accountModeTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.accountModeSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 18, paddingTop: 48, paddingBottom: 34, gap: 16 },
  heroConsole: { borderWidth: 1, borderRadius: 25, padding: 17, overflow: 'hidden' },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  heroCopy: { flex: 1, minWidth: 0 },
  systemBadge: { alignSelf: 'flex-start', minHeight: 27, paddingHorizontal: 9, borderRadius: 999, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  onlineDot: { width: 6, height: 6, borderRadius: 6 },
  systemText: { fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  brandTitle: { fontSize: 31, fontWeight: '900', letterSpacing: -1, marginTop: 9 },
  brandText: { fontSize: 12, lineHeight: 18, marginTop: 5 },
  dashboardStrip: { flexDirection: 'row', gap: 7, marginTop: 14 },
  metric: { flex: 1, minHeight: 57, borderRadius: 15, borderWidth: 1, padding: 7, justifyContent: 'center' },
  metricIcon: { width: 29, height: 29, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  metricText: { fontSize: 8, fontWeight: '900', marginTop: 4 },
  roadLine: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12 },
  roadDash: { width: 28, height: 3, borderRadius: 3 },
  roadDashLong: { flex: 1, height: 1 },
  card: { gap: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardHeaderCopy: { flex: 1, minWidth: 0 },
  cardEyebrow: { fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  cardTitle: { fontSize: 21, fontWeight: '900', marginTop: 4 },
  cardSubtitle: { fontSize: 10.5, lineHeight: 16, marginTop: 4 },
  segment: { flexDirection: 'row', gap: 5, padding: 4, borderRadius: 17, borderWidth: 1 },
  segmentButton: { flex: 1, minHeight: 46, borderRadius: 13, borderWidth: 1, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  segmentText: { fontSize: 11.5, fontWeight: '900' },
  roleLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 0.9 },
  accountModeRow: { flexDirection: 'row', gap: 9 },
  accountModeCard: { flex: 1, minHeight: 150, borderWidth: 1, borderRadius: 18, padding: 11 },
  accountTop: { height: 45, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  accountIconDepth: { position: 'absolute', width: 38, height: 38, borderRadius: 13, left: 4, top: 5 },
  accountModeIcon: { width: 38, height: 38, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  accountModeTitle: { fontSize: 13, fontWeight: '900', marginTop: 9 },
  accountModeSubtitle: { fontSize: 9.5, lineHeight: 14, marginTop: 5 },
  secureStrip: { borderWidth: 1, borderRadius: 15, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 9 },
  secureIcon: { width: 31, height: 31, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  secureStripText: { flex: 1, fontSize: 9.5, lineHeight: 15 },
});
