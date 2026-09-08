import { Component, Output, EventEmitter, OnInit } from '@angular/core';

@Component({
  selector: 'app-game-header',
  standalone: true,
  imports: [],
  templateUrl: './game-header.component.html',
  styleUrl: './game-header.component.scss'
})
export class GameHeaderComponent implements OnInit {
  @Output() salir = new EventEmitter<void>();

  @Output() onToggleDraco = new EventEmitter<boolean>();

  mostrarModalAbandonar = false;
  mostrarModalAjustes = false;
  sonidoActivo = true;
  ayudaDracoActiva = true;

  ngOnInit() {
    const estadoGuardado = localStorage.getItem('ayuda_draco');
    if (estadoGuardado !== null) {
      this.ayudaDracoActiva = estadoGuardado === 'true';
    }
  }

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
    localStorage.setItem('ayuda_draco', this.ayudaDracoActiva ? 'true' : 'false');
    this.onToggleDraco.emit(this.ayudaDracoActiva);
  }
}

