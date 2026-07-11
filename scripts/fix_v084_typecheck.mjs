import fs from 'node:fs';

const file = 'src/screens/WorkOrderDetailV04.tsx';
const source = fs.readFileSync(file, 'utf8');
const before = 'badge={statusLabels[order.status]}';
const after = 'badge={statusLabels[order.status as WorkOrderStatus]}';
if (source.includes(after)) {
  console.log('Status badge type is already fixed.');
} else if (source.includes(before)) {
  fs.writeFileSync(file, source.replace(before, after));
  console.log('Status badge type fixed.');
} else {
  throw new Error('Status badge target not found.');
}
