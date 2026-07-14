import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { AnimatedPressable } from './AnimatedPressable';
import { FormField } from './FormField';
import { GlassCard } from './GlassCard';
import { PrimaryButton } from './PrimaryButton';

interface ReadyPaymentSettingsPayload {
  enabled?: boolean;
  bank_name?: string | null;
  account_holder?: string | null;
  iban?: string | null;
}

function normalizeIban(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 26);
}

function displayIban(value: string) {
  return normalizeIban(value).replace(/(.{4})/g, '$1 ').trim();
}

export function ReadyPaymentSettings() {
  const { colors } = useTheme();
  const { workshop, membership, profile } = useAuth();
  const canConfigure = membership?.role === 'mechanic' || membership?.role === 'owner_mechanic';
  const [enabled, setEnabled] = useState(false);
  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [iban, setIban] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!workshop?.id || !canConfigure) return;
    setLoading(true);
    const { data, error } = await supabase.rpc('staff_get_ready_payment_details', { p_workshop_id: workshop.id });
    setLoading(false);
    if (error) {
      Alert.alert('IBAN bilgileri alınamadı', error.message);
      return;
    }
    const payload = (data as ReadyPaymentSettingsPayload | null) ?? {};
    setEnabled(Boolean(payload.enabled));
    setBankName(payload.bank_name ?? '');
    setAccountHolder(payload.account_holder ?? profile?.full_name ?? '');
    setIban(payload.iban ?? '');
  }, [workshop?.id, canConfigure, profile?.full_name]);

  useEffect(() => { load(); }, [load]);

  if (!canConfigure) return null;

  const save = async () => {
    if (!workshop?.id) return;
    const normalized = normalizeIban(iban);
    if (enabled && (!bankName.trim() || !accountHolder.trim() || !/^TR\d{24}$/.test(normalized))) {
      Alert.alert('Eksik veya hatalı bilgi', 'Gösterim açıkken banka adı, hesap sahibi ve TR ile başlayan 26 karakterli geçerli IBAN zorunludur.');
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.rpc('staff_update_ready_payment_details', {
      p_workshop_id: workshop.id,
      p_enabled: enabled,
      p_bank_name: bankName.trim() || null,
      p_account_holder: accountHolder.trim() || null,
      p_iban: normalized || null,
    });
    setSaving(false);
    if (error) {
      Alert.alert('IBAN bilgileri kaydedilemedi', error.message);
      return;
    }
    const payload = (data as ReadyPaymentSettingsPayload | null) ?? {};
    setEnabled(Boolean(payload.enabled));
    setBankName(payload.bank_name ?? '');
    setAccountHolder(payload.account_holder ?? '');
    setIban(payload.iban ?? '');
    Alert.alert('Kaydedildi', enabled
      ? 'Motor Hazır durumundaki müşteriler bu IBAN bilgisini servis detayında görebilecek.'
      : 'IBAN bilgisi müşterilere gösterilmeyecek.');
  };

  return (
    <View style={styles.stack}>
      <GlassCard style={[styles.hero, { borderColor: `${colors.green}42` }]}>
        <View style={[styles.heroIcon, { backgroundColor: `${colors.green}16` }]}>
          <Ionicons name="card" size={27} color={colors.green} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: colors.text }]}>Motor Hazır IBAN Bilgisi</Text>
          <Text style={[styles.body, { color: colors.textMuted }]}>Yalnız sana atanmış servis Motor Hazır olduğunda müşteriye gösterilir. DraBornGarage para transferi yapmaz ve banka hesabına bağlanmaz.</Text>
        </View>
      </GlassCard>

      <AnimatedPressable
        accessibilityRole="switch"
        accessibilityState={{ checked: enabled }}
        onPress={() => setEnabled((value) => !value)}
        style={[styles.toggleCard, { backgroundColor: enabled ? `${colors.green}12` : colors.card, borderColor: enabled ? colors.green : colors.border }]}
      >
        <View style={[styles.toggleIcon, { backgroundColor: enabled ? `${colors.green}20` : colors.surfaceSoft }]}>
          <Ionicons name={enabled ? 'eye' : 'eye-off'} size={23} color={enabled ? colors.green : colors.textMuted} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.toggleTitle, { color: colors.text }]}>Müşteriye göster</Text>
          <Text style={[styles.toggleText, { color: colors.textMuted }]}>{enabled ? 'Motor Hazır servislerinde aktif' : 'IBAN müşterilerden gizli'}</Text>
        </View>
        <View style={[styles.switchTrack, { backgroundColor: enabled ? colors.green : colors.surfaceSoft, borderColor: enabled ? colors.green : colors.border }]}>
          <View style={[styles.switchThumb, { backgroundColor: '#fff', transform: [{ translateX: enabled ? 18 : 0 }] }]} />
        </View>
      </AnimatedPressable>

      <GlassCard style={styles.form}>
        <FormField label="Banka Adı" value={bankName} onChangeText={setBankName} placeholder="Örn. Ziraat Bankası" autoCapitalize="words" />
        <FormField label="Hesap Sahibi" value={accountHolder} onChangeText={setAccountHolder} placeholder="Ad Soyad" autoCapitalize="words" />
        <FormField label="IBAN" value={displayIban(iban)} onChangeText={(value) => setIban(normalizeIban(value))} placeholder="TR00 0000 0000 0000 0000 0000 00" autoCapitalize="characters" maxLength={32} />
        <View style={[styles.notice, { backgroundColor: `${colors.cyan}0D`, borderColor: `${colors.cyan}32` }]}>
          <Ionicons name="information-circle" size={20} color={colors.cyan} />
          <Text style={[styles.noticeText, { color: colors.textMuted }]}>Müşteri transferi kendi banka uygulamasından yapar. DraBornGarage kart işlemez, para tutmaz ve otomatik ödeme göndermez.</Text>
        </View>
        <PrimaryButton title="IBAN Ayarlarını Kaydet" onPress={save} loading={saving || loading} />
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 11 },
  hero: { borderWidth: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  heroIcon: { width: 52, height: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, fontWeight: '900' },
  body: { fontSize: 12, lineHeight: 17, marginTop: 4 },
  toggleCard: { minHeight: 76, borderWidth: 1, borderRadius: 20, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  toggleIcon: { width: 47, height: 47, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  toggleTitle: { fontSize: 14, fontWeight: '900' },
  toggleText: { fontSize: 11.5, marginTop: 4 },
  switchTrack: { width: 47, height: 28, borderRadius: 15, borderWidth: 1, padding: 3 },
  switchThumb: { width: 20, height: 20, borderRadius: 10 },
  form: { gap: 12 },
  notice: { borderWidth: 1, borderRadius: 15, padding: 11, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  noticeText: { flex: 1, fontSize: 11.5, lineHeight: 16 },
});
