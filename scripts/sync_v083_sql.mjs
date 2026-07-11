import fs from 'node:fs';

const file = 'supabase/migrations/20260711220000_v0_8_3_customer_motor_tax_linking.sql';
const source = fs.readFileSync(file, 'utf8');
const before = `      where cl.user_id = p.id and cl.workshop_id = p_workshop_id and cl.status = 'approved'`;
const after = `      where cl.user_id = p.id\n        and cl.workshop_id = p_workshop_id\n        and cl.customer_id = existing.customer_id\n        and cl.status = 'approved'`;

if (source.includes(after)) {
  console.log('v0.8.3 SQL already synchronized.');
  process.exit(0);
}
if (!source.includes(before)) {
  throw new Error('Expected already_linked predicate was not found.');
}
fs.writeFileSync(file, source.replace(before, after));
console.log('v0.8.3 SQL synchronized with the applied Supabase migration.');
