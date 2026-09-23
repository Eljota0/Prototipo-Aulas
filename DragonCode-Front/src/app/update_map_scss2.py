import sys
import re

path = 'c:/DragonCode Front/Prototipo-Aulas/DragonCode-Front/src/app/mapa-aventura/mapa-aventura.component.scss'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove opacity, transform, visibility, transition, and &.mostrar from .draco-consejo-widget
# We'll use regex to remove the block between `gap: 15px;` and `.avatar-caja {`
pattern_remove_from_widget = r'(gap:\s*15px;)\s*opacity:\s*0;.*?&\.mostrar\s*{.*?}\s*(\.avatar-caja\s*{)'
content = re.sub(pattern_remove_from_widget, r'\1\n\n  \2', content, flags=re.DOTALL)

# 2. Add the animation styles to .globo-texto
pattern_globo = r'(\.globo-texto\s*{.*?)(p\s*{)'

new_animation_styles = '''
    /* Animación suave */
    opacity: 0;
    transform: translateX(-15px) scale(0.95);
    transition: opacity 0.8s cubic-bezier(0.25, 1, 0.5, 1), transform 0.8s cubic-bezier(0.25, 1, 0.5, 1), visibility 0.8s;
    visibility: hidden;
    transform-origin: left center;

    &.mostrar {
      opacity: 1;
      transform: translateX(0) scale(1);
      visibility: visible;
    }

    '''

content = re.sub(pattern_globo, r'\1' + new_animation_styles + r'\2', content, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("SCSS updated")
