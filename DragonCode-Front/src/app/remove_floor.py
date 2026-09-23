import sys
import re

path = 'c:/DragonCode Front/Prototipo-Aulas/DragonCode-Front/src/app/nivel-tres-prototipo/nivel-tres-prototipo.component.scss'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Match .campo-batalla::after { ... }
pattern = r'\.campo-batalla::after\s*\{[^}]*\}'
content = re.sub(pattern, '', content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed .campo-batalla::after")
