import { Component, Input, Output, EventEmitter, ViewChildren, QueryList, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Instruccion } from '../layout-juego/layout-juego.component';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-consola-codigo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './consola-codigo.component.html',
  styleUrl: './consola-codigo.component.scss'
})
export class ConsolaCodigoComponent {

  @Output() onDeshacerPaso = new EventEmitter<string>();
  
  historialPlantilla: string[] = [];

  guardarEstadoPlantilla(estadoActual: string): void {
    this.historialPlantilla.push(estadoActual);
  }

  deshacerPasoAndamiaje(event?: Event): void {
    if (event) event.stopPropagation();
    if (this.historialPlantilla.length > 0) {
      const estadoAnterior = this.historialPlantilla.pop();
      if (estadoAnterior !== undefined) {
        this.onDeshacerPaso.emit(estadoAnterior);
      }
    }
  }

  public parsearSintaxis(texto: string, lineaIndex: number): string {
    if (!texto) return '';

    if (!this.modoPlantilla) {
      return texto;
    }

    // El texto puede venir de tarjetas configurables. Se escapa antes de agregar
    // las etiquetas del resaltado para que nunca se interprete como HTML activo.
    let html = texto
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // 2. Comentarios (Gris itálica)
    html = html.replace(/(\/\/.*)/g, '<span class="syntax-comment">$1</span>');

    // 3. Palabras clave (Magenta)
    html = html.replace(/\b(evento|mientras|si|sino|verdadero|falso)\b/g, '<span class="syntax-keyword">$1</span>');

    // 4. Objeto principal (Rojo/Naranja)
    html = html.replace(/\b(taladro|fabrica)\b/g, '<span class="syntax-object">$1</span>');

    // 5. Métodos/Funciones (Azul claro)
    html = html.replace(/\.(sobrecalentamiento|liberarVapor|apagarMotor|extraerCarbon|estabilizarPresion|mantenerFuerza|aumentarFuerza|recolectarAgua|detenerse|lanzarGasolina|guardar|destruir|quemar)/g, '.<span class="syntax-method">$1</span>');

    // 6. Propiedades (Celeste)
    html = html.replace(/\.(temperatura|pesoCarga|carbon|presion|profundidad|extraerAgua|nuevoMaterial|tieneMateriales|materialActual)/g, '.<span class="syntax-property">$1</span>');

    // 7. Números (Dorado)
    html = html.replace(/\b([0-9]+)\b/g, '<span class="syntax-number">$1</span>');

    // 7.5. Booleanos (Naranja/Dorado distintivo)
    html = html.replace(/\b(true|false)\b/g, '<span class="syntax-boolean">$1</span>');

    // 8. Operadores (Cian)
    html = html.replace(/(&lt;|&gt;|==|!=)/g, '<span class="syntax-operator">$1</span>');

    // 9. Lógica Dinámica de Placeholders (▯)
    const hayPlaceholderAntes = this.lineas.slice(0, lineaIndex).some(l => l.texto.includes('▯'));
    let primerEncontrado = hayPlaceholderAntes;
    
    html = html.replace(/▯/g, () => {
      if (!primerEncontrado) {
        primerEncontrado = true;
        return '<span class="placeholder-parpadeo">▯</span>';
      }
      // Resto de placeholders: Gris oscuro
      return '<span class="placeholder-inactivo">▯</span>';
    });

    return html;
  }

  private notificationService = inject(NotificationService);

  @Input() lineas: Instruccion[] = [];
  @Input() ejecutando: boolean = false;
  @Input() antiCopiaActivo: boolean = false;
  
  @Input() modoPlantilla: boolean = false;
  @Input() listoParaEjecutar: boolean = false;

  @Output() lineaBorrada = new EventEmitter<number>();
  @Output() onEjecutar = new EventEmitter<void>();
  @Output() onBorrarLinea = new EventEmitter<void>();
  @Output() onLimpiar = new EventEmitter<void>();

  @ViewChildren('lineaInput') inputs!: QueryList<ElementRef>;

  // Diccionario de colores para actualización dinámica
  private mapaColores: { [key: string]: string } = {
    'ogro.caminarArriba()': '#569CD6',
    'ogro.caminarAbajo()': '#6A9955',
    'ogro.caminarIzquierda()': '#CE9178',
    'ogro.caminarDerecha()': '#C586C0'
  };

  private timeouts: { [key: number]: any } = {};

  lineaActivaIndex: number = 0;

  // === POCIÓN DE CLARIVIDENCIA ===
  @Input() nivelActual: number = 1;

  solucionesMagicas: { [nivel: number]: string[] } = {
    1: [
      'ogro.caminarAbajo()',
      'ogro.caminarAbajo()',
      'ogro.caminarAbajo()'
    ],
    2: [
      'ogro.caminarIzquierda()',
      'ogro.caminarIzquierda()',
      'ogro.caminarAbajo()',
      'ogro.caminarAbajo()',
      'ogro.caminarIzquierda()',
      'ogro.caminarDerecha()',
      'ogro.caminarAbajo()',
      'ogro.caminarAbajo()'
    ],
    3: [
      'ogro.caminarArriba()',
      'ogro.caminarDerecha()',
      'ogro.caminarDerecha()',
      'ogro.caminarAbajo()',
      'ogro.caminarAbajo()',
      'ogro.caminarAbajo()',
      'ogro.caminarIzquierda()',
      'ogro.caminarAbajo()',
      'ogro.caminarIzquierda()',
      'ogro.caminarIzquierda()',
      'ogro.caminarArriba()',
      'ogro.caminarAbajo()',
      'ogro.caminarDerecha()',
      'ogro.caminarAbajo()'
    ],
    4: [
      'ogro.caminarDerecha()',
      'ogro.caminarDerecha()',
      'ogro.caminarDerecha()',
      'ogro.caminarAbajo()',
      'ogro.caminarAbajo()',
      'ogro.caminarDerecha()',
      'ogro.caminarDerecha()',
      'ogro.caminarAbajo()',
      'ogro.caminarAbajo()',
      'ogro.caminarIzquierda()',
      'ogro.caminarIzquierda()',
      'ogro.caminarIzquierda()',
      'ogro.caminarIzquierda()',
      'ogro.caminarArriba()',
      'ogro.caminarIzquierda()',
      'ogro.caminarArriba()',
      'ogro.caminarDerecha()',
      'ogro.caminarDerecha()',
      'ogro.caminarArriba()',
      'ogro.caminarArriba()',
      'ogro.caminarArriba()',
      'ogro.caminarDerecha()',
      'ogro.caminarDerecha()',
      'ogro.caminarDerecha()',
      'ogro.caminarDerecha()',
      'ogro.caminarAbajo()',
      'ogro.caminarAbajo()',
      'ogro.caminarDerecha()',
      'ogro.caminarAbajo()',
      'ogro.caminarAbajo()',
      'ogro.caminarAbajo()'
    ]
  };

  pocionActiva = false;
  overlayDorado = false;
  ojoAnimado = false;
  pocionTimeout: any;
  fadeTimeout: any;

  // === FOCUS / BLUR PARA PLACEHOLDERS ===
  onLineaFocus(linea: Instruccion): void {
    if (this.modoPlantilla && linea.esPlaceholder && linea.texto.includes('// Inserta tu código aquí')) {
      linea.texto = '';
    }
  }

  onLineaBlur(linea: Instruccion): void {
    if (this.modoPlantilla && linea.esPlaceholder && linea.texto.trim() === '') {
      linea.texto = '    // Inserta tu código aquí';
    }
  }

  usarPocionClarividencia() {
    this.pocionActiva = true;
    this.detonarDestello();

    if (this.pocionTimeout) clearTimeout(this.pocionTimeout);
    this.pocionTimeout = setTimeout(() => {
      this.pocionActiva = false;
    }, 20000);
  }

  detonarDestello() {
    this.overlayDorado = true;
    
    // Feedback visual del ojo
    this.ojoAnimado = true;
    setTimeout(() => this.ojoAnimado = false, 300);

    if (this.fadeTimeout) clearTimeout(this.fadeTimeout);
    this.fadeTimeout = setTimeout(() => {
      this.overlayDorado = false;
    }, 2500);
  }

  enfocarUltimoInput() {
    if (this.inputs && this.inputs.length > 0) {
      this.inputs.last.nativeElement.focus();
    }
  }

  // Insertar código directamente desde las tarjetas, contextualmente en la línea activa
  insertarDesdeTarjeta(tarjeta: { nombre: string; colorBoton: string; colorConsola: string; accion: string }) {
    if (this.modoPlantilla) {
      // Si hay un placeholder visible, lo reemplazamos
      const placeholderIdx = this.lineas.findIndex(l => l.esPlaceholder && (l.texto.trim() === '' || l.texto.includes('// Inserta tu código aquí')));
      if (placeholderIdx !== -1) {
        this.lineas[placeholderIdx] = { texto: '    ' + tarjeta.accion, color: tarjeta.colorConsola, tieneError: false };
        this.lineaActivaIndex = placeholderIdx;
      } else {
        // Buscar el último '}' fijo o insertamos al final
        const indexCierre = this.lineas.findIndex(l => l.texto.trim() === '}' && l.fija);
        const insertIdx = indexCierre !== -1 ? indexCierre : this.lineas.length;
        this.lineas.splice(insertIdx, 0, { texto: '    ' + tarjeta.accion, color: tarjeta.colorConsola, tieneError: false });
        this.lineaActivaIndex = insertIdx;
      }
      return;
    }

    // Comportamiento por defecto (Libre Nivel 1)
    if (this.lineaActivaIndex >= this.lineas.length || this.lineaActivaIndex < 0) {
      this.lineaActivaIndex = Math.max(0, this.lineas.length - 1);
    }

    if (this.lineas[this.lineaActivaIndex]) {
      const textoActivo = this.lineas[this.lineaActivaIndex].texto.trim();
      if (textoActivo === '' || textoActivo.startsWith('//')) {
        // Reemplaza si la línea está vacía o es un comentario (ej. Nivel 2 pre-fill)
        this.lineas[this.lineaActivaIndex] = { texto: '  ' + tarjeta.accion, color: tarjeta.colorConsola, tieneError: false };
        return;
      }
    }

    // Si la línea actual tiene código válido, inserta debajo
    this.lineas.splice(this.lineaActivaIndex + 1, 0, { texto: '  ' + tarjeta.accion, color: tarjeta.colorConsola, tieneError: false });
    this.lineaActivaIndex++;
    // NOTA: Se ha eliminado el .focus() programático para evitar que el teclado móvil salte inoportunamente
  }

  // Tecla Enter: Crea una nueva línea debajo de la actual
  crearNuevaLinea(index: number) {
    this.lineas.splice(index + 1, 0, { texto: '', color: '#d4d4d4', tieneError: false });
    
    // Esperar a que Angular renderice el nuevo input en el DOM
    setTimeout(() => {
      const arrayInputs = this.inputs.toArray();
      if (arrayInputs[index + 1]) {
        arrayInputs[index + 1].nativeElement.focus();
      }
    }, 0);
  }

  // Flechas Arriba/Abajo para navegar entre líneas
  moverFoco(targetIndex: number, event: Event) {
    event.preventDefault(); // Evita que el cursor salte raro
    const arrayInputs = this.inputs.toArray();
    if (targetIndex >= 0 && targetIndex < arrayInputs.length) {
      arrayInputs[targetIndex].nativeElement.focus();
    }
  }

  onTextoCambiado(index: number, nuevoTexto: string, linea: Instruccion) {
    linea.texto = nuevoTexto;
    
    if (this.timeouts[index]) {
      clearTimeout(this.timeouts[index]);
    }

    this.timeouts[index] = setTimeout(() => {
      this.validarSintaxis(linea);
    }, 500);
  }

  private validarSintaxis(linea: Instruccion) {
    // Las líneas vacías no son errores: el usuario aún no ha escrito nada
    if (linea.texto.trim() === '') {
      linea.tieneError = false;
      return;
    }

    const regex = /^ogro\.caminar(Arriba|Abajo|Izquierda|Derecha)\(\)$/;
    linea.tieneError = !regex.test(linea.texto);

    if (!linea.tieneError && this.mapaColores[linea.texto]) {
      linea.color = this.mapaColores[linea.texto];
    }
  }

  onKeyDown(event: KeyboardEvent, index: number, linea: Instruccion) {
    if (event.key === 'Backspace' && linea.texto === '') {
      event.preventDefault();
      this.lineaBorrada.emit(index);
      
      // Auto-enfocar la línea anterior tras borrar
      setTimeout(() => {
        const arrayInputs = this.inputs.toArray();
        if (index - 1 >= 0 && arrayInputs[index - 1]) {
          arrayInputs[index - 1].nativeElement.focus();
        } else if (arrayInputs.length > 0) {
          arrayInputs[0].nativeElement.focus();
        }
      }, 0);
    }
  }

  // Toolbar
  clickEjecutar(event: Event) {
    event.stopPropagation();
    this.onEjecutar.emit();
  }

  clickBorrar(event: Event) {
    event.stopPropagation();
    
    // Borrar selectivamente la línea en la que está el cursor
    this.lineas.splice(this.lineaActivaIndex, 1);
    
    // Si borramos la última línea que quedaba, inyectamos una vacía
    if (this.lineas.length === 0) {
      this.lineas.push({ texto: '', color: '#d4d4d4', tieneError: false });
      this.lineaActivaIndex = 0;
    } else {
      // Ajustar el índice para no salirnos del array si borramos la última de la lista
      this.lineaActivaIndex = Math.max(0, this.lineaActivaIndex - 1);
    }
    
    // Refocus programático
    setTimeout(() => {
      const arrayInputs = this.inputs.toArray();
      if (arrayInputs[this.lineaActivaIndex]) {
        arrayInputs[this.lineaActivaIndex].nativeElement.focus();
      }
    }, 0);
  }

  clickLimpiar(event: Event) {
    event.stopPropagation();
    this.onLimpiar.emit();
  }

  preventPaste(event: Event) {
    if (this.antiCopiaActivo) {
      event.preventDefault();
      this.notificationService.show('🛡️ El profesor ha bloqueado copiar y pegar.', 'error');
    }
  }
}
