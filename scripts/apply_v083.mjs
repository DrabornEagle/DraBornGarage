import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function write(file, content) {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function replaceOnce(file, before, after) {
  const source = read(file);
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`${file}: replacement target not found:\n${before.slice(0, 220)}`);
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`${file}: replacement target is not unique`);
  write(file, source.slice(0, first) + after + source.slice(first + before.length));
}

function replaceLast(file, before, after) {
  const source = read(file);
  const index = source.lastIndexOf(before);
  if (index < 0) throw new Error(`${file}: final replacement target not found`);
  write(file, source.slice(0, index) + after + source.slice(index + before.length));
}

const pkg = JSON.parse(read('package.json'));
if (pkg.version === '0.8.3') {
  console.log('v0.8.3 already applied.');
  process.exit(0);
}
if (pkg.version !== '0.8.2') throw new Error(`Expected package version 0.8.2, found ${pkg.version}`);
pkg.version = '0.8.3';
write('package.json', `${JSON.stringify(pkg, null, 2)}\n`);

const lock = JSON.parse(read('package-lock.json'));
lock.version = '0.8.3';
if (lock.packages?.['']) lock.packages[''].version = '0.8.3';
write('package-lock.json', `${JSON.stringify(lock, null, 2)}\n`);

const app = JSON.parse(read('app.json'));
app.expo.version = '0.8.3';
write('app.json', `${JSON.stringify(app, null, 2)}\n`);

replaceOnce(
  'src/types.ts',
  `export interface Profile {\n  id: string;\n  full_name: string;\n  phone?: string | null;\n  avatar_url?: string | null;\n  is_admin?: boolean;\n  account_mode?: AccountMode;\n}`,
  `export interface Profile {\n  id: string;\n  full_name: string;\n  phone?: string | null;\n  avatar_url?: string | null;\n  is_admin?: boolean;\n  account_mode?: AccountMode;\n  customer_plate?: string | null;\n  customer_motorcycle_brand?: string | null;\n  customer_motorcycle_model?: string | null;\n}`,
);

replaceOnce(
  'src/types.ts',
  `  appointment_min_notice_minutes?: number;\n}`,
  `  appointment_min_notice_minutes?: number;\n  tax_office?: string | null;\n  tax_number?: string | null;\n}`,
);

replaceOnce(
  'src/types.ts',
  `export interface StaffCustomerClaim {\n  id: string;`,
  `export interface StaffRegisteredCustomerMatch {\n  user_id: string;\n  full_name: string;\n  phone?: string | null;\n  registered_plate: string;\n  registered_brand: string;\n  registered_model: string;\n  already_linked: boolean;\n  workshop_customer_id?: string | null;\n  workshop_customer_name?: string | null;\n  workshop_motorcycle_id?: string | null;\n}\n\nexport interface CustomerRegistrationMotor {\n  plate: string;\n  brand: string;\n  model: string;\n}\n\nexport interface StaffCustomerClaim {\n  id: string;`,
);

replaceOnce(
  'src/context/AuthContext.tsx',
  `import { AccountMode, CustomerWorkshopLink, MemberRole, Profile, Workshop, WorkshopMember } from '../types';`,
  `import { AccountMode, CustomerRegistrationMotor, CustomerWorkshopLink, MemberRole, Profile, Workshop, WorkshopMember } from '../types';`,
);
replaceOnce(
  'src/context/AuthContext.tsx',
  `  signUp: (fullName: string, phone: string, email: string, password: string, accountMode?: AccountMode) => Promise<string | null>;`,
  `  signUp: (fullName: string, phone: string, email: string, password: string, accountMode?: AccountMode, customerMotor?: CustomerRegistrationMotor) => Promise<string | null>;`,
);
replaceOnce(
  'src/context/AuthContext.tsx',
  `  createWorkshop: (name: string, phone: string, address: string) => Promise<string | null>;`,
  `  createWorkshop: (name: string, phone: string, address: string, taxOffice: string, taxNumber: string) => Promise<string | null>;`,
);
replaceOnce(
  'src/context/AuthContext.tsx',
  `const WORKSHOP_COLUMNS = 'id, name, phone, address, logo_url, is_active, demo_batch_id, timezone, appointments_enabled, appointment_auto_confirm, appointment_booking_days, appointment_min_notice_minutes';`,
  `const WORKSHOP_COLUMNS = 'id, name, phone, address, logo_url, is_active, demo_batch_id, timezone, appointments_enabled, appointment_auto_confirm, appointment_booking_days, appointment_min_notice_minutes, tax_office, tax_number';`,
);
replaceOnce(
  'src/context/AuthContext.tsx',
  `.from('profiles').select('id, full_name, phone, avatar_url, is_admin, account_mode').eq('id', userId).maybeSingle(),`,
  `.from('profiles').select('id, full_name, phone, avatar_url, is_admin, account_mode, customer_plate, customer_motorcycle_brand, customer_motorcycle_model').eq('id', userId).maybeSingle(),`,
);
replaceOnce(
  'src/context/AuthContext.tsx',
  `    signUp: async (fullName, phone, email, password, accountMode = 'staff') => {\n      const { data, error } = await supabase.auth.signUp({\n        email: email.trim(),\n        password,\n        options: { data: { full_name: fullName.trim(), phone: phone.trim(), account_mode: accountMode } },\n      });`,
  `    signUp: async (fullName, phone, email, password, accountMode = 'staff', customerMotor) => {\n      const customerData = accountMode === 'customer' && customerMotor ? {\n        customer_plate: customerMotor.plate.trim().toUpperCase(),\n        customer_motorcycle_brand: customerMotor.brand.trim(),\n        customer_motorcycle_model: customerMotor.model.trim(),\n      } : {};\n      const { data, error } = await supabase.auth.signUp({\n        email: email.trim(),\n        password,\n        options: { data: { full_name: fullName.trim(), phone: phone.trim(), account_mode: accountMode, ...customerData } },\n      });`,
);
replaceOnce(
  'src/context/AuthContext.tsx',
  `    createWorkshop: async (name, phone, address) => {\n      const rpcName = profile?.is_admin ? 'admin_create_workshop' : 'create_workshop';\n      const { data, error } = await supabase.rpc(rpcName, { p_name: name.trim(), p_phone: phone.trim() || null, p_address: address.trim() || null });`,
  `    createWorkshop: async (name, phone, address, taxOffice, taxNumber) => {\n      const rpcName = profile?.is_admin ? 'admin_create_workshop' : 'create_workshop';\n      const { data, error } = await supabase.rpc(rpcName, {\n        p_name: name.trim(),\n        p_phone: phone.trim() || null,\n        p_address: address.trim() || null,\n        p_tax_office: taxOffice.trim(),\n        p_tax_number: taxNumber.replace(/\\D/g, ''),\n      });`,
);

replaceOnce(
  'src/screens/AuthScreen.tsx',
  `  const [phone, setPhone] = useState('');\n  const [email, setEmail] = useState('');`,
  `  const [phone, setPhone] = useState('');\n  const [plate, setPlate] = useState('');\n  const [motorcycleBrand, setMotorcycleBrand] = useState('');\n  const [motorcycleModel, setMotorcycleModel] = useState('');\n  const [email, setEmail] = useState('');`,
);
replaceOnce(
  'src/screens/AuthScreen.tsx',
  `  const submit = async () => {\n    if (!email.trim() || password.length < 6 || (mode === 'register' && !fullName.trim())) {\n      Alert.alert('Eksik bilgi', 'E-posta, en az 6 karakter şifre ve kayıt sırasında ad soyad gereklidir.');\n      return;\n    }\n    setLoading(true);\n    const message = mode === 'login'\n      ? await signIn(email, password)\n      : await signUp(fullName, phone, email, password, registerMode);\n    setLoading(false);\n    if (message) Alert.alert(mode === 'login' ? 'Giriş yapılamadı' : 'Bilgi', message);\n  };`,
  `  const submit = async () => {\n    const normalizedPlate = plate.trim().toUpperCase();\n    const customerMotorMissing = mode === 'register' && registerMode === 'customer'\n      && (normalizedPlate.replace(/[^A-Z0-9ÇĞİÖŞÜ]/g, '').length < 5 || !motorcycleBrand.trim() || !motorcycleModel.trim());\n    if (!email.trim() || password.length < 6 || (mode === 'register' && !fullName.trim()) || customerMotorMissing) {\n      Alert.alert(\n        'Eksik bilgi',\n        customerMotorMissing\n          ? 'Müşteri hesabı için plaka, motosiklet markası ve modeli zorunludur.'\n          : 'E-posta, en az 6 karakter şifre ve kayıt sırasında ad soyad gereklidir.',\n      );\n      return;\n    }\n    setLoading(true);\n    const message = mode === 'login'\n      ? await signIn(email, password)\n      : await signUp(\n          fullName,\n          phone,\n          email,\n          password,\n          registerMode,\n          registerMode === 'customer' ? { plate: normalizedPlate, brand: motorcycleBrand, model: motorcycleModel } : undefined,\n        );\n    setLoading(false);\n    if (message) Alert.alert(mode === 'login' ? 'Giriş yapılamadı' : 'Bilgi', message);\n  };`,
);
replaceOnce('src/screens/AuthScreen.tsx', 'GARAGE OS • v0.8.2 ADMIN PANELİ HAZIR', 'GARAGE OS • v0.8.3 MOTOR EŞLEŞTİRME HAZIR');
replaceOnce(
  'src/screens/AuthScreen.tsx',
  `                <FormField label="Telefon" value={phone} onChangeText={setPhone} placeholder="05xx xxx xx xx" keyboardType="phone-pad" />\n              </>`,
  `                <FormField label="Telefon" value={phone} onChangeText={setPhone} placeholder="05xx xxx xx xx" keyboardType="phone-pad" />\n                {registerMode === 'customer' && (\n                  <View style={[styles.motorCard, { backgroundColor: \`${'${colors.cyan}'}0D\`, borderColor: \`${'${colors.cyan}'}38\` }]}>\n                    <View style={styles.motorHeader}><Ionicons name="bicycle" size={22} color={colors.cyan} /><View style={styles.motorCopy}><Text style={[styles.motorTitle, { color: colors.text }]}>Motosiklet bilgileri</Text><Text style={[styles.motorText, { color: colors.textMuted }]}>Usta hesabını plaka üzerinden güvenle bulabilsin.</Text></View></View>\n                    <FormField label="Plaka" value={plate} onChangeText={(value) => setPlate(value.toUpperCase())} placeholder="06 ABC 123" autoCapitalize="characters" />\n                    <FormField label="Motosiklet Markası" value={motorcycleBrand} onChangeText={setMotorcycleBrand} placeholder="Örn. Honda" autoCapitalize="words" />\n                    <FormField label="Motosiklet Modeli" value={motorcycleModel} onChangeText={setMotorcycleModel} placeholder="Örn. Forza 250" autoCapitalize="words" />\n                  </View>\n                )}\n              </>`,
);
replaceOnce(
  'src/screens/AuthScreen.tsx',
  `Her bildirim yalnız ilgili kullanıcıya ve yetkili işletme hesabına gösterilir.`,
  `Müşteri motoru yalnız Usta onayı veya güvenli servis doğrulamasıyla işletmeye bağlanır.`,
);
replaceOnce(
  'src/screens/AuthScreen.tsx',
  `  label: { fontSize: 10, fontWeight: '900', letterSpacing: 0.9 }, accountRow:`,
  `  label: { fontSize: 10, fontWeight: '900', letterSpacing: 0.9 }, motorCard: { borderWidth: 1, borderRadius: 19, padding: 13, gap: 12 }, motorHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 }, motorCopy: { flex: 1 }, motorTitle: { fontSize: 13, fontWeight: '900' }, motorText: { fontSize: 10, lineHeight: 15, marginTop: 2 }, accountRow:`,
);

replaceOnce(
  'src/screens/WorkshopSetupScreen.tsx',
  `  const [address, setAddress] = useState('');\n  const [code, setCode] = useState('');`,
  `  const [address, setAddress] = useState('');\n  const [taxOffice, setTaxOffice] = useState('');\n  const [taxNumber, setTaxNumber] = useState('');\n  const [code, setCode] = useState('');`,
);
replaceOnce(
  'src/screens/WorkshopSetupScreen.tsx',
  `    if (mode === 'create' && !name.trim()) return Alert.alert('İşletme adı gerekli');\n    if (mode === 'join' && code.trim().length < 6) return Alert.alert('Geçerli bir davet kodu gir');\n    setLoading(true);\n    const error = mode === 'create' ? await createWorkshop(name, phone, address) : await joinWorkshop(code);`,
  `    const normalizedTaxNumber = taxNumber.replace(/\\D/g, '');\n    if (mode === 'create' && !name.trim()) return Alert.alert('İşletme adı gerekli');\n    if (mode === 'create' && (!taxOffice.trim() || ![10, 11].includes(normalizedTaxNumber.length))) return Alert.alert('Vergi bilgileri gerekli', 'Vergi Dairesi ile 10 veya 11 haneli Vergi Numarasını gir.');\n    if (mode === 'join' && code.trim().length < 6) return Alert.alert('Geçerli bir davet kodu gir');\n    setLoading(true);\n    const error = mode === 'create' ? await createWorkshop(name, phone, address, taxOffice, normalizedTaxNumber) : await joinWorkshop(code);`,
);
replaceOnce(
  'src/screens/WorkshopSetupScreen.tsx',
  `<FormField label="Adres" value={address} onChangeText={setAddress} multiline /><PrimaryButton title="Garajımı Oluştur"`,
  `<FormField label="Adres" value={address} onChangeText={setAddress} multiline /><FormField label="Vergi Dairesi" value={taxOffice} onChangeText={setTaxOffice} placeholder="Örn. Muratpaşa Vergi Dairesi" autoCapitalize="words" /><FormField label="Vergi Numarası" value={taxNumber} onChangeText={(value) => setTaxNumber(value.replace(/\\D/g, ''))} keyboardType="number-pad" maxLength={11} placeholder="10 veya 11 hane" /><PrimaryButton title="Garajımı Oluştur"`,
);

replaceOnce(
  'src/customer/CustomerLinkPanel.tsx',
  `  const [method, setMethod] = useState<Method>('phone');\n  const [plate, setPlate] = useState('');`,
  `  const [method, setMethod] = useState<Method>('approval');\n  const [plate, setPlate] = useState(profile?.customer_plate ?? '');`,
);
replaceOnce(
  'src/customer/CustomerLinkPanel.tsx',
  `  const submit = async () => {\n    setLoading(true);`,
  `  const submit = async () => {\n    if (method !== 'qr' && plate.trim().replace(/[^A-Za-z0-9ÇĞİÖŞÜçğıöşü]/g, '').length < 5) return Alert.alert('Geçerli plaka gir');\n    setLoading(true);`,
);
replaceOnce(
  'src/customer/CustomerLinkPanel.tsx',
  `          : await supabase.rpc('customer_request_mechanic_approval', { p_plate: plate.trim(), p_phone: phone.trim() || null });`,
  `          : await supabase.rpc('customer_request_mechanic_approval', { p_plate: plate.trim() });`,
);
replaceOnce(
  'src/customer/CustomerLinkPanel.tsx',
  `<View style={styles.copy}><Text style={[styles.heroTitle, { color: colors.text }]}>Motorunu güvenle bağla</Text><Text style={[styles.heroText, { color: colors.textMuted }]}>Plaka tek başına yeterli değildir. Telefon, servis kodu, QR veya usta onayı gerekir.</Text></View>`,
  `<View style={styles.copy}><Text style={[styles.heroTitle, { color: colors.text }]}>Motorunu güvenle bağla</Text><Text style={[styles.heroText, { color: colors.textMuted }]}>{profile?.customer_motorcycle_brand ? \`Kayıtlı motor: ${'${profile.customer_motorcycle_brand}'} ${'${profile.customer_motorcycle_model}'} • ${'${profile.customer_plate}'}\` : 'Plakanı yaz, işletmedeki Usta onayladığında motor hesabına bağlansın.'}</Text></View>`,
);
replaceOnce(
  'src/customer/CustomerLinkPanel.tsx',
  `        {method === 'approval' && <FormField label="Telefon (opsiyonel)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />}\n`,
  `        {method === 'approval' && <Text style={[styles.scanText, { color: colors.textMuted }]}>Talep, bu plakayı işletmesinde kayıtlı gören Ustanın Eşleşme Talepleri ekranına düşer.</Text>}\n`,
);

replaceOnce(
  'src/screens/CustomersScreen.tsx',
  `import { Customer, Motorcycle, StaffCustomerClaim, WorkOrderStatus } from '../types';`,
  `import { Customer, Motorcycle, StaffCustomerClaim, StaffRegisteredCustomerMatch, WorkOrderStatus } from '../types';`,
);
replaceOnce(
  'src/screens/CustomersScreen.tsx',
  `  const [saving, setSaving] = useState(false); const [refreshing, setRefreshing] = useState(false);`,
  `  const [saving, setSaving] = useState(false); const [refreshing, setRefreshing] = useState(false);\n  const [accountPlate, setAccountPlate] = useState('');\n  const [accountMatches, setAccountMatches] = useState<StaffRegisteredCustomerMatch[]>([]);\n  const [accountLoading, setAccountLoading] = useState(false);`,
);
replaceOnce(
  'src/screens/CustomersScreen.tsx',
  `  const review = (claim: StaffCustomerClaim, approve: boolean) => Alert.alert(approve ? 'Eşleşmeyi onayla' : 'Talebi reddet', \`${'${claim.claimant_name}'} • ${'${claim.plate}'}\`, [\n    { text: 'Vazgeç', style: 'cancel' },\n    { text: approve ? 'Onayla' : 'Reddet', style: approve ? 'default' : 'destructive', onPress: async () => { const { error } = await supabase.rpc('staff_review_customer_claim', { p_claim_id: claim.id, p_approve: approve, p_note: null }); if (error) return Alert.alert('İşlem başarısız', error.message); await load(); } },\n  ]);`,
  `  const review = (claim: StaffCustomerClaim, approve: boolean) => Alert.alert(approve ? 'Eşleşmeyi onayla' : 'Talebi reddet', \`${'${claim.claimant_name}'} • ${'${claim.plate}'}\`, [\n    { text: 'Vazgeç', style: 'cancel' },\n    { text: approve ? 'Onayla' : 'Reddet', style: approve ? 'default' : 'destructive', onPress: async () => { const { error } = await supabase.rpc('staff_review_customer_claim', { p_claim_id: claim.id, p_approve: approve, p_note: null }); if (error) return Alert.alert('İşlem başarısız', error.message); await load(); } },\n  ]);\n\n  const findRegisteredAccount = async () => {\n    if (!workshop || accountPlate.trim().replace(/[^A-Za-z0-9ÇĞİÖŞÜçğıöşü]/g, '').length < 5) return Alert.alert('Geçerli plaka gir');\n    setAccountLoading(true);\n    const { data, error } = await supabase.rpc('staff_find_registered_customer_by_plate', { p_workshop_id: workshop.id, p_plate: accountPlate.trim() });\n    setAccountLoading(false);\n    if (error) return Alert.alert('Hesap aranamadı', error.message);\n    const rows = (data as StaffRegisteredCustomerMatch[] | null) ?? [];\n    setAccountMatches(rows);\n    if (rows.length === 0) Alert.alert('Kayıt bulunamadı', 'Bu plakayla açılmış bir müşteri hesabı bulunamadı.');\n  };\n\n  const linkRegisteredAccount = async (match: StaffRegisteredCustomerMatch) => {\n    if (!workshop) return;\n    Alert.alert('Müşteri hesabını eşleştir', \`${'${match.full_name}'} • ${'${match.registered_plate}'}\`, [\n      { text: 'Vazgeç', style: 'cancel' },\n      { text: 'Onayla ve Eşleştir', onPress: async () => {\n        setAccountLoading(true);\n        const { error } = await supabase.rpc('staff_link_registered_customer_by_plate', { p_workshop_id: workshop.id, p_user_id: match.user_id, p_plate: match.registered_plate });\n        setAccountLoading(false);\n        if (error) return Alert.alert('Eşleştirme yapılamadı', error.message);\n        setAccountMatches([]); setAccountPlate(''); await load();\n        Alert.alert('Hesap eşleştirildi', 'Müşteri hesabı ve motosiklet bu işletmeye güvenle bağlandı.');\n      } },\n    ]);\n  };`,
);
replaceOnce(
  'src/screens/CustomersScreen.tsx',
  `    </> : <>{claims.length === 0 ?`,
  `    </> : <>\n      <GlassCard style={styles.accountSearch}>\n        <View style={styles.accountSearchHeader}><View style={[styles.accountSearchIcon, { backgroundColor: \`${'${colors.cyan}'}16\` }]}><Ionicons name="search-circle" size={27} color={colors.cyan} /></View><View style={styles.copy}><Text style={[styles.formTitle, { color: colors.text }]}>Plaka ile müşteri hesabını bul</Text><Text style={[styles.meta, { color: colors.textMuted }]}>Müşteri kayıt olurken yazdığı plakayı gir. Hesap bulunursa mevcut işletme kaydıyla eşleştir veya kayıt yoksa müşteri ve motor kaydını otomatik oluştur.</Text></View></View>\n        <FormField label="Müşteri Plakası" value={accountPlate} onChangeText={(value) => setAccountPlate(value.toUpperCase())} placeholder="06 ABC 123" autoCapitalize="characters" />\n        <PrimaryButton title="Müşteri Hesabını Ara" onPress={findRegisteredAccount} loading={accountLoading} secondary />\n        {accountMatches.map((match) => <View key={match.user_id} style={[styles.accountMatch, { backgroundColor: colors.surfaceSoft, borderColor: match.already_linked ? \`${'${colors.green}'}45\` : colors.border }]}><View style={styles.copy}><Text style={[styles.claimTitle, { color: colors.text }]}>{match.full_name}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{match.registered_brand} {match.registered_model} • {match.registered_plate}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{match.workshop_customer_name ? \`İşletme kaydı: ${'${match.workshop_customer_name}'}\` : 'İşletme kaydı eşleştirme sırasında oluşturulacak'}</Text></View>{match.already_linked ? <Text style={[styles.claimStatus, { color: colors.green }]}>BAĞLI</Text> : <AnimatedPressable onPress={() => linkRegisteredAccount(match)} style={[styles.linkAccountButton, { backgroundColor: \`${'${colors.green}'}12\`, borderColor: \`${'${colors.green}'}45\` }]}><Text style={[styles.actionText, { color: colors.green }]}>Eşleştir</Text></AnimatedPressable>}</View>)}\n      </GlassCard>\n      {claims.length === 0 ?`,
);
replaceOnce(
  'src/screens/CustomersScreen.tsx',
  `: claims.map((claim) => { const accent`,
  `: claims.map((claim) => { const accent`,
);
replaceLast(
  'src/screens/CustomersScreen.tsx',
  `  content: { paddingHorizontal: 18, paddingTop: 56, paddingBottom: 120, gap: 14 }, tabs:`,
  `  content: { paddingHorizontal: 18, paddingTop: 56, paddingBottom: 120, gap: 14 }, accountSearch: { gap: 12 }, accountSearchHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 }, accountSearchIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, accountMatch: { minHeight: 76, borderWidth: 1, borderRadius: 16, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 9 }, linkAccountButton: { minHeight: 40, paddingHorizontal: 13, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, tabs:`,
);

replaceOnce(
  'src/screens/AdminScreen.tsx',
  `  const [businessAddress, setBusinessAddress] = useState('');\n  const [editName, setEditName]`,
  `  const [businessAddress, setBusinessAddress] = useState('');\n  const [businessTaxOffice, setBusinessTaxOffice] = useState('');\n  const [businessTaxNumber, setBusinessTaxNumber] = useState('');\n  const [editName, setEditName]`,
);
replaceOnce(
  'src/screens/AdminScreen.tsx',
  `  const [editAddress, setEditAddress] = useState(workshop?.address ?? '');`,
  `  const [editAddress, setEditAddress] = useState(workshop?.address ?? '');\n  const [editTaxOffice, setEditTaxOffice] = useState(workshop?.tax_office ?? '');\n  const [editTaxNumber, setEditTaxNumber] = useState(workshop?.tax_number ?? '');`,
);
replaceOnce(
  'src/screens/AdminScreen.tsx',
  `    setEditAddress(workshop?.address ?? '');\n  }, [workshop?.id, workshop?.name, workshop?.phone, workshop?.address]);`,
  `    setEditAddress(workshop?.address ?? '');\n    setEditTaxOffice(workshop?.tax_office ?? '');\n    setEditTaxNumber(workshop?.tax_number ?? '');\n  }, [workshop?.id, workshop?.name, workshop?.phone, workshop?.address, workshop?.tax_office, workshop?.tax_number]);`,
);
replaceOnce(
  'src/screens/AdminScreen.tsx',
  `    if (!businessName.trim()) return Alert.alert('İşletme adı gerekli');\n    setLoading(true);\n    const error = await createWorkshop(businessName, businessPhone, businessAddress);`,
  `    const normalizedTaxNumber = businessTaxNumber.replace(/\\D/g, '');\n    if (!businessName.trim()) return Alert.alert('İşletme adı gerekli');\n    if (!businessTaxOffice.trim() || ![10, 11].includes(normalizedTaxNumber.length)) return Alert.alert('Vergi bilgileri gerekli', 'Vergi Dairesi ile 10 veya 11 haneli Vergi Numarasını gir.');\n    setLoading(true);\n    const error = await createWorkshop(businessName, businessPhone, businessAddress, businessTaxOffice, normalizedTaxNumber);`,
);
replaceOnce(
  'src/screens/AdminScreen.tsx',
  `    setBusinessAddress('');\n    setShowBusinessForm(false);`,
  `    setBusinessAddress('');\n    setBusinessTaxOffice('');\n    setBusinessTaxNumber('');\n    setShowBusinessForm(false);`,
);
replaceOnce(
  'src/screens/AdminScreen.tsx',
  `      p_address: editAddress.trim() || null,\n    });`,
  `      p_address: editAddress.trim() || null,\n      p_tax_office: editTaxOffice.trim(),\n      p_tax_number: editTaxNumber.replace(/\\D/g, ''),\n    });`,
);
replaceOnce(
  'src/screens/AdminScreen.tsx',
  `          <FormField label="Adres" value={businessAddress} onChangeText={setBusinessAddress} multiline />\n          <PrimaryButton title="İşletmeyi Oluştur"`,
  `          <FormField label="Adres" value={businessAddress} onChangeText={setBusinessAddress} multiline />\n          <FormField label="Vergi Dairesi" value={businessTaxOffice} onChangeText={setBusinessTaxOffice} />\n          <FormField label="Vergi Numarası" value={businessTaxNumber} onChangeText={(value) => setBusinessTaxNumber(value.replace(/\\D/g, ''))} keyboardType="number-pad" maxLength={11} />\n          <PrimaryButton title="İşletmeyi Oluştur"`,
);
replaceOnce(
  'src/screens/AdminScreen.tsx',
  `        <FormField label="Adres" value={editAddress} onChangeText={setEditAddress} multiline />\n        <PrimaryButton title="İşletme Bilgilerini Güncelle"`,
  `        <FormField label="Adres" value={editAddress} onChangeText={setEditAddress} multiline />\n        <FormField label="Vergi Dairesi" value={editTaxOffice} onChangeText={setEditTaxOffice} />\n        <FormField label="Vergi Numarası" value={editTaxNumber} onChangeText={(value) => setEditTaxNumber(value.replace(/\\D/g, ''))} keyboardType="number-pad" maxLength={11} />\n        <PrimaryButton title="İşletme Bilgilerini Güncelle"`,
);

replaceOnce(
  'src/screens/SettingsScreen.tsx',
  `<Info icon="layers" label="Sürüm" value="v0.8.2 • Ayrı Admin Paneli" /><Info icon="notifications"`,
  `<Info icon="layers" label="Sürüm" value="v0.8.3 • Motor ve Vergi Eşleştirme" /><Info icon="notifications"`,
);
replaceOnce(
  'src/screens/SettingsScreen.tsx',
  `<Info icon="archive" label="Bu sürüm öncesi yedek" value="backup/v0.8.1-before-v0.8.2" /><Info icon="refresh" label="Geri alma" value="Kod yedeğiyle v0.8.1" />`,
  `<Info icon="archive" label="Bu sürüm öncesi yedek" value="backup/v0.8.2-before-v0.8.3" /><Info icon="refresh" label="Geri alma" value="Kod yedeğiyle v0.8.2" />`,
);

const migration = String.raw`-- DraBornGarage v0.8.3
-- Customer registration motorcycle, workshop tax identity and plate-based staff linking.

alter table public.profiles add column if not exists customer_plate text;
alter table public.profiles add column if not exists customer_motorcycle_brand text;
alter table public.profiles add column if not exists customer_motorcycle_model text;
alter table public.workshops add column if not exists tax_office text;
alter table public.workshops add column if not exists tax_number text;

create index if not exists idx_profiles_customer_plate_normalized
  on public.profiles (public.normalize_plate(customer_plate))
  where customer_plate is not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, full_name, phone, account_mode,
    customer_plate, customer_motorcycle_brand, customer_motorcycle_model
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    case when new.raw_user_meta_data ->> 'account_mode' = 'customer' then 'customer' else 'staff' end,
    case when new.raw_user_meta_data ->> 'account_mode' = 'customer' then nullif(public.normalize_plate(new.raw_user_meta_data ->> 'customer_plate'), '') else null end,
    case when new.raw_user_meta_data ->> 'account_mode' = 'customer' then nullif(trim(new.raw_user_meta_data ->> 'customer_motorcycle_brand'), '') else null end,
    case when new.raw_user_meta_data ->> 'account_mode' = 'customer' then nullif(trim(new.raw_user_meta_data ->> 'customer_motorcycle_model'), '') else null end
  )
  on conflict (id) do update
  set full_name = excluded.full_name,
      phone = coalesce(excluded.phone, public.profiles.phone),
      account_mode = excluded.account_mode,
      customer_plate = coalesce(excluded.customer_plate, public.profiles.customer_plate),
      customer_motorcycle_brand = coalesce(excluded.customer_motorcycle_brand, public.profiles.customer_motorcycle_brand),
      customer_motorcycle_model = coalesce(excluded.customer_motorcycle_model, public.profiles.customer_motorcycle_model),
      updated_at = now();
  return new;
end;
$$;

-- Replace workshop creation RPCs with required tax information.
drop function if exists public.create_workshop(text, text, text);
create function public.create_workshop(
  p_name text,
  p_phone text default null,
  p_address text default null,
  p_tax_office text default null,
  p_tax_number text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  normalized_tax text := regexp_replace(coalesce(p_tax_number, ''), '[^0-9]', '', 'g');
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if char_length(trim(p_name)) < 2 then raise exception 'İşletme adı çok kısa'; end if;
  if char_length(trim(coalesce(p_tax_office, ''))) < 2 then raise exception 'Vergi Dairesi zorunludur'; end if;
  if length(normalized_tax) not in (10, 11) then raise exception 'Vergi Numarası 10 veya 11 haneli olmalıdır'; end if;

  insert into public.workshops(name, phone, address, tax_office, tax_number, created_by)
  values (trim(p_name), nullif(trim(p_phone), ''), nullif(trim(p_address), ''), trim(p_tax_office), normalized_tax, auth.uid())
  returning id into new_id;

  insert into public.workshop_members(workshop_id, user_id, role)
  values (new_id, auth.uid(), 'owner_mechanic');

  return new_id;
end;
$$;

drop function if exists public.admin_create_workshop(text, text, text);
create function public.admin_create_workshop(
  p_name text,
  p_phone text default null,
  p_address text default null,
  p_tax_office text default null,
  p_tax_number text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  normalized_tax text := regexp_replace(coalesce(p_tax_number, ''), '[^0-9]', '', 'g');
begin
  if not public.is_admin() then raise exception 'Bu işlem yalnızca Admin tarafından yapılabilir'; end if;
  if char_length(trim(p_name)) < 2 then raise exception 'İşletme adı çok kısa'; end if;
  if char_length(trim(coalesce(p_tax_office, ''))) < 2 then raise exception 'Vergi Dairesi zorunludur'; end if;
  if length(normalized_tax) not in (10, 11) then raise exception 'Vergi Numarası 10 veya 11 haneli olmalıdır'; end if;

  insert into public.workshops(name, phone, address, tax_office, tax_number, created_by)
  values (trim(p_name), nullif(trim(p_phone), ''), nullif(trim(p_address), ''), trim(p_tax_office), normalized_tax, auth.uid())
  returning id into new_id;
  return new_id;
end;
$$;

drop function if exists public.update_workshop_details(uuid, text, text, text);
create function public.update_workshop_details(
  p_workshop_id uuid,
  p_name text,
  p_phone text default null,
  p_address text default null,
  p_tax_office text default null,
  p_tax_number text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_tax text := regexp_replace(coalesce(p_tax_number, ''), '[^0-9]', '', 'g');
begin
  if not public.is_workshop_owner(p_workshop_id) then raise exception 'İşletme düzenleme yetkiniz yok'; end if;
  if char_length(trim(p_name)) < 2 then raise exception 'İşletme adı çok kısa'; end if;
  if char_length(trim(coalesce(p_tax_office, ''))) < 2 then raise exception 'Vergi Dairesi zorunludur'; end if;
  if length(normalized_tax) not in (10, 11) then raise exception 'Vergi Numarası 10 veya 11 haneli olmalıdır'; end if;
  update public.workshops
  set name = trim(p_name),
      phone = nullif(trim(p_phone), ''),
      address = nullif(trim(p_address), ''),
      tax_office = trim(p_tax_office),
      tax_number = normalized_tax,
      updated_at = now()
  where id = p_workshop_id;
end;
$$;

create or replace function public.customer_request_mechanic_approval(p_plate text, p_phone text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  request_count integer := 0;
  normalized_plate text := public.normalize_plate(p_plate);
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if length(normalized_plate) < 5 then raise exception 'Geçerli plaka girin'; end if;

  update public.profiles
  set account_mode = 'customer', customer_plate = normalized_plate, updated_at = now()
  where id = auth.uid();

  for rec in
    select distinct c.id as customer_id, c.workshop_id, m.id as motorcycle_id
    from public.motorcycles m
    join public.customers c on c.id = m.customer_id and c.workshop_id = m.workshop_id
    join public.workshops w on w.id = c.workshop_id and w.is_active
    where public.normalize_plate(m.plate) = normalized_plate
  loop
    if not exists (
      select 1 from public.customer_claims cc
      where cc.user_id = auth.uid() and cc.motorcycle_id = rec.motorcycle_id and cc.status = 'pending'
    ) then
      insert into public.customer_claims(user_id, workshop_id, customer_id, motorcycle_id, method, status, submitted_plate, submitted_phone)
      values (auth.uid(), rec.workshop_id, rec.customer_id, rec.motorcycle_id, 'mechanic_approval', 'pending', normalized_plate, nullif(public.normalize_phone(p_phone), ''));
      request_count := request_count + 1;
    end if;
  end loop;

  if request_count = 0 and not exists (
    select 1 from public.customer_claims where user_id = auth.uid() and submitted_plate = normalized_plate and status = 'pending'
  ) then
    raise exception 'Bu plakaya ait aktif işletme kaydı bulunamadı. Usta önce motoru işletmeye kaydetsin veya plakayla hesabınızı eşleştirsin.';
  end if;

  return jsonb_build_object('request_count', request_count, 'status', 'pending');
end;
$$;

create or replace function public.staff_find_registered_customer_by_plate(p_workshop_id uuid, p_plate text)
returns table(
  user_id uuid,
  full_name text,
  phone text,
  registered_plate text,
  registered_brand text,
  registered_model text,
  already_linked boolean,
  workshop_customer_id uuid,
  workshop_customer_name text,
  workshop_motorcycle_id uuid
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare normalized_plate text := public.normalize_plate(p_plate);
begin
  if not public.is_workshop_owner(p_workshop_id) and not public.is_workshop_worker(p_workshop_id) then
    raise exception 'Müşteri hesabı arama yetkiniz yok';
  end if;
  if length(normalized_plate) < 5 then raise exception 'Geçerli plaka girin'; end if;

  return query
  select
    p.id,
    p.full_name,
    p.phone,
    p.customer_plate,
    coalesce(p.customer_motorcycle_brand, 'Marka belirtilmedi'),
    coalesce(p.customer_motorcycle_model, 'Model belirtilmedi'),
    exists (
      select 1 from public.customer_links cl
      where cl.user_id = p.id and cl.workshop_id = p_workshop_id and cl.status = 'approved'
    ),
    existing.customer_id,
    existing.customer_name,
    existing.motorcycle_id
  from public.profiles p
  left join lateral (
    select c.id as customer_id, c.full_name as customer_name, m.id as motorcycle_id
    from public.motorcycles m
    join public.customers c on c.id = m.customer_id and c.workshop_id = m.workshop_id
    where m.workshop_id = p_workshop_id and public.normalize_plate(m.plate) = normalized_plate
    order by m.created_at desc
    limit 1
  ) existing on true
  where p.account_mode = 'customer'
    and public.normalize_plate(p.customer_plate) = normalized_plate
  order by p.full_name;
end;
$$;

create or replace function public.staff_link_registered_customer_by_plate(p_workshop_id uuid, p_user_id uuid, p_plate text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_plate text := public.normalize_plate(p_plate);
  account_rec record;
  customer_rec record;
  motorcycle_id_value uuid;
  claim_id_value uuid;
begin
  if not public.is_workshop_owner(p_workshop_id) and not public.is_workshop_worker(p_workshop_id) then
    raise exception 'Müşteri hesabı eşleştirme yetkiniz yok';
  end if;
  if length(normalized_plate) < 5 then raise exception 'Geçerli plaka girin'; end if;

  select id, full_name, phone, customer_motorcycle_brand, customer_motorcycle_model
  into account_rec
  from public.profiles
  where id = p_user_id
    and account_mode = 'customer'
    and public.normalize_plate(customer_plate) = normalized_plate;

  if account_rec.id is null then raise exception 'Bu plakaya ait müşteri hesabı bulunamadı'; end if;

  select c.id as customer_id, c.full_name as customer_name, m.id as motorcycle_id
  into customer_rec
  from public.motorcycles m
  join public.customers c on c.id = m.customer_id and c.workshop_id = m.workshop_id
  where m.workshop_id = p_workshop_id and public.normalize_plate(m.plate) = normalized_plate
  order by m.created_at desc
  limit 1;

  if customer_rec.customer_id is null then
    insert into public.customers(workshop_id, full_name, phone, note, created_by)
    values (p_workshop_id, account_rec.full_name, account_rec.phone, 'Müşteri hesabından plaka ile oluşturuldu', auth.uid())
    returning id into customer_rec.customer_id;

    insert into public.motorcycles(workshop_id, customer_id, brand, model, plate, created_by)
    values (
      p_workshop_id,
      customer_rec.customer_id,
      coalesce(nullif(trim(account_rec.customer_motorcycle_brand), ''), 'Belirtilmedi'),
      coalesce(nullif(trim(account_rec.customer_motorcycle_model), ''), 'Belirtilmedi'),
      normalized_plate,
      auth.uid()
    )
    returning id into motorcycle_id_value;
  else
    motorcycle_id_value := customer_rec.motorcycle_id;
  end if;

  update public.customer_claims
  set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), review_note = 'Usta plaka ile doğrudan eşleştirdi', updated_at = now()
  where user_id = p_user_id and motorcycle_id = motorcycle_id_value and status = 'pending'
  returning id into claim_id_value;

  if claim_id_value is null then
    insert into public.customer_claims(
      user_id, workshop_id, customer_id, motorcycle_id, method, status,
      submitted_plate, reviewed_by, reviewed_at, review_note
    )
    values (
      p_user_id, p_workshop_id, customer_rec.customer_id, motorcycle_id_value,
      'staff_manual', 'approved', normalized_plate, auth.uid(), now(), 'Usta plaka ile doğrudan eşleştirdi'
    )
    returning id into claim_id_value;
  end if;

  perform public.approve_customer_link(p_user_id, customer_rec.customer_id, p_workshop_id, 'staff_manual', auth.uid());
  update public.profiles set account_mode = 'customer', customer_plate = normalized_plate, updated_at = now() where id = p_user_id;

  return jsonb_build_object(
    'status', 'approved',
    'customer_id', customer_rec.customer_id,
    'motorcycle_id', motorcycle_id_value,
    'claim_id', claim_id_value
  );
end;
$$;

revoke all on function public.create_workshop(text, text, text, text, text) from public, anon;
revoke all on function public.admin_create_workshop(text, text, text, text, text) from public, anon;
revoke all on function public.update_workshop_details(uuid, text, text, text, text, text) from public, anon;
revoke all on function public.staff_find_registered_customer_by_plate(uuid, text) from public, anon;
revoke all on function public.staff_link_registered_customer_by_plate(uuid, uuid, text) from public, anon;
grant execute on function public.create_workshop(text, text, text, text, text) to authenticated, service_role;
grant execute on function public.admin_create_workshop(text, text, text, text, text) to authenticated, service_role;
grant execute on function public.update_workshop_details(uuid, text, text, text, text, text) to authenticated, service_role;
grant execute on function public.staff_find_registered_customer_by_plate(uuid, text) to authenticated, service_role;
grant execute on function public.staff_link_registered_customer_by_plate(uuid, uuid, text) to authenticated, service_role;
`;
write('supabase/migrations/20260711220000_v0_8_3_customer_motor_tax_linking.sql', `${migration.trim()}\n`);

const rollback = String.raw`-- DraBornGarage v0.8.3 rollback to v0.8.2.
-- Run only when intentionally reverting the database feature.

drop function if exists public.staff_link_registered_customer_by_plate(uuid, uuid, text);
drop function if exists public.staff_find_registered_customer_by_plate(uuid, text);

drop function if exists public.create_workshop(text, text, text, text, text);
create function public.create_workshop(p_name text, p_phone text default null, p_address text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if char_length(trim(p_name)) < 2 then raise exception 'İşletme adı çok kısa'; end if;
  insert into public.workshops(name, phone, address, created_by)
  values (trim(p_name), nullif(trim(p_phone), ''), nullif(trim(p_address), ''), auth.uid()) returning id into new_id;
  insert into public.workshop_members(workshop_id, user_id, role) values (new_id, auth.uid(), 'owner_mechanic');
  return new_id;
end; $$;

drop function if exists public.admin_create_workshop(text, text, text, text, text);
create function public.admin_create_workshop(p_name text, p_phone text default null, p_address text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  if not public.is_admin() then raise exception 'Bu işlem yalnızca Admin tarafından yapılabilir'; end if;
  if char_length(trim(p_name)) < 2 then raise exception 'İşletme adı çok kısa'; end if;
  insert into public.workshops(name, phone, address, created_by)
  values (trim(p_name), nullif(trim(p_phone), ''), nullif(trim(p_address), ''), auth.uid()) returning id into new_id;
  return new_id;
end; $$;

drop function if exists public.update_workshop_details(uuid, text, text, text, text, text);
create function public.update_workshop_details(p_workshop_id uuid, p_name text, p_phone text default null, p_address text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_workshop_owner(p_workshop_id) then raise exception 'İşletme düzenleme yetkiniz yok'; end if;
  update public.workshops set name=trim(p_name), phone=nullif(trim(p_phone), ''), address=nullif(trim(p_address), ''), updated_at=now() where id=p_workshop_id;
end; $$;

grant execute on function public.create_workshop(text, text, text) to authenticated, service_role;
grant execute on function public.admin_create_workshop(text, text, text) to authenticated, service_role;
grant execute on function public.update_workshop_details(uuid, text, text, text) to authenticated, service_role;

drop index if exists public.idx_profiles_customer_plate_normalized;
alter table public.profiles drop column if exists customer_motorcycle_model;
alter table public.profiles drop column if exists customer_motorcycle_brand;
alter table public.profiles drop column if exists customer_plate;
alter table public.workshops drop column if exists tax_number;
alter table public.workshops drop column if exists tax_office;
`;
write('supabase/rollbacks/20260711220000_v0_8_3_customer_motor_tax_linking_rollback.sql', `${rollback.trim()}\n`);

const roadmap = read('docs/ROADMAP.md')
  .replace('Güncel sürüm `v0.8.0`dır.', 'Güncel sürüm `v0.8.3`dür.')
  .replace('## v0.9 — Google Play Uyum, Test ve Pilot', `## v0.8.3 — Kayıtlı Motor, Vergi Bilgileri ve Plaka Eşleştirme ✅\n\n**Amaç:** Müşteri ve işletme kayıtlarını gerçek kullanım için tamamlamak; Ustanın plakayla hesabı güvenli eşleştirmesini sağlamak.\n\n- [x] Müşteri kaydında zorunlu plaka, motosiklet marka ve model\n- [x] Kayıtlı motor bilgisinin müşteri profilinde saklanması\n- [x] Müşterinin plakayla Usta onayı istemesi\n- [x] Ustanın Eşleşme Talepleri ekranından onay vermesi\n- [x] Ustanın plakayla kayıtlı müşteri hesabı araması\n- [x] İşletme kaydı yoksa müşteri/motor kaydının güvenli oluşturulması\n- [x] İşletme oluştururken Vergi Dairesi ve Vergi Numarası\n- [x] Admin işletme oluşturma/düzenleme ekranında vergi bilgileri\n- [x] RLS/SECURITY DEFINER yetki kontrolleri, migration ve rollback\n\n## v0.9 — Google Play Uyum, Test ve Pilot`);
write('docs/ROADMAP.md', roadmap);

write('docs/CHANGELOG_V0.8.3.md', `# DraBornGarage v0.8.3 Değişiklikleri\n\nTarih: 11 Temmuz 2026\n\n## Müşteri kaydı\n- Plaka, motosiklet markası ve modeli müşteri hesabında zorunlu hale getirildi.\n- Bilgiler Supabase profilinde saklanıyor ve motor eşleştirme ekranına otomatik taşınıyor.\n\n## Motor ve işletme eşleştirme\n- Müşteri, plakayı yazarak Usta onayı talebi gönderebilir.\n- Usta, mevcut Eşleşme Talepleri sekmesinden talebi onaylayabilir veya reddedebilir.\n- Usta ayrıca plakayı yazarak kayıtlı müşteri hesabını arayabilir ve doğrudan eşleştirebilir.\n- İşletmede motor kaydı yoksa onay sırasında müşteri ve motosiklet kaydı kayıtlı profil bilgileriyle oluşturulur.\n- Eşleştirme sonucunda müşteri bağlantısı, claim geçmişi ve v0.8 bildirimleri birlikte çalışır.\n\n## İşletme kaydı\n- Vergi Dairesi ve 10/11 haneli Vergi Numarası işletme oluştururken zorunludur.\n- Admin işletme oluşturma ve düzenleme ekranları aynı bilgileri destekler.\n\n## Teknik\n- Sürüm: v0.8.3\n- Önceki sabit yedek: backup/v0.8.2-before-v0.8.3\n- Migration: 20260711220000_v0_8_3_customer_motor_tax_linking.sql\n- Rollback: 20260711220000_v0_8_3_customer_motor_tax_linking_rollback.sql\n`);

write('docs/PROJECT_HANDOFF_V0.8.3.md', `# DraBornGarage — v0.8.3 Devam Dosyası\n\n**Son güncelleme:** 11 Temmuz 2026  \n**Güncel sürüm:** \`v0.8.3\`  \n**GitHub:** \`DrabornEagle/DraBornGarage\`  \n**Supabase:** \`xpdiwyxnnrmyvpcqwuyb\`  \n**Sonraki ana sürüm:** \`v0.9.0\`\n\n## Bu sürümde tamamlananlar\n- Müşteri kaydında zorunlu plaka, motosiklet markası ve modeli.\n- Kayıtlı motor bilgilerinin profil tetikleyicisiyle Supabase'e yazılması.\n- Müşterinin plakayla Usta onayı istemesi ve talebin Usta paneline düşmesi.\n- Ustanın talebi onaylayıp motoru/işletmeyi müşteri hesabına bağlaması.\n- Ustanın plakayla kayıtlı hesabı arayıp doğrudan eşleştirmesi.\n- İşletme oluştururken Vergi Dairesi ve Vergi Numarası zorunluluğu.\n- Admin işletme oluşturma/düzenleme desteği.\n\n## Güvenlik kararı\nPlaka tek başına müşteri hesabını otomatik açmaz. Son bağlantı Usta/İşletme yetkisiyle onaylanır. RPC'ler işletme sahibi veya aktif Usta rolü kontrolü yapar.\n\n## Sürüm ve geri alma\n- Güncel sürüm: \`v0.8.3\`\n- Sabit kod yedeği: \`backup/v0.8.2-before-v0.8.3\`\n- Migration: \`supabase/migrations/20260711220000_v0_8_3_customer_motor_tax_linking.sql\`\n- Rollback: \`supabase/rollbacks/20260711220000_v0_8_3_customer_motor_tax_linking_rollback.sql\`\n\n## Sonraki adım\nKod, Supabase migration, TypeScript ve Android bundle kontrolleri tamamlandıktan sonra \`v0.9.0 — Google Play Uyum, Test ve Pilot\` aşamasına geçilir.\n`);

console.log('DraBornGarage v0.8.3 source, docs and SQL files prepared.');
