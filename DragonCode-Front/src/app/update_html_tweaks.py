import sys

path = 'c:/DragonCode Front/Prototipo-Aulas/DragonCode-Front/src/app/pantalla-principal/pantalla-principal.component.html'
with open(path, 'r', encoding='utf-8') as f:
    html = f.read()

# Increase modal width
html = html.replace('max-width: 1000px !important;', 'max-width: 1250px !important;')

old_button = '''<div style="display: flex; gap: 10px; margin-top: 10px; justify-content: center;">
            <button type="button" class="cyber-glow-btn glow-red" style="padding: 10px 40px;" (click)="volverDesdeSeleccionNivel()">'''

new_button = '''<div style="display: flex; width: 100%; margin-top: auto; padding-top: 20px;">
            <button type="button" class="cyber-glow-btn glow-red" style="width: 100%; padding: 15px; font-size: 1.1rem; letter-spacing: 2px;" (click)="volverDesdeSeleccionNivel()">'''

html = html.replace(old_button, new_button)

with open(path, 'w', encoding='utf-8') as f:
    f.write(html)
print('HTML updated successfully')
