import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
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
  resumenTecnico?: string;
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
  // --- WIDGET CONSEJOS DRACO ---
  consejosDraco = [
    { texto: "Recuerda, un buen programador no copia y pega código de internet... sin entender primero por qué no funciona.", imagen: "assets/images/exprecionsedraco/pensativo.png" },
    { texto: "Si tu código compila a la primera sin errores, sospecha. La magia oscura tiene un precio muy alto.", imagen: "assets/images/exprecionsedraco/asustado.png" },
    { texto: "Sabías que el primer 'bug' de la historia fue una polilla real atrapada en una computadora? Espero que aquí solo encontremos monstruos virtuales.", imagen: "assets/images/exprecionsedraco/sorpendido.png" },
    { texto: "Tómate tu tiempo para explorar. El código espagueti se hace con prisa, pero una buena arquitectura toma su tiempo.", imagen: "assets/images/exprecionsedraco/feliz.png" },
    { texto: "He visto goblins de nivel 1 escribir mejor código fuente que algunos humanos. Demuéstrame que tú eres la excepción.", imagen: "assets/images/exprecionsedraco/base.png" },
    { texto: "Un verdadero maestro del teclado no le teme a la pantalla roja de errores; la lee, la comprende y la conquista.", imagen: "assets/images/exprecionsedraco/feliz.png" },
    { texto: "Estructurar bien tu lógica es como construir un buen calabozo: cada trampa debe tener su propósito.", imagen: "assets/images/exprecionsedraco/pensativo.png" },
    { texto: "No te rindas si te equivocas. Hasta los dragones más sabios quemaron sus propios pergaminos cuando aprendían a lanzar fuego.", imagen: "assets/images/exprecionsedraco/feliz.png" },
    { texto: "Dicen que el buen código se lee como la poesía. El tuyo se lee como un manual de instrucciones de una catapulta, pero vamos mejorando.", imagen: "assets/images/exprecionsedraco/base.png" },
    { texto: "Si te sientes frustrado, respira hondo. El teclado no tiene la culpa de que el compilador no entienda tus grandiosas ideas.", imagen: "assets/images/exprecionsedraco/confundido.png" },
    { texto: "Comentar tu código es como dejarle un mapa al tesoro a tu yo del futuro. No seas cruel contigo mismo.", imagen: "assets/images/exprecionsedraco/pensativo.png" }
  ];
  consejoActual: { texto: string; imagen: string } | null = null;
  mostrandoConsejo = false;
  timerConsejo: any;
  timerOcultar: any;

  iniciarCicloConsejos() {
    // Primer consejo aleatorio entre 20 y 30 seg
    this.programarSiguienteConsejo();
  }

  programarSiguienteConsejo() {
    const delay = Math.floor(Math.random() * (30000 - 20000 + 1)) + 20000;
    this.timerConsejo = setTimeout(() => {
      this.mostrarConsejoAleatorio();
    }, delay);
  }

  mostrarConsejoAleatorio() {
    const randomIndex = Math.floor(Math.random() * this.consejosDraco.length);
    this.consejoActual = this.consejosDraco[randomIndex];
    this.mostrandoConsejo = true;

    this.timerOcultar = setTimeout(() => {
      this.mostrandoConsejo = false;
      
      // Limpiar el consejoActual despues de que termine el fadeout (0.8s) para que la imagen vuelva a base.png
      setTimeout(() => {
        this.consejoActual = null;
      }, 800);
      
      // Reprogramar despues del fadeout
      setTimeout(() => this.programarSiguienteConsejo(), 1000);
    }, 8000);
  }

  readonly catalogoNiveles = NIVELES_DRAGONCODE;
  totalEstrellas = 0;
  maxEstrellas = 15; // 5 niveles * 3 estrellas
  niveles: LevelDescriptor[] = [];
  selectedLevel: LevelDescriptor | null = null;

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

  openLevelModal(level: LevelDescriptor, event: Event): void {
    event.preventDefault();
    this.selectedLevel = level;
  }

  closeLevelModal(): void {
    this.selectedLevel = null;
  }

  get nivelesCompletados(): number {
    return this.niveles.filter(n => n.completado).length;
  }

  get progresoPorcentaje(): number {
    return (this.nivelesCompletados / this.totalNiveles) * 100;
  }

  ngOnInit(): void {
    this.iniciarCicloConsejos();
    this.construirMapa(new Set<number>(), new Map<number, number>());
    this.progresoService.miProgreso().subscribe({
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
        
        // Esperamos a que Angular renderice, hacemos scroll y LUEGO quitamos la pantalla de carga
        setTimeout(() => {
          this.scrollToCurrentLevel();
          requestAnimationFrame(() => {
            this.loaderService.ocultar();
          });
        }, 150);
      },
      error: () => {
        this.construirMapa(new Set<number>(), new Map<number, number>());
        setTimeout(() => {
          this.scrollToCurrentLevel();
          requestAnimationFrame(() => {
            this.loaderService.ocultar();
          });
        }, 150);
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
    clearTimeout(this.timerConsejo);
    clearTimeout(this.timerOcultar);
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
        estrellas: mapaEstrellas.get(id) || 0,
        resumenTecnico: nivel?.resumenTecnico
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