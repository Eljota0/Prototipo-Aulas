import re

with open('src/app/consola-codigo/consola-codigo.component.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("  encapsulation: ViewEncapsulation.None\n", "")
content = content.replace(",\n})", "\n})")

with open('src/app/consola-codigo/consola-codigo.component.ts', 'w', encoding='utf-8') as f:
    f.write(content)
