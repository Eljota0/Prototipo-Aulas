import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GameHeaderComponent } from '../game-header/game-header.component';
import {
  BanderasEstrategiaTaladro,
  FaseTaladro
} from '../motor-v2/evaluador-nivel';
import { MotorEjecucionService } from '../motor-v2/motor-ejecucion.service';
import {
  AulasService,
  ParametrosEvaluacion,
  RetoPersonalizadoResponse
} from '../services/aulas.service';
import { LoaderService } from '../services/loader.service';
import { ProgresoService } from '../services/progreso.service';

type TipoEventoTaladro = 'temperatura' | 'peso' | 'carbon';
type EstadoTaladro =
  | 'detenido'
  | 'perforando'
  | 'liberando-vapor'
  | 'empacando'
  | 'recargando'
  | 'explosion'
  | 'banda-rota'
  | 'sin-combustible'
  | 'estable';

interface TarjetaTaladro {
  codigo: string;
  etiqueta: string;
  tono: 'azul' | 'verde' | 'dorado' | 'violeta';
  tipo: 'condicion' | 'accion';
  protocolo: TipoEventoTaladro;
}

interface FaseNivelDos {
  numero: FaseTaladro;
  titulo: string;
  concepto: string;
  objetivo: string;
  pista: string;
  evento: string;
  tarjetas: TarjetaTaladro[];
}

interface ProtocoloAprendido {
  numero: number;
  nombre: string;
  condicion: string;
  accion: string;
  condicionCodigo: string;
  accionCodigo: string;
}

@Component({
  selector: 'app-nivel-dos-prototipo',
  standalone: true,
  imports: [CommonModule, FormsModule, GameHeaderComponent],
  templateUrl: './nivel-dos-prototipo.component.html',
  styleUrl: './nivel-dos-prototipo.component.scss'
})
export class NivelDosPrototipoComponent implements OnInit, OnDestroy {
  readonly protocolosAprendidos: ProtocoloAprendido[] = [
    {
      numero: 1,
      nombre: 'Temperatura',
      condicion: 'Si supera 100°',
      accion: 'Liberar vapor',
      condicionCodigo: 'si(taladro.temperatura > 100)',
      accionCodigo: 'taladro.liberarVapor();'
    },
    {
      numero: 2,
      nombre: 'Carga',
      condicion: 'Si supera 50',
      accion: 'Empacar cristales',
      condicionCodigo: 'si(taladro.pesoCarga > 50)',
      accionCodigo: 'taladro.empacarCristales();'
    },
    {
      numero: 3,
      nombre: 'Carbón',
      condicion: 'Si llega a 0',
      accion: 'Recargar carbón',
      condicionCodigo: 'si(taladro.carbon == 0)',
      accionCodigo: 'taladro.recargarCarbon();'
    }
  ];

  readonly fasesBase: FaseNivelDos[] = [
    {
      numero: 1,
      titulo: 'Control de sobrecalentamiento',
      concepto: 'Evento de temperatura',
      objetivo: 'Programa al taladro para liberar vapor cuando su temperatura supere los 100°.',
      pista: 'Inserta “Si supera 100°” y después coloca “Liberar vapor” dentro de sus llaves.',
      evento: 'evento(taladro.sobrecalentamiento) {',
      tarjetas: [
        { codigo: 'taladro.apagarMotor();', etiqueta: 'Apagar motor', tono: 'verde', tipo: 'accion', protocolo: 'temperatura' },
        { codigo: 'si(taladro.temperatura > 100) {\n}', etiqueta: 'Si supera 100°', tono: 'dorado', tipo: 'condicion', protocolo: 'temperatura' },
        { codigo: 'si(taladro.temperatura < 100) {\n}', etiqueta: 'Si está frío', tono: 'violeta', tipo: 'condicion', protocolo: 'temperatura' },
        { codigo: 'taladro.liberarVapor();', etiqueta: 'Liberar vapor', tono: 'azul', tipo: 'accion', protocolo: 'temperatura' }
      ]
    },
    {
      numero: 2,
      titulo: 'Carga de cristales',
      concepto: 'Evento de sobrecarga',
      objetivo: 'Empaca los cristales cuando el peso acumulado supere 50 unidades.',
      pista: 'Primero escucha si pesoCarga supera 50 y luego empaca los cristales dentro de la condición.',
      evento: 'evento(taladro.sobrecarga) {',
      tarjetas: [
        { codigo: 'taladro.empacarCristales();', etiqueta: 'Empacar cristales', tono: 'violeta', tipo: 'accion', protocolo: 'peso' },
        { codigo: 'si(taladro.pesoCarga < 50) {\n}', etiqueta: 'Si pesa poco', tono: 'verde', tipo: 'condicion', protocolo: 'peso' },
        { codigo: 'si(taladro.pesoCarga > 50) {\n}', etiqueta: 'Si supera 50', tono: 'azul', tipo: 'condicion', protocolo: 'peso' },
        { codigo: 'taladro.detenerBanda();', etiqueta: 'Detener banda', tono: 'dorado', tipo: 'accion', protocolo: 'peso' }
      ]
    },
    {
      numero: 3,
      titulo: 'Reserva de carbón',
      concepto: 'Evento de combustible',
      objetivo: 'Recarga el carbón cuando el depósito llegue exactamente a 0.',
      pista: 'Compara carbon con 0 usando == y coloca la recarga dentro de esa condición.',
      evento: 'evento(taladro.tanqueVacio) {',
      tarjetas: [
        { codigo: 'taladro.apagarHorno();', etiqueta: 'Apagar horno', tono: 'azul', tipo: 'accion', protocolo: 'carbon' },
        { codigo: 'taladro.recargarCarbon();', etiqueta: 'Recargar carbón', tono: 'dorado', tipo: 'accion', protocolo: 'carbon' },
        { codigo: 'si(taladro.carbon > 0) {\n}', etiqueta: 'Si aún queda', tono: 'verde', tipo: 'condicion', protocolo: 'carbon' },
        { codigo: 'si(taladro.carbon == 0) {\n}', etiqueta: 'Si carbón es 0', tono: 'violeta', tipo: 'condicion', protocolo: 'carbon' }
      ]
    },
    {
      numero: 4,
      titulo: 'Turno automático completo',
      concepto: 'Coordinación de eventos',
      objetivo: 'Construye los tres protocolos en orden para mantener el taladro funcionando por sí solo.',
      pista: 'Consulta la memoria de protocolos: temperatura, carga y carbón. Cada acción debe quedar dentro de su propia condición.',
      evento: 'evento(taladro.operacionCompleta) {',
      tarjetas: [
        { codigo: 'taladro.recargarCarbon();', etiqueta: 'Recargar carbón', tono: 'verde', tipo: 'accion', protocolo: 'carbon' },
        { codigo: 'si(taladro.pesoCarga > 50) {\n}', etiqueta: 'Peso > 50', tono: 'dorado', tipo: 'condicion', protocolo: 'peso' },
        { codigo: 'taladro.apagarMotor();', etiqueta: 'Apagar motor', tono: 'violeta', tipo: 'accion', protocolo: 'temperatura' },
        { codigo: 'si(taladro.temperatura > 100) {\n}', etiqueta: 'Temperatura > 100', tono: 'azul', tipo: 'condicion', protocolo: 'temperatura' },
        { codigo: 'taladro.empacarCristales();', etiqueta: 'Empacar carga', tono: 'violeta', tipo: 'accion', protocolo: 'peso' },
        { codigo: 'si(taladro.carbon == 0) {\n}', etiqueta: 'Carbón == 0', tono: 'azul', tipo: 'condicion', protocolo: 'carbon' },
        { codigo: 'taladro.liberarVapor();', etiqueta: 'Liberar vapor', tono: 'verde', tipo: 'accion', protocolo: 'temperatura' },
        { codigo: 'si(taladro.pesoCarga < 50) {\n}', etiqueta: 'Peso < 50', tono: 'dorado', tipo: 'condicion', protocolo: 'peso' }
      ]
    }
  ];

  fases: FaseNivelDos[] = [...this.fasesBase];

  faseActualIndice = 0;
  codigoUsuario = '';
  vidas = 3;
  temperatura = 0;
  pesoCristales = 0;
  combustible = 100;
  intentosEjecucion = 0;
  erroresAcumulados = 0;
  tiempoSegundos = 0;
  ejecutando = false;
  faseCompletada = false;
  nivelCompletado = false;
  falloFase = false;
  gameOver = false;
  pistaVisible = false;
  ayudaVisible = false;
  estadoTaladro: EstadoTaladro = 'detenido';
  errores: string[] = [];
  bitacora = 'Motor detenido. Construye la estrategia dentro del evento.';
  estrellas = 0;
  calificacion = 0;
  pestanaInventario: 'acciones' | 'objetos' = 'acciones';
  antiCopiaActivo = false;
  cargandoContextoAula = false;
  guardandoProgreso = false;
  progresoGuardado = false;
  mensajeSincronizacion = '';

  estrategias: BanderasEstrategiaTaladro = this.banderasVacias();
  eventosResueltos: Record<TipoEventoTaladro, boolean> = {
    temperatura: false,
    peso: false,
    carbon: false
  };

  private tiempoInicioMs = 0;
  private temporizador?: ReturnType<typeof setInterval>;
  private gameLoop?: ReturnType<typeof setInterval>;
  private erroresPendientes: string[] = [];
  private aulaActualId?: string;
  private retoActualId?: string;
  private esActividadAula = false;
  private solucionesPorFase = new Map<number, string>();

  constructor(
    private motor: MotorEjecucionService,
    private loaderService: LoaderService,
    private router: Router,
    private progresoService: ProgresoService,
    private aulasService: AulasService
  ) {}

  ngOnInit(): void {
    this.cargarContextoInicial();
  }

  get faseActual(): FaseNivelDos {
    return this.fases[this.faseActualIndice];
  }

  get plantillaInicio(): string {
    return this.faseActual.evento;
  }

  get plantillaFin(): string {
    return '}';
  }

  get codigoCompleto(): string {
    const interior = this.codigoUsuario.trim();
    return interior
      ? `${this.plantillaInicio}\n  ${interior.replace(/\n/g, '\n  ')}\n${this.plantillaFin}`
      : `${this.plantillaInicio}\n${this.plantillaFin}`;
  }

  get lineasInteriores(): number[] {
    return this.codigoUsuario.length > 0
      ? this.codigoUsuario.split('\n').map((_, indice) => indice + 2)
      : [2];
  }

  get filasCodigoUsuario(): number {
    return Math.max(1, this.codigoUsuario.split('\n').length);
  }

  get temperaturaPorcentaje(): number {
    return Math.min(100, this.temperatura);
  }

  get pesoPorcentaje(): number {
    return Math.min(100, this.pesoCristales * 2);
  }

  get estadoTaladroTexto(): string {
    return {
      detenido: 'EN ESPERA',
      perforando: 'PERFORANDO',
      'liberando-vapor': 'LIBERANDO VAPOR',
      empacando: 'EMPACANDO CRISTALES',
      recargando: 'RECARGANDO CARBÓN',
      explosion: 'SOBRECARGA CRÍTICA',
      'banda-rota': 'BANDA TRANSPORTADORA ROTA',
      'sin-combustible': 'HORNO APAGADO',
      estable: 'SISTEMA ESTABLE'
    }[this.estadoTaladro];
  }

  get intentosCalificables(): number {
    // Las ejecuciones obligatorias de cada fase no son reintentos. Solo se
    // contabiliza el intento exitoso final más los fallos reales del jugador.
    return this.erroresAcumulados + 1;
  }

  get estrellasAnimadas(): number[] {
    return Array.from({ length: this.estrellas }, (_, indice) => indice);
  }

  get mensajeRecompensa(): string {
    const palabra = this.estrellas === 1 ? 'estrella' : 'estrellas';
    return `¡Felicidades! Obtuviste ${this.estrellas} ${palabra} por completar la misión.`;
  }

  get tituloFallo(): string {
    if (this.estadoTaladro === 'banda-rota') return 'LA BANDA SE ROMPIÓ';
    if (this.estadoTaladro === 'sin-combustible') return 'EL HORNO SE APAGÓ';
    return 'EL TALADRO EXPLOTÓ';
  }

  insertarTarjeta(tarjeta: TarjetaTaladro): void {
    if (this.ejecutando || this.faseCompletada || this.falloFase || this.gameOver) return;

    if (tarjeta.tipo === 'condicion') {
      if (this.faseActual.numero === 4 && this.codigoUsuario.trim()) {
        this.codigoUsuario = `${this.codigoUsuario.trimEnd()}\n${tarjeta.codigo}`;
      } else {
        this.codigoUsuario = tarjeta.codigo;
      }
    } else if (/si\s*\(/.test(this.codigoUsuario) && this.codigoUsuario.trimEnd().endsWith('}')) {
      const cierre = this.codigoUsuario.lastIndexOf('}');
      this.codigoUsuario = `${this.codigoUsuario.slice(0, cierre).trimEnd()}\n  ${tarjeta.codigo}\n}`;
    } else {
      this.codigoUsuario = this.codigoUsuario.trim()
        ? `${this.codigoUsuario.trimEnd()}\n${tarjeta.codigo}`
        : tarjeta.codigo;
    }

    this.errores = [];
  }

  protocoloInsertado(protocolo: ProtocoloAprendido): boolean {
    return this.codigoUsuario.includes(protocolo.condicionCodigo)
      && this.codigoUsuario.includes(protocolo.accionCodigo);
  }

  numeroProtocolo(tipo: TipoEventoTaladro): number {
    return { temperatura: 1, peso: 2, carbon: 3 }[tipo];
  }

  limpiarPergamino(): void {
    if (this.ejecutando || this.faseCompletada || this.falloFase) return;
    this.codigoUsuario = '';
    this.errores = [];
  }

  borrarLinea(): void {
    if (this.ejecutando || this.faseCompletada || this.falloFase) return;
    const lineas = this.codigoUsuario.split('\n');
    lineas.pop();
    this.codigoUsuario = lineas.join('\n');
    this.errores = [];
  }

  ejecutarCodigo(): void {
    if (this.ejecutando || this.faseCompletada || this.falloFase || this.gameOver) return;

    this.iniciarTemporizador();
    this.detenerGameLoop();
    this.intentosEjecucion++;
    this.ejecutando = true;
    this.reiniciarMedidores();
    this.errores = [];
    this.estadoTaladro = 'perforando';
    this.bitacora = `Fase ${this.faseActual.numero}: los sensores comenzaron a enviar datos...`;

    const resultado = this.motor.evaluarTaladro(this.codigoCompleto, this.faseActual.numero);
    this.estrategias = resultado.banderas;
    this.erroresPendientes = resultado.errores.map(error => error.mensaje);

    this.gameLoop = setInterval(() => this.actualizarSimulacion(), 240);
  }

  avanzarFase(): void {
    if (!this.faseCompletada || this.faseActualIndice >= this.fases.length - 1) return;
    this.faseActualIndice++;
    this.prepararFaseActual();
  }

  reintentarFase(): void {
    if (!this.falloFase || this.gameOver) return;
    this.falloFase = false;
    this.prepararFaseActual();
  }

  reiniciarNivel(): void {
    this.detenerTemporizador();
    this.detenerGameLoop();
    this.faseActualIndice = 0;
    this.vidas = 3;
    this.intentosEjecucion = 0;
    this.erroresAcumulados = 0;
    this.tiempoSegundos = 0;
    this.tiempoInicioMs = 0;
    this.nivelCompletado = false;
    this.gameOver = false;
    this.estrellas = 0;
    this.calificacion = 0;
    this.guardandoProgreso = false;
    this.progresoGuardado = false;
    this.mensajeSincronizacion = '';
    this.solucionesPorFase.clear();
    this.prepararFaseActual();
  }

  salir(): void {
    this.router.navigate([this.esActividadAula ? '/pantalla-principal' : '/aventura']);
  }

  ngOnDestroy(): void {
    this.detenerTemporizador();
    this.detenerGameLoop();
  }

  private actualizarSimulacion(): void {
    const fase = this.faseActual.numero;
    this.estadoTaladro = 'perforando';
    // El valor debe superar el umbral para que el código enseñado (> 100)
    // también sea verdadero en la simulación, no solo en el evaluador.
    this.temperatura = Math.min(110, this.temperatura + 10);

    if (fase >= 2) {
      this.pesoCristales = Math.min(55, this.pesoCristales + 5);
    }
    if (fase >= 3) {
      this.combustible = Math.max(0, this.combustible - 10);
    }

    if (fase === 1 && this.temperatura > 100) {
      this.resolverEvento('temperatura');
      return;
    }

    if (fase === 2) {
      if (this.temperatura > 100) this.temperatura = 0;
      if (this.pesoCristales > 50) this.resolverEvento('peso');
      return;
    }

    if (fase === 3) {
      if (this.temperatura > 100) this.temperatura = 0;
      if (this.pesoCristales > 50) this.pesoCristales = 0;
      if (this.combustible <= 0) this.resolverEvento('carbon');
      return;
    }

    if (fase === 4) {
      if (this.temperatura > 100 && !this.eventosResueltos.temperatura) {
        this.resolverEvento('temperatura');
      }
      if (this.pesoCristales > 50 && !this.eventosResueltos.peso && !this.falloFase) {
        this.resolverEvento('peso');
      }
      if (this.combustible <= 0 && !this.eventosResueltos.carbon && !this.falloFase) {
        this.resolverEvento('carbon');
      }
      if (this.eventosResueltos.temperatura && this.eventosResueltos.peso && this.eventosResueltos.carbon) {
        this.detenerGameLoop();
        setTimeout(() => this.completarFase(), 850);
      }
    }
  }

  private resolverEvento(tipo: TipoEventoTaladro): void {
    const estrategiaCorrecta = {
      temperatura: this.estrategias.estrategiaVaporCorrecta,
      peso: this.estrategias.estrategiaPesoCorrecta,
      carbon: this.estrategias.estrategiaCarbonCorrecta
    }[tipo];

    if (!estrategiaCorrecta) {
      this.fallarFase(tipo);
      return;
    }

    this.eventosResueltos[tipo] = true;
    if (tipo === 'temperatura') {
      this.estadoTaladro = 'liberando-vapor';
      this.temperatura = 0;
      this.bitacora = 'El listener detectó el calor y liberó el vapor.';
    }
    if (tipo === 'peso') {
      this.estadoTaladro = 'empacando';
      this.pesoCristales = 0;
      this.bitacora = 'La banda empacó los cristales antes de romperse.';
    }
    if (tipo === 'carbon') {
      this.estadoTaladro = 'recargando';
      this.combustible = 100;
      this.bitacora = 'El depósito recibió carbón y el horno siguió encendido.';
    }

    if (this.faseActual.numero < 4) {
      this.detenerGameLoop();
      setTimeout(() => this.completarFase(), 900);
    }
  }

  private completarFase(): void {
    if (this.falloFase || this.gameOver) return;
    this.solucionesPorFase.set(this.faseActual.numero, this.codigoCompleto);
    this.ejecutando = false;
    this.faseCompletada = true;
    this.estadoTaladro = 'estable';
    this.bitacora = `Fase ${this.faseActual.numero} superada. El protocolo quedó activo.`;

    if (this.faseActualIndice === this.fases.length - 1) {
      this.nivelCompletado = true;
      this.finalizarNivel();
      return;
    }

    // Las fases intermedias continúan directamente, igual que las transiciones
    // del Nivel 1. La animación de recompensa se reserva para el final.
    this.avanzarFase();
  }

  private fallarFase(tipo: TipoEventoTaladro): void {
    this.detenerGameLoop();
    this.ejecutando = false;
    this.falloFase = true;
    this.vidas--;
    this.erroresAcumulados++;
    this.errores = this.erroresPendientes.length > 0
      ? this.erroresPendientes
      : ['El evento no tenía una estrategia válida.'];

    if (tipo === 'temperatura') {
      this.estadoTaladro = 'explosion';
      this.bitacora = 'La temperatura llegó al límite y el taladro explotó.';
    }
    if (tipo === 'peso') {
      this.estadoTaladro = 'banda-rota';
      this.bitacora = 'La carga superó el límite y rompió la banda transportadora.';
    }
    if (tipo === 'carbon') {
      this.estadoTaladro = 'sin-combustible';
      this.bitacora = 'El carbón se agotó y el fuego del taladro se apagó.';
    }

    if (this.vidas <= 0) {
      this.gameOver = true;
      this.detenerTemporizador();
    }
  }

  private prepararFaseActual(): void {
    this.detenerGameLoop();
    this.codigoUsuario = '';
    this.reiniciarMedidores();
    this.ejecutando = false;
    this.faseCompletada = false;
    this.falloFase = false;
    this.pistaVisible = false;
    this.ayudaVisible = false;
    this.errores = [];
    this.erroresPendientes = [];
    this.estrategias = this.banderasVacias();
    this.estadoTaladro = 'detenido';
    this.bitacora = `Fase ${this.faseActual.numero} preparada. Construye la estrategia dentro del evento.`;
    this.pestanaInventario = 'acciones';
  }

  private reiniciarMedidores(): void {
    this.temperatura = 0;
    this.pesoCristales = 0;
    this.combustible = 100;
    this.eventosResueltos = { temperatura: false, peso: false, carbon: false };
  }

  private iniciarTemporizador(): void {
    if (this.tiempoInicioMs > 0) return;
    this.tiempoInicioMs = Date.now();
    this.temporizador = setInterval(() => {
      this.tiempoSegundos = Math.floor((Date.now() - this.tiempoInicioMs) / 1000);
    }, 1000);
  }

  private finalizarNivel(): void {
    this.detenerTemporizador();
    const intentos = this.intentosCalificables;

    // Misma rúbrica configurada para el Nivel 1 en el backend:
    // 3 estrellas hasta 60 s, 2 hasta 120 s y 1 después de ese tiempo.
    this.calificacion = intentos <= 1 ? 10 : intentos === 2 ? 8 : 6;
    this.estrellas = this.tiempoSegundos <= 60 ? 3 : this.tiempoSegundos <= 120 ? 2 : 1;
    if (intentos > 3) this.estrellas = Math.max(1, this.estrellas - 1);
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
        const reto = retos.find(item => item.id === retoId && item.reto_nivel_id === 2);
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
    const fasesSeleccionadas = parametros?.fases_seleccionadas
      ?.map(Number)
      .filter(numero => Number.isInteger(numero) && numero >= 1 && numero <= 4);

    if (fasesSeleccionadas?.length) {
      const seleccion = new Set(fasesSeleccionadas);
      this.fases = this.fasesBase.filter(fase => seleccion.has(fase.numero));
    }
  }

  private guardarProgreso(): void {
    if (this.guardandoProgreso || this.progresoGuardado) return;

    // El alias /prototipo permite revisar el nivel sin iniciar sesión. En ese
    // modo la partida es deliberadamente local y no debe generar peticiones
    // fallidas ni alterar el progreso oficial del jugador.
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
      reto_nivel_id: 2,
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

  private banderasVacias(): BanderasEstrategiaTaladro {
    return {
      estrategiaVaporCorrecta: false,
      estrategiaPesoCorrecta: false,
      estrategiaCarbonCorrecta: false
    };
  }

  private detenerTemporizador(): void {
    if (this.temporizador) clearInterval(this.temporizador);
    this.temporizador = undefined;
  }

  private detenerGameLoop(): void {
    if (this.gameLoop) clearInterval(this.gameLoop);
    this.gameLoop = undefined;
  }

}
