import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild } from '@angular/core';

@Component({
  selector: 'app-victoria-aventura',
  standalone: true,
  imports: [CommonModule],
  styleUrls: ['./victoria.scss'],
  template: `
    <dialog #dialogo class="modal-victoria victoria-aventura"
      aria-labelledby="titulo-victoria-aventura" aria-describedby="resultado-victoria-aventura"
      (cancel)="$event.preventDefault()">
      <img src="/assets/images/exprecionsedraco/feliz.png" class="victoria-drako" alt="Draco feliz">
      <div class="victoria-contenido">
        <h1 id="titulo-victoria-aventura" tabindex="-1" autofocus>¡MISIÓN COMPLETADA!</h1>
        <p class="victoria-felicitacion">¡Felicidades! ¡Has completado la aventura!</p>
        <p id="resultado-victoria-aventura" aria-live="polite">
          {{ confirmado ? 'Este intento' : 'Resultado provisional' }}: {{ estrellas }} de 3 estrellas.
          {{ mensaje }}
        </p>
        <div class="victoria-estrellas" role="img" [attr.aria-label]="estrellas + ' de 3 estrellas'">
          <span *ngFor="let estrella of iconos; let i = index" class="victoria-estrella"
            aria-hidden="true" [style.animation-delay.s]="i * .3">⭐</span>
        </div>
        <button type="button" class="victoria-volver" (click)="salir.emit()">SALIR DE LA MISIÓN</button>
      </div>
    </dialog>`
})
export class VictoriaAventuraComponent implements AfterViewInit, OnDestroy {
  @Input() estrellas = 0;
  @Input() confirmado = false;
  @Input() mensaje = '';
  @Output() salir = new EventEmitter<void>();
  @ViewChild('dialogo') dialogo!: ElementRef<HTMLDialogElement>;

  get iconos(): number[] { return Array.from({ length: Math.max(0, Math.min(3, this.estrellas)) }, (_, i) => i); }
  ngAfterViewInit(): void { this.dialogo.nativeElement.showModal(); }
  ngOnDestroy(): void { this.dialogo.nativeElement.close(); }
}
