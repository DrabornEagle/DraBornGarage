from pathlib import Path

path = Path('scripts/apply_v0811.py')
source = path.read_text(encoding='utf-8')
before = '<View style={styles.sectionHeader}\"><Text style={[styles.sectionTitle, { color: colors.text }]}>Bağlı İşletmeler</Text>'
after = '<View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: colors.text }]}>Bağlı İşletmeler</Text>'
occurrences = source.count(before)
if occurrences < 2:
    raise RuntimeError(f'Expected two v0.8.11 updater target typos, found {occurrences}')
path.write_text(source.replace(before, after), encoding='utf-8')
print(f'v0.8.11 updater targets repaired: {occurrences}')
