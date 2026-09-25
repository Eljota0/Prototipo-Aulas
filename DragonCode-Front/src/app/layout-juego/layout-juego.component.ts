import { Component, Input, Output, EventEmitter, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConsolaCodigoComponent } from '../consola-codigo/consola-codigo.component';
import { BarajaTarjetasComponent, TarjetaConfig } from '../baraja-tarjetas/baraja-tarjetas.component';
import { NotificationService } from '../services/notification.service';
import { GameHeaderComponent } from '../game-header/game-header.component';
import { Router } from '@angular/router';

export interface Instruccion {
  texto: string;
  color: string;
  tieneError: boolean;
  fija?: boolean;
  esPlaceholder?: boolean;
}

@Component({
  selector: 'app-layout-juego',
  standalone: true,
  imports: [CommonModule, ConsolaCodigoComponent, BarajaTarjetasComponent, GameHeaderComponent],
  templateUrl: './layout-juego.component.html',
  styleUrl: './layout-juego.component.scss'
})
export class LayoutJuegoComponent {
  // Estado centralizado: Inicializado con una línea por defecto
  lineasCodigo: Instruccion[] = [{ texto: '', color: '#d4d4d4', tieneError: false }];
  
  // Estado de ejecución
  @Input() ejecutando: boolean = false;

  // Extensión para Modo Plantilla
  @Input() modoPlantilla: boolean = false;
  @Input() listoParaEjecutar: boolean = false;
  @Output() onLimpiarPlantilla = new EventEmitter<void>();
  @Output() onBorrarLineaPlantilla = new EventEmitter<void>();
  @Output() onDeshacerPaso = new EventEmitter<string>();

  // Servicio de Notificaciones
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  // Referencia a los componentes hijos
  @ViewChild(ConsolaCodigoComponent) consola!: ConsolaCodigoComponent;
  @ViewChild(BarajaTarjetasComponent) baraja!: BarajaTarjetasComponent;

  // Configuración de las tarjetas recibida desde el "Cartucho"
  @Input() configuracionTarjetas: TarjetaConfig[] = [];

  // Flag para habilitar el modo anticopia en la consola
  @Input() antiCopiaActivo: boolean = false;

  // Nivel actual del juego (para la poción de clarividencia)
  @Input() nivelActual: number = 1;

  // Las ayudas mágicas pertenecen exclusivamente al modo Aventura.
  @Input() modoJuego: 'aventura' | 'aula' = 'aventura';

  // El constructor reutiliza el tablero, pero oculta los controles de ejecución.
  @Input() modoEdicion = false;
  @Input() mostrarAjustes = true;

  // Estado inicial del inventario
  @Input() estadoObjetos?: any;

  // Emisor hacia el nivel (Ogro) con el código ensamblado
  @Output() ejecutarJuego = new EventEmitter<string>();

  // Emisor hacia el nivel (Ogro) cuando se usa un ítem
  @Output() onUsarItem = new EventEmitter<'roja' | 'verde' | 'amarilla' | 'libro'>();

  // Emisor del toggle de Draco
  @Output() onToggleDraco = new EventEmitter<boolean>();

  // Emisor hacia el nivel cuando se usa una tarjeta de acción
  @Output() onUsarTarjeta = new EventEmitter<TarjetaConfig>();

  // Permite que un Nivel intercepte la inserción sin afectar a la consola automáticamente
  @Input() controlManualTarjetas: boolean = false;

  // Método accionado por la Baraja para agregar código
  agregarCodigo(tarjeta: TarjetaConfig) {
    if (this.controlManualTarjetas) {
      this.onUsarTarjeta.emit(tarjeta);
      return;
    }
    if (this.consola) {
      this.consola.insertarDesdeTarjeta(tarjeta);
      this.onUsarTarjeta.emit(tarjeta);
    }
  }

  // Método accionado por la Consola cuando el usuario borra una línea completa
  eliminarLinea(index: number) {
    if (this.modoPlantilla && this.lineasCodigo[index]?.fija) return;
    this.lineasCodigo.splice(index, 1);
    this.verificarLineaMinima();
  }

  // Toolbar: Borrar última línea
  borrarUltimaLinea() {
    if (this.modoPlantilla) {
      this.onBorrarLineaPlantilla.emit();
      return;
    }
    if (this.lineasCodigo.length > 0) {
      this.lineasCodigo.pop();
    }
    this.verificarLineaMinima();
  }

  // Toolbar: Limpiar Todo
  limpiarTodo() {
    if (this.modoPlantilla) {
      this.onLimpiarPlantilla.emit();
      return;
    }
    this.lineasCodigo = [{ texto: '', color: '#d4d4d4', tieneError: false }];
  }

  // Teardown: Resetear Inventario
  resetearInventario() {
    if (this.baraja) {
      this.baraja.estadoObjetos.vida.consumida = false;
      this.baraja.estadoObjetos.clarividencia.consumida = false;
      this.baraja.estadoObjetos.tiempo.consumida = false;
    }
  }

  // Toolbar: Ejecutar
  ejecutarCodigo() {
    const hayErrores = this.lineasCodigo.some(linea => linea.tieneError);
    const estaVacio = this.lineasCodigo.every(linea => linea.texto.trim() === '');

    if (hayErrores || estaVacio) {
      const mensaje = hayErrores 
        ? 'Hay errores de sintaxis en tu código mágico.'
        : 'No has escrito ningún código mágico para ejecutar.';
      this.notificationService.show(mensaje, 'error');
      return;
    }

    this.ejecutando = true;
    
    // Concatenamos todas las líneas en un solo gran string (pergamino)
    const codigoEnsamblado = this.lineasCodigo.map(l => l.texto).join('\n');
    
    // Lo disparamos hacia el Nivel (Ogro)
    this.ejecutarJuego.emit(codigoEnsamblado);
  }

  // Utilidad: Asegurar que nunca quede en 0 líneas
  private verificarLineaMinima() {
    if (this.lineasCodigo.length === 0) {
      this.lineasCodigo.push({ texto: '', color: '#d4d4d4', tieneError: false });
    }
  }

  abandonarPartida() {
    this.router.navigate([this.modoJuego === 'aventura' && !this.modoEdicion ? '/aventura' : '/pantalla-principal']);
  }

  // Puente: Activa la poción de clarividencia en la consola
  activarClarividencia() {
    if (this.consola) {
      this.consola.usarPocionClarividencia();
    }
  }
}
