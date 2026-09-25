import sys
import re

path_ts = 'c:/DragonCode Front/Prototipo-Aulas/DragonCode-Front/src/app/pantalla-principal/pantalla-principal.component.ts'
with open(path_ts, 'r', encoding='utf-8') as f:
    ts = f.read()

# 1. Update TS:
# Remove fases validation from siguientePaso2
old_siguiente2 = '''  siguientePaso2(): void {
    if (this.parametrosReto.fases_seleccionadas!.length === 0) {
      this.notificationService.show('Debes seleccionar al menos una fase.', 'error');
      return;
    }
    this.pasoCrearAula = 3;
  }'''
new_siguiente2 = '''  siguientePaso2(): void {
    this.pasoCrearAula = 3;
  }'''
ts = ts.replace(old_siguiente2, new_siguiente2)

# Create a new method: clickNivelDirecto
click_nivel_directo = '''  clickNivelDirecto(nivelId: number): void {
    this.nivelSeleccionado = nivelId;
    // Opcionalmente podemos resetear fases_seleccionadas
    this.parametrosReto.fases_seleccionadas = []; 
    
    if (nivelId === 1) {
      // Tiene editor: abre el modo avanzado
      this.abrirEditorAvanzado();
    } else {
      // No tiene editor manual
      this.notificationService.show('Este nivel no tiene editor de mapas. Se usará el recorrido por defecto.', 'info');
      this.siguientePaso2();
    }
  }'''
# Insert it after siguientePaso2
ts = ts.replace(new_siguiente2, new_siguiente2 + '\n\n' + click_nivel_directo)

with open(path_ts, 'w', encoding='utf-8') as f:
    f.write(ts)
print("TS Updated")

# 2. Update HTML:
path_html = 'c:/DragonCode Front/Prototipo-Aulas/DragonCode-Front/src/app/pantalla-principal/pantalla-principal.component.html'
with open(path_html, 'r', encoding='utf-8') as f:
    html = f.read()

# We need to replace the entire PASO 2 block.
# We can find it using regex from <!-- PASO 2: to <!-- PASO 3:
pattern = r'<!-- PASO 2:[^>]*>[\s\S]*?(?=<!-- PASO 3:)'

new_paso2 = '''<!-- PASO 2: Seleccionar Nivel (Sin Fases) -->
        @if (pasoCrearAula === 2) {
          <h2 class="cyber-modal-title">{{ mostrarAgregarActividad ? 'NUEVA ACTIVIDAD' : 'SELECCIONAR NIVEL' }}</h2>
          <p class="cyber-modal-message">
            @if (mostrarAgregarActividad && aulaParaActividad) {
              Se aadirá a ?o{{ aulaParaActividad.nombre_aula }}?? sin crear otra aula.
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

# Need to fix encoding issues in new_paso2 for Spanish chars.
new_paso2 = new_paso2.replace('aadirá', 'añadirá')

html = re.sub(pattern, new_paso2, html)

with open(path_html, 'w', encoding='utf-8') as f:
    f.write(html)
print("HTML Updated")
