import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedMotorcycleIcon } from '../components/AnimatedMotorcycleIcon';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { FormField } from '../components/FormField';
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
  const [plate, setPlate] = useState('');
  const [motorcycleBrand, setMotorcycleBrand] = useState('');
  const [motorcycleModel, setMotorcycleModel] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [taxOffice, setTaxOffice] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const pulse = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1500, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 1500, useNativeDriver: true }),
    ]));
    const spinLoop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 16000, useNativeDriver: true }));
    pulseLoop.start(); spinLoop.start();
    return () => { pulseLoop.stop(); spinLoop.stop(); };
  }, [pulse, spin]);

  const isPrimaryAdminEmail = email.trim().toLowerCase() === 'draborneagle@gmail.com';

  const submit = async () => {
    const normalizedPlate = plate.trim().toUpperCase();
    const customerMotorMissing = mode === 'register' && !isPrimaryAdminEmail && registerMode === 'customer'
      && (normalizedPlate.replace(/[^A-Z0-9ÇĞİÖŞÜ]/g, '').length < 5 || !motorcycleBrand.trim() || !motorcycleModel.trim());
    const normalizedTaxNumber = taxNumber.replace(/\D/g, '');
    const businessMissing = mode === 'register' && !isPrimaryAdminEmail && registerMode === 'staff'
      && (!businessName.trim() || !taxOffice.trim() || ![10, 11].includes(normalizedTaxNumber.length));
    if (!email.trim() || password.length < 6 || (mode === 'register' && !fullName.trim()) || customerMotorMissing || businessMissing) {
      Alert.alert(
        'Eksik bilgi',
        customerMotorMissing
          ? 'Kullanıcı hesabı için plaka, motosiklet markası ve modeli zorunludur.'
          : businessMissing
            ? 'İşletme başvurusu için işletme adı, Vergi Dairesi ve 10 veya 11 haneli Vergi Numarası zorunludur.'
            : 'E-posta, en az 6 karakter şifre ve kayıt sırasında ad soyad gereklidir.',
      );
      return;
    }
    setLoading(true);
    const message = mode === 'login'
      ? await signIn(email, password)
      : await signUp(
          fullName,
          phone,
          email,
          password,
          registerMode,
          registerMode === 'customer' && !isPrimaryAdminEmail ? { plate: normalizedPlate, brand: motorcycleBrand, model: motorcycleModel } : undefined,
          registerMode === 'staff' && !isPrimaryAdminEmail ? { business_name: businessName, business_phone: businessPhone || phone, business_address: businessAddress, tax_office: taxOffice, tax_number: normalizedTaxNumber } : undefined,
        );
    setLoading(false);
    if (message) Alert.alert(mode === 'login' ? 'Giriş yapılamadı' : 'Bilgi', message);
  };

  const logoScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.05] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0.7] });
  const ringRotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <PremiumBackground>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={[styles.systemBadge, { backgroundColor: `${colors.green}14`, borderColor: `${colors.green}48` }]}> 
              <Animated.View style={[styles.onlineDot, { backgroundColor: colors.green, opacity: glowOpacity }]} />
              <Text style={[styles.systemText, { color: colors.green }]}>GARAGE OS • v0.8.9 AKILLI SERVİS SİSTEMİ</Text>
            </View>
            <View style={styles.logoStage}>
              <Animated.View pointerEvents="none" style={[styles.logoGlow, { backgroundColor: colors.primary, opacity: glowOpacity, transform: [{ scale: logoScale }] }]} />
              <Animated.View style={[styles.logoRing, { borderColor: `${colors.cyan}78`, transform: [{ rotate: ringRotate }] }]} />
              <Animated.View style={{ transform: [{ scale: logoScale }] }}>
                <LinearGradient colors={[colors.primary, colors.primary2, colors.cyan]} style={styles.logo}>
                  <Ionicons name="construct" size={39} color="#fff" />
                </LinearGradient>
              </Animated.View>
              <Animated.View style={[styles.miniGear, { backgroundColor: colors.cardStrong, borderColor: colors.border, transform: [{ rotate: ringRotate }] }]}><Ionicons name="notifications" size={21} color={colors.orange} /></Animated.View>
            </View>
            <Text style={[styles.brandTitle, { color: colors.text }]}>DraBornGarage</Text>
            <Text style={[styles.brandText, { color: colors.textMuted }]}>Servis, randevu, alacak ve platform hareketlerini canlı bildirimler ve zamanlı hatırlatmalarla tek premium garaj merkezinde buluşturur.</Text>
            <View style={styles.featureRow}>
              <Feature icon="notifications" label="Akıllı Bildirim" color={colors.orange} />
              <Feature icon="construct" label="Canlı Servis" color={colors.green} />
              <Feature icon="calendar" label="Zamanlı Hatırlatma" color={colors.cyan} />
            </View>
          </View>

          <GlassCard style={styles.card}>
            <View style={styles.cardHeader}>
              <View><Text style={[styles.cardEyebrow, { color: colors.primary }]}>GARAJ ERİŞİMİ</Text><Text style={[styles.cardTitle, { color: colors.text }]}>{mode === 'login' ? 'Hesabına bağlan' : 'Yeni hesap oluştur'}</Text></View>
              <View style={[styles.cardHeaderIcon, { backgroundColor: `${colors.orange}16`, borderColor: `${colors.orange}3A` }]}><Ionicons name={mode === 'login' ? 'key' : 'person-add'} size={21} color={colors.orange} /></View>
            </View>

            <View style={[styles.segment, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}> 
              {(['login', 'register'] as const).map((item) => {
                const active = mode === item;
                return <AnimatedPressable key={item} onPress={() => setMode(item)} style={[styles.segmentButton, { borderColor: active ? `${colors.primary}80` : 'transparent' }]}>{active && <LinearGradient colors={[`${colors.primary}E8`, `${colors.primary2}E8`]} style={StyleSheet.absoluteFill} />}<Ionicons name={item === 'login' ? 'log-in' : 'person-add'} size={17} color={active ? '#fff' : colors.textMuted} /><Text style={[styles.segmentText, { color: active ? '#fff' : colors.textMuted }]}>{item === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}</Text></AnimatedPressable>;
              })}
            </View>

            {mode === 'register' && (
              <>
                <Text style={[styles.label, { color: colors.textMuted }]}>HESAP TÜRÜ</Text>
                <View style={styles.accountRow}>
                  <AccountCard active={registerMode === 'customer'} title="Kullanıcı" subtitle="Motor, randevu, servis, bildirim ve Usta başvurusu" icon="motorcycle" accent={colors.cyan} onPress={() => setRegisterMode('customer')} />
                  <AccountCard active={registerMode === 'staff'} title="İşletme Başvurusu" subtitle="Admin onayıyla işletme panelini aç" icon="business" accent={colors.orange} onPress={() => setRegisterMode('staff')} />
                </View>
                <View style={[styles.secureStrip, { backgroundColor: `${colors.green}0D`, borderColor: `${colors.green}30` }]}>
                  <Ionicons name="construct" size={18} color={colors.green} />
                  <Text style={[styles.secureStripText, { color: colors.textMuted }]}>Usta olmak isteyen kullanıcı önce normal hesabını oluşturur; ardından Hesabım ekranından işletmeye başvurur veya Usta davet kodunu girer.</Text>
                </View>
                <FormField label="Ad Soyad" value={fullName} onChangeText={setFullName} placeholder="Örn. Ahmet Yılmaz" autoCapitalize="words" />
                <FormField label="Telefon" value={phone} onChangeText={setPhone} placeholder="05xx xxx xx xx" keyboardType="phone-pad" />
                {registerMode === 'customer' && (
                  <View style={[styles.motorCard, { backgroundColor: `${colors.cyan}0D`, borderColor: `${colors.cyan}38` }]}>
                    <View style={styles.motorHeader}><AnimatedMotorcycleIcon size={28} color={colors.cyan} /><View style={styles.motorCopy}><Text style={[styles.motorTitle, { color: colors.text }]}>Motosiklet bilgileri</Text><Text style={[styles.motorText, { color: colors.textMuted }]}>İşletmenin hesabını ve motosikletini güvenle eşleştirebilmesi için kullanılır.</Text></View></View>
                    <FormField label="Plaka" value={plate} onChangeText={(value) => setPlate(value.toUpperCase())} placeholder="06 ABC 123" autoCapitalize="characters" />
                    <FormField label="Motosiklet Markası" value={motorcycleBrand} onChangeText={setMotorcycleBrand} placeholder="Örn. Honda" autoCapitalize="words" />
                    <FormField label="Motosiklet Modeli" value={motorcycleModel} onChangeText={setMotorcycleModel} placeholder="Örn. Forza 250" autoCapitalize="words" />
                  </View>
                )}
                {registerMode === 'staff' && (
                  <View style={[styles.motorCard, { backgroundColor: `${colors.orange}0D`, borderColor: `${colors.orange}38` }]}>
                    <View style={styles.motorHeader}><Ionicons name="business" size={24} color={colors.orange} /><View style={styles.motorCopy}><Text style={[styles.motorTitle, { color: colors.text }]}>İşletme başvuru bilgileri</Text><Text style={[styles.motorText, { color: colors.textMuted }]}>Hesabın önce kullanıcı olarak açılır. Admin onayından sonra işletme panelin otomatik açılır.</Text></View></View>
                    <FormField label="İşletme Adı" value={businessName} onChangeText={setBusinessName} placeholder="Örn. Çankaya Moto Garage" autoCapitalize="words" />
                    <FormField label="İşletme Telefonu" value={businessPhone} onChangeText={setBusinessPhone} placeholder="05xx xxx xx xx" keyboardType="phone-pad" />
                    <FormField label="İşletme Adresi" value={businessAddress} onChangeText={setBusinessAddress} multiline placeholder="İl, ilçe, mahalle ve açık adres" />
                    <FormField label="Vergi Dairesi" value={taxOffice} onChangeText={setTaxOffice} placeholder="Örn. Çankaya Vergi Dairesi" autoCapitalize="words" />
                    <FormField label="Vergi Numarası" value={taxNumber} onChangeText={(value) => setTaxNumber(value.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={11} placeholder="10 veya 11 hane" />
                  </View>
                )}
              </>
            )}
            <FormField label="E-posta" value={email} onChangeText={setEmail} placeholder="hesap@email.com" keyboardType="email-address" autoCapitalize="none" />
            <FormField label="Şifre" value={password} onChangeText={setPassword} placeholder="En az 6 karakter" secureTextEntry />
            {mode === 'register' && isPrimaryAdminEmail && <View style={[styles.secureStrip, { backgroundColor: `${colors.primary}0D`, borderColor: `${colors.primary}30` }]}><Ionicons name="shield-checkmark" size={17} color={colors.primary} /><Text style={[styles.secureStripText, { color: colors.textMuted }]}>Ana Admin e-postası algılandı. Motor veya işletme başvuru bilgileri zorunlu değildir; hesap doğrudan Admin olarak açılır.</Text></View>}
            <PrimaryButton title={mode === 'login' ? 'Giriş Yap' : isPrimaryAdminEmail ? 'Ana Admin Hesabımı Oluştur' : registerMode === 'customer' ? 'Kullanıcı Hesabımı Oluştur' : 'İşletme Başvurumu Gönder'} onPress={submit} loading={loading} />
            <View style={[styles.secureStrip, { backgroundColor: `${colors.green}0D`, borderColor: `${colors.green}28` }]}><Ionicons name="lock-closed" size={16} color={colors.green} /><Text style={[styles.secureStripText, { color: colors.textMuted }]}>Müşteri motoru yalnız Usta onayı veya güvenli servis doğrulamasıyla işletmeye bağlanır.</Text></View>
          </GlassCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </PremiumBackground>
  );
}

function Feature({ icon, label, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; color: string }) {
  const { colors } = useTheme();
  return <View style={[styles.feature, { backgroundColor: `${color}10`, borderColor: `${color}34` }]}><Ionicons name={icon} size={16} color={color} /><Text style={[styles.featureText, { color: colors.textSoft }]}>{label}</Text></View>;
}

function AccountCard({ active, title, subtitle, icon, accent, onPress }: { active: boolean; title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap | 'motorcycle'; accent: string; onPress: () => void }) {
  const { colors } = useTheme();
  return <AnimatedPressable onPress={onPress} style={[styles.accountCard, { backgroundColor: active ? `${accent}18` : colors.surfaceSoft, borderColor: active ? accent : colors.border }]}>{icon === 'motorcycle' ? <AnimatedMotorcycleIcon size={31} color={accent} /> : <Ionicons name={icon} size={25} color={accent} />}<Text style={[styles.accountTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.accountSub, { color: colors.textMuted }]}>{subtitle}</Text><Ionicons name={active ? 'checkmark-circle' : 'ellipse-outline'} size={21} color={active ? accent : colors.textMuted} /></AnimatedPressable>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingTop: 52, paddingBottom: 42, gap: 20 },
  hero: { alignItems: 'center', gap: 9 }, systemBadge: { minHeight: 30, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 7 }, onlineDot: { width: 7, height: 7, borderRadius: 7 }, systemText: { fontSize: 12, fontWeight: '900', letterSpacing: 1.05 },
  logoStage: { width: 132, height: 132, alignItems: 'center', justifyContent: 'center' }, logoGlow: { position: 'absolute', width: 104, height: 104, borderRadius: 36, shadowOpacity: 0.8, shadowRadius: 30, elevation: 16 }, logoRing: { position: 'absolute', width: 126, height: 126, borderRadius: 63, borderWidth: 1.5, borderStyle: 'dashed' }, logo: { width: 88, height: 88, borderRadius: 29, alignItems: 'center', justifyContent: 'center' }, miniGear: { position: 'absolute', right: 1, bottom: 11, width: 38, height: 38, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  brandTitle: { fontSize: 34, fontWeight: '900', letterSpacing: -1.3 }, brandText: { textAlign: 'center', maxWidth: 350, lineHeight: 20, fontSize: 13 }, featureRow: { width: '100%', flexDirection: 'row', gap: 7, marginTop: 5 }, feature: { flex: 1, minHeight: 42, borderWidth: 1, borderRadius: 14, paddingHorizontal: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }, featureText: { fontSize: 12, fontWeight: '900' },
  card: { gap: 15, paddingTop: 18 }, cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, cardEyebrow: { fontSize: 12, fontWeight: '900', letterSpacing: 1.2 }, cardTitle: { fontSize: 20, fontWeight: '900', marginTop: 3 }, cardHeaderIcon: { width: 43, height: 43, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  segment: { flexDirection: 'row', gap: 6, padding: 5, borderRadius: 17, borderWidth: 1, overflow: 'hidden' }, segmentButton: { flex: 1, minHeight: 46, borderRadius: 13, borderWidth: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 }, segmentText: { fontSize: 13, fontWeight: '900' },
  label: { fontSize: 12, fontWeight: '900', letterSpacing: 0.9 }, motorCard: { borderWidth: 1, borderRadius: 19, padding: 13, gap: 12 }, motorHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 }, motorCopy: { flex: 1 }, motorTitle: { fontSize: 13, fontWeight: '900' }, motorText: { fontSize: 12, lineHeight: 16, marginTop: 2 }, accountRow: { flexDirection: 'row', gap: 9 }, accountCard: { flex: 1, minHeight: 158, borderWidth: 1, borderRadius: 18, padding: 13, gap: 8, alignItems: 'flex-start' }, accountTitle: { fontSize: 14, fontWeight: '900' }, accountSub: { flex: 1, fontSize: 12, lineHeight: 16 },
  secureStrip: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 8 }, secureStripText: { flex: 1, fontSize: 12, lineHeight: 17, textAlign: 'left' },
});
