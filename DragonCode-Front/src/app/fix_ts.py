import sys
import re

path = 'c:/DragonCode Front/Prototipo-Aulas/DragonCode-Front/src/app/nivel-dos-prototipo/nivel-dos-prototipo.component.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# The injection put literal \n strings because I used raw string `\n` in python replace string!
# Let's fix that first.
content = content.replace('ayudaVisible = false;\\n', 'ayudaVisible = false;\n')

# The block was inserted in two places. Let's find them.
pattern = r'  // --- MANUAL DEL PROGRAMADOR ---.*?get puedeRetroceder\(\) \{\s*return this\.paginaActual > 0;\s*\}'
matches = list(re.finditer(pattern, content, flags=re.DOTALL))

if len(matches) == 2:
    # Remove the second one entirely
    content = content[:matches[1].start()] + content[matches[1].end():]
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Fixed duplicate block.')
else:
    print('Matches found:', len(matches))
