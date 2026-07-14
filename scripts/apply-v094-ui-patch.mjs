import fs from 'node:fs';

function patch(path, replacements) {
  let content = fs.readFileSync(path, 'utf8');
  for (const [from, to] of replacements) {
    if (!content.includes(from)) {
      throw new Error(`${path}: beklenen parça bulunamadı: ${from.slice(0, 120)}`);
    }
    content = content.replace(from, to);
  }
  fs.writeFileSync(path, content);
}

patch('src/screens/SettingsScreen.tsx', [
  [
    '<SettingsAccordion title="Motor Hazır IBAN" subtitle="Müşteriye gösterilecek Usta ödeme bilgisi" icon="card" accent={colors.green} open={openSection === \'payment\'} onToggle={() => toggleSection(\'payment\')}>',
    '<SettingsAccordion title="IBAN Ayarları" subtitle="Motor Hazır ve açık veresiye ödemeleri" icon="card" accent={colors.green} open={openSection === \'payment\'} onToggle={() => toggleSection(\'payment\')}>'
  ],
  [
    '<SettingsAccordion title="Uygulama" subtitle="v0.9.3 • Motor Hazır IBAN ve görsel düzeltmeler" icon="information-circle" accent={colors.green} open={openSection === \'app\'} onToggle={() => toggleSection(\'app\')}>',
    '<SettingsAccordion title="Uygulama" subtitle="v0.9.4 • IBAN ödeme bildirimi ve Usta onayı" icon="information-circle" accent={colors.green} open={openSection === \'app\'} onToggle={() => toggleSection(\'app\')}>'
  ],
  [
    'value="v0.9.3 • Motor Hazır IBAN ve Görsel Düzeltmeler"',
    'value="v0.9.4 • IBAN Ödeme Bildirimi ve Usta Onayı"'
  ],
  [
    'value="backup/v0.9.2-before-v0.9.3-20260714"',
    'value="backup/v0.9.3-before-v0.9.4-20260714"'
  ],
  [
    'value="Kod ve veritabanıyla v0.9.2"',
    'value="Kod ve veritabanıyla v0.9.3"'
  ],
]);

patch('src/customer/CustomerServicesScreen.tsx', [
  [
    '<CustomerReadyPaymentCard status={detail.status} payment={(detail as any).ready_payment} />',
    '<CustomerReadyPaymentCard orderId={orderId} status={detail.status} receivableStatus={detail.receivable_status} remainingAmount={detail.remaining_amount} payment={(detail as any).ready_payment} onUpdated={load} />'
  ],
]);

patch('src/screens/ReceivablesScreen.tsx', [
  [
    "import { ScreenHeader } from '../components/ScreenHeader';",
    "import { ScreenHeader } from '../components/ScreenHeader';\nimport { CustomerPaymentReportInbox } from './CustomerPaymentReportInbox';"
  ],
  [
    "  reminder_created: 'Müşteri hatırlatması oluşturuldu',",
    "  reminder_created: 'Müşteri hatırlatması oluşturuldu',\n  customer_payment_reported: 'Müşteri ödeme yaptığını bildirdi',\n  customer_payment_report_approved: 'Müşteri ödeme bildirimi onaylandı',\n  customer_payment_report_rejected: 'Müşteri ödeme bildirimi reddedildi',"
  ],
  [
    '    </LinearGradient>\n\n    <View style={styles.summaryRow}>',
    '    </LinearGradient>\n\n    <CustomerPaymentReportInbox />\n\n    <View style={styles.summaryRow}>'
  ],
]);

patch('package.json', [[
  '"version": "0.9.3"',
  '"version": "0.9.4"'
]]);

patch('package-lock.json', [
  ['"version": "0.9.3"', '"version": "0.9.4"'],
  ['"version": "0.9.3"', '"version": "0.9.4"'],
]);

patch('app.json', [
  ['"version": "0.9.3"', '"version": "0.9.4"'],
  ['"buildNumber": "12"', '"buildNumber": "13"'],
  ['"versionCode": 12', '"versionCode": 13'],
]);

console.log('DraBornGarage v0.9.4 UI patch uygulandı.');
