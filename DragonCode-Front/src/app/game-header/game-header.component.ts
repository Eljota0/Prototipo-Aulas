import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-game-header',
  standalone: true,
  imports: [],
  templateUrl: './game-header.component.html',
  styleUrl: './game-header.component.scss'
})
export class GameHeaderComponent {
  @Output() salir = new EventEmitter<void>();

  mostrarModalAbandonar = false;
  mostrarModalAjustes = false;
  sonidoActivo = true;
  ayudaDracoActiva = true;

  toggleModalAbandonar() {
    this.mostrarModalAbandonar = !this.mostrarModalAbandonar;
  }

  toggleModalAjustes() {
    this.mostrarModalAjustes = !this.mostrarModalAjustes;
  }

  confirmarAbandono() {
    this.mostrarModalAbandonar = false;
    this.salir.emit();
  }

  toggleSonido() {
    this.sonidoActivo = !this.sonidoActivo;
  }

  toggleAyudaDraco() {
    this.ayudaDracoActiva = !this.ayudaDracoActiva;
  }
}

