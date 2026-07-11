import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const write = (file, content) => fs.writeFileSync(path.join(root, file), content);

function replaceOnce(file, before, after) {
  const source = read(file);
  let index = source.indexOf(before);
  if (index < 0 && before.startsWith('  ')) {
    before = before.slice(2);
    index = source.indexOf(before);
  }
  if (index < 0) {
    if (source.includes(after)) return;
    throw new Error(`${file}: target not found: ${before.slice(0, 180)}`);
  }
  if (source.indexOf(before, index + before.length) >= 0) throw new Error(`${file}: target is not unique`);
  write(file, source.slice(0, index) + after + source.slice(index + before.length));
}

// ---------------- Appointments: future-only primary calendar, attention center, and history ----------------
replaceOnce(
  'src/screens/AppointmentsScreen.tsx',
  `import React, { useCallback, useEffect, useMemo, useState } from 'react';\nimport { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';`,
  `import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';\nimport { Alert, Animated, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';`,
);
replaceOnce(
  'src/screens/AppointmentsScreen.tsx',
  `  const [refreshing, setRefreshing] = useState(false);\n  const [editing, setEditing] = useState<Appointment | null>(null);\n\n  const dates = useMemo(() => daysFromToday(21, -7), []);`,
  `  const [refreshing, setRefreshing] = useState(false);\n  const [editing, setEditing] = useState<Appointment | null>(null);\n  const [attentionAppointments, setAttentionAppointments] = useState<Appointment[]>([]);\n  const [historyAppointments, setHistoryAppointments] = useState<Appointment[]>([]);\n  const [showHistory, setShowHistory] = useState(false);\n\n  const dates = useMemo(() => daysFromToday(30), []);`,
);
replaceOnce(
  'src/screens/AppointmentsScreen.tsx',
  `  useEffect(() => { loadBase(); }, [loadBase]);\n  useEffect(() => { loadAppointments(); }, [loadAppointments]);`,
  `  const loadAttention = useCallback(async () => {\n    if (!workshop) return;\n    const from = new Date(); from.setHours(0, 0, 0, 0);\n    const to = new Date(from); to.setDate(to.getDate() + 90);\n    const { data, error } = await supabase.rpc('staff_get_appointments', {\n      p_workshop_id: workshop.id, p_from: from.toISOString(), p_to: to.toISOString(), p_mechanic_id: filterMechanic,\n    });\n    if (error) return;\n    const next = ((data as Appointment[] | null) ?? [])\n      .filter((item) => item.source === 'customer' && item.status === 'pending')\n      .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));\n    setAttentionAppointments(next);\n  }, [workshop, filterMechanic]);\n\n  const loadHistory = useCallback(async () => {\n    if (!workshop) return;\n    const to = new Date(); to.setHours(0, 0, 0, 0);\n    const from = new Date(to); from.setDate(from.getDate() - 365);\n    const { data, error } = await supabase.rpc('staff_get_appointments', {\n      p_workshop_id: workshop.id, p_from: from.toISOString(), p_to: to.toISOString(), p_mechanic_id: filterMechanic,\n    });\n    if (error) return;\n    setHistoryAppointments((((data as Appointment[] | null) ?? []).sort((a, b) => +new Date(b.scheduled_start) - +new Date(a.scheduled_start))));\n  }, [workshop, filterMechanic]);\n\n  useEffect(() => { loadBase(); }, [loadBase]);\n  useEffect(() => { loadAppointments(); }, [loadAppointments]);\n  useEffect(() => { loadAttention(); }, [loadAttention]);\n  useEffect(() => { loadHistory(); }, [loadHistory]);\n\n  useEffect(() => {\n    if (!workshop?.id) return;\n    const channel = supabase.channel(\`staff-appointments-${'${workshop.id}'}\`)\n      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: \`workshop_id=eq.${'${workshop.id}'}\` }, () => {\n        loadAppointments(); loadAttention(); loadHistory();\n      })\n      .subscribe();\n    return () => { supabase.removeChannel(channel); };\n  }, [workshop?.id, loadAppointments, loadAttention, loadHistory]);`,
);
replaceOnce(
  'src/screens/AppointmentsScreen.tsx',
  `  const refresh = async () => { setRefreshing(true); await Promise.all([loadBase(), loadAppointments()]); setRefreshing(false); };`,
  `  const refresh = async () => { setRefreshing(true); await Promise.all([loadBase(), loadAppointments(), loadAttention(), loadHistory()]); setRefreshing(false); };`,
);
replaceOnce(
  'src/screens/AppointmentsScreen.tsx',
  `      isOwner={isOwner} stats={stats} appointments={appointments} reload={loadAppointments} onEdit={openEdit}\n    />`,
  `      isOwner={isOwner} stats={stats} appointments={appointments} reload={async () => { await Promise.all([loadAppointments(), loadAttention(), loadHistory()]); }} onEdit={openEdit}\n      attentionAppointments={attentionAppointments} historyAppointments={historyAppointments} showHistory={showHistory} setShowHistory={setShowHistory}\n    />`,
);
replaceOnce(
  'src/screens/AppointmentsScreen.tsx',
  `      onSaved={async () => { setEditing(null); setTab('calendar'); await loadAppointments(); }} onCancel={() => { setEditing(null); setTab('calendar'); }}`, 
  `      onSaved={async () => { setEditing(null); setTab('calendar'); await Promise.all([loadAppointments(), loadAttention(), loadHistory()]); }} onCancel={() => { setEditing(null); setTab('calendar'); }}`,
);
replaceOnce(
  'src/screens/AppointmentsScreen.tsx',
  `function CalendarTab({ dates, date, setDate, mechanics, filterMechanic, setFilterMechanic, isOwner, stats, appointments, reload, onEdit }: {\n  dates: Date[]; date: Date; setDate: (d: Date) => void; mechanics: AppointmentMechanic[]; filterMechanic: string | null; setFilterMechanic: (id: string | null) => void; isOwner: boolean;\n  stats: { total: number; pending: number; confirmed: number; arrived: number }; appointments: Appointment[]; reload: () => Promise<void>; onEdit: (item: Appointment) => void;\n}) {`,
  `function CalendarTab({ dates, date, setDate, mechanics, filterMechanic, setFilterMechanic, isOwner, stats, appointments, reload, onEdit, attentionAppointments, historyAppointments, showHistory, setShowHistory }: {\n  dates: Date[]; date: Date; setDate: (d: Date) => void; mechanics: AppointmentMechanic[]; filterMechanic: string | null; setFilterMechanic: (id: string | null) => void; isOwner: boolean;\n  stats: { total: number; pending: number; confirmed: number; arrived: number }; appointments: Appointment[]; reload: () => Promise<void>; onEdit: (item: Appointment) => void;\n  attentionAppointments: Appointment[]; historyAppointments: Appointment[]; showHistory: boolean; setShowHistory: (value: boolean) => void;\n}) {`,
);
replaceOnce(
  'src/screens/AppointmentsScreen.tsx',
  `  return <View style={styles.sectionGap}>\n    <ScrollView horizontal`,
  `  const historyGroups = historyAppointments.reduce<Record<string, Appointment[]>>((groups, item) => { const key = dateKey(new Date(item.scheduled_start)); (groups[key] ||= []).push(item); return groups; }, {});\n  return <View style={styles.sectionGap}>\n    {attentionAppointments.length > 0 && <NewAppointmentAttention appointments={attentionAppointments} onOpen={(item) => setDate(new Date(item.scheduled_start))} />}\n    <ScrollView horizontal`,
);
replaceOnce(
  'src/screens/AppointmentsScreen.tsx',
  `    {appointments.length === 0 ? <GlassCard style={styles.empty}><Ionicons name="calendar-outline" size={40} color={colors.textMuted} /><Text style={[styles.emptyTitle, { color: colors.text }]}>Bu gün randevu yok</Text></GlassCard> : appointments.map((item) => <StaffAppointmentCard key={item.id} item={item} reload={reload} onEdit={() => onEdit(item)} />)}\n  </View>;`,
  `    {appointments.length === 0 ? <GlassCard style={styles.empty}><Ionicons name="calendar-outline" size={40} color={colors.textMuted} /><Text style={[styles.emptyTitle, { color: colors.text }]}>Bu gün randevu yok</Text></GlassCard> : appointments.map((item) => <StaffAppointmentCard key={item.id} item={item} reload={reload} onEdit={() => onEdit(item)} />)}\n\n    <AnimatedPressable onPress={() => setShowHistory(!showHistory)} style={[styles.historyToggle, { backgroundColor: colors.card, borderColor: colors.border }]}>\n      <View style={[styles.historyIcon, { backgroundColor: \`${'${colors.primary}'}16\` }]}><Ionicons name="archive" size={21} color={colors.primary} /></View>\n      <View style={styles.copy}><Text style={[styles.historyTitle, { color: colors.text }]}>Geçmiş Randevular</Text><Text style={[styles.historyMeta, { color: colors.textMuted }]}>{historyAppointments.length} geçmiş randevu • Günlere göre arşiv</Text></View>\n      <Ionicons name={showHistory ? 'chevron-up' : 'chevron-down'} size={22} color={colors.textMuted} />\n    </AnimatedPressable>\n    {showHistory && <View style={styles.historyList}>{Object.entries(historyGroups).map(([key, items]) => <View key={key} style={styles.historyDay}><Text style={[styles.historyDayTitle, { color: colors.text }]}>{formatAppointmentDate(items[0].scheduled_start)}</Text>{items.map((item) => <PastAppointmentCard key={item.id} item={item} />)}</View>)}</View>}\n  </View>;`,
);
replaceOnce(
  'src/screens/AppointmentsScreen.tsx',
  `function StaffAppointmentCard({ item, reload, onEdit }`,
  `function NewAppointmentAttention({ appointments, onOpen }: { appointments: Appointment[]; onOpen: (item: Appointment) => void }) {\n  const { colors } = useTheme();\n  const pulse = useRef(new Animated.Value(0)).current;\n  useEffect(() => { const loop = Animated.loop(Animated.sequence([Animated.timing(pulse, { toValue: 1, duration: 850, useNativeDriver: true }), Animated.timing(pulse, { toValue: 0, duration: 850, useNativeDriver: true })])); loop.start(); return () => loop.stop(); }, [pulse]);\n  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] });\n  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.9] });\n  return <Animated.View style={[styles.attentionWrap, { transform: [{ scale }] }]}>\n    <Animated.View pointerEvents="none" style={[styles.attentionGlow, { backgroundColor: colors.orange, opacity }]} />\n    <GlassCard style={[styles.attentionCard, { borderColor: \`${'${colors.orange}'}80\` }]}>\n      <View style={styles.attentionHeader}><View style={[styles.attentionIcon, { backgroundColor: \`${'${colors.orange}'}20\` }]}><Ionicons name="notifications" size={25} color={colors.orange} /></View><View style={styles.copy}><Text style={[styles.attentionTitle, { color: colors.text }]}>Yeni müşteri randevusu</Text><Text style={[styles.attentionMeta, { color: colors.textMuted }]}>{appointments.length} randevu işletme onayı bekliyor. Tarihine gitmek için dokun.</Text></View><View style={[styles.attentionCount, { backgroundColor: colors.orange }]}><Text style={styles.attentionCountText}>{appointments.length}</Text></View></View>\n      {appointments.slice(0, 3).map((item) => <AnimatedPressable key={item.id} onPress={() => onOpen(item)} style={[styles.attentionItem, { backgroundColor: colors.surfaceSoft, borderColor: \`${'${colors.orange}'}38\` }]}><View style={[styles.attentionTime, { backgroundColor: \`${'${colors.orange}'}15\` }]}><Text style={[styles.attentionTimeText, { color: colors.orange }]}>{formatAppointmentTime(item.scheduled_start)}</Text></View><View style={styles.copy}><Text style={[styles.cardTitle, { color: colors.text }]}>{item.customer_name} • {item.service_title}</Text><Text style={[styles.cardMeta, { color: colors.textMuted }]}>{formatAppointmentDate(item.scheduled_start)} • {item.brand} {item.model} • {item.mechanic_name}</Text></View><Ionicons name="arrow-forward-circle" size={22} color={colors.orange} /></AnimatedPressable>)}\n    </GlassCard>\n  </Animated.View>;\n}\n\nfunction PastAppointmentCard({ item }: { item: Appointment }) {\n  const { colors } = useTheme();\n  const accent = item.status === 'converted' ? colors.primary : item.status === 'cancelled' || item.status === 'no_show' ? colors.red : item.status === 'arrived' ? colors.cyan : colors.green;\n  return <View style={[styles.pastCard, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[styles.pastTime, { backgroundColor: \`${'${accent}'}14\` }]}><Text style={[styles.pastTimeText, { color: accent }]}>{formatAppointmentTime(item.scheduled_start)}</Text></View><View style={styles.copy}><Text style={[styles.cardTitle, { color: colors.text }]}>{item.service_title}</Text><Text style={[styles.cardMeta, { color: colors.textMuted }]}>{item.customer_name} • {item.brand} {item.model} • {item.plate}</Text><Text style={[styles.cardMeta, { color: colors.textMuted }]}>{item.mechanic_name}</Text></View><Text style={[styles.status, { color: accent }]}>{statusLabels[item.status]}</Text></View>;\n}\n\nfunction StaffAppointmentCard({ item, reload, onEdit }`,
);
replaceOnce(
  'src/screens/AppointmentsScreen.tsx',
  `tabText: { fontSize: 8.5,`,
  `tabText: { fontSize: 10,`,
);
replaceOnce('src/screens/AppointmentsScreen.tsx', `dateText: { fontSize: 10,`, `dateText: { fontSize: 11,`);
replaceOnce('src/screens/AppointmentsScreen.tsx', `filterText: { fontSize: 10,`, `filterText: { fontSize: 11,`);
replaceOnce('src/screens/AppointmentsScreen.tsx', `miniLabel: { fontSize: 8.5,`, `miniLabel: { fontSize: 10,`);
replaceOnce('src/screens/AppointmentsScreen.tsx', `cardMeta: { fontSize: 9.5, lineHeight: 14,`, `cardMeta: { fontSize: 11, lineHeight: 16,`);
replaceOnce('src/screens/AppointmentsScreen.tsx', `status: { fontSize: 8,`, `status: { fontSize: 9.5,`);
replaceOnce('src/screens/AppointmentsScreen.tsx', `actionText: { fontSize: 9,`, `actionText: { fontSize: 10,`);
replaceOnce(
  'src/screens/AppointmentsScreen.tsx',
  `  settingText: { fontSize: 12, fontWeight: '900' },\n});`,
  `  settingText: { fontSize: 12, fontWeight: '900' },\n  attentionWrap: { position: 'relative' },\n  attentionGlow: { position: 'absolute', left: 10, right: 10, top: 8, bottom: 8, borderRadius: 25, shadowOpacity: 0.85, shadowRadius: 22, elevation: 8 },\n  attentionCard: { gap: 10, borderWidth: 1.5 },\n  attentionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },\n  attentionIcon: { width: 49, height: 49, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },\n  attentionTitle: { fontSize: 16.5, fontWeight: '900' },\n  attentionMeta: { fontSize: 11.5, lineHeight: 17, marginTop: 3 },\n  attentionCount: { minWidth: 31, height: 31, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7 },\n  attentionCountText: { color: '#fff', fontSize: 13, fontWeight: '900' },\n  attentionItem: { minHeight: 66, borderWidth: 1, borderRadius: 16, padding: 9, flexDirection: 'row', alignItems: 'center', gap: 9 },\n  attentionTime: { minWidth: 54, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },\n  attentionTimeText: { fontSize: 12, fontWeight: '900' },\n  historyToggle: { minHeight: 72, borderWidth: 1, borderRadius: 20, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },\n  historyIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },\n  historyTitle: { fontSize: 15, fontWeight: '900' },\n  historyMeta: { fontSize: 11, marginTop: 4 },\n  historyList: { gap: 16 },\n  historyDay: { gap: 8 },\n  historyDayTitle: { fontSize: 16, fontWeight: '900' },\n  pastCard: { minHeight: 72, borderWidth: 1, borderRadius: 18, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 9 },\n  pastTime: { width: 52, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },\n  pastTimeText: { fontSize: 12, fontWeight: '900' },\n});`,
);

// ---------------- Work order detail: modern collapsible categories ----------------
replaceOnce(
  'src/screens/WorkOrderDetailV04.tsx',
  `  const [saving, setSaving] = useState(false);`,
  `  const [saving, setSaving] = useState(false);\n  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ status: true, details: false, price: false, extras: false, services: false, parts: false, notes: false, history: false, receivables: false });`,
);
replaceOnce(
  'src/screens/WorkOrderDetailV04.tsx',
  `  const approvedExtras = useMemo(() => extras.filter((item) => item.status === 'approved'), [extras]);`,
  `  const approvedExtras = useMemo(() => extras.filter((item) => item.status === 'approved'), [extras]);\n  const toggleSection = (key: string) => setOpenSections((current) => ({ ...current, [key]: !current[key] }));\n  useEffect(() => { if (extras.some((item) => item.status === 'pending')) setOpenSections((current) => current.extras ? current : ({ ...current, extras: true })); }, [extras]);`,
);
replaceOnce(
  'src/screens/WorkOrderDetailV04.tsx',
  `    <Section title="Servis durumu" subtitle="Ek onay beklerken tamir, test, hazır ve teslim adımları kilitlenir." />\n    <View style={styles.grid}>{statusFlow.map((status) => <StatusButton key={status} status={status} active={order.status === status} onPress={() => changeStatus(status)} />)}</View>`,
  `    <DetailAccordion title="Servis Durumu" subtitle="Tamir akışını ve motorun güncel aşamasını yönet." icon="speedometer" accent={colors.primary} open={openSections.status} onToggle={() => toggleSection('status')} badge={statusLabels[order.status]}>\n      <View style={styles.grid}>{statusFlow.map((status) => <StatusButton key={status} status={status} active={order.status === status} onPress={() => changeStatus(status)} />)}</View>\n    </DetailAccordion>`,
);
replaceOnce(
  'src/screens/WorkOrderDetailV04.tsx',
  `    <Section title="Tespit ve dahili servis notu" subtitle="Dahili not müşteri panelinde görünmez." />\n    <GlassCard style={styles.stack}><FormField label="Tespit" value={diagnosis} onChangeText={setDiagnosis} multiline /><FormField label="Dahili atölye notu" value={internalNotes} onChangeText={setInternalNotes} multiline /><PrimaryButton title="Servis Detaylarını Kaydet" onPress={saveDetails} loading={saving} /></GlassCard>`,
  `    <DetailAccordion title="Tespit ve Atölye Notu" subtitle="Arıza tespiti ve yalnız personelin görebileceği dahili notlar." icon="document-text" accent={colors.cyan} open={openSections.details} onToggle={() => toggleSection('details')} badge={diagnosis ? 'Kayıtlı' : 'Bekliyor'}>\n      <FormField label="Tespit" value={diagnosis} onChangeText={setDiagnosis} multiline /><FormField label="Dahili atölye notu" value={internalNotes} onChangeText={setInternalNotes} multiline /><PrimaryButton title="Servis Detaylarını Kaydet" onPress={saveDetails} loading={saving} />\n    </DetailAccordion>`,
);
replaceOnce(
  'src/screens/WorkOrderDetailV04.tsx',
  `    <Section title="Ücret / tahmini ücret" subtitle="Tamire başlamadan önce zorunludur." />\n    <GlassCard style={styles.stack}>\n      <Toggle values={[['fixed', 'Net Fiyat'], ['estimated', 'Tahmini Fiyat']]} active={priceType} onChange={(value) => setPriceType(value as PriceType)} />\n      {priceType === 'fixed' ? <FormField label="Net fiyat" value={fixedPrice} onChangeText={setFixedPrice} keyboardType="decimal-pad" /> : <View style={styles.twoCol}><View style={styles.flex}><FormField label="En az" value={estimateMin} onChangeText={setEstimateMin} keyboardType="decimal-pad" /></View><View style={styles.flex}><FormField label="En fazla" value={estimateMax} onChangeText={setEstimateMax} keyboardType="decimal-pad" /></View></View>}\n      <PrimaryButton title="Ücreti Kaydet" onPress={savePrice} loading={saving} />\n    </GlassCard>`,
  `    <DetailAccordion title="Ücret ve Tahmini Fiyat" subtitle="Tamire başlamadan önce net veya tahmini fiyatı kaydet." icon="pricetag" accent={colors.green} open={openSections.price} onToggle={() => toggleSection('price')} badge={order.quoted_price ? money(order.quoted_price) : order.estimated_price_min ? 'Tahmini' : 'Girilmedi'}>\n      <Toggle values={[['fixed', 'Net Fiyat'], ['estimated', 'Tahmini Fiyat']]} active={priceType} onChange={(value) => setPriceType(value as PriceType)} />\n      {priceType === 'fixed' ? <FormField label="Net fiyat" value={fixedPrice} onChangeText={setFixedPrice} keyboardType="decimal-pad" /> : <View style={styles.twoCol}><View style={styles.flex}><FormField label="En az" value={estimateMin} onChangeText={setEstimateMin} keyboardType="decimal-pad" /></View><View style={styles.flex}><FormField label="En fazla" value={estimateMax} onChangeText={setEstimateMax} keyboardType="decimal-pad" /></View></View>}\n      <PrimaryButton title="Ücreti Kaydet" onPress={savePrice} loading={saving} />\n    </DetailAccordion>`,
);
replaceOnce(
  'src/screens/WorkOrderDetailV04.tsx',
  `    <Section title="Ek işlem ve müşteri onayı" subtitle="Ek işçilik ve parça bedeli yalnız onaylandığında toplam tutara eklenir." />\n    {extras.map((item) =>`,
  `    <DetailAccordion title="Ek İşlem ve Müşteri Onayı" subtitle="Ek işçilik ve parçalar yalnız müşteri onayından sonra toplam tutara eklenir." icon="shield-checkmark" accent={colors.orange} open={openSections.extras} onToggle={() => toggleSection('extras')} badge={extras.some((item) => item.status === 'pending') ? \`${'${extras.filter((item) => item.status === \'pending\').length}'} Bekliyor\` : \`${'${extras.length}'} Kayıt\`}>\n    {extras.map((item) =>`,
);
replaceOnce(
  'src/screens/WorkOrderDetailV04.tsx',
  `      <PrimaryButton title="Ek İşlemi Kaydet" onPress={createExtra} loading={saving} />\n    </GlassCard>\n\n    <Section title="Yapılan işlemler"`,
  `      <PrimaryButton title="Ek İşlemi Kaydet" onPress={createExtra} loading={saving} />\n    </GlassCard>\n    </DetailAccordion>\n\n    <DetailAccordion title="Yapılan İşlemler" subtitle="Planlanan, başlayan ve tamamlanan işçilik kalemlerini yönet." icon="construct" accent={colors.primary2} open={openSections.services} onToggle={() => toggleSection('services')} badge={\`${'${services.length}'} İşlem\`}>`,
);
replaceOnce(
  'src/screens/WorkOrderDetailV04.tsx',
  `    </GlassCard>\n\n    <Section title="Kullanılan parçalar" subtitle="Parça adı, adet, birim fiyat ve kullanım zamanı saklanır." />`,
  `    </GlassCard>\n    </DetailAccordion>\n\n    <DetailAccordion title="Kullanılan Parçalar" subtitle="Parça adı, adet, birim fiyat ve kullanım zamanını kaydet." icon="hardware-chip" accent={colors.orange} open={openSections.parts} onToggle={() => toggleSection('parts')} badge={\`${'${parts.length}'} Parça\`}>`,
);
replaceOnce(
  'src/screens/WorkOrderDetailV04.tsx',
  `    </GlassCard>\n\n    <Section title="Servis notları" subtitle="Müşteriye açık veya yalnız personelin görebileceği not oluştur." />`,
  `    </GlassCard>\n    </DetailAccordion>\n\n    <DetailAccordion title="Servis Notları" subtitle="Müşteriye açık veya yalnız personele özel notları yönet." icon="chatbox-ellipses" accent={colors.cyan} open={openSections.notes} onToggle={() => toggleSection('notes')} badge={\`${'${notes.length}'} Not\`}>`,
);
replaceOnce(
  'src/screens/WorkOrderDetailV04.tsx',
  `    </GlassCard>\n\n    <Section title="Servis hareket geçmişi" subtitle="Durum, ek işlem, parça, not ve işlem hareketleri." />`,
  `    </GlassCard>\n    </DetailAccordion>\n\n    <DetailAccordion title="Servis Hareket Geçmişi" subtitle="Durum, ek işlem, parça, not ve işlem hareketlerinin zaman çizgisi." icon="time" accent={colors.primary} open={openSections.history} onToggle={() => toggleSection('history')} badge={\`${'${events.length}'} Hareket\`}>`,
);
replaceOnce(
  'src/screens/WorkOrderDetailV04.tsx',
  `<GlassCard style={styles.listCard}>{events.length === 0 ? <Empty text="Hareket kaydı yok." /> : events.map((item, index) => <View key={item.id} style={[styles.eventRow, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}><View style={[styles.eventDot, { backgroundColor: \`${'${colors.primary}'}20\` }]}><Ionicons name="pulse" size={15} color={colors.primary} /></View><View style={styles.copy}><Text style={[styles.cardTitle, { color: colors.text }]}>{eventLabel[item.event_type] || item.event_type}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{item.old_status && item.new_status ? \`${'${statusLabels[item.old_status]}'} → ${'${statusLabels[item.new_status]}'} • \` : ''}{dateTime(item.created_at)}</Text>{item.note && <Text style={[styles.bodySmall, { color: colors.textSoft }]}>{item.note}</Text>}</View></View>)}</GlassCard>\n\n    <Section title="Borç / veresiye ve tahsilat" subtitle="Kalan borç, söz tarihi, Nakit/IBAN tahsilatı ve müşteri ödeme notları." />\n    <ReceivableManagerCard orderId={orderId} onChanged={load} />`,
  `<GlassCard style={styles.listCard}>{events.length === 0 ? <Empty text="Hareket kaydı yok." /> : events.map((item, index) => <View key={item.id} style={[styles.eventRow, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}><View style={[styles.eventDot, { backgroundColor: \`${'${colors.primary}'}20\` }]}><Ionicons name="pulse" size={15} color={colors.primary} /></View><View style={styles.copy}><Text style={[styles.cardTitle, { color: colors.text }]}>{eventLabel[item.event_type] || item.event_type}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{item.old_status && item.new_status ? \`${'${statusLabels[item.old_status]}'} → ${'${statusLabels[item.new_status]}'} • \` : ''}{dateTime(item.created_at)}</Text>{item.note && <Text style={[styles.bodySmall, { color: colors.textSoft }]}>{item.note}</Text>}</View></View>)}</GlassCard>\n    </DetailAccordion>\n\n    <DetailAccordion title="Borç, Veresiye ve Tahsilat" subtitle="Kalan borç, ödeme sözü, Nakit/IBAN tahsilatı ve müşteri notları." icon="wallet" accent={colors.red} open={openSections.receivables} onToggle={() => toggleSection('receivables')} badge={money(Number(order.total_amount || 0) - Number(order.amount_received || 0))}>\n      <ReceivableManagerCard orderId={orderId} onChanged={load} />\n    </DetailAccordion>`,
);
replaceOnce(
  'src/screens/WorkOrderDetailV04.tsx',
  `function Header({ onBack, title, subtitle, status }`,
  `function DetailAccordion({ title, subtitle, icon, accent, open, onToggle, badge, children }: { title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap; accent: string; open: boolean; onToggle: () => void; badge?: string; children: React.ReactNode }) {\n  const { colors } = useTheme();\n  return <GlassCard style={styles.accordionCard}><AnimatedPressable onPress={onToggle} style={styles.accordionHeader}><View style={[styles.accordionIcon, { backgroundColor: \`${'${accent}'}18\` }]}><Ionicons name={icon} size={23} color={accent} /></View><View style={styles.copy}><Text style={[styles.accordionTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.accordionSub, { color: colors.textMuted }]}>{subtitle}</Text></View>{badge && <View style={[styles.accordionBadge, { backgroundColor: \`${'${accent}'}12\`, borderColor: \`${'${accent}'}38\` }]}><Text style={[styles.accordionBadgeText, { color: accent }]} numberOfLines={1}>{badge}</Text></View>}<Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={22} color={colors.textMuted} /></AnimatedPressable>{open && <View style={[styles.accordionBody, { borderTopColor: colors.border }]}>{children}</View>}</GlassCard>;\n}\n\nfunction Header({ onBack, title, subtitle, status }`,
);
replaceOnce('src/screens/WorkOrderDetailV04.tsx', `meta: { fontSize: 9.5, lineHeight: 14,`, `meta: { fontSize: 11, lineHeight: 16,`);
replaceOnce('src/screens/WorkOrderDetailV04.tsx', `bodySmall: { fontSize: 11.5,`, `bodySmall: { fontSize: 12.5,`);
replaceOnce('src/screens/WorkOrderDetailV04.tsx', `label: { fontSize: 9,`, `label: { fontSize: 10.5,`);
replaceOnce('src/screens/WorkOrderDetailV04.tsx', `timeValue: { fontSize: 10.5,`, `timeValue: { fontSize: 11.5,`);
replaceOnce('src/screens/WorkOrderDetailV04.tsx', `statusText: { fontSize: 10.5,`, `statusText: { fontSize: 11.5,`);
replaceOnce('src/screens/WorkOrderDetailV04.tsx', `actionText: { fontSize: 8.5,`, `actionText: { fontSize: 10,`);
replaceOnce('src/screens/WorkOrderDetailV04.tsx', `choiceText: { flex: 1, fontSize: 9.5,`, `choiceText: { flex: 1, fontSize: 10.5,`);
replaceOnce('src/screens/WorkOrderDetailV04.tsx', `linked: { fontSize: 9.5,`, `linked: { fontSize: 10.5,`);
replaceOnce('src/screens/WorkOrderDetailV04.tsx', `smallChoiceText: { fontSize: 9.5,`, `smallChoiceText: { fontSize: 10.5,`);
replaceOnce(
  'src/screens/WorkOrderDetailV04.tsx',
  `  eventDot: { width: 31, height: 31, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },\n});`,
  `  eventDot: { width: 31, height: 31, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },\n  accordionCard: { padding: 0, overflow: 'hidden' },\n  accordionHeader: { minHeight: 86, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },\n  accordionIcon: { width: 49, height: 49, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },\n  accordionTitle: { fontSize: 16.5, fontWeight: '900' },\n  accordionSub: { fontSize: 11.5, lineHeight: 17, marginTop: 4 },\n  accordionBadge: { maxWidth: 88, minHeight: 30, borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center' },\n  accordionBadgeText: { fontSize: 9.5, fontWeight: '900' },\n  accordionBody: { borderTopWidth: 1, padding: 14, gap: 12 },\n});`,
);

// ---------------- Modern animated motorcycle icon across visible customer/staff surfaces ----------------
replaceOnce('src/customer/CustomerShell.tsx', `import { AnimatedPressable } from '../components/AnimatedPressable';`, `import { AnimatedMotorcycleIcon } from '../components/AnimatedMotorcycleIcon';\nimport { AnimatedPressable } from '../components/AnimatedPressable';`);
replaceOnce(
  'src/customer/CustomerShell.tsx',
  `{selected ? <LinearGradient colors={[item.a, item.b]} style={styles.activeIcon}><Ionicons name={item.active} size={21} color="#fff" /></LinearGradient> : <View style={[styles.inactiveIcon, { backgroundColor: \`${'${item.a}'}12\`, borderColor: \`${'${item.a}'}28\` }]}><Ionicons name={item.icon} size={20} color={item.a} /></View>}`,
  `{selected ? <LinearGradient colors={[item.a, item.b]} style={styles.activeIcon}>{item.key === 'motorcycles' ? <AnimatedMotorcycleIcon size={25} color="#fff" /> : <Ionicons name={item.active} size={21} color="#fff" />}</LinearGradient> : <View style={[styles.inactiveIcon, { backgroundColor: \`${'${item.a}'}12\`, borderColor: \`${'${item.a}'}28\` }]}>{item.key === 'motorcycles' ? <AnimatedMotorcycleIcon size={23} color={item.a} /> : <Ionicons name={item.icon} size={20} color={item.a} />}</View>}`,
);
replaceOnce('src/customer/CustomerShell.tsx', `label: { fontSize: 8,`, `label: { fontSize: 9,`);

replaceOnce('src/customer/CustomerHomeScreen.tsx', `import { AnimatedPressable } from '../components/AnimatedPressable';`, `import { AnimatedMotorcycleIcon } from '../components/AnimatedMotorcycleIcon';\nimport { AnimatedPressable } from '../components/AnimatedPressable';`);
replaceOnce('src/customer/CustomerHomeScreen.tsx', `<Ionicons name="bicycle" size={23} color={colors.primary2} />`, `<AnimatedMotorcycleIcon size={27} color={colors.primary2} />`);
replaceOnce('src/customer/CustomerHomeScreen.tsx', `cardMeta: { fontSize: 10.5,`, `cardMeta: { fontSize: 11.5,`);
replaceOnce('src/customer/CustomerHomeScreen.tsx', `sectionText: { fontSize: 11,`, `sectionText: { fontSize: 12,`);
replaceOnce('src/customer/CustomerHomeScreen.tsx', `pendingText: { fontSize: 9.5,`, `pendingText: { fontSize: 10.5,`);

replaceOnce('src/screens/WorkOrdersScreen.tsx', `import { AnimatedPressable } from '../components/AnimatedPressable';`, `import { AnimatedMotorcycleIcon } from '../components/AnimatedMotorcycleIcon';\nimport { AnimatedPressable } from '../components/AnimatedPressable';`);
replaceOnce(
  'src/screens/WorkOrdersScreen.tsx',
  `<Ionicons name={order.status === 'extra_approval_waiting' ? 'shield-half' : 'bicycle'} size={25} color={order.status === 'extra_approval_waiting' ? colors.orange : colors.primary2} />`,
  `{order.status === 'extra_approval_waiting' ? <Ionicons name="shield-half" size={25} color={colors.orange} /> : <AnimatedMotorcycleIcon size={29} color={colors.primary2} />}`,
);
replaceOnce('src/screens/WorkOrdersScreen.tsx', `approvalText: { fontSize: 9.5,`, `approvalText: { fontSize: 10.5,`);
replaceOnce('src/screens/WorkOrdersScreen.tsx', `smallLabel: { fontSize: 9,`, `smallLabel: { fontSize: 10,`);
replaceOnce('src/screens/WorkOrdersScreen.tsx', `payment: { fontSize: 10,`, `payment: { fontSize: 11,`);

// General readability on auth and shared headers.
replaceOnce('src/screens/AuthScreen.tsx', `systemText: { fontSize: 9,`, `systemText: { fontSize: 10,`);
replaceOnce('src/screens/AuthScreen.tsx', `featureText: { fontSize: 8.7,`, `featureText: { fontSize: 10,`);
replaceOnce('src/screens/AuthScreen.tsx', `cardEyebrow: { fontSize: 9,`, `cardEyebrow: { fontSize: 10.5,`);
replaceOnce('src/components/ScreenHeader.tsx', `eyebrow: { fontSize: 11,`, `eyebrow: { fontSize: 12,`);
replaceOnce('src/components/ScreenHeader.tsx', `subtitle: { fontSize: 14,`, `subtitle: { fontSize: 15,`);

// README and Termux release metadata.
let readme = read('README.md');
readme = readme.replace('**v0.8.2 — Ayrı Admin Paneli ve Expo Go Uyumluluğu**', '**v0.8.4 — Admin Onaylı İşletme Başvurusu, Modern Takvim ve Servis Detayı**');
readme = readme.replace('- **Kurulan sürüm:** `v0.8.2`', '- **Kurulan sürüm:** `v0.8.4`');
readme = readme.replace('- **Yedeklenen sürüm:** `v0.8.1`', '- **Yedeklenen sürüm:** `v0.8.3`');
readme = readme.replace('- **Kod yedeği:** `backup/v0.8.1-before-v0.8.2`', '- **Kod yedeği:** `backup/v0.8.3-before-v0.8.4`');
if (!readme.includes('### v0.8.4')) readme = readme.replace('> Expo Go Android üzerinde', `### v0.8.4 — İşletme Onayı ve Modern Kullanım\n\n- Admin onaylı işletme başvurusu\n- Vergi Dairesi ve Vergi Numarası\n- Bekleyen başvuru müşteri paneli\n- Yeni randevu dikkat animasyonu ve geçmiş arşivi\n- Açılır/kapanır servis detay kategorileri\n- Modern animasyonlu motosiklet ikonu\n- Ana Admin hesabı: draborneagle@gmail.com\n\n> Expo Go Android üzerinde`);
write('README.md', readme);

const install = `# Termux — v0.8.3 Yedekle, v0.8.4 Kur\n\nBu akış Python, patch, JDK, Perl, /tmp veya Git kullanmaz. Mevcut .env korunur.\n\n\`\`\`bash\ncd ~\nKURULAN_SURUM=\"v0.8.4\"\nYEDEKLENEN_SURUM=\"v0.8.3\"\nYEDEK_KLASORU=\"$HOME/DraBornGarage-v0.8.3-local-backup\"\nZIP_DOSYASI=\"$HOME/DraBornGarage-v0.8.4.zip\"\nACILAN_KLASOR=\"$HOME/DraBornGarage-main\"\n\npkg update -y\npkg install nodejs-lts curl unzip -y\nrm -rf \"$YEDEK_KLASORU\" \"$ACILAN_KLASOR\"\nrm -f \"$ZIP_DOSYASI\"\nif [ -d \"$HOME/DraBornGarage\" ]; then mv \"$HOME/DraBornGarage\" \"$YEDEK_KLASORU\"; fi\ncurl -L --retry 10 --retry-delay 3 --connect-timeout 30 --max-time 600 \"https://github.com/DrabornEagle/DraBornGarage/archive/refs/heads/main.zip\" -o \"$ZIP_DOSYASI\"\nunzip -o \"$ZIP_DOSYASI\" -d \"$HOME\"\nmv \"$ACILAN_KLASOR\" \"$HOME/DraBornGarage\"\nrm -f \"$ZIP_DOSYASI\"\nif [ -f \"$YEDEK_KLASORU/.env\" ]; then cp \"$YEDEK_KLASORU/.env\" \"$HOME/DraBornGarage/.env\"; else cp \"$HOME/DraBornGarage/.env.example\" \"$HOME/DraBornGarage/.env\"; fi\ncd \"$HOME/DraBornGarage\"\nnpm config set registry \"https://registry.npmjs.org/\"\nnpm config set fetch-retries 10\nnpm config set fetch-timeout 300000\nnpm install --no-audit --no-fund\nnpm run typecheck\nnode -p \"require('./package.json').version\"\nnpx expo start -c --go\n\`\`\`\n\nBeklenen sürüm çıktısı: \`0.8.4\`. Bağlantı sorunu olursa \`npx expo start -c --tunnel --go\`.\n\nKod geri dönüş yedeği: \`backup/v0.8.3-before-v0.8.4\`. Veritabanı şema rollback dosyası: \`supabase/rollbacks/20260712220000_v0_8_4_business_approval_rollback.sql\`. Kullanıcı/test verisi temizliği geri yüklenemez.\n`;
write('docs/TERMUX_INSTALL.md', install);

console.log('v0.8.4 calendar, accordion, icons and readability prepared.');
