import sys
import re

path = 'c:/DragonCode Front/Prototipo-Aulas/DragonCode-Front/src/app/pantalla-principal/pantalla-principal.component.scss'
with open(path, 'r', encoding='utf-8') as f:
    scss = f.read()

# margin of the grid
scss = re.sub(r'\.level-selection-grid\s*\{[^}]*margin:\s*20px\s*0;', 
              lambda m: m.group(0).replace('margin: 20px 0;', 'margin: 50px 0 40px 0;'), scss)

# gap of grid
scss = re.sub(r'\.level-selection-grid\s*\{[^}]*gap:\s*16px;', 
              lambda m: m.group(0).replace('gap: 16px;', 'gap: 24px;'), scss)

# font sizes
scss = scss.replace('.level-card-header {\n  display: flex;', '.level-card-header {\n  font-size: 0.75rem;\n  display: flex;')
scss = scss.replace("font-size: 0.65rem;\n  color: #a3bac2;", "color: #a3bac2;") # remove the old font-size

scss = scss.replace('.level-card-topic {\n  font-family:', '.level-card-topic {\n  font-size: 0.75rem;\n  font-family:')
scss = scss.replace("font-size: 0.65rem;\n  color: #82F4E0;", "color: #82F4E0;")

scss = scss.replace('.level-card-title {\n  font-family:', '.level-card-title {\n  font-size: 1.25rem;\n  font-family:')
scss = scss.replace("font-size: 0.95rem;\n  color: #fff;", "color: #fff;")

scss = scss.replace('.level-card-desc {\n  font-family:', '.level-card-desc {\n  font-size: 0.85rem;\n  font-family:')
scss = scss.replace("font-size: 0.75rem;\n  color: #a3bac2;", "color: #a3bac2;")

scss = scss.replace('.level-card-number-box span {\n  font-family:', '.level-card-number-box span {\n  font-size: 3rem;\n  font-family:')
scss = scss.replace("font-size: 2.5rem;\n  color: #82F4E0;", "color: #82F4E0;")

scss = scss.replace('font-size: 0.7rem;', 'font-size: 0.8rem;') # footer font size

with open(path, 'w', encoding='utf-8') as f:
    f.write(scss)
print('SCSS tweaked')
