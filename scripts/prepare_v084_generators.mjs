import fs from 'node:fs';

const coreFile = 'scripts/apply_v084_core.mjs';
const coreLines = fs.readFileSync(coreFile, 'utf8').split('\n');
const accountCardIndex = coreLines.findIndex((line) => line.startsWith("replaceOnce('src/screens/AuthScreen.tsx', `<AccountCard active={registerMode === 'customer'}"));
if (accountCardIndex >= 0) {
  coreLines[accountCardIndex] = `replaceOnce('src/screens/AuthScreen.tsx', \`<AccountCard active={registerMode === 'customer'} title="Müşteri" subtitle="Motor, onay, randevu, servis ve bildirim takibi" icon="bicycle" accent={colors.cyan} onPress={() => setRegisterMode('customer')} />\`, \`<AccountCard active={registerMode === 'customer'} title="Müşteri" subtitle="Motor, onay, randevu, servis ve bildirim takibi" icon="motorcycle" accent={colors.cyan} onPress={() => setRegisterMode('customer')} />\`);\nreplaceOnce('src/screens/AuthScreen.tsx', \`<AccountCard active={registerMode === 'staff'} title="İşletme / Usta" subtitle="Servis, takvim, ekip, alacak ve bildirim yönetimi" icon="construct" accent={colors.orange} onPress={() => setRegisterMode('staff')} />\`, \`<AccountCard active={registerMode === 'staff'} title="İşletme Başvurusu" subtitle="Başvurun Admin incelemesinden sonra işletme paneline dönüşür" icon="business" accent={colors.orange} onPress={() => setRegisterMode('staff')} />\`);`;
  fs.writeFileSync(coreFile, coreLines.join('\n'));
  console.log('Auth account-card generator target normalized.');
} else {
  console.log('Core generator is already normalized.');
}

const uiFile = 'scripts/apply_v084_ui.mjs';
let uiSource = fs.readFileSync(uiFile, 'utf8');
const strictLookup = `  const index = source.indexOf(before);\n  if (index < 0) {`;
const tolerantLookup = `  let index = source.indexOf(before);\n  if (index < 0 && before.startsWith('  ')) {\n    before = before.slice(2);\n    index = source.indexOf(before);\n  }\n  if (index < 0) {`;
if (uiSource.includes(strictLookup)) {
  uiSource = uiSource.replace(strictLookup, tolerantLookup);
  fs.writeFileSync(uiFile, uiSource);
  console.log('UI generator inline-style lookup normalized.');
} else {
  console.log('UI generator lookup is already normalized.');
}
