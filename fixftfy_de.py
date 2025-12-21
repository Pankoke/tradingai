from pathlib import Path
from ftfy import fix_text
path=Path('src/messages/de.json')
text=path.read_text(encoding='utf-8')
text=fix_text(text)
path.write_text(text,encoding='utf-8')