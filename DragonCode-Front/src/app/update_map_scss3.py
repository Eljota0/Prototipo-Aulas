import sys

path = 'c:/DragonCode Front/Prototipo-Aulas/DragonCode-Front/src/app/mapa-aventura/mapa-aventura.component.scss'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Update sizes
content = content.replace('width: 90px; /* Escalado', 'width: 105px; /* Escalado')
content = content.replace('width: 60px;', 'width: 70px;')

tunnel_css = '''
/* =========================================
   EFECTO TUNEL (BORDES LATERALES)
   ========================================= */
@media (min-width: 1024px) {
  .adventure-map {
    box-shadow: inset 150px 0 150px -50px #17121E, inset -150px 0 150px -50px #17121E;
  }
}
'''

if 'EFECTO TUNEL' not in content:
    content += '\n' + tunnel_css

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("SCSS updated for sizes and tunnel effect")
