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
import { CustomerClaim, WorkshopSearchResult } from '../types';

type Method = 'workshop' | 'qr';

function tokenFrom(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/[?&]token=([0-9a-fA-F-]{36})/);
  return (match?.[1] ?? trimmed).toUpperCase();
}

export function CustomerLinkPanel({ onLinked }: { onLinked?: () => void }) {
  const { colors } = useTheme();
  const { profile, refreshWorkspace, searchWorkshops } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [method, setMethod] = useState<Method>('workshop');
  const [plate, setPlate] = useState(profile?.customer_plate ?? '');
  const [brand, setBrand] = useState(profile?.customer_motorcycle_brand ?? '');
  const [model, setModel] = useState(profile?.customer_motorcycle_model ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [qrOrManualCode, setQrOrManualCode] = useState('');
  const [workshopQuery, setWorkshopQuery] = useState('');
  const [workshopResults, setWorkshopResults] = useState<WorkshopSearchResult[]>([]);
  const [selectedWorkshop, setSelectedWorkshop] = useState<WorkshopSearchResult | null>(null);
  const [claims, setClaims] = useState<CustomerClaim[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [scanner, setScanner] = useState(false);
  const [locked, setLocked] = useState(false);

  const loadClaims = useCallback(async () => {
    const { data } = await supabase.rpc('customer_get_claims');
    setClaims((data as CustomerClaim[] | null) ?? []);
  }, []);

  useEffect(() => { loadClaims(); }, [loadClaims]);
  useEffect(() => {
    const handle = (url?: string | null) => {
      if (url?.includes('draborngarage://claim')) { setMethod('qr'); setQrOrManualCode(url); }
    };
    Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener('url', ({ url }) => handle(url));
    return () => sub.remove();
  }, []);

  const pending = useMemo(() => claims.filter((item) => item.status === 'pending'), [claims]);

  const runWorkshopSearch = async () => {
    if (workshopQuery.trim().length < 2) return Alert.alert('İşletme adı gerekli', 'Arama için en az 2 karakter yaz.');
    setSearching(true);
    const result = await searchWorkshops(workshopQuery);
    setSearching(false);
    if (result.error) return Alert.alert('İşletmeler aranamadı', result.error);
    setWorkshopResults(result.data);
    if (result.data.length === 0) setSelectedWorkshop(null);
  };

  const openScanner = async () => {
    const result = permission?.granted ? permission : await requestPermission();
    if (!result?.granted) return Alert.alert('Kamera izni gerekli', 'Servis QR kodunu taramak için kamera izni ver.');
    setLocked(false); setScanner(true);
  };

  const submit = async () => {
    const normalizedPlate = plate.trim().toUpperCase();
    if (method !== 'qr' && normalizedPlate.replace(/[^A-Za-z0-9ÇĞİÖŞÜçğıöşü]/g, '').length < 5) return Alert.alert('Geçerli plaka gir');
    if (method === 'workshop' && !selectedWorkshop) return Alert.alert('İşletme seç', 'Motorunu bağlamak istediğin işletmeyi arayıp seç.');
    if (method === 'workshop' && (!brand.trim() || !model.trim())) return Alert.alert('Motor bilgileri eksik', 'Motosiklet marka ve modelini gir.');
    if (method === 'qr' && tokenFrom(qrOrManualCode).length < 6) return Alert.alert('Kod gerekli', 'QR kodu tara veya manuel servis kodunu yaz.');

    setLoading(true);
    const result = method === 'qr'
      ? await supabase.rpc('customer_claim_by_qr', { p_token: tokenFrom(qrOrManualCode) })
      : await supabase.rpc('customer_request_workshop_motor_link', {
          p_workshop_id: selectedWorkshop!.id,
          p_plate: normalizedPlate,
          p_brand: brand.trim(),
          p_model: model.trim(),
          p_phone: phone.trim() || null,
        });
    setLoading(false);

    if (result.error) return Alert.alert('Eşleştirme yapılamadı', result.error.message);
    if (method === 'workshop') {
      await loadClaims();
      return Alert.alert('Talep işletmeye gönderildi', `${selectedWorkshop!.name} onayladığında motor hesabına bağlanacak.`);
    }
    await refreshWorkspace(); await loadClaims(); onLinked?.();
    Alert.alert('Motor bağlandı', 'Motor, servis geçmişi ve işletme bağlantısı hesabına açıldı.');
  };

  return (
    <View style={styles.root}>
      <GlassCard style={styles.hero}>
        <View style={[styles.heroIcon, { backgroundColor: `${colors.primary}18` }]}><Ionicons name="shield-checkmark" size={28} color={colors.primary} /></View>
        <View style={styles.copy}><Text style={[styles.heroTitle, { color: colors.text }]}>Motorunu işletmeye bağla</Text><Text style={[styles.heroText, { color: colors.textMuted }]}>İşletmeyi adına göre ara, motor bilgilerini doğrula ve Usta onayına gönder. Randevu almak için bu bağlantının tamamlanmasını beklemen gerekmez.</Text></View>
      </GlassCard>

      <View style={styles.methods}>
        {([
          ['workshop', 'İşletme Ara', 'İşletmeyi adına göre bul ve Usta onayına gönder', 'search'],
          ['qr', 'QR / Manuel Kod', 'Servis kartını tara veya güvenli kodu elle gir', 'qr-code'],
        ] as [Method, string, string, keyof typeof Ionicons.glyphMap][]).map(([value, label, subtitle, icon]) => {
          const active = method === value;
          const accent = value === 'workshop' ? colors.cyan : colors.primary;
          return <AnimatedPressable key={value} onPress={() => setMethod(value)} style={[styles.method, { backgroundColor: active ? `${accent}14` : colors.card, borderColor: active ? accent : colors.border }]}>
            <View style={[styles.methodIcon, { backgroundColor: `${accent}16`, borderColor: `${accent}38` }]}><Ionicons name={icon} size={24} color={accent} /></View>
            <View style={styles.copy}><Text style={[styles.methodText, { color: colors.text }]}>{label}</Text><Text style={[styles.methodSub, { color: colors.textMuted }]}>{subtitle}</Text></View>
            <Ionicons name={active ? 'checkmark-circle' : 'chevron-forward'} size={22} color={active ? accent : colors.textMuted} />
          </AnimatedPressable>;
        })}
      </View>

      <GlassCard style={styles.form}>
        {method === 'workshop' && <>
          <FormField label="İşletme adı" value={workshopQuery} onChangeText={setWorkshopQuery} placeholder="Örn. Ankara Merkez Garage" autoCapitalize="words" />
          <PrimaryButton title="İşletmeleri Ara" onPress={runWorkshopSearch} loading={searching} secondary />
          {workshopResults.length > 0 && <View style={styles.results}>{workshopResults.map((item) => {
            const active = selectedWorkshop?.id === item.id;
            return <AnimatedPressable key={item.id} onPress={() => setSelectedWorkshop(item)} style={[styles.result, { backgroundColor: active ? `${colors.green}14` : colors.surfaceSoft, borderColor: active ? colors.green : colors.border }]}><View style={[styles.resultIcon, { backgroundColor: `${active ? colors.green : colors.primary}16` }]}><Ionicons name="business" size={22} color={active ? colors.green : colors.primary} /></View><View style={styles.copy}><Text style={[styles.resultTitle, { color: colors.text }]}>{item.name}</Text><Text style={[styles.resultMeta, { color: colors.textMuted }]}>{item.address || 'Adres eklenmedi'}</Text></View><Ionicons name={active ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={active ? colors.green : colors.textMuted} /></AnimatedPressable>;
          })}</View>}
          {selectedWorkshop && <View style={[styles.selected, { backgroundColor: `${colors.green}0D`, borderColor: `${colors.green}35` }]}><Ionicons name="checkmark-circle" size={20} color={colors.green} /><Text style={[styles.selectedText, { color: colors.text }]}>{selectedWorkshop.name} seçildi</Text></View>}
          <FormField label="Plaka" value={plate} onChangeText={(v) => setPlate(v.toUpperCase())} placeholder="06 ABC 123" autoCapitalize="characters" />
          <FormField label="Motosiklet markası" value={brand} onChangeText={setBrand} placeholder="Örn. Honda" autoCapitalize="words" />
          <FormField label="Motosiklet modeli" value={model} onChangeText={setModel} placeholder="Örn. Forza 250" autoCapitalize="words" />
          <FormField label="Telefon" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="05xx xxx xx xx" />
        </>}
        {method === 'qr' && <>
          <AnimatedPressable onPress={openScanner} style={[styles.scan, { backgroundColor: `${colors.cyan}12`, borderColor: `${colors.cyan}42` }]}><Ionicons name="scan" size={25} color={colors.cyan} /><View style={styles.copy}><Text style={[styles.scanTitle, { color: colors.text }]}>Kamerayla QR Tara</Text><Text style={[styles.scanText, { color: colors.textMuted }]}>Servis kartındaki QR kodu okut.</Text></View></AnimatedPressable>
          <View style={[styles.orRow, { borderColor: colors.border }]}><Text style={[styles.orText, { color: colors.textMuted }]}>VEYA</Text></View>
          <FormField label="Manuel servis / eşleştirme kodu" value={qrOrManualCode} onChangeText={(value) => setQrOrManualCode(value.toUpperCase())} placeholder="Örn. A7K9P2Q4" autoCapitalize="characters" />
          <Text style={[styles.scanText, { color: colors.textMuted }]}>QR bağlantısının tamamını da bu alana yapıştırabilirsin.</Text>
        </>}
        <PrimaryButton title={method === 'workshop' ? 'İşletmeye Onay Talebi Gönder' : 'Motorumu Eşleştir'} onPress={submit} loading={loading} />
      </GlassCard>

      {pending.length > 0 && <GlassCard><Text style={[styles.pendingTitle, { color: colors.text }]}>Onay bekleyen talepler</Text>{pending.map((item) => <View key={item.id} style={[styles.pendingRow, { borderTopColor: colors.border }]}><View style={styles.copy}><Text style={[styles.pendingName, { color: colors.text }]}>{item.brand} {item.model} • {item.plate}</Text><Text style={[styles.pendingMeta, { color: colors.textMuted }]}>{item.workshop_name}</Text></View><Text style={[styles.pendingBadge, { color: colors.orange }]}>BEKLİYOR</Text></View>)}</GlassCard>}

      <Modal visible={scanner} animationType="slide" transparent onRequestClose={() => setScanner(false)}>
        <View style={styles.modal}><View style={[styles.scannerCard, { backgroundColor: colors.cardStrong }]}><View style={styles.scannerHeader}><Text style={[styles.scannerTitle, { color: colors.text }]}>Servis QR Kodunu Tara</Text><AnimatedPressable onPress={() => setScanner(false)}><Ionicons name="close-circle" size={32} color={colors.text} /></AnimatedPressable></View><View style={styles.camera}><CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={locked ? undefined : ({ data }) => { setLocked(true); setQrOrManualCode(data); setMethod('qr'); setScanner(false); }} /><View pointerEvents="none" style={[styles.frame, { borderColor: colors.cyan }]} /></View></View></View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 14 }, hero: { flexDirection: 'row', alignItems: 'center', gap: 12 }, heroIcon: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1, minWidth: 0 }, heroTitle: { fontSize: 17, fontWeight: '900' }, heroText: { fontSize: 12.5, lineHeight: 18, marginTop: 4 }, methods: { gap: 9 }, method: { width: '100%', minHeight: 84, borderWidth: 1, borderRadius: 19, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11 }, methodIcon: { width: 48, height: 48, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, methodText: { fontSize: 14.5, fontWeight: '900' }, methodSub: { fontSize: 11.5, lineHeight: 15, marginTop: 4 }, form: { gap: 13 }, results: { gap: 8 }, result: { minHeight: 68, borderWidth: 1, borderRadius: 16, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 9 }, resultIcon: { width: 43, height: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, resultTitle: { fontSize: 14, fontWeight: '900' }, resultMeta: { fontSize: 12, lineHeight: 16, marginTop: 3 }, selected: { minHeight: 46, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }, selectedText: { fontSize: 13, fontWeight: '900' }, scan: { minHeight: 70, borderWidth: 1, borderRadius: 17, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }, scanTitle: { fontSize: 13.5, fontWeight: '900' }, scanText: { fontSize: 12, lineHeight: 17, marginTop: 3 }, orRow: { borderTopWidth: 1, alignItems: 'center', marginVertical: 2 }, orText: { marginTop: -9, paddingHorizontal: 10, fontSize: 11, fontWeight: '900' }, pendingTitle: { fontSize: 15, fontWeight: '900' }, pendingRow: { minHeight: 60, borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }, pendingName: { fontSize: 13, fontWeight: '900' }, pendingMeta: { fontSize: 12, marginTop: 3 }, pendingBadge: { fontSize: 10, fontWeight: '900' }, modal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' }, scannerCard: { padding: 18, paddingBottom: 34, borderTopLeftRadius: 28, borderTopRightRadius: 28, gap: 15 }, scannerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, scannerTitle: { fontSize: 19, fontWeight: '900' }, camera: { height: 380, borderRadius: 24, overflow: 'hidden' }, frame: { position: 'absolute', width: 230, height: 230, borderWidth: 4, borderRadius: 24, left: '50%', top: '50%', marginLeft: -115, marginTop: -115 },
});
