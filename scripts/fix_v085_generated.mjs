import fs from 'node:fs';

function edit(file, transform) {
  const source = fs.readFileSync(file, 'utf8');
  const next = transform(source);
  if (next === source) console.log(`${file}: no change needed`);
  else fs.writeFileSync(file, next);
}

edit('src/screens/HomeScreen.tsx', (source) => source
  .replace("  const isOwner = isAdmin || membership?.role === 'owner' || membership?.role === 'owner_mechanic';\n", '')
  .replace("  const [panelMode, setPanelMode] = useState<PanelMode>(isOwner ? 'business' : 'mechanic');\n", '')
  .replace("    setPanelMode(isOwner ? 'business' : 'mechanic');\n", '')
  .replace("  }, [workshop?.id, isOwner, membership?.availability_status]);", "  }, [workshop?.id, membership?.availability_status]);")
  .replace("{panelMode === 'business' ? 'BUGÜN TAHSİL EDİLEN' : 'BUGÜN KAYDEDİLEN İŞ TUTARI'}", 'BUGÜN KAYDEDİLEN İŞ TUTARI')
);

console.log('v0.8.5 generated source normalized.');
