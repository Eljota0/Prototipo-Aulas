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
  private notificationService = inject(NotificationService);

  @Input() lineas: Instruccion[] = [];
  @Input() ejecutando: boolean = false;
  @Input() antiCopiaActivo: boolean = false;
  
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

  enfocarUltimoInput() {
    if (this.inputs && this.inputs.length > 0) {
      this.inputs.last.nativeElement.focus();
    }
  }

  // Insertar código directamente desde las tarjetas, contextualmente en la línea activa
  insertarDesdeTarjeta(tarjeta: { nombre: string; colorBoton: string; colorConsola: string; accion: string }) {
    // Protección contra índices desfasados (ej. si el nivel se purga y el arreglo se reduce a 1)
    if (this.lineaActivaIndex >= this.lineas.length || this.lineaActivaIndex < 0) {
      this.lineaActivaIndex = Math.max(0, this.lineas.length - 1);
    }

    if (this.lineas[this.lineaActivaIndex] && this.lineas[this.lineaActivaIndex].texto === '') {
      this.lineas[this.lineaActivaIndex] = { texto: tarjeta.accion, color: tarjeta.colorConsola, tieneError: false };
    } else {
      this.lineas.splice(this.lineaActivaIndex + 1, 0, { texto: tarjeta.accion, color: tarjeta.colorConsola, tieneError: false });
      this.lineaActivaIndex++;
    }
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
