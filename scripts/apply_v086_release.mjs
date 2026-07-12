import fs from 'node:fs';

function read(path) { return fs.readFileSync(path, 'utf8'); }
function write(path, value) { fs.writeFileSync(path, value); }
function replaceRequired(path, before, after) {
  const source = read(path);
  if (!source.includes(before)) throw new Error(`${path}: target not found: ${before}`);
  write(path, source.replace(before, after));
}

const pkg = JSON.parse(read('package.json'));
pkg.version = '0.8.6';
write('package.json', `${JSON.stringify(pkg, null, 2)}\n`);

const lock = JSON.parse(read('package-lock.json'));
lock.version = '0.8.6';
if (lock.packages?.['']) lock.packages[''].version = '0.8.6';
write('package-lock.json', `${JSON.stringify(lock, null, 2)}\n`);

const app = JSON.parse(read('app.json'));
app.expo.version = '0.8.6';
write('app.json', `${JSON.stringify(app, null, 2)}\n`);

replaceRequired('src/screens/SettingsScreen.tsx', 'v0.8.5 • Usta Başvuruları ve Okunabilir Arayüz', 'v0.8.6 • İşletme Keşfi ve Bağımsız Randevu');
replaceRequired('src/screens/SettingsScreen.tsx', 'backup/v0.8.4-before-v0.8.5-20260712', 'backup/v0.8.5-before-v0.8.6-20260712');
replaceRequired('src/screens/SettingsScreen.tsx', 'Kod yedeğiyle v0.8.4', 'Kod yedeğiyle v0.8.5');

write('docs/CHANGELOG_V0.8.6.md', `# DraBornGarage v0.8.6\n\nTarih: 12 Temmuz 2026\n\n## Giriş ve yönlendirme\n- Normal kullanıcı artık giriş veya kayıt sonrasında eski “İşletme oluştur / Ekibe katıl” ara ekranına gönderilmez.\n- Admin veya aktif işletme üyeliği olmayan her hesap doğrudan müşteri paneline açılır.\n\n## Motoru işletmeye bağlama\n- Kullanıcı bağlanmak istediği işletmeyi adına göre arar ve seçer.\n- Plaka, marka, model ve telefon bilgileri seçilen işletmeye Usta onay talebi olarak gönderilir.\n- İşletmede henüz müşteri veya motor kaydı yoksa Usta onayında güvenli biçimde oluşturulur.\n\n## Bağlantısız randevu\n- Randevu almak için işletmeye önceden bağlı olma şartı kaldırıldı.\n- Kullanıcı randevuya açık işletmeyi arar, Ustayı, tarihi ve boş saati seçer.\n- Randevu işletme/Usta takvimine düşer ve Usta panelinden onaylanabilir.\n- Kullanıcı bütün işletmelerdeki kendi randevularını tek ekranda görür ve uygun durumdakileri iptal edebilir.\n\n## QR ve manuel kod\n- QR ekranına açık bir manuel servis/eşleştirme kodu alanı eklendi.\n- Alan QR bağlantısı, UUID claim token veya 8 haneli servis takip kodunu kabul eder.\n`);

write('docs/PROJECT_HANDOFF_V0.8.6.md', `# DraBornGarage — v0.8.6 Devam Dosyası\n\n**Güncel sürüm:** \`v0.8.6\`  \n**Önceki sabit yedek:** \`backup/v0.8.5-before-v0.8.6-20260712\`  \n**Sonraki ana sürüm:** \`v0.9.0\`\n\n## Tamamlanan kapsam\n- Eski WorkshopSetup ara ekranı normal kullanıcı akışından çıkarıldı.\n- Motor eşleştirmede işletme arama ve seçili işletmeye Usta onay talebi.\n- İşletme bağlantısı olmadan işletme/Usta/tarih/saat seçerek randevu oluşturma.\n- İşletme ve Usta takviminde mevcut onay akışının korunması.\n- QR taramaya ek manuel takip/eşleştirme kodu alanı.\n- Kullanıcının bütün işletmelerdeki randevularını tek listede görmesi.\n\n## Veritabanı\n- Migration: \`supabase/migrations/20260712160000_v0_8_6_customer_discovery_booking.sql\`\n- Rollback: \`supabase/rollbacks/20260712160000_v0_8_6_customer_discovery_booking_rollback.sql\`\n\n## Kurulum\n- Yerel yedek: \`DraBornGarage-v0.8.5-local-backup\`\n- Termux komutu: \`docs/TERMUX_INSTALL.md\`\n`);

let roadmap = read('docs/ROADMAP.md');
if (!roadmap.includes('## v0.8.6')) {
  roadmap = roadmap.replace('## v0.9', `## v0.8.6 — İşletme Keşfi ve Bağımsız Randevu ✅\n\n- [x] Normal kullanıcı için ara kurulum ekranını kaldırma\n- [x] İşletme arayarak motor eşleştirme talebi\n- [x] Bağlantı olmadan işletme ve Usta seçerek randevu\n- [x] Tüm işletmelerdeki müşteri randevuları\n- [x] QR yanında manuel servis kodu\n\n## v0.9`);
}
roadmap = roadmap.replace('Güncel sürüm `v0.8.5`dür.', 'Güncel sürüm `v0.8.6`dür.');
write('docs/ROADMAP.md', roadmap);

let readme = read('README.md');
readme = readme.replace(/\*\*v0\.8\.5[^\n]*\*\*/, '**v0.8.6 — İşletme Keşfi, Bağımsız Randevu ve Manuel Kod**');
readme = readme.replace(/`v0\.8\.5`/g, '`v0.8.6`');
readme = readme.replace(/backup\/v0\.8\.4-before-v0\.8\.5-20260712/g, 'backup/v0.8.5-before-v0.8.6-20260712');
write('README.md', readme);

write('docs/TERMUX_INSTALL.md', `# Termux — v0.8.5 Yedekle, v0.8.6 Kur\n\n\`\`\`bash\ncd ~\nKURULAN_SURUM="v0.8.6"\nYEDEKLENEN_SURUM="v0.8.5"\nYEDEK_KLASORU="$HOME/DraBornGarage-v0.8.5-local-backup"\nZIP_DOSYASI="$HOME/DraBornGarage-v0.8.6.zip"\nACILAN_KLASOR="$HOME/DraBornGarage-main"\n\npkg update -y\npkg install nodejs-lts curl unzip -y\nrm -rf "$YEDEK_KLASORU" "$ACILAN_KLASOR"\nrm -f "$ZIP_DOSYASI"\nif [ -d "$HOME/DraBornGarage" ]; then mv "$HOME/DraBornGarage" "$YEDEK_KLASORU"; fi\ncurl -L --retry 10 --retry-delay 3 --connect-timeout 30 --max-time 600 "https://github.com/DrabornEagle/DraBornGarage/archive/refs/heads/main.zip" -o "$ZIP_DOSYASI"\nunzip -o "$ZIP_DOSYASI" -d "$HOME"\nmv "$ACILAN_KLASOR" "$HOME/DraBornGarage"\nrm -f "$ZIP_DOSYASI"\nif [ -f "$YEDEK_KLASORU/.env" ]; then cp "$YEDEK_KLASORU/.env" "$HOME/DraBornGarage/.env"; else cp "$HOME/DraBornGarage/.env.example" "$HOME/DraBornGarage/.env"; fi\ncd "$HOME/DraBornGarage"\nnpm config set registry "https://registry.npmjs.org/"\nnpm config set fetch-retries 10\nnpm config set fetch-timeout 300000\nnpm install --no-audit --no-fund\nnpm run typecheck\nnode -p "require('./package.json').version"\nnpx expo start -c --go\n\`\`\`\n\nBeklenen sürüm: \`0.8.6\`. Bağlantı sorunu olursa: \`npx expo start -c --tunnel --go\`.\n\nKod yedeği: \`backup/v0.8.5-before-v0.8.6-20260712\`.\n`);

console.log('v0.8.6 release metadata prepared.');
