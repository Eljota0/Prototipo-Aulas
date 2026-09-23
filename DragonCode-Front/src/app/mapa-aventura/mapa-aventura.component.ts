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
    { texto: "Comentar tu código es como dejarle un mapa al tesoro a tu yo del futuro. No seas cruel contigo mismo.", imagen: "assets/images/exprecionsedraco/pensativo.png" },
    { texto: "Sabias que la primera programadora de la historia fue una mujer humana llamada Ada Lovelace? Ojala heredaras una fraccion de su intelecto.", imagen: "assets/images/exprecionsedraco/pensativo.png" },
    { texto: "Alan Turing es considerado el padre de la computacion. Nosotros los dragones lo respetamos, resolvio enigmas casi tan complejos como mis acertijos.", imagen: "assets/images/exprecionsedraco/base.png" },
    { texto: "Hay 10 tipos de personas en el mundo: los que entienden binario y los que no. Es un chiste clasico, ríete humano.", imagen: "assets/images/exprecionsedraco/feliz.png" },
    { texto: "Por que los programadores prefieren el modo oscuro? Porque la luz atrae a los bugs. Aunque en este calabozo, la oscuridad atrae peores cosas.", imagen: "assets/images/exprecionsedraco/pensativo.png" },
    { texto: "Un programador es una maquina que convierte cafe en codigo. Espero que tengas tu pócima lista.", imagen: "assets/images/exprecionsedraco/base.png" },
    { texto: "Un buen desarrollador es aquel que mira a ambos lados de la calle antes de cruzar una via de un solo sentido. Nunca confies en los usuarios.", imagen: "assets/images/exprecionsedraco/pensativo.png" },
    { texto: "Sabias que el nombre 'Python' no viene de la serpiente, sino de los Monty Python? Un humor muy peculiar para unos humanos tan simples.", imagen: "assets/images/exprecionsedraco/sorpendido.png" },
    { texto: "Fracasaste otra vez? Excelente. En la programacion, fallar es solo descubrir una forma mas de no hacer las cosas. Sigue intentando.", imagen: "assets/images/exprecionsedraco/feliz.png" },
    { texto: "El mejor mensaje de error es el que nunca ocurre. El segundo mejor es el que realmente te dice que demonios hiciste mal.", imagen: "assets/images/exprecionsedraco/base.png" },
    { texto: "Dicen que el optimismo es un riesgo laboral en la programacion. Siempre asume que tu codigo fallara, y preparate para cuando lo haga.", imagen: "assets/images/exprecionsedraco/confundido.png" },
    { texto: "Sabias que el primer lenguaje de programacion de alto nivel fue Fortran en 1957? Antes de eso, codificar era un verdadero hechizo arcaico.", imagen: "assets/images/exprecionsedraco/pensativo.png" },
    { texto: "Te atoraste? Levantate, camina un poco, hablale a un pato de goma. O a mi, aunque dudo que entiendas mis majestuosas respuestas.", imagen: "assets/images/exprecionsedraco/feliz.png" },
    { texto: "El codigo que no pruebas es como un dragon dormido: nunca sabes cuando va a despertar y quemar toda la aldea.", imagen: "assets/images/exprecionsedraco/enojado.png" },
    { texto: "Ctrl+Z es tu mejor amigo, pero no te confies. A veces ni la magia del tiempo puede salvar una mala arquitectura.", imagen: "assets/images/exprecionsedraco/asustado.png" },
    { texto: "Un desarrollador entra a un bar y pide 1 cerveza, 0 cervezas, 999999 cervezas y -1 cerveza. El barman explota. Limpia tus inputs.", imagen: "assets/images/exprecionsedraco/feliz.png" },
    { texto: "Si tu codigo funciona y no sabes por que, no lo toques. Pero te estare vigilando, eso es brujeria inaceptable.", imagen: "assets/images/exprecionsedraco/confundido.png" },
    { texto: "Sabias que la NASA uso procesadores de la consola de juegos original de Sony para su nave espacial Orion? Hasta la tecnologia antigua tiene sus trucos.", imagen: "assets/images/exprecionsedraco/sorpendido.png" },
    { texto: "El hardware es lo que puedes golpear cuando el software no funciona. Te sugiero que no golpees tu monitor, todavia lo necesitamos.", imagen: "assets/images/exprecionsedraco/base.png" },
    { texto: "Programar es un 10 por ciento escribir codigo y un 90 por ciento entender por que no funciona lo que acabas de escribir. Paciencia, aprendiz.", imagen: "assets/images/exprecionsedraco/pensativo.png" },
    { texto: "No te sientas mal si tienes que buscar en internet como centrar un div. He visto archimagos hacer trampa con cosas mucho mas simples.", imagen: "assets/images/exprecionsedraco/feliz.png" },
    { texto: "Tu talento no determina tu limite en la programacion, tu persistencia si. Y quizas un poco de la sabiduria que te estoy prestando.", imagen: "assets/images/exprecionsedraco/base.png" },
    { texto: "Cual es el animal favorito de un programador? El raton. Patetico, los dragones somos infinitamente superiores.", imagen: "assets/images/exprecionsedraco/confundido.png" },
    { texto: "Sabias que el dominio '.tv' pertenece en realidad a Tuvalu, una pequena isla? Venden su extension para que ustedes vean sus series. Astutos.", imagen: "assets/images/exprecionsedraco/sorpendido.png" },
    { texto: "Recuerda: la maquina hara exactamente lo que le digas, no lo que tu querias decirle. Se especifico.", imagen: "assets/images/exprecionsedraco/enojado.png" },
    { texto: "Todos los programadores experimentados tienen un cementerio de proyectos inacabados. Espero que este calabozo no sea uno de los tuyos.", imagen: "assets/images/exprecionsedraco/pensativo.png" }
  ];
  consejoActual: { texto: string; imagen: string } | null = null;
  mostrandoConsejo = false;
  timerConsejo: any;
  timerOcultar: any;

  iniciarCicloConsejos() {
    // Mostrar el primer consejo casi de inmediato al entrar (solo 1 segundo de cortesía)
    setTimeout(() => {
      this.mostrarConsejoAleatorio();
    }, 1000);
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