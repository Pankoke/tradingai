from pathlib import Path
path = Path('src/components/perception/OrderflowInspector.tsx')
text = path.read_text()
old = '''      {flags.length > 0 && (
        <div class=" flex flex-wrap gap-2\>
 {flags.map((flag) => (
 <span
 key={flag}
 className={ounded-full border px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.25em] }
 >
 {t(flagLabelMap[flag] ?? perception.orderflow.flags.)}
 </span>
 ))}
 </div>
 )}
'''
new = ''' {flags.length > 0 && (
 <div class=\flex flex-wrap gap-2\>
 {flags.map((flag) => {
 const isAlignment = alignmentFlags.has(flag);
 const isConflict = conflictFlags.has(flag);
 return (
 <span
 key={flag}
 className={ounded-full border px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.25em] }
 >
 {t(flagLabelMap[flag] ?? perception.orderflow.flags.)}
 </span>
 );
 })}
 </div>
 )}
'''
if old not in text:
 raise RuntimeError('pattern not found')
path.write_text(text.replace(old, new))
