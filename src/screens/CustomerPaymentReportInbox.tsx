import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { FormField } from '../components/FormField';
import { GlassCard } from '../components/GlassCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { money } from '../lib/format';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../notifications/NotificationContext';

interface CustomerPaymentReportItem {
  id: string;
  work_order_id: string;
  customer_name: string;
  brand: string;
  model: string;
  plate?: string | null;
  amount: number;
  customer_note?: string | null;
  created_at: string;
  remaining_amount: number;
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value));
}

export function CustomerPaymentReportInbox() {
  const { colors } = useTheme();
  const { workshop, membership } = useAuth();
  const { refresh: refreshNotifications } = useNotifications();
  const canReview = membership?.role === 'mechanic' || membership?.role === 'owner_mechanic';
  const [items, setItems] = useState<CustomerPaymentReportItem[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!workshop?.id || !canReview) {
      setItems([]);
      return;
    }
    const { data, error } = await supabase.rpc('staff_get_pending_customer_payment_reports', {
      p_workshop_id: workshop.id,
    });
    if (error) {
      Alert.alert('Ödeme bildirimleri alınamadı', error.message);
      return;
    }
    setItems((data as CustomerPaymentReportItem[] | null) ?? []);
  }, [workshop?.id, canReview]);

  useEffect(() => { load(); }, [load]);

  if (!canReview || items.length === 0) return null;

  const review = (item: CustomerPaymentReportItem, approve: boolean) => {
    Alert.alert(
      approve ? 'Ödemeyi onayla' : 'Ödeme bildirimini reddet',
      approve
        ? `${item.customer_name} tarafından bildirilen ${money(item.amount)} tahsilat olarak kaydedilecek. Kalan borç buna göre güncellenecek.`
        : 'Borç değişmeyecek. Müşteriye bildirimin onaylanmadığı iletilecek.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: approve ? 'Onayla ve Kaydet' : 'Reddet',
          style: approve ? 'default' : 'destructive',
          onPress: async () => {
            setLoadingId(item.id);
            const { data, error } = await supabase.rpc('staff_review_customer_payment_report', {
              p_report_id: item.id,
              p_approve: approve,
              p_note: notes[item.id]?.trim() || null,
            });
            setLoadingId(null);
            if (error) {
              Alert.alert('İşlem tamamlanamadı', error.message);
              return;
            }
            const result = data as { remaining_amount?: number } | null;
            setNotes((current) => ({ ...current, [item.id]: '' }));
            await load();
            await refreshNotifications();
            Alert.alert(
              approve ? 'Ödeme onaylandı' : 'Bildirim reddedildi',
              approve
                ? `Tahsilat kaydedildi. Güncel kalan: ${money(Number(result?.remaining_amount ?? 0))}`
                : 'Müşteriye ödeme bildiriminin onaylanmadığı gönderildi.',
            );
          },
        },
      ],
    );
  };

  return (
    <View style={styles.root}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: `${colors.orange}18` }]}>
          <Ionicons name="notifications" size={23} color={colors.orange} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Müşteri Ödeme Bildirimleri</Text>
          <Text style={[styles.sectionSub, { color: colors.textMuted }]}>{items.length} IBAN ödemesi Usta onayı bekliyor</Text>
        </View>
        <AnimatedPressable onPress={load} style={[styles.refresh, { borderColor: colors.border }]}>
          <Ionicons name="refresh" size={19} color={colors.cyan} />
        </AnimatedPressable>
      </View>

      {items.map((item) => (
        <GlassCard key={item.id} style={[styles.card, { borderColor: `${colors.orange}55` }]}>
          <View style={styles.top}>
            <View style={[styles.icon, { backgroundColor: `${colors.orange}18` }]}>
              <Ionicons name="card" size={23} color={colors.orange} />
            </View>
            <View style={styles.copy}>
              <Text style={[styles.title, { color: colors.text }]}>{item.customer_name}</Text>
              <Text style={[styles.meta, { color: colors.textMuted }]}>{item.brand} {item.model} • {item.plate || 'Plaka yok'}</Text>
              <Text style={[styles.meta, { color: colors.textMuted }]}>{dateTime(item.created_at)}</Text>
            </View>
            <Text style={[styles.amount, { color: colors.green }]}>{money(item.amount)}</Text>
          </View>

          <View style={[styles.remainingBox, { backgroundColor: colors.surfaceSoft }]}>
            <Text style={[styles.remainingLabel, { color: colors.textMuted }]}>Güncel kalan borç</Text>
            <Text style={[styles.remainingValue, { color: colors.orange }]}>{money(item.remaining_amount)}</Text>
          </View>

          {!!item.customer_note && (
            <View style={[styles.noteBox, { backgroundColor: `${colors.cyan}0D`, borderColor: `${colors.cyan}30` }]}>
              <Ionicons name="chatbubble-ellipses" size={18} color={colors.cyan} />
              <Text style={[styles.noteText, { color: colors.textSoft }]}>{item.customer_note}</Text>
            </View>
          )}

          <FormField
            label="Usta onay notu (opsiyonel)"
            value={notes[item.id] ?? ''}
            onChangeText={(value) => setNotes((current) => ({ ...current, [item.id]: value }))}
            placeholder="Örn. Hesaba ulaştı"
          />

          <View style={styles.actions}>
            <View style={styles.flex}><PrimaryButton title="Reddet" onPress={() => review(item, false)} secondary loading={loadingId === item.id} /></View>
            <View style={styles.flex}><PrimaryButton title="Ödemeyi Onayla" onPress={() => review(item, true)} loading={loadingId === item.id} /></View>
          </View>
        </GlassCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionIcon: { width: 47, height: 47, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  sectionTitle: { fontSize: 18, fontWeight: '900' },
  sectionSub: { fontSize: 11.5, marginTop: 3 },
  refresh: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  card: { borderWidth: 1, gap: 12 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 47, height: 47, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '900' },
  meta: { fontSize: 11.5, lineHeight: 15, marginTop: 3 },
  amount: { fontSize: 15, fontWeight: '900' },
  remainingBox: { minHeight: 58, borderRadius: 15, padding: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  remainingLabel: { fontSize: 11, fontWeight: '800' },
  remainingValue: { fontSize: 14, fontWeight: '900' },
  noteBox: { borderWidth: 1, borderRadius: 15, padding: 11, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  noteText: { flex: 1, fontSize: 12, lineHeight: 17 },
  actions: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
});
