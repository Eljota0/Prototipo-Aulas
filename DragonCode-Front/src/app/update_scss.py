import sys
import re

path_src = 'c:/DragonCode Front/Prototipo-Aulas/DragonCode-Front/src/app/nivel-ogro/nivel-ogro.component.scss'
path_dst = 'c:/DragonCode Front/Prototipo-Aulas/DragonCode-Front/src/app/nivel-dos-prototipo/nivel-dos-prototipo.component.scss'

with open(path_src, 'r', encoding='utf-8') as f:
    src_content = f.read()

start = src_content.find('.manual-overlay {')
end = src_content.find('.dev-toolbar {')
if end == -1: end = len(src_content)

scss_to_append = src_content[start:end]

# Also let's remove any trailing media queries if they belong to dev-toolbar, but dev-toolbar is what we cut at.
# We will just append this to the destination.
with open(path_dst, 'a', encoding='utf-8') as f:
    f.write('\n/* =========================================\n   MANUAL DEL PROGRAMADOR (LIBRO)\n   ========================================= */\n')
    f.write(scss_to_append)

print('SCSS appended')
