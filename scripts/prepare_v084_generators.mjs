import fs from 'node:fs';

const file = 'scripts/apply_v084_core.mjs';
const lines = fs.readFileSync(file, 'utf8').split('\n');
const index = lines.findIndex((line) => line.startsWith("replaceOnce('src/screens/AuthScreen.tsx', `<AccountCard active={registerMode === 'customer'}"));
if (index >= 0) {
  lines[index] = `replaceOnce('src/screens/AuthScreen.tsx', \`<AccountCard active={registerMode === 'customer'} title="Müşteri" subtitle="Motor, onay, randevu, servis ve bildirim takibi" icon="bicycle" accent={colors.cyan} onPress={() => setRegisterMode('customer')} />\`, \`<AccountCard active={registerMode === 'customer'} title="Müşteri" subtitle="Motor, onay, randevu, servis ve bildirim takibi" icon="motorcycle" accent={colors.cyan} onPress={() => setRegisterMode('customer')} />\`);\nreplaceOnce('src/screens/AuthScreen.tsx', \`<AccountCard active={registerMode === 'staff'} title="İşletme / Usta" subtitle="Servis, takvim, ekip, alacak ve bildirim yönetimi" icon="construct" accent={colors.orange} onPress={() => setRegisterMode('staff')} />\`, \`<AccountCard active={registerMode === 'staff'} title="İşletme Başvurusu" subtitle="Başvurun Admin incelemesinden sonra işletme paneline dönüşür" icon="business" accent={colors.orange} onPress={() => setRegisterMode('staff')} />\`);`;
  fs.writeFileSync(file, lines.join('\n'));
  console.log('Auth account-card generator target normalized.');
} else {
  console.log('Generator is already normalized.');
}
