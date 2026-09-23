import sys

path = 'c:/DragonCode Front/Prototipo-Aulas/DragonCode-Front/src/app/nivel-dos-prototipo/nivel-dos-prototipo.component.html'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

start = content.find('<!-- MODAL: GRIMORIO DE AYUDA -->')
end = content.find('</div>', content.find('<section class="modal-resultado modal-ayuda">')) + 6

new_html = """<!-- MANUAL DEL PROGRAMADOR (LIBRO) -->
<div class="manual-overlay" *ngIf="ayudaVisible" (click)="cerrarManual()">
  <div class="libro-contenedor" (click)="$event.stopPropagation()">
    <button class="btn-cerrar" (click)="cerrarManual()">X</button>
    <button class="flecha flecha-izq" *ngIf="puedeRetroceder" (click)="anteriorPagina()">&#9664;</button>
    
    <div class="hojas-contenedor">
      <!-- Página Izquierda (o única en móvil) -->
      <div class="hoja">
        <div [ngSwitch]="paginaActual">
          <!-- PÁGINA 1: EL OBJETIVO -->
          <ng-container *ngSwitchCase="0">
            <h2 class="titulo-prototipo">El Objetivo</h2>
            <p class="texto-manual">Bienvenido al Nivel 2. Tu misión es controlar el Taladro a Vapor para extraer agua. A diferencia del ogro, esta máquina no obedece órdenes directas.</p>
            <p class="texto-manual">Debes programar bloques de código que se queden 'escuchando' los cambios en los sensores del taladro (como la temperatura o la presión).</p>
          </ng-container>

          <!-- PÁGINA 3 (Índice 2): Elixires Arcanos -->
          <ng-container *ngSwitchCase="2">
            <h2 class="titulo-prototipo">Bálsamo Vital</h2>
            <div class="manual-imagenes-centro">
              <img src="/assets/images/aventura/objetos/pocion-vida.png" alt="Vida" class="img-manual">
            </div>
            <h3 class="subtitulo-magico">Poción de Salud</h3>
            <p class="texto-manual">El motor de eventos no perdona errores lógicos. Si configuras mal una condición y la máquina falla, perderás un corazón de salud.</p>
            <p class="texto-manual">Bebe esta poción para restaurar tu vitalidad y volver a intentarlo.</p>
          </ng-container>

          <!-- PÁGINA 5 (Índice 4): La Maestría -->
          <ng-container *ngSwitchCase="4">
            <h2 class="titulo-prototipo">La Maestría</h2>
            <p class="texto-manual">Tu código será evaluado mediante las Estrellas de Maestría:</p>
            <div class="manual-lista-estrellas">
              <div class="item-estrella">
                <div class="icono-estrella-manual" style="font-size: 1.5rem; text-shadow: 1px 1px 0 #000, 0 0 10px rgba(255,215,0,0.8);">&#11088;</div>
                <p class="texto-manual"><strong>1. Victoria:</strong> Logra que el taladro cumpla su objetivo sin que la máquina explote.</p>
              </div>
              <div class="item-estrella">
                <div class="icono-estrella-manual" style="font-size: 1.5rem; text-shadow: 1px 1px 0 #000, 0 0 10px rgba(255,215,0,0.8);">&#11088;</div>
                <p class="texto-manual"><strong>2. Código Limpio:</strong> Supera el nivel manteniendo tus tres corazones de salud intactos (cero fallos).</p>
              </div>
            </div>
          </ng-container>

          <!-- PÁGINA 7 (Índice 6): Apéndice Pedagógico -->
          <ng-container *ngSwitchCase="6">
            <div class="apendice-tecnico">
              <h2 class="titulo-prototipo serio">Apéndice Pedagógico</h2>
              <p class="texto-manual"><strong>Nota del Desarrollador:</strong> Este nivel evoluciona del flujo de control secuencial hacia la Programación Orientada a Eventos (Event-Driven Programming).</p>
            </div>
          </ng-container>

          <!-- ====== COPIA DE IMPARES PARA MÓVIL ====== -->

          <!-- PÁGINA 2: LOS EVENTOS (Copia Móvil) -->
          <ng-container *ngSwitchCase="1">
            <h2 class="titulo-prototipo">Los Eventos</h2>
            <p class="texto-manual">Utiliza el bloque 'Control Temperatura' de tu inventario. Escribe dentro de él una condición lógica (if).</p>
            <p class="texto-manual">Por ejemplo: <code>si (taladro.temperatura > 100) {{ '{' }} taladro.liberarVapor(); {{ '}' }}</code></p>
            <p class="texto-manual mt-2">¡Asegúrate de que la sintaxis sea perfecta antes de ejecutar!</p>
          </ng-container>

          <!-- PÁGINA 4 (Índice 3): Vacía/Decorativa (Copia Móvil) -->
          <ng-container *ngSwitchCase="3">
            <div class="manual-imagenes-centro" style="margin-top: 50px; opacity: 0.1;">
              <img src="/assets/images/logo.png" alt="DragonCode Logo" style="width: 150px; filter: grayscale(100%);">
            </div>
          </ng-container>

          <!-- PÁGINA 6 (Índice 5): Las Estrellas (Copia Móvil) -->
          <ng-container *ngSwitchCase="5">
            <h2 class="titulo-prototipo">Las Estrellas</h2>
            <div class="manual-lista-estrellas mt-2">
              <div class="item-estrella">
                <div class="icono-estrella-manual" style="font-size: 1.5rem; text-shadow: 1px 1px 0 #000, 0 0 10px rgba(255,215,0,0.8);">&#11088;</div>
                <p class="texto-manual"><strong>3. Puro Talento:</strong> Supera el nivel sin utilizar ninguna Poción de Salud.</p>
              </div>
            </div>
          </ng-container>

          <!-- PÁGINA 8 (Índice 7): Apéndice Pt. 2 (Copia Móvil) -->
          <ng-container *ngSwitchCase="7">
            <div class="apendice-tecnico">
              <p class="texto-manual mt-2">Se introduce el concepto de 'Listeners' pasivos y el uso de la estructura de control condicional 'If/Else' aplicada al estado dinámico de un objeto (POO).</p>
            </div>
          </ng-container>
        </div>
      </div>

      <!-- Página Derecha (Solo Desktop) -->
      <div class="hoja hoja-derecha" *ngIf="!esMovil && paginaActual + 1 < totalPaginas">
        <div [ngSwitch]="paginaActual + 1">
          <!-- PÁGINA 2: LOS EVENTOS -->
          <ng-container *ngSwitchCase="1">
            <h2 class="titulo-prototipo">Los Eventos</h2>
            <p class="texto-manual">Utiliza el bloque 'Control Temperatura' de tu inventario. Escribe dentro de él una condición lógica (if).</p>
            <p class="texto-manual">Por ejemplo: <code>si (taladro.temperatura > 100) {{ '{' }} taladro.liberarVapor(); {{ '}' }}</code></p>
            <p class="texto-manual mt-2">¡Asegúrate de que la sintaxis sea perfecta antes de ejecutar!</p>
          </ng-container>
          
          <!-- PÁGINA 4 (Índice 3): Vacía/Decorativa -->
          <ng-container *ngSwitchCase="3">
            <div class="manual-imagenes-centro" style="margin-top: 50px; opacity: 0.1;">
              <img src="/assets/images/logo.png" alt="DragonCode Logo" style="width: 150px; filter: grayscale(100%);">
            </div>
          </ng-container>

          <!-- PÁGINA 6 (Índice 5): Las Estrellas -->
          <ng-container *ngSwitchCase="5">
            <h2 class="titulo-prototipo">Las Estrellas</h2>
            <div class="manual-lista-estrellas mt-2">
              <div class="item-estrella">
                <div class="icono-estrella-manual" style="font-size: 1.5rem; text-shadow: 1px 1px 0 #000, 0 0 10px rgba(255,215,0,0.8);">&#11088;</div>
                <p class="texto-manual"><strong>3. Puro Talento:</strong> Supera el nivel sin utilizar ninguna Poción de Salud.</p>
              </div>
            </div>
          </ng-container>

          <!-- PÁGINA 8 (Índice 7): Apéndice Pt. 2 -->
          <ng-container *ngSwitchCase="7">
            <div class="apendice-tecnico">
              <p class="texto-manual mt-2">Se introduce el concepto de 'Listeners' pasivos y el uso de la estructura de control condicional 'If/Else' aplicada al estado dinámico de un objeto (POO).</p>
            </div>
          </ng-container>
        </div>
      </div>
    </div>

    <!-- Botón Siguiente -->
    <button class="flecha flecha-der" *ngIf="puedeAvanzar" (click)="siguientePagina()">&#9654;</button>
  </div>
</div>
"""

content = content[:start] + new_html + content[end:]
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('HTML replaced')
