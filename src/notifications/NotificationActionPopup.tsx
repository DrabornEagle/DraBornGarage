import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useState } from 'react';
import { AppState, Modal, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { GarageNotification } from './types';
import { useNotifications } from './NotificationContext';

const ACTIONABLE_TYPES = new Set([
  'new_appointment',
  'appointment_action_required',
  'customer_claim_pending',
]);

function popupKind(item: GarageNotification) {
  return item.notification_type === 'customer_claim_pending' ? 'customer_link' : 'appointment';
}

export function NotificationActionPopup() {
  const { colors } = useTheme();
  const { session, membership, isAdmin } = useAuth();
  const { open: centerOpen, notifications, openNotification, refresh } = useNotifications();
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [current, setCurrent] = useState<GarageNotification | null>(null);
  const storageKey = session?.user?.id ? `@draborngarage/action-popup-dismissed/${session.user.id}` : null;
  const staffSession = Boolean(isAdmin || membership);

  useEffect(() => {
    if (!storageKey) return setDismissedIds([]);
    AsyncStorage.getItem(storageKey)
      .then((raw) => setDismissedIds(raw ? JSON.parse(raw) : []))
      .catch(() => setDismissedIds([]));
  }, [storageKey]);

  useEffect(() => {
    if (!session?.user) return;
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => listener.remove();
  }, [refresh, session?.user]);

  const candidate = useMemo(() => {
    if (!staffSession || centerOpen) return null;
    const cutoff = Date.now() - 48 * 60 * 60 * 1000;
    return [...notifications]
      .filter((item) => {
        const delivery = new Date(item.deliver_at).getTime();
        return !item.read_at
          && ACTIONABLE_TYPES.has(item.notification_type)
          && Number.isFinite(delivery)
          && delivery <= Date.now() + 5000
          && delivery >= cutoff
          && !dismissedIds.includes(item.id);
      })
      .sort((a, b) => new Date(b.deliver_at).getTime() - new Date(a.deliver_at).getTime())[0] ?? null;
  }, [centerOpen, dismissedIds, notifications, staffSession]);

  useEffect(() => {
    if (!current && candidate) setCurrent(candidate);
    if (current && current.read_at) setCurrent(null);
  }, [candidate, current]);

  const dismiss = async () => {
    if (!current) return;
    const next = [...dismissedIds, current.id].slice(-120);
    setDismissedIds(next);
    setCurrent(null);
    if (storageKey) await AsyncStorage.setItem(storageKey, JSON.stringify(next)).catch(() => undefined);
  };

  const openAction = async () => {
    if (!current) return;
    const selected = current;
    setCurrent(null);
    await openNotification(selected);
  };

  if (!current) return null;
  const kind = popupKind(current);
  const appointment = kind === 'appointment';
  const accent = appointment ? colors.orange : colors.cyan;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={dismiss}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.cardStrong, borderColor: `${accent}78`, shadowColor: accent }]}> 
          <LinearGradient colors={[`${accent}30`, `${colors.primary2}18`, 'transparent']} style={StyleSheet.absoluteFill} />
          <View style={[styles.icon, { backgroundColor: `${accent}1E`, borderColor: `${accent}55` }]}> 
            <Ionicons name={appointment ? 'calendar' : 'person-add'} size={31} color={accent} />
          </View>
          <Text style={[styles.eyebrow, { color: accent }]}>{appointment ? 'RANDEVU İŞLEM BEKLİYOR' : 'MÜŞTERİ BAĞLANTI TALEBİ'}</Text>
          <Text style={[styles.title, { color: colors.text }]}>{appointment ? 'Yeni randevuyu kontrol et' : 'Yeni eşleştirme talebini incele'}</Text>
          <Text style={[styles.body, { color: colors.textMuted }]}>{current.body}</Text>
          {appointment && <View style={[styles.reminder, { backgroundColor: `${colors.orange}10`, borderColor: `${colors.orange}35` }]}><Ionicons name="alarm" size={18} color={colors.orange} /><Text style={[styles.reminderText, { color: colors.textSoft }]}>Randevuya işlem yapılana kadar Ustaya 5 dakikada bir hatırlatma gönderilir.</Text></View>}
          <AnimatedPressable onPress={openAction} style={styles.primaryWrap}>
            <LinearGradient colors={[accent, colors.primary2]} style={styles.primary}>
              <Ionicons name={appointment ? 'arrow-forward-circle' : 'shield-checkmark'} size={21} color="#fff" />
              <Text style={styles.primaryText}>{appointment ? 'Randevuyu İncele ve Onayla' : 'Talebi İncele'}</Text>
            </LinearGradient>
          </AnimatedPressable>
          <AnimatedPressable onPress={dismiss} style={[styles.secondary, { borderColor: colors.border }]}>
            <Text style={[styles.secondaryText, { color: colors.textMuted }]}>Şimdilik Kapat</Text>
          </AnimatedPressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(1,4,14,0.78)', alignItems: 'center', justifyContent: 'center', padding: 22 },
  card: { width: '100%', maxWidth: 470, overflow: 'hidden', borderWidth: 1.5, borderRadius: 30, padding: 22, alignItems: 'center', shadowOpacity: 0.34, shadowRadius: 28, elevation: 22 },
  icon: { width: 70, height: 70, borderRadius: 23, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  eyebrow: { fontSize: 11.5, fontWeight: '900', letterSpacing: 1.35, textAlign: 'center' },
  title: { fontSize: 23, lineHeight: 29, fontWeight: '900', letterSpacing: -0.55, textAlign: 'center', marginTop: 7 },
  body: { fontSize: 13.5, lineHeight: 20, textAlign: 'center', marginTop: 9 },
  reminder: { width: '100%', borderWidth: 1, borderRadius: 16, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 15 },
  reminderText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: '700' },
  primaryWrap: { width: '100%', marginTop: 18, borderRadius: 17, overflow: 'hidden' },
  primary: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 14 },
  primaryText: { color: '#fff', fontSize: 14, fontWeight: '900', textAlign: 'center' },
  secondary: { width: '100%', minHeight: 47, borderWidth: 1, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 9 },
  secondaryText: { fontSize: 13, fontWeight: '900' },
});
