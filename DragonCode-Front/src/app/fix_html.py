import sys
import re

path = 'c:/DragonCode Front/Prototipo-Aulas/DragonCode-Front/src/app/pantalla-principal/pantalla-principal.component.html'
with open(path, 'r', encoding='utf-8') as f:
    html = f.read()

# Try to find if PASO 2 is really updated
idx = html.find('PASO 2: Seleccionar Nivel (Sin Fases)')
if idx == -1:
    print('PASO 2 is still the old one!?')
else:
    print('PASO 2 IS updated in the file!')

# Remove Fases from right pane
pattern = r'@if\s*\(nivelSeleccionado\s*===\s*nivel\.id\)\s*\{\s*<div\s*style="background:rgba\(0,0,0,0\.4\).*?</div>\s*\}\s*</div>\s*\}'
html = re.sub(pattern, '', html, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(html)
