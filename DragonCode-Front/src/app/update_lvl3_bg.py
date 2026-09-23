import sys
import re

path = 'c:/DragonCode Front/Prototipo-Aulas/DragonCode-Front/src/app/nivel-tres-prototipo/nivel-tres-prototipo.component.scss'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace :host
host_pattern = r':host\s*\{\s*display:\s*block;\s*\}'
new_host = ''':host {
  display: block;

  /* ==================================================
     PANEL DE CONTROL DEL FONDO (NIVEL 3)
     ================================================== */
  /* Controla qué tan oscura se ve la imagen de fondo. 
     0.0 es nada extra, 1.0 es negro total. */
  --fondo-n3-oscuridad-extra: rgba(0, 0, 0, 0.4); 
  
  /* Controla el tamaño (escala) de la imagen. 
     Puedes usar 'cover', 'contain', '100%', '150%', etc. */
  --fondo-n3-escala: cover; 
  
  /* Controla la posición de la imagen de fondo */
  --fondo-n3-posicion: center; 
}'''
content = re.sub(host_pattern, new_host, content)

# Replace .escena-magia background
escena_pattern = r'(\.escena-magia\s*\{.*?background:\s*)(.*?)(;\s*image-rendering: pixelated;\s*\})'

new_bg = '''/* 1. Efecto túnel horizontal (bordes oscuros) */
    linear-gradient(90deg, rgba(0, 0, 0, .82) 0 5%, transparent 17% 83%, rgba(0, 0, 0, .82) 95% 100%),
    /* 2. Efecto sombreado vertical (más oscuro abajo) */
    linear-gradient(180deg, rgba(10, 2, 21, .04), rgba(2, 1, 4, .58) 94%),
    /* 3. Oscuridad global ajustable */
    linear-gradient(var(--fondo-n3-oscuridad-extra), var(--fondo-n3-oscuridad-extra)),
    /* 4. Nueva imagen del Nivel 3 */
    url('/assets/images/aventura/nivel3/fondo-nivel-3.png') var(--fondo-n3-posicion) / var(--fondo-n3-escala) no-repeat'''

content = re.sub(escena_pattern, lambda m: m.group(1) + new_bg + m.group(3), content, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("SCSS updated with control panel")
