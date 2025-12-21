from pathlib import Path
paths=[Path('src/messages/de.json'),Path('src/messages/en.json')]
for path in paths:
    if not path.exists():
        continue
    text=path.read_text(encoding='utf-8',errors='ignore')
    for _ in range(3):
        try:
            text = text.encode('latin1').decode('utf-8')
        except Exception:
            break
    path.write_text(text, encoding='utf-8')
