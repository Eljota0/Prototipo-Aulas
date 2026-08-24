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
  ejecutando: boolean = false;

  // Servicio de Notificaciones
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

  // Emisor hacia el nivel (Ogro) con el código ensamblado
  @Output() ejecutarJuego = new EventEmitter<string>();

  // Emisor hacia el nivel para el uso de pociones
  @Output() onUsarItem = new EventEmitter<'roja' | 'verde' | 'amarilla'>();

  // Método accionado por la Baraja para agregar código
  agregarCodigo(tarjeta: TarjetaConfig) {
    if (this.consola) {
      this.consola.insertarDesdeTarjeta(tarjeta);
    }
  }

  // Método accionado por la Consola cuando el usuario borra una línea completa
  eliminarLinea(index: number) {
    this.lineasCodigo.splice(index, 1);
    this.verificarLineaMinima();
  }

  // Toolbar: Borrar última línea
  borrarUltimaLinea() {
    if (this.lineasCodigo.length > 0) {
      this.lineasCodigo.pop();
    }
    this.verificarLineaMinima();
  }

  // Toolbar: Limpiar Todo
  limpiarTodo() {
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
    
    // Apagamos la UI de ejecución poco después
    setTimeout(() => this.ejecutando = false, 2000);
  }

  // Utilidad: Asegurar que nunca quede en 0 líneas
  private verificarLineaMinima() {
    if (this.lineasCodigo.length === 0) {
      this.lineasCodigo.push({ texto: '', color: '#d4d4d4', tieneError: false });
    }
  }

  abandonarPartida() {
    this.router.navigate(['/pantalla-principal']);
  }
}
