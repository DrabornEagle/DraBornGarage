from pathlib import Path
import re

path = Path('/tmp/v110_upgrade.py')
text = path.read_text()
pattern = r'''\n    marker = "           if blocked & permissions: raise SystemExit\(f'Engellenen izinler bulundu: \{sorted\(blocked & permissions\)\}'\)\\n"\n    if marker not in text:\n        raise SystemExit\(f"Manifest marker not found in \{workflow\}"\)\n    text = text\.replace\(marker, marker \+ "           uses_sdk=root\.find\('uses-sdk'\)\\n           target_sdk=int\(uses_sdk\.attrib\.get\(android\+'targetSdkVersion','0'\) or 0\) if uses_sdk is not None else 0\\n           if target_sdk<35: raise SystemExit\(f'Target SDK çok düşük veya bulunamadı: \{target_sdk\}'\)\\n", 1\)'''
replacement = '''
    manifest_line = "if blocked & permissions: raise SystemExit(f'Engellenen izinler bulundu: {sorted(blocked & permissions)}')"
    if manifest_line not in text:
        raise SystemExit(f"Manifest marker not found in {workflow}")
    manifest_indent = next(line[:len(line)-len(line.lstrip())] for line in text.splitlines() if manifest_line in line)
    manifest_check = "\\n".join([
        manifest_indent + "uses_sdk=root.find('uses-sdk')",
        manifest_indent + "target_sdk=int(uses_sdk.attrib.get(android+'targetSdkVersion','0') or 0) if uses_sdk is not None else 0",
        manifest_indent + "if target_sdk<35: raise SystemExit(f'Target SDK çok düşük veya bulunamadı: {target_sdk}')",
    ])
    text = text.replace(manifest_indent + manifest_line, manifest_indent + manifest_line + "\\n" + manifest_check, 1)'''
text, count = re.subn(pattern, lambda _: replacement, text, count=1)
if count != 1:
    raise SystemExit(f'v1.1.0 fixer expected one workflow block, found {count}')
path.write_text(text)
