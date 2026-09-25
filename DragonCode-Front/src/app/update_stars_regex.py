import sys
import re

path = 'c:/DragonCode Front/Prototipo-Aulas/DragonCode-Front/src/app/pantalla-principal/pantalla-principal.component.html'
with open(path, 'r', encoding='utf-8') as f:
    html = f.read()

pattern = r'<div class="stars-modal-header">.*?</ul>\s*</div>\s*</div>\s*</div>\s*\}'

new_html = '''<div class="stars-modal-header" style="border-bottom: 1px solid rgba(255, 215, 0, 0.3); padding-bottom: 15px; margin-bottom: 20px;">
          <div style="display:flex; flex-direction:column;">
            <h2 class="stars-modal-title" style="margin-bottom: 6px;">Códice de Estrellas</h2>
            <p style="color:#a3bac2; font-family:'TuFuentePixel',monospace; font-size:0.85rem; margin:0; text-transform:none; letter-spacing:0;">Registro de tus hazañas y cómo perfeccionarlas.</p>
          </div>
          <button class="stars-close-btn" (click)="closeStarsModal()" style="align-self: flex-start; background:none; border:none; color:#FFD700; font-size:1.5rem; cursor:pointer;">✕</button>
        </div>
        
        <div class="stars-modal-content" style="padding-right: 10px;">
          
          <!-- Leyenda Global -->
          <div style="margin-bottom: 25px; padding: 15px; background: rgba(255, 215, 0, 0.05); border: 1px dashed rgba(255, 215, 0, 0.4); border-radius: 8px;">
            <h3 style="color:#FFD700; font-family:'TuFuentePixel',monospace; font-size:0.95rem; margin: 0 0 10px 0; letter-spacing: 1px; text-shadow: 1px 1px 0 #000;">Guía General de Estrellas</h3>
            <ul style="color:#a3bac2; font-family:'TuFuentePixel',monospace; font-size:0.8rem; padding-left: 20px; margin-bottom: 0; line-height: 1.6;">
              <li><span style="color:#FFD700; text-shadow: 1px 1px 0 #000;">★ Estrella 1:</span> Superar el nivel y cumplir el objetivo principal.</li>
              <li><span style="color:#FFD700; text-shadow: 1px 1px 0 #000;">★ Estrella 2:</span> Completar el nivel sin solicitar pistas ni objetos de ayuda.</li>
            </ul>
          </div>

          <div class="worlds-list" style="display: flex; flex-direction: column; gap: 16px;">
            @for (world of worldsProgress; track world.level) {
              <div class="world-progress-card" style="background: rgba(0,0,0,0.6); border: 1px solid #333; border-radius: 8px; padding: 18px; position: relative; box-shadow: inset 0 0 10px rgba(0,0,0,0.8);">
                
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                  <div>
                    <span style="color:#82F4E0; font-family:'TuFuentePixel',monospace; font-size:0.7rem; text-transform:uppercase; letter-spacing:1px;">Nivel 0{{world.level}} — {{world.tema}}</span>
                    <h3 style="color:#fff; font-family:'TuFuentePixel',monospace; font-size:1.2rem; margin: 4px 0 0 0; text-shadow: 1px 1px 0 #000;">{{world.name}}</h3>
                  </div>
                  
                  <div class="world-stars" style="display:flex; gap:6px; font-size: 1.4rem;">
                    @for (s of [1,2,3]; track $index) {
                      <span [style.color]="world.stars >= s ? '#FFD700' : '#444'" style="text-shadow: 1px 1px 0 #000;">★</span>
                    }
                  </div>
                </div>
                
                <p style="color:#a3bac2; font-family:'TuFuentePixel',monospace; font-size:0.85rem; line-height:1.5; margin: 0 0 16px 0;">{{world.descripcion}}</p>
                
                <div style="background: rgba(217, 70, 239, 0.08); border-left: 3px solid #d946ef; padding: 12px; border-radius: 0 4px 4px 0;">
                  <span style="display:block; color:#d946ef; font-family:'TuFuentePixel',monospace; font-size:0.75rem; margin-bottom: 6px; letter-spacing: 1px;">RETO PARA LA 3ra ESTRELLA:</span>
                  <span style="color:#fff; font-family:'TuFuentePixel',monospace; font-size:0.85rem;">{{world.reglaEstrella3}}</span>
                </div>

              </div>
            }
          </div>

        </div>
      </div>
    </div>
  }'''

if re.search(pattern, html, re.DOTALL):
    html = re.sub(pattern, new_html, html, flags=re.DOTALL)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(html)
    print('HTML successfully updated via regex')
else:
    print('Pattern not found')
