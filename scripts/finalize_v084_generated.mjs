import fs from 'node:fs';

const detailFile = 'src/screens/WorkOrderDetailV04.tsx';
let detail = fs.readFileSync(detailFile, 'utf8');
detail = detail.replace(
  `badge={\`${'${services.length}'} İşlem\`}> subtitle="Her işlem için planlandı, başladı ve tamamlandı saatleri tutulur." />`,
  `badge={\`${'${services.length}'} İşlem\`}>`,
);
fs.writeFileSync(detailFile, detail);

console.log('Generated v0.8.4 source normalized.');
