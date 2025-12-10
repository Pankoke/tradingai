const fs=require('fs');
const path='src/components/perception/OrderflowInspector.tsx';
const lines=fs.readFileSync(path,'utf8').split(/\r?\n/);
const marker='import type { JSX } from  react;';
const idx=lines.findIndex((line)=>line.trim()===marker);
if(idx===-1) {
  throw new Error('marker not found');
}
lines.splice(idx+1,0,'import { cn } from @/src/lib/utils;');
fs.writeFileSync(path,lines.join('\r\n')+'\r\n', 'utf8');
