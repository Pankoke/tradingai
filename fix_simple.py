from pathlib import Path
files = [Path('src/messages/de.json'), Path('src/messages/en.json'), Path('src/app/[locale]/pricing/page.tsx')]
repl = {
    'Ã¼':'ü','Ãœ':'Ü','Ã¶':'ö','Ã–':'Ö','Ã¤':'ä','Ã„':'Ä','ÃŸ':'ß',
    'â€“':'–','â€”':'—','Â·':'·','Ã¤':'ä','Ã¡':'á','Ã©':'é','Ã¶':'ö','Ã¼':'ü','ÃŸ':'ß',
}
for path in files:
    if not path.exists():
        continue
    text = path.read_text(encoding='utf-8')
    for k,v in repl.items():
        text = text.replace(k,v)
    path.write_text(text, encoding='utf-8')
