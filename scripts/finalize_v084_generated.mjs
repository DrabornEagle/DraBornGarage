import fs from 'node:fs';

function removeRepeatedRegion(source, startMarker, endMarker) {
  const firstStart = source.indexOf(startMarker);
  if (firstStart < 0) return source;
  const firstEnd = source.indexOf(endMarker, firstStart);
  if (firstEnd < 0) return source;
  let searchFrom = firstEnd + endMarker.length;
  while (true) {
    const duplicateStart = source.indexOf(startMarker, searchFrom);
    if (duplicateStart < 0) break;
    const duplicateEnd = source.indexOf(endMarker, duplicateStart);
    if (duplicateEnd < 0) break;
    source = source.slice(0, duplicateStart) + source.slice(duplicateEnd + endMarker.length);
    searchFrom = firstEnd + endMarker.length;
  }
  return source;
}

const appointmentsFile = 'src/screens/AppointmentsScreen.tsx';
let appointments = fs.readFileSync(appointmentsFile, 'utf8');
appointments = removeRepeatedRegion(
  appointments,
  '  const loadAttention = useCallback(async () => {',
  '  }, [workshop, filterMechanic]);\n',
);
appointments = removeRepeatedRegion(
  appointments,
  '  useEffect(() => { loadAttention(); }, [loadAttention]);',
  '  }, [workshop?.id, loadAppointments, loadAttention, loadHistory]);\n',
);
const firstAttention = appointments.indexOf('function NewAppointmentAttention(');
if (firstAttention >= 0) {
  const secondAttention = appointments.indexOf('function NewAppointmentAttention(', firstAttention + 1);
  const staffCard = appointments.indexOf('function StaffAppointmentCard(', firstAttention);
  if (secondAttention >= 0 && staffCard > secondAttention) {
    appointments = appointments.slice(0, secondAttention) + appointments.slice(staffCard);
  }
}
fs.writeFileSync(appointmentsFile, appointments);

const detailFile = 'src/screens/WorkOrderDetailV04.tsx';
let detail = fs.readFileSync(detailFile, 'utf8');
detail = detail.replace(
  `badge={\`${'${services.length}'} İşlem\`}> subtitle="Her işlem için planlandı, başladı ve tamamlandı saatleri tutulur." />`,
  `badge={\`${'${services.length}'} İşlem\`}>`,
);
const firstAccordion = detail.indexOf('function DetailAccordion(');
if (firstAccordion >= 0) {
  let secondAccordion = detail.indexOf('function DetailAccordion(', firstAccordion + 1);
  while (secondAccordion >= 0) {
    const headerStart = detail.indexOf('function Header(', secondAccordion);
    if (headerStart < 0) break;
    detail = detail.slice(0, secondAccordion) + detail.slice(headerStart);
    secondAccordion = detail.indexOf('function DetailAccordion(', firstAccordion + 1);
  }
}
fs.writeFileSync(detailFile, detail);

console.log('Generated v0.8.4 source normalized.');
