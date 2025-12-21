from pathlib import Path
files = [Path('src/messages/en.json'), Path('src/messages/de.json'), Path('src/app/[locale]/pricing/page.tsx')]
repl = {
    'â€“':'–','â€”':'—','â€™':'’','â€˜':'‘','â€œ':'“','â€�':'”','Â·':'·',
    'ÃŸ':'ß','Ã¼':'ü','Ã¶':'ö','Ã¤':'ä','Ãœ':'Ü','Ã–':'Ö','Ã„':'Ä',
    'Ã¡':'á','Ã©':'é','Ãè':'è','Ãª':'ê','Ã³':'ó',
    'ÃƒÆ’Ã‚Â¼':'ü','ÃƒÆ’Ã‚Â¶':'ö','ÃƒÆ’Ã‚Â¤':'ä','ÃƒÆ’Ã‚ÂŸ':'ß','ÃƒÆ’Ã…â€œ':'Ü','ÃƒÆ’Ã…â€™':'Ö',
}
for path in files:
    if not path.exists():
        continue
    text = path.read_text(encoding='utf-8', errors='ignore')
    for k,v in repl.items():
        text = text.replace(k,v)
    path.write_text(text, encoding='utf-8')
