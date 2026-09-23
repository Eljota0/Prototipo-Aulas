import sys
import re

path = 'c:/DragonCode Front/Prototipo-Aulas/DragonCode-Front/src/app/mapa-aventura/mapa-aventura.component.ts'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# Fix the syntax error: `}\n    },\n    { texto: "Sabias que la primera` -> `},\n    { texto: "Sabias que la primera`
text = re.sub(r'\}\s*\}\s*,\s*\{\s*texto:\s*"Sabias que la primera', r'},\n    { texto: "Sabias que la primera', text)

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)
print("Syntax error fixed")
