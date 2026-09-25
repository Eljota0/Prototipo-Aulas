import sys
import re

path = 'c:/DragonCode Front/Prototipo-Aulas/DragonCode-Front/src/app/layout-juego/layout-juego.component.html'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

injection = '''
    <aside class="game-controls" [attr.aria-hidden]="modoEdicion" [attr.inert]="modoEdicion ? '' : null">'''

replacement = '''
    <ng-content select="[slot=panel-editor]"></ng-content>

    <aside class="game-controls" [attr.aria-hidden]="modoEdicion" [attr.inert]="modoEdicion ? '' : null">'''

text = text.replace(injection, replacement)

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)
print("Updated layout-juego.component.html")
