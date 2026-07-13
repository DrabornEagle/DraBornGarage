from pathlib import Path

path = Path('scripts/apply_v0811.py')
source = path.read_text(encoding='utf-8')
before = '<View style={styles.sectionHeader}\"><Text style={[styles.sectionTitle, { color: colors.text }]}>Bağlı İşletmeler</Text>'
after = '<View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: colors.text }]}>Bağlı İşletmeler</Text>'
if before not in source:
    raise RuntimeError('v0.8.11 updater target typo was not found')
path.write_text(source.replace(before, after, 1), encoding='utf-8')
print('v0.8.11 updater target repaired')
