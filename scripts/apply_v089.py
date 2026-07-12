from __future__ import annotations

import json
from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text(encoding='utf-8')


def write(path: str, content: str) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding='utf-8')


def replace_required(path: str, before: str, after: str) -> None:
    source = read(path)
    if before not in source:
        raise RuntimeError(f'{path}: target not found: {before[:220]}')
    write(path, source.replace(before, after, 1))


# Login / registration: current release badge and Ankara examples.
replace_required('src/screens/AuthScreen.tsx', 'GARAGE OS • v0.8.5 AKILLI SERVİS SİSTEMİ', 'GARAGE OS • v0.8.9 AKILLI SERVİS SİSTEMİ')
replace_required('src/screens/AuthScreen.tsx', 'placeholder="Örn. Lara Moto Garage"', 'placeholder="Örn. Çankaya Moto Garage"')
replace_required('src/screens/AuthScreen.tsx', 'placeholder="Örn. Muratpaşa Vergi Dairesi"', 'placeholder="Örn. Çankaya Vergi Dairesi"')

# Reports selector: turn the plain segmented switch into two expressive report cards.
replace_required(
    'src/components/ReportsDashboard.tsx',
    "    {isOwner && isMechanic && <View style={[styles.modeSwitch, { backgroundColor: colors.surfaceSoft }]}>\n      <ModeButton active={viewMode === 'business'} label=\"İşletme\" icon=\"business\" onPress={() => setViewMode('business')} />\n      <ModeButton active={viewMode === 'personal'} label=\"Kişisel Usta\" icon=\"person\" onPress={() => setViewMode('personal')} />\n    </View>}",
    "    {isOwner && isMechanic && <View style={styles.modeSwitch}>\n      <ModeButton active={viewMode === 'business'} title=\"İşletme Raporu\" subtitle=\"Ekip, tahsilat ve servis özeti\" icon=\"business\" accent={colors.cyan} onPress={() => setViewMode('business')} />\n      <ModeButton active={viewMode === 'personal'} title=\"Kişisel Usta\" subtitle=\"Kendi işlerin ve kayıtların\" icon=\"person\" accent={colors.orange} onPress={() => setViewMode('personal')} />\n    </View>}",
)
replace_required(
    'src/components/ReportsDashboard.tsx',
    "function ModeButton({ active, label, icon, onPress }: { active: boolean; label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) { const { colors } = useTheme(); return <AnimatedPressable onPress={onPress} style={[styles.modeButton, active && { backgroundColor: colors.cardStrong }]}><Ionicons name={icon} size={17} color={active ? colors.primary : colors.textMuted} /><Text style={[styles.modeText, { color: active ? colors.text : colors.textMuted }]}>{label}</Text></AnimatedPressable>; }",
    "function ModeButton({ active, title, subtitle, icon, accent, onPress }: { active: boolean; title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap; accent: string; onPress: () => void }) {\n  const { colors } = useTheme();\n  return <AnimatedPressable onPress={onPress} style={[styles.modeButton, { backgroundColor: colors.card, borderColor: active ? accent : colors.border, shadowColor: accent }, active && styles.modeButtonActive]}>\n    {active && <LinearGradient colors={[`${accent}30`, `${colors.primary}18`]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />}\n    <View style={[styles.modeIconShell, { backgroundColor: `${accent}${active ? '26' : '12'}`, borderColor: `${accent}${active ? '70' : '28'}` }]}><Ionicons name={icon} size={23} color={active ? accent : colors.textMuted} /></View>\n    <View style={styles.modeCopy}><Text numberOfLines={1} style={[styles.modeTitle, { color: active ? colors.text : colors.textMuted }]}>{title}</Text><Text numberOfLines={2} style={[styles.modeSubtitle, { color: active ? colors.textSoft : colors.textMuted }]}>{subtitle}</Text></View>\n    <View style={[styles.modeState, { backgroundColor: active ? accent : `${colors.textMuted}16`, borderColor: active ? accent : colors.border }]}><Ionicons name={active ? 'checkmark' : 'chevron-forward'} size={15} color={active ? '#08111F' : colors.textMuted} /></View>\n  </AnimatedPressable>;\n}",
)
replace_required(
    'src/components/ReportsDashboard.tsx',
    "  modeSwitch: { flexDirection: 'row', padding: 4, borderRadius: 16 }, modeButton: { flex: 1, minHeight: 44, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, modeText: { fontSize: 12.5, fontWeight: '900' },",
    "  modeSwitch: { flexDirection: 'row', gap: 10 }, modeButton: { flex: 1, minWidth: 0, minHeight: 122, borderRadius: 22, borderWidth: 1, padding: 13, overflow: 'hidden', shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 3 }, modeButtonActive: { shadowOpacity: 0.28, elevation: 8 }, modeIconShell: { width: 45, height: 45, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, modeCopy: { marginTop: 10, paddingRight: 24 }, modeTitle: { fontSize: 14.5, fontWeight: '900' }, modeSubtitle: { fontSize: 11.5, lineHeight: 15, marginTop: 4 }, modeState: { position: 'absolute', right: 11, top: 11, width: 27, height: 27, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },",
)

# Receivables: increase local typography and touch targets while preserving the layout.
receivable_replacements = {
    "heroLabel: { color: 'rgba(255,255,255,0.76)', fontSize: 11,": "heroLabel: { color: 'rgba(255,255,255,0.82)', fontSize: 13,",
    "heroValue: { color: '#fff', fontSize: 34,": "heroValue: { color: '#fff', fontSize: 37,",
    "heroMeta: { color: 'rgba(255,255,255,0.76)', fontSize: 12,": "heroMeta: { color: 'rgba(255,255,255,0.82)', fontSize: 14,",
    "heroSmall: { color: '#fff', fontSize: 12.5,": "heroSmall: { color: '#fff', fontSize: 14.5,",
    "summaryCard: { flex: 1, minWidth: 0, borderWidth: 1, borderRadius: 19, padding: 11, minHeight: 103 }": "summaryCard: { flex: 1, minWidth: 0, borderWidth: 1, borderRadius: 20, padding: 12, minHeight: 112 }",
    "summaryValue: { fontSize: 13,": "summaryValue: { fontSize: 16,",
    "summaryLabel: { fontSize: 10,": "summaryLabel: { fontSize: 12,",
    "filter: { minHeight: 42,": "filter: { minHeight: 48,",
    "filterText: { fontSize: 12,": "filterText: { fontSize: 14,",
    "card: { borderWidth: 1, borderRadius: 23, padding: 14, gap: 12 }": "card: { borderWidth: 1, borderRadius: 24, padding: 16, gap: 14 }",
    "cardTitle: { fontSize: 14,": "cardTitle: { fontSize: 17,",
    "cardMeta: { fontSize: 11, lineHeight: 14,": "cardMeta: { fontSize: 13.5, lineHeight: 18,",
    "badge: { maxWidth: 108,": "badge: { maxWidth: 132,",
    "badgeText: { fontSize: 10,": "badgeText: { fontSize: 12,",
    "complaint: { fontSize: 12.5, lineHeight: 17 }": "complaint: { fontSize: 15, lineHeight: 21 }",
    "amountBox: { flex: 1, minWidth: 0, borderRadius: 14, padding: 9, minHeight: 62,": "amountBox: { flex: 1, minWidth: 0, borderRadius: 15, padding: 10, minHeight: 70,",
    "amountLabel: { fontSize: 9.5,": "amountLabel: { fontSize: 11,",
    "amountValue: { fontSize: 12.5,": "amountValue: { fontSize: 15.5,",
    "dueText: { flex: 1, fontSize: 12 }": "dueText: { flex: 1, fontSize: 14, lineHeight: 19 }",
    "emptyText: { fontSize: 12.5, lineHeight: 18,": "emptyText: { fontSize: 14, lineHeight: 20,",
    "detailTitle: { fontSize: 20,": "detailTitle: { fontSize: 23,",
    "detailPaid: { color: '#fff', fontSize: 17,": "detailPaid: { color: '#fff', fontSize: 20,",
    "customerMessage: { borderWidth: 1, borderRadius: 15, padding: 11, fontSize: 12.5, lineHeight: 17 }": "customerMessage: { borderWidth: 1, borderRadius: 15, padding: 12, fontSize: 14.5, lineHeight: 20 }",
    "sectionTitle: { fontSize: 18,": "sectionTitle: { fontSize: 20,",
    "sectionSub: { fontSize: 12, lineHeight: 16,": "sectionSub: { fontSize: 14, lineHeight: 19,",
    "toggleItem: { flex: 1, minHeight: 42,": "toggleItem: { flex: 1, minHeight: 48,",
    "toggleText: { fontSize: 12,": "toggleText: { fontSize: 14,",
    "listRow: { minHeight: 64,": "listRow: { minHeight: 74,",
    "paymentValue: { fontSize: 13,": "paymentValue: { fontSize: 15.5,",
    "noteText: { fontSize: 12.5, lineHeight: 17,": "noteText: { fontSize: 14.5, lineHeight: 20,",
    "eventNote: { fontSize: 12, lineHeight: 15,": "eventNote: { fontSize: 14, lineHeight: 19,",
}
for before, after in receivable_replacements.items():
    replace_required('src/screens/ReceivablesScreen.tsx', before, after)

# Release metadata.
for path in ('package.json', 'package-lock.json'):
    data = json.loads(read(path))
    data['version'] = '0.8.9'
    if path == 'package-lock.json' and data.get('packages', {}).get(''):
        data['packages']['']['version'] = '0.8.9'
    write(path, json.dumps(data, ensure_ascii=False, indent=2) + '\n')

app = json.loads(read('app.json'))
app['expo']['version'] = '0.8.9'
write('app.json', json.dumps(app, ensure_ascii=False, indent=2) + '\n')

replace_required('src/screens/SettingsScreen.tsx', 'v0.8.8 • Bildirim, Rapor ve Sportbike Arayüzü', 'v0.8.9 • Ankara Demo, Rapor ve Okunabilirlik')
replace_required('src/screens/SettingsScreen.tsx', 'backup/v0.8.7-before-v0.8.8-ui-fix-20260712', 'backup/v0.8.8-before-v0.8.9-20260712')
replace_required('src/screens/SettingsScreen.tsx', 'Kod yedeğiyle v0.8.7', 'Kod yedeğiyle v0.8.8')

readme = read('README.md')
readme = readme.replace('**Kurulan sürüm:** `v0.8.8`', '**Kurulan sürüm:** `v0.8.9`')
readme = readme.replace('backup/v0.8.7-before-v0.8.8-ui-fix-20260712', 'backup/v0.8.8-before-v0.8.9-20260712')
write('README.md', readme)

roadmap = read('docs/ROADMAP.md')
roadmap = roadmap.replace('Güncel sürüm `v0.8.8`dür.', 'Güncel sürüm `v0.8.9`dür.')
if '## v0.8.9' not in roadmap:
    roadmap = roadmap.replace(
        '## v0.9 — Google Play Uyum, Test ve Pilot',
        "## v0.8.9 — Ankara Demo, Rapor ve Okunabilirlik ✅\n\n- [x] Antalya demo verilerini Ankara örnekleriyle değiştirme\n- [x] Rapor görünüm seçicisini modernleştirme\n- [x] Alacak ekranı yazılarını büyütme\n- [x] Renkli ve yolda ilerleyen yarış motosikleti ikonu\n- [x] Tüm kullanıcıları temizleme ve ana e-postayı otomatik Admin yapma\n\n## v0.9 — Google Play Uyum, Test ve Pilot",
    )
write('docs/ROADMAP.md', roadmap)

write('docs/CHANGELOG_V0.8.9.md', """# DraBornGarage v0.8.9

Tarih: 12 Temmuz 2026

## Ankara demo verileri
- Lara ve Konyaaltı örnek işletmeleri Çankaya ve Keçiören örnekleriyle değiştirildi.
- Antalya adresleri, 0242 telefonlar ve 07 plakalar Ankara karşılıklarına dönüştürüldü.
- Kayıt ekranındaki işletme ve vergi dairesi örnekleri Ankara'ya uyarlandı.

## Rapor Merkezi
- İşletme Raporu ve Kişisel Usta seçimi modern, büyük ve açıklamalı kartlara dönüştürüldü.
- Aktif kartta gradyan, vurgu rengi, onay işareti, sınır ve gölge kullanılır.

## Alacaklar
- Özet kartları, filtreler, müşteri bilgileri, durum rozetleri, tutarlar, notlar ve detay metinleri büyütüldü.
- Kart aralıkları ve dokunma alanları okunabilirlik için genişletildi.

## Yarış motosikleti
- Motosiklet ikonu renkli, grenajlı modern bir sportbike olarak yeniden çizildi.
- Süspansiyon, hız çizgileri, hareketli yol şeritleri ve zemin parlaması eklendi.

## Kullanıcı temizliği
- Veritabanındaki mevcut kullanıcılar ve kullanıcıya bağlı test verileri temizlendi.
- draborneagle@gmail.com yeniden kayıt olduğunda otomatik Admin olur.
""")

write('docs/PROJECT_HANDOFF_V0.8.9.md', """# DraBornGarage — v0.8.9 Devam Dosyası

**Güncel sürüm:** `v0.8.9`  
**Önceki sabit yedek:** `backup/v0.8.8-before-v0.8.9-20260712`  
**Sonraki sürüm:** `v0.9.0`

## Tamamlanan kapsam
- Demo verilerinin Antalya yerine Ankara/Çankaya/Keçiören örnekleriyle çalışması.
- Rapor Merkezi İşletme/Kişisel Usta seçim kartlarının modernleştirilmesi.
- Alacak ekranındaki metinlerin ve dokunma alanlarının büyütülmesi.
- Renkli, animasyonlu yarış motosikleti ve hareketli yol çizgileri.
- Veritabanındaki kullanıcıların temizlenmesi.
- draborneagle@gmail.com için otomatik Admin atamasının güvenceye alınması.

## Doğrulama
- TypeScript kontrolü.
- Android JavaScript bundle kontrolü.
- Supabase kullanıcı sayısı ve otomatik Admin trigger doğrulaması.

## Kurulum
- Yerel yedek: `DraBornGarage-v0.8.8-local-backup`
- Termux komutu: `docs/TERMUX_INSTALL.md`
""")

write('docs/TERMUX_INSTALL.md', """# Termux — v0.8.8 Yedekle, v0.8.9 Kur

```bash
cd ~

KURULAN_SURUM="v0.8.9"
YEDEKLENEN_SURUM="v0.8.8"
YEDEK_KLASORU="$HOME/DraBornGarage-v0.8.8-local-backup"
ZIP_DOSYASI="$HOME/DraBornGarage-v0.8.9.zip"
ACILAN_KLASOR="$HOME/DraBornGarage-main"

printf '\n========================================\n'
printf 'KURULACAK YENİ SÜRÜM: %s\n' "$KURULAN_SURUM"
printf 'YEDEKLENECEK SÜRÜM: %s\n' "$YEDEKLENEN_SURUM"
printf 'YEDEK KLASÖRÜ: %s\n' "$YEDEK_KLASORU"
printf '========================================\n\n'

pkg update -y
pkg install nodejs-lts curl unzip -y
rm -rf "$YEDEK_KLASORU" "$ACILAN_KLASOR"
rm -f "$ZIP_DOSYASI"

if [ -d "$HOME/DraBornGarage" ]; then
  mv "$HOME/DraBornGarage" "$YEDEK_KLASORU"
  echo "Mevcut v0.8.8 sürümü yedeklendi."
fi

curl -L --retry 10 --retry-delay 3 --connect-timeout 30 --max-time 600 \
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

Beklenen sürüm: `0.8.9`.

Bağlantı sorunu olursa:

```bash
cd ~/DraBornGarage
npx expo start -c --tunnel --go
```

Kod yedeği: `backup/v0.8.8-before-v0.8.9-20260712`.
""")

migration = """-- DraBornGarage v0.8.9 — Ankara demo metinleri ve ana Admin güvence katmanı

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, role, is_driver, admin_role, is_active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'phone',
    'user',
    false,
    case when lower(new.email) = 'draborneagle@gmail.com' then 'admin' else null end,
    true
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    phone = excluded.phone,
    admin_role = excluded.admin_role,
    is_active = true;

  if lower(new.email) = 'draborneagle@gmail.com' then
    update public.profiles set admin_role = 'admin', is_active = true where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

update public.workshops set
  name = case name when 'Lara Moto Garage • Demo' then 'Çankaya Moto Garage • Demo' when 'Konyaaltı Scooter Servis • Demo' then 'Keçiören Scooter Servis • Demo' else name end,
  address = case address when 'Muratpaşa / Lara' then 'Çankaya / Ankara' when 'Konyaaltı / Antalya' then 'Keçiören / Ankara' else address end,
  phone = case phone when '0242 555 10 10' then '0312 555 10 10' when '0242 555 20 20' then '0312 555 20 20' else phone end
where name in ('Lara Moto Garage • Demo', 'Konyaaltı Scooter Servis • Demo')
   or address in ('Muratpaşa / Lara', 'Konyaaltı / Antalya');

update public.customers set full_name = case full_name
  when 'Lara Demo Müşteri' then 'Çankaya Demo Müşteri'
  when 'Konyaaltı Demo Müşteri' then 'Keçiören Demo Müşteri'
  else full_name end
where full_name in ('Lara Demo Müşteri', 'Konyaaltı Demo Müşteri');

update public.motorcycles set plate = case plate
  when '07 LRA 707' then '06 CNY 707'
  when '07 KNY 250' then '06 KEC 250'
  else plate end
where plate in ('07 LRA 707', '07 KNY 250');

do $$
declare
  v_oid oid;
  v_def text;
begin
  select p.oid into v_oid
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'create_demo_data' and p.prokind = 'f'
  order by p.oid desc limit 1;

  if v_oid is not null then
    v_def := pg_get_functiondef(v_oid);
    v_def := replace(v_def, 'Lara Moto Garage • Demo', 'Çankaya Moto Garage • Demo');
    v_def := replace(v_def, 'Muratpaşa / Lara', 'Çankaya / Ankara');
    v_def := replace(v_def, '0242 555 10 10', '0312 555 10 10');
    v_def := replace(v_def, 'Konyaaltı Scooter Servis • Demo', 'Keçiören Scooter Servis • Demo');
    v_def := replace(v_def, 'Konyaaltı / Antalya', 'Keçiören / Ankara');
    v_def := replace(v_def, '0242 555 20 20', '0312 555 20 20');
    v_def := replace(v_def, 'Lara Demo Müşteri', 'Çankaya Demo Müşteri');
    v_def := replace(v_def, 'Konyaaltı Demo Müşteri', 'Keçiören Demo Müşteri');
    v_def := replace(v_def, '07 LRA 707', '06 CNY 707');
    v_def := replace(v_def, '07 KNY 250', '06 KEC 250');
    execute v_def;
  end if;
end;
$$;
"""
write('supabase/migrations/20260712223000_v0_8_9_ankara_demo_and_admin.sql', migration)
write('supabase/rollbacks/20260712223000_v0_8_9_ankara_demo_and_admin_rollback.sql', """update public.workshops set
  name = case name when 'Çankaya Moto Garage • Demo' then 'Lara Moto Garage • Demo' when 'Keçiören Scooter Servis • Demo' then 'Konyaaltı Scooter Servis • Demo' else name end,
  address = case address when 'Çankaya / Ankara' then 'Muratpaşa / Lara' when 'Keçiören / Ankara' then 'Konyaaltı / Antalya' else address end,
  phone = case phone when '0312 555 10 10' then '0242 555 10 10' when '0312 555 20 20' then '0242 555 20 20' else phone end
where name in ('Çankaya Moto Garage • Demo', 'Keçiören Scooter Servis • Demo');
update public.customers set full_name = case full_name when 'Çankaya Demo Müşteri' then 'Lara Demo Müşteri' when 'Keçiören Demo Müşteri' then 'Konyaaltı Demo Müşteri' else full_name end where full_name in ('Çankaya Demo Müşteri', 'Keçiören Demo Müşteri');
update public.motorcycles set plate = case plate when '06 CNY 707' then '07 LRA 707' when '06 KEC 250' then '07 KNY 250' else plate end where plate in ('06 CNY 707', '06 KEC 250');
""")

print('v0.8.9 changes prepared')
