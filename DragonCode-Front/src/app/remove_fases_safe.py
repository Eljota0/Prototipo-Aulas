import sys

path = 'c:/DragonCode Front/Prototipo-Aulas/DragonCode-Front/src/app/pantalla-principal/pantalla-principal.component.html'
with open(path, 'r', encoding='utf-8') as f:
    html = f.read()

target = '''                        @if (nivelSeleccionado === nivel.id) {
                          <div style="background:rgba(0,0,0,0.4); padding:10px; border-radius:4px; margin-bottom:8px; border:1px solid rgba(130,244,224,0.2);">
                            <span style="color:#82F4E0; font-family: 'TuFuentePixel', monospace; font-size: 0.75rem;">Fases a impartir:</span>
                            <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:6px;">
                              @for (fase of fasesDisponiblesNivel; track fase) {
                                <div (click)="toggleFase(fase)"
                                     [class]="parametrosReto.fases_seleccionadas?.includes(fase) ? 'cyber-glow-btn' : 'cyber-glow-btn'"
                                     style="padding: 4px 8px; font-size: 0.7rem; flex: 1; text-align: center; border-width: 1.5px; cursor: pointer;"
                                     [style.background-color]="parametrosReto.fases_seleccionadas?.includes(fase) ? '' : 'rgba(255,255,255,0.05)'"
                                     [style.border-color]="parametrosReto.fases_seleccionadas?.includes(fase) ? '' : '#444'"
                                     [style.color]="parametrosReto.fases_seleccionadas?.includes(fase) ? '' : '#888'"
                                     [style.box-shadow]="parametrosReto.fases_seleccionadas?.includes(fase) ? '' : 'inset 0 2px 8px rgba(0,0,0,0.8)'">
                                  FASE {{fase}}
                                </div>
                              }
                            </div>
                          </div>
                        }'''

if target in html:
    html = html.replace(target, '')
    with open(path, 'w', encoding='utf-8') as f:
        f.write(html)
    print('Fases correctly removed from right pane')
else:
    print('Target not found exactly, could not remove Fases from right pane safely.')
