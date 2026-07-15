from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text, encoding='utf-8')


def replace_exact(path: str, old: str, new: str, count: int = 1) -> None:
    text = read(path)
    actual = text.count(old)
    if actual < count:
        raise RuntimeError(f'{path}: beklenen parça bulunamadı ({actual}/{count})\n{old[:180]}')
    text = text.replace(old, new, count)
    write(path, text)


def replace_regex(path: str, pattern: str, replacement: str, count: int = 1) -> None:
    text = read(path)
    text, changed = re.subn(pattern, replacement, text, count=count, flags=re.S)
    if changed != count:
        raise RuntimeError(f'{path}: regex değişimi başarısız ({changed}/{count}) {pattern[:160]}')
    write(path, text)


replace_exact('src/screens/AuthScreen.tsx', 'GARAGE OS • v1.0.2 EXPO TEST', 'GARAGE OS • v1.0.3 EXPO TEST')
replace_exact('src/screens/AuthScreen.tsx', 'label="Rol Güvenliği"', 'label="Güvenli Hizmet"')
replace_exact('src/screens/AuthScreen.tsx', 'label="Zaten Bir İşletmem Var"', 'label="İşletmem Var"')
replace_exact(
    'src/screens/AuthScreen.tsx',
    "  modeButton: { flex: 1, minHeight: 54, borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },",
    "  modeButton: { flex: 1, minHeight: 66, borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 9, alignItems: 'center', justifyContent: 'center', gap: 5 },",
)

replace_exact(
    'src/AppRoot.tsx',
    "import { CustomerShell } from './customer/CustomerShell';\n",
    "import { CustomerShell } from './customer/CustomerShell';\nimport { ApplicationEntryScreen } from './screens/ApplicationEntryScreen';\n",
)
replace_exact(
    'src/AppRoot.tsx',
    '  const { loading, session, workshop, membership, isAdmin } = useAuth();',
    '  const { loading, session, workshop, membership, isAdmin, accountMode } = useAuth();',
)
replace_exact(
    'src/AppRoot.tsx',
    "  if (workshop && membership) return <AppShellV102 />;\n  return <CustomerShell />;",
    "  if (workshop && membership) return <AppShellV102 />;\n  if (accountMode === 'staff') return <ApplicationEntryScreen />;\n  return <CustomerShell />;",
)

replace_exact(
    'src/screens/TeamScreen.tsx',
    'export function TeamScreen() {',
    'export function TeamScreen({ accessEntry }: { accessEntry?: React.ReactNode }) {',
)
replace_exact(
    'src/screens/TeamScreen.tsx',
    "  const [showBusinessForm, setShowBusinessForm] = useState(false);",
    "  const [showBusinessForm, setShowBusinessForm] = useState(false);\n  const [showBusinessUpdate, setShowBusinessUpdate] = useState(false);",
)
replace_exact(
    'src/screens/TeamScreen.tsx',
    "      <OwnerCenterSwitch value={ownerSection} onChange={setOwnerSection} />\n\n      {isAdmin && (",
    "      <OwnerCenterSwitch value={ownerSection} onChange={setOwnerSection} />\n      {accessEntry}\n\n      {isAdmin && (",
)
old_business = '''      <Text style={[styles.sectionTitle, { color: colors.text }]}>Seçili İşletme</Text>
      <GlassCard style={styles.formCard}>
        <FormField label="İşletme adı" value={editName} onChangeText={setEditName} />
        <FormField label="Telefon" value={editPhone} onChangeText={setEditPhone} keyboardType="phone-pad" />
        <FormField label="Adres" value={editAddress} onChangeText={setEditAddress} multiline />
        <FormField label="Vergi Dairesi" value={editTaxOffice} onChangeText={setEditTaxOffice} placeholder="Örn. Muratpaşa Vergi Dairesi" />
        <FormField label="Vergi Numarası" value={editTaxNumber} onChangeText={(value) => setEditTaxNumber(value.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={11} />
        <PrimaryButton title="İşletme Bilgilerini Güncelle" onPress={saveBusiness} loading={loading} secondary />
      </GlassCard>'''
new_business = '''      <View style={[styles.businessUpdateCategory, { backgroundColor: colors.card, borderColor: showBusinessUpdate ? `${colors.cyan}58` : colors.border }]}>
        <AnimatedPressable onPress={() => setShowBusinessUpdate((value) => !value)} style={styles.businessUpdateHeader}>
          <View style={[styles.businessUpdateIcon, { backgroundColor: `${colors.cyan}14`, borderColor: `${colors.cyan}34` }]}><Ionicons name="business" size={22} color={colors.cyan} /></View>
          <View style={styles.copy}><Text style={[styles.businessUpdateTitle, { color: colors.text }]}>İşletmemi Güncelle</Text><Text style={[styles.businessUpdateSubtitle, { color: colors.textMuted }]}>{workshop?.name || 'Aktif işletme seçilmedi'} • Açılır işletme ayarları</Text></View>
          <View style={[styles.businessUpdateChevron, { borderColor: showBusinessUpdate ? `${colors.cyan}58` : colors.border }]}><Ionicons name={showBusinessUpdate ? 'chevron-up' : 'chevron-down'} size={20} color={showBusinessUpdate ? colors.cyan : colors.textMuted} /></View>
        </AnimatedPressable>
        {showBusinessUpdate && <View style={[styles.businessUpdateBody, { borderTopColor: colors.border }]}>
          <FormField label="İşletme adı" value={editName} onChangeText={setEditName} />
          <FormField label="Telefon" value={editPhone} onChangeText={setEditPhone} keyboardType="phone-pad" />
          <FormField label="Adres" value={editAddress} onChangeText={setEditAddress} multiline />
          <FormField label="Vergi Dairesi" value={editTaxOffice} onChangeText={setEditTaxOffice} placeholder="Örn. Muratpaşa Vergi Dairesi" />
          <FormField label="Vergi Numarası" value={editTaxNumber} onChangeText={(value) => setEditTaxNumber(value.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={11} />
          <PrimaryButton title="İşletme Bilgilerini Güncelle" onPress={saveBusiness} loading={loading} secondary />
        </View>}
      </View>'''
replace_exact('src/screens/TeamScreen.tsx', old_business, new_business)
replace_exact(
    'src/screens/TeamScreen.tsx',
    "  formCard: { gap: 13 },",
    "  formCard: { gap: 13 },\n  businessUpdateCategory: { borderWidth: 1, borderRadius: 22, overflow: 'hidden' },\n  businessUpdateHeader: { minHeight: 82, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },\n  businessUpdateIcon: { width: 48, height: 48, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },\n  businessUpdateTitle: { fontSize: 16, fontWeight: '900' },\n  businessUpdateSubtitle: { fontSize: 12, lineHeight: 16, marginTop: 4 },\n  businessUpdateChevron: { width: 38, height: 38, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },\n  businessUpdateBody: { borderTopWidth: 1, padding: 12, gap: 13 },",
)

team_v102 = read('src/screens/TeamScreenV102.tsx')
team_v102 = team_v102.replace('Ortak ve Panel Erişimi', 'İşletme ve Usta Erişimi')
marker = "  return (\n    <View style={styles.root}>"
if marker not in team_v102:
    raise RuntimeError('TeamScreenV102: return işareti bulunamadı')
access_entry = '''  const accessEntry = isOwner ? (
    <AnimatedPressable
      onPress={() => setVisible(true)}
      style={[styles.accessButton, { backgroundColor: colors.cardStrong, borderColor: `${colors.green}70`, shadowColor: colors.green }]}
    >
      <Ionicons name="people-circle" size={24} color={colors.green} />
      <View style={styles.copy}>
        <Text style={[styles.accessTitle, { color: colors.text }]}>İşletme ve Usta Erişimi</Text>
        <Text style={[styles.accessSubtitle, { color: colors.textMuted }]}>Kullanıcı ara • İşletme/Usta paneli aç</Text>
      </View>
      {requests.filter((item) => item.status === 'pending').length > 0 && <View style={[styles.badge, { backgroundColor: colors.red }]}><Text style={styles.badgeText}>{requests.filter((item) => item.status === 'pending').length}</Text></View>}
      <Ionicons name="chevron-forward" size={20} color={colors.green} />
    </AnimatedPressable>
  ) : undefined;

'''
team_v102 = team_v102.replace(marker, access_entry + marker, 1)
team_v102 = team_v102.replace(
    "      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><TeamScreen /></KeyboardAvoidingView>",
    "      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><TeamScreen accessEntry={accessEntry} /></KeyboardAvoidingView>",
    1,
)
pattern = r"\n      \{isOwner && <AnimatedPressable\n        onPress=\{\(\) => setVisible\(true\)\}.*?\n      </AnimatedPressable>\}"
team_v102, removed = re.subn(pattern, '', team_v102, count=1, flags=re.S)
if removed != 1:
    raise RuntimeError(f'TeamScreenV102: eski yüzen erişim butonu kaldırılamadı ({removed})')
team_v102 = team_v102.replace(
    "  accessButton: { position: 'absolute', left: 18, right: 18, bottom: 8, zIndex: 30, minHeight: 72, borderWidth: 1, borderRadius: 21, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10, shadowOpacity: 0.3, shadowRadius: 16, elevation: 14 },",
    "  accessButton: { minHeight: 72, borderWidth: 1, borderRadius: 21, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10, shadowOpacity: 0.22, shadowRadius: 12, elevation: 7 },",
    1,
)
write('src/screens/TeamScreenV102.tsx', team_v102)

package = read('package.json').replace('"version": "1.0.2"', '"version": "1.0.3"', 1)
write('package.json', package)
lock = read('package-lock.json').replace('"version": "1.0.2"', '"version": "1.0.3"', 2)
write('package-lock.json', lock)
app = read('app.json')
app = app.replace('"version": "1.0.2"', '"version": "1.0.3"', 1)
app = app.replace('"buildNumber": "19"', '"buildNumber": "20"', 1)
app = app.replace('"versionCode": 19', '"versionCode": 20', 1)
write('app.json', app)

settings = read('src/screens/SettingsScreen.tsx')
settings = settings.replace('v1.0.2 RC • Ortaklık ve panel erişimi', 'v1.0.3 RC • Başvuru merkezi ve erişim düzeni')
settings = settings.replace('v1.0.2 RC • Expo Test Adayı', 'v1.0.3 RC • Expo Test Adayı')
settings = settings.replace('backup/v1.0.1-before-v1.0.2-20260715', 'backup/v1.0.2-before-v1.0.3-20260715')
settings = settings.replace('Kod ve veritabanıyla v1.0.1 RC', 'Kod ve veritabanıyla v1.0.2 RC')
write('src/screens/SettingsScreen.tsx', settings)

notification = read('src/notifications/NotificationCenterScreen.tsx').replace('v1.0.2 RC • GÜÇLÜ BİLDİRİM MERKEZİ', 'v1.0.3 RC • GÜÇLÜ BİLDİRİM MERKEZİ')
write('src/notifications/NotificationCenterScreen.tsx', notification)

termux = read('docs/TERMUX_INSTALL.md')
termux = termux.replace('DraBornGarage v1.0.2 RC', 'DraBornGarage v1.0.3 RC')
termux = termux.replace('EXPECTED_VERSION="1.0.2"', 'EXPECTED_VERSION="1.0.3"')
write('docs/TERMUX_INSTALL.md', termux)

readme = read('README.md')
readme = readme.replace('**v1.0.2 RC — Ortaklık, Panel Erişimi ve Arayüz Düzeltmeleri**', '**v1.0.3 RC — Başvuru Merkezi ve Erişim Düzeni**')
readme = readme.replace('v1.0.2 RC; çok ortaklı işletme yapısını, kullanıcı arayarak İşletme/Usta paneli açmayı, kayıt sırasında mevcut işletmeye ortaklık başvurusunu, otomatik platform bedelini, klavye güvenli formları ve gridsiz modern arka planı Expo üzerinde test eder.', 'v1.0.3 RC; işletme/Usta başvurularını ilk girişte müşteri hesabına göndermeyen Başvurum merkezini, Hesabım üzerinden isteğe bağlı müşteri geçişini, Ekip sayfasına özel İşletme ve Usta Erişimi yönetimini ve açılır İşletmemi Güncelle kategorisini Expo üzerinde test eder.')
readme = readme.replace('## v1.0.2 ile tamamlananlar', '## v1.0.3 ile tamamlananlar')
readme = readme.replace('- **Uygulama:** `1.0.2 RC`', '- **Uygulama:** `1.0.3 RC`')
readme = readme.replace('- **Android versionCode:** `19`', '- **Android versionCode:** `20`')
readme = readme.replace('- **iOS buildNumber:** `19`', '- **iOS buildNumber:** `20`')
readme = readme.replace('backup/v1.0.1-before-v1.0.2-20260715', 'backup/v1.0.2-before-v1.0.3-20260715')
readme = readme.replace('supabase/rollbacks/rollback_v1_0_2_to_v1_0_1.sql', 'supabase/rollbacks/rollback_v1_0_3_to_v1_0_2.sql')
readme = readme.replace('v1.0.2 RC Expo test sürümüdür.', 'v1.0.3 RC Expo test sürümüdür.')
write('README.md', readme)

print('DraBornGarage v1.0.3 kaynak yaması uygulandı.')
