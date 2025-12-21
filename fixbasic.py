from pathlib import Path
path = Path('src/messages/de.json')
text = path.read_text(encoding='utf-8')
repl = {"Ã¼":"ü","Ãœ":"Ü","Ã¶":"ö","Ã–":"Ö","Ã¤":"ä","Ã„":"Ä","ÃŸ":"ß","â€“":"–","â€”":"—","Â·":"·","Ã¡":"á","Ã©":"é","Ã¨":"è","Ã²":"ò","Ã±":"ñ"}
for k,v in repl.items():
    text = text.replace(k,v)
path.write_text(text, encoding='utf-8')