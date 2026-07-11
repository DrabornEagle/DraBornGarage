import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const write = (file, content) => {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
};

function replaceOnce(file, before, after) {
  const source = read(file);
  const index = source.indexOf(before);
  if (index < 0) {
    if (source.includes(after)) return;
    throw new Error(`${file}: replacement target not found: ${before.slice(0, 180)}`);
  }
  if (source.indexOf(before, index + before.length) >= 0) throw new Error(`${file}: replacement target is not unique`);
  write(file, source.slice(0, index) + after + source.slice(index + before.length));
}

const pkg = JSON.parse(read('package.json'));
if (pkg.version !== '0.8.4') {
  if (pkg.version !== '0.8.3') throw new Error(`Expected 0.8.3, found ${pkg.version}`);
  pkg.version = '0.8.4';
  write('package.json', `${JSON.stringify(pkg, null, 2)}\n`);
}
const lock = JSON.parse(read('package-lock.json'));
lock.version = '0.8.4';
if (lock.packages?.['']) lock.packages[''].version = '0.8.4';
write('package-lock.json', `${JSON.stringify(lock, null, 2)}\n`);
const app = JSON.parse(read('app.json'));
app.expo.version = '0.8.4';
write('app.json', `${JSON.stringify(app, null, 2)}\n`);

write('src/components/AnimatedMotorcycleIcon.tsx', `import { MaterialCommunityIcons } from '@expo/vector-icons';\nimport React, { useEffect, useRef } from 'react';\nimport { Animated, StyleProp, ViewStyle } from 'react-native';\n\nexport function AnimatedMotorcycleIcon({ size = 26, color, style, active = true }: { size?: number; color: string; style?: StyleProp<ViewStyle>; active?: boolean }) {\n  const motion = useRef(new Animated.Value(0)).current;\n\n  useEffect(() => {\n    if (!active) { motion.setValue(0); return; }\n    const loop = Animated.loop(Animated.sequence([\n      Animated.timing(motion, { toValue: 1, duration: 850, useNativeDriver: true }),\n      Animated.timing(motion, { toValue: 0, duration: 850, useNativeDriver: true }),\n    ]));\n    loop.start();\n    return () => loop.stop();\n  }, [active, motion]);\n\n  const translateY = motion.interpolate({ inputRange: [0, 1], outputRange: [0, -2.2] });\n  const translateX = motion.interpolate({ inputRange: [0, 1], outputRange: [0, 1.4] });\n  const rotate = motion.interpolate({ inputRange: [0, 1], outputRange: ['-1deg', '1.5deg'] });\n\n  return <Animated.View style={[style, { transform: [{ translateY }, { translateX }, { rotate }] }]}><MaterialCommunityIcons name=\"motorbike\" size={size} color={color} /></Animated.View>;\n}\n`);

replaceOnce('src/types.ts', `export type ReceivableVisibility = 'staff' | 'customer';`, `export type ReceivableVisibility = 'staff' | 'customer';\nexport type BusinessApplicationStatus = 'pending' | 'approved' | 'rejected';`);
replaceOnce('src/types.ts', `export interface Profile {`, `export interface BusinessRegistrationData {\n  business_name: string;\n  business_phone?: string | null;\n  business_address?: string | null;\n  tax_office: string;\n  tax_number: string;\n}\n\nexport interface BusinessApplication {\n  id: string;\n  user_id: string;\n  applicant_name?: string | null;\n  applicant_email?: string | null;\n  applicant_phone?: string | null;\n  business_name: string;\n  business_phone?: string | null;\n  business_address?: string | null;\n  tax_office: string;\n  tax_number: string;\n  status: BusinessApplicationStatus;\n  submitted_at: string;\n  reviewed_at?: string | null;\n  review_note?: string | null;\n  workshop_id?: string | null;\n}\n\nexport interface Profile {`);

replaceOnce('src/context/AuthContext.tsx', `import { AccountMode, CustomerRegistrationMotor, CustomerWorkshopLink, MemberRole, Profile, Workshop, WorkshopMember } from '../types';`, `import { AccountMode, BusinessApplication, BusinessRegistrationData, CustomerRegistrationMotor, CustomerWorkshopLink, MemberRole, Profile, Workshop, WorkshopMember } from '../types';`);
replaceOnce('src/context/AuthContext.tsx', `  customerWorkshop: CustomerWorkshopLink | null;\n  customerWorkshops: CustomerWorkshopLink[];`, `  customerWorkshop: CustomerWorkshopLink | null;\n  customerWorkshops: CustomerWorkshopLink[];\n  businessApplication: BusinessApplication | null;`);
replaceOnce('src/context/AuthContext.tsx', `  signUp: (fullName: string, phone: string, email: string, password: string, accountMode?: AccountMode, customerMotor?: CustomerRegistrationMotor) => Promise<string | null>;`, `  signUp: (fullName: string, phone: string, email: string, password: string, accountMode?: AccountMode, customerMotor?: CustomerRegistrationMotor, businessRegistration?: BusinessRegistrationData) => Promise<string | null>;`);
replaceOnce('src/context/AuthContext.tsx', `  const [customerWorkshop, setCustomerWorkshop] = useState<CustomerWorkshopLink | null>(null);\n  const [loading, setLoading] = useState(true);`, `  const [customerWorkshop, setCustomerWorkshop] = useState<CustomerWorkshopLink | null>(null);\n  const [businessApplication, setBusinessApplication] = useState<BusinessApplication | null>(null);\n  const [loading, setLoading] = useState(true);`);
replaceOnce('src/context/AuthContext.tsx', `    setCustomerWorkshops([]);\n    setCustomerWorkshop(null);`, `    setCustomerWorkshops([]);\n    setCustomerWorkshop(null);\n    setBusinessApplication(null);`);
replaceOnce('src/context/AuthContext.tsx', `    const [{ data: profileData }, { data: memberData }, customerWorkshopResult] = await Promise.all([`, `    const [{ data: profileData }, { data: memberData }, customerWorkshopResult, { data: applicationData }] = await Promise.all([`);
replaceOnce('src/context/AuthContext.tsx', `      supabase.rpc('customer_get_workshops'),\n    ]);`, `      supabase.rpc('customer_get_workshops'),\n      supabase.from('business_applications').select('id,user_id,business_name,business_phone,business_address,tax_office,tax_number,status,submitted_at,reviewed_at,review_note,workshop_id').eq('user_id', userId).maybeSingle(),\n    ]);`);
replaceOnce('src/context/AuthContext.tsx', `    setProfile(nextProfile);\n    setMemberships(nextMemberships);`, `    setProfile(nextProfile);\n    setMemberships(nextMemberships);\n    setBusinessApplication((applicationData as BusinessApplication | null) ?? null);`);
replaceOnce('src/context/AuthContext.tsx', `  useEffect(() => {\n    refreshWorkspace();\n    const { data } = supabase.auth.onAuthStateChange(() => refreshWorkspace());\n    return () => data.subscription.unsubscribe();\n  }, [refreshWorkspace]);`, `  useEffect(() => {\n    refreshWorkspace();\n    const { data } = supabase.auth.onAuthStateChange(() => refreshWorkspace());\n    return () => data.subscription.unsubscribe();\n  }, [refreshWorkspace]);\n\n  useEffect(() => {\n    const userId = session?.user.id;\n    if (!userId) return;\n    const channel = supabase.channel(\`workspace-access-${'${userId}'}\`)\n      .on('postgres_changes', { event: '*', schema: 'public', table: 'business_applications', filter: \`user_id=eq.${'${userId}'}\` }, () => refreshWorkspace())\n      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: \`id=eq.${'${userId}'}\` }, () => refreshWorkspace())\n      .on('postgres_changes', { event: '*', schema: 'public', table: 'workshop_members', filter: \`user_id=eq.${'${userId}'}\` }, () => refreshWorkspace())\n      .subscribe();\n    return () => { supabase.removeChannel(channel); };\n  }, [session?.user.id, refreshWorkspace]);`);
replaceOnce('src/context/AuthContext.tsx', `    accountMode: profile?.account_mode ?? 'staff',`, `    accountMode: profile?.account_mode ?? 'customer',`);
replaceOnce('src/context/AuthContext.tsx', `    customerWorkshop,\n    customerWorkshops,\n    isAdmin`, `    customerWorkshop,\n    customerWorkshops,\n    businessApplication,\n    isAdmin`);
replaceOnce('src/context/AuthContext.tsx', `    signUp: async (fullName, phone, email, password, accountMode = 'staff', customerMotor) => {\n      const customerData = accountMode === 'customer' && customerMotor ? {\n        customer_plate: customerMotor.plate.trim().toUpperCase(),\n        customer_motorcycle_brand: customerMotor.brand.trim(),\n        customer_motorcycle_model: customerMotor.model.trim(),\n      } : {};\n      const { data, error } = await supabase.auth.signUp({\n        email: email.trim(),\n        password,\n        options: { data: { full_name: fullName.trim(), phone: phone.trim(), account_mode: accountMode, ...customerData } },\n      });`, `    signUp: async (fullName, phone, email, password, accountMode = 'customer', customerMotor, businessRegistration) => {\n      const customerData = accountMode === 'customer' && customerMotor ? {\n        customer_plate: customerMotor.plate.trim().toUpperCase(),\n        customer_motorcycle_brand: customerMotor.brand.trim(),\n        customer_motorcycle_model: customerMotor.model.trim(),\n      } : {};\n      const businessData = accountMode === 'staff' && businessRegistration ? {\n        business_name: businessRegistration.business_name.trim(),\n        business_phone: businessRegistration.business_phone?.trim() || phone.trim() || null,\n        business_address: businessRegistration.business_address?.trim() || null,\n        business_tax_office: businessRegistration.tax_office.trim(),\n        business_tax_number: businessRegistration.tax_number.replace(/\\D/g, ''),\n      } : {};\n      const { data, error } = await supabase.auth.signUp({\n        email: email.trim(),\n        password,\n        options: { data: { full_name: fullName.trim(), phone: phone.trim(), requested_account_mode: accountMode, account_mode: 'customer', ...customerData, ...businessData } },\n      });`);
replaceOnce('src/context/AuthContext.tsx', `  }), [session, profile, workshop, workshops, membership, memberships, customerWorkshop, customerWorkshops, loading, refreshWorkspace, clearState]);`, `  }), [session, profile, workshop, workshops, membership, memberships, customerWorkshop, customerWorkshops, businessApplication, loading, refreshWorkspace, clearState]);`);

replaceOnce('src/screens/AuthScreen.tsx', `import { AnimatedPressable } from '../components/AnimatedPressable';`, `import { AnimatedMotorcycleIcon } from '../components/AnimatedMotorcycleIcon';\nimport { AnimatedPressable } from '../components/AnimatedPressable';`);
replaceOnce('src/screens/AuthScreen.tsx', `  const [motorcycleModel, setMotorcycleModel] = useState('');\n  const [email, setEmail]`, `  const [motorcycleModel, setMotorcycleModel] = useState('');\n  const [businessName, setBusinessName] = useState('');\n  const [businessPhone, setBusinessPhone] = useState('');\n  const [businessAddress, setBusinessAddress] = useState('');\n  const [taxOffice, setTaxOffice] = useState('');\n  const [taxNumber, setTaxNumber] = useState('');\n  const [email, setEmail]`);
replaceOnce('src/screens/AuthScreen.tsx', `    const customerMotorMissing = mode === 'register' && registerMode === 'customer'\n      && (normalizedPlate.replace(/[^A-Z0-9ÇĞİÖŞÜ]/g, '').length < 5 || !motorcycleBrand.trim() || !motorcycleModel.trim());\n    if (!email.trim() || password.length < 6 || (mode === 'register' && !fullName.trim()) || customerMotorMissing) {\n      Alert.alert(\n        'Eksik bilgi',\n        customerMotorMissing\n          ? 'Müşteri hesabı için plaka, motosiklet markası ve modeli zorunludur.'\n          : 'E-posta, en az 6 karakter şifre ve kayıt sırasında ad soyad gereklidir.',\n      );`, `    const customerMotorMissing = mode === 'register' && registerMode === 'customer'\n      && (normalizedPlate.replace(/[^A-Z0-9ÇĞİÖŞÜ]/g, '').length < 5 || !motorcycleBrand.trim() || !motorcycleModel.trim());\n    const normalizedTaxNumber = taxNumber.replace(/\\D/g, '');\n    const businessMissing = mode === 'register' && registerMode === 'staff'\n      && (!businessName.trim() || !taxOffice.trim() || ![10, 11].includes(normalizedTaxNumber.length));\n    if (!email.trim() || password.length < 6 || (mode === 'register' && !fullName.trim()) || customerMotorMissing || businessMissing) {\n      Alert.alert(\n        'Eksik bilgi',\n        customerMotorMissing\n          ? 'Müşteri hesabı için plaka, motosiklet markası ve modeli zorunludur.'\n          : businessMissing\n            ? 'İşletme başvurusu için işletme adı, Vergi Dairesi ve 10 veya 11 haneli Vergi Numarası zorunludur.'\n            : 'E-posta, en az 6 karakter şifre ve kayıt sırasında ad soyad gereklidir.',\n      );`);
replaceOnce('src/screens/AuthScreen.tsx', `          registerMode === 'customer' ? { plate: normalizedPlate, brand: motorcycleBrand, model: motorcycleModel } : undefined,\n        );`, `          registerMode === 'customer' ? { plate: normalizedPlate, brand: motorcycleBrand, model: motorcycleModel } : undefined,\n          registerMode === 'staff' ? { business_name: businessName, business_phone: businessPhone || phone, business_address: businessAddress, tax_office: taxOffice, tax_number: normalizedTaxNumber } : undefined,\n        );`);
replaceOnce('src/screens/AuthScreen.tsx', `GARAGE OS • v0.8.3 MOTOR EŞLEŞTİRME HAZIR`, `GARAGE OS • v0.8.4 ONAYLI İŞLETME SİSTEMİ`);
replaceOnce('src/screens/AuthScreen.tsx', `<AccountCard active={registerMode === 'customer'} title="Müşteri" subtitle="Motor, onay, randevu, servis ve bildirim takibi" icon="bicycle" accent={colors.cyan} onPress={() => setRegisterMode('customer')} />`, `<AccountCard active={registerMode === 'customer'} title="Müşteri" subtitle="Motor, onay, randevu, servis ve bildirim takibi" icon="motorcycle" accent={colors.cyan} onPress={() => setRegisterMode('customer')} />`);
replaceOnce('src/screens/AuthScreen.tsx', `<AccountCard active={registerMode === 'staff'} title="İşletme / Usta" subtitle="Servis, takvim, ekip, alacak ve bildirim yönetimi" icon="construct" accent={colors.orange} onPress={() => setRegisterMode('staff')} />`, `<AccountCard active={registerMode === 'staff'} title="İşletme Başvurusu" subtitle="Başvurun Admin incelemesinden sonra işletme paneline dönüşür" icon="business" accent={colors.orange} onPress={() => setRegisterMode('staff')} />`);
replaceOnce('src/screens/AuthScreen.tsx', `<AccountCard active={registerMode === 'staff'} title="İşletme / Usta" subtitle="Servis, takvim, ekip, alacak ve bildirim yönetimi" icon="construct" accent={colors.orange} onPress={() => setRegisterMode('staff')} />`, `<AccountCard active={registerMode === 'staff'} title="İşletme Başvurusu" subtitle="Başvurun Admin incelemesinden sonra işletme paneline dönüşür" icon="business" accent={colors.orange} onPress={() => setRegisterMode('staff')} />`);
replaceOnce('src/screens/AuthScreen.tsx', `<AccountCard active={registerMode === 'staff'} title="İşletme / Usta" subtitle="Servis, takvim, ekip, alacak ve bildirim yönetimi" icon="construct" accent={colors.orange} onPress={() => setRegisterMode('staff')} />`, `<AccountCard active={registerMode === 'staff'} title="İşletme Başvurusu" subtitle="Başvurun Admin incelemesinden sonra işletme paneline dönüşür" icon="business" accent={colors.orange} onPress={() => setRegisterMode('staff')} />`);
replaceOnce('src/screens/AuthScreen.tsx', `<View style={styles.motorHeader}><Ionicons name="bicycle" size={22} color={colors.cyan} /><View style={styles.motorCopy}>`, `<View style={styles.motorHeader}><AnimatedMotorcycleIcon size={25} color={colors.cyan} /><View style={styles.motorCopy}>`);
replaceOnce('src/screens/AuthScreen.tsx', `                {registerMode === 'customer' && (\n                  <View style={[styles.motorCard, { backgroundColor: \`${'${colors.cyan}'}0D\`, borderColor: \`${'${colors.cyan}'}38\` }]}>\n                    <View style={styles.motorHeader}><AnimatedMotorcycleIcon size={25} color={colors.cyan} /><View style={styles.motorCopy}><Text style={[styles.motorTitle, { color: colors.text }]}>Motosiklet bilgileri</Text><Text style={[styles.motorText, { color: colors.textMuted }]}>Usta hesabını plaka üzerinden güvenle bulabilsin.</Text></View></View>\n                    <FormField label="Plaka" value={plate} onChangeText={(value) => setPlate(value.toUpperCase())} placeholder="06 ABC 123" autoCapitalize="characters" />\n                    <FormField label="Motosiklet Markası" value={motorcycleBrand} onChangeText={setMotorcycleBrand} placeholder="Örn. Honda" autoCapitalize="words" />\n                    <FormField label="Motosiklet Modeli" value={motorcycleModel} onChangeText={setMotorcycleModel} placeholder="Örn. Forza 250" autoCapitalize="words" />\n                  </View>\n                )}`, `                {registerMode === 'customer' && (\n                  <View style={[styles.motorCard, { backgroundColor: \`${'${colors.cyan}'}0D\`, borderColor: \`${'${colors.cyan}'}38\` }]}>\n                    <View style={styles.motorHeader}><AnimatedMotorcycleIcon size={25} color={colors.cyan} /><View style={styles.motorCopy}><Text style={[styles.motorTitle, { color: colors.text }]}>Motosiklet bilgileri</Text><Text style={[styles.motorText, { color: colors.textMuted }]}>Usta hesabını plaka üzerinden güvenle bulabilsin.</Text></View></View>\n                    <FormField label="Plaka" value={plate} onChangeText={(value) => setPlate(value.toUpperCase())} placeholder="06 ABC 123" autoCapitalize="characters" />\n                    <FormField label="Motosiklet Markası" value={motorcycleBrand} onChangeText={setMotorcycleBrand} placeholder="Örn. Honda" autoCapitalize="words" />\n                    <FormField label="Motosiklet Modeli" value={motorcycleModel} onChangeText={setMotorcycleModel} placeholder="Örn. Forza 250" autoCapitalize="words" />\n                  </View>\n                )}\n                {registerMode === 'staff' && (\n                  <View style={[styles.motorCard, { backgroundColor: \`${'${colors.orange}'}0D\`, borderColor: \`${'${colors.orange}'}38\` }]}>\n                    <View style={styles.motorHeader}><Ionicons name="business" size={24} color={colors.orange} /><View style={styles.motorCopy}><Text style={[styles.motorTitle, { color: colors.text }]}>İşletme başvuru bilgileri</Text><Text style={[styles.motorText, { color: colors.textMuted }]}>Hesabın önce müşteri olarak açılır. Admin onayından sonra işletme panelin otomatik açılır.</Text></View></View>\n                    <FormField label="İşletme Adı" value={businessName} onChangeText={setBusinessName} placeholder="Örn. Lara Moto Garage" autoCapitalize="words" />\n                    <FormField label="İşletme Telefonu" value={businessPhone} onChangeText={setBusinessPhone} placeholder="05xx xxx xx xx" keyboardType="phone-pad" />\n                    <FormField label="İşletme Adresi" value={businessAddress} onChangeText={setBusinessAddress} multiline placeholder="İl, ilçe, mahalle ve açık adres" />\n                    <FormField label="Vergi Dairesi" value={taxOffice} onChangeText={setTaxOffice} placeholder="Örn. Muratpaşa Vergi Dairesi" autoCapitalize="words" />\n                    <FormField label="Vergi Numarası" value={taxNumber} onChangeText={(value) => setTaxNumber(value.replace(/\\D/g, ''))} keyboardType="number-pad" maxLength={11} placeholder="10 veya 11 hane" />\n                  </View>\n                )}`);
replaceOnce('src/screens/AuthScreen.tsx', `<PrimaryButton title={mode === 'login' ? 'Giriş Yap' : registerMode === 'customer' ? 'Müşteri Hesabımı Oluştur' : 'Personel Hesabımı Oluştur'} onPress={submit} loading={loading} />`, `<PrimaryButton title={mode === 'login' ? 'Giriş Yap' : registerMode === 'customer' ? 'Müşteri Hesabımı Oluştur' : 'İşletme Başvurumu Gönder'} onPress={submit} loading={loading} />`);
replaceOnce('src/screens/AuthScreen.tsx', `function AccountCard({ active, title, subtitle, icon, accent, onPress }: { active: boolean; title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap; accent: string; onPress: () => void }) {\n  const { colors } = useTheme();\n  return <AnimatedPressable onPress={onPress} style={[styles.accountCard, { backgroundColor: active ? \`${'${accent}'}18\` : colors.surfaceSoft, borderColor: active ? accent : colors.border }]}><Ionicons name={icon} size={23} color={accent} />`, `function AccountCard({ active, title, subtitle, icon, accent, onPress }: { active: boolean; title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap | 'motorcycle'; accent: string; onPress: () => void }) {\n  const { colors } = useTheme();\n  return <AnimatedPressable onPress={onPress} style={[styles.accountCard, { backgroundColor: active ? \`${'${accent}'}18\` : colors.surfaceSoft, borderColor: active ? accent : colors.border }]}>{icon === 'motorcycle' ? <AnimatedMotorcycleIcon size={27} color={accent} /> : <Ionicons name={icon} size={23} color={accent} />}`);

replaceOnce('src/AppRoot.tsx', `  const { loading, session, profile, workshop, membership } = useAuth();`, `  const { loading, session, profile, workshop, membership, isAdmin } = useAuth();`);
replaceOnce('src/AppRoot.tsx', `  if (!session) return <AuthScreen />;\n  if (profile?.account_mode === 'customer') return <CustomerShell />;`, `  if (!session) return <AuthScreen />;\n  if (isAdmin) return <AppShell />;\n  if (profile?.account_mode === 'customer') return <CustomerShell />;`);

replaceOnce('src/AppShell.tsx', `  const { membership, isAdmin } = useAuth();`, `  const { membership, isAdmin, workshop } = useAuth();`);
replaceOnce('src/AppShell.tsx', `  const [tab, setTab] = useState<Tab>('home');`, `  const [tab, setTab] = useState<Tab>(isAdmin && !workshop ? 'team' : 'home');`);
replaceOnce('src/AppShell.tsx', `    return isApprentice ? all.filter((item) => ['home', 'orders', 'settings'].includes(item.key)) : all;\n  }, [colors, isAdmin, isOwner, isApprentice]);`, `    if (isAdmin && !workshop) return all.filter((item) => ['team', 'settings'].includes(item.key));\n    return isApprentice ? all.filter((item) => ['home', 'orders', 'settings'].includes(item.key)) : all;\n  }, [colors, isAdmin, isOwner, isApprentice, workshop]);`);
replaceOnce('src/AppShell.tsx', `navLabel: { fontSize: 6.9,`, `navLabel: { fontSize: 8,`);

replaceOnce('src/customer/CustomerHomeScreen.tsx', `  const { profile, customerWorkshop, customerWorkshops, selectCustomerWorkshop, refreshWorkspace } = useAuth();`, `  const { profile, customerWorkshop, customerWorkshops, businessApplication, selectCustomerWorkshop, refreshWorkspace } = useAuth();`);
replaceOnce('src/customer/CustomerHomeScreen.tsx', `    <ScreenHeader eyebrow="MÜŞTERİ PANELİ" title={\`Merhaba, ${'${profile?.full_name?.split(\' \')[0] ?? \'Sürücü\'}'}\`} subtitle={customerWorkshop ? \`${'${customerWorkshop.workshop_name}'} • Servis, onay ve randevu merkezi\` : 'Motorunu bağla, randevu al ve servisi takip et.'} />\n`, `    <ScreenHeader eyebrow="MÜŞTERİ PANELİ" title={\`Merhaba, ${'${profile?.full_name?.split(\' \')[0] ?? \'Sürücü\'}'}\`} subtitle={customerWorkshop ? \`${'${customerWorkshop.workshop_name}'} • Servis, onay ve randevu merkezi\` : 'Motorunu bağla, randevu al ve servisi takip et.'} />\n\n    {businessApplication?.status === 'pending' && <GlassCard style={[styles.applicationCard, { borderColor: \`${'${colors.orange}'}60\`, backgroundColor: \`${'${colors.orange}'}10\` }]}><View style={[styles.applicationIcon, { backgroundColor: \`${'${colors.orange}'}1C\` }]}><Ionicons name="hourglass" size={26} color={colors.orange} /></View><View style={styles.copy}><Text style={[styles.applicationTitle, { color: colors.text }]}>İşletme başvurunuz inceleniyor</Text><Text style={[styles.cardMeta, { color: colors.textMuted }]}>{businessApplication.business_name} • Admin onayından sonra işletme paneliniz otomatik açılacak.</Text></View></GlassCard>}\n    {businessApplication?.status === 'rejected' && <GlassCard style={[styles.applicationCard, { borderColor: \`${'${colors.red}'}55\`, backgroundColor: \`${'${colors.red}'}0D\` }]}><View style={[styles.applicationIcon, { backgroundColor: \`${'${colors.red}'}18\` }]}><Ionicons name="close-circle" size={26} color={colors.red} /></View><View style={styles.copy}><Text style={[styles.applicationTitle, { color: colors.text }]}>İşletme başvurunuz sonuçlandı</Text><Text style={[styles.cardMeta, { color: colors.textMuted }]}>{businessApplication.review_note || 'Başvuru şu anda onaylanmadı.'}</Text></View></GlassCard>}\n`);
replaceOnce('src/customer/CustomerHomeScreen.tsx', `  approvalCard: { minHeight: 82,`, `  applicationCard: { minHeight: 88, borderWidth: 1, borderRadius: 22, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 11 },\n  applicationIcon: { width: 49, height: 49, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },\n  applicationTitle: { fontSize: 15.5, fontWeight: '900' },\n  approvalCard: { minHeight: 82,`);

replaceOnce('src/screens/AdminScreen.tsx', `import { MemberRole } from '../types';`, `import { BusinessApplication, MemberRole } from '../types';`);
replaceOnce('src/screens/AdminScreen.tsx', `  const [services, setServices] = useState<any[]>([]);`, `  const [services, setServices] = useState<any[]>([]);\n  const [applications, setApplications] = useState<BusinessApplication[]>([]);`);
replaceOnce('src/screens/AdminScreen.tsx', `  const load = useCallback(async () => {\n    if (!workshop) return;\n    const [memberResult, serviceResult] = await Promise.all([`, `  const load = useCallback(async () => {\n    const applicationResult = await supabase.rpc('admin_get_business_applications');\n    setApplications((applicationResult.data as BusinessApplication[] | null) ?? []);\n    if (!workshop) { setMembers([]); setServices([]); return; }\n    const [memberResult, serviceResult] = await Promise.all([`);
replaceOnce('src/screens/AdminScreen.tsx', `  const toggleBusiness = async`, `  const reviewApplication = (application: BusinessApplication, approve: boolean) => Alert.alert(\n    approve ? 'İşletme başvurusunu onayla' : 'İşletme başvurusunu reddet',\n    \`${'${application.business_name}'} • ${'${application.applicant_name || \'Başvuru sahibi\'}'}\`,\n    [\n      { text: 'Vazgeç', style: 'cancel' },\n      { text: approve ? 'Onayla ve İşletmeyi Aç' : 'Reddet', style: approve ? 'default' : 'destructive', onPress: async () => {\n        setLoading(true);\n        const { error } = await supabase.rpc('admin_review_business_application', { p_application_id: application.id, p_approve: approve, p_note: approve ? 'Admin tarafından onaylandı' : 'Başvuru Admin tarafından uygun bulunmadı' });\n        setLoading(false);\n        if (error) return Alert.alert('Başvuru sonuçlandırılamadı', error.message);\n        await refreshWorkspace(workshop?.id ?? null);\n        await load();\n        Alert.alert(approve ? 'İşletme hesabı açıldı' : 'Başvuru reddedildi');\n      } },\n    ],\n  );\n\n  const toggleBusiness = async`);
replaceOnce('src/screens/AdminScreen.tsx', `      <View style={styles.sectionHeader}>\n        <Text style={[styles.sectionTitle, { color: colors.text }]}>İşletmeler</Text>`, `      <View style={styles.sectionHeader}><View><Text style={[styles.sectionTitle, { color: colors.text }]}>İşletme Başvuruları</Text><Text style={[styles.itemMeta, { color: colors.textMuted }]}>{applications.filter((item) => item.status === 'pending').length} başvuru inceleme bekliyor</Text></View></View>\n      <View style={styles.list}>\n        {applications.length === 0 ? <GlassCard style={styles.applicationEmpty}><Ionicons name="checkmark-done-circle" size={34} color={colors.green} /><Text style={[styles.memberName, { color: colors.text }]}>Bekleyen işletme başvurusu yok</Text></GlassCard> : applications.map((application) => { const accent = application.status === 'approved' ? colors.green : application.status === 'rejected' ? colors.red : colors.orange; return <GlassCard key={application.id} style={[styles.applicationCard, { borderColor: \`${'${accent}'}45\` }]}><View style={styles.applicationTop}><View style={[styles.businessIcon, { backgroundColor: \`${'${accent}'}18\` }]}><Ionicons name={application.status === 'approved' ? 'checkmark-circle' : application.status === 'rejected' ? 'close-circle' : 'hourglass'} size={24} color={accent} /></View><View style={styles.copy}><Text style={[styles.memberName, { color: colors.text }]}>{application.business_name}</Text><Text style={[styles.itemMeta, { color: colors.textMuted }]}>{application.applicant_name || 'Başvuru sahibi'} • {application.applicant_email || 'E-posta yok'}</Text><Text style={[styles.itemMeta, { color: colors.textMuted }]}>{application.tax_office} • {application.tax_number}</Text><Text style={[styles.itemMeta, { color: colors.textMuted }]}>{application.business_address || 'Adres eklenmedi'}</Text></View><Text style={[styles.applicationStatus, { color: accent }]}>{application.status === 'pending' ? 'BEKLİYOR' : application.status === 'approved' ? 'ONAYLI' : 'RED'}</Text></View>{application.status === 'pending' && <View style={styles.applicationActions}><AnimatedPressable onPress={() => reviewApplication(application, false)} style={[styles.reviewButton, { borderColor: \`${'${colors.red}'}45\`, backgroundColor: \`${'${colors.red}'}0D\` }]}><Ionicons name="close" size={18} color={colors.red} /><Text style={[styles.reviewText, { color: colors.red }]}>Reddet</Text></AnimatedPressable><AnimatedPressable onPress={() => reviewApplication(application, true)} style={[styles.reviewButton, { borderColor: \`${'${colors.green}'}45\`, backgroundColor: \`${'${colors.green}'}0D\` }]}><Ionicons name="checkmark" size={18} color={colors.green} /><Text style={[styles.reviewText, { color: colors.green }]}>Onayla</Text></AnimatedPressable></View>}</GlassCard>; })}\n      </View>\n\n      <View style={styles.sectionHeader}>\n        <Text style={[styles.sectionTitle, { color: colors.text }]}>İşletmeler</Text>`);
replaceOnce('src/screens/AdminScreen.tsx', `  businessCard: { gap: 10, padding: 14 },`, `  applicationEmpty: { alignItems: 'center', gap: 8, paddingVertical: 24 },\n  applicationCard: { gap: 12, padding: 14 },\n  applicationTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },\n  applicationStatus: { fontSize: 9.5, fontWeight: '900' },\n  applicationActions: { flexDirection: 'row', gap: 8 },\n  reviewButton: { flex: 1, minHeight: 42, borderWidth: 1, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },\n  reviewText: { fontSize: 11, fontWeight: '900' },\n  businessCard: { gap: 10, padding: 14 },`);

const migration = String.raw`-- DraBornGarage v0.8.4
-- Admin-approved business applications, protected staff access and automatic primary admin.

create table if not exists public.business_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  business_name text not null,
  business_phone text,
  business_address text,
  tax_office text not null,
  tax_number text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  review_note text,
  workshop_id uuid references public.workshops(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_business_applications_status_submitted on public.business_applications(status, submitted_at desc);
create index if not exists idx_business_applications_reviewed_by on public.business_applications(reviewed_by);
create index if not exists idx_business_applications_workshop on public.business_applications(workshop_id);

alter table public.business_applications enable row level security;
drop policy if exists business_applications_select_self on public.business_applications;
create policy business_applications_select_self on public.business_applications for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists business_applications_select_admin on public.business_applications;
create policy business_applications_select_admin on public.business_applications for select to authenticated using (public.is_admin());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_mode text := coalesce(new.raw_user_meta_data ->> 'requested_account_mode', new.raw_user_meta_data ->> 'account_mode', 'customer');
  primary_admin boolean := lower(coalesce(new.email, '')) = 'draborneagle@gmail.com';
  normalized_tax text := regexp_replace(coalesce(new.raw_user_meta_data ->> 'business_tax_number', ''), '[^0-9]', '', 'g');
begin
  insert into public.profiles (
    id, full_name, phone, is_admin, account_mode,
    customer_plate, customer_motorcycle_brand, customer_motorcycle_model
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    primary_admin,
    case when primary_admin then 'staff' else 'customer' end,
    case when requested_mode = 'customer' then nullif(public.normalize_plate(new.raw_user_meta_data ->> 'customer_plate'), '') else null end,
    case when requested_mode = 'customer' then nullif(trim(new.raw_user_meta_data ->> 'customer_motorcycle_brand'), '') else null end,
    case when requested_mode = 'customer' then nullif(trim(new.raw_user_meta_data ->> 'customer_motorcycle_model'), '') else null end
  )
  on conflict (id) do update
  set full_name = excluded.full_name,
      phone = coalesce(excluded.phone, public.profiles.phone),
      is_admin = primary_admin or public.profiles.is_admin,
      account_mode = case when primary_admin then 'staff' else public.profiles.account_mode end,
      customer_plate = coalesce(excluded.customer_plate, public.profiles.customer_plate),
      customer_motorcycle_brand = coalesce(excluded.customer_motorcycle_brand, public.profiles.customer_motorcycle_brand),
      customer_motorcycle_model = coalesce(excluded.customer_motorcycle_model, public.profiles.customer_motorcycle_model),
      updated_at = now();

  if requested_mode = 'staff' and not primary_admin then
    if char_length(trim(coalesce(new.raw_user_meta_data ->> 'business_name', ''))) < 2 then raise exception 'İşletme adı zorunludur'; end if;
    if char_length(trim(coalesce(new.raw_user_meta_data ->> 'business_tax_office', ''))) < 2 then raise exception 'Vergi Dairesi zorunludur'; end if;
    if length(normalized_tax) not in (10, 11) then raise exception 'Vergi Numarası 10 veya 11 haneli olmalıdır'; end if;

    insert into public.business_applications(
      user_id, business_name, business_phone, business_address, tax_office, tax_number, status, submitted_at, updated_at
    )
    values (
      new.id,
      trim(new.raw_user_meta_data ->> 'business_name'),
      nullif(trim(new.raw_user_meta_data ->> 'business_phone'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'business_address'), ''),
      trim(new.raw_user_meta_data ->> 'business_tax_office'),
      normalized_tax,
      'pending', now(), now()
    )
    on conflict (user_id) do update
    set business_name = excluded.business_name,
        business_phone = excluded.business_phone,
        business_address = excluded.business_address,
        tax_office = excluded.tax_office,
        tax_number = excluded.tax_number,
        status = 'pending',
        reviewed_at = null,
        reviewed_by = null,
        review_note = null,
        workshop_id = null,
        submitted_at = now(),
        updated_at = now();
  end if;
  return new;
end;
$$;

create or replace function public.set_profile_account_mode(p_mode text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if p_mode not in ('staff', 'customer') then raise exception 'Geçersiz hesap görünümü'; end if;
  if p_mode = 'staff' and not public.is_admin() and not exists (
    select 1 from public.workshop_members wm where wm.user_id = auth.uid() and wm.is_active
  ) then
    raise exception 'İşletme veya personel paneli için Admin onayı ya da aktif işletme üyeliği gerekir';
  end if;
  update public.profiles set account_mode = p_mode, updated_at = now() where id = auth.uid();
end;
$$;

create or replace function public.create_workshop(
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
begin
  if not public.is_admin() then raise exception 'Yeni işletme yalnız Admin onayıyla oluşturulabilir'; end if;
  return public.admin_create_workshop(p_name, p_phone, p_address, p_tax_office, p_tax_number);
end;
$$;

create or replace function public.admin_get_business_applications()
returns table(
  id uuid,
  user_id uuid,
  applicant_name text,
  applicant_email text,
  applicant_phone text,
  business_name text,
  business_phone text,
  business_address text,
  tax_office text,
  tax_number text,
  status text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  review_note text,
  workshop_id uuid
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select ba.id, ba.user_id, p.full_name, u.email::text, p.phone, ba.business_name, ba.business_phone,
         ba.business_address, ba.tax_office, ba.tax_number, ba.status, ba.submitted_at,
         ba.reviewed_at, ba.review_note, ba.workshop_id
  from public.business_applications ba
  join public.profiles p on p.id = ba.user_id
  left join auth.users u on u.id = ba.user_id
  where public.is_admin()
  order by case ba.status when 'pending' then 0 when 'approved' then 1 else 2 end, ba.submitted_at desc;
$$;

create or replace function public.admin_review_business_application(
  p_application_id uuid,
  p_approve boolean,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  application_record public.business_applications%rowtype;
  new_workshop_id uuid;
begin
  if not public.is_admin() then raise exception 'Bu işlem yalnızca Admin tarafından yapılabilir'; end if;

  select * into application_record from public.business_applications where id = p_application_id for update;
  if application_record.id is null then raise exception 'Başvuru bulunamadı'; end if;
  if application_record.status <> 'pending' then raise exception 'Başvuru daha önce sonuçlandırılmış'; end if;

  if p_approve then
    insert into public.workshops(name, phone, address, tax_office, tax_number, created_by, is_active)
    values (
      application_record.business_name,
      application_record.business_phone,
      application_record.business_address,
      application_record.tax_office,
      application_record.tax_number,
      application_record.user_id,
      true
    ) returning id into new_workshop_id;

    insert into public.workshop_members(workshop_id, user_id, role, is_active)
    values (new_workshop_id, application_record.user_id, 'owner_mechanic', true)
    on conflict (workshop_id, user_id) do update set role = 'owner_mechanic', is_active = true;

    update public.profiles set account_mode = 'staff', updated_at = now() where id = application_record.user_id;
    update public.business_applications
    set status = 'approved', workshop_id = new_workshop_id, reviewed_at = now(), reviewed_by = auth.uid(), review_note = nullif(trim(p_note), ''), updated_at = now()
    where id = p_application_id;
  else
    update public.business_applications
    set status = 'rejected', reviewed_at = now(), reviewed_by = auth.uid(), review_note = nullif(trim(p_note), ''), updated_at = now()
    where id = p_application_id;
  end if;

  return new_workshop_id;
end;
$$;

revoke all on table public.business_applications from anon;
revoke all on function public.admin_get_business_applications() from public, anon;
revoke all on function public.admin_review_business_application(uuid, boolean, text) from public, anon;
grant select on table public.business_applications to authenticated, service_role;
grant execute on function public.admin_get_business_applications() to authenticated, service_role;
grant execute on function public.admin_review_business_application(uuid, boolean, text) to authenticated, service_role;
`;
write('supabase/migrations/20260712220000_v0_8_4_business_approval.sql', `${migration.trim()}\n`);

const rollback = String.raw`-- DraBornGarage v0.8.4 schema rollback to v0.8.3.
-- Deleted users and operational data cannot be restored by this rollback.

drop function if exists public.admin_review_business_application(uuid, boolean, text);
drop function if exists public.admin_get_business_applications();
drop table if exists public.business_applications;

create or replace function public.set_profile_account_mode(p_mode text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if p_mode not in ('staff', 'customer') then raise exception 'Geçersiz hesap görünümü'; end if;
  update public.profiles set account_mode = p_mode, updated_at = now() where id = auth.uid();
end; $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone, account_mode, customer_plate, customer_motorcycle_brand, customer_motorcycle_model)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    case when new.raw_user_meta_data ->> 'account_mode' = 'customer' then 'customer' else 'staff' end,
    case when new.raw_user_meta_data ->> 'account_mode' = 'customer' then nullif(public.normalize_plate(new.raw_user_meta_data ->> 'customer_plate'), '') else null end,
    case when new.raw_user_meta_data ->> 'account_mode' = 'customer' then nullif(trim(new.raw_user_meta_data ->> 'customer_motorcycle_brand'), '') else null end,
    case when new.raw_user_meta_data ->> 'account_mode' = 'customer' then nullif(trim(new.raw_user_meta_data ->> 'customer_motorcycle_model'), '') else null end
  )
  on conflict (id) do update set full_name=excluded.full_name, phone=coalesce(excluded.phone,public.profiles.phone), account_mode=excluded.account_mode, customer_plate=coalesce(excluded.customer_plate,public.profiles.customer_plate), customer_motorcycle_brand=coalesce(excluded.customer_motorcycle_brand,public.profiles.customer_motorcycle_brand), customer_motorcycle_model=coalesce(excluded.customer_motorcycle_model,public.profiles.customer_motorcycle_model), updated_at=now();
  return new;
end; $$;

create or replace function public.create_workshop(p_name text, p_phone text default null, p_address text default null, p_tax_office text default null, p_tax_number text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid; normalized_tax text := regexp_replace(coalesce(p_tax_number,''),'[^0-9]','','g');
begin
  if auth.uid() is null then raise exception 'Oturum gerekli'; end if;
  if char_length(trim(p_name)) < 2 then raise exception 'İşletme adı çok kısa'; end if;
  if char_length(trim(coalesce(p_tax_office,''))) < 2 then raise exception 'Vergi Dairesi zorunludur'; end if;
  if length(normalized_tax) not in (10,11) then raise exception 'Vergi Numarası 10 veya 11 haneli olmalıdır'; end if;
  insert into public.workshops(name,phone,address,tax_office,tax_number,created_by) values(trim(p_name),nullif(trim(p_phone),''),nullif(trim(p_address),''),trim(p_tax_office),normalized_tax,auth.uid()) returning id into new_id;
  insert into public.workshop_members(workshop_id,user_id,role) values(new_id,auth.uid(),'owner_mechanic');
  return new_id;
end; $$;
`;
write('supabase/rollbacks/20260712220000_v0_8_4_business_approval_rollback.sql', `${rollback.trim()}\n`);

write('docs/PROJECT_HANDOFF_V0.8.4.md', `# DraBornGarage — v0.8.4 Devam Dosyası\n\n**Güncel sürüm:** \`v0.8.4\`  \n**Önceki sabit yedek:** \`backup/v0.8.3-before-v0.8.4\`  \n**Sonraki ana sürüm:** \`v0.9.0\`\n\n## Tamamlanan kapsam\n- İşletme üyeliği kayıt formunda işletme adı, adres, telefon, Vergi Dairesi ve Vergi Numarası.\n- İşletme başvurusunun müşteri hesabı olarak başlaması.\n- Müşteri panelinde “İşletme başvurunuz inceleniyor” bilgisi.\n- Admin başvuru onayı/reddi; onayda işletme ve İşletme Sahibi + Usta üyeliğinin otomatik açılması.\n- \`draborneagle@gmail.com\` hesabının kayıt sırasında otomatik Admin olması.\n- Yeni müşteri randevularının Takvim gününe girilmeden animasyonlu uyarıyla görünmesi.\n- Ana Takvimde yalnız bugün ve gelecek günler; geçmiş randevular için ayrı açılır geçmiş alanı.\n- İş emri detaylarının modern açılır/kapanır ana kategorilere ayrılması.\n- Daha okunaklı küçük metinler ve modern animasyonlu motosiklet ikonu.\n\n## Veritabanı\n- Migration: \`supabase/migrations/20260712220000_v0_8_4_business_approval.sql\`\n- Rollback: \`supabase/rollbacks/20260712220000_v0_8_4_business_approval_rollback.sql\`\n- Kullanıcı ve test verisi temizliği şemadan ayrı, geri döndürülemez bir yönetim işlemi olarak uygulanmıştır.\n`);

write('docs/CHANGELOG_V0.8.4.md', `# DraBornGarage v0.8.4\n\n- Admin onaylı işletme başvuru sistemi\n- Vergi Dairesi ve Vergi Numarası başvuru alanları\n- Bekleyen başvuru müşteri paneli kartı\n- Yeni randevu animasyonlu dikkat merkezi ve geçmiş randevu arşivi\n- Açılır/kapanır modern servis detay kategorileri\n- Daha okunaklı tipografi\n- Animasyonlu modern motosiklet ikonu\n- Otomatik ana Admin: draborneagle@gmail.com\n`);

replaceOnce('src/screens/SettingsScreen.tsx', `v0.8.3 • Motor ve Vergi Eşleştirme`, `v0.8.4 • Onaylı İşletme ve Modern Takvim`);
replaceOnce('src/screens/SettingsScreen.tsx', `backup/v0.8.2-before-v0.8.3`, `backup/v0.8.3-before-v0.8.4`);
replaceOnce('src/screens/SettingsScreen.tsx', `Kod yedeğiyle v0.8.2`, `Kod yedeğiyle v0.8.3`);

let roadmap = read('docs/ROADMAP.md');
if (!roadmap.includes('## v0.8.4')) roadmap = roadmap.replace('## v0.9 — Google Play Uyum, Test ve Pilot', `## v0.8.4 — İşletme Onayı, Takvim Dikkat Merkezi ve Modern Servis Detayı ✅\n\n- [x] Admin onaylı işletme başvurusu\n- [x] Vergi bilgileri kayıt formu\n- [x] Bekleyen başvuru müşteri paneli\n- [x] Yeni randevu animasyonlu uyarısı\n- [x] Güncel Takvim + geçmiş randevu arşivi\n- [x] Açılır/kapanır iş emri kategorileri\n- [x] Okunabilirlik iyileştirmesi\n- [x] Modern animasyonlu motosiklet ikonu\n- [x] Otomatik ana Admin hesabı\n\n## v0.9 — Google Play Uyum, Test ve Pilot`);
roadmap = roadmap.replace(/Güncel sürüm `v0\.8\.3`dür\./, 'Güncel sürüm `v0.8.4`dür.');
write('docs/ROADMAP.md', roadmap);

console.log('v0.8.4 core changes prepared.');
