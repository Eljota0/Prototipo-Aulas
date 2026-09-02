import { Component, ViewChild, ElementRef, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef, HostListener } from '@angular/core';
import { NotificationService } from '../services/notification.service';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { LayoutJuegoComponent } from '../layout-juego/layout-juego.component';
import { LoaderService } from '../services/loader.service';
import { TarjetaConfig } from '../baraja-tarjetas/baraja-tarjetas.component';
import { ProgresoService } from '../services/progreso.service';
import { AulasService } from '../services/aulas.service';
import { AssetPreloaderService } from '../services/asset-preloader.service';

export type TipoTerreno = 'vacio' | 'suelo' | 'sueloroto' | 'suelo-ogro' | 'salida' | 'meta-ogro';
export type TipoObjeto = 'ninguno' | 'roca' | 'cofre';

export interface Casilla {
  x: number;
  y: number;
  zona: 'superior' | 'editable' | 'inferior';
  terreno: TipoTerreno;
  objeto: TipoObjeto;
  tieneFilo?: boolean;
  rotacionTerreno: number; // NUEVO: Control de rotación visual
  estadoAnimacion: 'normal' | 'colapsando' | 'colision' | 'temblando'; // NUEVO: 'temblando'
}

export interface EntidadOgro {
  x: number;
  y: number;
  direccion: 'arriba' | 'abajo' | 'izquierda' | 'derecha';
  estado: 'idle' | 'caminando' | 'aturdido' | 'cayendo' | 'feliz';
  frameActual: number; // 1 o 2 para intercalar animaciones
}

export interface DialogNode {
  texto: string;
  expresion: string;
  itemCentro?: string;
}

@Component({
  selector: 'app-nivel-ogro',
  standalone: true,
  imports: [CommonModule, RouterModule, LayoutJuegoComponent, FormsModule],
  templateUrl: './nivel-ogro.component.html',
  styleUrl: './nivel-ogro.component.scss'
})
export class NivelOgroComponent implements OnInit, AfterViewInit, OnDestroy {
  // === INVENTARIO DEL NIVEL 1 ===
  inventarioNivel = {
    libro: { activo: true },
    clarividencia: { activo: true, consumida: false },
    vida: { activo: true, consumida: false },
    tiempo: { activo: false, consumida: false }
  };

  // === SISTEMA DE DIÁLOGOS TUTORIAL ===
  dialogosTutorial: DialogNode[] = [
    { expresion: 'feliz', texto: '¡Hey, novato! ¡Sí, tú, el que está al otro lado de la pantalla! Soy Draco, el Arquitecto de este calabozo. Bienvenido a DragonCode.' },
    { expresion: 'base', texto: '¿Ves a ese grandulón de ahí? Es un ogro, y tiene tanta fuerza como falta de sentido de la orientación. Nuestro objetivo es guiarlo hacia su oro.' },
    { expresion: 'feliz', texto: 'Pero aquí no usamos joysticks. ¡Usamos CÓDIGO! Escribirás tus instrucciones en el pergamino y él las ejecutará en secuencia.' },
    { expresion: 'base', texto: 'Si te da pereza escribir, mira abajo. Tienes Tarjetas de Acción. Haz clic en ellas para inyectar el código directamente en el pergamino. ¡Programación visual al rescate!' },
    { expresion: 'pensativo', texto: 'Si te pierdes, revisa tu Inventario o abre el Manual del Programador. Leer la documentación salva vidas... y ogros.', itemCentro: 'libro-ayuda' },
    { expresion: 'asustado', texto: 'Hablando de salvar vidas... si el ogro se lastima, perderás corazones. ¡Usa esta Poción de Vida para curarte! Trata de no matar a nuestro amigo azul, ¿ok?', itemCentro: 'pocion-vida' },
    { expresion: 'sorpendido', texto: 'Ah, y si tu código es un desastre... te dejaré usar esta Poción de Clarividencia. ¡Pero no te acostumbres, no siempre daré la respuesta!', itemCentro: 'pocion-clarividencia' },
    { expresion: 'feliz', texto: '¡Es hora de codificar! Escribe tu primer script en el pergamino mágico y hagamos que ese ogro camine. ¡Buena suerte!' }
  ];
  mostrarTutorial = true;
  dialogoActualIndex = 0;
  textoMostrado = '';
  isTyping = false;
  typeInterval: any;
  
  configTarjetasOgro: TarjetaConfig[] = [
    { accion: 'ogro.caminarArriba()', nombre: 'Arriba', colorBoton: '#2056F6', colorConsola: '#82B1FF' },
    { accion: 'ogro.caminarAbajo()', nombre: 'Abajo', colorBoton: '#2E8B57', colorConsola: '#A5D6A7' },
    { accion: 'ogro.caminarIzquierda()', nombre: 'Izquierda', colorBoton: '#D84315', colorConsola: '#FFAB91' },
    { accion: 'ogro.caminarDerecha()', nombre: 'Derecha', colorBoton: '#8E24AA', colorConsola: '#CE93D8' }
  ];

  tablero: Casilla[][] = [];
  columnas: number = 5;

  @ViewChild('contenedor', { static: true }) contenedorRef!: ElementRef;
  @ViewChild(LayoutJuegoComponent) layoutJuego!: LayoutJuegoComponent;
  private resizeObserver!: ResizeObserver;
  anchoTableroPx: number = 0;
  altoTableroPx: number = 0;
  
  tamanioCelda: number = 0;
  isResizing: boolean = false;
  resizeTimeout: any;

  /* --- ESTADOS DEL JUGADOR (HUD) --- */
  maxVidas: number = 3;
  vidasActuales: number = 3;
  cofresRecolectados: number = 0;
  totalCofresNivel: number = 5;
  ayudasUsadas: boolean = false;
  estrellasFinales: number = 0;
  arrayEstrellas: number[] = []; // Para iterar en el HTML
  efectoCuracionActivo: boolean = false;
  isLoadingAssets: boolean = true;

  // Helper para generar el array de vidas para el *ngFor
  get arrayVidas(): number[] {
    return Array(this.maxVidas).fill(0);
  }

  get totalCofresAventura(): number {
    let total = 0;
    for (let i = 1; i <= this.totalNiveles; i++) {
      
      let matriz;
      if (this.jugando && i === this.nivelActual) {
        // Si estamos jugando, el total no debe mutar. Leemos del respaldo.
        matriz = this.tableroSnapshot;
      } else if (i === this.nivelActual) {
        // Si estamos editando, leemos en vivo
        matriz = this.tablero;
      } else {
        // Niveles en caché
        matriz = this.borradoresNiveles[i]?.tablero;
      }
      
      if (matriz) {
        for (const fila of matriz) {
          for (const celda of fila) {
            if (celda.objeto === 'cofre') total++;
          }
        }
      }
    }
    return total;
  }

  modoEditor: boolean = true; // Activa el Dev Tool
  pincelActual: string = 'suelo-ogro';
  tipoPincel: 'terreno' | 'objeto' = 'terreno';

  nivelActual: number = 1;
  inputColumnas: number = 5;
  inputFilas: number = 5;

  totalNiveles: number = 0;
  inputTotalNiveles: number = 3; // Valor por defecto
  editorInicializado: boolean = false;
  esAulaActiva: boolean = false;

  jugando: boolean = false; // Controla si estamos probando el nivel
  ogro!: EntidadOgro;
  
  colaComandos: string[] = []; // Almacena las instrucciones (ej: ['arriba', 'derecha'])
  ejecutandoComandos: boolean = false; // Bloquea la UI mientras el ogro se mueve
  retrasoPasoMs: number = 600; // Movimiento más lento para apreciar el Walk Cycle

  codigoUsuario: string = ''; // Enlazado con ngModel al textarea

  ogroParpadeando: boolean = false;
  transicionPantallaNegra: boolean = false;
  pantallaGameOver: boolean = false;
  
  // Modal Nivel Completado
  pantallaNivelCompletado: boolean = false;
  estrellasObtenidasEmoji: string = '';
  mensajePuntaje: string = '';

  tableroSnapshot: Casilla[][] = []; // Fotografía del mapa original

  // --- MANUAL DEL PROGRAMADOR ---
  mostrarManual = false;
  paginaActual = 0; // Índice base (0 y 1 para las dos primeras)
  totalPaginas = 8;
  esMovil = window.innerWidth <= 768;

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.esMovil = window.innerWidth <= 768;
    // Prevenir que el índice se rompa al cambiar de tamaño
    if (!this.esMovil && this.paginaActual % 2 !== 0) {
      this.paginaActual -= 1; 
    }
    // CRUCIAL PARA ONPUSH o para asegurar el renderizado
    if (this.cdr) {
      this.cdr.detectChanges();
    }
  }

  abrirManual() { 
    this.esMovil = window.innerWidth <= 768; 
    this.mostrarManual = true; 
    this.paginaActual = 0; 
  }
  cerrarManual() { this.mostrarManual = false; }

  siguientePagina() {
    const esCelular = window.innerWidth <= 768;
    const salto = esCelular ? 1 : 2;
    if (this.paginaActual + salto < this.totalPaginas) {
      this.paginaActual += salto;
    }
  }

  anteriorPagina() {
    const esCelular = window.innerWidth <= 768;
    const salto = esCelular ? 1 : 2;
    if (this.paginaActual - salto >= 0) {
      this.paginaActual -= salto;
    }
  }

  get puedeAvanzar() { 
    const esCelular = window.innerWidth <= 768;
    return esCelular ? this.paginaActual < this.totalPaginas - 1 : this.paginaActual < this.totalPaginas - 2; 
  }
  get puedeRetroceder() { 
    return this.paginaActual > 0; 
  }
  cofresSnapshot: number = 0; // Cofres que tenía antes de empezar el intento
  perdidaCofresEfecto: boolean = false; // Trigger para el HUD

  // Caché temporal para guardar los diseños de los 10 niveles
  borradoresNiveles: Record<number, any> = {};

  esModoProfesor: boolean = false;
  mostrarMapaEnDOM: boolean = true;

  // ── SEGUIMIENTO DE TIEMPO Y RENDIMIENTO PARA EL BACKEND ─────────────
  private tiempoInicioMs: number = 0;   // Timestamp en ms cuando se ejecuta el primer comando
  private contadorIntentos: number = 0; // Número de veces que se ejecutó el código

  // Añadir la variable anti_copia
  antiCopiaActivo: boolean = false;
  
  // Timeout para recuperación de aturdimiento
  stunTimeout: any;
  stunAnimationInterval: any;
  toggleAturdido: boolean = false;
  
  isShaking: boolean = false;
  isRecovering: boolean = false;
  shakeTimeout: any;
  recoverTimeout: any;

  constructor(
    private cdr: ChangeDetectorRef,
    private notificationService: NotificationService,
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private loaderService: LoaderService,
    private progresoService: ProgresoService,
    private aulasService: AulasService,
    private assetPreloader: AssetPreloaderService
  ) {}

  iniciarDialogo() {
    const nodoActual = this.dialogosTutorial[this.dialogoActualIndex];
    this.textoMostrado = '';
    this.isTyping = true;
    let i = 0;
    
    if (this.typeInterval) clearInterval(this.typeInterval);
    
    this.typeInterval = setInterval(() => {
      this.textoMostrado += nodoActual.texto.charAt(i);
      i++;
      if (i >= nodoActual.texto.length) {
        clearInterval(this.typeInterval);
        this.isTyping = false;
        this.cdr.detectChanges();
      }
      this.cdr.detectChanges();
    }, 30);
  }

  clickDialogo() {
    const nodoActual = this.dialogosTutorial[this.dialogoActualIndex];
    if (this.isTyping) {
      clearInterval(this.typeInterval);
      this.textoMostrado = nodoActual.texto;
      this.isTyping = false;
    } else {
      this.dialogoActualIndex++;
      if (this.dialogoActualIndex < this.dialogosTutorial.length) {
        this.iniciarDialogo();
      } else {
        this.mostrarTutorial = false;
      }
    }
  }

  ngOnInit() {
    this.esAulaActiva = !!localStorage.getItem('aulaActiva');
    
    // Iniciar el tutorial basado en la preferencia de Ayuda de Draco
    const ayudaActivada = localStorage.getItem('ayuda_draco') !== 'false';
    // Aquí verifica contra tu variable real de nivel completado
    const nivelYaSuperado = false; // Ajusta esto si tienes un tracker de nivel pasado
    
    if (ayudaActivada && !nivelYaSuperado) {
      this.mostrarTutorial = true;
      this.iniciarDialogo();
    } else {
      this.mostrarTutorial = false;
    }

    // APP SHELL: Mostrar pantalla de carga instantánea
    this.loaderService.mostrar('CARGANDO NIVEL');
    
    // Rutas exactas del ogro
    const rutasOgro = [
      '/assets/images/aventura/nivel1/ogro/ogrofeliz.png',
      '/assets/images/aventura/nivel1/ogro/ogrocayendo.png',
      '/assets/images/aventura/nivel1/ogro/ogrotuardido1.png',
      '/assets/images/aventura/nivel1/ogro/ogrotuardido2.png',
      '/assets/images/aventura/nivel1/ogro/ogroespalda1.png',
      '/assets/images/aventura/nivel1/ogro/ogroespalda2.png',
      '/assets/images/aventura/nivel1/ogro/ogrolado1.png',
      '/assets/images/aventura/nivel1/ogro/ogrolado2.png',
      '/assets/images/aventura/nivel1/ogro/ogrocamino1.png',
      '/assets/images/aventura/nivel1/ogro/ogrocamino2.png'
    ];

    this.assetPreloader.precargarImagenes(rutasOgro).then(() => {
      this.isLoadingAssets = false;
    });

    // 1. Determinar el rol basado en la URL
    const urlActual = this.router.url;
    this.esModoProfesor = urlActual.includes('crear-aula');

    if (this.esModoProfesor) {
      // MODO CREADOR: Lienzo en blanco, listo para editar
      this.generarTableroPrueba();
      this.loaderService.ocultar();
    } else {
      // MODO JUGADOR: Auto-cargar el nivel oficial JSON
      this.cargarNivelOficial();
    }
  }

  cargarNivelOficial() {
    const aulaActiva = localStorage.getItem('aulaActiva');
    const retoActivoId = localStorage.getItem('retoActivo');
    
    // Si estamos en un aula, primero obtenemos los parámetros del reto
    if (aulaActiva) {
      this.aulasService.retosDelAula(aulaActiva).subscribe({
        next: (retos) => {
          if (retos && retos.length > 0) {
            let reto = retos[0];
            if (retoActivoId) {
              const r = retos.find((r: any) => r.id.toString() === retoActivoId);
              if (r) reto = r;
            }
            
            // GUARDAMOS EL ID DEL RETO ACTUAL EN LA CLASE PARA USARLO LUEGO (guardarProgreso)
            (this as any).retoActualId = reto.id;

            let parametros = reto.parametros_evaluacion;
            if (typeof parametros === 'string') {
              try {
                parametros = JSON.parse(parametros);
              } catch (e) {
                console.error('Error parseando parametros:', e);
              }
            }
            this.antiCopiaActivo = parametros?.anti_copia || false;
            
            // Limitamos los intentos y el tiempo máximo según el profesor
            // (La validación estricta ocurre en el backend al guardar progreso, 
            // pero podemos reflejar visualmente las vidas si quisiéramos)
            
            let fases = (parametros as any)?.fases_seleccionadas || (parametros as any)?.fases;
            if (typeof fases === 'string') {
               try { fases = JSON.parse(fases); } catch(e){}
            }
            if (Array.isArray(fases)) {
              fases = fases.map((f: any) => Number(f));
            }
            this.fetchNivelJson(fases);
          } else {
            this.fetchNivelJson();
          }
        },
        error: () => this.fetchNivelJson()
      });
    } else {
      // Modo Historia normal (sin aula)
      this.fetchNivelJson();
    }
  }

  private fetchNivelJson(fasesSeleccionadas?: number[]) {
    // Ahora usamos HttpClient de Angular (el interceptor tiene bypass para /assets/)
    this.http.get<any>('/assets/data/aventuraniveles/nivel-1.json').subscribe({
      next: (datosNivel) => {
        // DATA PARSER INTELIGENTE: Detecta si es un nivel o una campaña completa
        let niveles: any[] = [];

        if (datosNivel && Array.isArray(datosNivel.niveles)) {
          // FORMATO CAMPAÑA (NUEVO): { totalNiveles: X, niveles: [...] }
          niveles = datosNivel.niveles;
        } else if (Array.isArray(datosNivel)) {
          // FORMATO CAMPAÑA (LEGACY): El JSON es directamente un arreglo de niveles
          niveles = datosNivel;
        } else if (datosNivel && datosNivel.matriz) {
          // FORMATO NIVEL ÚNICO: El JSON es un objeto plano con una sola matriz
          niveles = [datosNivel];
        } else {
          console.error('Formato de JSON no reconocido:', datosNivel);
          this.generarTableroPrueba();
          return;
        }

        // SISTEMA DE SELECCIÓN DE FASES (Para Aulas)
        if (fasesSeleccionadas && fasesSeleccionadas.length > 0) {
          niveles = niveles.filter((nivel, index) => fasesSeleccionadas.includes(index + 1) || fasesSeleccionadas.includes(nivel.idNivel));
          
          // Si estamos en un aula, la ÚLTIMA fase de la lista debe terminar el reto
          if (niveles.length > 0) {
            const ultimoNivel = niveles[niveles.length - 1];
            if (ultimoNivel && ultimoNivel.matriz) {
              for (let fila of ultimoNivel.matriz) {
                for (let celda of fila) {
                  if (celda.zona === 'inferior' && celda.terreno === 'salida') {
                    celda.terreno = 'meta-ogro';
                    celda.rotacionTerreno = 0;
                  }
                }
              }
            }
          }
        }

        if (niveles.length === 0) {
           this.notificationService.show('El profesor no seleccionó ninguna fase válida.', 'error');
           this.generarTableroPrueba();
           return;
        }

        // REHIDRATACIÓN COMPLETA DE LA CACHÉ GLOBAL
        this.totalNiveles = niveles.length;
        this.borradoresNiveles = {};

        for (let i = 0; i < niveles.length; i++) {
          const nivel = niveles[i];
          this.borradoresNiveles[i + 1] = {
            tablero: JSON.parse(JSON.stringify(nivel.matriz)),
            filasEditables: nivel.filasEditables || 5,
            columnas: nivel.columnas || 9
          };
        }

        // CARGAR EL PRIMER NIVEL EN PANTALLA
        this.nivelActual = 1;
        const primerNivel = this.borradoresNiveles[1];
        this.tablero = JSON.parse(JSON.stringify(primerNivel.tablero));
        this.inputFilas = primerNivel.filasEditables;
        this.columnas = primerNivel.columnas;

        // Procesos del motor gráfico
        this.calcularFilos();
        this.tableroSnapshot = JSON.parse(JSON.stringify(this.tablero));
        this.cofresSnapshot = 0;
        this.cofresRecolectados = 0;

        // Activar modo juego
        this.modoEditor = false;
        this.jugando = true;

        // Ubicar al Ogro en el Spawn
        this.inicializarOgroEnSpawn();

        // Forzar recálculo físico del Grid tras la carga de datos
        this.cdr.detectChanges();
        
        setTimeout(() => {
          this.forzarRecalculoFisico();
        }, 50);

        // APP SHELL: Ocultar con transición suave tras dar tiempo a la descarga de assets
        setTimeout(() => {
          this.loaderService.ocultar();
        }, 800);
      },
      error: (err) => {
        console.error('Error cargando el nivel. Verifica la ruta en assets.', err);
        this.generarTableroPrueba(); // Fallback de seguridad
      }
    });
  }

  manejarToggleDraco(estado: boolean) {
    if (estado) {
      if (this.nivelActual === 1 && !this.pantallaNivelCompletado) {
        this.dialogoActualIndex = 0;
        this.textoMostrado = '';
        this.mostrarTutorial = true;
        this.iniciarDialogo();
      }
    } else {
      this.mostrarTutorial = false;
      if (this.typeInterval) clearInterval(this.typeInterval);
    }
  }

  /** Inicializa la entidad Ogro buscando el Spawn en el tablero activo */
  private inicializarOgroEnSpawn() {
    let spawnX = 0, spawnY = 0;
    for (const fila of this.tablero) {
      for (const celda of fila) {
        if (celda.terreno === 'suelo-ogro') {
          spawnX = celda.x;
          spawnY = celda.y;
        }
      }
    }
    this.ogro = {
      x: spawnX,
      y: spawnY,
      direccion: 'abajo',
      estado: 'idle',
      frameActual: 1
    };
  }

  contarCofresIniciales(): number {
    let count = 0;
    for (const fila of this.tablero) {
      for (const celda of fila) {
        if (celda.objeto === 'cofre') {
          count++;
        }
      }
    }
    return count;
  }

  pocionRojaTemblando: boolean = false;

  efectoTiempoActivo: boolean = false;

  manejarUsoPocion(tipo: 'roja' | 'verde' | 'amarilla' | 'libro') {
    if (!this.jugando) return;
    
    // Si usa pociones, marca como ayuda usada
    if (tipo !== 'libro') {
      this.ayudasUsadas = true;
    }

    // Extrae la referencia real a tu estado del inventario para poder marcar los ítems como consumidos
    const inventario = this.layoutJuego?.baraja?.estadoObjetos; 
    if (!inventario) return;

    switch (tipo) {
      case 'libro':
        this.abrirManual();
        break;

      case 'roja':
        if (inventario.vida.consumida) return; // Ya se usó
        
        if (this.vidasActuales >= this.maxVidas) {
          // REGLA DE NEGOCIO: Salud llena, ordenar al hijo que agite el ítem
          this.layoutJuego.baraja.agitarPocion('roja');
        } else {
          this.vidasActuales++;
          inventario.vida.consumida = true; // Mutación centralizada
          
          this.efectoCuracionActivo = true;
          this.cdr.detectChanges();
          setTimeout(() => { this.efectoCuracionActivo = false; this.cdr.detectChanges(); }, 800);
        }
        break;

      case 'verde':
        // Funcionalidad futura: añadir tiempo extra
        if (inventario.tiempo.consumida) return;
        
        inventario.tiempo.consumida = true;
        
        this.efectoTiempoActivo = true;
        this.cdr.detectChanges();
        setTimeout(() => { this.efectoTiempoActivo = false; this.cdr.detectChanges(); }, 800);
        break;
        
      case 'amarilla':
        if (inventario.clarividencia.consumida) return;
        inventario.clarividencia.consumida = true;
        this.layoutJuego.activarClarividencia();
        break;
    }
  }



  obtenerRotacionAleatoria(): number {
    const angulos = [0, 90, 180, 270];
    return angulos[Math.floor(Math.random() * angulos.length)];
  }

  seleccionarPincel(herramienta: string, tipo: 'terreno' | 'objeto') {
    this.pincelActual = herramienta;
    this.tipoPincel = tipo;
  }

  pintarCelda(celda: Casilla) {
    if (!this.modoEditor) return;
    if (celda.zona === 'superior') return;
    
    // LÓGICA DEL PINCEL CONTEXTUAL (META)
    if (this.pincelActual === 'meta-dinamica') {
      // Solo se puede colocar en la zona inferior
      if (celda.zona !== 'inferior') return;
      
      // Si es el último nivel de la serie, es el jefe final. Si no, es una escalera/salida.
      const texturaFinal = (this.nivelActual === this.totalNiveles) ? 'meta-ogro' : 'salida';
      
      celda.terreno = texturaFinal;
      celda.objeto = 'ninguno'; // Limpiamos objetos por si acaso
      celda.rotacionTerreno = 0; // CRÍTICO: La meta jamás debe estar rotada
      
      this.calcularFilos();
      return; // Terminamos la ejecución aquí
    }

    // Reglas normales para el resto de pinceles
    if (celda.zona === 'inferior' && this.pincelActual !== 'vacio') return;

    // LÓGICA DE BORRADO INTELIGENTE (Por capas)
    if (this.pincelActual === 'vacio') {
      if (celda.objeto !== 'ninguno') {
        // Si la celda tiene un objeto, borramos solo el objeto
        celda.objeto = 'ninguno';
        celda.estadoAnimacion = 'normal'; // Reseteamos por si estaba colisionando
      } else {
        // Si ya no hay objeto, borramos el terreno completo
        celda.terreno = 'vacio';
        celda.rotacionTerreno = 0;
      }
      this.calcularFilos();
      return; // Cortamos la ejecución aquí
    }

    if (this.tipoPincel === 'terreno') {
      // REGLA SINGLETON: Si vamos a pintar el spawn del ogro, destruimos el anterior primero.
      if (this.pincelActual === 'suelo-ogro') {
        this.limpiarInstanciaUnica('suelo-ogro');
      }

      celda.terreno = this.pincelActual as TipoTerreno;
      
      // LÓGICA DE ROTACIÓN: El suelo y el suelo roto rotan aleatoriamente.
      if (celda.terreno === 'suelo' || celda.terreno === 'sueloroto') {
        celda.rotacionTerreno = this.obtenerRotacionAleatoria();
      } else {
        celda.rotacionTerreno = 0; 
      }
      
      if (celda.terreno === 'vacio') {
        celda.objeto = 'ninguno'; 
      }
    } else if (this.tipoPincel === 'objeto') {
      if (celda.terreno === 'suelo') {
        celda.objeto = this.pincelActual as TipoObjeto;
      }
    }
    this.calcularFilos();
  }

  inicializarEditor() {
    if (this.inputTotalNiveles < 1) this.inputTotalNiveles = 1;
    if (this.inputTotalNiveles > 10) this.inputTotalNiveles = 10;
    
    this.totalNiveles = this.inputTotalNiveles;
    this.editorInicializado = true;
    this.nivelActual = 1;
    this.cargarNivelEnPantalla(1);
  }

  navegarNivel(direccion: number) {
    const nuevoNivel = this.nivelActual + direccion;
    if (nuevoNivel >= 1 && nuevoNivel <= this.totalNiveles) {
      this.cargarNivelEnPantalla(nuevoNivel);
    }
  }

  cargarNivelEnPantalla(nuevoNivel: number) {
    // 1. Guardar el progreso del nivel actual (si ya estábamos editando uno)
    if (this.nivelActual > 0 && this.tablero.length > 0) {
      this.borradoresNiveles[this.nivelActual] = {
        columnas: this.columnas,
        filasEditables: this.inputFilas,
        tablero: JSON.parse(JSON.stringify(this.tablero))
      };
    }

    // 2. Actualizar el indicador al nuevo nivel
    this.nivelActual = nuevoNivel;

    // 3. Cargar desde memoria o generar lienzo en blanco
    const borrador = this.borradoresNiveles[nuevoNivel];
    if (borrador) {
      this.inputColumnas = borrador.columnas;
      this.inputFilas = borrador.filasEditables;
      this.columnas = borrador.columnas;
      this.tablero = JSON.parse(JSON.stringify(borrador.tablero));
      this.forzarRecalculoFisico();
    } else {
      this.aplicarDimensiones(); // Genera matriz nueva
    }
  }

  forzarRecalculoFisico() {
    this.isResizing = true;
    clearTimeout(this.resizeTimeout);

    // 1. Cálculos de la cuadrícula principal
    this.cdr.detectChanges(); 
    const rect = this.contenedorRef.nativeElement.getBoundingClientRect();
    this.calcularTamanioTablero(rect.width, rect.height);
    this.cdr.detectChanges(); 

    // 2. DEBOUNCE: Esperamos 200ms a que el usuario termine de hacer Zoom/Resize
    this.resizeTimeout = setTimeout(() => {
      
      // FIX CRÍTICO: Medimos la celda una vez que el CSS terminó de pintarla
      const celdaDOM = document.querySelector('.celda');
      if (celdaDOM) {
        this.tamanioCelda = celdaDOM.getBoundingClientRect().width;
      }
      
      this.isResizing = false;
      this.cdr.detectChanges(); // Angular actualiza el tamaño del Ogro con la medida perfecta
    }, 200);
  }

  @HostListener('window:resize')
  alCambiarTamanioVentana() {
    // Si no estamos jugando, el CSS Grid se encarga solo. No hacemos nada.
    if (!this.jugando) return; 

    this.isResizing = true;
    clearTimeout(this.resizeTimeout);

    // DEBOUNCE: Esperamos 200ms a que termine el redimensionamiento/zoom
    this.resizeTimeout = setTimeout(() => {
      const celdaDOM = document.querySelector('.celda');
      if (celdaDOM) {
        this.tamanioCelda = celdaDOM.getBoundingClientRect().width;
      }
      this.isResizing = false;
      this.cdr.detectChanges();
    }, 200);
  }

  getImagenOgro(): string {
    if (!this.ogro) return '';
    const ruta = '/assets/images/aventura/nivel1/ogro/';
    
    if (this.ogro.estado === 'feliz') return ruta + 'ogrofeliz.png';
    if (this.ogro.estado === 'cayendo') return ruta + 'ogrocayendo.png';
    
    if (this.ogro.estado === 'aturdido') {
      // FIX: Corregido a 'ogrotuardido'
      return ruta + (this.ogro.frameActual === 1 ? 'ogrotuardido1.png' : 'ogrotuardido2.png');
    }

    // Estado: Caminando o Idle
    if (this.ogro.direccion === 'arriba') return ruta + `ogroespalda${this.ogro.frameActual}.png`;
    if (this.ogro.direccion === 'izquierda' || this.ogro.direccion === 'derecha') return ruta + `ogrolado${this.ogro.frameActual}.png`;
    
    // Abajo (por defecto)
    return ruta + `ogrocamino${this.ogro.frameActual}.png`;
  }

  aplicarDimensiones() {
    if (this.inputColumnas < 2) this.inputColumnas = 2;
    if (this.inputColumnas > 10) this.inputColumnas = 10;
    if (this.inputFilas < 2) this.inputFilas = 2;
    if (this.inputFilas > 5) this.inputFilas = 5; // LÍMITE ESTRICTO CORREGIDO

    this.columnas = this.inputColumnas;
    const filasTotales = this.inputFilas + 2; // +1 Zona Sup, +1 Zona Inf

    this.tablero = Array(filasTotales).fill(null).map((_, y) => 
      Array(this.columnas).fill(null).map((_, x) => {
        let tipoZona: 'superior' | 'editable' | 'inferior' = 'editable';
        if (y === 0) tipoZona = 'superior';
        else if (y === filasTotales - 1) tipoZona = 'inferior';

        return { 
          x, y, 
          zona: tipoZona, 
          terreno: 'vacio', 
          objeto: 'ninguno', 
          tieneFilo: false, 
          rotacionTerreno: this.obtenerRotacionAleatoria(),
          estadoAnimacion: 'normal'
        };
      })
    );
    
    // CRÍTICO: Disparamos la medición manual para evitar rectángulos deformes
    this.forzarRecalculoFisico();
  }

  validarIntegridadNiveles(): string | null {
    const nivelesIncompletos: number[] = [];

    for (let i = 1; i <= this.totalNiveles; i++) {
      // Revisamos el tablero actual o lo buscamos en la caché
      const matriz = (i === this.nivelActual) ? this.tablero : this.borradoresNiveles[i]?.tablero;
      let tieneSpawn = false;
      let tieneMeta = false;

      if (matriz) {
        for (const fila of matriz) {
          for (const celda of fila) {
            if (celda.terreno === 'suelo-ogro') tieneSpawn = true;
            if (celda.terreno === 'salida' || celda.terreno === 'meta-ogro') tieneMeta = true;
          }
        }
      }
      
      // Si el nivel no ha sido visitado/generado o le faltan elementos obligatorios
      if (!matriz || !tieneSpawn || !tieneMeta) {
        nivelesIncompletos.push(i);
      }
    }

    if (nivelesIncompletos.length > 0) {
      if (nivelesIncompletos.length <= 3) {
        return `Falta el Spawn del Ogro o la Meta en los niveles: ${nivelesIncompletos.join(', ')}.`;
      } else {
        return `Falta el Spawn del Ogro o la Meta en varios niveles.`;
      }
    }
    
    return null; // Todo está correcto
  }

  alternarModoJuego() {
    if (!this.jugando) {
      // 1. Validar antes de jugar
      const errorValidacion = this.validarIntegridadNiveles();
      if (errorValidacion) {
        this.notificationService.show(`ERROR DE INTEGRIDAD: ${errorValidacion}`, 'error');
        console.error('No se puede jugar:', errorValidacion);
        return;
      }

      // PATRÓN MEMENTO: Tomamos una copia profunda (Deep Copy) desvinculada de la memoria
      this.tableroSnapshot = JSON.parse(JSON.stringify(this.tablero));
      this.cofresSnapshot = this.cofresRecolectados;

      // 2. Buscar el Spawn en el nivel actual
      let spawnX = 0;
      let spawnY = 0;
      for (const fila of this.tablero) {
        for (const celda of fila) {
          if (celda.terreno === 'suelo-ogro') {
            spawnX = celda.x;
            spawnY = celda.y;
          }
        }
      }

      // 3. Inicializar al Ogro
      this.ogro = {
        x: spawnX,
        y: spawnY,
        direccion: 'abajo',
        estado: 'idle',
        frameActual: 1
      };

      this.jugando = true;
      this.modoEditor = false; // Apagamos el panel de Dev Tools

      // FIX CRÍTICO: Forzar el cálculo del tamaño exactamente al entrar al juego
      setTimeout(() => {
        const celdaDOM = document.querySelector('.celda');
        if (celdaDOM) {
          this.tamanioCelda = celdaDOM.getBoundingClientRect().width;
          this.cdr.detectChanges();
        }
      }, 50); 
    } else {
      // Volver al editor (RUTINA DE LIMPIEZA)
      this.jugando = false;
      this.modoEditor = true;
      this.restaurarEstadoOriginal(); // Llama a la función centralizada
    }
  }

  restaurarEstadoOriginal() {
    if (this.stunTimeout) clearTimeout(this.stunTimeout);
    if (this.stunAnimationInterval) clearInterval(this.stunAnimationInterval);
    if (this.shakeTimeout) clearTimeout(this.shakeTimeout);
    if (this.recoverTimeout) clearTimeout(this.recoverTimeout);
    this.isShaking = false;
    this.isRecovering = false;
    this.colaComandos = [];
    this.ejecutandoComandos = false;

    // — RESETEAR MÉTRICAS DE RENDIMIENTO —
    this.tiempoInicioMs = 0;
    this.contadorIntentos = 0;
    
    // 1. Restauramos mapa
    if (this.tableroSnapshot && this.tableroSnapshot.length > 0) {
      this.tablero = JSON.parse(JSON.stringify(this.tableroSnapshot));
      this.calcularFilos();
    }
    
    // 2. Restauramos contadores
    this.cofresRecolectados = this.cofresSnapshot;
    this.vidasActuales = this.maxVidas;

    // 3. NUEVO: Limpieza de la Interfaz (Pergamino)
    this.codigoUsuario = '';
    if (this.layoutJuego) {
      this.layoutJuego.limpiarTodo();
      this.layoutJuego.resetearInventario(); // Restaura pociones en la baraja
    }
    
    // 4. NUEVO: Restauración de Inventario (Pociones HUD)
    this.efectoCuracionActivo = false;
  }

  esperar(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async moverOgroUnPaso(direccion: 'arriba' | 'abajo' | 'izquierda' | 'derecha'): Promise<boolean> {
    if (!this.ogro) return false;

    // 1. Calcular Coordenadas Futuras
    let futuroX = this.ogro.x;
    let futuroY = this.ogro.y;

    if (direccion === 'arriba') futuroY--;
    if (direccion === 'abajo') futuroY++;
    if (direccion === 'izquierda') futuroX--;
    if (direccion === 'derecha') futuroX++;

    // 2. Validación de Límites del Mapa (Prevenir desbordamiento de Array)
    if (futuroY < 0 || futuroY >= this.tablero.length || futuroX < 0 || futuroX >= this.tablero[0].length) {
      return false; // Bloquea salir del mapa
    }

    // --- FASE DE ANTICIPACIÓN (Mirar antes de caminar) ---
    if (this.ogro.direccion !== direccion || this.ogro.estado === 'idle') {
      this.ogro.direccion = direccion;
      this.ogro.estado = 'idle'; // Mantiene los pies juntos
      this.cdr.detectChanges(); // Fuerza a Angular a pintar el Ogro mirando a la nueva dirección
      await this.esperar(500);  // Pausa medio segundo (Anticipación)
    }

    const celdaActual = this.tablero[this.ogro.y][this.ogro.x];
    const celdaDestino = this.tablero[futuroY][futuroX];

    // 3. Detección de Colisión Infranqueable (Rocas)
    if (celdaDestino.objeto === 'roca') {
      this.ogro.direccion = direccion; // Voltea a ver la roca
      this.ogro.estado = 'aturdido';
      
      // Asignar primer frame de mareo INMEDIATAMENTE
      this.ogro.frameActual = 1;
      this.toggleAturdido = true;
      
      // Animación de temblor en la roca
      this.provocarColisionObjeto(celdaDestino); 
      
      // DISPARAR EFECTOS VISUALES INICIALES SIEMPRE (sin importar el suelo)
      if (this.shakeTimeout) clearTimeout(this.shakeTimeout);
      if (this.stunAnimationInterval) clearInterval(this.stunAnimationInterval);
      
      this.isShaking = true;
      this.shakeTimeout = setTimeout(() => {
        this.isShaking = false;
        this.cdr.detectChanges();
      }, 1500);
      
      // Iniciamos el parpadeo de la animación cada 300ms
      this.stunAnimationInterval = setInterval(() => {
          this.toggleAturdido = !this.toggleAturdido;
          if (this.ogro) {
            this.ogro.frameActual = this.toggleAturdido ? 1 : 2;
            this.cdr.detectChanges();
          }
      }, 300);
      
      this.cdr.detectChanges();
      
      // STUN RECOVERY: Evaluar suelo en el que estamos parados (celdaActual)
      if (celdaActual.terreno !== 'sueloroto' && celdaActual.terreno !== 'vacio' && celdaActual.terreno !== 'suelo') {
        // Suelo firme: Iniciar recuperación a largo plazo
        if (this.stunTimeout) clearTimeout(this.stunTimeout);

        this.stunTimeout = setTimeout(() => {
          clearInterval(this.stunAnimationInterval);
          if (this.ogro) {
            this.ogro.estado = 'idle';
            this.ogro.frameActual = 1;
          }
          this.ejecutandoComandos = false; // Desbloquea la consola
          
          this.isRecovering = true;
          if (this.recoverTimeout) clearTimeout(this.recoverTimeout);
          this.recoverTimeout = setTimeout(() => {
            this.isRecovering = false;
            this.cdr.detectChanges();
          }, 800);
          
          this.cdr.detectChanges();
        }, 3000);
      } else {
        // Suelo frágil: Se mantendrá aturdido.
        // Hacemos una pausa equivalente al antiguo bucle for para que el usuario vea el temblor
        // antes de que procesarColaComandos() ceda el control y el suelo colapse.
        await this.esperar(600); // 4 * 150ms
      }

      return false; // Retorna falso porque NO pudo avanzar
    }

    // --- HOOK DE SALIDA ---
    // Si salimos de un suelo roto, colapsa a nuestras espaldas
    if (celdaActual.terreno === 'sueloroto') {
      this.provocarColapsoSuelo(celdaActual);
    }

    // --- HOOK DE ENTRADA ---
    if (celdaDestino.objeto === 'cofre') {
      celdaDestino.objeto = 'ninguno';
      this.cofresRecolectados++;
      // Opcional: Emitir sonido de recolección de moneda
    }

    if (celdaDestino.terreno === 'sueloroto') {
      celdaDestino.estadoAnimacion = 'temblando';
    }

    // 4. Si el camino está libre (o es abismo/cofre/meta), Ejecutar Movimiento
    this.ogro.direccion = direccion;
    this.ogro.estado = 'caminando';
    
    // Intercalar frame de las piernas para simular el paso
    this.ogro.frameActual = this.ogro.frameActual === 1 ? 2 : 1;
    
    // Actualizar coordenadas matemáticas
    this.ogro.x = futuroX;
    this.ogro.y = futuroY;
    this.cdr.detectChanges();

    // Sincronizar el hilo asíncrono con el CSS
    await this.esperar(this.retrasoPasoMs);
    
    // HOOK POST-MOVIMIENTO: Si pisó vacío, cae de inmediato
    if (celdaDestino.terreno === 'vacio') {
      await this.ejecutarCaidaVacio();
      return false; // Corta la ejecución de más comandos
    }
    
    return true; // Pudo avanzar exitosamente
  }

  async procesarColaComandos() {
    if (!this.ogro || this.colaComandos.length === 0 || this.ejecutandoComandos) return;
    
    this.ejecutandoComandos = true;

    while (this.colaComandos.length > 0 && this.ogro.estado !== 'cayendo' && this.ogro.estado !== 'aturdido') {
      const comandoActual = this.colaComandos.shift() as 'arriba' | 'abajo' | 'izquierda' | 'derecha';
      
      // Intentamos dar un paso. Si retorna false (chocó con roca), rompemos el bucle
      const pasoExitoso = await this.moverOgroUnPaso(comandoActual);
      
      if (!pasoExitoso) {
        // Si chocó, vaciamos la cola restante y cancelamos
        this.colaComandos = [];
        break;
      }
      
      // Pequeña pausa entre pasos para mayor fluidez
      await this.esperar(50);
    }

    // --- EVALUACIÓN DE FIN DE TRAYECTO ---
    const celdaFinal = this.tablero[this.ogro.y][this.ogro.x];

    // Si no está ya cayendo, evaluamos dónde detuvo su peso muerto
    if (this.ogro.estado !== 'cayendo') {
      
      if (celdaFinal.terreno === 'meta-ogro') {
        this.ogro.estado = 'feliz';
        this.cdr.detectChanges();

        // — GUARDAR PROGRESO EN EL BACKEND —
        // Solo guardamos progreso en el modo jugador (no en el editor del profesor)
        if (!this.esModoProfesor) {
          const tiempoTotal = this.tiempoInicioMs > 0
            ? Math.floor((Date.now() - this.tiempoInicioMs) / 1000)
            : 0;

          const aulaActiva = localStorage.getItem('aulaActiva');

          this.progresoService.guardarProgreso({
            reto_nivel_id: 1, // Nivel 1: El Ogro
            tiempo_segundos: tiempoTotal,
            intentos: this.contadorIntentos,
            codigo_solucion: this.codigoUsuario,
            aula_id: aulaActiva ? aulaActiva : undefined,
            reto_personalizado_id: (this as any).retoActualId
          }).subscribe({
            next: (respuesta) => {
              // Limpiar aulaActiva tras completarlo
              localStorage.removeItem('aulaActiva');
              
              // Mensaje personalizado según si es la primera vez
              const emoji = respuesta.estrellas_obtenidas === 3 ? '⭐⭐⭐' :
                            respuesta.estrellas_obtenidas === 2 ? '⭐⭐' : '⭐';
              const msg = respuesta.es_primera_vez
                ? `¡Felicidades! Obtuviste ${emoji} y ahora tienes ${respuesta.estrellas_totales_usuario} estrellas.`
                : `¡Bien! Mejor puntaje actualizado. Tienes ${respuesta.estrellas_totales_usuario} estrellas en total.`;
              this.estrellasObtenidasEmoji = emoji;
              this.mensajePuntaje = msg;
              this.calcularEstrellas();
              this.pantallaNivelCompletado = true;
            },
            error: () => {
              // Si la petición falla, avisamos pero no rompemos el juego
              this.notificationService.show('Progreso guardado (sin respuesta del servidor)', 'success');
              this.estrellasObtenidasEmoji = '⭐';
              this.mensajePuntaje = '¡Has completado la aventura!';
              this.calcularEstrellas();
              this.pantallaNivelCompletado = true;
            }
          });
        } else {
          this.notificationService.show('¡El Ogro llegó al cofre! El nivel funciona correctamente.', 'success');
        }
        
      } else if (celdaFinal.terreno === 'salida') {
        await this.ejecutarTransicionMeta();
        
      } else if (celdaFinal.terreno === 'suelo' || celdaFinal.terreno === 'sueloroto') {
        // La tierra empieza a temblar/romperse. El ogro sigue aturdido durante este tiempo si chocó.
        this.provocarColapsoSuelo(celdaFinal);
        await this.esperar(1200); // Esperamos a que la tierra desaparezca

        // HARD RESET (Inyectado justo antes de caer, después de que el suelo desaparece)
        this.isShaking = false;
        this.isRecovering = false;
        if (this.shakeTimeout) clearTimeout(this.shakeTimeout);
        if (this.stunTimeout) clearTimeout(this.stunTimeout);
        if (this.recoverTimeout) clearTimeout(this.recoverTimeout);
        if (this.stunAnimationInterval) clearInterval(this.stunAnimationInterval);

        // IMPORTANTE: Limpiar el estado y la imagen antes de llamar a ejecutarCaidaVacio()
        this.ogro.estado = 'cayendo'; // Fuerza salir de 'aturdido'

        await this.ejecutarCaidaVacio();
        
      } else if (this.ogro.estado !== 'aturdido') {
        this.ogro.estado = 'idle';
        this.ogro.frameActual = 1;
      }
    }
    this.cdr.detectChanges();
    
    // Desbloquear la consola solo si no estamos aturdidos sobre suelo firme
    if (this.ogro.estado !== 'aturdido' || celdaFinal.terreno === 'suelo' || celdaFinal.terreno === 'sueloroto') {
      this.ejecutandoComandos = false;
    }
  }

  async ejecutarCaidaVacio() {
    this.ogro.estado = 'cayendo';
    this.cdr.detectChanges();
    
    await this.esperar(1000); // 1 segundo de animación CSS de caída al abismo
    
    this.vidasActuales--;
    
    if (this.vidasActuales <= 0) {
      this.pantallaGameOver = true;
      this.cdr.detectChanges();
    } else {
      this.reaparecerOgro();
    }
  }

  reiniciarNivelGameOver() {
    if (this.stunTimeout) clearTimeout(this.stunTimeout);
    if (this.stunAnimationInterval) clearInterval(this.stunAnimationInterval);
    if (this.shakeTimeout) clearTimeout(this.shakeTimeout);
    if (this.recoverTimeout) clearTimeout(this.recoverTimeout);
    this.isShaking = false;
    this.isRecovering = false;
    this.nivelActual = 1;
    this.vidasActuales = this.maxVidas;
    this.cofresRecolectados = 0;
    
    if (this.layoutJuego) {
      this.layoutJuego.resetearInventario();
    }

    // 1. FIX OFF-BY-ONE: Asegurar que leemos el nivel correcto. 
    let nivelData = null;
    if (Array.isArray(this.borradoresNiveles)) {
      nivelData = this.borradoresNiveles.find(n => n.idNivel === 1) || this.borradoresNiveles[0];
    } else {
      nivelData = this.borradoresNiveles[1];
    }

    if (nivelData) {
      this.columnas = nivelData.columnas;
      this.inputFilas = nivelData.filasEditables || nivelData.filas;
      this.tablero = JSON.parse(JSON.stringify(nivelData.matriz || nivelData.tablero));
      
      // 2. FIX COFRES FANTASMA: Resetear a 0 antes de recalcular el máximo (la lógica getter ya lo hace, pero limpiamos las referencias residuales)
      this.cofresSnapshot = 0;
      
      this.colaComandos = [];
      this.codigoUsuario = '';
      if (this.layoutJuego) {
        this.layoutJuego.limpiarTodo();
      }
      
      this.tableroSnapshot = JSON.parse(JSON.stringify(this.tablero));

      // Actualizar el DOM de Angular
      this.pantallaGameOver = false;
      this.jugando = true;
      this.cdr.detectChanges(); 

      // 3. FIX EVENT LOOP: Ceder el hilo para que Chrome dibuje el Grid nuevo ANTES de medirlo
      setTimeout(() => {
        this.forzarRecalculoFisico();
        this.calcularFilos();
        this.reaparecerOgro();
        this.cdr.detectChanges();
      }, 50); // 50ms garantiza que el Paint del navegador haya finalizado
      
    } else {
      console.error('No se encontró el Nivel 1 en la caché para el Hard Reset');
      this.pantallaGameOver = false;
      this.jugando = true;
      this.cdr.detectChanges();
    }
  }



  salirMenuPrincipal() {
    this.pantallaGameOver = false;
    this.router.navigate(['/pantalla-principal']);
  }

  volverAlAula() {
    this.pantallaNivelCompletado = false;
    this.router.navigate(['/pantalla-principal']);
  }

  reaparecerOgro() {
    if (this.stunTimeout) clearTimeout(this.stunTimeout);
    if (this.stunAnimationInterval) clearInterval(this.stunAnimationInterval);
    if (this.shakeTimeout) clearTimeout(this.shakeTimeout);
    if (this.recoverTimeout) clearTimeout(this.recoverTimeout);
    this.isShaking = false;
    this.isRecovering = false;
    
    // 1. Restaurar el mapa a su estado original (Deep Copy inversa)
    this.tablero = JSON.parse(JSON.stringify(this.tableroSnapshot));
    this.calcularFilos(); // Recalculamos los bordes 3D por si se rompió el suelo

    // 2. Castigo de Cofres y Feedback Visual
    if (this.cofresRecolectados > this.cofresSnapshot) {
      this.perdidaCofresEfecto = true;
      setTimeout(() => {
        this.perdidaCofresEfecto = false;
        this.cdr.detectChanges();
      }, 1500); // El contador parpadea en rojo por 1.5s
    }
    this.cofresRecolectados = this.cofresSnapshot;

    // 3. Limpieza del motor
    this.colaComandos = []; // Vaciamos la cola para que no siga moviéndose

    // 4. Buscar el Spawn en el mapa restaurado
    let spawnX = 0, spawnY = 0;
    for (const fila of this.tablero) {
      for (const celda of fila) {
        if (celda.terreno === 'suelo-ogro') { spawnX = celda.x; spawnY = celda.y; }
      }
    }
    
    this.ogro.x = spawnX;
    this.ogro.y = spawnY;
    this.ogro.estado = 'idle';
    this.ogro.direccion = 'abajo';
    
    // Frames de Invulnerabilidad
    this.ogroParpadeando = true;
    this.cdr.detectChanges();
    
    setTimeout(() => {
      this.ogroParpadeando = false;
      this.cdr.detectChanges();
    }, 2500); // Parpadea por 2.5 segundos
  }

  async ejecutarTransicionMeta() {
    this.transicionPantallaNegra = true;
    this.cdr.detectChanges();
    
    await this.esperar(1000); // Esperamos el Fade to Black
    
    // 1. Avanzar al siguiente nivel lógicamente
    this.nivelActual++;

    // 2. Cargar el mapa del nuevo nivel en la memoria principal
    let nivelData = null;
    if (Array.isArray(this.borradoresNiveles)) {
      nivelData = this.borradoresNiveles.find(n => n.idNivel === this.nivelActual) || this.borradoresNiveles[this.nivelActual - 1];
    } else {
      nivelData = this.borradoresNiveles[this.nivelActual];
    }

    if (nivelData) {
      // Actualización de datos en la memoria
      this.columnas = nivelData.columnas;
      this.inputFilas = nivelData.filasEditables || nivelData.filas;
      this.tablero = JSON.parse(JSON.stringify(nivelData.matriz || nivelData.tablero));
      
      this.colaComandos = [];
      this.codigoUsuario = '';
      
      // Purgar el pergamino real (consola) para el siguiente nivel
      if (this.layoutJuego) {
        this.layoutJuego.limpiarTodo();
      }

      // Actualizar el Snapshot del Patrón Memento para las muertes
      this.tableroSnapshot = JSON.parse(JSON.stringify(this.tablero));
      this.cofresSnapshot = this.cofresRecolectados;

      // Forzar a Angular a pintar el DOM primero
      this.transicionPantallaNegra = false;
      this.cdr.detectChanges();

      // Ceder el hilo para permitir el "Reflow" del navegador antes de medir
      setTimeout(() => {
        this.forzarRecalculoFisico();
        this.calcularFilos();
        
        // Encontrar el nuevo punto de Spawn
        let nuevoSpawnX = 0;
        let nuevoSpawnY = 0;
        for (const fila of this.tablero) {
          for (const celda of fila) {
            if (celda.terreno === 'suelo-ogro') { 
              nuevoSpawnX = celda.x; 
              nuevoSpawnY = celda.y; 
            }
          }
        }

        // Teletransportar y resetear al Ogro
        this.ogro.x = nuevoSpawnX;
        this.ogro.y = nuevoSpawnY;
        this.ogro.estado = 'idle';
        this.ogro.direccion = 'abajo';
        
        this.cdr.detectChanges();
      }, 50);

    } else {
      // Lógica al completar la aventura
      this.nivelActual--;
      this.transicionPantallaNegra = false;
      this.cdr.detectChanges();
      return;
    }
  }

  agregarComando(direccion: 'arriba' | 'abajo' | 'izquierda' | 'derecha') {
    if (this.ejecutandoComandos || !this.jugando) return;
    this.colaComandos.push(direccion);
  }

  ejecutarComandos() {
    if (this.colaComandos.length > 0) {
      this.procesarColaComandos();
    }
  }

  calcularEstrellas() {
    let estrellas = 0;
    
    // 1ra Estrella: Completar el nivel
    estrellas++; 
    
    // 2da Estrella: Todos los cofres
    if (this.cofresRecolectados >= this.totalCofresNivel) {
      estrellas++;
    }
    
    // 3ra Estrella: Código puro (Sin tarjetas ni pociones)
    if (!this.ayudasUsadas) {
      estrellas++;
    }
    
    this.estrellasFinales = estrellas;
    // Creamos un array del tamaño de las estrellas ganadas para el *ngFor
    this.arrayEstrellas = Array(this.estrellasFinales).fill(0);
    
    // TODO futuro: Enviar this.estrellasFinales al Backend
  }

  compilarYEjecutar(codigoDesdeEditor?: string) {
    if (codigoDesdeEditor !== undefined) {
      this.codigoUsuario = codigoDesdeEditor;
    }

    // 1. Validaciones Iniciales
    if (!this.jugando) {
      this.notificationService.show('Debes pulsar \'Probar Nivel\' antes de ejecutar código.');
      return;
    }
    if (this.ejecutandoComandos) return; // Evita doble ejecución

    // 2. Limpieza de Memoria y Preparación
    this.colaComandos = [];
    const lineas = this.codigoUsuario.split('\n');
    let errorDeSintaxis = false;
    let lineaConError = -1;

    // — INICIAR CONTADOR DE TIEMPO Y INTENTOS —
    if (this.tiempoInicioMs === 0) {
      this.tiempoInicioMs = Date.now(); // Solo arrancamos el reloj en el PRIMER intento
    }
    this.contadorIntentos++;

    // 3. Diccionario Léxico (Mapeo de Funciones)
    const sintaxisValida: { [key: string]: 'arriba' | 'abajo' | 'izquierda' | 'derecha' } = {
      'ogro.caminarArriba()': 'arriba',
      'ogro.caminarAbajo()': 'abajo',
      'ogro.caminarIzquierda()': 'izquierda',
      'ogro.caminarDerecha()': 'derecha'
    };

    // 4. Análisis Línea por Línea
    for (let i = 0; i < lineas.length; i++) {
      // Limpiamos espacios en blanco extra al inicio y final de la línea
      const comandoLimpio = lineas[i].trim();
      
      if (comandoLimpio === '') continue; // Ignoramos líneas vacías

      // Verificamos si el comando escrito existe en nuestro diccionario
      if (sintaxisValida[comandoLimpio]) {
        this.colaComandos.push(sintaxisValida[comandoLimpio]);
      } else {
        // Si no existe, es un Error de Compilación
        errorDeSintaxis = true;
        lineaConError = i + 1; // Las líneas en un editor empiezan en 1
        break;
      }
    }

    // 5. Resolución
    if (errorDeSintaxis) {
      this.colaComandos = []; // Vaciamos la cola para no ejecutar código roto
      this.notificationService.show(`Error de compilación en la línea ${lineaConError}. Revisa tu sintaxis.`, 'error');
    } else if (this.colaComandos.length > 0) {
      // Si el análisis fue exitoso, arrancamos el motor físico
      this.procesarColaComandos();
    }
  }

  guardarNivelOficial() {
    // 1. VALIDACIÓN ESTRICTA
    const errorValidacion = this.validarIntegridadNiveles();
    if (errorValidacion) {
      this.notificationService.show(`ERROR DE INTEGRIDAD: ${errorValidacion}`, 'error');
      return;
    }

    // 2. EXPORTACIÓN NORMAL
    if (this.nivelActual < 1) this.nivelActual = 1;
    if (this.nivelActual > 10) this.nivelActual = 10;

    // Hacemos una copia profunda de seguridad del nivel actual antes de exportar
    if (!this.borradoresNiveles) this.borradoresNiveles = {};
    this.borradoresNiveles[this.nivelActual] = {
      tablero: JSON.parse(JSON.stringify(this.tablero)),
      filasEditables: this.inputFilas,
      columnas: this.columnas
    };

    // 2. Construir el objeto de Campaña
    const campanaExportar = {
      totalNiveles: this.totalNiveles,
      niveles: [] as any[]
    };

    // 3. Iterar y poblar la campaña con todos los borradores
    for (let i = 1; i <= this.totalNiveles; i++) {
      if (this.borradoresNiveles[i]) {
        campanaExportar.niveles.push({
          idNivel: i,
          filasEditables: this.borradoresNiveles[i].filasEditables,
          columnas: this.borradoresNiveles[i].columnas,
          matriz: this.borradoresNiveles[i].tablero
        });
      }
    }
    
    const json = JSON.stringify(campanaExportar, null, 2);
    
    // 3. FEEDBACK VISUAL DE ÉXITO
    this.notificationService.show('¡Nivel exportado exitosamente! Revisa la consola.', 'success');
  }

  ngAfterViewInit() {
    this.resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        // entry.contentRect descuenta el padding, dándonos el espacio real usable
        this.calcularTamanioTablero(entry.contentRect.width, entry.contentRect.height);
      }
      // CRÍTICO: Avisar a Angular que los valores en píxeles cambiaron
      this.cdr.detectChanges(); 
    });
    // Observamos la caja negra contenedora
    this.resizeObserver.observe(this.contenedorRef.nativeElement);
  }

  ngOnDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.stunTimeout) {
      clearTimeout(this.stunTimeout);
    }
    if (this.stunAnimationInterval) {
      clearInterval(this.stunAnimationInterval);
    }
    if (this.shakeTimeout) {
      clearTimeout(this.shakeTimeout);
    }
    if (this.recoverTimeout) {
      clearTimeout(this.recoverTimeout);
    }
  }

  calcularTamanioTablero(contenedorWidth: number, contenedorHeight: number) {
    // 1. ¿Cuánto espacio máximo tendría una celda si nos basamos en el ancho?
    const maxWidthPerCell = contenedorWidth / this.columnas;
    // 2. ¿Cuánto espacio máximo tendría si nos basamos en el alto?
    const maxHeightPerCell = contenedorHeight / this.filas;
    
    // 3. El tamaño de la celda debe ser el menor de los dos para que quepa y sea cuadrada.
    // Usamos Math.floor para evitar píxeles fraccionarios que difuminan el pixel-art.
    const tamanioCelda = Math.floor(Math.min(maxWidthPerCell, maxHeightPerCell));
    
    // 4. Asignamos el tamaño exacto en píxeles al tablero
    this.anchoTableroPx = tamanioCelda * this.columnas;
    this.altoTableroPx = tamanioCelda * this.filas;
  }

  generarTableroPrueba() {
    this.columnas = 5;
    const filas = 7; // 1 sup + 5 editables + 1 inf
    
    this.tablero = Array(filas).fill(null).map((_, y) => 
      Array(this.columnas).fill(null).map((_, x) => {
        let tipoZona: 'superior' | 'editable' | 'inferior' = 'editable';
        if (y === 0) tipoZona = 'superior';
        else if (y === filas - 1) tipoZona = 'inferior';

        return {
          x: x, y: y,
          zona: tipoZona,
          terreno: 'vacio',
          objeto: 'ninguno',
          tieneFilo: false,
          rotacionTerreno: this.obtenerRotacionAleatoria(),
          estadoAnimacion: 'normal'
        };
      })
    );
  }

  // Getter para usarlo en el HTML
  get filas(): number { return this.tablero.length; }

  calcularFilos() {
    for (let y = 0; y < this.tablero.length; y++) {
      for (let x = 0; x < this.tablero[y].length; x++) {
        const casilla = this.tablero[y][x];
        casilla.tieneFilo = false; // Reset
        if (casilla.terreno === 'suelo' || casilla.terreno === 'sueloroto' || casilla.terreno === 'suelo-ogro') {
          // Revisar la casilla de abajo
          const abajoVacio = (y + 1 >= this.tablero.length) || (this.tablero[y + 1][x].terreno === 'vacio');
          if (abajoVacio) {
            casilla.tieneFilo = true;
          }
        }
      }
    }
  }

  provocarTemblorContinuo(celda: Casilla) {
    if (celda.terreno !== 'sueloroto') return;
    
    // Si ya está temblando, lo colapsamos (para probar el flujo completo)
    if (celda.estadoAnimacion === 'temblando') {
      this.provocarColapsoSuelo(celda); 
    } else {
      celda.estadoAnimacion = 'temblando';
    }
  }

  provocarColapsoSuelo(celda: Casilla) {
    // Modifica el IF inicial de la función:
    if ((celda.terreno !== 'suelo' && celda.terreno !== 'sueloroto') || celda.estadoAnimacion === 'colapsando') return;
    
    celda.estadoAnimacion = 'colapsando';
    
    // La animación dura 1.2s. Al terminar, la celda se destruye físicamente en los datos.
    setTimeout(() => {
      celda.terreno = 'vacio';
      celda.estadoAnimacion = 'normal';
      // Al recalcular, el filo desaparecerá automáticamente si existía
      this.calcularFilos(); 
    }, 1200);
  }

  provocarColisionObjeto(celda: Casilla) {
    // Regla: Solo la roca reacciona a choques por ahora
    if (celda.objeto !== 'roca' || celda.estadoAnimacion !== 'normal') return;
    
    celda.estadoAnimacion = 'colision';
    
    // El impacto es rápido y seco (300ms). Luego la roca vuelve a la normalidad.
    setTimeout(() => {
      celda.estadoAnimacion = 'normal';
    }, 300);
  }

  recolectarTesoro(celda: Casilla) {
    if (celda.objeto !== 'cofre') return;
    
    // Aquí a futuro emitiremos un evento para sumar puntos al jugador
    // Por ahora, simplemente eliminamos el objeto y su aura desaparece con él.
    celda.objeto = 'ninguno';
  }

  probarInteraccion(event: MouseEvent, celda: Casilla) {
    event.preventDefault(); // Evita que salga el menú del navegador
    if (!this.modoEditor) return;
    
    // Prioridades de interacción:
    if (celda.objeto === 'roca') {
      this.provocarColisionObjeto(celda);
    } else if (celda.objeto === 'cofre') {
      this.recolectarTesoro(celda); // NUEVO: Probar recoger el cofre
    } else if (celda.terreno === 'sueloroto') {
      this.provocarTemblorContinuo(celda); // NUEVO: Prueba de suelo frágil
    } else if (celda.terreno === 'suelo') {
      this.provocarColapsoSuelo(celda);
    }
  }

  limpiarInstanciaUnica(tipoTerreno: string) {
    for (const fila of this.tablero) {
      for (const celda of fila) {
        if (celda.terreno === tipoTerreno) {
          celda.terreno = 'vacio';
          celda.objeto = 'ninguno'; // Regla de limpieza en cascada
        }
      }
    }
  }

}
