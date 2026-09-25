import sys

path = 'c:/DragonCode Front/Prototipo-Aulas/DragonCode-Front/src/app/pantalla-principal/pantalla-principal.component.html'
with open(path, 'r', encoding='utf-8') as f:
    html = f.read()

start = html.find('<!-- PASO 2:')
end = html.find('<!-- PASO 3:')

new_paso2 = '''<!-- PASO 2: Seleccionar Nivel (Diseño Aventura) -->
        @if (pasoCrearAula === 2) {
          <h2 class="cyber-modal-title">{{ mostrarAgregarActividad ? 'NUEVA ACTIVIDAD' : 'SELECCIONAR NIVEL' }}</h2>
          <p class="cyber-modal-message" style="text-align: center;">
            @if (mostrarAgregarActividad && aulaParaActividad) {
              Se añadirá a «{{ aulaParaActividad.nombre_aula }}» sin crear otra aula ni cambiar su código.
            } @else {
              Elige el nivel que tus estudiantes deberán superar.
            }
          </p>
          
          <div class="level-selection-grid">
            @for (nivel of nivelesDisponibles; track nivel.id) {
              <button type="button" class="level-selection-card"
                   [class.selected]="nivelSeleccionado === nivel.id"
                   (click)="clickNivelDirecto(nivel.id)">
                
                <div class="level-card-header">
                  <span>NIVEL 0{{ nivel.id }}</span>
                  <span></span>
                </div>
                
                <div class="level-card-number-box">
                  <span>{{ nivel.id }}</span>
                </div>
                
                <div class="level-card-topic">
                  <span>{{ nivel.tema }}</span>
                </div>
                
                <h3 class="level-card-title">{{ nivel.titulo }}</h3>
                <p class="level-card-desc">{{ nivel.descripcion }}</p>
                
                <div class="level-card-footer">
                  <span class="level-card-status">DISPONIBLE</span>
                  <span class="level-card-action">CREAR -></span>
                </div>

              </button>
            }
          </div>

          <div style="display: flex; gap: 10px; margin-top: 10px; justify-content: center;">
            <button type="button" class="cyber-glow-btn glow-red" style="padding: 10px 40px;" (click)="volverDesdeSeleccionNivel()">
              ← ATRÁS
            </button>
          </div>
        }
        
        '''

html = html[:start] + new_paso2 + html[end:]

with open(path, 'w', encoding='utf-8') as f:
    f.write(html)
print('Paso 2 updated to adventure style')
