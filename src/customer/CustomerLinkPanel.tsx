import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Modal, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { FormField } from '../components/FormField';
import { GlassCard } from '../components/GlassCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { CustomerClaim } from '../types';

type Method = 'phone' | 'tracking' | 'qr' | 'approval';

function tokenFrom(value: string) {
  const match = value.trim().match(/[?&]token=([0-9a-fA-F-]{36})/);
  return match?.[1] ?? value.trim();
}

export function CustomerLinkPanel({ onLinked }: { onLinked?: () => void }) {
  const { colors } = useTheme();
  const { profile, refreshWorkspace } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [method, setMethod] = useState<Method>('phone');
  const [plate, setPlate] = useState('');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [code, setCode] = useState('');
  const [qr, setQr] = useState('');
  const [claims, setClaims] = useState<CustomerClaim[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanner, setScanner] = useState(false);
  const [locked, setLocked] = useState(false);

  const loadClaims = useCallback(async () => {
    const { data } = await supabase.rpc('customer_get_claims');
    setClaims((data as CustomerClaim[] | null) ?? []);
  }, []);

  useEffect(() => { loadClaims(); }, [loadClaims]);
  useEffect(() => {
    const handle = (url?: string | null) => {
      if (url?.includes('draborngarage://claim')) { setMethod('qr'); setQr(url); }
    };
    Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener('url', ({ url }) => handle(url));
    return () => sub.remove();
  }, []);

  const pending = useMemo(() => claims.filter((item) => item.status === 'pending'), [claims]);

  const openScanner = async () => {
    const result = permission?.granted ? permission : await requestPermission();
    if (!result?.granted) return Alert.alert('Kamera izni gerekli', 'Servis QR kodunu taramak için kamera izni ver.');
    setLocked(false); setScanner(true);
  };

  const submit = async () => {
    setLoading(true);
    const result = method === 'phone'
      ? await supabase.rpc('customer_claim_by_phone', { p_plate: plate.trim(), p_phone: phone.trim() })
      : method === 'tracking'
        ? await supabase.rpc('customer_claim_by_tracking_code', { p_code: code.trim(), p_plate: plate.trim() || null })
        : method === 'qr'
          ? await supabase.rpc('customer_claim_by_qr', { p_token: tokenFrom(qr) })
          : await supabase.rpc('customer_request_mechanic_approval', { p_plate: plate.trim(), p_phone: phone.trim() || null });
    setLoading(false);
    if (result.error) return Alert.alert('Eşleştirme yapılamadı', result.error.message);
    if (method === 'approval') { await loadClaims(); return Alert.alert('Talep gönderildi', 'Usta onayladığında motor hesabında görünecek.'); }
    await refreshWorkspace(); await loadClaims(); onLinked?.();
    Alert.alert('Motor bağlandı', 'Motor, servis geçmişi ve randevu sistemi hesabına açıldı.');
  };

  return (
    <View style={styles.root}>
      <GlassCard style={styles.hero}>
        <View style={[styles.heroIcon, { backgroundColor: `${colors.primary}18` }]}><Ionicons name="shield-checkmark" size={28} color={colors.primary} /></View>
        <View style={styles.copy}><Text style={[styles.heroTitle, { color: colors.text }]}>Motorunu güvenle bağla</Text><Text style={[styles.heroText, { color: colors.textMuted }]}>Plaka tek başına yeterli değildir. Telefon, servis kodu, QR veya usta onayı gerekir.</Text></View>
      </GlassCard>

      <View style={styles.methods}>
        {([
          ['phone', 'Plaka + Telefon', 'call'],
          ['tracking', 'Takip Kodu', 'key'],
          ['qr', 'QR Tara', 'qr-code'],
          ['approval', 'Usta Onayı', 'person-circle'],
        ] as [Method, string, keyof typeof Ionicons.glyphMap][]).map(([value, label, icon]) => (
          <AnimatedPressable key={value} onPress={() => setMethod(value)} style={[styles.method, { backgroundColor: method === value ? `${colors.primary}18` : colors.card, borderColor: method === value ? colors.primary : colors.border }]}><Ionicons name={icon} size={21} color={method === value ? colors.primary : colors.textMuted} /><Text style={[styles.methodText, { color: colors.text }]}>{label}</Text></AnimatedPressable>
        ))}
      </View>

      <GlassCard style={styles.form}>
        {method !== 'qr' && <FormField label="Plaka" value={plate} onChangeText={(v) => setPlate(v.toUpperCase())} placeholder="06 ABC 123" autoCapitalize="characters" />}
        {method === 'phone' && <FormField label="İşletmede kayıtlı telefon" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />}
        {method === 'tracking' && <FormField label="8 haneli servis takip kodu" value={code} onChangeText={(v) => setCode(v.toUpperCase())} autoCapitalize="characters" />}
        {method === 'approval' && <FormField label="Telefon (opsiyonel)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />}
        {method === 'qr' && <><AnimatedPressable onPress={openScanner} style={[styles.scan, { backgroundColor: `${colors.cyan}12`, borderColor: `${colors.cyan}42` }]}><Ionicons name="scan" size={25} color={colors.cyan} /><View style={styles.copy}><Text style={[styles.scanTitle, { color: colors.text }]}>Kamerayla QR Tara</Text><Text style={[styles.scanText, { color: colors.textMuted }]}>Ustanın servis kartındaki QR kodu okut.</Text></View></AnimatedPressable><FormField label="QR bağlantısı" value={qr} onChangeText={setQr} multiline /></>}
        <PrimaryButton title={method === 'approval' ? 'Usta Onayı İste' : 'Motorumu Eşleştir'} onPress={submit} loading={loading} />
      </GlassCard>

      {pending.length > 0 && <GlassCard><Text style={[styles.pendingTitle, { color: colors.text }]}>Onay bekleyen talepler</Text>{pending.map((item) => <View key={item.id} style={[styles.pendingRow, { borderTopColor: colors.border }]}><View style={styles.copy}><Text style={[styles.pendingName, { color: colors.text }]}>{item.brand} {item.model} • {item.plate}</Text><Text style={[styles.pendingMeta, { color: colors.textMuted }]}>{item.workshop_name}</Text></View><Text style={[styles.pendingBadge, { color: colors.orange }]}>BEKLİYOR</Text></View>)}</GlassCard>}

      <Modal visible={scanner} animationType="slide" transparent onRequestClose={() => setScanner(false)}>
        <View style={styles.modal}><View style={[styles.scannerCard, { backgroundColor: colors.cardStrong }]}><View style={styles.scannerHeader}><Text style={[styles.scannerTitle, { color: colors.text }]}>Servis QR Kodunu Tara</Text><AnimatedPressable onPress={() => setScanner(false)}><Ionicons name="close-circle" size={32} color={colors.text} /></AnimatedPressable></View><View style={styles.camera}><CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={locked ? undefined : ({ data }) => { setLocked(true); const token = tokenFrom(data); if (token.length !== 36) { Alert.alert('Geçersiz QR', 'Bu kod DraBornGarage servis bağlantısı değil.', [{ text: 'Tekrar Tara', onPress: () => setLocked(false) }]); return; } setQr(data); setMethod('qr'); setScanner(false); }} /><View pointerEvents="none" style={[styles.frame, { borderColor: colors.cyan }]} /></View></View></View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 14 }, hero: { flexDirection: 'row', alignItems: 'center', gap: 12 }, heroIcon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1, minWidth: 0 }, heroTitle: { fontSize: 17, fontWeight: '900' }, heroText: { fontSize: 11, lineHeight: 17, marginTop: 4 }, methods: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, method: { width: '48.7%', minHeight: 64, borderWidth: 1, borderRadius: 17, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 8 }, methodText: { flex: 1, fontSize: 11, fontWeight: '900' }, form: { gap: 13 }, scan: { minHeight: 70, borderWidth: 1, borderRadius: 17, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }, scanTitle: { fontSize: 13, fontWeight: '900' }, scanText: { fontSize: 10, marginTop: 3 }, pendingTitle: { fontSize: 15, fontWeight: '900' }, pendingRow: { minHeight: 60, borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }, pendingName: { fontSize: 12, fontWeight: '900' }, pendingMeta: { fontSize: 10, marginTop: 3 }, pendingBadge: { fontSize: 8, fontWeight: '900' }, modal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' }, scannerCard: { padding: 18, paddingBottom: 34, borderTopLeftRadius: 28, borderTopRightRadius: 28, gap: 15 }, scannerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, scannerTitle: { fontSize: 19, fontWeight: '900' }, camera: { height: 380, borderRadius: 24, overflow: 'hidden' }, frame: { position: 'absolute', width: 230, height: 230, borderWidth: 4, borderRadius: 24, left: '50%', top: '50%', marginLeft: -115, marginTop: -115 },
});
