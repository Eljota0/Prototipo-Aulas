import sys

path = 'c:/DragonCode Front/Prototipo-Aulas/DragonCode-Front/src/app/mapa-aventura/mapa-aventura.component.html'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_html = '''<!-- WIDGET DE CONSEJOS PASIVOS (DRACO) -->
<div class="draco-consejo-widget" *ngIf="consejoActual" [class.mostrar]="mostrandoConsejo">
  <div class="avatar-caja">
    <img [src]="consejoActual.imagen" alt="Consejo Draco" class="draco-avatar">
  </div>
  <div class="globo-texto">
    <p>{{ consejoActual.texto }}</p>
  </div>
</div>'''

new_html = '''<!-- WIDGET DE CONSEJOS PASIVOS (DRACO) -->
<div class="draco-consejo-widget">
  <div class="avatar-caja">
    <img [src]="consejoActual?.imagen || 'assets/images/exprecionsedraco/base.png'" alt="Draco Mascot" class="draco-avatar">
  </div>
  <div class="globo-texto" [class.mostrar]="mostrandoConsejo">
    <p *ngIf="consejoActual">{{ consejoActual.texto }}</p>
  </div>
</div>'''

if old_html in content:
    content = content.replace(old_html, new_html)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("HTML updated")
else:
    print("Old HTML not found. Check exact formatting.")
