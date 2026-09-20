import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { obtenerOrdenProgreso, ProgresoService } from '../services/progreso.service';
import { LoaderService } from '../services/loader.service';
import { NIVELES_DRAGONCODE, TOTAL_NIVELES, obtenerNivel } from '../core/catalogo-niveles';

export interface LevelDescriptor {
  id: number;
  titulo: string;
  tema: string;
  descripcion: string;
  fases: number;
  completado: boolean;
  bloqueado: boolean;
  estrellas: number; // NUEVO
}

@Component({
  selector: 'app-mapa-aventura',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './mapa-aventura.component.html',
  styleUrl: './mapa-aventura.component.scss'
})
export class MapaAventuraComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;

  readonly totalNiveles = TOTAL_NIVELES;
  readonly catalogoNiveles = NIVELES_DRAGONCODE;
  totalEstrellas = 0;
  maxEstrellas = 15; // 5 niveles * 3 estrellas
  niveles: LevelDescriptor[] = [];

  private isDown = false;
  private startX = 0;
  private scrollLeft = 0;

  // Listeners
  private onMouseDown = this.mouseDownHandler.bind(this);
  private onMouseLeave = this.mouseLeaveHandler.bind(this);
  private onMouseUp = this.mouseUpHandler.bind(this);
  private onMouseMove = this.mouseMoveHandler.bind(this);
  private onWheel = this.wheelHandler.bind(this);

  constructor(
    private progresoService: ProgresoService,
    private loaderService: LoaderService,
    private ngZone: NgZone
  ) {}

  get nivelesCompletados(): number {
    return this.niveles.filter(n => n.completado).length;
  }

  get progresoPorcentaje(): number {
    return (this.nivelesCompletados / this.totalNiveles) * 100;
  }

  ngOnInit(): void {
    this.construirMapa(new Set<number>(), new Map<number, number>());
    this.progresoService.miProgreso().pipe(
      finalize(() => this.loaderService.ocultar())
    ).subscribe({
      next: progresos => {
        let estrellas = 0;
        const completados = new Set<number>();
        const mapaEstrellas = new Map<number, number>();
        
        progresos.forEach(progreso => {
          if (progreso.completado) {
            const id = obtenerOrdenProgreso(progreso);
            completados.add(id);
            const stars = progreso.estrellas_obtenidas || 0;
            mapaEstrellas.set(id, stars);
            estrellas += stars;
          }
        });

        this.totalEstrellas = estrellas;
        this.construirMapa(completados, mapaEstrellas);
        setTimeout(() => this.scrollToCurrentLevel(), 100);
      },
      error: () => {
        this.construirMapa(new Set<number>(), new Map<number, number>());
        setTimeout(() => this.scrollToCurrentLevel(), 100);
      }
    });
  }

  ngAfterViewInit(): void {
    // Ejecutamos fuera de la zona de Angular para evitar ciclos de detección de cambios innecesarios
    this.ngZone.runOutsideAngular(() => {
      if (!this.scrollContainer) return;
      const el = this.scrollContainer.nativeElement;
      el.addEventListener('mousedown', this.onMouseDown);
      el.addEventListener('mouseleave', this.onMouseLeave);
      el.addEventListener('mouseup', this.onMouseUp);
      el.addEventListener('mousemove', this.onMouseMove);
      el.addEventListener('wheel', this.onWheel, { passive: false });
    });
  }

  ngOnDestroy(): void {
    if (this.scrollContainer) {
      const el = this.scrollContainer.nativeElement;
      el.removeEventListener('mousedown', this.onMouseDown);
      el.removeEventListener('mouseleave', this.onMouseLeave);
      el.removeEventListener('mouseup', this.onMouseUp);
      el.removeEventListener('mousemove', this.onMouseMove);
      el.removeEventListener('wheel', this.onWheel);
    }
  }

  private mouseDownHandler(e: MouseEvent): void {
    // No iniciar drag si hacemos click en un enlace o botón
    const target = e.target as HTMLElement;
    if (target.closest('a') || target.closest('button')) {
      return;
    }

    this.isDown = true;
    const el = this.scrollContainer.nativeElement;
    el.style.cursor = 'grabbing';
    this.startX = e.pageX - el.offsetLeft;
    this.scrollLeft = el.scrollLeft;
  }

  private mouseLeaveHandler(): void {
    this.isDown = false;
    if (this.scrollContainer) {
      this.scrollContainer.nativeElement.style.cursor = '';
    }
  }

  private mouseUpHandler(): void {
    this.isDown = false;
    if (this.scrollContainer) {
      this.scrollContainer.nativeElement.style.cursor = '';
    }
  }

  private mouseMoveHandler(e: MouseEvent): void {
    if (!this.isDown) return;
    e.preventDefault();
    const el = this.scrollContainer.nativeElement;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - this.startX) * 1.5; // Velocidad de arrastre
    el.scrollLeft = this.scrollLeft - walk;
  }

  private wheelHandler(e: WheelEvent): void {
    // Solo si el scroll vertical no hace nada, lo convertimos a horizontal
    const el = this.scrollContainer.nativeElement;
    
    // Si la rueda se movió arriba/abajo y no izq/der
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    }
  }

  getLeftPosition(id: number): string {
    const positions = ['25%', '50.5%', '52%', '75%', '85.5%'];
    return positions[id - 1] || '0%';
  }

  getTopPosition(id: number): string {
    const positions = ['86%', '53.5%', '85%', '82%', '57%'];
    return positions[id - 1] || '0%';
  }

  private construirMapa(completados: Set<number>, mapaEstrellas: Map<number, number>): void {
    this.niveles = Array.from({ length: this.totalNiveles }, (_, i) => {
      const id = i + 1;
      const nivel = obtenerNivel(id);
      return {
        id,
        titulo: nivel?.titulo ?? `Nivel ${id}`,
        tema: nivel?.tema ?? 'Fundamentos de programación',
        descripcion: nivel?.descripcion ?? 'Completa el desafío para continuar tu aventura.',
        fases: nivel?.fases ?? 4,
        completado: completados.has(id),
        bloqueado: id > 1 && !completados.has(id) && !completados.has(id - 1),
        estrellas: mapaEstrellas.get(id) || 0
      };
    });
  }

  private scrollToCurrentLevel(): void {
    if (!this.scrollContainer) return;

    // Buscar el nivel actual: el primero no bloqueado y no completado
    let currentLevel = this.niveles.find(n => !n.bloqueado && !n.completado);
    if (!currentLevel) {
      currentLevel = this.niveles[this.niveles.length - 1]; // O ir al último
    }
    if (!currentLevel) return;

    const percentageString = this.getLeftPosition(currentLevel.id);
    const percentage = parseFloat(percentageString) / 100;

    const el = this.scrollContainer.nativeElement;
    const scrollWidth = el.scrollWidth;
    const clientWidth = el.clientWidth;

    // Si hay desbordamiento horizontal (pantallas pequeñas)
    if (scrollWidth > clientWidth) {
      // Centramos el nodo en la pantalla
      const targetScrollLeft = (scrollWidth * percentage) - (clientWidth / 2);
      
      el.scrollTo({
        left: targetScrollLeft,
        behavior: 'smooth'
      });
    }
  }
}