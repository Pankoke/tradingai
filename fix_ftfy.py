from pathlib import Path
from ftfy import fix_text
paths=[Path('src/messages/de.json'),Path('src/messages/en.json'),Path('src/app/[locale]/pricing/page.tsx')]
for path in paths:
    if not path.exists():
        continue
    raw = path.read_text(encoding='utf-8', errors='ignore')
    fixed = fix_text(raw)
    path.write_text(fixed, encoding='utf-8')
