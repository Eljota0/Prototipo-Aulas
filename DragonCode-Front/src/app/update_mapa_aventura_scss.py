import sys

path = 'c:/DragonCode Front/Prototipo-Aulas/DragonCode-Front/src/app/mapa-aventura/mapa-aventura.component.scss'
with open(path, 'r', encoding='utf-8') as f:
    scss = f.read()

new_css = '''
/* ================================================================
   TOOLTIP STATUS TEXT COLORS
================================================================ */
.level-status {
  font-family: 'TuFuentePixel', monospace;
  font-size: 0.8rem;
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.status-locked {
  color: #ff6b6b; /* Redish for locked */
}

.status-completed {
  color: #f1c40f; /* Gold for completed */
}

.status-available {
  color: #82F4E0; /* Cyan for available */
}
'''

if '.level-status' not in scss:
    scss += new_css
    with open(path, 'w', encoding='utf-8') as f:
        f.write(scss)
    print('SCSS appended for tooltip status')
else:
    print('SCSS already contains level-status styles')
