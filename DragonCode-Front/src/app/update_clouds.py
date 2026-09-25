import sys
import re

path_html = 'c:/DragonCode Front/Prototipo-Aulas/DragonCode-Front/src/app/pantalla-principal/pantalla-principal.component.html'
with open(path_html, 'r', encoding='utf-8') as f:
    html = f.read()

old_before = '''          .quest-board-modal::before {
            content: '';
            position: absolute; top: 0; left: 0; right: 0; bottom: 0;
            background: url('assets/images/ui/fondoventanas.png');
            background-size: 300px;
            opacity: 0.15;
            animation: magicalScroll 60s linear infinite;
            pointer-events: none;
            z-index: 0;
          }'''

new_before = '''          .quest-board-modal::before {
            content: '';
            position: absolute; top: 0; left: 0; right: 0; bottom: 0;
            background: url('assets/images/ui/fondonubes.png');
            background-size: 400px; /* Un poco mas grande para apreciar las nubes */
            image-rendering: pixelated; /* Retro puro */
            opacity: 0.15;
            animation: cloudScrollLeft 90s linear infinite; /* Mas lento, a la izquierda */
            pointer-events: none;
            z-index: 0;
          }'''

old_keyframe = '''@keyframes magicalScroll { from { background-position: 0 0; } to { background-position: -400px -400px; } }'''
new_keyframe = '''@keyframes cloudScrollLeft { from { background-position: 0 0; } to { background-position: -800px 0; } }'''

html = html.replace(old_before, new_before)
html = html.replace(old_keyframe, new_keyframe)

with open(path_html, 'w', encoding='utf-8') as f:
    f.write(html)
print("Background replaced")
