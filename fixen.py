from pathlib import Path
path=Path('src/messages/en.json')
text=path.read_text(encoding='utf-8')
repl={'â€“':'–','â€”':'—','Â·':'·','â€™':'’','â€œ':'“','â€�':'”','Ã¼':'ü','Ã¶':'ö','Ã¤':'ä'}
for k,v in repl.items():
    text = text.replace(k,v)
path.write_text(text,encoding='utf-8')