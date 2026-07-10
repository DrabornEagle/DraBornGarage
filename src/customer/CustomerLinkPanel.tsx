import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { FormField } from '../components/FormField';
import { GlassCard } from '../components/GlassCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { CustomerClaim } from '../types';

type LinkMethod = 'phone' | 'tracking' | 'qr' | 'approval';

const methodLabels: Record<LinkMethod, { title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap }> = {
  phone: { title: 'Plaka + Telefon', subtitle: 'İşletmedeki telefon kaydıyla anında eşleştir.', icon: 'call' },
  tracking: { title: 'Servis Takip Kodu', subtitle: 'Ustanın verdiği 8 haneli kodla bağlan.', icon: 'key' },
  qr: { title: 'QR Bağlantısı', subtitle: 'QR içindeki güvenli bağlantıyı kullan.', icon: 'qr-code' },
  approval: { title: 'Usta Onayı', subtitle: 'Plakayı gönder; işletme onaylasın.', icon: 'shield-checkmark' },
};

function extractToken(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/[?&]token=([0-9a-fA-F-]{36})/);
  return match?.[1] ?? trimmed;
}

export function CustomerLinkPanel({ onLinked }: { onLinked?: () => void }) {
  const { colors } = useTheme();
  const { profile, refreshWorkspace } = useAuth();
  const [method, setMethod] = useState<LinkMethod>('phone');
  const [plate, setPlate] = useState('');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [trackingCode, setTrackingCode] = useState('');
  const [qrValue, setQrValue] = useState('');
  const [claims, setClaims] = useState<CustomerClaim[]>([]);
  const [loading, setLoading] = useState(false);

  const loadClaims = useCallback(async () => {
    const { data } = await supabase.rpc('customer_get_claims');
    setClaims((data as CustomerClaim[] | null) ?? []);
  }, []);

  useEffect(() => { loadClaims(); }, [loadClaims]);

  useEffect(() => {
    const handleUrl = (url?: string | null) => {
      if (!url?.includes('draborngarage://claim')) return;
      const token = extractToken(url);
      if (token.length === 36) {
        setMethod('qr');
        setQrValue(token);
      }
    };
    Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => subscription.remove();
  }, []);

  const pendingClaims = useMemo(() => claims.filter((item) => item.status === 'pending'), [claims]);

  const complete = async (message: string) => {
    await refreshWorkspace();
    await loadClaims();
    onLinked?.();
    Alert.alert('Eşleştirme tamamlandı', message);
  };

  const submit = async () => {
    setLoading(true);
    let result;
    if (method === 'phone') {
      result = await supabase.rpc('customer_claim_by_phone', { p_plate: plate.trim(), p_phone: phone.trim() });
    } else if (method === 'tracking') {
      result = await supabase.rpc('customer_claim_by_tracking_code', { p_code: trackingCode.trim(), p_plate: plate.trim() || null });
    } else if (method === 'qr') {
      result = await supabase.rpc('customer_claim_by_qr', { p_token: extractToken(qrValue) });
    } else {
      result = await supabase.rpc('customer_request_mechanic_approval', { p_plate: plate.trim(), p_phone: phone.trim() || null });
    }
    setLoading(false);

    if (result.error) return Alert.alert('Eşleştirme yapılamadı', result.error.message);
    if (method === 'approval') {
      await loadClaims();
      Alert.alert('Talep gönderildi', 'İşletmedeki yetkili usta onay verdiğinde motorun hesabında görünecek.');
      return;
    }
    await complete('Motorun ve işletme servis kayıtların hesabına güvenli şekilde bağlandı.');
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={[`${colors.primary}28`, `${colors.cyan}10`]} style={[styles.hero, { borderColor: `${colors.primary}40` }]}> 
        <View style={[styles.heroIcon, { backgroundColor: `${colors.primary}25` }]}><Ionicons name="bicycle" size={30} color={colors.primary} /></View>
        <View style={styles.copy}>
          <Text style={[styles.heroTitle, { color: colors.text }]}>Motorunu hesabına bağla</Text>
          <Text style={[styles.heroText, { color: colors.textMuted }]}>Plaka tek başına yeterli değildir. Telefon, servis kodu, QR veya usta onayıyla güvenli eşleştirme yapılır.</Text>
        </View>
      </LinearGradient>

      <View style={styles.methodGrid}>
        {(Object.keys(methodLabels) as LinkMethod[]).map((value) => {
          const item = methodLabels[value];
          const active = method === value;
          return (
            <AnimatedPressable
              key={value}
              onPress={() => setMethod(value)}
              style={[
                styles.methodCard,
                {
                  backgroundColor: active ? `${colors.primary}18` : colors.card,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
            >
              <Ionicons name={item.icon} size={21} color={active ? colors.primary : colors.textMuted} />
              <Text numberOfLines={2} style={[styles.methodTitle, { color: colors.text }]}>{item.title}</Text>
              <Text numberOfLines={2} style={[styles.methodSubtitle, { color: colors.textMuted }]}>{item.subtitle}</Text>
            </AnimatedPressable>
          );
        })}
      </View>

      <GlassCard style={styles.form}>
        {method !== 'qr' && <FormField label="Plaka" value={plate} onChangeText={(value) => setPlate(value.toUpperCase())} placeholder="06 ABC 123" autoCapitalize="characters" />}
        {method === 'phone' && <FormField label="İşletmede kayıtlı telefon" value={phone} onChangeText={setPhone} placeholder="05xx xxx xx xx" keyboardType="phone-pad" />}
        {method === 'tracking' && <FormField label="8 haneli servis takip kodu" value={trackingCode} onChangeText={(value) => setTrackingCode(value.toUpperCase())} placeholder="A1B2C3D4" autoCapitalize="characters" />}
        {method === 'qr' && <FormField label="QR bağlantısı veya token" value={qrValue} onChangeText={setQrValue} placeholder="draborngarage://claim?token=..." multiline />}
        {method === 'approval' && <FormField label="Telefon (opsiyonel)" value={phone} onChangeText={setPhone} placeholder="Ustanın seni tanımasına yardımcı olur" keyboardType="phone-pad" />}
        <PrimaryButton
          title={method === 'approval' ? 'Usta Onayı İste' : 'Motorumu Güvenle Eşleştir'}
          onPress={submit}
          loading={loading}
        />
      </GlassCard>

      {pendingClaims.length > 0 && (
        <GlassCard style={styles.pendingCard}>
          <View style={styles.pendingHeader}><Ionicons name="time" size={20} color={colors.orange} /><Text style={[styles.pendingTitle, { color: colors.text }]}>Onay bekleyen talepler</Text></View>
          {pendingClaims.map((claim) => (
            <View key={claim.id} style={[styles.pendingRow, { borderTopColor: colors.border }]}> 
              <View style={styles.copy}><Text style={[styles.pendingName, { color: colors.text }]}>{claim.brand} {claim.model} • {claim.plate}</Text><Text style={[styles.pendingMeta, { color: colors.textMuted }]}>{claim.workshop_name} • Usta onayı bekleniyor</Text></View>
              <View style={[styles.pendingPill, { backgroundColor: `${colors.orange}18` }]}><Text style={[styles.pendingPillText, { color: colors.orange }]}>BEKLİYOR</Text></View>
            </View>
          ))}
        </GlassCard>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 14 },
  hero: { borderWidth: 1, borderRadius: 24, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 13 },
  heroIcon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  heroTitle: { fontSize: 18, fontWeight: '900' },
  heroText: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  methodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  methodCard: { width: '48.7%', minHeight: 116, borderWidth: 1, borderRadius: 18, padding: 12, gap: 7 },
  methodTitle: { fontSize: 13, fontWeight: '900' },
  methodSubtitle: { fontSize: 10, lineHeight: 14 },
  form: { gap: 13 },
  pendingCard: { gap: 8 },
  pendingHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pendingTitle: { fontSize: 16, fontWeight: '900' },
  pendingRow: { minHeight: 65, borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 10 },
  pendingName: { fontSize: 13, fontWeight: '900' },
  pendingMeta: { fontSize: 10, marginTop: 4 },
  pendingPill: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999 },
  pendingPillText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
});
