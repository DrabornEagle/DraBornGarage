from pathlib import Path
import json, math, re, struct, wave
ROOT=Path.cwd()

def p(rel): return ROOT/rel

def replace(rel, old, new, count=-1):
    path=p(rel); text=path.read_text()
    if old not in text:
        raise RuntimeError(f'{rel}: target not found: {old[:140]!r}')
    path.write_text(text.replace(old,new,count))

def regex_replace(rel, pattern, repl, count=0, flags=re.S):
    path=p(rel); text=path.read_text()
    out,n=re.subn(pattern,repl,text,count=count,flags=flags)
    if not n: raise RuntimeError(f'{rel}: regex target not found: {pattern[:140]}')
    path.write_text(out)

rel='src/notifications/NotificationContextV101.tsx'
replace(rel,"import { supabase } from '../lib/supabase';","import { supabase } from '../lib/supabase';\nimport { APP_VERSION } from '../lib/appVersion';")
replace(rel,"import { ensureDraBornNotificationChannels, LOUD_NOTIFICATION_CHANNEL_ID, requestDeviceNotificationPermission, SILENT_NOTIFICATION_CHANNEL_ID } from './notificationPermissions';","import { ALERT_NOTIFICATION_CHANNEL_ID, CHIME_NOTIFICATION_CHANNEL_ID, ensureDraBornNotificationChannels, LOUD_NOTIFICATION_CHANNEL_ID, PULSE_NOTIFICATION_CHANNEL_ID, requestDeviceNotificationPermission, SILENT_NOTIFICATION_CHANNEL_ID } from './notificationPermissions';")
regex_replace(rel,r"const APP_VERSION = Constants\.expoConfig\?\.version \?\? '[^']+';\n",'',count=1)
regex_replace(rel,r"export const NOTIFICATION_SOUND_OPTIONS:[\s\S]*?= \[[\s\S]*?\];", """export const NOTIFICATION_SOUND_OPTIONS: { key: NotificationSoundKey; label: string; subtitle: string; icon: 'musical-notes' | 'volume-mute' }[] = [
  { key: 'system_loud', label: 'Telefon Bildirim Sesi', subtitle: 'Telefonunun bildirim sesini ve ses seviyesini kullanır', icon: 'musical-notes' },
  { key: 'garage_chime', label: 'Randevu Çağrısı', subtitle: 'Müşteri ve randevular için melodik yüksek çağrı', icon: 'musical-notes' },
  { key: 'garage_pulse', label: 'Atölye Nabzı', subtitle: 'Servis hareketleri için güçlü çift darbeli uyarı', icon: 'musical-notes' },
  { key: 'garage_alert', label: 'Acil Garaj Alarmı', subtitle: 'Önemli hareketler için en dikkat çekici alarm', icon: 'musical-notes' },
  { key: 'silent', label: 'Sessiz', subtitle: 'Ses olmadan güçlü titreşim', icon: 'volume-mute' },
];""",count=1)
regex_replace(rel,r"function soundFile\([\s\S]*?\n}\n\nfunction channelId\([\s\S]*?\n}","""function soundFile(sound: NotificationSoundKey): 'default' | 'garage_chime.wav' | 'garage_pulse.wav' | 'garage_alert.wav' | false {
  if (sound === 'silent') return false;
  if (sound === 'garage_chime') return 'garage_chime.wav';
  if (sound === 'garage_pulse') return 'garage_pulse.wav';
  if (sound === 'garage_alert') return 'garage_alert.wav';
  return 'default';
}

function channelId(sound: NotificationSoundKey) {
  if (sound === 'silent') return SILENT_NOTIFICATION_CHANNEL_ID;
  if (sound === 'garage_chime') return CHIME_NOTIFICATION_CHANNEL_ID;
  if (sound === 'garage_pulse') return PULSE_NOTIFICATION_CHANNEL_ID;
  if (sound === 'garage_alert') return ALERT_NOTIFICATION_CHANNEL_ID;
  return LOUD_NOTIFICATION_CHANNEL_ID;
}""",count=1)
replace(rel,"  sendTestNotification: () => Promise<boolean>;\n  consumeNavigationTarget:","  sendTestNotification: () => Promise<boolean>;\n  sendClosedAppTestNotification: () => Promise<boolean>;\n  consumeNavigationTarget:")
replace(rel,"  const consumeNavigationTarget = useCallback(() => {","""  const sendClosedAppTestNotification = useCallback(async () => {
    if (!session?.user || !NATIVE_PUSH_ENABLED) return false;
    try {
      const { data, error } = await supabase.rpc('notification_schedule_closed_app_test', { p_delay_seconds: 45 });
      if (error) throw error;
      await refresh();
      return Boolean(data);
    } catch {
      return false;
    }
  }, [session?.user, refresh]);

  const consumeNavigationTarget = useCallback(() => {""")
replace(rel,"openNotification, updatePreferences, requestLocalNotifications, registerPushNotifications, sendTestNotification, consumeNavigationTarget,","openNotification, updatePreferences, requestLocalNotifications, registerPushNotifications, sendTestNotification, sendClosedAppTestNotification, consumeNavigationTarget,")
replace(rel,"registerPushNotifications, sendTestNotification, consumeNavigationTarget]);","registerPushNotifications, sendTestNotification, sendClosedAppTestNotification, consumeNavigationTarget]);")

rel='src/notifications/NotificationCenterScreen.tsx'
replace(rel,"import { GarageNotification, NotificationCategory, NotificationPreferences, NotificationSoundKey } from './types';","import { GarageNotification, NotificationCategory, NotificationPreferences, NotificationSoundKey } from './types';\nimport { APP_VERSION_LABEL } from '../lib/appVersion';")
replace(rel,"    sendTestNotification,\n  } = useNotifications();","    sendTestNotification,\n    sendClosedAppTestNotification,\n  } = useNotifications();")
replace(rel,"  return (\n    <Modal","""  const testClosedApp = async () => {
    setSaving(true);
    const ok = await sendClosedAppTestNotification();
    setSaving(false);
    Alert.alert(ok ? 'Kapalı uygulama testi planlandı' : 'Push testi planlanamadı', ok
      ? 'Uygulamayı şimdi tamamen kapat. Yaklaşık 45–90 saniye içinde telefon bildirim alanına yüksek öncelikli test bildirimi gelmeli.'
      : 'Cihaz push kaydı veya FCM V1 bağlantısı henüz hazır değil. Bildirim ayarını açık tutup tekrar dene.');
  };

  return (
    <Modal""")
replace(rel,'v1.0.6 RC • FIREBASE BİLDİRİM MERKEZİ','{APP_VERSION_LABEL} • BİLDİRİM MERKEZİ')
replace(rel,"{permissionStatus === 'granted' && <PrimaryButton title=\"Test Bildirimi Gönder\" onPress={testLocal} loading={saving} secondary />}","{permissionStatus === 'granted' && <><PrimaryButton title=\"Test Bildirimi Gönder\" onPress={testLocal} loading={saving} secondary /><PrimaryButton title=\"Kapalı Uygulama Bildirim Testi\" onPress={testClosedApp} loading={saving} secondary /></>}")

replace('src/AppShellV102.tsx',"!['orders', 'appointments', 'customers', 'receivables', 'settings'].includes(tab)","!['orders', 'appointments', 'receivables', 'settings'].includes(tab)")

rel='src/screens/WorkOrderDetailV04.tsx'
replace(rel,"import { supabase } from '../lib/supabase';","import { supabase } from '../lib/supabase';\nimport { useSmartAutoRefresh } from '../hooks/useSmartAutoRefresh';")
replace(rel,"  const [readyPaymentPromptVisible, setReadyPaymentPromptVisible] = useState(false);","  const [readyPaymentPromptVisible, setReadyPaymentPromptVisible] = useState(false);\n  const [repairPricePromptVisible, setRepairPricePromptVisible] = useState(false);\n  const [priceSavedVisible, setPriceSavedVisible] = useState(false);")
replace(rel,"  const load = useCallback(async () => {","  const load = useCallback(async (syncPriceForm = true, silent = false) => {")
replace(rel,"    if (orderResult.error) return Alert.alert('İş emri açılamadı', orderResult.error.message);","    if (orderResult.error) { if (!silent) Alert.alert('İş emri açılamadı', orderResult.error.message); return; }")
replace(rel,"    setPriceType(next.price_type ?? 'fixed');\n    setFixedPrice(next.quoted_price ? String(next.quoted_price) : '');\n    setEstimateMin(next.estimated_price_min ? String(next.estimated_price_min) : '');\n    setEstimateMax(next.estimated_price_max ? String(next.estimated_price_max) : '');","    if (syncPriceForm) {\n      setPriceType(next.price_type ?? 'fixed');\n      setFixedPrice(next.quoted_price ? String(next.quoted_price) : '');\n      setEstimateMin(next.estimated_price_min ? String(next.estimated_price_min) : '');\n      setEstimateMax(next.estimated_price_max ? String(next.estimated_price_max) : '');\n    }")
replace(rel,"  useEffect(() => { load(); }, [load]);\n\n  const run = async (action: () => PromiseLike<{ error: any }>, fallback: string) => {\n    setSaving(true);\n    const result = await action();\n    setSaving(false);\n    if (result.error) return Alert.alert(fallback, result.error.message);\n    await load();\n  };","""  useEffect(() => { load(); }, [load]);
  useSmartAutoRefresh(() => load(false, true), 45000, !isApprentice);

  useEffect(() => {
    if (isApprentice) return;
    const refreshSilently = () => { load(false, true).catch(() => undefined); };
    const channel = supabase.channel(`work-order-detail-live-${orderId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_orders', filter: `id=eq.${orderId}` }, refreshSilently)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_order_services', filter: `work_order_id=eq.${orderId}` }, refreshSilently)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_order_parts', filter: `work_order_id=eq.${orderId}` }, refreshSilently)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_order_extra_requests', filter: `work_order_id=eq.${orderId}` }, refreshSilently)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_order_notes', filter: `work_order_id=eq.${orderId}` }, refreshSilently)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_order_events', filter: `work_order_id=eq.${orderId}` }, refreshSilently)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orderId, isApprentice, load]);

  const run = async (action: () => PromiseLike<{ error: any }>, fallback: string) => {
    setSaving(true);
    const result = await action();
    setSaving(false);
    if (result.error) { Alert.alert(fallback, result.error.message); return false; }
    await load(false, true);
    return true;
  };""")
replace(rel,"    else await load();\n    if (status === 'ready' && !isApprentice) {","    else await load(false, true);\n    if (status === 'repair_started' && !isApprentice && Number(order.quoted_price || 0) <= 0 && Number(order.estimated_price_min || 0) <= 0) {\n      setRepairPricePromptVisible(true);\n    }\n    if (status === 'ready' && !isApprentice) {")
old="""    await run(() => supabase.from('work_orders').update({
      price_type: priceType,
      quoted_price: priceType === 'fixed' ? fixed : null,
      estimated_price_min: priceType === 'estimated' ? min : null,
      estimated_price_max: priceType === 'estimated' ? max : null,
      status: ['opened', 'received', 'queued', 'waiting', 'precheck'].includes(order.status) ? 'price_entered' : order.status,
    }).eq('id', orderId), 'Ücret kaydedilemedi');
  };"""
new="""    const saved = await run(() => supabase.from('work_orders').update({
      price_type: priceType,
      quoted_price: priceType === 'fixed' ? fixed : null,
      estimated_price_min: priceType === 'estimated' ? min : null,
      estimated_price_max: priceType === 'estimated' ? max : null,
      status: ['opened', 'received', 'queued', 'waiting', 'precheck'].includes(order.status) ? 'price_entered' : order.status,
    }).eq('id', orderId), 'Ücret kaydedilemedi');
    if (saved) setPriceSavedVisible(true);
  };"""
replace(rel,old,new)
replace(rel,"    <ReadyPaymentModal\n      visible={readyPaymentPromptVisible}","""    <PriceGuideModal
      visible={repairPricePromptVisible}
      onClose={() => setRepairPricePromptVisible(false)}
      onOpenPrice={() => {
        setRepairPricePromptVisible(false);
        setOpenSections((current) => ({ ...current, price: true }));
        setTimeout(() => scrollRef.current?.scrollTo({ y: 610, animated: true }), 180);
      }}
    />
    <PriceSavedModal
      visible={priceSavedVisible}
      summary={priceType === 'fixed' ? money(Number(fixedPrice.replace(',', '.'))) : `${money(Number(estimateMin.replace(',', '.')))} – ${money(Number(estimateMax.replace(',', '.')))}`}
      onClose={() => setPriceSavedVisible(false)}
    />
    <ReadyPaymentModal
      visible={readyPaymentPromptVisible}""")
marker="function ReadyPaymentModal({ visible, total, received, onClose, onOpenFinance }:"
modal_code="""function PriceGuideModal({ visible, onClose, onOpenPrice }: { visible: boolean; onClose: () => void; onOpenPrice: () => void }) {
  const { colors } = useTheme();
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.readyOverlay}><View style={[styles.readyModal, { backgroundColor: colors.cardStrong, borderColor: `${colors.orange}55` }]}>
      <View style={[styles.readyIcon, { backgroundColor: `${colors.orange}18`, borderColor: `${colors.orange}45` }]}><Ionicons name="pricetag" size={34} color={colors.orange} /></View>
      <Text style={[styles.readyTitle, { color: colors.text }]}>Tamir Başladı • Ücreti Belirle</Text>
      <Text style={[styles.readyText, { color: colors.textMuted }]}>Müşteriye net bilgi vermek için şimdi Net Fiyat veya Tahmini Fiyat kaydedebilirsin. Bu adım zorunlu değildir; tahsilat veya borç tutarı daha sonra otomatik Net Fiyat olabilir.</Text>
      <AnimatedPressable onPress={onOpenPrice} style={[styles.readyPrimary, { backgroundColor: colors.orange }]}><Ionicons name="arrow-forward" size={20} color="#07131B" /><Text style={styles.readyPrimaryText}>Ücret Alanına Git</Text></AnimatedPressable>
      <AnimatedPressable onPress={onClose} style={[styles.readySecondary, { borderColor: colors.border }]}><Text style={[styles.readySecondaryText, { color: colors.textMuted }]}>Şimdilik Sonra</Text></AnimatedPressable>
    </View></View>
  </Modal>;
}

function PriceSavedModal({ visible, summary, onClose }: { visible: boolean; summary: string; onClose: () => void }) {
  const { colors } = useTheme();
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.readyOverlay}><View style={[styles.readyModal, { backgroundColor: colors.cardStrong, borderColor: `${colors.green}55` }]}>
      <View style={[styles.readyIcon, { backgroundColor: `${colors.green}18`, borderColor: `${colors.green}45` }]}><Ionicons name="checkmark-done" size={34} color={colors.green} /></View>
      <Text style={[styles.readyTitle, { color: colors.text }]}>Ücret Kaydedildi</Text>
      <Text style={[styles.readyText, { color: colors.textMuted }]}>Servis kaydı, müşteri görünümü ve tahsilat hesapları güncellendi.</Text>
      <View style={[styles.readyAmountCard, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}><View><Text style={[styles.readyAmountLabel, { color: colors.textMuted }]}>KAYDEDİLEN TUTAR</Text><Text style={[styles.readyAmount, { color: colors.green }]}>{summary}</Text></View></View>
      <AnimatedPressable onPress={onClose} style={[styles.readyPrimary, { backgroundColor: colors.green }]}><Ionicons name="checkmark" size={20} color="#07131B" /><Text style={styles.readyPrimaryText}>Tamam</Text></AnimatedPressable>
    </View></View>
  </Modal>;
}

"""
replace(rel,marker,modal_code+marker)
print('v1.0.0 patch part 2 complete')
