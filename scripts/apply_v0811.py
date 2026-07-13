from __future__ import annotations

import json
import re
from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


def replace_required(path: str, before: str, after: str, count: int = 1) -> None:
    source = read(path)
    if before not in source:
        raise RuntimeError(f"{path}: target not found\n{before[:400]}")
    write(path, source.replace(before, after, count))


def regex_required(path: str, pattern: str, replacement: str, flags: int = 0) -> None:
    source = read(path)
    updated, count = re.subn(pattern, replacement, source, count=1, flags=flags)
    if count != 1:
        raise RuntimeError(f"{path}: regex target count={count}\n{pattern[:400]}")
    write(path, updated)


# ---------------------------------------------------------------------------
# Notification bell: animate every time unread count increases.
# ---------------------------------------------------------------------------
write(
    "src/notifications/NotificationBell.tsx",
    """import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedPressable } from '../components/AnimatedPressable';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from './NotificationContext';

export function NotificationBell() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { unreadCount, upcomingCount, openCenter, loading } = useNotifications();
  const badge = unreadCount > 99 ? '99+' : String(unreadCount);
  const emphasis = useRef(new Animated.Value(0)).current;
  const previousUnread = useRef(unreadCount);

  useEffect(() => {
    const increased = unreadCount > previousUnread.current;
    previousUnread.current = unreadCount;
    if (unreadCount <= 0) {
      emphasis.stopAnimation();
      emphasis.setValue(0);
      return;
    }
    if (!increased) return;
    emphasis.setValue(0);
    const animation = Animated.sequence([
      Animated.timing(emphasis, { toValue: 1, duration: 110, useNativeDriver: true }),
      Animated.timing(emphasis, { toValue: -1, duration: 100, useNativeDriver: true }),
      Animated.timing(emphasis, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.timing(emphasis, { toValue: -1, duration: 100, useNativeDriver: true }),
      Animated.timing(emphasis, { toValue: 0, duration: 130, useNativeDriver: true }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [unreadCount, emphasis]);

  const rotate = emphasis.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-9deg', '0deg', '9deg'] });
  const scale = emphasis.interpolate({ inputRange: [-1, 0, 1], outputRange: [1.08, 1, 1.08] });

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: Math.max(insets.top + 8, 18) }]}>
      <Animated.View style={{ transform: [{ rotate }, { scale }] }}>
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel={`${unreadCount} okunmamış bildirim`}
          onPress={openCenter}
          style={[styles.button, { backgroundColor: colors.cardStrong, borderColor: unreadCount > 0 ? `${colors.orange}78` : colors.border, shadowColor: colors.primary }]}
        >
          {unreadCount > 0 ? (
            <LinearGradient colors={[colors.orange, colors.red]} style={styles.iconShell}>
              <Ionicons name="notifications" size={20} color="#fff" />
            </LinearGradient>
          ) : (
            <View style={[styles.iconShell, { backgroundColor: `${colors.primary}15` }]}>
              <Ionicons name={loading ? 'sync' : 'notifications-outline'} size={20} color={colors.primary} />
            </View>
          )}
          {unreadCount > 0 && <Animated.View style={[styles.badge, { backgroundColor: colors.red, borderColor: colors.cardStrong, transform: [{ scale }] }]}><Text style={styles.badgeText}>{badge}</Text></Animated.View>}
          {unreadCount === 0 && upcomingCount > 0 && <View style={[styles.futureDot, { backgroundColor: colors.cyan, borderColor: colors.cardStrong }]} />}
        </AnimatedPressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: 16, zIndex: 90, elevation: 22 },
  button: { width: 49, height: 49, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 12 },
  iconShell: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -5, right: -6, minWidth: 22, height: 22, paddingHorizontal: 5, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  futureDot: { position: 'absolute', top: 2, right: 2, width: 11, height: 11, borderRadius: 6, borderWidth: 2 },
});
""",
)

# ---------------------------------------------------------------------------
# App shell: separate Business Panel from Mechanic Panel operations.
# ---------------------------------------------------------------------------
replace_required(
    "src/AppShell.tsx",
    """  const { membership, isAdmin, workshop } = useAuth();
  const { navigationTarget, consumeNavigationTarget } = useNotifications();
  const [tab, setTab] = useState<Tab>(isAdmin && !workshop ? 'team' : 'home');
  const [newOrderMode, setNewOrderMode] = useState<ServiceType | null>(null);
  const canWork = Boolean(membership && WORKER_ROLES.includes(membership.role));
  const [staffPanelMode, setStaffPanelMode] = useState<PanelMode>(isAdmin || membership?.role === 'owner' || membership?.role === 'owner_mechanic' ? 'business' : 'mechanic');
  const isApprentice = membership?.role === 'apprentice';
  const isOwner = isAdmin || membership?.role === 'owner' || membership?.role === 'owner_mechanic';
""",
    """  const { membership, isAdmin, workshop } = useAuth();
  const { navigationTarget, consumeNavigationTarget } = useNotifications();
  const isPureOwner = membership?.role === 'owner';
  const isOwnerMechanic = membership?.role === 'owner_mechanic';
  const canWork = Boolean(membership && WORKER_ROLES.includes(membership.role));
  const initialPanelMode: PanelMode = isAdmin || isPureOwner ? 'business' : 'mechanic';
  const [tab, setTab] = useState<Tab>(isAdmin ? 'team' : 'home');
  const [newOrderMode, setNewOrderMode] = useState<ServiceType | null>(null);
  const [staffPanelMode, setStaffPanelMode] = useState<PanelMode>(initialPanelMode);
  const [customerInitialTab, setCustomerInitialTab] = useState<'customers' | 'claims'>('customers');
  const [customerNavigationKey, setCustomerNavigationKey] = useState(0);
  const isApprentice = membership?.role === 'apprentice';
  const isOwner = isAdmin || isPureOwner || isOwnerMechanic;
  const businessRestricted = isAdmin || isPureOwner || (isOwnerMechanic && staffPanelMode === 'business');
""",
)
replace_required(
    "src/AppShell.tsx",
    """  const openOrders = () => setTab('orders');
  const openNew = (mode: ServiceType = 'dropoff') => {
    if (!canWork || staffPanelMode !== 'mechanic') return;
""",
    """  const openOrders = () => { if (!businessRestricted) setTab('orders'); };
  const openNew = (mode: ServiceType = 'dropoff') => {
    if (!canWork || staffPanelMode !== 'mechanic' || businessRestricted) return;
""",
)
replace_required(
    "src/AppShell.tsx",
    """  useEffect(() => {
    setStaffPanelMode(isAdmin || membership?.role === 'owner' || membership?.role === 'owner_mechanic' ? 'business' : 'mechanic');
  }, [workshop?.id, membership?.role, isAdmin]);
""",
    """  useEffect(() => {
    setStaffPanelMode(isAdmin || membership?.role === 'owner' ? 'business' : 'mechanic');
  }, [workshop?.id, membership?.role, isAdmin]);

  useEffect(() => {
    if (isAdmin && tab !== 'team' && tab !== 'settings') setTab('team');
    else if (businessRestricted && !['home', 'team', 'settings'].includes(tab)) setTab('home');
  }, [businessRestricted, isAdmin, tab]);
""",
)
replace_required(
    "src/AppShell.tsx",
    """    if (target) {
      const allowedForApprentice = !isApprentice || target === 'home' || target === 'orders' || target === 'settings';
      setTab(allowedForApprentice ? target : 'home');
    }
""",
    """    if (target) {
      const allowedForApprentice = !isApprentice || target === 'home' || target === 'orders' || target === 'settings';
      const allowedForBusiness = !businessRestricted || target === 'home' || target === 'team' || target === 'settings';
      if (target === 'customers' && navigationTarget.targetSection === 'claims' && allowedForBusiness) {
        setCustomerInitialTab('claims');
        setCustomerNavigationKey((value) => value + 1);
      }
      setTab(allowedForApprentice && allowedForBusiness ? target : isAdmin ? 'team' : 'home');
    }
""",
)
replace_required(
    "src/AppShell.tsx",
    "  }, [navigationTarget, consumeNavigationTarget, isApprentice]);",
    "  }, [navigationTarget, consumeNavigationTarget, isApprentice, businessRestricted, isAdmin]);",
)
replace_required(
    "src/AppShell.tsx",
    """        : tab === 'customers'
          ? <CustomersScreen />
""",
    """        : tab === 'customers'
          ? <CustomersScreen key={`customers-${customerNavigationKey}`} initialTab={customerInitialTab} />
""",
)
replace_required(
    "src/AppShell.tsx",
    """    if (isAdmin && !workshop) return all.filter((item) => ['team', 'settings'].includes(item.key));
    return isApprentice ? all.filter((item) => ['home', 'orders', 'settings'].includes(item.key)) : all;
  }, [colors, isAdmin, isOwner, isApprentice, workshop]);
""",
    """    if (isAdmin) return all.filter((item) => ['team', 'settings'].includes(item.key));
    if (businessRestricted) return all.filter((item) => ['home', 'team', 'settings'].includes(item.key));
    return isApprentice ? all.filter((item) => ['home', 'orders', 'settings'].includes(item.key)) : all;
  }, [colors, isAdmin, isOwner, isApprentice, businessRestricted]);
""",
)
replace_required(
    "src/AppShell.tsx",
    "<AnimatedPressable key={item.key} onPress={() => setTab(item.key)} style={styles.navItem}>",
    "<AnimatedPressable key={item.key} onPress={() => { if (item.key === 'customers') setCustomerInitialTab('customers'); setTab(item.key); }} style={styles.navItem}>",
)
replace_required(
    "src/AppShell.tsx",
    "{newOrderMode && !isApprentice && canWork && staffPanelMode === 'mechanic' && (",
    "{newOrderMode && !isApprentice && canWork && staffPanelMode === 'mechanic' && !businessRestricted && (",
)

# ---------------------------------------------------------------------------
# Home: Business Panel shows aggregate-only information, not repair rows.
# ---------------------------------------------------------------------------
replace_required(
    "src/screens/HomeScreen.tsx",
    "    setRecent((ordersResult.data as unknown as WorkOrderListItem[]) ?? []);",
    "    setRecent(mechanicView ? ((ordersResult.data as unknown as WorkOrderListItem[]) ?? []) : []);",
)
regex_required(
    "src/screens/HomeScreen.tsx",
    r"\n      <View style=\{styles\.section\}>\n        <View style=\{styles\.sectionHeader\}>.*?\n      </View>\n    </ScrollView>",
    """
      {!isApprentice && panelMode === 'business' && (
        <GlassCard style={[styles.businessNotice, { borderColor: `${colors.cyan}38` }]}>
          <View style={[styles.businessNoticeIcon, { backgroundColor: `${colors.cyan}14` }]}><Ionicons name="analytics" size={24} color={colors.cyan} /></View>
          <View style={styles.quickCopy}><Text style={[styles.businessNoticeTitle, { color: colors.text }]}>İşletme Paneli özet görünümüdür</Text><Text style={[styles.businessNoticeText, { color: colors.textMuted }]}>Toplamlar, Usta kazançları, raporlar ve işletme ayarları burada yönetilir. Motosiklet kabulü ve bütün servis işlemleri yalnız Usta Panelinden yapılır.</Text></View>
        </GlassCard>
      )}

      {(isApprentice || panelMode === 'mechanic') && <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Bugünkü Atölye Sırası</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>{isApprentice ? 'Finansal bilgiler gizlidir; yalnız görev ve servis akışı gösterilir.' : 'Yalnız sana atanmış plaka, işlem, sıra ve güncel servis durumu.'}</Text>
          </View>
          <AnimatedPressable onPress={onOpenOrders}><Text style={[styles.link, { color: colors.primary }]}>Tümünü gör</Text></AnimatedPressable>
        </View>
        <View style={styles.orderList}>
          {selectedOrders.length === 0 ? (
            <GlassCard><Text style={[styles.emptyText, { color: colors.textMuted }]}>Sana atanmış atölye kaydı bulunmuyor.</Text></GlassCard>
          ) : selectedOrders.map((order: any) => (
            <AnimatedPressable key={order.id} onPress={onOpenOrders} style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.queueBadge, { backgroundColor: `${colors.orange}20`, borderColor: `${colors.orange}55` }]}><Text style={[styles.queueText, { color: colors.orange }]}>{order.queue_position ?? '-'}</Text></View>
              <View style={[styles.bikeIcon, { backgroundColor: `${colors.primary2}18` }]}><AnimatedMotorcycleIcon size={30} color={colors.primary2} /></View>
              <View style={styles.orderCopy}>
                <Text style={[styles.orderTitle, { color: colors.text }]}>{order.motorcycle?.brand ?? order.brand} {order.motorcycle?.model ?? order.model}</Text>
                <Text style={[styles.orderMeta, { color: colors.textMuted }]}>{order.motorcycle?.plate ?? order.plate ?? 'Plaka yok'} • {order.complaint}</Text>
                <Text style={[styles.orderTime, { color: colors.textMuted }]}>{shortDate(order.arrived_at)} • {order.service_type === 'quick' ? 'Hızlı servis' : order.service_type === 'appointment' ? 'Randevulu' : 'Bırakılan motor'}</Text>
              </View>
              <View style={styles.orderRight}>
                <StatusPill status={order.status} />
                {!isApprentice && <Text style={[styles.orderAmount, { color: colors.text }]}>{money(order.total_amount)}</Text>}
              </View>
            </AnimatedPressable>
          ))}
        </View>
      </View>}
    </ScrollView>""",
    flags=re.S,
)
replace_required(
    "src/screens/HomeScreen.tsx",
    "  quickGrid: { gap: 10 },",
    "  businessNotice: { minHeight: 96, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }, businessNoticeIcon: { width: 50, height: 50, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }, businessNoticeTitle: { fontSize: 15.5, fontWeight: '900' }, businessNoticeText: { fontSize: 12.5, lineHeight: 18, marginTop: 4 },\n  quickGrid: { gap: 10 },",
)

# Work order and appointment lists: owner_mechanic behaves as a mechanic.
replace_required(
    "src/screens/WorkOrdersScreen.tsx",
    "    if (membership.role === 'mechanic') query = query.eq('assigned_mechanic_id', membership.user_id);",
    "    if (membership.role === 'mechanic' || membership.role === 'owner_mechanic') query = query.eq('assigned_mechanic_id', membership.user_id);",
)
replace_required(
    "src/screens/AppointmentsScreen.tsx",
    "  const isOwner = isAdmin || membership?.role === 'owner' || membership?.role === 'owner_mechanic';",
    "  const isOwner = isAdmin || membership?.role === 'owner';",
)

# ---------------------------------------------------------------------------
# Customers matching tab: realtime refresh and persistent pulse until opened.
# ---------------------------------------------------------------------------
replace_required(
    "src/screens/CustomersScreen.tsx",
    "import React, { useCallback, useEffect, useMemo, useState } from 'react';\nimport { Alert, RefreshControl, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';",
    "import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';\nimport { Alert, Animated, RefreshControl, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';",
)
replace_required(
    "src/screens/CustomersScreen.tsx",
    "import { money, shortDate } from '../lib/format';\nimport { supabase } from '../lib/supabase';",
    "import { money, shortDate } from '../lib/format';\nimport { supabase } from '../lib/supabase';\nimport { useNotifications } from '../notifications/NotificationContext';",
)
replace_required(
    "src/screens/CustomersScreen.tsx",
    "export function CustomersScreen() {\n  const { colors } = useTheme();\n  const { workshop } = useAuth();\n  const [tab, setTab] = useState<Tab>('customers');",
    "export function CustomersScreen({ initialTab = 'customers' }: { initialTab?: Tab }) {\n  const { colors } = useTheme();\n  const { workshop } = useAuth();\n  const { notifications, markRead } = useNotifications();\n  const [tab, setTab] = useState<Tab>(initialTab);\n  const [acknowledgedClaimSignature, setAcknowledgedClaimSignature] = useState('');\n  const claimPulse = useRef(new Animated.Value(0)).current;",
)
replace_required(
    "src/screens/CustomersScreen.tsx",
    "  useEffect(() => { load(); }, [load]);",
    """  useEffect(() => { load(); }, [load]);
  useEffect(() => { setTab(initialTab); }, [initialTab]);
  useEffect(() => {
    if (!workshop?.id) return;
    const channel = supabase.channel(`customer-claims-attention-${workshop.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_claims', filter: `workshop_id=eq.${workshop.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [workshop?.id, load]);""",
)
replace_required(
    "src/screens/CustomersScreen.tsx",
    "  const pending = claims.filter((item) => item.status === 'pending').length;",
    """  const pendingClaims = claims.filter((item) => item.status === 'pending');
  const pending = pendingClaims.length;
  const pendingClaimSignature = pendingClaims.map((item) => item.id).sort().join('|');
  const needsClaimAttention = Boolean(pendingClaimSignature) && pendingClaimSignature !== acknowledgedClaimSignature && tab !== 'claims';

  useEffect(() => {
    if (!needsClaimAttention) {
      claimPulse.stopAnimation();
      claimPulse.setValue(0);
      return;
    }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(claimPulse, { toValue: 1, duration: 720, useNativeDriver: true }),
      Animated.timing(claimPulse, { toValue: 0, duration: 720, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [needsClaimAttention, claimPulse]);

  useEffect(() => {
    if (tab === 'claims' && pendingClaimSignature) setAcknowledgedClaimSignature(pendingClaimSignature);
  }, [tab, pendingClaimSignature]);

  const openClaims = async () => {
    setTab('claims');
    setAcknowledgedClaimSignature(pendingClaimSignature);
    const unreadClaimNotifications = notifications.filter((item) => !item.read_at && item.notification_type === 'customer_claim_pending');
    await Promise.all(unreadClaimNotifications.map((item) => markRead(item.id)));
  };

  const attentionScale = claimPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] });
  const attentionOpacity = claimPulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });""",
)
replace_required(
    "src/screens/CustomersScreen.tsx",
    """    <View style={[styles.tabs, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}><TabButton active={tab === 'customers'} label="Müşteriler" icon="people" onPress={() => setTab('customers')} /><TabButton active={tab === 'claims'} label="Eşleşme Talepleri" icon="shield-checkmark" badge={pending} onPress={() => setTab('claims')} /></View>
""",
    """    <View style={[styles.tabs, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}>
      <TabButton active={tab === 'customers'} label="Müşteriler" icon="people" onPress={() => setTab('customers')} />
      <Animated.View style={[styles.claimTabWrap, needsClaimAttention && { opacity: attentionOpacity, transform: [{ scale: attentionScale }] }]}>
        <TabButton active={tab === 'claims'} label="Eşleşme Talepleri" icon="shield-checkmark" badge={pending} onPress={openClaims} />
        {needsClaimAttention && <Animated.View pointerEvents="none" style={[styles.claimAttentionRing, { borderColor: colors.orange, opacity: attentionOpacity }]} />}
      </Animated.View>
    </View>
""",
)
replace_required(
    "src/screens/CustomersScreen.tsx",
    "tabs: { flexDirection: 'row', gap: 5, padding: 5, borderWidth: 1, borderRadius: 18 }, tab:",
    "tabs: { flexDirection: 'row', gap: 5, padding: 5, borderWidth: 1, borderRadius: 18 }, claimTabWrap: { flex: 1, position: 'relative' }, claimAttentionRing: { position: 'absolute', left: -2, right: -2, top: -2, bottom: -2, borderRadius: 16, borderWidth: 2 }, tab:",
)

# ---------------------------------------------------------------------------
# Customer account accordions.
# ---------------------------------------------------------------------------
replace_required(
    "src/customer/CustomerAccountScreen.tsx",
    "import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';",
    "import { Alert, LayoutAnimation, ScrollView, StyleSheet, Text, View } from 'react-native';",
)
replace_required(
    "src/customer/CustomerAccountScreen.tsx",
    "  const [joining, setJoining] = useState(false);",
    "  const [joining, setJoining] = useState(false);\n  const [openSections, setOpenSections] = useState<Record<'mechanic' | 'history', boolean>>({ mechanic: false, history: false });\n  const toggleSection = (key: 'mechanic' | 'history') => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setOpenSections((current) => ({ ...current, [key]: !current[key] })); };",
)
replace_required(
    "src/customer/CustomerAccountScreen.tsx",
    """      <GlassCard style={[styles.mechanicHub, { borderColor: `${colors.orange}45` }]}>
        <View style={styles.hubHeader}>
          <View style={[styles.hubIcon, { backgroundColor: `${colors.orange}1A` }]}><Ionicons name="construct" size={27} color={colors.orange} /></View>
          <View style={styles.copy}>
            <Text style={[styles.hubTitle, { color: colors.text }]}>Usta Paneline Katıl</Text>
            <Text style={[styles.hubText, { color: colors.textMuted }]}>İşletme adını arayıp Usta başvurusu gönder veya işletmenin verdiği tek kullanımlık Usta kodunu gir.</Text>
          </View>
        </View>

""",
    """      <AccountAccordion title="Usta Paneline Katıl" subtitle="İşletmeye başvur veya personel davet kodunu kullan" icon="construct" accent={colors.orange} open={openSections.mechanic} onToggle={() => toggleSection('mechanic')}>
""",
)
replace_required(
    "src/customer/CustomerAccountScreen.tsx",
    """        </View>
      </GlassCard>

      <View style={styles.sectionHeader}"><Text style={[styles.sectionTitle, { color: colors.text }]}>Bağlı İşletmeler</Text>""",
    """        </View>
      </AccountAccordion>

      <View style={styles.sectionHeader}"><Text style={[styles.sectionTitle, { color: colors.text }]}>Bağlı İşletmeler</Text>""",
)
replace_required(
    "src/customer/CustomerAccountScreen.tsx",
    """      <Text style={[styles.sectionTitle, { color: colors.text }]}>Eşleştirme Geçmişi</Text>
      <GlassCard>{claims.length === 0 ? <Text style={[styles.emptyText, { color: colors.textMuted }]}>Henüz talep yok.</Text> : claims.slice(0, 10).map((item) => { const accent = item.status === 'approved' ? colors.green : item.status === 'pending' ? colors.orange : colors.red; return <View key={item.id} style={styles.claim}><Ionicons name={item.status === 'approved' ? 'checkmark-circle' : item.status === 'pending' ? 'time' : 'close-circle'} size={22} color={accent} /><View style={styles.copy}><Text style={[styles.claimTitle, { color: colors.text }]}>{item.brand} {item.model} • {item.plate}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{item.workshop_name} • {methodText[item.method]} • {shortDate(item.created_at)}</Text></View><Text style={[styles.status, { color: accent }]}>{item.status === 'approved' ? 'ONAYLI' : item.status === 'pending' ? 'BEKLİYOR' : 'RED'}</Text></View>; })}</GlassCard>
""",
    """      <AccountAccordion title="Eşleştirme Geçmişi" subtitle={`${claims.length} talep • onay ve bağlantı geçmişi`} icon="git-compare" accent={colors.primary} open={openSections.history} onToggle={() => toggleSection('history')}>
        <GlassCard>{claims.length === 0 ? <Text style={[styles.emptyText, { color: colors.textMuted }]}>Henüz talep yok.</Text> : claims.slice(0, 10).map((item) => { const accent = item.status === 'approved' ? colors.green : item.status === 'pending' ? colors.orange : colors.red; return <View key={item.id} style={styles.claim}><Ionicons name={item.status === 'approved' ? 'checkmark-circle' : item.status === 'pending' ? 'time' : 'close-circle'} size={22} color={accent} /><View style={styles.copy}><Text style={[styles.claimTitle, { color: colors.text }]}>{item.brand} {item.model} • {item.plate}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{item.workshop_name} • {methodText[item.method]} • {shortDate(item.created_at)}</Text></View><Text style={[styles.status, { color: accent }]}>{item.status === 'approved' ? 'ONAYLI' : item.status === 'pending' ? 'BEKLİYOR' : 'RED'}</Text></View>; })}</GlassCard>
      </AccountAccordion>
""",
)
replace_required(
    "src/customer/CustomerAccountScreen.tsx",
    """const styles = StyleSheet.create({
""",
    """function AccountAccordion({ title, subtitle, icon, accent, open, onToggle, children }: { title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap; accent: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  const { colors } = useTheme();
  return <View style={[styles.accountAccordion, { backgroundColor: colors.card, borderColor: open ? `${accent}58` : colors.border }]}>
    <AnimatedPressable onPress={onToggle} style={styles.accountAccordionHeader}>
      <View style={[styles.accountAccordionIcon, { backgroundColor: `${accent}15`, borderColor: `${accent}38` }]}><Ionicons name={icon} size={23} color={accent} /></View>
      <View style={styles.copy}><Text style={[styles.accountAccordionTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.accountAccordionSub, { color: colors.textMuted }]}>{subtitle}</Text></View>
      <View style={[styles.accountAccordionChevron, { borderColor: open ? `${accent}55` : colors.border }]}><Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={open ? accent : colors.textMuted} /></View>
    </AnimatedPressable>
    {open && <View style={[styles.accountAccordionBody, { borderTopColor: colors.border }]}>{children}</View>}
  </View>;
}

const styles = StyleSheet.create({
""",
)
replace_required(
    "src/customer/CustomerAccountScreen.tsx",
    "  mechanicHub: { gap: 15, borderWidth: 1 },",
    "  accountAccordion: { borderWidth: 1, borderRadius: 22, overflow: 'hidden' }, accountAccordionHeader: { minHeight: 82, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11 }, accountAccordionIcon: { width: 48, height: 48, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, accountAccordionTitle: { fontSize: 16, fontWeight: '900' }, accountAccordionSub: { fontSize: 12, lineHeight: 16, marginTop: 4 }, accountAccordionChevron: { width: 38, height: 38, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, accountAccordionBody: { borderTopWidth: 1, padding: 13, gap: 15 },\n  mechanicHub: { gap: 15, borderWidth: 1 },",
)

# ---------------------------------------------------------------------------
# Customer linking: only Workshop Search and QR / Manual Code.
# ---------------------------------------------------------------------------
replace_required("src/customer/CustomerLinkPanel.tsx", "type Method = 'workshop' | 'phone' | 'tracking' | 'qr';", "type Method = 'workshop' | 'qr';")
replace_required("src/customer/CustomerLinkPanel.tsx", "  const [code, setCode] = useState('');\n", "")
regex_required(
    "src/customer/CustomerLinkPanel.tsx",
    r"    const result = method === 'phone'.*?            \}\);",
    """    const result = method === 'qr'
      ? await supabase.rpc('customer_claim_by_qr', { p_token: tokenFrom(qrOrManualCode) })
      : await supabase.rpc('customer_request_workshop_motor_link', {
          p_workshop_id: selectedWorkshop!.id,
          p_plate: normalizedPlate,
          p_brand: brand.trim(),
          p_model: model.trim(),
          p_phone: phone.trim() || null,
        });""",
    flags=re.S,
)
replace_required(
    "src/customer/CustomerLinkPanel.tsx",
    """      <View style={styles.methods}>
        {([
          ['workshop', 'İşletme Ara', 'search'],
          ['phone', 'Plaka + Telefon', 'call'],
          ['tracking', 'Takip Kodu', 'key'],
          ['qr', 'QR / Manuel Kod', 'qr-code'],
        ] as [Method, string, keyof typeof Ionicons.glyphMap][]).map(([value, label, icon]) => (
          <AnimatedPressable key={value} onPress={() => setMethod(value)} style={[styles.method, { backgroundColor: method === value ? `${colors.primary}18` : colors.card, borderColor: method === value ? colors.primary : colors.border }]}><Ionicons name={icon} size={21} color={method === value ? colors.primary : colors.textMuted} /><Text style={[styles.methodText, { color: colors.text }]}>{label}</Text></AnimatedPressable>
        ))}
      </View>
""",
    """      <View style={styles.methods}>
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
""",
)
replace_required(
    "src/customer/CustomerLinkPanel.tsx",
    "        {method === 'phone' && <><FormField label=\"Plaka\" value={plate} onChangeText={(v) => setPlate(v.toUpperCase())} placeholder=\"06 ABC 123\" autoCapitalize=\"characters\" /><FormField label=\"İşletmede kayıtlı telefon\" value={phone} onChangeText={setPhone} keyboardType=\"phone-pad\" /></>}\n        {method === 'tracking' && <><FormField label=\"Plaka\" value={plate} onChangeText={(v) => setPlate(v.toUpperCase())} placeholder=\"06 ABC 123\" autoCapitalize=\"characters\" /><FormField label=\"8 haneli servis takip kodu\" value={code} onChangeText={(v) => setCode(v.toUpperCase())} autoCapitalize=\"characters\" /></>}\n",
    "",
)
replace_required(
    "src/customer/CustomerLinkPanel.tsx",
    "methods: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, method: { width: '48.7%', minHeight: 64, borderWidth: 1, borderRadius: 17, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 8 }, methodText: { flex: 1, fontSize: 12.5, fontWeight: '900' },",
    "methods: { gap: 9 }, method: { width: '100%', minHeight: 84, borderWidth: 1, borderRadius: 19, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11 }, methodIcon: { width: 48, height: 48, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, methodText: { fontSize: 14.5, fontWeight: '900' }, methodSub: { fontSize: 11.5, lineHeight: 15, marginTop: 4 },",
)

# ---------------------------------------------------------------------------
# New service form: modern icon-based customer/motor selection and own mechanic.
# ---------------------------------------------------------------------------
replace_required(
    "src/screens/NewWorkOrderScreen.tsx",
    "import { AnimatedPressable } from '../components/AnimatedPressable';",
    "import { AnimatedMotorcycleIcon } from '../components/AnimatedMotorcycleIcon';\nimport { AnimatedPressable } from '../components/AnimatedPressable';",
)
replace_required(
    "src/screens/NewWorkOrderScreen.tsx",
    """      if (!mechanicId) {
        const firstWorker = nextMembers.find((item: any) => item.role === 'mechanic' || item.role === 'owner_mechanic');
        if (firstWorker) setMechanicId(firstWorker.user_id);
      }
""",
    """      if (membership && WORKER_ROLES.includes(membership.role)) setMechanicId(membership.user_id);
      else if (!mechanicId) {
        const firstWorker = nextMembers.find((item: any) => item.role === 'mechanic' || item.role === 'owner_mechanic');
        if (firstWorker) setMechanicId(firstWorker.user_id);
      }
""",
)
replace_required(
    "src/screens/NewWorkOrderScreen.tsx",
    "  const canChooseWorker = isAdmin || membership?.role === 'owner' || membership?.role === 'owner_mechanic';",
    "  const canChooseWorker = isAdmin || membership?.role === 'owner';",
)
replace_required(
    "src/screens/NewWorkOrderScreen.tsx",
    "<Toggle value={newCustomer} onChange={(value) => { setNewCustomer(value); if (value) { setSelectedCustomerId(null); setSelectedMotorcycleId(null); setNewMotorcycle(true); } }} first=\"Yeni müşteri\" second=\"Kayıtlı müşteri\" />",
    "<Toggle value={newCustomer} onChange={(value) => { setNewCustomer(value); if (value) { setSelectedCustomerId(null); setSelectedMotorcycleId(null); setNewMotorcycle(true); } }} first=\"Yeni müşteri\" second=\"Kayıtlı müşteri\" firstIcon=\"person-add\" secondIcon=\"people\" />",
)
replace_required(
    "src/screens/NewWorkOrderScreen.tsx",
    "<ChipList empty=\"Henüz kayıtlı müşteri yok.\"",
    "<ChipList kind=\"customer\" empty=\"Henüz kayıtlı müşteri yok.\"",
)
replace_required(
    "src/screens/NewWorkOrderScreen.tsx",
    "<Toggle value={newMotorcycle} onChange={setNewMotorcycle} first=\"Yeni motosiklet\" second=\"Kayıtlı motosiklet\" />",
    "<Toggle value={newMotorcycle} onChange={setNewMotorcycle} first=\"Yeni motosiklet\" second=\"Kayıtlı motosiklet\" firstIcon=\"add-circle\" secondIcon=\"speedometer\" />",
)
replace_required(
    "src/screens/NewWorkOrderScreen.tsx",
    "<ChipList empty=\"Bu müşterinin kayıtlı motosikleti yok.\"",
    "<ChipList kind=\"motorcycle\" empty=\"Bu müşterinin kayıtlı motosikleti yok.\"",
)
replace_required(
    "src/screens/NewWorkOrderScreen.tsx",
    """          <ChipList
            empty="Aktif Usta veya İşletme Sahibi + Usta bulunamadı."
""",
    """          <ChipList
            kind="mechanic"
            empty="Aktif Usta veya İşletme Sahibi + Usta bulunamadı."
""",
)
regex_required(
    "src/screens/NewWorkOrderScreen.tsx",
    r"function Toggle\(\{ value, onChange, first, second \}: \{ value: boolean; onChange: \(value: boolean\) => void; first: string; second: string \}\) \{.*?\n\}\n\ntype ChoiceItem",
    """function Toggle({ value, onChange, first, second, firstIcon, secondIcon }: { value: boolean; onChange: (value: boolean) => void; first: string; second: string; firstIcon?: keyof typeof Ionicons.glyphMap; secondIcon?: keyof typeof Ionicons.glyphMap }) {
  const { colors } = useTheme();
  const options = [
    { value: true, label: first, icon: firstIcon },
    { value: false, label: second, icon: secondIcon },
  ];
  return (
    <View style={[styles.toggle, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}>
      {options.map((option) => {
        const active = value === option.value;
        return (
          <AnimatedPressable key={String(option.value)} onPress={() => onChange(option.value)} style={[styles.toggleItem, { backgroundColor: active ? colors.cardStrong : 'transparent', borderColor: active ? `${colors.primary}7A` : 'transparent' }]}>
            {option.icon && <View style={[styles.toggleOptionIcon, { backgroundColor: `${colors.primary}14` }]}><Ionicons name={option.icon} size={18} color={active ? colors.primary : colors.textMuted} /></View>}
            <Text numberOfLines={1} maxFontSizeMultiplier={1.02} style={[styles.toggleText, { color: active ? colors.text : colors.textMuted }]}>{option.label}</Text>
            {active && <View style={[styles.toggleDot, { backgroundColor: colors.primary }]} />}
          </AnimatedPressable>
        );
      })}
    </View>
  );
}

type ChoiceItem""",
    flags=re.S,
)
regex_required(
    "src/screens/NewWorkOrderScreen.tsx",
    r"function ChipList\(\{ items, selected, onSelect, empty \}: \{ items: \{ id: string; label: string; sub: string \}\[\]; selected: string \| null; onSelect: \(id: string\) => void; empty: string \}\) \{.*?\n\}",
    """function ChipList({ items, selected, onSelect, empty, kind = 'customer' }: { items: { id: string; label: string; sub: string }[]; selected: string | null; onSelect: (id: string) => void; empty: string; kind?: 'customer' | 'motorcycle' | 'mechanic' }) {
  const { colors } = useTheme();
  if (items.length === 0) return <Text style={[styles.empty, { color: colors.textMuted }]}>{empty}</Text>;
  const accent = kind === 'motorcycle' ? colors.cyan : kind === 'mechanic' ? colors.orange : colors.primary;
  return <View style={styles.chips}>{items.map((item) => {
    const active = selected === item.id;
    return <AnimatedPressable key={item.id} onPress={() => onSelect(item.id)} style={[styles.chip, { backgroundColor: active ? `${accent}18` : colors.surfaceSoft, borderColor: active ? accent : colors.border }]}>
      <View style={[styles.chipIcon, { backgroundColor: `${accent}14`, borderColor: `${accent}34` }]}>{kind === 'motorcycle' ? <AnimatedMotorcycleIcon size={28} color={accent} /> : <Ionicons name={kind === 'mechanic' ? 'construct' : 'person'} size={21} color={accent} />}</View>
      <View style={styles.chipCopy}><Text style={[styles.chipTitle, { color: colors.text }]}>{item.label}</Text><Text style={[styles.chipSub, { color: colors.textMuted }]}>{item.sub}</Text></View>
      <Ionicons name={active ? 'checkmark-circle' : 'chevron-forward'} size={22} color={active ? accent : colors.textMuted} />
    </AnimatedPressable>;
  })}</View>;
}""",
    flags=re.S,
)
replace_required(
    "src/screens/NewWorkOrderScreen.tsx",
    "toggleItem: { flex: 1, minWidth: 0, minHeight: 46, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },",
    "toggleItem: { flex: 1, minWidth: 0, minHeight: 50, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 8 }, toggleOptionIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },",
)
replace_required(
    "src/screens/NewWorkOrderScreen.tsx",
    "chip: { minHeight: 59, borderRadius: 17, borderWidth: 1, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },",
    "chip: { minHeight: 72, borderRadius: 18, borderWidth: 1, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 10 }, chipIcon: { width: 46, height: 46, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },",
)

# ---------------------------------------------------------------------------
# Work detail: remove diagnosis/internal panel and route delivery to receivables.
# ---------------------------------------------------------------------------
replace_required(
    "src/screens/WorkOrderDetailV04.tsx",
    "import React, { useCallback, useEffect, useMemo, useState } from 'react';",
    "import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';",
)
replace_required(
    "src/screens/WorkOrderDetailV04.tsx",
    "  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ status: true, details: false, price: false, extras: false, services: false, parts: false, notes: false, history: false, receivables: false });\n\n  const [diagnosis, setDiagnosis] = useState('');\n  const [internalNotes, setInternalNotes] = useState('');",
    "  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ status: true, price: false, extras: false, services: false, parts: false, notes: false, history: false, receivables: false });\n  const scrollRef = useRef<ScrollView>(null);",
)
replace_required("src/screens/WorkOrderDetailV04.tsx", "    setDiagnosis(next.diagnosis ?? '');\n    setInternalNotes(next.notes ?? '');\n", "")
replace_required(
    "src/screens/WorkOrderDetailV04.tsx",
    """  const changeStatus = async (status: WorkOrderStatus) => {
    const { error } = await supabase.rpc('update_work_order_status', { p_work_order_id: orderId, p_status: status });
    if (error) return Alert.alert('Durum değiştirilemedi', error.message);
    if (isApprentice) setOrder((current: any) => ({ ...current, status }));
    else await load();
  };
""",
    """  const openReceivableFlow = () => {
    setOpenSections((current) => ({ ...current, receivables: true }));
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 220);
  };

  const changeStatus = async (status: WorkOrderStatus) => {
    const { error } = await supabase.rpc('update_work_order_status', { p_work_order_id: orderId, p_status: status });
    if (error) return Alert.alert('Durum değiştirilemedi', error.message);
    if (isApprentice) setOrder((current: any) => ({ ...current, status }));
    else await load();
    if (status === 'delivered' && !isApprentice) {
      Alert.alert('Motosiklet teslim edildi', 'Şimdi tahsilat, açık borç veya veresiye kaydını kontrol et.', [
        { text: 'Daha Sonra', style: 'cancel' },
        { text: 'Borç ve Tahsilata Git', onPress: openReceivableFlow },
      ]);
    }
  };
""",
)
regex_required(
    "src/screens/WorkOrderDetailV04.tsx",
    r"\n  const saveDetails = \(\) => run\(.*?\n  \);\n",
    "\n",
    flags=re.S,
)
replace_required("src/screens/WorkOrderDetailV04.tsx", "      {!!order.diagnosis && <><Label text=\"TESPİT\" /><Text style={[styles.body, { color: colors.text }]}>{order.diagnosis}</Text></>}\n", "")
regex_required(
    "src/screens/WorkOrderDetailV04.tsx",
    r"\n    <DetailAccordion title=\"Tespit ve Atölye Notu\".*?</DetailAccordion>\n",
    "\n",
    flags=re.S,
)
replace_required(
    "src/screens/WorkOrderDetailV04.tsx",
    "  return <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>",
    "  return <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>",
)

# ---------------------------------------------------------------------------
# Platform charge record detail modal.
# ---------------------------------------------------------------------------
replace_required(
    "src/components/PlatformFeesDashboard.tsx",
    "import { Alert, Image, LayoutAnimation, Linking, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';",
    "import { Alert, Image, LayoutAnimation, Linking, Modal, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';",
)
replace_required(
    "src/components/PlatformFeesDashboard.tsx",
    "type ChargeRow = {\n  id: string;",
    "type ChargeRow = {\n  id: string;\n  work_order_id: string;",
)
replace_required(
    "src/components/PlatformFeesDashboard.tsx",
    """type Dashboard = {
""",
    """type ChargeDetail = {
  charge: { id: string; amount: number; fee_per_order: number; charge_date: string; source_status: string; charged_at?: string | null; voided_at?: string | null };
  work_order: { id: string; status: string; service_type: string; complaint: string; total_amount: number; amount_received: number; remaining_amount: number; payment_status: string; receivable_status: string; arrived_at?: string | null; started_at?: string | null; ready_at?: string | null; delivered_at?: string | null };
  customer: { id: string; full_name: string; phone?: string | null };
  motorcycle: { id: string; brand: string; model: string; plate?: string | null; odometer?: number | null };
  mechanic?: { id?: string | null; full_name?: string | null } | null;
  services: { id: string; title: string; description?: string | null; price: number; completed: boolean }[];
  parts: { id: string; part_name: string; quantity: number; unit_price: number; total_price: number }[];
};

type Dashboard = {
""",
)
replace_required(
    "src/components/PlatformFeesDashboard.tsx",
    "  const [globalNote, setGlobalNote] = useState('');",
    "  const [globalNote, setGlobalNote] = useState('');\n  const [selectedCharge, setSelectedCharge] = useState<ChargeDetail | null>(null);\n  const [chargeDetailLoading, setChargeDetailLoading] = useState<string | null>(null);",
)
replace_required(
    "src/components/PlatformFeesDashboard.tsx",
    "  const saveGlobal = async () => {",
    """  const openChargeDetail = async (chargeId: string) => {
    setChargeDetailLoading(chargeId);
    const { data, error } = await supabase.rpc('platform_get_charge_detail', { p_charge_id: chargeId });
    setChargeDetailLoading(null);
    if (error) return Alert.alert('Ücret kaydı açılamadı', error.message);
    setSelectedCharge(data as ChargeDetail);
  };

  const saveGlobal = async () => {""",
)
replace_required(
    "src/components/PlatformFeesDashboard.tsx",
    "dashboard.charges.map((charge) => <ChargeCard key={charge.id} charge={charge} />)",
    "dashboard.charges.map((charge) => <ChargeCard key={charge.id} charge={charge} loading={chargeDetailLoading === charge.id} onPress={() => openChargeDetail(charge.id)} />)",
)
replace_required(
    "src/components/PlatformFeesDashboard.tsx",
    """    </AccordionSection>
  </View>;
}
""",
    """    </AccordionSection>
    <ChargeDetailModal detail={selectedCharge} onClose={() => setSelectedCharge(null)} />
  </View>;
}
""",
)
regex_required(
    "src/components/PlatformFeesDashboard.tsx",
    r"function ChargeCard\(\{ charge \}: \{ charge: ChargeRow \}\) \{.*?\n\}",
    """function ChargeCard({ charge, onPress, loading }: { charge: ChargeRow; onPress: () => void; loading: boolean }) {
  const { colors } = useTheme();
  return <AnimatedPressable onPress={onPress} style={[styles.chargeCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: charge.voided_at ? 0.55 : 1 }]}>
    <View style={styles.row}><View style={[styles.chargeIcon, { backgroundColor: `${colors.primary}15` }]}><Ionicons name={loading ? 'sync' : 'receipt'} size={21} color={colors.primary} /></View><View style={styles.copy}><Text style={[styles.rowTitle, { color: colors.text }]}>{charge.customer_name} • {charge.plate || 'Plaka yok'}</Text><Text style={[styles.rowMeta, { color: colors.textMuted }]}>{charge.brand} {charge.model} • {dateText(charge.charge_date)} • {charge.source_status}</Text></View><Text style={[styles.rowAmount, { color: charge.voided_at ? colors.textMuted : colors.green }]}>{money(number(charge.amount))}</Text><Ionicons name="chevron-forward" size={20} color={colors.textMuted} /></View>
    <Text style={[styles.note, { color: colors.textSoft }]}>{charge.complaint}</Text>
  </AnimatedPressable>;
}""",
    flags=re.S,
)
replace_required(
    "src/components/PlatformFeesDashboard.tsx",
    "function Metric({ icon, label, value, accent }:",
    """function ChargeDetailModal({ detail, onClose }: { detail: ChargeDetail | null; onClose: () => void }) {
  const { colors } = useTheme();
  if (!detail) return null;
  const order = detail.work_order;
  return <Modal visible animationType="slide" transparent onRequestClose={onClose}>
    <View style={styles.detailOverlay}>
      <View style={[styles.detailModal, { backgroundColor: colors.cardStrong, borderColor: colors.border }]}>
        <View style={styles.detailHeader}><View style={[styles.detailHeaderIcon, { backgroundColor: `${colors.primary}16` }]}><Ionicons name="receipt" size={24} color={colors.primary} /></View><View style={styles.copy}><Text style={[styles.detailTitle, { color: colors.text }]}>İşlem Başı Ücret Detayı</Text><Text style={[styles.rowMeta, { color: colors.textMuted }]}>{detail.motorcycle.brand} {detail.motorcycle.model} • {detail.motorcycle.plate || 'Plaka yok'}</Text></View><AnimatedPressable onPress={onClose}><Ionicons name="close-circle" size={31} color={colors.textMuted} /></AnimatedPressable></View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScroll}>
          <LinearGradient colors={[colors.primary, colors.primary2, colors.cyan]} style={styles.detailHero}><View><Text style={styles.heroEyebrow}>PLATFORM ÜCRETİ</Text><Text style={styles.detailHeroValue}>{money(number(detail.charge.amount))}</Text><Text style={styles.heroSub}>{dateText(detail.charge.charge_date)} • {detail.charge.source_status}</Text></View><Ionicons name="checkmark-done-circle" size={36} color="#fff" /></LinearGradient>
          <GlassCard style={styles.detailCard}><DetailLine icon="person" label="Müşteri" value={detail.customer.full_name} /><DetailLine icon="call" label="Telefon" value={detail.customer.phone || '-'} /><DetailLine icon="construct" label="Usta" value={detail.mechanic?.full_name || 'Atanmamış'} /><DetailLine icon="speedometer" label="Motosiklet" value={`${detail.motorcycle.brand} ${detail.motorcycle.model} • ${detail.motorcycle.plate || 'Plaka yok'}`} /></GlassCard>
          <GlassCard style={styles.detailCard}><Text style={[styles.detailSectionTitle, { color: colors.text }]}>Servis ve Tahsilat</Text><Text style={[styles.note, { color: colors.textSoft }]}>{order.complaint}</Text><View style={styles.periodMetrics}><Mini label="Toplam" value={money(number(order.total_amount))} /><Mini label="Ödenen" value={money(number(order.amount_received))} accent={colors.green} /><Mini label="Kalan" value={money(number(order.remaining_amount))} accent={number(order.remaining_amount) > 0 ? colors.red : colors.green} /></View><DetailLine icon="time" label="Geliş" value={dateTime(order.arrived_at)} /><DetailLine icon="checkmark-circle" label="Teslim" value={dateTime(order.delivered_at || order.ready_at)} /></GlassCard>
          <GlassCard style={styles.detailCard}><Text style={[styles.detailSectionTitle, { color: colors.text }]}>Yapılan İşlemler</Text>{detail.services.length === 0 ? <Text style={[styles.empty, { color: colors.textMuted }]}>İşlem satırı yok.</Text> : detail.services.map((item) => <View key={item.id} style={[styles.detailItem, { borderBottomColor: colors.border }]}><View style={styles.copy}><Text style={[styles.rowTitle, { color: colors.text }]}>{item.title}</Text>{item.description && <Text style={[styles.rowMeta, { color: colors.textMuted }]}>{item.description}</Text>}</View><Text style={[styles.rowAmount, { color: colors.green }]}>{money(number(item.price))}</Text></View>)}</GlassCard>
          <GlassCard style={styles.detailCard}><Text style={[styles.detailSectionTitle, { color: colors.text }]}>Kullanılan Parçalar</Text>{detail.parts.length === 0 ? <Text style={[styles.empty, { color: colors.textMuted }]}>Parça kaydı yok.</Text> : detail.parts.map((item) => <View key={item.id} style={[styles.detailItem, { borderBottomColor: colors.border }]}><View style={styles.copy}><Text style={[styles.rowTitle, { color: colors.text }]}>{item.part_name}</Text><Text style={[styles.rowMeta, { color: colors.textMuted }]}>{number(item.quantity)} adet × {money(number(item.unit_price))}</Text></View><Text style={[styles.rowAmount, { color: colors.text }]}>{money(number(item.total_price))}</Text></View>)}</GlassCard>
        </ScrollView>
      </View>
    </View>
  </Modal>;
}

function DetailLine({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) { const { colors } = useTheme(); return <View style={[styles.detailLine, { borderBottomColor: colors.border }]}><Ionicons name={icon} size={18} color={colors.textMuted} /><View style={styles.copy}><Text style={[styles.miniLabel, { color: colors.textMuted }]}>{label}</Text><Text style={[styles.detailValue, { color: colors.text }]}>{value}</Text></View></View>; }

function Metric({ icon, label, value, accent }:""",
)
replace_required(
    "src/components/PlatformFeesDashboard.tsx",
    "chargeCard: { gap: 8 }, chargeIcon:",
    "chargeCard: { gap: 8, borderWidth: 1, borderRadius: 18, padding: 13 }, chargeIcon:",
)
replace_required(
    "src/components/PlatformFeesDashboard.tsx",
    "  periodCard: { gap: 10 },",
    "  detailOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' }, detailModal: { maxHeight: '91%', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, paddingTop: 14, overflow: 'hidden' }, detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 12 }, detailHeaderIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, detailTitle: { fontSize: 18, fontWeight: '900' }, detailScroll: { paddingHorizontal: 15, paddingBottom: 36, gap: 11 }, detailHero: { minHeight: 125, borderRadius: 23, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, detailHeroValue: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 7 }, detailCard: { gap: 9 }, detailSectionTitle: { fontSize: 16, fontWeight: '900' }, detailLine: { minHeight: 54, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 9 }, detailValue: { fontSize: 13, fontWeight: '800', marginTop: 3 }, detailItem: { minHeight: 58, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 9 },\n  periodCard: { gap: 10 },",
)

# ---------------------------------------------------------------------------
# Version and documentation.
# ---------------------------------------------------------------------------
for file_name in ("package.json", "package-lock.json"):
    data = json.loads(read(file_name))
    data["version"] = "0.8.11"
    if file_name == "package-lock.json" and data.get("packages", {}).get(""):
        data["packages"][""]["version"] = "0.8.11"
    write(file_name, json.dumps(data, ensure_ascii=False, indent=2) + "\n")

app_data = json.loads(read("app.json"))
app_data["expo"]["version"] = "0.8.11"
write("app.json", json.dumps(app_data, ensure_ascii=False, indent=2) + "\n")

replace_required("src/screens/AuthScreen.tsx", "GARAGE OS • v0.8.10 AKILLI SERVİS SİSTEMİ", "GARAGE OS • v0.8.11 AKILLI SERVİS SİSTEMİ")

readme = read("README.md").replace("**Kurulan sürüm:** `v0.8.10`", "**Kurulan sürüm:** `v0.8.11`")
readme = readme.replace("backup/v0.8.9-before-v0.8.10-20260713", "backup/v0.8.10-before-v0.8.11-20260713")
write("README.md", readme)

roadmap = read("docs/ROADMAP.md").replace("Güncel sürüm `v0.8.10`dur.", "Güncel sürüm `v0.8.11`dir.")
if "## v0.8.11" not in roadmap:
    roadmap = roadmap.replace(
        "## v0.9 — Google Play Uyum, Test ve Pilot",
        "## v0.8.11 — Bildirim, Usta İş Akışı ve Platform Borcu ✅\n\n- [x] Eşleştirme talebi bildirimlerini düzeltme ve canlı vurgu\n- [x] Yeni bildirimlerde zil animasyonu\n- [x] Müşteri hesabı ve motor bağlantısı arayüz düzeni\n- [x] İşletme Panelini rapor/ayar kapsamına ayırma\n- [x] Her Ustanın yalnız kendi işlerini görmesi\n- [x] Platform borcunu işletme yerel gününe göre dönemlendirme\n- [x] İşlem başı ücret kaydından servis detayına geçiş\n- [x] Teslim sonrası borç ve tahsilat yönlendirmesi\n\n## v0.9 — Google Play Uyum, Test ve Pilot",
    )
write("docs/ROADMAP.md", roadmap)

write("docs/CHANGELOG_V0.8.11.md", """# DraBornGarage v0.8.11

Tarih: 13 Temmuz 2026

## Bildirimler
- İşletme aramasıyla gönderilen müşteri-motor eşleştirme taleplerinin bildirim üretmeme hatası düzeltildi.
- Eşleştirme talepleri ilgili İşletme Sahibi ve Ustaların Bildirim Merkezine düşer.
- Eşleştirme Talepleri sekmesi, yeni talep açılana kadar değil kullanıcı sekmeye dokunana kadar animasyonlu vurgu gösterir.
- Bildirim zili her yeni okunmamış bildirimde kısa sallanma ve büyüme animasyonu yapar.

## Müşteri hesabı
- Usta Paneline Katıl ve Eşleştirme Geçmişi açılır-kapanır ana kategori oldu.
- Motor bağlantısından Plaka + Telefon ve Takip Kodu yöntemleri kaldırıldı.
- İşletme Ara ve QR / Manuel Kod seçenekleri açıklamalı modern kartlara dönüştürüldü.

## Usta ve İşletme ayrımı
- İşletme Paneli yalnız işletme toplamları, Usta kazançları, raporlar ve ayarlar içindir.
- Servis kabulü ve motosiklet tamir akışı yalnız Usta Panelinde açılır.
- İşletme Sahibi + Usta hesabı Usta görünümünde yalnız kendisine atanmış işleri ve randevuları görür.
- Kayıtlı müşteri ve motosiklet seçim kartları ikonlu hale getirildi.
- Tespit ve Atölye Notu bölümü iş emri detayından kaldırıldı.

## Tahsilat ve platform bedeli
- İşletmenin yerel tarihi kullanılarak yeni platform dönemi oluşturulur; gece yarısı UTC farkı nedeniyle ücretin aktif borca yansımaması düzeltildi.
- İşlem Başı Ücret Kayıtlarına dokunulduğunda müşteri, motosiklet, Usta, servis, parça ve tahsilat detayları açılır.
- Teslim Edildi seçildiğinde Borç, Veresiye ve Tahsilat bölümüne yönlendiren pencere açılır.
""")

write("docs/PROJECT_HANDOFF_V0.8.11.md", """# DraBornGarage — v0.8.11 Devam Dosyası

**Güncel sürüm:** `v0.8.11`  
**Önceki sabit yedek:** `backup/v0.8.10-before-v0.8.11-20260713`  
**Sonraki sürüm:** `v0.9.0`

## Tamamlanan kapsam
- Eşleştirme talebi bildirim hatasının veritabanı trigger katmanında düzeltilmesi.
- Eşleştirme sekmesi ve bildirim zili animasyonları.
- Müşteri hesabındaki Usta katılımı ve eşleştirme geçmişi kategorileri.
- Motor bağlantısında yalnız İşletme Ara ve QR/Manuel Kod yöntemleri.
- İşletme Paneli ile Usta Panelinin görev ayrımı.
- Usta iş ve randevu kapsamının atanmış kullanıcıyla sınırlandırılması.
- Platform ücret döneminin işletme yerel saatine göre oluşturulması.
- Ücret kaydı servis detay penceresi.
- Teslim sonrası Borç/Veresiye/Tahsilat yönlendirmesi.
- Tespit ve Atölye Notu panelinin kaldırılması.

## Canlı veri düzeltmesi
- Piston Garaj için 13–19 Temmuz haftalık dönemi oluşturuldu.
- 13 Temmuz tarihli iki işlem başı ücret kaydı toplam 100 TL aktif platform borcuna bağlandı.
- Mevcut kullanıcı, işletme ve servis kayıtları korunmuştur.

## Doğrulama
- TypeScript kontrolü.
- Android JavaScript bundle kontrolü.
- Platform dönem ve ücret toplamı kontrolü.
- Eşleştirme trigger ve hedef bildirim verisi kontrolü.

## Kurulum
- Yerel yedek: `DraBornGarage-v0.8.10-local-backup`
- Termux komutu: `docs/TERMUX_INSTALL.md`
""")

write("docs/TERMUX_INSTALL.md", """# Termux — v0.8.10 Yedekle, v0.8.11 Kur

```bash
cd ~

KURULAN_SURUM="v0.8.11"
YEDEKLENEN_SURUM="v0.8.10"
YEDEK_KLASORU="$HOME/DraBornGarage-v0.8.10-local-backup"
ZIP_DOSYASI="$HOME/DraBornGarage-v0.8.11.zip"
ACILAN_KLASOR="$HOME/DraBornGarage-main"

printf '\n========================================\n'
printf 'KURULACAK YENİ SÜRÜM: %s\n' "$KURULAN_SURUM"
printf 'YEDEKLENECEK SÜRÜM: %s\n' "$YEDEKLENEN_SURUM"
printf 'YEDEK KLASÖRÜ: %s\n' "$YEDEK_KLASORU"
printf '========================================\n\n'

pkg update -y
pkg install nodejs-lts curl unzip -y
rm -rf "$ACILAN_KLASOR"
rm -f "$ZIP_DOSYASI"

if [ -d "$HOME/DraBornGarage" ]; then
  rm -rf "$YEDEK_KLASORU"
  mv "$HOME/DraBornGarage" "$YEDEK_KLASORU"
  echo "Mevcut v0.8.10 sürümü yedeklendi."
fi

curl -L \
  --retry 10 \
  --retry-delay 3 \
  --connect-timeout 30 \
  --max-time 600 \
  "https://github.com/DrabornEagle/DraBornGarage/archive/refs/heads/main.zip" \
  -o "$ZIP_DOSYASI"

unzip -o "$ZIP_DOSYASI" -d "$HOME"
mv "$ACILAN_KLASOR" "$HOME/DraBornGarage"
rm -f "$ZIP_DOSYASI"

if [ -f "$YEDEK_KLASORU/.env" ]; then
  cp "$YEDEK_KLASORU/.env" "$HOME/DraBornGarage/.env"
else
  cp "$HOME/DraBornGarage/.env.example" "$HOME/DraBornGarage/.env"
fi

cd "$HOME/DraBornGarage"
npm config set registry "https://registry.npmjs.org/"
npm config set fetch-retries 10
npm config set fetch-retry-factor 2
npm config set fetch-retry-mintimeout 20000
npm config set fetch-retry-maxtimeout 120000
npm config set fetch-timeout 300000
npm install --no-audit --no-fund
npm run typecheck
node -p "require('./package.json').version"
npx expo start -c --go
```

Beklenen sürüm: `0.8.11`.

Expo Go bağlantı sorunu olursa:

```bash
cd ~/DraBornGarage
npx expo start -c --tunnel --go
```

Kod yedeği: `backup/v0.8.10-before-v0.8.11-20260713`.
""")

print("v0.8.11 changes prepared")
