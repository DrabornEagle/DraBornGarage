import fs from 'node:fs';

const file = 'src/screens/AuthScreen.tsx';
let source = fs.readFileSync(file, 'utf8');

function replaceOnce(before, after) {
  const index = source.indexOf(before);
  if (index < 0) {
    if (source.includes(after)) return;
    throw new Error(`AuthScreen target not found: ${before.slice(0, 180)}`);
  }
  if (source.indexOf(before, index + before.length) >= 0) throw new Error('AuthScreen target is not unique');
  source = source.slice(0, index) + after + source.slice(index + before.length);
}

replaceOnce(
  `  const submit = async () => {`,
  `  const isPrimaryAdminEmail = email.trim().toLowerCase() === 'draborneagle@gmail.com';\n\n  const submit = async () => {`,
);
replaceOnce(
  `    const customerMotorMissing = mode === 'register' && registerMode === 'customer'\n      && (normalizedPlate.replace(/[^A-Z0-9ÇĞİÖŞÜ]/g, '').length < 5 || !motorcycleBrand.trim() || !motorcycleModel.trim());`,
  `    const customerMotorMissing = mode === 'register' && !isPrimaryAdminEmail && registerMode === 'customer'\n      && (normalizedPlate.replace(/[^A-Z0-9ÇĞİÖŞÜ]/g, '').length < 5 || !motorcycleBrand.trim() || !motorcycleModel.trim());`,
);
replaceOnce(
  `    const businessMissing = mode === 'register' && registerMode === 'staff'\n      && (!businessName.trim() || !taxOffice.trim() || ![10, 11].includes(normalizedTaxNumber.length));`,
  `    const businessMissing = mode === 'register' && !isPrimaryAdminEmail && registerMode === 'staff'\n      && (!businessName.trim() || !taxOffice.trim() || ![10, 11].includes(normalizedTaxNumber.length));`,
);
replaceOnce(
  `          registerMode === 'customer' ? { plate: normalizedPlate, brand: motorcycleBrand, model: motorcycleModel } : undefined,\n          registerMode === 'staff' ? { business_name: businessName, business_phone: businessPhone || phone, business_address: businessAddress, tax_office: taxOffice, tax_number: normalizedTaxNumber } : undefined,`,
  `          registerMode === 'customer' && !isPrimaryAdminEmail ? { plate: normalizedPlate, brand: motorcycleBrand, model: motorcycleModel } : undefined,\n          registerMode === 'staff' && !isPrimaryAdminEmail ? { business_name: businessName, business_phone: businessPhone || phone, business_address: businessAddress, tax_office: taxOffice, tax_number: normalizedTaxNumber } : undefined,`,
);
replaceOnce(
  `            <FormField label="Şifre" value={password} onChangeText={setPassword} placeholder="En az 6 karakter" secureTextEntry />\n            <PrimaryButton title={mode === 'login' ? 'Giriş Yap' : registerMode === 'customer' ? 'Müşteri Hesabımı Oluştur' : 'İşletme Başvurumu Gönder'} onPress={submit} loading={loading} />`,
  `            <FormField label="Şifre" value={password} onChangeText={setPassword} placeholder="En az 6 karakter" secureTextEntry />\n            {mode === 'register' && isPrimaryAdminEmail && <View style={[styles.secureStrip, { backgroundColor: \`${'${colors.primary}'}0D\`, borderColor: \`${'${colors.primary}'}30\` }]}><Ionicons name="shield-checkmark" size={17} color={colors.primary} /><Text style={[styles.secureStripText, { color: colors.textMuted }]}>Ana Admin e-postası algılandı. Motor veya işletme başvuru bilgileri zorunlu değildir; hesap doğrudan Admin olarak açılır.</Text></View>}\n            <PrimaryButton title={mode === 'login' ? 'Giriş Yap' : isPrimaryAdminEmail ? 'Ana Admin Hesabımı Oluştur' : registerMode === 'customer' ? 'Müşteri Hesabımı Oluştur' : 'İşletme Başvurumu Gönder'} onPress={submit} loading={loading} />`,
);

fs.writeFileSync(file, source);
console.log('Primary Admin signup flow fixed.');
