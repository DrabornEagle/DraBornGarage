from pathlib import Path

path = Path('scripts/apply_v0812.py')
source = path.read_text(encoding='utf-8')
before = "fontWeight: '850'"
after = "fontWeight: '800'"
if before not in source:
    raise RuntimeError('v0.8.12 font weight target not found')
path.write_text(source.replace(before, after), encoding='utf-8')
print('v0.8.12 font weight repaired')
