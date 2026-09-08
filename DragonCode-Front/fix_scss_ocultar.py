import re

with open('src/app/consola-codigo/consola-codigo.component.scss', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = '''.ocultar-texto {
  color: transparent !important;
  caret-color: white !important;
  background: transparent !important;
}'''

content = re.sub(r'\.ocultar-texto\s*\{[^}]*\}', replacement, content)

with open('src/app/consola-codigo/consola-codigo.component.scss', 'w', encoding='utf-8') as f:
    f.write(content)
