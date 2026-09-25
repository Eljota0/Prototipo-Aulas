import sys

path = 'c:/DragonCode Front/Prototipo-Aulas/DragonCode-Front/src/app/pantalla-principal/pantalla-principal.component.html'
with open(path, 'r', encoding='utf-8') as f:
    html = f.read()

start = html.find('<!-- PASO 2:')
end = html.find('<!-- PASO 3:')

new_paso2 = '''<!-- PASO 2: Seleccionar Nivel (Sin Fases) -->
        @if (pasoCrearAula === 2) {
          <h2 class="cyber-modal-title">{{ mostrarAgregarActividad ? 'NUEVA ACTIVIDAD' : 'SELECCIONAR NIVEL' }}</h2>
          <p class="cyber-modal-message">
            @if (mostrarAgregarActividad && aulaParaActividad) {
              Se añadirá a «{{ aulaParaActividad.nombre_aula }}» sin crear otra aula ni cambiar su código.
            } @else {
              Elige el nivel que tus estudiantes deberán superar.
            }
          </p>
          
          <div style="margin: 20px 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; width: 100%;">
            @for (nivel of nivelesDisponibles; track nivel.id) {
              <button type="button" class="activity-level-option"
                   (click)="clickNivelDirecto(nivel.id)"
                   style="aspect-ratio: 1; padding:16px; border-radius:12px; cursor:pointer; transition:all 0.2s; border: 2px solid #222; background-color: #05070a; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: inset 0 0 10px rgba(0,0,0,0.9);">
                <span style="font-family:'TuFuentePixel',monospace; font-size:3rem; color:#888; margin-bottom: 8px;">{{ nivel.id }}</span>
                <p style="margin:0; font-family:'TuFuentePixel',monospace; font-size:1.1rem; text-shadow:1px 1px 0 #000; letter-spacing:1px; color: #d946ef; text-align: center;">{{ nivel.nombre }}</p>
                <p style="margin:8px 0 0; font-family:'TuFuentePixel',monospace; font-size:0.75rem; color:#a3bac2; text-align: center; line-height: 1.2;">{{ nivel.descripcion }}</p>
              </button>
            }
          </div>

          <div style="display: flex; gap: 10px; margin-top: 10px;">
            <button type="button" class="cyber-glow-btn glow-red" style="flex: 1;" (click)="volverDesdeSeleccionNivel()">
              ← ATRÁS
            </button>
          </div>
        }
        
        '''

html = html[:start] + new_paso2 + html[end:]

with open(path, 'w', encoding='utf-8') as f:
    f.write(html)
print('Paso 2 updated exactly')
