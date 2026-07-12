from __future__ import annotations

import json
from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


def replace_required(path: str, before: str, after: str) -> None:
    source = read(path)
    if before not in source:
        raise RuntimeError(f"{path}: target not found\n{before[:240]}")
    write(path, source.replace(before, after, 1))


# Admin must explicitly select a workshop from Admin Panel before workshop-specific areas open.
replace_required(
    "src/context/AuthContext.tsx",
    """    const storedStaffId = preferredWorkshopId ?? await AsyncStorage.getItem(ACTIVE_WORKSHOP_KEY);
    const selectedStaff = nextWorkshops.find((item) => item.id === storedStaffId)
      ?? nextWorkshops.find((item) => item.is_active !== false)
      ?? nextWorkshops[0]
      ?? null;
    if (selectedStaff) await AsyncStorage.setItem(ACTIVE_WORKSHOP_KEY, selectedStaff.id);
    setWorkshop(selectedStaff);
""",
    """    const storedStaffId = preferredWorkshopId ?? await AsyncStorage.getItem(ACTIVE_WORKSHOP_KEY);
    const selectedStaff = admin
      ? (storedStaffId ? nextWorkshops.find((item) => item.id === storedStaffId) ?? null : null)
      : nextWorkshops.find((item) => item.id === storedStaffId)
        ?? nextWorkshops.find((item) => item.is_active !== false)
        ?? nextWorkshops[0]
        ?? null;
    if (selectedStaff) await AsyncStorage.setItem(ACTIVE_WORKSHOP_KEY, selectedStaff.id);
    else if (admin) await AsyncStorage.removeItem(ACTIVE_WORKSHOP_KEY);
    setWorkshop(selectedStaff);
""",
)

# Reports: selection guard, minimalist animated report cards, new title, and remove wage/commission disclaimers.
replace_required(
    "src/components/ReportsDashboard.tsx",
    "import React, { useCallback, useEffect, useMemo, useState } from 'react';\nimport { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';",
    "import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';\nimport { Alert, Animated, ScrollView, StyleSheet, Text, View } from 'react-native';",
)
replace_required(
    "src/components/ReportsDashboard.tsx",
    """  if (membership?.role === 'apprentice') return null;

  return <View style={styles.root}>
""",
    """  if (membership?.role === 'apprentice') return null;

  if (isAdmin && !workshop) return <GlassCard style={styles.selectionGuard}>
    <View style={[styles.selectionGuardIcon, { backgroundColor: `${colors.primary}14`, borderColor: `${colors.primary}38` }]}><Ionicons name=\"business-outline\" size={25} color={colors.primary} /></View>
    <View style={styles.copy}><Text style={[styles.selectionGuardTitle, { color: colors.text }]}>Önce işletme seç</Text><Text style={[styles.selectionGuardText, { color: colors.textMuted }]}>Admin Paneli → İşletmeler bölümünden bir işletme seçtiğinde yalnız o işletmenin raporları ve detayları açılır.</Text></View>
  </GlassCard>;

  return <View style={styles.root}>
""",
)
replace_required(
    "src/components/ReportsDashboard.tsx",
    "<ModeButton active={viewMode === 'personal'} title=\"Kişisel Usta\" subtitle=\"Kendi işlerin ve kayıtların\" icon=\"person\" accent={colors.orange} onPress={() => setViewMode('personal')} />",
    "<ModeButton active={viewMode === 'personal'} title=\"Usta Raporu\" subtitle=\"Kendi işlerin ve kayıtların\" icon=\"person\" accent={colors.orange} onPress={() => setViewMode('personal')} />",
)
replace_required(
    "src/components/ReportsDashboard.tsx",
    """    <Text style={[styles.listTitle, { color: colors.text }]}>Usta Bazlı İş ve Tutar</Text>
    <Text style={[styles.listSubtitle, { color: colors.textMuted }]}>Bu rakamlar maaş, prim, yüzde veya ortaklık payı değildir; yalnız ustanın işlem satırlarına kaydedilen tutardır.</Text>
    <View style={styles.stack}>{report.mechanics.length === 0 ? <Empty text=\"Usta kaydı bulunamadı.\" /> : report.mechanics.map((item) => <MechanicCard key={item.user_id} item={item} />)}</View>
""",
    """    <Text style={[styles.listTitle, { color: colors.text }]}>Usta Bazlı İş ve Tutar</Text>
    <View style={styles.stack}>{report.mechanics.length === 0 ? <Empty text=\"Usta kaydı bulunamadı.\" /> : report.mechanics.map((item) => <MechanicCard key={item.user_id} item={item} />)}</View>
""",
)
replace_required(
    "src/components/ReportsDashboard.tsx",
    """    <GlassCard><Text style={[styles.disclaimer, { color: colors.textMuted }]}>Kayıtlı işlem tutarı maaş, komisyon, prim, net kâr veya ortaklık payı değildir. Nakit ve IBAN kartları yalnız senin sisteme tahsil eden kişi olarak kaydedildiğin ödemeleri gösterir.</Text></GlassCard>

""",
    "",
)
replace_required(
    "src/components/ReportsDashboard.tsx",
    """function ModeButton({ active, title, subtitle, icon, accent, onPress }: { active: boolean; title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap; accent: string; onPress: () => void }) {
  const { colors } = useTheme();
  return <AnimatedPressable onPress={onPress} style={[styles.modeButton, { backgroundColor: colors.card, borderColor: active ? accent : colors.border, shadowColor: accent }, active && styles.modeButtonActive]}>
    {active && <LinearGradient colors={[`${accent}30`, `${colors.primary}18`]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />}
    <View style={[styles.modeIconShell, { backgroundColor: `${accent}${active ? '26' : '12'}`, borderColor: `${accent}${active ? '70' : '28'}` }]}><Ionicons name={icon} size={23} color={active ? accent : colors.textMuted} /></View>
    <View style={styles.modeCopy}><Text numberOfLines={1} style={[styles.modeTitle, { color: active ? colors.text : colors.textMuted }]}>{title}</Text><Text numberOfLines={2} style={[styles.modeSubtitle, { color: active ? colors.textSoft : colors.textMuted }]}>{subtitle}</Text></View>
    <View style={[styles.modeState, { backgroundColor: active ? accent : `${colors.textMuted}16`, borderColor: active ? accent : colors.border }]}><Ionicons name={active ? 'checkmark' : 'chevron-forward'} size={15} color={active ? '#08111F' : colors.textMuted} /></View>
  </AnimatedPressable>;
}
""",
    """function ModeButton({ active, title, subtitle, icon, accent, onPress }: { active: boolean; title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap; accent: string; onPress: () => void }) {
  const { colors } = useTheme();
  const progress = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(progress, { toValue: active ? 1 : 0, duration: 220, useNativeDriver: true }).start();
  }, [active, progress]);
  const markerScale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });
  return <AnimatedPressable onPress={onPress} style={[styles.modeButton, { backgroundColor: colors.card, borderColor: active ? accent : colors.border }]}>
    <Animated.View pointerEvents=\"none\" style={[StyleSheet.absoluteFill, { backgroundColor: `${accent}0E`, opacity: progress }]} />
    <Animated.View style={[styles.modeActiveRail, { backgroundColor: accent, opacity: progress, transform: [{ scaleX: progress }] }]} />
    <View style={[styles.modeIconShell, { backgroundColor: `${accent}${active ? '18' : '0B'}`, borderColor: `${accent}${active ? '58' : '22'}` }]}><Ionicons name={icon} size={22} color={active ? accent : colors.textMuted} /></View>
    <View style={styles.modeCopy}><Text numberOfLines={1} style={[styles.modeTitle, { color: active ? colors.text : colors.textMuted }]}>{title}</Text><Text numberOfLines={2} style={[styles.modeSubtitle, { color: active ? colors.textSoft : colors.textMuted }]}>{subtitle}</Text></View>
    <Animated.View style={[styles.modeState, { backgroundColor: active ? accent : 'transparent', borderColor: active ? accent : colors.border, transform: [{ scale: markerScale }] }]}><Ionicons name={active ? 'checkmark' : 'chevron-forward'} size={15} color={active ? '#08111F' : colors.textMuted} /></Animated.View>
  </AnimatedPressable>;
}
""",
)
replace_required(
    "src/components/ReportsDashboard.tsx",
    """  modeSwitch: { flexDirection: 'row', gap: 10 }, modeButton: { flex: 1, minWidth: 0, minHeight: 122, borderRadius: 22, borderWidth: 1, padding: 13, overflow: 'hidden', shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 3 }, modeButtonActive: { shadowOpacity: 0.28, elevation: 8 }, modeIconShell: { width: 45, height: 45, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, modeCopy: { marginTop: 10, paddingRight: 24 }, modeTitle: { fontSize: 14.5, fontWeight: '900' }, modeSubtitle: { fontSize: 11.5, lineHeight: 15, marginTop: 4 }, modeState: { position: 'absolute', right: 11, top: 11, width: 27, height: 27, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
""",
    """  selectionGuard: { minHeight: 104, flexDirection: 'row', alignItems: 'center', gap: 12 }, selectionGuardIcon: { width: 52, height: 52, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, selectionGuardTitle: { fontSize: 16, fontWeight: '900' }, selectionGuardText: { fontSize: 12.5, lineHeight: 18, marginTop: 4 },
  modeSwitch: { flexDirection: 'row', gap: 10 }, modeButton: { flex: 1, minWidth: 0, minHeight: 110, borderRadius: 19, borderWidth: 1, padding: 13, overflow: 'hidden' }, modeActiveRail: { position: 'absolute', left: 17, right: 17, bottom: 0, height: 3, borderRadius: 999 }, modeIconShell: { width: 43, height: 43, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, modeCopy: { marginTop: 9, paddingRight: 23 }, modeTitle: { fontSize: 14.5, fontWeight: '900' }, modeSubtitle: { fontSize: 11.5, lineHeight: 15, marginTop: 4 }, modeState: { position: 'absolute', right: 11, top: 11, width: 27, height: 27, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
""",
)

# Settings: turn four long sections into compact collapsible main categories.
replace_required(
    "src/screens/SettingsScreen.tsx",
    "type ThemeOption = { value: ThemeMode; title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap; preview: [string, string] };",
    "type ThemeOption = { value: ThemeMode; title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap; preview: [string, string] };\ntype SettingsSection = 'themes' | 'demo' | 'business' | 'app';",
)
replace_required(
    "src/screens/SettingsScreen.tsx",
    """  const [demo, setDemo] = useState<DemoStatus>(EMPTY_DEMO);
  const [loading, setLoading] = useState(false);
""",
    """  const [demo, setDemo] = useState<DemoStatus>(EMPTY_DEMO);
  const [loading, setLoading] = useState(false);
  const [openSection, setOpenSection] = useState<SettingsSection | null>(null);
  const toggleSection = (section: SettingsSection) => setOpenSection((current) => current === section ? null : section);
""",
)
replace_required(
    "src/screens/SettingsScreen.tsx",
    """    <Text style={[styles.sectionTitle, { color: colors.text }]}>Garaj Temaları</Text>
    <View style={styles.themeList}>{THEMES.map((item) => { const active = mode === item.value; return <AnimatedPressable key={item.value} onPress={() => setMode(item.value)} style={[styles.theme, { backgroundColor: active ? `${colors.primary}14` : colors.card, borderColor: active ? colors.primary : colors.border }]}><LinearGradient colors={item.preview} style={styles.preview}><Ionicons name={item.icon} size={22} color=\"#fff\" /></LinearGradient><View style={styles.copy}><Text style={[styles.themeTitle, { color: colors.text }]}>{item.title}</Text><Text style={[styles.themeSub, { color: colors.textMuted }]}>{item.subtitle}</Text></View><Ionicons name={active ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={active ? colors.primary : colors.textMuted} /></AnimatedPressable>; })}</View>

    {isOwner && <><Text style={[styles.sectionTitle, { color: colors.text }]}>Test Atölyesi</Text><GlassCard style={styles.demoCard}><View style={styles.demoHeader}><Ionicons name=\"flask\" size={28} color={demo.active ? colors.green : colors.orange} /><View style={styles.copy}><Text style={[styles.demoTitle, { color: colors.text }]}>Geçici v0.8 Test Verileri</Text><Text style={[styles.demoText, { color: colors.textMuted }]}>{demo.customer_count} müşteri • {demo.work_order_count} servis • {(demo.workshop_count ?? 0) + (demo.active ? 1 : 0)} işletme • Bildirim örnekleri</Text></View></View>{demo.active ? <PrimaryButton title=\"Demo Verilerini Temizle\" onPress={clearDemo} loading={loading} secondary /> : <PrimaryButton title=\"v0.8 Test Verilerini Yükle\" onPress={createDemo} loading={loading} />}</GlassCard></>}

    <Text style={[styles.sectionTitle, { color: colors.text }]}>İşletme ve Randevu</Text>
    <GlassCard style={styles.info}><Info icon=\"business\" label=\"İşletme\" value={workshop?.name || '-'} /><Info icon=\"calendar\" label=\"Randevu sistemi\" value={workshop?.appointments_enabled === false ? 'Kapalı' : 'Açık'} /><Info icon=\"checkmark-done\" label=\"Müşteri talebi\" value={workshop?.appointment_auto_confirm ? 'Otomatik onay' : 'Usta onayı'} /><Info icon=\"today\" label=\"Rezervasyon ufku\" value={`${workshop?.appointment_booking_days ?? 30} gün`} /><Info icon=\"time\" label=\"Minimum bildirim\" value={`${workshop?.appointment_min_notice_minutes ?? 60} dakika`} /></GlassCard>

    <Text style={[styles.sectionTitle, { color: colors.text }]}>Uygulama</Text>
    <GlassCard style={styles.info}><Info icon=\"layers\" label=\"Sürüm\" value=\"v0.8.9 • Ankara Demo, Rapor ve Okunabilirlik\" /><Info icon=\"notifications\" label=\"Bildirim motoru\" value=\"Canlı uygulama içi + yerel telefon hatırlatması\" /><Info icon=\"archive\" label=\"Bu sürüm öncesi yedek\" value=\"backup/v0.8.8-before-v0.8.9-20260712\" /><Info icon=\"refresh\" label=\"Geri alma\" value=\"Kod yedeğiyle v0.8.8\" /><Info icon=\"phone-portrait\" label=\"Test yöntemi\" value=\"Expo Go • SDK 54 • Yerel bildirim\" /><Info icon=\"cube\" label=\"APK/AAB ve uzaktan push\" value=\"v1.0 geliştirme yapısı\" /></GlassCard>
""",
    """    <SettingsAccordion title=\"Garaj Temaları\" subtitle={`${THEMES.length} görünüm • ${THEMES.find((item) => item.value === mode)?.title ?? 'Otomatik'}`} icon=\"color-palette\" accent={colors.primary} open={openSection === 'themes'} onToggle={() => toggleSection('themes')}>
      <View style={styles.themeList}>{THEMES.map((item) => { const active = mode === item.value; return <AnimatedPressable key={item.value} onPress={() => setMode(item.value)} style={[styles.theme, { backgroundColor: active ? `${colors.primary}14` : colors.card, borderColor: active ? colors.primary : colors.border }]}><LinearGradient colors={item.preview} style={styles.preview}><Ionicons name={item.icon} size={22} color=\"#fff\" /></LinearGradient><View style={styles.copy}><Text style={[styles.themeTitle, { color: colors.text }]}>{item.title}</Text><Text style={[styles.themeSub, { color: colors.textMuted }]}>{item.subtitle}</Text></View><Ionicons name={active ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={active ? colors.primary : colors.textMuted} /></AnimatedPressable>; })}</View>
    </SettingsAccordion>

    {isOwner && <SettingsAccordion title=\"Test Atölyesi\" subtitle={demo.active ? `${demo.customer_count} müşteri • ${demo.work_order_count} servis` : 'Geçici test verileri kapalı'} icon=\"flask\" accent={demo.active ? colors.green : colors.orange} open={openSection === 'demo'} onToggle={() => toggleSection('demo')}>
      <GlassCard style={styles.demoCard}><View style={styles.demoHeader}><Ionicons name=\"flask\" size={28} color={demo.active ? colors.green : colors.orange} /><View style={styles.copy}><Text style={[styles.demoTitle, { color: colors.text }]}>Geçici v0.8 Test Verileri</Text><Text style={[styles.demoText, { color: colors.textMuted }]}>{demo.customer_count} müşteri • {demo.work_order_count} servis • {(demo.workshop_count ?? 0) + (demo.active ? 1 : 0)} işletme • Bildirim örnekleri</Text></View></View>{demo.active ? <PrimaryButton title=\"Demo Verilerini Temizle\" onPress={clearDemo} loading={loading} secondary /> : <PrimaryButton title=\"v0.8 Test Verilerini Yükle\" onPress={createDemo} loading={loading} />}</GlassCard>
    </SettingsAccordion>}

    <SettingsAccordion title=\"İşletme ve Randevu\" subtitle={workshop?.name || 'Aktif işletme seçilmedi'} icon=\"business\" accent={colors.cyan} open={openSection === 'business'} onToggle={() => toggleSection('business')}>
      <GlassCard style={styles.info}><Info icon=\"business\" label=\"İşletme\" value={workshop?.name || '-'} /><Info icon=\"calendar\" label=\"Randevu sistemi\" value={workshop?.appointments_enabled === false ? 'Kapalı' : 'Açık'} /><Info icon=\"checkmark-done\" label=\"Müşteri talebi\" value={workshop?.appointment_auto_confirm ? 'Otomatik onay' : 'Usta onayı'} /><Info icon=\"today\" label=\"Rezervasyon ufku\" value={`${workshop?.appointment_booking_days ?? 30} gün`} /><Info icon=\"time\" label=\"Minimum bildirim\" value={`${workshop?.appointment_min_notice_minutes ?? 60} dakika`} /></GlassCard>
    </SettingsAccordion>

    <SettingsAccordion title=\"Uygulama\" subtitle=\"v0.8.10 • sürüm ve sistem bilgileri\" icon=\"information-circle\" accent={colors.green} open={openSection === 'app'} onToggle={() => toggleSection('app')}>
      <GlassCard style={styles.info}><Info icon=\"layers\" label=\"Sürüm\" value=\"v0.8.10 • Admin Rapor ve Ayarlar Düzeni\" /><Info icon=\"notifications\" label=\"Bildirim motoru\" value=\"Canlı uygulama içi + yerel telefon hatırlatması\" /><Info icon=\"archive\" label=\"Bu sürüm öncesi yedek\" value=\"backup/v0.8.9-before-v0.8.10-20260713\" /><Info icon=\"refresh\" label=\"Geri alma\" value=\"Kod yedeğiyle v0.8.9\" /><Info icon=\"phone-portrait\" label=\"Test yöntemi\" value=\"Expo Go • SDK 54 • Yerel bildirim\" /><Info icon=\"cube\" label=\"APK/AAB ve uzaktan push\" value=\"v1.0 geliştirme yapısı\" /></GlassCard>
    </SettingsAccordion>
""",
)
replace_required(
    "src/screens/SettingsScreen.tsx",
    """function Info({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) { const { colors } = useTheme(); return <View style={[styles.infoRow, { borderBottomColor: colors.border }]}><Ionicons name={icon} size={20} color={colors.textMuted} /><View style={styles.copy}><Text style={[styles.infoLabel, { color: colors.textMuted }]}>{label}</Text><Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text></View></View>; }
""",
    """function SettingsAccordion({ title, subtitle, icon, accent, open, onToggle, children }: { title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap; accent: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  const { colors } = useTheme();
  return <View style={[styles.settingsAccordion, { backgroundColor: colors.card, borderColor: open ? `${accent}58` : colors.border }]}>
    <AnimatedPressable onPress={onToggle} style={styles.settingsAccordionHeader}>
      <View style={[styles.settingsAccordionIcon, { backgroundColor: `${accent}14`, borderColor: `${accent}34` }]}><Ionicons name={icon} size={22} color={accent} /></View>
      <View style={styles.copy}><Text style={[styles.settingsAccordionTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.settingsAccordionSubtitle, { color: colors.textMuted }]}>{subtitle}</Text></View>
      <View style={[styles.settingsAccordionChevron, { borderColor: open ? `${accent}58` : colors.border }]}><Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={open ? accent : colors.textMuted} /></View>
    </AnimatedPressable>
    {open && <View style={[styles.settingsAccordionBody, { borderTopColor: colors.border }]}>{children}</View>}
  </View>;
}

function Info({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) { const { colors } = useTheme(); return <View style={[styles.infoRow, { borderBottomColor: colors.border }]}><Ionicons name={icon} size={20} color={colors.textMuted} /><View style={styles.copy}><Text style={[styles.infoLabel, { color: colors.textMuted }]}>{label}</Text><Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text></View></View>; }
""",
)
replace_required(
    "src/screens/SettingsScreen.tsx",
    """  content: { paddingHorizontal: 18, paddingTop: 56, paddingBottom: 120, gap: 15 }, profile: { flexDirection: 'row', alignItems: 'center', gap: 11 }, avatar: { width: 54, height: 54, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: '#fff', fontSize: 21, fontWeight: '900' }, copy: { flex: 1, minWidth: 0 }, name: { fontSize: 17, fontWeight: '900' }, meta: { fontSize: 12.5, marginTop: 4 }, modeCard: { minHeight: 80, borderWidth: 1, borderRadius: 21, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 }, modeIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, modeTitle: { fontSize: 14, fontWeight: '900' }, modeText: { fontSize: 12, lineHeight: 16, marginTop: 4 }, sectionTitle: { fontSize: 18, fontWeight: '900', marginTop: 3 }, themeList: { gap: 9 }, theme: { minHeight: 79, borderWidth: 1, borderRadius: 20, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 11 }, preview: { width: 55, height: 55, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }, themeTitle: { fontSize: 14, fontWeight: '900' }, themeSub: { fontSize: 12, marginTop: 4 }, demoCard: { gap: 13 }, demoHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 }, demoTitle: { fontSize: 16, fontWeight: '900' }, demoText: { fontSize: 12.5, marginTop: 4 }, info: { paddingVertical: 2, paddingHorizontal: 14 }, infoRow: { minHeight: 65, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 11 }, infoLabel: { fontSize: 11, fontWeight: '900' }, infoValue: { fontSize: 13, fontWeight: '800', marginTop: 4 }, logout: { minHeight: 54, borderWidth: 1, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, logoutText: { fontSize: 13, fontWeight: '900' },
""",
    """  content: { paddingHorizontal: 18, paddingTop: 56, paddingBottom: 120, gap: 15 }, profile: { flexDirection: 'row', alignItems: 'center', gap: 11 }, avatar: { width: 54, height: 54, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: '#fff', fontSize: 21, fontWeight: '900' }, copy: { flex: 1, minWidth: 0 }, name: { fontSize: 17, fontWeight: '900' }, meta: { fontSize: 12.5, marginTop: 4 }, modeCard: { minHeight: 80, borderWidth: 1, borderRadius: 21, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 }, modeIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, modeTitle: { fontSize: 14, fontWeight: '900' }, modeText: { fontSize: 12, lineHeight: 16, marginTop: 4 }, settingsAccordion: { borderWidth: 1, borderRadius: 22, overflow: 'hidden' }, settingsAccordionHeader: { minHeight: 82, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11 }, settingsAccordionIcon: { width: 48, height: 48, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, settingsAccordionTitle: { fontSize: 16, fontWeight: '900' }, settingsAccordionSubtitle: { fontSize: 12, lineHeight: 16, marginTop: 4 }, settingsAccordionChevron: { width: 38, height: 38, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, settingsAccordionBody: { borderTopWidth: 1, padding: 12, gap: 10 }, themeList: { gap: 9 }, theme: { minHeight: 79, borderWidth: 1, borderRadius: 20, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 11 }, preview: { width: 55, height: 55, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }, themeTitle: { fontSize: 14, fontWeight: '900' }, themeSub: { fontSize: 12, marginTop: 4 }, demoCard: { gap: 13 }, demoHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 }, demoTitle: { fontSize: 16, fontWeight: '900' }, demoText: { fontSize: 12.5, marginTop: 4 }, info: { paddingVertical: 2, paddingHorizontal: 14 }, infoRow: { minHeight: 65, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 11 }, infoLabel: { fontSize: 11, fontWeight: '900' }, infoValue: { fontSize: 13, fontWeight: '800', marginTop: 4 }, logout: { minHeight: 54, borderWidth: 1, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, logoutText: { fontSize: 13, fontWeight: '900' },
""",
)

# Visible version badge.
replace_required("src/screens/AuthScreen.tsx", "GARAGE OS • v0.8.9 AKILLI SERVİS SİSTEMİ", "GARAGE OS • v0.8.10 AKILLI SERVİS SİSTEMİ")

# Versions.
for file_name in ("package.json", "package-lock.json"):
    data = json.loads(read(file_name))
    data["version"] = "0.8.10"
    if file_name == "package-lock.json" and data.get("packages", {}).get(""):
        data["packages"][""]["version"] = "0.8.10"
    write(file_name, json.dumps(data, ensure_ascii=False, indent=2) + "\n")

app_data = json.loads(read("app.json"))
app_data["expo"]["version"] = "0.8.10"
write("app.json", json.dumps(app_data, ensure_ascii=False, indent=2) + "\n")

readme = read("README.md")
readme = readme.replace("**Kurulan sürüm:** `v0.8.9`", "**Kurulan sürüm:** `v0.8.10`")
readme = readme.replace("backup/v0.8.8-before-v0.8.9-20260712", "backup/v0.8.9-before-v0.8.10-20260713")
write("README.md", readme)

roadmap = read("docs/ROADMAP.md")
roadmap = roadmap.replace("Güncel sürüm `v0.8.9`dür.", "Güncel sürüm `v0.8.10`dur.")
if "## v0.8.10" not in roadmap:
    roadmap = roadmap.replace(
        "## v0.9 — Google Play Uyum, Test ve Pilot",
        "## v0.8.10 — Admin Rapor ve Ayarlar Düzeni ✅\n\n- [x] Admin için açık işletme seçimi zorunluluğu\n- [x] Minimalist animasyonlu İşletme/Usta rapor kartları\n- [x] Maaş ve komisyon bilgilendirme kartlarını kaldırma\n- [x] Ayarlar ana kategorilerini açılır-kapanır yapma\n- [x] Kullanıcı ve operasyon verilerini sıfırlama\n- [x] Ana e-posta için otomatik Admin kuralını doğrulama\n\n## v0.9 — Google Play Uyum, Test ve Pilot",
    )
write("docs/ROADMAP.md", roadmap)

write(
    "docs/CHANGELOG_V0.8.10.md",
    """# DraBornGarage v0.8.10

Tarih: 13 Temmuz 2026

## Admin rapor erişimi
- Admin hesabı için otomatik ilk işletme seçimi kaldırıldı.
- Admin yalnız Admin Paneli içindeki İşletmeler listesinden seçim yaptıktan sonra seçili işletmenin raporlarını ve detaylarını görebilir.
- İşletme seçilmediyse Rapor Merkezi açık bir seçim uyarısı gösterir.

## Rapor görünümü
- İşletme Raporu ve Usta Raporu kartları gölge/glow kullanılmadan minimalist hale getirildi.
- Aktif seçim ince alt çizgi, sınır, sade renk yüzeyi ve kısa geçiş animasyonuyla vurgulanır.
- Kişisel Usta adı Usta Raporu olarak değiştirildi.
- Maaş, komisyon, prim ve ortaklık payı bilgilendirme kartları kaldırıldı.

## Ayarlar
- Garaj Temaları, Test Atölyesi, İşletme ve Randevu ve Uygulama bölümleri açılır-kapanır ana kategorilere dönüştürüldü.
- Kategoriler kapalıyken güncel durum özeti gösterir.

## Veri temizliği
- Kullanıcılar, işletmeler ve operasyon kayıtları sıfırlandı.
- Platformun genel banka/ödeme ayarı korundu.
- draborneagle@gmail.com yeniden kayıt olduğunda otomatik Admin olur.
""",
)

write(
    "docs/PROJECT_HANDOFF_V0.8.10.md",
    """# DraBornGarage — v0.8.10 Devam Dosyası

**Güncel sürüm:** `v0.8.10`  
**Önceki sabit yedek:** `backup/v0.8.9-before-v0.8.10-20260713`  
**Sonraki sürüm:** `v0.9.0`

## Tamamlanan kapsam
- Admin hesabında işletme raporları için Admin Panelinden açık işletme seçimi zorunluluğu.
- Minimalist ve animasyonlu İşletme Raporu / Usta Raporu kartları.
- Maaş, komisyon ve prim açıklamalarının kaldırılması.
- Ayarlardaki dört büyük bölümün açılır-kapanır kategori olması.
- Kullanıcı, işletme ve operasyon kayıtlarının temizlenmesi.
- draborneagle@gmail.com otomatik Admin kuralının korunması ve doğrulanması.

## Veri durumu
- Auth kullanıcıları: 0
- Profiller: 0
- İşletmeler: 0
- İş emirleri ve randevular: 0
- Genel platform ödeme ayarı korunmuştur.

## Doğrulama
- TypeScript kontrolü.
- Android JavaScript bundle kontrolü.
- Supabase veri sayıları ve Admin trigger kontrolü.

## Kurulum
- Yerel yedek: `DraBornGarage-v0.8.9-local-backup`
- Termux komutu: `docs/TERMUX_INSTALL.md`
""",
)

write(
    "docs/DATA_RESET_V0.8.10.md",
    """# DraBornGarage v0.8.10 — Veri Sıfırlama Kaydı

13 Temmuz 2026 tarihinde kullanıcının açık talebiyle canlı Supabase projesindeki kullanıcı ve operasyon verileri temizlendi.

Temizlenen kapsam:
- Auth kullanıcıları ve profiller
- İşletmeler ve personel üyelikleri
- İşletme/Usta başvuruları
- Müşteri ve motosiklet kayıtları
- İş emirleri, işlem satırları, parçalar ve ödemeler
- Randevular, alacak kayıtları ve bildirimler
- Platform dönem/işlem ücret hareketleri

Korunan kapsam:
- Şema ve migration geçmişi
- RLS politikaları ve RPC fonksiyonları
- Genel platform banka/ödeme ayarı
- draborneagle@gmail.com otomatik Admin kuralı

Bu belge çalıştırılabilir migration değildir; canlı bakım işleminin denetim kaydıdır.
""",
)

write(
    "docs/TERMUX_INSTALL.md",
    """# Termux — v0.8.9 Yedekle, v0.8.10 Kur

```bash
cd ~

KURULAN_SURUM="v0.8.10"
YEDEKLENEN_SURUM="v0.8.9"
YEDEK_KLASORU="$HOME/DraBornGarage-v0.8.9-local-backup"
ZIP_DOSYASI="$HOME/DraBornGarage-v0.8.10.zip"
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
  echo "Mevcut v0.8.9 sürümü yedeklendi."
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
  echo ".env dosyası yedekten aktarıldı."
else
  cp "$HOME/DraBornGarage/.env.example" "$HOME/DraBornGarage/.env"
  echo "Yeni .env dosyası oluşturuldu."
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

Beklenen sürüm: `0.8.10`.

Bağlantı sorunu olursa:

```bash
cd ~/DraBornGarage
npx expo start -c --tunnel --go
```

Kod yedeği: `backup/v0.8.9-before-v0.8.10-20260713`.
""",
)

print("v0.8.10 changes prepared")
