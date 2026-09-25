import { VictoriaAventuraComponent } from '../victoria/victoria-aventura.component';
import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TarjetaConfig } from '../baraja-tarjetas/baraja-tarjetas.component';
import { Instruccion, LayoutJuegoComponent } from '../layout-juego/layout-juego.component';
import {
  ReglasFaseVariables,
  ResultadoEvaluacion,
  ValorVariable
} from '../motor-v2/evaluador-nivel';
import { MotorEjecucionService } from '../motor-v2/motor-ejecucion.service';
import {
  AulasService,
  ParametrosEvaluacion,
  RetoPersonalizadoResponse
} from '../services/aulas.service';
import { LoaderService } from '../services/loader.service';
import { ProgresoService } from '../services/progreso.service';
import { calcularEstrellas, calcularEstrellasAventura } from '../core/estrellas';
import nivel3Data from '../../assets/data/aventuraniveles/nivel-3.json';
import { ConfiguracionNivelTres as ConfiguracionAulaNivelTres } from '../core/configuracion-niveles-aula';

type FaseVariables = 1 | 2 | 3 | 4;
type TonoTarjeta = 'azul' | 'verde' | 'dorado' | 'violeta';
type EstadoEscena =
  | 'espera'
  | 'memorizando'
  | 'iluminada'
  | 'hechizo-listo'
  | 'atacando'
  | 'fallo'
  | 'sobrecarga'
  | 'victoria';

interface TarjetaVariable {
  codigo: string;
  etiqueta: string;
  tipo: 'BOOLEANO' | 'TEXTO' | 'ENTERO' | 'SIN COMILLAS';
  tono: TonoTarjeta;
}

interface FaseNivelTres {
  numero: FaseVariables;
  titulo: string;
  concepto: string;
  objetivo: string;
  pista: string;
  instruccionFija: string;
  reglas: ReglasFaseVariables;
  tarjetas: TarjetaVariable[];
}

interface ConfiguracionNivelTres {
  plantilla: { placeholder: string };
  fases: FaseNivelTres[];
}

@Component({
  selector: 'app-nivel-tres-prototipo',
  standalone: true,
  imports: [VictoriaAventuraComponent, CommonModule, LayoutJuegoComponent],
  templateUrl: './nivel-tres-prototipo.component.html',
  styleUrls: [
    '../nivel-dos-prototipo/nivel-dos-prototipo.component.scss',
    './nivel-tres-prototipo.component.scss'
  ]
})
export class NivelTresPrototipoComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(LayoutJuegoComponent) layoutJuego?: LayoutJuegoComponent;

  private readonly tonoColores: Record<TonoTarjeta, { boton: string; consola: string }> = {
    azul: { boton: '#174bd4', consola: '#82b1ff' },
    verde: { boton: '#288650', consola: '#a5d6a7' },
    dorado: { boton: '#df8b17', consola: '#ffd180' },
    violeta: { boton: '#8e1ba4', consola: '#ce93d8' }
  };
  private readonly configuracionNivel = nivel3Data as unknown as ConfiguracionNivelTres;
  readonly fasesBase = this.configuracionNivel.fases;


  fases: FaseNivelTres[] = [...this.fasesBase];

  faseActualIndice = 0;
  codigoUsuario = '';
  vidas = 3;
  ayudasUsadas = false;
  intentos = 0;
  erroresAcumulados = 0;
  tiempoSegundos = 0;
  ejecutando = false;
  falloFase = false;
  gameOver = false;
  nivelCompletado = false;
  estrellas = 0;
  calificacion = 0;
  pistaVisible = false;
  ayudaVisible = false;
  ayudasHabilitadas = true;
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
    vida: false,
    tiempo: false
  };
  estadoEscena: EstadoEscena = 'espera';
  bitacora = 'Las runas de memoria están vacías. Prepara la primera variable.';
  errores: string[] = [];
  memoria: Record<string, ValorVariable> = {};
  luzActiva = false;
  elementoActivo = '';
  cantidadAtaques = 0;
  murcielagosDerrotados = 0;
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
  ) {}

  ngOnInit(): void {
    this.prepararFaseActual();
    this.cargarContextoInicial();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.renderizarPergamino(), 0);
  }

  get faseActual(): FaseNivelTres {
    return this.fases[this.faseActualIndice];
  }

  get fasesSuperadas(): number {
    return this.nivelCompletado ? this.fases.length : this.faseActualIndice;
  }

  get intentosCalificables(): number {
    // Cada fase necesita una ejecución correcta. Para la recompensa solo se
    // cuenta el intento final más los fallos reales, igual que en el Nivel 2.
    return this.erroresAcumulados + 1;
  }

  get estrellasAnimadas(): number[] {
    return Array.from({ length: this.estrellas }, (_, indice) => indice);
  }

  get mensajeRecompensa(): string {
    const palabra = this.estrellas === 1 ? 'estrella' : 'estrellas';
    return `¡Felicidades! Obtuviste ${this.estrellas} ${palabra} por completar la misión.`;
  }

  get lineasUsuario(): string[] {
    return this.codigoUsuario.trim() ? this.codigoUsuario.split('\n') : [];
  }

  get numerosLinea(): number[] {
    return Array.from({ length: Math.max(1, this.lineasUsuario.length) + 1 }, (_, indice) => indice + 1);
  }

  get filasCodigoUsuario(): number {
    return Math.max(1, this.lineasUsuario.length);
  }

  get estadoEscenaTexto(): string {
    if (this.estadoEscena === 'victoria' && this.faseActual.numero === 4) {
      return 'MURCIÉLAGO ALFA DERROTADO';
    }
    return {
      espera: 'ESPERANDO VARIABLES',
      memorizando: 'GUARDANDO EN MEMORIA',
      iluminada: 'CUEVA REVELADA',
      'hechizo-listo': 'HECHIZO PREPARADO',
      atacando: 'LANZANDO PROYECTILES',
      fallo: 'PREPARACIÓN INCORRECTA',
      sobrecarga: 'SOBRECARGA MÁGICA',
      victoria: 'MURCIÉLAGOS DERROTADOS'
    }[this.estadoEscena];
  }

  get tituloFallo(): string {
    if (this.estadoEscena === 'sobrecarga') return 'SOBRECARGA MÁGICA';
    if (this.faseActual.numero === 1) return 'LA CUEVA SIGUE OSCURA';
    if (this.faseActual.numero === 2) return 'EL HECHIZO FALLÓ';
    if (this.faseActual.numero >= 3) return 'ATAQUE INSUFICIENTE';
    return 'PREPARACIÓN INCORRECTA';
  }

  manejarUsoTarjeta(tarjeta: TarjetaConfig): void {
    const tarjetaOriginal = this.faseActual.tarjetas.find(item => item.codigo === tarjeta.accion);
    if (tarjetaOriginal) this.insertarTarjeta(tarjetaOriginal);
  }

  insertarTarjeta(tarjeta: TarjetaVariable): void {
    if (this.ejecutando || this.falloFase || this.gameOver || this.nivelCompletado) return;
    this.layoutJuego?.consola?.guardarEstadoPlantilla(this.codigoUsuario);
    this.codigoUsuario = this.codigoUsuario.trim()
      ? `${this.codigoUsuario.trimEnd()}\n${tarjeta.codigo}`
      : tarjeta.codigo;
    this.errores = [];
    this.renderizarPergamino();
  }

  alternarPista(): void {
    if (this.ejecutando || this.falloFase || this.gameOver || this.nivelCompletado) return;
    if (!this.pistaVisible) this.usarObjeto('clarividencia');
    else this.pistaVisible = false;
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

  usarObjeto(objeto: 'libro' | 'clarividencia' | 'vida' | 'tiempo'): void {
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
      this.pistaVisible = true;
      this.ayudasUsadas = true;
      this.mensajeObjeto = `CLARIVIDENCIA: ${this.faseActual.pista}`;
      if (this.layoutJuego?.consola) {
        this.layoutJuego.consola.solucionesMagicas[3] = this.solucionVisibleActual();
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
      this.ayudasUsadas = true;
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
    if (this.temporizador) this.tiempoInicioMs = Date.now() - this.tiempoSegundos * 1000;
    this.estadoObjetos.tiempo = true;
    this.inventarioNivel.tiempo.consumida = true;
    this.ayudasUsadas = true;
    this.mensajeObjeto = 'Poción de tiempo usada: recuperaste treinta segundos.';
  }

  manejarUsoPocion(tipo: 'roja' | 'verde' | 'amarilla' | 'libro'): void {
    const objeto: Record<typeof tipo, 'libro' | 'clarividencia' | 'vida' | 'tiempo'> = {
      roja: 'vida',
      verde: 'tiempo',
      amarilla: 'clarividencia',
      libro: 'libro'
    };
    this.usarObjeto(objeto[tipo]);
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
    this.estadoEscena = 'memorizando';
    this.bitacora = 'El motor está leyendo las asignaciones y llenando las runas...';

    const resultado = this.motor.ejecutar('variables', this.codigoUsuario, this.faseActual.reglas);
    this.memoria = { ...resultado.estadoFinal.variables };

    this.programar(() => {
      if (resultado.valido) {
        this.resolverFaseCorrecta();
      } else {
        this.fallarFase(resultado);
      }
    }, 700);
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
    this.ayudasUsadas = false;
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
    this.solucionesPorFase.clear();
    this.estadoObjetos = { clarividencia: false, vida: false, tiempo: false };
    this.inventarioNivel.clarividencia.consumida = false;
    this.inventarioNivel.vida.consumida = false;
    this.inventarioNivel.tiempo.consumida = false;
    this.prepararFaseActual();
  }

  salir(): void {
    this.router.navigate([this.modoJuegoActual === 'aula' ? '/pantalla-principal' : '/aventura']);
  }

  valorMemoria(nombre: string): string {
    if (!(nombre in this.memoria)) return 'VACÍA';
    const valor = this.memoria[nombre];
    return typeof valor === 'string' ? `"${valor}"` : String(valor);
  }

  tipoMemoria(nombre: string): string {
    if (!(nombre in this.memoria)) return 'SIN TIPO';
    const valor = this.memoria[nombre];
    if (typeof valor === 'boolean') return 'BOOLEANO';
    if (typeof valor === 'number') return 'ENTERO';
    return 'TEXTO';
  }

  variableRequerida(nombre: string): boolean {
    return nombre in this.faseActual.reglas.variablesEsperadas;
  }

  estaEnMemoria(nombre: string): boolean {
    return nombre in this.memoria;
  }

  ngOnDestroy(): void {
    this.detenerTemporizador();
    this.limpiarTareasPendientes();
  }

  private resolverFaseCorrecta(): void {
    const fase = this.faseActual.numero;

    if (fase === 1) {
      this.luzActiva = true;
      this.estadoEscena = 'iluminada';
      this.bitacora = 'La instrucción fija leyó luz = true y reveló la cueva.';
      this.programar(() => this.completarFase(), 1100);
      return;
    }

    if (fase === 2) {
      this.elementoActivo = 'Fuego';
      this.estadoEscena = 'hechizo-listo';
      this.bitacora = 'El texto "Fuego" seleccionó el proyectil elemental correcto.';
      this.programar(() => this.completarFase(), 1100);
      return;
    }

    if (fase === 3) {
      this.cantidadAtaques = 3;
      this.estadoEscena = 'atacando';
      this.bitacora = 'El entero 3 creó exactamente un proyectil por murciélago.';
      this.programar(() => { this.murcielagosDerrotados = 3; }, 450);
      this.programar(() => this.completarFase(), 1450);
      return;
    }

    this.luzActiva = true;
    this.estadoEscena = 'iluminada';
    this.bitacora = 'Paso 1: el booleano activó la luz.';
    this.programar(() => {
      this.elementoActivo = 'Fuego';
      this.estadoEscena = 'hechizo-listo';
      this.bitacora = 'Paso 2: el string seleccionó el hechizo de fuego.';
    }, 550);
    this.programar(() => {
      this.cantidadAtaques = 3;
      this.estadoEscena = 'atacando';
      this.bitacora = 'Paso 3: el entero produjo tres proyectiles.';
    }, 1050);
    this.programar(() => {
      this.murcielagosDerrotados = 3;
      this.estadoEscena = 'victoria';
      this.bitacora = 'Las tres variables activaron el ataque final y derrotaron al murciélago alfa.';
    }, 1550);
    this.programar(() => this.completarFase(), 2300);
  }

  private completarFase(): void {
    this.solucionesPorFase.set(
      this.faseActual.numero,
      `${this.codigoUsuario.trim()}\n${this.faseActual.instruccionFija}`.trim()
    );
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

    // RF-07: vidas/ayudas para estrellas; RF-16: intentos para la nota académica.
    this.calificacion = intentos <= 1 ? 10 : intentos <= 3 ? 8 : 6;
    this.estrellas = this.esActividadAula ? calcularEstrellas(this.vidas, this.ayudasUsadas)
      : calcularEstrellasAventura(3, this.ayudasUsadas, false, this.erroresAcumulados, this.intentosCalificables);
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
        const reto = retos.find(item => item.id === retoId && item.reto_nivel_id === 3);
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
    // Las ayudas y pociones permanecen disponibles solo en Aventura.
    this.ayudasHabilitadas = false;
    this.inventarioNivel.libro.activo = this.ayudasHabilitadas;
    this.inventarioNivel.clarividencia.activo = this.ayudasHabilitadas;
    this.inventarioNivel.vida.activo = this.ayudasHabilitadas;
    this.inventarioNivel.tiempo.activo = this.ayudasHabilitadas;
    if (!this.ayudasHabilitadas) this.ayudaVisible = false;
    const configuracion = parametros?.configuracion_nivel;
    const cantidadDistractores = configuracion?.tipo === 'variables_cueva'
      && configuracion.nivel_id === 3
      ? (configuracion as ConfiguracionAulaNivelTres).distractores_por_fase
      : 3;
    const fasesConfiguradas = this.fasesBase.map(fase => ({
      ...fase,
      reglas: {
        ...fase.reglas,
        variablesEsperadas: { ...fase.reglas.variablesEsperadas }
      },
      tarjetas: this.limitarDistractores(fase, cantidadDistractores)
    }));

    const fasesSeleccionadas = parametros?.fases_seleccionadas
      ?.map(Number)
      .filter(numero => Number.isInteger(numero) && numero >= 1 && numero <= 4);

    if (fasesSeleccionadas?.length) {
      const seleccion = new Set(fasesSeleccionadas);
      this.fases = fasesConfiguradas.filter(fase => seleccion.has(fase.numero));
    } else {
      this.fases = fasesConfiguradas;
    }
    this.faseActualIndice = 0;
    this.prepararFaseActual();
  }

  private limitarDistractores(fase: FaseNivelTres, cantidad: number): TarjetaVariable[] {
    const soluciones = new Set(
      Object.entries(fase.reglas.variablesEsperadas).map(([nombre, valor]) => {
        const valorCodigo = typeof valor === 'string' ? `"${valor}"` : String(valor);
        return `${nombre}=${valorCodigo}`.replace(/\s+/g, '');
      })
    );
    let distractoresIncluidos = 0;
    return fase.tarjetas.filter(tarjeta => {
      const esSolucion = soluciones.has(tarjeta.codigo.replace(/\s+/g, ''));
      if (esSolucion) return true;
      if (distractoresIncluidos >= cantidad) return false;
      distractoresIncluidos++;
      return true;
    });
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
      reto_nivel_id: 3,
      tiempo_segundos: this.tiempoSegundos,
      intentos: this.intentosCalificables,
      vidas_restantes: this.vidas,
      ayudas_usadas: this.esActividadAula ? false : this.ayudasUsadas,
      ...(!this.esActividadAula ? { tarjetas_usadas: false, vidas_perdidas: this.erroresAcumulados } : {}),
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

  private fallarFase(resultado: ResultadoEvaluacion): void {
    this.ejecutando = false;
    this.falloFase = true;
    this.vidas--;
    this.erroresAcumulados++;
    this.errores = this.explicarErrores(resultado);

    const cantidad = resultado.estadoFinal.variables['cantidad'];
    if (typeof cantidad === 'number' && cantidad > 3) {
      this.estadoEscena = 'sobrecarga';
      this.cantidadAtaques = cantidad;
      this.bitacora = `${cantidad} ataques excedieron la energía segura de Drako.`;
    } else {
      this.estadoEscena = 'fallo';
      this.bitacora = this.errores[0] ?? 'Las variables no contienen los valores correctos.';
    }

    if (this.vidas <= 0) {
      this.gameOver = true;
      this.detenerTemporizador();
    }
  }

  private explicarErrores(resultado: ResultadoEvaluacion): string[] {
    const variables = resultado.estadoFinal.variables;
    const mensajes: string[] = [];

    if (this.variableRequerida('luz') && variables['luz'] !== true) {
      if (!('luz' in variables)) mensajes.push('Falta crear la variable luz.');
      else if (typeof variables['luz'] !== 'boolean') mensajes.push('luz debe guardar el booleano true, sin comillas.');
      else mensajes.push('luz está en false y la cueva permanece oscura.');
    }
    if (this.variableRequerida('elemento') && variables['elemento'] !== 'Fuego') {
      if (!('elemento' in variables)) mensajes.push('Falta crear la variable elemento.');
      else if (typeof variables['elemento'] !== 'string') mensajes.push('elemento debe guardar un texto entre comillas.');
      else mensajes.push('El elemento correcto para esta batalla es "Fuego".');
    }
    if (this.variableRequerida('cantidad') && variables['cantidad'] !== 3) {
      const cantidad = variables['cantidad'];
      if (!('cantidad' in variables)) mensajes.push('Falta crear la variable cantidad.');
      else if (typeof cantidad !== 'number') mensajes.push('cantidad debe guardar el entero 3, no un texto ni un booleano.');
      else if (cantidad < 3) mensajes.push('La cantidad es insuficiente: quedarán murciélagos sin atacar.');
      else mensajes.push('La cantidad es excesiva y provoca una sobrecarga mágica.');
    }

    if (mensajes.length === 0) {
      return resultado.errores.map(error => error.mensaje);
    }
    return mensajes;
  }

  private actualizarConfiguracionTarjetas(): void {
    this.configuracionTarjetasActual = this.faseActual.tarjetas.map(tarjeta => {
      const colores = this.tonoColores[tarjeta.tono];
      return {
        nombre: tarjeta.etiqueta,
        titulo: tarjeta.tipo,
        accion: tarjeta.codigo,
        colorBoton: colores.boton,
        colorConsola: colores.consola
      };
    });
  }

  private renderizarPergamino(): void {
    if (!this.layoutJuego) return;

    const lineas: Instruccion[] = [];
    if (this.codigoUsuario.trim()) {
      this.codigoUsuario.split('\n').forEach(linea => {
        lineas.push({ texto: linea, color: '#dcecff', tieneError: false });
      });
    } else {
      lineas.push({
        texto: this.configuracionNivel.plantilla.placeholder,
        color: '#6b7280',
        tieneError: false,
        esPlaceholder: true
      });
    }
    lineas.push({
      texto: this.faseActual.instruccionFija,
      color: '#c586c0',
      tieneError: false,
      fija: true
    });

    this.layoutJuego.lineasCodigo = lineas;
    if (this.layoutJuego.consola) this.layoutJuego.consola.lineas = lineas;
  }

  private extraerCodigoUsuario(codigoCompleto: string): string {
    return codigoCompleto
      .replace(/\r/g, '')
      .split('\n')
      .filter(linea => linea.trim() !== this.faseActual.instruccionFija.trim())
      .filter(linea => linea.trim() !== this.configuracionNivel.plantilla.placeholder.trim())
      .join('\n')
      .trim();
  }

  private solucionVisibleActual(): string[] {
    const esperadas = this.faseActual.reglas.variablesEsperadas;
    const asignaciones = Object.entries(esperadas).map(([nombre, valor]) => {
      const valorVisible = typeof valor === 'string' ? `"${valor}"` : String(valor);
      return `${nombre} = ${valorVisible}`;
    });
    return [...asignaciones, this.faseActual.instruccionFija];
  }

  private prepararFaseActual(): void {
    this.limpiarTareasPendientes();
    this.codigoUsuario = '';
    this.memoria = {};
    this.ejecutando = false;
    this.falloFase = false;
    this.pistaVisible = false;
    this.ayudaVisible = false;
    this.mensajeObjeto = '';
    this.errores = [];
    this.estadoEscena = 'espera';
    this.luzActiva = this.faseActual.numero === 2 || this.faseActual.numero === 3;
    this.elementoActivo = this.faseActual.numero === 3 ? 'Fuego' : '';
    this.cantidadAtaques = 0;
    this.murcielagosDerrotados = 0;
    this.actualizarConfiguracionTarjetas();
    if (this.layoutJuego?.consola) this.layoutJuego.consola.historialPlantilla = [];
    this.renderizarPergamino();
    this.bitacora = this.faseActual.numero === 4
      ? 'El murciélago alfa bloquea la salida. Reconstruye las tres variables para vencerlo.'
      : `Fase ${this.faseActual.numero}: las variables de esta prueba están vacías.`;
  }

  private iniciarTemporizador(): void {
    if (this.tiempoInicioMs > 0) return;
    this.tiempoInicioMs = Date.now();
    this.temporizador = setInterval(() => {
      this.tiempoSegundos = Math.floor((Date.now() - this.tiempoInicioMs) / 1000);
    }, 1000);
  }

  private detenerTemporizador(): void {
    if (this.temporizador) clearInterval(this.temporizador);
    this.temporizador = undefined;
  }

  private programar(tarea: () => void, demoraMs: number): void {
    const temporizador = setTimeout(tarea, demoraMs);
    this.tareasPendientes.push(temporizador);
  }

  private limpiarTareasPendientes(): void {
    for (const tarea of this.tareasPendientes) clearTimeout(tarea);
    this.tareasPendientes = [];
  }
}
