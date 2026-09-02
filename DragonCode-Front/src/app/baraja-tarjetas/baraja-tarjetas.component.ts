import { Component, Input, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TarjetaConfig {
  nombre: string;
  colorBoton: string;
  colorConsola: string;
  accion: string;
}

@Component({
  selector: 'app-baraja-tarjetas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './baraja-tarjetas.component.html',
  styleUrl: './baraja-tarjetas.component.scss'
})
export class BarajaTarjetasComponent {
  @Input() configuracion: TarjetaConfig[] = [];
  
  // Ahora emitimos el objeto completo para que el Layout sepa el color
  @Output() instruccionSeleccionada = new EventEmitter<TarjetaConfig>();

  @Input() modoJuego: 'aventura' | 'aula' = 'aventura';
  @Input() estadoObjetos = {
    libro: { activo: true }, // El libro no se consume
    clarividencia: { activo: true, consumida: false },
    vida: { activo: true, consumida: false },
    tiempo: { activo: true, consumida: false }
  };

  pestanaActiva: 'acciones' | 'objetos' = 'acciones';
  cambiarPestana(tab: 'acciones' | 'objetos') {
    if (this.pestanaActiva === tab || this.bloquearBoton) return;
    this.pestanaActiva = tab;
    
    // Dispara la animación de ola al cambiar de pestaña
    this.animandoOla = true;
    this.bloquearBoton = true;
    setTimeout(() => {
      this.animandoOla = false;
      this.bloquearBoton = false;
    }, 1000);
  }

  mostrarObjetos: boolean = true;
  animandoOla: boolean = false;
  bloquearBoton: boolean = false;

  @Output() onUsarItem = new EventEmitter<'roja' | 'verde' | 'amarilla' | 'libro'>();

  rojaTemblando: boolean = false;
  verdeTemblando: boolean = false;
  amarillaTemblando: boolean = false;

  constructor(private cdr: ChangeDetectorRef) {}

  seleccionarTarjeta(tarjeta: TarjetaConfig) {
    this.instruccionSeleccionada.emit(tarjeta);
  }

  agitarPocion(tipo: 'roja' | 'verde' | 'amarilla') {
    if (tipo === 'roja') {
      this.rojaTemblando = true;
      this.cdr.detectChanges(); // FIX CRÍTICO: Forzar a Angular a pintar el temblor
      setTimeout(() => {
        this.rojaTemblando = false;
        this.cdr.detectChanges();
      }, 400);
    } else if (tipo === 'verde') {
      this.verdeTemblando = true;
      this.cdr.detectChanges();
      setTimeout(() => {
        this.verdeTemblando = false;
        this.cdr.detectChanges();
      }, 400);
    } else if (tipo === 'amarilla') {
      this.amarillaTemblando = true;
      this.cdr.detectChanges();
      setTimeout(() => {
        this.amarillaTemblando = false;
        this.cdr.detectChanges();
      }, 400);
    }
  }

  toggleObjetos() {
    if (this.bloquearBoton) return;
    this.bloquearBoton = true;

    if (this.mostrarObjetos) {
      this.mostrarObjetos = false;
      setTimeout(() => {
        this.animandoOla = true;
      }, 300);
      setTimeout(() => {
        this.animandoOla = false;
        this.bloquearBoton = false;
      }, 1300);
    } else {
      this.mostrarObjetos = true;
      this.animandoOla = true;
      setTimeout(() => {
        this.animandoOla = false;
        this.bloquearBoton = false;
      }, 1000);
    }
  }
}
