from pathlib import Path
path=Path('src/components/perception/OrderflowInspector.tsx')
lines=path.read_text(encoding='utf-8').splitlines()
marker='import type { JSX } from  react;'
for i,line in enumerate(lines):
    if line.strip()==marker:
        lines.insert(i+1,'import { cn } from @/src/lib/utils;')
        break
else:
    raise SystemExit('marker not found')
path.write_text('\r\n'.join(lines)+'\r\n', encoding='utf-8')
