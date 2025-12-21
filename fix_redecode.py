from pathlib import Path
paths=['src/messages/de.json','src/messages/en.json','src/app/[locale]/pricing/page.tsx']
for p in paths:
    path=Path(p)
    if not path.exists():
        continue
    raw=path.read_text(encoding='utf-8', errors='ignore')
    try:
        fixed = raw.encode('latin1').decode('utf-8')
    except UnicodeEncodeError:
        fixed = raw
    path.write_text(fixed, encoding='utf-8')
