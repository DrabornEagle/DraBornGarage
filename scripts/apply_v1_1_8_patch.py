from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEMP_WORKFLOW = "temp-v1-1-8-quality.yml"


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def patch_auth_context() -> None:
    path = "src/context/AuthContext.tsx"
    text = read(path)
    text = replace_once(
        text,
        "  signUp: (fullName: string, phone: string, email: string, password: string, accountMode?: AccountMode, customerMotor?: CustomerRegistrationMotor, businessRegistration?: ExtendedBusinessRegistrationData) => Promise<string | null>;",
        "  signUp: (fullName: string, phone: string, email: string, password: string, accountMode?: AccountMode, customerMotor?: CustomerRegistrationMotor, businessRegistration?: ExtendedBusinessRegistrationData, customerRegistrationCode?: string) => Promise<string | null>;",
        "AuthContext signUp interface",
    )
    text = replace_once(
        text,
        "    signUp: async (fullName, phone, email, password, accountMode = 'customer', customerMotor, businessRegistration) => {",
        "    signUp: async (fullName, phone, email, password, accountMode = 'customer', customerMotor, businessRegistration, customerRegistrationCode) => {",
        "AuthContext signUp implementation",
    )
    text = replace_once(
        text,
        "        options: { data: { full_name: fullName.trim(), phone: phone.trim(), requested_account_mode: accountMode, account_mode: 'customer', ...customerData, ...businessData } },",
        "        options: { data: { full_name: fullName.trim(), phone: phone.trim(), requested_account_mode: accountMode, account_mode: 'customer', customer_registration_code: accountMode === 'customer' ? customerRegistrationCode?.trim() || null : null, ...customerData, ...businessData } },",
        "AuthContext signup metadata",
    )
    write(path, text)


def patch_auth_screen() -> None:
    path = "src/screens/AuthScreen.tsx"
    text = read(path)
    text = replace_once(
        text,
        "import { AnimatedPressable } from '../components/AnimatedPressable';\n",
        "import { AnimatedPressable } from '../components/AnimatedPressable';\nimport { RegistrationCodeField } from '../components/RegistrationCodeField';\n",
        "AuthScreen component import",
    )
    text = replace_once(
        text,
        "type BusinessEntryMode = 'new' | 'existing';\n",
        "type BusinessEntryMode = 'new' | 'existing';\ntype CustomerEntryMode = 'motor' | 'code';\n",
        "AuthScreen customer entry type",
    )
    text = replace_once(
        text,
        "  const [businessEntryMode, setBusinessEntryMode] = useState<BusinessEntryMode>('new');\n",
        "  const [businessEntryMode, setBusinessEntryMode] = useState<BusinessEntryMode>('new');\n  const [customerEntryMode, setCustomerEntryMode] = useState<CustomerEntryMode>('motor');\n  const [registrationCode, setRegistrationCode] = useState('');\n",
        "AuthScreen customer entry state",
    )
    text = replace_once(
        text,
        "    const customerMotorMissing = mode === 'register' && !isPrimaryAdminEmail && registerMode === 'customer'\n      && (normalizedPlate.replace(/[^A-Z0-9ÇĞİÖŞÜ]/g, '').length < 5 || !motorcycleBrand.trim() || !motorcycleModel.trim());\n    const customerOdometerInvalid = mode === 'register' && registerMode === 'customer'\n      && motorcycleOdometerValue !== null && (!Number.isInteger(motorcycleOdometerValue) || motorcycleOdometerValue < 0);",
        "    const customerUsingRegistrationCode = mode === 'register' && !isPrimaryAdminEmail && registerMode === 'customer' && customerEntryMode === 'code';\n    const customerMotorMissing = mode === 'register' && !isPrimaryAdminEmail && registerMode === 'customer' && customerEntryMode === 'motor'\n      && (normalizedPlate.replace(/[^A-Z0-9ÇĞİÖŞÜ]/g, '').length < 5 || !motorcycleBrand.trim() || !motorcycleModel.trim());\n    const customerRegistrationCodeMissing = customerUsingRegistrationCode && registrationCode.trim().length < 6;\n    const customerOdometerInvalid = mode === 'register' && registerMode === 'customer' && customerEntryMode === 'motor'\n      && motorcycleOdometerValue !== null && (!Number.isInteger(motorcycleOdometerValue) || motorcycleOdometerValue < 0);",
        "AuthScreen customer validation declarations",
    )
    text = replace_once(
        text,
        "    if (!email.trim() || passwordInvalid || (mode === 'register' && !fullName.trim()) || customerMotorMissing || customerOdometerInvalid || businessMissing) {",
        "    if (!email.trim() || passwordInvalid || (mode === 'register' && !fullName.trim()) || customerMotorMissing || customerRegistrationCodeMissing || customerOdometerInvalid || businessMissing) {",
        "AuthScreen required validation",
    )
    text = replace_once(
        text,
        "        customerMotorMissing\n          ? 'Kullanıcı hesabı için plaka, motosiklet markası ve modeli zorunludur.'\n          : customerOdometerInvalid",
        "        customerMotorMissing\n          ? 'Kullanıcı hesabı için plaka, motosiklet markası ve modeli zorunludur.'\n          : customerRegistrationCodeMissing\n            ? 'Ustanın verdiği QR kodunu okut veya manuel kayıt kodunu gir.'\n          : customerOdometerInvalid",
        "AuthScreen validation message",
    )
    text = replace_once(
        text,
        "    setLoading(true);\n    const message = mode === 'login'",
        "    if (customerUsingRegistrationCode) {\n      setLoading(true);\n      const { data, error } = await supabase.rpc('public_validate_customer_registration_link', { p_credential: registrationCode.trim() });\n      setLoading(false);\n      const validation = ((data as { valid: boolean; workshop_name: string | null; motorcycle_label: string | null }[] | null) ?? [])[0];\n      if (error || !validation?.valid) {\n        Alert.alert('Kayıt kodu kullanılamıyor', error?.message ?? 'Kod geçersiz, kullanılmış veya süresi dolmuş. Ustandan yeni kod iste.');\n        return;\n      }\n    }\n\n    setLoading(true);\n    const message = mode === 'login'",
        "AuthScreen registration code precheck",
    )
    text = replace_once(
        text,
        "          registerMode === 'customer' && !isPrimaryAdminEmail ? { plate: normalizedPlate, brand: motorcycleBrand, model: motorcycleModel, odometer: motorcycleOdometerValue } : undefined,",
        "          registerMode === 'customer' && !isPrimaryAdminEmail && customerEntryMode === 'motor' ? { plate: normalizedPlate, brand: motorcycleBrand, model: motorcycleModel, odometer: motorcycleOdometerValue } : undefined,",
        "AuthScreen conditional motor metadata",
    )
    text = replace_once(
        text,
        "            : undefined,\n        );",
        "            : undefined,\n          registerMode === 'customer' && !isPrimaryAdminEmail && customerEntryMode === 'code' ? registrationCode.trim() : undefined,\n        );",
        "AuthScreen signup code argument",
    )
    old_customer_block = """                {registerMode === 'customer' && (\n                  <View style={[styles.motorCard, { backgroundColor: `${colors.cyan}0D`, borderColor: `${colors.cyan}38` }]}> \n                    <View style={styles.motorHeader}><AnimatedMotorcycleIcon size={28} color={colors.cyan} /><View style={styles.motorCopy}><Text style={[styles.motorTitle, { color: colors.text }]}>Motosiklet bilgileri</Text><Text style={[styles.motorText, { color: colors.textMuted }]}>İşletmenin hesabını ve motosikletini güvenle eşleştirebilmesi için kullanılır.</Text></View></View>\n                    <FormField label=\"Plaka\" value={plate} onChangeText={(value) => setPlate(value.toUpperCase())} placeholder=\"06 ABC 123\" autoCapitalize=\"characters\" />\n                    <FormField label=\"Motosiklet Markası\" value={motorcycleBrand} onChangeText={setMotorcycleBrand} placeholder=\"Örn. Honda\" autoCapitalize=\"words\" />\n                    <FormField label=\"Motosiklet Modeli\" value={motorcycleModel} onChangeText={setMotorcycleModel} placeholder=\"Örn. Forza 250\" autoCapitalize=\"words\" />\n                    <FormField label=\"Güncel Kilometre (opsiyonel)\" value={motorcycleOdometer} onChangeText={(value) => setMotorcycleOdometer(value.replace(/\\D/g, ''))} placeholder=\"Örn. 24500\" keyboardType=\"number-pad\" />\n                  </View>\n                )}"""
    new_customer_block = """                {registerMode === 'customer' && (\n                  <View style={styles.customerRegistrationArea}>\n                    <View style={styles.businessModeRow}>\n                      <ModeButton active={customerEntryMode === 'motor'} icon=\"construct\" label=\"Motor Bilgisi\" accent={colors.cyan} onPress={() => setCustomerEntryMode('motor')} />\n                      <ModeButton active={customerEntryMode === 'code'} icon=\"qr-code\" label=\"QR / Kod\" accent={colors.green} onPress={() => setCustomerEntryMode('code')} />\n                    </View>\n                    {customerEntryMode === 'motor' ? (\n                      <View style={[styles.motorCard, { backgroundColor: `${colors.cyan}0D`, borderColor: `${colors.cyan}38` }]}> \n                        <View style={styles.motorHeader}><AnimatedMotorcycleIcon size={28} color={colors.cyan} /><View style={styles.motorCopy}><Text style={[styles.motorTitle, { color: colors.text }]}>Motosiklet bilgileri</Text><Text style={[styles.motorText, { color: colors.textMuted }]}>Motoru kendin ekliyorsan plaka, marka ve modeli yaz. İşletme bağlantısını daha sonra yapabilirsin.</Text></View></View>\n                        <FormField label=\"Plaka\" value={plate} onChangeText={(value) => setPlate(value.toUpperCase())} placeholder=\"06 ABC 123\" autoCapitalize=\"characters\" />\n                        <FormField label=\"Motosiklet Markası\" value={motorcycleBrand} onChangeText={setMotorcycleBrand} placeholder=\"Örn. Honda\" autoCapitalize=\"words\" />\n                        <FormField label=\"Motosiklet Modeli\" value={motorcycleModel} onChangeText={setMotorcycleModel} placeholder=\"Örn. Forza 250\" autoCapitalize=\"words\" />\n                        <FormField label=\"Güncel Kilometre (opsiyonel)\" value={motorcycleOdometer} onChangeText={(value) => setMotorcycleOdometer(value.replace(/\\D/g, ''))} placeholder=\"Örn. 24500\" keyboardType=\"number-pad\" />\n                      </View>\n                    ) : (\n                      <RegistrationCodeField value={registrationCode} onChange={setRegistrationCode} />\n                    )}\n                  </View>\n                )}"""
    text = replace_once(text, old_customer_block, new_customer_block, "AuthScreen customer registration UI")
    text = replace_once(
        text,
        "                  : registerMode === 'customer'\n                    ? 'Kullanıcı Hesabımı Oluştur'",
        "                  : registerMode === 'customer'\n                    ? customerEntryMode === 'code' ? 'QR / Kod ile Hesabımı Oluştur' : 'Kullanıcı Hesabımı Oluştur'",
        "AuthScreen submit title",
    )
    text = replace_once(
        text,
        "  motorCard: { borderWidth: 1, borderRadius: 19, padding: 13, gap: 12 },",
        "  customerRegistrationArea: { gap: 10 },\n  motorCard: { borderWidth: 1, borderRadius: 19, padding: 13, gap: 12 },",
        "AuthScreen customer registration style",
    )
    write(path, text)


def patch_customers_screen() -> None:
    path = "src/screens/CustomersScreen.tsx"
    text = read(path)
    text = replace_once(
        text,
        "import { AnimatedPressable } from '../components/AnimatedPressable';\n",
        "import { AnimatedPressable } from '../components/AnimatedPressable';\nimport { CustomerRegistrationAccessCard } from '../components/CustomerRegistrationAccessCard';\n",
        "CustomersScreen access card import",
    )
    pattern = re.compile(r"(<AnimatedPressable onPress=\{\(\) => openAccess\(bike\.id\)\}.*?</AnimatedPressable>)", re.DOTALL)
    matches = list(pattern.finditer(text))
    if len(matches) != 1:
        raise RuntimeError(f"CustomersScreen tracking access button: expected one match, found {len(matches)}")
    text = pattern.sub(r"\1<CustomerRegistrationAccessCard motorcycle={bike} />", text, count=1)
    write(path, text)


def sync_versions() -> None:
    app = json.loads(read("app.json"))
    package = json.loads(read("package.json"))
    lock = json.loads(read("package-lock.json"))
    if app["expo"]["version"] != "1.1.8" or app["expo"]["android"]["versionCode"] != 1:
        raise RuntimeError("app.json must be v1.1.8 with Android versionCode 1")
    if package["version"] != "1.1.8":
        raise RuntimeError("package.json must be v1.1.8")
    lock["version"] = "1.1.8"
    lock.setdefault("packages", {}).setdefault("", {})["version"] = "1.1.8"
    write("package-lock.json", json.dumps(lock, ensure_ascii=False, indent=2) + "\n")


def write_docs() -> None:
    write(
        "docs/PROJECT_HANDOFF_V1.1.8.md",
        """# DraBornGarage v1.1.8 Teslim ve Devam Notu\n\n## Sürüm politikası\n\n- Expo/Test APK geliştirme sürümü: `1.1.8`\n- Android test `versionCode`: `1`\n- Google Play ilk AAB: `versionName=1.0`, `versionCode=1`\n- İlk Play yayınından sonra her mağaza güncellemesinde hem versionName hem versionCode artırılır.\n\n## v1.1.8 kapsamı\n\n- Ustanın oluşturduğu müşteri ve motosiklet için tek kullanımlık **Hesap Kayıt QR / Kod** kartı.\n- Giriş ekranı → Kayıt Ol → Kullanıcı altında **Motor Bilgisi** ve **QR / Kod** seçenekleri.\n- QR/Kod ile kayıt olan müşteri mevcut işletme müşteri/motosiklet kaydına otomatik bağlanır.\n- İş emrinde seçilen `assigned_mechanic_id` kayıtlı iş tutarının tek sahibidir.\n- İşletme raporu tüm Ustaların toplamını ve Usta kırılımını gösterir; servis işlemi İşletme Paneline ait sayılmaz.\n- Kalıcı workflow envanteri yalnız `DraBornGarage Release APK` ve `DraBornGarage Release AAB` olarak korunur.\n\n## Test sınırı\n\nExpo Go ile arayüz, QR kamera, form doğrulama ve normal veri akışları test edilir. Uygulama kapalıyken remote push, özel Android ses kanalları ve gerçek release imzası yalnız yeni Test APK ile doğrulanır.\n\n## Veritabanı\n\nMigration: `supabase/migrations/20260717193000_v1_1_8_signup_link_and_mechanic_report_ownership.sql`\n\nRollback: `supabase/rollbacks/rollback_v1_1_8_to_v1_1_7.sql`\n""",
    )
    write(
        "docs/TERMUX_V1.1.8.md",
        """# DraBornGarage v1.1.8 Termux Yedek ve Kurulum\n\n## v1.1.7 yedeği\n\n```bash\ncd ~/DraBornGarage\ngit status\ngit add -A\ngit commit -m \"backup: v1.1.7 before v1.1.8\" || true\nBACKUP_BRANCH=\"backup/v1.1.7-before-v1.1.8-$(date +%Y%m%d-%H%M)\"\ngit branch \"$BACKUP_BRANCH\"\ngit push origin \"$BACKUP_BRANCH\"\n```\n\n## v1.1.8 özellik dalını kur\n\n```bash\ncd ~/DraBornGarage\ngit fetch --all --prune\ngit switch feature/v1.1.8-qr-customer-mechanic-attribution\ngit pull --ff-only origin feature/v1.1.8-qr-customer-mechanic-attribution\nrm -rf node_modules dist .expo\nnpm ci\nnpx expo-doctor\nnpm run typecheck\nnpm run test:bundle\nnpx expo start -c --go\n```\n\n## Main birleştirmesinden sonra\n\n```bash\ncd ~/DraBornGarage\ngit switch main\ngit pull --ff-only origin main\nnpm ci\nnpx expo start -c --go\n```\n\nTest APK için GitHub Actions üzerinde yalnız **DraBornGarage Release APK**, Google Play AAB için yalnız **DraBornGarage Release AAB** çalıştırılır.\n""",
    )


def clean_workflows() -> None:
    workflows = ROOT / ".github" / "workflows"
    keep = {"release-apk.yml", "release-aab.yml", TEMP_WORKFLOW}
    for path in workflows.glob("*.*ml"):
        if path.name not in keep:
            path.unlink()


def main() -> None:
    patch_auth_context()
    patch_auth_screen()
    patch_customers_screen()
    sync_versions()
    write_docs()
    clean_workflows()
    print("DraBornGarage v1.1.8 guarded patch applied")


if __name__ == "__main__":
    main()
