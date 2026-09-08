import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GameHeaderComponent } from '../game-header/game-header.component';
import {
  AccionFabrica,
  FaseControlCalidad,
  FaseProduccionMasiva,
  ResultadoEvaluacionControlCalidad,
  ResultadoEvaluacionProduccionMasiva,
  TipoMaterialFabrica
} from '../motor-v2/evaluador-nivel';
import { MotorEjecucionService } from '../motor-v2/motor-ejecucion.service';
import {
  AulasService,
  ParametrosEvaluacion,
  RetoPersonalizadoResponse
} from '../services/aulas.service';
import { LoaderService } from '../services/loader.service';
import { ProgresoService } from '../services/progreso.service';

type TonoTarjeta = 'azul' | 'verde' | 'dorado' | 'violeta';
type EstadoEscena =
  | 'espera'
  | 'analizando'
  | 'transportando'
  | 'guardando'
  | 'destruyendo'
  | 'quemando'
  | 'fallo'
  | 'explosion'
  | 'victoria';
type EstadoMaterial = 'espera' | 'activo' | 'guardado' | 'destruido' | 'quemado' | 'error';
type ObjetoFabrica = 'libro' | 'clarividencia' | 'tiempo' | 'vida';

interface TarjetaControl {
  codigo: string;
  etiqueta: string;
  tipo: 'BUCLE MIENTRAS' | 'CONDICIÓN SI' | 'RAMA SINO SI' | 'RAMA SINO' | 'CIERRE' | 'DISTRACTOR';
  tono: TonoTarjeta;
}

interface MaterialTurno {
  id: number;
  tipo: TipoMaterialFabrica;
  estado: EstadoMaterial;
}

interface FaseNivelFabrica {
  numero: FaseControlCalidad | FaseProduccionMasiva;
  titulo: string;
  concepto: string;
  objetivo: string;
  pista: string;
  materiales: TipoMaterialFabrica[];
  tarjetas: TarjetaControl[];
}

@Component({
  selector: 'app-nivel-cuatro-prototipo',
  standalone: true,
  imports: [CommonModule, FormsModule, GameHeaderComponent],
  templateUrl: './nivel-cuatro-prototipo.component.html',
  styleUrls: [
    '../nivel-dos-prototipo/nivel-dos-prototipo.component.scss',
    './nivel-cuatro-prototipo.component.scss'
  ]
})
export class NivelCuatroPrototipoComponent implements OnInit, OnDestroy {
  readonly fasesBase: FaseNivelFabrica[] = [
    {
      numero: 1,
      titulo: 'Rescatar el diamante',
      concepto: 'SI · preguntar antes de actuar',
      objetivo: 'Llega un diamante. Elige la tarjeta que pregunta “¿es Diamante?” y, si la respuesta es sí, lo guarda.',
      pista: 'Busca la tarjeta “SI es Diamante → guardar”. SI ejecuta su acción únicamente cuando la pregunta es verdadera.',
      materiales: ['Diamante'],
      tarjetas: [
        {
          codigo: 'si (fabrica.materialActual == "Carbon") {\n  fabrica.guardar();\n}',
          etiqueta: 'SI es Carbón → guardar',
          tipo: 'DISTRACTOR',
          tono: 'dorado'
        },
        {
          codigo: 'si (fabrica.materialActual == "Explosivo") {\n  fabrica.guardar();\n}',
          etiqueta: 'SI es Explosivo → guardar',
          tipo: 'DISTRACTOR',
          tono: 'violeta'
        },
        {
          codigo: 'si (fabrica.materialActual == "Diamante") {\n  fabrica.guardar();\n}',
          etiqueta: 'SI es Diamante → guardar',
          tipo: 'CONDICIÓN SI',
          tono: 'azul'
        },
        {
          codigo: 'fabrica.guardar();',
          etiqueta: 'Guardar sin preguntar',
          tipo: 'DISTRACTOR',
          tono: 'verde'
        }
      ]
    },
    {
      numero: 2,
      titulo: 'Proteger el horno',
      concepto: 'SI / SINO · elegir entre dos caminos',
      objetivo: 'Pueden llegar explosivo o carbón. Primero detecta y destruye el explosivo; SINO, envía el carbón al horno.',
      pista: 'Inserta en este orden: “SI es Explosivo → destruir” y después “SINO → quemar lo restante”.',
      materiales: ['Carbon', 'Explosivo'],
      tarjetas: [
        {
          codigo: 'sino {\n  fabrica.guardar();\n}',
          etiqueta: 'SINO → guardar lo restante',
          tipo: 'DISTRACTOR',
          tono: 'azul'
        },
        {
          codigo: 'si (fabrica.materialActual == "Explosivo") {\n  fabrica.destruir();\n}',
          etiqueta: 'SI es Explosivo → destruir',
          tipo: 'CONDICIÓN SI',
          tono: 'dorado'
        },
        {
          codigo: 'si (fabrica.materialActual == "Carbon") {\n  fabrica.destruir();\n}',
          etiqueta: 'SI es Carbón → destruir',
          tipo: 'DISTRACTOR',
          tono: 'violeta'
        },
        {
          codigo: 'sino {\n  fabrica.quemar();\n}',
          etiqueta: 'SINO → quemar lo restante',
          tipo: 'RAMA SINO',
          tono: 'verde'
        }
      ]
    },
    {
      numero: 3,
      titulo: 'Abrir una tercera ruta',
      concepto: 'SINO SI · hacer una segunda pregunta',
      objetivo: 'Primero pregunta si es diamante y guárdalo. Si no lo era, usa SINO SI para detectar y destruir el explosivo.',
      pista: 'Inserta “SI es Diamante → guardar” y luego “SINO SI es Explosivo → destruir”.',
      materiales: ['Explosivo', 'Diamante'],
      tarjetas: [
        {
          codigo: 'sino si (fabrica.materialActual == "Diamante") {\n  fabrica.destruir();\n}',
          etiqueta: 'SINO SI es Diamante → destruir',
          tipo: 'DISTRACTOR',
          tono: 'dorado'
        },
        {
          codigo: 'si (fabrica.materialActual == "Diamante") {\n  fabrica.guardar();\n}',
          etiqueta: 'SI es Diamante → guardar',
          tipo: 'CONDICIÓN SI',
          tono: 'azul'
        },
        {
          codigo: 'si (fabrica.materialActual == "Explosivo") {\n  fabrica.destruir();\n}',
          etiqueta: 'Otro SI separado',
          tipo: 'DISTRACTOR',
          tono: 'verde'
        },
        {
          codigo: 'sino si (fabrica.materialActual == "Explosivo") {\n  fabrica.destruir();\n}',
          etiqueta: 'SINO SI es Explosivo → destruir',
          tipo: 'RAMA SINO SI',
          tono: 'violeta'
        }
      ]
    },
    {
      numero: 4,
      titulo: 'Turno de control total',
      concepto: 'SI / SINO SI / SINO · tres caminos',
      objetivo: 'Clasifica todo el lote: guarda diamantes, destruye explosivos y manda al horno el carbón restante.',
      pista: 'Orden: “SI es Diamante → guardar”, “SINO SI es Explosivo → destruir” y “SINO → quemar lo restante”.',
      materiales: ['Carbon', 'Diamante', 'Explosivo', 'Diamante', 'Carbon'],
      tarjetas: [
        {
          codigo: 'si (fabrica.materialActual == "Carbon") {\n  fabrica.destruir();\n}',
          etiqueta: 'SI es Carbón → destruir',
          tipo: 'DISTRACTOR',
          tono: 'dorado'
        },
        {
          codigo: 'sino si (fabrica.materialActual == "Explosivo") {\n  fabrica.destruir();\n}',
          etiqueta: 'SINO SI es Explosivo → destruir',
          tipo: 'RAMA SINO SI',
          tono: 'violeta'
        },
        {
          codigo: 'si (fabrica.materialActual == "Diamante") {\n  fabrica.guardar();\n}',
          etiqueta: 'SI es Diamante → guardar',
          tipo: 'CONDICIÓN SI',
          tono: 'azul'
        },
        {
          codigo: 'si (fabrica.materialActual == "Explosivo") {\n  fabrica.quemar();\n}',
          etiqueta: 'SI es Explosivo → quemar',
          tipo: 'DISTRACTOR',
          tono: 'dorado'
        },
        {
          codigo: 'sino {\n  fabrica.quemar();\n}',
          etiqueta: 'SINO → quemar lo restante',
          tipo: 'RAMA SINO',
          tono: 'verde'
        },
        {
          codigo: 'sino {\n  fabrica.guardar();\n}',
          etiqueta: 'SINO → guardar lo restante',
          tipo: 'DISTRACTOR',
          tono: 'violeta'
        }
      ]
    }
  ];

  readonly fasesProduccionMasiva: FaseNivelFabrica[] = [
    {
      numero: 1,
      titulo: 'Encender la producción continua',
      concepto: 'MIENTRAS · repetir una acción',
      objetivo: 'Hay varios diamantes. Haz que la fábrica repita “guardar” MIENTRAS todavía queden materiales en la cinta.',
      pista: 'Orden: “MIENTRAS queden materiales”, “SI es Diamante → guardar” y “FIN de MIENTRAS”.',
      materiales: ['Diamante', 'Diamante', 'Diamante'],
      tarjetas: [
        {
          codigo: 'si (fabrica.materialActual == "Diamante") {\n  fabrica.guardar();\n}',
          etiqueta: 'SI es Diamante → guardar',
          tipo: 'CONDICIÓN SI',
          tono: 'azul'
        },
        {
          codigo: 'mientras (fabrica.tieneMateriales == falso) {',
          etiqueta: 'MIENTRAS la cinta esté vacía',
          tipo: 'DISTRACTOR',
          tono: 'violeta'
        },
        {
          codigo: 'mientras (fabrica.tieneMateriales == verdadero) {',
          etiqueta: 'MIENTRAS queden materiales',
          tipo: 'BUCLE MIENTRAS',
          tono: 'dorado'
        },
        {
          codigo: '}',
          etiqueta: 'FIN de MIENTRAS',
          tipo: 'CIERRE',
          tono: 'verde'
        }
      ]
    },
    {
      numero: 2,
      titulo: 'Mantener el horno seguro',
      concepto: 'MIENTRAS + SI / SINO · repetir decisiones',
      objetivo: 'Repite la clasificación hasta vaciar la cinta: destruye cada explosivo y, SINO, quema el carbón.',
      pista: 'Orden: “MIENTRAS queden materiales”, “SI es Explosivo → destruir”, “SINO → quemar” y “FIN de MIENTRAS”.',
      materiales: ['Carbon', 'Explosivo', 'Carbon', 'Explosivo', 'Carbon'],
      tarjetas: [
        {
          codigo: 'sino {\n  fabrica.quemar();\n}',
          etiqueta: 'SINO → quemar lo restante',
          tipo: 'RAMA SINO',
          tono: 'verde'
        },
        {
          codigo: 'mientras (fabrica.tieneMateriales == verdadero) {',
          etiqueta: 'MIENTRAS queden materiales',
          tipo: 'BUCLE MIENTRAS',
          tono: 'dorado'
        },
        {
          codigo: 'si (fabrica.materialActual == "Explosivo") {\n  fabrica.destruir();\n}',
          etiqueta: 'SI es Explosivo → destruir',
          tipo: 'CONDICIÓN SI',
          tono: 'violeta'
        },
        {
          codigo: 'sino {\n  fabrica.guardar();\n}',
          etiqueta: 'SINO → guardar lo restante',
          tipo: 'DISTRACTOR',
          tono: 'azul'
        },
        {
          codigo: '}',
          etiqueta: 'FIN de MIENTRAS',
          tipo: 'CIERRE',
          tono: 'verde'
        }
      ]
    },
    {
      numero: 3,
      titulo: 'Automatizar rutas especiales',
      concepto: 'MIENTRAS + SINO SI · repetir dos preguntas',
      objetivo: 'Mientras queden materiales, guarda diamantes y después comprueba si el material es un explosivo para destruirlo.',
      pista: 'Todo va dentro de MIENTRAS: primero “SI es Diamante → guardar” y después “SINO SI es Explosivo → destruir”.',
      materiales: ['Explosivo', 'Diamante', 'Explosivo', 'Diamante', 'Diamante', 'Explosivo'],
      tarjetas: [
        {
          codigo: 'sino si (fabrica.materialActual == "Explosivo") {\n  fabrica.destruir();\n}',
          etiqueta: 'SINO SI es Explosivo → destruir',
          tipo: 'RAMA SINO SI',
          tono: 'violeta'
        },
        {
          codigo: '}',
          etiqueta: 'FIN de MIENTRAS',
          tipo: 'CIERRE',
          tono: 'verde'
        },
        {
          codigo: 'si (fabrica.materialActual == "Diamante") {\n  fabrica.guardar();\n}',
          etiqueta: 'SI es Diamante → guardar',
          tipo: 'CONDICIÓN SI',
          tono: 'azul'
        },
        {
          codigo: 'mientras (fabrica.tieneMateriales == verdadero) {',
          etiqueta: 'MIENTRAS queden materiales',
          tipo: 'BUCLE MIENTRAS',
          tono: 'dorado'
        },
        {
          codigo: 'si (fabrica.materialActual == "Explosivo") {\n  fabrica.destruir();\n}',
          etiqueta: 'Otro si separado',
          tipo: 'DISTRACTOR',
          tono: 'verde'
        }
      ]
    },
    {
      numero: 4,
      titulo: 'Avalancha de producción',
      concepto: 'MIENTRAS + tres caminos · automatización completa',
      objetivo: 'Procesa los 10 materiales sin detenerte: guarda diamantes, destruye explosivos y quema el carbón restante.',
      pista: 'Dentro de MIENTRAS usa, en orden: SI para Diamante, SINO SI para Explosivo y SINO para el resto. Cierra el bucle al final.',
      materiales: ['Carbon', 'Diamante', 'Explosivo', 'Diamante', 'Carbon', 'Explosivo', 'Carbon', 'Diamante', 'Explosivo', 'Carbon'],
      tarjetas: [
        {
          codigo: 'sino {\n  fabrica.quemar();\n}',
          etiqueta: 'SINO → quemar lo restante',
          tipo: 'RAMA SINO',
          tono: 'verde'
        },
        {
          codigo: 'mientras (fabrica.tieneMateriales == verdadero) {',
          etiqueta: 'MIENTRAS queden materiales',
          tipo: 'BUCLE MIENTRAS',
          tono: 'dorado'
        },
        {
          codigo: 'si (fabrica.materialActual == "Diamante") {\n  fabrica.guardar();\n}',
          etiqueta: 'SI es Diamante → guardar',
          tipo: 'CONDICIÓN SI',
          tono: 'azul'
        },
        {
          codigo: '}',
          etiqueta: 'FIN de MIENTRAS',
          tipo: 'CIERRE',
          tono: 'dorado'
        },
        {
          codigo: 'sino si (fabrica.materialActual == "Explosivo") {\n  fabrica.destruir();\n}',
          etiqueta: 'SINO SI es Explosivo → destruir',
          tipo: 'RAMA SINO SI',
          tono: 'violeta'
        },
        {
          codigo: 'mientras (fabrica.tieneMateriales == verdadero) {\n  fabrica.guardar();\n}',
          etiqueta: 'Guardar todo',
          tipo: 'DISTRACTOR',
          tono: 'verde'
        }
      ]
    }
  ];

  fases: FaseNivelFabrica[] = [...this.fasesBase];
  esNivelCinco = false;
  faseActualIndice = 0;
  codigoUsuario = '';
  vidas = 3;
  intentos = 0;
  erroresAcumulados = 0;
  tiempoSegundos = 0;
  ejecutando = false;
  falloFase = false;
  gameOver = false;
  nivelCompletado = false;
  estrellas = 0;
  calificacion = 0;
  ayudaVisible = false;
  mensajeObjeto = '';
  estadoObjetos = {
    clarividencia: false,
    tiempo: false,
    vida: false
  };
  pestanaInventario: 'acciones' | 'objetos' = 'acciones';
  estadoEscena: EstadoEscena = 'espera';
  bitacora = 'La cinta espera una regla de control de calidad.';
  errores: string[] = [];
  materialesEnCinta: MaterialTurno[] = [];
  materialActual?: TipoMaterialFabrica;
  diamantesGuardados = 0;
  explosivosDestruidos = 0;
  carbonQuemado = 0;
  antiCopiaActivo = false;
  cargandoContextoAula = false;
  guardandoProgreso = false;
  progresoGuardado = false;
  mensajeSincronizacion = '';

  private tiempoInicioMs = 0;
  private temporizador?: ReturnType<typeof setInterval>;
  private tareasPendientes: Array<ReturnType<typeof setTimeout>> = [];
  private aulaActualId?: string;
  private retoActualId?: string;
  private esActividadAula = false;
  private solucionesPorFase = new Map<number, string>();
  private tiempoTresEstrellas = 75;
  private tiempoDosEstrellas = 150;
  private maxIntentosSinPenalidad = 3;

  constructor(
    private motor: MotorEjecucionService,
    private router: Router,
    private loaderService: LoaderService,
    private progresoService: ProgresoService,
    private aulasService: AulasService
  ) {
    this.esNivelCinco = this.router.url.includes('/nivel-5')
      || this.router.url.includes('/nivel/5');
  }

  ngOnInit(): void {
    this.fases = this.esNivelCinco
      ? [...this.fasesProduccionMasiva]
      : [...this.fasesBase];
    this.tiempoTresEstrellas = this.esNivelCinco ? 100 : 75;
    this.tiempoDosEstrellas = this.esNivelCinco ? 200 : 150;
    this.prepararFaseActual();
    this.cargarContextoInicial();
  }

  get faseActual(): FaseNivelFabrica {
    return this.fases[this.faseActualIndice];
  }

  get fasesSuperadas(): number {
    return this.nivelCompletado ? this.fases.length : this.faseActualIndice;
  }

  get intentosCalificables(): number {
    return this.erroresAcumulados + 1;
  }

  get codigoCompleto(): string {
    if (this.esNivelCinco) return this.codigoUsuario;
    return `evento(fabrica.nuevoMaterial) {\n${this.codigoUsuario}\n}`;
  }

  get numerosLinea(): number[] {
    const lineasInteriores = this.codigoUsuario.trim() ? this.codigoUsuario.split('\n').length : 1;
    const lineasFijas = this.esNivelCinco ? 0 : 2;
    return Array.from({ length: lineasInteriores + lineasFijas }, (_, indice) => indice + 1);
  }

  get filasCodigoUsuario(): number {
    return Math.max(2, this.codigoUsuario.trim() ? this.codigoUsuario.split('\n').length : 2);
  }

  get estrellasAnimadas(): number[] {
    return Array.from({ length: this.estrellas }, (_, indice) => indice);
  }

  get mensajeRecompensa(): string {
    const palabra = this.estrellas === 1 ? 'estrella' : 'estrellas';
    return `¡Felicidades! Obtuviste ${this.estrellas} ${palabra} por completar la misión.`;
  }

  get spritePersonajeFabrica(): string {
    return this.esNivelCinco
      ? 'assets/images/aventura/nivel5/aprendices-duende-v3.png'
      : 'assets/images/aventura/nivel4/supervisor-duende.png';
  }

  get spriteMaquinaPrincipal(): string {
    return this.esNivelCinco
      ? 'assets/images/aventura/nivel5/motor-produccion-v2.png'
      : 'assets/images/aventura/nivel4/clasificador-duende-v2.png';
  }

  spriteMaterial(tipo: TipoMaterialFabrica): string {
    const sprites: Record<TipoMaterialFabrica, string> = {
      Diamante: 'assets/images/aventura/fabrica/diamante-v2.png',
      Explosivo: 'assets/images/aventura/fabrica/explosivo-v2.png',
      Carbon: 'assets/images/aventura/fabrica/carbon-v2.png'
    };
    return sprites[tipo];
  }

  get nombrePersonajeFabrica(): string {
    return this.esNivelCinco
      ? 'CUADRILLA DE NOVATOS'
      : 'BRONK · SUPERVISOR DE CALIDAD';
  }

  insertarTarjeta(tarjeta: TarjetaControl): void {
    if (this.ejecutando || this.falloFase || this.gameOver || this.nivelCompletado) return;
    this.codigoUsuario = this.codigoUsuario.trim()
      ? `${this.codigoUsuario.trimEnd()}\n${tarjeta.codigo}`
      : tarjeta.codigo;
    this.errores = [];
  }

  borrarLinea(): void {
    if (this.ejecutando || this.falloFase) return;
    const lineas = this.codigoUsuario.split('\n');
    lineas.pop();
    this.codigoUsuario = lineas.join('\n');
    this.errores = [];
  }

  limpiarPergamino(): void {
    if (this.ejecutando || this.falloFase) return;
    this.codigoUsuario = '';
    this.errores = [];
  }

  bloquearTransferencia(evento: ClipboardEvent | DragEvent): void {
    if (!this.antiCopiaActivo) return;
    evento.preventDefault();
    this.errores = [
      'Modo anti-copia: escribe el código o utiliza las tarjetas; pegar y arrastrar texto está desactivado.'
    ];
  }

  usarObjeto(objeto: ObjetoFabrica): void {
    if (objeto === 'libro') {
      this.ayudaVisible = true;
      this.mensajeObjeto = '';
      return;
    }

    if (objeto === 'clarividencia') {
      if (this.estadoObjetos.clarividencia) return;
      this.estadoObjetos.clarividencia = true;
      this.mensajeObjeto = `CLARIVIDENCIA: ${this.faseActual.pista}`;
      return;
    }

    if (objeto === 'vida') {
      if (this.estadoObjetos.vida) return;
      if (this.vidas >= 3) {
        this.mensajeObjeto = 'Tus tres corazones están completos. Guarda la poción para cuando la necesites.';
        return;
      }
      this.vidas++;
      this.estadoObjetos.vida = true;
      this.mensajeObjeto = 'Poción de vida usada: recuperaste un corazón.';
      return;
    }

    if (this.estadoObjetos.tiempo) return;
    if (this.tiempoSegundos === 0) {
      this.mensajeObjeto = 'El reloj todavía está en cero. Guarda la poción para más adelante.';
      return;
    }
    this.tiempoSegundos = Math.max(0, this.tiempoSegundos - 30);
    if (this.temporizador) {
      this.tiempoInicioMs = Date.now() - this.tiempoSegundos * 1000;
    }
    this.estadoObjetos.tiempo = true;
    this.mensajeObjeto = 'Poción de tiempo usada: recuperaste treinta segundos.';
  }

  ejecutarCodigo(): void {
    if (this.ejecutando || this.falloFase || this.gameOver || this.nivelCompletado) return;

    this.iniciarTemporizador();
    this.limpiarTareasPendientes();
    this.intentos++;
    this.ejecutando = true;
    this.errores = [];
    this.estadoEscena = 'analizando';
    this.bitacora = this.esNivelCinco
      ? 'Los duendes verifican la condición de salida y las decisiones internas del bucle...'
      : 'Los duendes están conectando cada condición con una salida de la cinta...';

    const resultado = this.esNivelCinco
      ? this.motor.evaluarProduccionMasiva(
          this.codigoCompleto,
          this.faseActual.numero as FaseProduccionMasiva
        )
      : this.motor.evaluarControlCalidad(
          this.codigoCompleto,
          this.faseActual.numero as FaseControlCalidad
        );
    this.programar(() => {
      if (resultado.valido) {
        this.iniciarSimulacion(resultado.acciones);
      } else {
        this.fallarFase(resultado);
      }
    }, 650);
  }

  reintentarFase(): void {
    if (!this.falloFase || this.gameOver) return;
    this.falloFase = false;
    this.prepararFaseActual();
  }

  reiniciarNivel(): void {
    this.detenerTemporizador();
    this.limpiarTareasPendientes();
    this.faseActualIndice = 0;
    this.vidas = 3;
    this.intentos = 0;
    this.erroresAcumulados = 0;
    this.tiempoSegundos = 0;
    this.tiempoInicioMs = 0;
    this.gameOver = false;
    this.nivelCompletado = false;
    this.estrellas = 0;
    this.calificacion = 0;
    this.guardandoProgreso = false;
    this.progresoGuardado = false;
    this.mensajeSincronizacion = '';
    this.ayudaVisible = false;
    this.mensajeObjeto = '';
    this.estadoObjetos = {
      clarividencia: false,
      tiempo: false,
      vida: false
    };
    this.solucionesPorFase.clear();
    this.prepararFaseActual();
  }

  salir(): void {
    this.router.navigate(['/aventura']);
  }

  ngOnDestroy(): void {
    this.detenerTemporizador();
    this.limpiarTareasPendientes();
  }

  private iniciarSimulacion(
    acciones: Partial<Record<TipoMaterialFabrica, AccionFabrica>>
  ): void {
    this.procesarMaterial(0, acciones);
  }

  private procesarMaterial(
    indice: number,
    acciones: Partial<Record<TipoMaterialFabrica, AccionFabrica>>
  ): void {
    if (indice >= this.materialesEnCinta.length) {
      this.materialActual = undefined;
      this.estadoEscena = 'victoria';
      const prefijo = this.esNivelCinco ? 'Bucle finalizado; no quedan materiales' : 'Lote completo';
      this.bitacora = `${prefijo} · Diamantes: ${this.diamantesGuardados} · Explosivos: ${this.explosivosDestruidos} · Carbones: ${this.carbonQuemado}.`;
      this.programar(() => this.completarFase(), 850);
      return;
    }

    const material = this.materialesEnCinta[indice];
    const accion = acciones[material.tipo];
    material.estado = 'activo';
    this.materialActual = material.tipo;
    this.estadoEscena = 'transportando';
    this.bitacora = `El sensor detectó ${this.nombreMaterial(material.tipo)}. Evaluando la cadena de decisiones...`;

    this.programar(() => {
      if (!accion) {
        material.estado = 'error';
        this.fallarDuranteSimulacion(`Ninguna rama pudo procesar ${this.nombreMaterial(material.tipo)}.`);
        return;
      }

      this.aplicarAccion(material, accion);
      this.programar(() => this.procesarMaterial(indice + 1, acciones), 650);
    }, 600);
  }

  private aplicarAccion(material: MaterialTurno, accion: AccionFabrica): void {
    if (accion === 'guardar') {
      material.estado = 'guardado';
      this.diamantesGuardados++;
      this.estadoEscena = 'guardando';
      this.bitacora = 'El brazo mecánico depositó el diamante en el cofre de seguridad.';
      return;
    }

    if (accion === 'destruir') {
      material.estado = 'destruido';
      this.explosivosDestruidos++;
      this.estadoEscena = 'destruyendo';
      this.bitacora = 'La compuerta desvió el explosivo hacia la trituradora blindada.';
      return;
    }

    material.estado = 'quemado';
    this.carbonQuemado++;
    this.estadoEscena = 'quemando';
    this.bitacora = 'El carbón cayó en el horno y avivó la caldera de la fábrica.';
  }

  private completarFase(): void {
    this.solucionesPorFase.set(this.faseActual.numero, this.codigoCompleto.trim());
    this.ejecutando = false;
    if (this.faseActualIndice === this.fases.length - 1) {
      this.nivelCompletado = true;
      this.finalizarNivel();
      return;
    }

    this.faseActualIndice++;
    this.prepararFaseActual();
  }

  private finalizarNivel(): void {
    this.detenerTemporizador();
    const intentos = this.intentosCalificables;
    this.calificacion = intentos <= 1 ? 10 : intentos <= 3 ? 8 : 6;
    this.estrellas = this.tiempoSegundos <= this.tiempoTresEstrellas
      ? 3
      : this.tiempoSegundos <= this.tiempoDosEstrellas ? 2 : 1;
    if (intentos > this.maxIntentosSinPenalidad) {
      this.estrellas = Math.max(1, this.estrellas - 1);
    }
    this.guardarProgreso();
  }

  private cargarContextoInicial(): void {
    const aulaId = localStorage.getItem('aulaActiva');
    const retoId = localStorage.getItem('retoActivo');

    if (!aulaId || !retoId) {
      this.loaderService.ocultar();
      return;
    }

    this.cargandoContextoAula = true;
    this.loaderService.mostrar('CARGANDO ACTIVIDAD');
    this.aulasService.retosDelAula(aulaId).subscribe({
      next: retos => {
        const nivelEsperado = this.esNivelCinco ? 5 : 4;
        const reto = retos.find(item => item.id === retoId && item.reto_nivel_id === nivelEsperado);
        if (reto) {
          this.aulaActualId = aulaId;
          this.retoActualId = reto.id;
          this.esActividadAula = true;
          this.aplicarConfiguracionAula(reto);
        } else {
          this.limpiarContextoAula();
        }
        this.cargandoContextoAula = false;
        this.loaderService.ocultar();
      },
      error: () => {
        this.cargandoContextoAula = false;
        this.limpiarContextoAula();
        this.loaderService.ocultar();
      }
    });
  }

  private aplicarConfiguracionAula(reto: RetoPersonalizadoResponse): void {
    let parametros: ParametrosEvaluacion | undefined;
    const parametrosRecibidos: unknown = reto.parametros_evaluacion;
    if (typeof parametrosRecibidos === 'string') {
      try {
        parametros = JSON.parse(parametrosRecibidos) as ParametrosEvaluacion;
      } catch {
        parametros = undefined;
      }
    } else {
      parametros = parametrosRecibidos as ParametrosEvaluacion;
    }

    this.antiCopiaActivo = parametros?.anti_copia ?? false;
    this.tiempoTresEstrellas = parametros?.tiempo_3_estrellas ?? (this.esNivelCinco ? 100 : 75);
    this.tiempoDosEstrellas = parametros?.tiempo_2_estrellas ?? (this.esNivelCinco ? 200 : 150);
    this.maxIntentosSinPenalidad = parametros?.intentos_max_sin_penalidad ?? 3;

    const fasesSeleccionadas = parametros?.fases_seleccionadas
      ?.map(Number)
      .filter(numero => Number.isInteger(numero) && numero >= 1 && numero <= 4);

    if (fasesSeleccionadas?.length) {
      const seleccion = new Set(fasesSeleccionadas);
      const catalogoFases = this.esNivelCinco
        ? this.fasesProduccionMasiva
        : this.fasesBase;
      this.fases = catalogoFases.filter(fase => seleccion.has(fase.numero));
      this.faseActualIndice = 0;
      this.prepararFaseActual();
    }
  }

  private guardarProgreso(): void {
    if (this.guardandoProgreso || this.progresoGuardado) return;

    if (this.router.url.startsWith('/prototipo/')) {
      this.mensajeSincronizacion = 'Prueba local completada; el progreso oficial no fue modificado.';
      return;
    }

    const codigoSolucion = [...this.solucionesPorFase.entries()]
      .sort(([faseA], [faseB]) => faseA - faseB)
      .map(([fase, codigo]) => `// Fase ${fase}\n${codigo}`)
      .join('\n\n');

    this.guardandoProgreso = true;
    this.mensajeSincronizacion = 'Guardando progreso y recompensa...';
    this.progresoService.guardarProgreso({
      reto_nivel_id: this.esNivelCinco ? 5 : 4,
      tiempo_segundos: this.tiempoSegundos,
      intentos: this.intentosCalificables,
      codigo_solucion: codigoSolucion,
      aula_id: this.aulaActualId,
      reto_personalizado_id: this.retoActualId
    }).subscribe({
      next: respuesta => {
        this.guardandoProgreso = false;
        this.progresoGuardado = true;
        this.estrellas = respuesta.estrellas_obtenidas;
        this.mensajeSincronizacion = respuesta.mensaje;
        if (this.esActividadAula) this.limpiarContextoAula();
      },
      error: () => {
        this.guardandoProgreso = false;
        this.mensajeSincronizacion = (
          'La misión se completó localmente, pero el progreso no pudo sincronizarse.'
        );
      }
    });
  }

  private limpiarContextoAula(): void {
    localStorage.removeItem('aulaActiva');
    localStorage.removeItem('retoActivo');
  }

  private fallarFase(
    resultado: ResultadoEvaluacionControlCalidad | ResultadoEvaluacionProduccionMasiva
  ): void {
    const mensaje = resultado.errores[0]?.mensaje
      ?? (this.esNivelCinco ? 'El ciclo automático está incompleto.' : 'La cadena de decisiones está incompleta.');
    const explosivoMalDirigido = resultado.acciones.Explosivo
      && resultado.acciones.Explosivo !== 'destruir';

    this.ejecutando = false;
    this.falloFase = true;
    this.vidas--;
    this.erroresAcumulados++;
    this.errores = resultado.errores.map(error => error.mensaje);
    this.estadoEscena = explosivoMalDirigido ? 'explosion' : 'fallo';
    this.bitacora = explosivoMalDirigido
      ? '¡El explosivo tomó la ruta equivocada! Los duendes activaron el cierre de emergencia.'
      : mensaje;

    if (this.vidas <= 0) {
      this.gameOver = true;
      this.detenerTemporizador();
    }
  }

  private fallarDuranteSimulacion(mensaje: string): void {
    this.ejecutando = false;
    this.falloFase = true;
    this.vidas--;
    this.erroresAcumulados++;
    this.errores = [mensaje];
    this.estadoEscena = 'fallo';
    this.bitacora = mensaje;
    if (this.vidas <= 0) {
      this.gameOver = true;
      this.detenerTemporizador();
    }
  }

  private prepararFaseActual(): void {
    this.limpiarTareasPendientes();
    this.codigoUsuario = '';
    this.ejecutando = false;
    this.falloFase = false;
    this.mensajeObjeto = '';
    this.estadoEscena = 'espera';
    this.materialActual = undefined;
    this.diamantesGuardados = 0;
    this.explosivosDestruidos = 0;
    this.carbonQuemado = 0;
    this.errores = [];
    this.materialesEnCinta = this.faseActual.materiales.map((tipo, indice) => ({
      id: indice + 1,
      tipo,
      estado: 'espera'
    }));
    this.bitacora = this.esNivelCinco
      ? `Ciclo ${this.faseActual.numero}: hay ${this.materialesEnCinta.length} material(es) en el stock automático.`
      : `Turno ${this.faseActual.numero}: hay ${this.materialesEnCinta.length} material(es) esperando clasificación.`;
  }

  private nombreMaterial(tipo: TipoMaterialFabrica): string {
    return tipo === 'Carbon' ? 'Carbón' : tipo;
  }

  private iniciarTemporizador(): void {
    if (this.temporizador) return;
    this.tiempoInicioMs = Date.now() - this.tiempoSegundos * 1000;
    this.temporizador = setInterval(() => {
      this.tiempoSegundos = Math.floor((Date.now() - this.tiempoInicioMs) / 1000);
    }, 1000);
  }

  private detenerTemporizador(): void {
    if (this.temporizador) clearInterval(this.temporizador);
    this.temporizador = undefined;
  }

  private programar(tarea: () => void, retraso: number): void {
    this.tareasPendientes.push(setTimeout(tarea, retraso));
  }

  private limpiarTareasPendientes(): void {
    this.tareasPendientes.forEach(tarea => clearTimeout(tarea));
    this.tareasPendientes = [];
  }
}
