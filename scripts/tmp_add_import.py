from pathlib import Path
path=Path('src/components/perception/OrderflowInspector.tsx')
text=path.read_text(encoding='utf-8')
old='import React from  react;\r\nimport type { JSX } from react;\r\nimport { useT } from @/src/lib/i18n/ClientProvider;\r\nimport type { Setup } from @/src/lib/engine/types;\r\n'
new='import React from react;\r\nimport type { JSX } from react;\r\nimport { cn } from @/src/lib/utils;\r\nimport { useT } from @/src/lib/i18n/ClientProvider;\r\nimport type { Setup } from @/src/lib/engine/types;\r\n'
if old not in text:
    raise SystemExit('pattern not found')
path.write_text(text.replace(old,new,1), encoding='utf-8')
