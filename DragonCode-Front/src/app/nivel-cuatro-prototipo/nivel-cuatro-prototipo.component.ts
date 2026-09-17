import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TarjetaConfig } from '../baraja-tarjetas/baraja-tarjetas.component';
import { Instruccion, LayoutJuegoComponent } from '../layout-juego/layout-juego.component';
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
import { calcularEstrellas } from '../core/estrellas';
import nivel4Data from '../../assets/data/aventuraniveles/nivel-4.json';
import nivel5Data from '../../assets/data/aventuraniveles/nivel-5.json';
import { ConfiguracionNivelFabrica as ConfiguracionAulaFabrica } from '../core/configuracion-niveles-aula';

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

interface PlantillaNivelFabrica {
  lineaInicio?: string;
  lineaFin?: string;
  placeholder: string;
}

interface ConfiguracionNivelFabrica {
  bitacoraInicial: string;
  plantilla: PlantillaNivelFabrica;
  fases: FaseNivelFabrica[];
}

@Component({
  selector: 'app-nivel-cuatro-prototipo',
  standalone: true,
  imports: [CommonModule, LayoutJuegoComponent],
  templateUrl: './nivel-cuatro-prototipo.component.html',
  styleUrls: [
    '../nivel-dos-prototipo/nivel-dos-prototipo.component.scss',
    './nivel-cuatro-prototipo.component.scss'
  ]
})
export class NivelCuatroPrototipoComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(LayoutJuegoComponent) layoutJuego?: LayoutJuegoComponent;

  private readonly tonoColores: Record<TonoTarjeta, { boton: string; consola: string }> = {
    azul: { boton: '#174bd4', consola: '#82b1ff' },
    verde: { boton: '#288650', consola: '#a5d6a7' },
    dorado: { boton: '#df4517', consola: '#ffab91' },
    violeta: { boton: '#8e1ba4', consola: '#ce93d8' }
  };
  private readonly configuracionNivel4 = nivel4Data as unknown as ConfiguracionNivelFabrica;
  private readonly configuracionNivel5 = nivel5Data as unknown as ConfiguracionNivelFabrica;
  readonly fasesBase = this.configuracionNivel4.fases;
  readonly fasesProduccionMasiva = this.configuracionNivel5.fases;


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
  configuracionTarjetasActual: TarjetaConfig[] = [];
  inventarioNivel = {
    libro: { activo: true },
    clarividencia: { activo: true, consumida: false },
    vida: { activo: true, consumida: false },
    tiempo: { activo: true, consumida: false }
  };
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

  get modoJuegoActual(): 'aventura' | 'aula' {
    return this.esActividadAula || !!localStorage.getItem('aulaActiva') ? 'aula' : 'aventura';
  }

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
    this.bitacora = this.configuracionNivelActual.bitacoraInicial;
    this.prepararFaseActual();
    this.cargarContextoInicial();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.renderizarPergamino(), 0);
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
    const { lineaInicio, lineaFin } = this.configuracionNivelActual.plantilla;
    return [lineaInicio, this.codigoUsuario, lineaFin].filter(Boolean).join('\n');
  }

  private get configuracionNivelActual(): ConfiguracionNivelFabrica {
    return this.esNivelCinco ? this.configuracionNivel5 : this.configuracionNivel4;
  }

  get numerosLinea(): number[] {
    const lineasInteriores = this.codigoUsuario.trim() ? this.codigoUsuario.split('\n').length : 1;
    const plantilla = this.configuracionNivelActual.plantilla;
    const lineasFijas = [plantilla.lineaInicio, plantilla.lineaFin].filter(Boolean).length;
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

  manejarUsoTarjeta(tarjeta: TarjetaConfig): void {
    const tarjetaOriginal = this.faseActual.tarjetas.find(item => item.codigo === tarjeta.accion);
    if (tarjetaOriginal) this.insertarTarjeta(tarjetaOriginal);
  }

  insertarTarjeta(tarjeta: TarjetaControl): void {
    if (this.ejecutando || this.falloFase || this.gameOver || this.nivelCompletado) return;
    this.layoutJuego?.consola?.guardarEstadoPlantilla(this.codigoUsuario);
    this.codigoUsuario = this.codigoUsuario.trim()
      ? `${this.codigoUsuario.trimEnd()}\n${tarjeta.codigo}`
      : tarjeta.codigo;
    this.errores = [];
    this.renderizarPergamino();
  }

  borrarLinea(): void {
    if (this.ejecutando || this.falloFase) return;
    const lineas = this.codigoUsuario.split('\n');
    lineas.pop();
    this.codigoUsuario = lineas.join('\n');
    this.errores = [];
    this.renderizarPergamino();
  }

  limpiarPergamino(): void {
    if (this.ejecutando || this.falloFase) return;
    this.codigoUsuario = '';
    this.errores = [];
    if (this.layoutJuego?.consola) this.layoutJuego.consola.historialPlantilla = [];
    this.renderizarPergamino();
  }

  retrocederPaso(codigoAnterior: string): void {
    if (this.ejecutando || this.falloFase || this.gameOver || this.nivelCompletado) return;
    this.codigoUsuario = codigoAnterior;
    this.errores = [];
    this.renderizarPergamino();
  }

  bloquearTransferencia(evento: ClipboardEvent | DragEvent): void {
    if (!this.antiCopiaActivo) return;
    evento.preventDefault();
    this.errores = [
      'Modo anti-copia: escribe el código o utiliza las tarjetas; pegar y arrastrar texto está desactivado.'
    ];
  }

  usarObjeto(objeto: ObjetoFabrica): void {
    if (this.ejecutando || this.falloFase || this.gameOver || this.nivelCompletado) return;
    if (objeto === 'libro') {
      this.ayudaVisible = true;
      this.mensajeObjeto = '';
      return;
    }

    if (objeto === 'clarividencia') {
      if (this.estadoObjetos.clarividencia) return;
      this.estadoObjetos.clarividencia = true;
      this.inventarioNivel.clarividencia.consumida = true;
      this.mensajeObjeto = `CLARIVIDENCIA: ${this.faseActual.pista}`;
      if (this.layoutJuego?.consola) {
        this.layoutJuego.consola.solucionesMagicas[this.esNivelCinco ? 5 : 4] =
          this.solucionVisibleActual();
        this.layoutJuego.activarClarividencia();
      }
      return;
    }

    if (objeto === 'vida') {
      if (this.estadoObjetos.vida) return;
      if (this.vidas >= 3) {
        this.layoutJuego?.baraja?.agitarPocion('roja');
        this.mensajeObjeto = 'Tus tres corazones están completos. Guarda la poción para cuando la necesites.';
        return;
      }
      this.vidas++;
      this.estadoObjetos.vida = true;
      this.inventarioNivel.vida.consumida = true;
      this.mensajeObjeto = 'Poción de vida usada: recuperaste un corazón.';
      return;
    }

    if (this.estadoObjetos.tiempo) return;
    if (this.tiempoSegundos === 0) {
      this.layoutJuego?.baraja?.agitarPocion('verde');
      this.mensajeObjeto = 'El reloj todavía está en cero. Guarda la poción para más adelante.';
      return;
    }
    this.tiempoSegundos = Math.max(0, this.tiempoSegundos - 30);
    if (this.temporizador) {
      this.tiempoInicioMs = Date.now() - this.tiempoSegundos * 1000;
    }
    this.estadoObjetos.tiempo = true;
    this.inventarioNivel.tiempo.consumida = true;
    this.mensajeObjeto = 'Poción de tiempo usada: recuperaste treinta segundos.';
  }

  manejarUsoPocion(tipo: 'roja' | 'verde' | 'amarilla' | 'libro'): void {
    const objeto: Record<typeof tipo, ObjetoFabrica> = {
      roja: 'vida',
      verde: 'tiempo',
      amarilla: 'clarividencia',
      libro: 'libro'
    };
    this.usarObjeto(objeto[tipo]);
  }

  get ayudasUsadas(): boolean {
    return this.estadoObjetos.clarividencia || this.estadoObjetos.vida || this.estadoObjetos.tiempo;
  }

  ejecutarCodigo(codigoDesdePergamino?: string): void {
    if (this.ejecutando || this.falloFase || this.gameOver || this.nivelCompletado) return;

    if (codigoDesdePergamino !== undefined) {
      this.codigoUsuario = this.extraerCodigoUsuario(codigoDesdePergamino);
    }

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
    this.inventarioNivel.clarividencia.consumida = false;
    this.inventarioNivel.vida.consumida = false;
    this.inventarioNivel.tiempo.consumida = false;
    this.layoutJuego?.resetearInventario();
    this.solucionesPorFase.clear();
    this.prepararFaseActual();
  }

  salir(): void {
    this.router.navigate([this.modoJuegoActual === 'aula' ? '/pantalla-principal' : '/aventura']);
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
    this.estrellas = calcularEstrellas(this.vidas, this.ayudasUsadas);
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
    // Este método solo se ejecuta en contexto de aula: allí no existen ayudas.
    const ayudasHabilitadas = false;
    this.inventarioNivel.libro.activo = ayudasHabilitadas;
    this.inventarioNivel.clarividencia.activo = ayudasHabilitadas;
    this.inventarioNivel.vida.activo = ayudasHabilitadas;
    this.inventarioNivel.tiempo.activo = ayudasHabilitadas;

    const catalogoOriginal = this.esNivelCinco
      ? this.fasesProduccionMasiva
      : this.fasesBase;
    const configuracion = parametros?.configuracion_nivel;
    const configuracionFabrica = configuracion?.tipo === 'materiales_fabrica'
      && configuracion.nivel_id === (this.esNivelCinco ? 5 : 4)
      ? configuracion as ConfiguracionAulaFabrica
      : undefined;
    const catalogoFases = catalogoOriginal.map(fase => ({
      ...fase,
      materiales: [
        ...(configuracionFabrica?.materiales_por_fase[String(fase.numero)] ?? fase.materiales)
      ]
    }));

    const fasesSeleccionadas = parametros?.fases_seleccionadas
      ?.map(Number)
      .filter(numero => Number.isInteger(numero) && numero >= 1 && numero <= 4);

    if (fasesSeleccionadas?.length) {
      const seleccion = new Set(fasesSeleccionadas);
      this.fases = catalogoFases.filter(fase => seleccion.has(fase.numero));
    } else {
      this.fases = catalogoFases;
    }
    this.faseActualIndice = 0;
    this.prepararFaseActual();
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
      vidas_restantes: this.vidas,
      ayudas_usadas: this.esActividadAula ? false : this.ayudasUsadas,
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

  private actualizarConfiguracionTarjetas(): void {
    this.configuracionTarjetasActual = this.faseActual.tarjetas.map(tarjeta => {
      const colores = this.tonoColores[tarjeta.tono];
      return {
        nombre: tarjeta.etiqueta,
        accion: tarjeta.codigo,
        colorBoton: colores.boton,
        colorConsola: colores.consola
      };
    });
  }

  private renderizarPergamino(): void {
    if (!this.layoutJuego) return;

    const lineas: Instruccion[] = [];
    const plantilla = this.configuracionNivelActual.plantilla;
    if (plantilla.lineaInicio) {
      lineas.push({
        texto: plantilla.lineaInicio,
        color: '#c586c0',
        tieneError: false,
        fija: true
      });
    }

    if (this.codigoUsuario.trim()) {
      this.codigoUsuario.split('\n').forEach(linea => {
        lineas.push({ texto: linea, color: '#dcecff', tieneError: false });
      });
    } else {
      lineas.push({
        texto: plantilla.placeholder,
        color: '#6b7280',
        tieneError: false,
        esPlaceholder: true
      });
    }

    if (plantilla.lineaFin) {
      lineas.push({ texto: plantilla.lineaFin, color: '#c586c0', tieneError: false, fija: true });
    }

    this.layoutJuego.lineasCodigo = lineas;
    if (this.layoutJuego.consola) this.layoutJuego.consola.lineas = lineas;
  }

  private extraerCodigoUsuario(codigoCompleto: string): string {
    const lineas = codigoCompleto.replace(/\r/g, '').split('\n');
    const plantilla = this.configuracionNivelActual.plantilla;
    if (plantilla.lineaInicio && lineas[0]?.trim() === plantilla.lineaInicio.trim()) {
      lineas.shift();
      if (plantilla.lineaFin && lineas[lineas.length - 1]?.trim() === plantilla.lineaFin.trim()) {
        lineas.pop();
      }
    }
    return lineas
      .filter(linea => linea.trim() !== plantilla.placeholder.trim())
      .join('\n')
      .trim();
  }

  private solucionVisibleActual(): string[] {
    const prioridad: Record<TarjetaControl['tipo'], number> = {
      'BUCLE MIENTRAS': 0,
      'CONDICIÓN SI': 1,
      'RAMA SINO SI': 2,
      'RAMA SINO': 3,
      'CIERRE': 4,
      'DISTRACTOR': 99
    };
    const codigo = this.faseActual.tarjetas
      .filter(tarjeta => tarjeta.tipo !== 'DISTRACTOR')
      .sort((a, b) => prioridad[a.tipo] - prioridad[b.tipo])
      .map(tarjeta => tarjeta.codigo)
      .join('\n');
    const { lineaInicio, lineaFin } = this.configuracionNivelActual.plantilla;
    const solucion = [lineaInicio, codigo, lineaFin].filter(Boolean).join('\n');
    return solucion.split('\n');
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
    this.actualizarConfiguracionTarjetas();
    if (this.layoutJuego?.consola) this.layoutJuego.consola.historialPlantilla = [];
    this.renderizarPergamino();
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
