import sys

path = 'c:/DragonCode Front/Prototipo-Aulas/DragonCode-Front/src/app/mapa-aventura/mapa-aventura.component.html'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

widget_html = '''
<!-- WIDGET DE CONSEJOS PASIVOS (DRACO) -->
<div class="draco-consejo-widget" *ngIf="consejoActual" [class.mostrar]="mostrandoConsejo">
  <div class="avatar-caja">
    <img [src]="consejoActual.imagen" alt="Consejo Draco" class="draco-avatar">
  </div>
  <div class="globo-texto">
    <p>{{ consejoActual.texto }}</p>
  </div>
</div>
'''

if 'draco-consejo-widget' not in content:
    content = content.replace('<!-- CONTADOR DE ESTRELLAS FLOTANTE -->', widget_html + '\n<!-- CONTADOR DE ESTRELLAS FLOTANTE -->')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("HTML updated")
else:
    print("HTML already contains widget")
