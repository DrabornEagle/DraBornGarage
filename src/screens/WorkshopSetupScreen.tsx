import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { FormField } from '../components/FormField';
import { GlassCard } from '../components/GlassCard';
import { PremiumBackground } from '../components/PremiumBackground';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export function WorkshopSetupScreen() {
  const { colors } = useTheme();
  const { profile, createWorkshop, joinWorkshop, signOut } = useAuth();
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (mode === 'create' && !name.trim()) return Alert.alert('İşletme adı gerekli');
    if (mode === 'join' && code.trim().length < 6) return Alert.alert('Geçerli bir davet kodu gir');
    setLoading(true);
    const error = mode === 'create' ? await createWorkshop(name, phone, address) : await joinWorkshop(code);
    setLoading(false);
    if (error) Alert.alert('İşlem tamamlanamadı', error);
  };

  return (
    <PremiumBackground>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.topRow}>
            <View>
              <Text style={[styles.hello, { color: colors.primary }]}>HOŞ GELDİN</Text>
              <Text style={[styles.title, { color: colors.text }]}>{profile?.full_name || 'Usta'}</Text>
            </View>
            <AnimatedPressable onPress={signOut} style={[styles.logout, { backgroundColor: colors.cardStrong, borderColor: colors.border }]}> 
              <Ionicons name="log-out-outline" size={21} color={colors.textMuted} />
            </AnimatedPressable>
          </View>

          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Yeni bir motosiklet servisi oluştur veya sana gönderilen ekip davet koduyla mevcut işletmeye katıl.</Text>

          <View style={styles.choiceRow}>
            <ChoiceCard active={mode === 'create'} icon="business" title="İşletme oluştur" text="İlk sahibi ol, ekibini sonra davet et." onPress={() => setMode('create')} />
            <ChoiceCard active={mode === 'join'} icon="people" title="Ekibe katıl" text="Usta veya ortak sahibi davet koduyla katıl." onPress={() => setMode('join')} />
          </View>

          <GlassCard style={styles.form}>
            {mode === 'create' ? (
              <>
                <FormField label="İşletme adı" value={name} onChangeText={setName} placeholder="DraBorn Motor Garage" />
                <FormField label="Telefon" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="İşletme telefonu" />
                <FormField label="Adres" value={address} onChangeText={setAddress} placeholder="İlçe, mahalle, açık adres" multiline />
                <PrimaryButton title="Garajımı Oluştur" onPress={submit} loading={loading} />
              </>
            ) : (
              <>
                <FormField label="Davet kodu" value={code} onChangeText={(value) => setCode(value.toUpperCase())} autoCapitalize="characters" placeholder="Örn. A7F3K9P2" />
                <Text style={[styles.help, { color: colors.textMuted }]}>Kod rolünü belirler: usta kodu özel Usta Paneli, ortak sahibi kodu İşletme Sahibi Paneli açar.</Text>
                <PrimaryButton title="İşletmeye Katıl" onPress={submit} loading={loading} />
              </>
            )}
          </GlassCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </PremiumBackground>
  );
}

function ChoiceCard({ active, icon, title, text, onPress }: { active: boolean; icon: keyof typeof Ionicons.glyphMap; title: string; text: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <AnimatedPressable onPress={onPress} style={[styles.choice, { backgroundColor: active ? `${colors.primary}20` : colors.card, borderColor: active ? colors.primary : colors.border }]}> 
      <Ionicons name={icon} size={25} color={active ? colors.primary : colors.textMuted} />
      <Text style={[styles.choiceTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.choiceText, { color: colors.textMuted }]}>{text}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, padding: 22, paddingTop: 58, paddingBottom: 40, gap: 20 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hello: { fontSize: 12, fontWeight: '900', letterSpacing: 1.4 },
  title: { fontSize: 30, fontWeight: '900', letterSpacing: -1 },
  logout: { width: 46, height: 46, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  subtitle: { fontSize: 15, lineHeight: 22 },
  choiceRow: { flexDirection: 'row', gap: 12 },
  choice: { flex: 1, borderWidth: 1, borderRadius: 22, padding: 16, minHeight: 155, gap: 10 },
  choiceTitle: { fontSize: 16, fontWeight: '900' },
  choiceText: { fontSize: 12, lineHeight: 17 },
  form: { gap: 16 },
  help: { fontSize: 13, lineHeight: 19 },
});
