import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LayoutJuegoComponent } from '../layout-juego/layout-juego.component';
import { TarjetaConfig } from '../baraja-tarjetas/baraja-tarjetas.component';
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
import nivel2Data from '../../assets/data/aventuraniveles/nivel-2.json';

type TipoEventoTaladro = 'temperatura' | 'peso' | 'agua';
type EstadoTaladro =
  | 'detenido'
  | 'perforando'
  | 'liberando-vapor'
  | 'empacando'
  | 'recargando' // keep for legacy if needed, or remove
  | 'explosion'
  | 'banda-rota'
  | 'sin-combustible'
  | 'estable'
  | 'ahogo'
  | 'descompuesto'
  | 'desestabilizado';

interface TarjetaTaladro {
  codigo: string;
  etiqueta: string;
  tono: 'verde' | 'dorado' | 'azul' | 'violeta';
  tipo: 'accion' | 'condicion';
  protocolo: TipoEventoTaladro;
}

interface FaseNivelDos {
  numero: number;
  titulo: string;
  concepto: string;
  objetivo: string;
  pista: string;
  evento: string;
  tarjetas: TarjetaTaladro[];
}

export interface ProtocoloAprendido {
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
  imports: [CommonModule, FormsModule, LayoutJuegoComponent],
  templateUrl: './nivel-dos-prototipo.component.html',
  styleUrl: './nivel-dos-prototipo.component.scss'
})
export class NivelDosPrototipoComponent implements OnInit, OnDestroy {
  readonly protocolosAprendidos: ProtocoloAprendido[] = nivel2Data.protocolosAprendidos as ProtocoloAprendido[];
  fases: FaseNivelDos[] = nivel2Data.fases as unknown as FaseNivelDos[];

  @ViewChild(LayoutJuegoComponent) layoutJuego!: LayoutJuegoComponent;
  pasoAndamiaje = 0;
  antiCopiaActivo = false;
  ayudaUsada = false;

  private readonly tonoColores: Record<string, { boton: string; consola: string }> = {
    azul:    { boton: '#174bd4', consola: '#82B1FF' },
    verde:   { boton: '#288650', consola: '#A5D6A7' },
    dorado:  { boton: '#df4517', consola: '#FFAB91' },
    violeta: { boton: '#8e1ba4', consola: '#CE93D8' },
    rojo:    { boton: '#c62828', consola: '#ef9a9a' },
    naranja: { boton: '#e65100', consola: '#ffcc80' },
    cyan:    { boton: '#006064', consola: '#80deea' },
    gris:    { boton: '#424242', consola: '#bdbdbd' },
    turquesa:{ boton: '#00838f', consola: '#4dd0e1' },
    purpura: { boton: '#4a148c', consola: '#ea80fc' },
    mostaza: { boton: '#f57f17', consola: '#fff59d' },
    magenta: { boton: '#880e4f', consola: '#f48fb1' }
  };

  inventarioNivel = {
    libro: { activo: true },
    clarividencia: { activo: false, consumida: false },
    vida: { activo: true, consumida: false },
    tiempo: { activo: false, consumida: false }
  };

  faseActualIndice = 0;
  codigoUsuario = '';
  temperatura = 0;
  pesoCristales = 0;
  combustible = 100;
  profundidadActual = 0;
  profundidadAgua = 500;
  profundidadMaxima = 600;
  extrayendoAgua = false;
  aguaContaminada = false;
  escalasProfundidad: number[] = Array.from({length: 13}, (_, i) => i * 50); // [0, 50, 100... 600]
  intentosEjecucion = 0;
  erroresAcumulados = 0;
  tiempoSegundos = 0;
  ejecutando = false;
  faseCompletada = false;
  nivelCompletado = false;
  falloFase = false;
  modalFalloTimeout?: ReturnType<typeof setTimeout>;
  gameOver = false;
  pistaVisible = false;
  ayudaVisible = false;
  estadoTaladro: EstadoTaladro = 'detenido';
  errores: string[] = [];
  bitacora = 'Motor detenido. Construye la estrategia dentro del evento.';
  estrellas = 0;
  calificacion = 0;
  pestanaInventario: 'acciones' | 'objetos' = 'acciones';
  cargandoContextoAula = false;
  guardandoProgreso = false;
  progresoGuardado = false;
  mensajeSincronizacion = '';
  
  falloFase1AndamiajeConfig = { operador: '', valor: 0, accion: '', tipoFallo: '' };
  falloFase2AndamiajeConfig = { operador: '', valor: 0, accion: '', tipoFallo: '' };
  falloFase3AndamiajeConfig = { operador: '', valor: 0, accion: '', booleano: false, tipoFallo: '' };
  
  historialFases = '';
  plantillaActiva = '';
  get ejecutandoComandos(): boolean { return this.ejecutando; }
  get listoParaEjecutar(): boolean {
    return !!this.plantillaActiva && 
           this.pasoAndamiaje > 0 && 
           !this.plantillaActiva.includes('▯');
  }
  get tituloFaseCorto(): string {
    switch(this.faseActual.numero) {
      case 1: return 'Encender el motor';
      case 2: return 'Estabilizar el taladro';
      case 3: return 'Extraer agua';
      default: return '';
    }
  }

  configuracionTarjetasActual: TarjetaConfig[] = [];

  actualizarTarjetasDisponibles(): void {
    if (this.faseActual.numero >= 1 && this.faseActual.numero <= 3) {
      let andamiaje: any[] = [];

      if (this.faseActual.numero === 1) {
        switch (this.pasoAndamiaje) {
          case 0:
            andamiaje = [{ etiqueta: "Control temperatura", codigo: "si(taladro.temperatura \u25AF \u25AF) {\n    \u25AF\n  }", tono: "dorado" }];
            break;
          case 1:
            andamiaje = [
              { etiqueta: "Mayor que", codigo: ">", tono: "verde" },
              { etiqueta: "Menor que", codigo: "<", tono: "rojo" }
            ];
            break;
          case 2:
            const tonosArray = ['azul', 'naranja', 'violeta', 'cyan', 'dorado'];
            andamiaje = [0, 50, 75, 100, 150].map((v, i) => ({ etiqueta: "Valor", codigo: v.toString(), tono: tonosArray[i % tonosArray.length] }));
            break;
          case 3:
            andamiaje = [
              { etiqueta: "Liberar vapor", codigo: "taladro.liberarVapor();", tono: "azul" },
              { etiqueta: "Apagar motor", codigo: "taladro.apagarMotor();", tono: "gris" },
              { etiqueta: "Extraer carb\u00f3n", codigo: "taladro.extraerCarbon();", tono: "verde" }
            ];
            break;
        }
      } else if (this.faseActual.numero === 2) {
        // Fase 2: Presión constante (andamiaje con ==)
        switch (this.pasoAndamiaje) {
          case 0:
            andamiaje = [{ etiqueta: "Control presión", codigo: "si(taladro.presion \u25AF \u25AF) {\n    \u25AF\n  }", tono: "mostaza" }];
            break;
          case 1:
            andamiaje = [
              { etiqueta: "Igual que", codigo: "==", tono: "turquesa" },
              { etiqueta: "Distinto de", codigo: "!=", tono: "magenta" },
              { etiqueta: "Mayor que", codigo: ">", tono: "purpura" },
              { etiqueta: "Menor que", codigo: "<", tono: "gris" }
            ];
            break;
          case 2:
            andamiaje = [
              { etiqueta: "Valor", codigo: "8", tono: "cyan" },
              { etiqueta: "Valor", codigo: "30", tono: "purpura" },
              { etiqueta: "Valor", codigo: "45", tono: "magenta" },
              { etiqueta: "Valor", codigo: "50", tono: "turquesa" },
              { etiqueta: "Valor", codigo: "55", tono: "mostaza" },
              { etiqueta: "Valor", codigo: "70", tono: "violeta" },
              { etiqueta: "Valor", codigo: "100", tono: "gris" }
            ];
            break;
          case 3:
            andamiaje = [
              { etiqueta: "Mantener fuerza", codigo: "taladro.mantenerFuerza();", tono: "turquesa" },
              { etiqueta: "Apagar motor", codigo: "taladro.apagarMotor();", tono: "gris" },
              { etiqueta: "Aumentar fuerza", codigo: "taladro.aumentarFuerza();", tono: "magenta" },
              { etiqueta: "Liberar vapor", codigo: "taladro.liberarVapor();", tono: "purpura" }
            ];
            break;
        }
      } else if (this.faseActual.numero === 3) {
        switch (this.pasoAndamiaje) {
          case 0:
            andamiaje = [{ etiqueta: "Recolectar Agua", codigo: "si(taladro.profundidad \u25AF \u25AF) {\n    \u25AF\n    taladro.extraerAgua = \u25AF;\n  }", tono: "azul" }];
            break;
          case 1:
            andamiaje = [
              { etiqueta: "Igual que", codigo: "==", tono: "turquesa" },
              { etiqueta: "Mayor que", codigo: ">", tono: "purpura" },
              { etiqueta: "Menor que", codigo: "<", tono: "gris" }
            ];
            break;
          case 2:
            andamiaje = [
              { etiqueta: "Valor", codigo: "200", tono: "cyan" },
              { etiqueta: "Valor", codigo: "500", tono: "purpura" },
              { etiqueta: "Valor", codigo: "800", tono: "magenta" }
            ];
            break;
          case 3:
            andamiaje = [
              { etiqueta: "Detenerse", codigo: "taladro.detenerse();", tono: "azul" },
              { etiqueta: "Apagar Motor", codigo: "taladro.apagarMotor();", tono: "gris" },
              { etiqueta: "Lanzar Gasolina", codigo: "taladro.lanzarGasolina();", tono: "purpura" }
            ];
            break;
          case 4:
            andamiaje = [
              { etiqueta: "Verdadero", codigo: "true", tono: "naranja" },
              { etiqueta: "Falso", codigo: "false", tono: "rojo" }
            ];
            break;
        }
      }

      const tarjetasFormateadas = andamiaje.map(t => {
        const colores = this.tonoColores[t.tono] || this.tonoColores['azul'];
        return { nombre: t.etiqueta, accion: t.codigo, colorBoton: colores.boton, colorConsola: colores.consola };
      });
      this.configuracionTarjetasActual = this.desordenarTarjetas(tarjetasFormateadas);
      return;
    }
    
    const tarjetasLibres = this.faseActual.tarjetas.map(t => {
      const colores = this.tonoColores[(t as any).tono] || this.tonoColores['azul'];
      return { nombre: (t as any).etiqueta, accion: (t as any).codigo, colorBoton: colores.boton, colorConsola: colores.consola };
    });
    this.configuracionTarjetasActual = this.desordenarTarjetas(tarjetasLibres);
  }

  private desordenarTarjetas(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  manejarToggleDraco(estado: boolean) { this.ayudaVisible = estado; }
  manejarUsoPocion(pocion: string) { if (pocion === 'libro') this.ayudaVisible = !this.ayudaVisible; }
  registrarAyudaUsada() { this.ayudaUsada = true; }

  manejarUsoTarjeta(tarjeta: TarjetaConfig): void {
    if (this.faseActual.numero > 3) { this.ayudaUsada = true; return; }
    
    if (this.layoutJuego && this.layoutJuego.consola) {
      this.layoutJuego.consola.guardarEstadoPlantilla(this.plantillaActiva);
    }
    
    if (this.pasoAndamiaje === 0) {
      this.plantillaActiva = `${this.faseActual.evento}\n${tarjeta.accion.split('\n').map(t => '  ' + t).join('\n')}\n}`;
      this.pasoAndamiaje++;
      this.actualizarTarjetasDisponibles();
    } else {
      if (this.plantillaActiva.includes('▯')) {
        this.plantillaActiva = this.plantillaActiva.replace('▯', tarjeta.accion);
        this.pasoAndamiaje++;
        this.actualizarTarjetasDisponibles();
      }
    }
    
    this.renderizarConsolaTexto();
  }

  retrocederPaso(plantillaAnterior: string): void {
    this.plantillaActiva = plantillaAnterior;
    this.pasoAndamiaje--;
    this.actualizarTarjetasDisponibles();
    this.renderizarConsolaTexto();
  }

  ngAfterViewInit(): void { setTimeout(() => this.inicializarConsolaTexto(), 0); }

  private inicializarConsolaTexto(): void {
    this.historialFases = '';
    if (this.faseActual.numero > 1 && this.solucionesPorFase.has(1)) {
      this.historialFases += this.solucionesPorFase.get(1) + '\n\n';
    }
    if (this.faseActual.numero > 2 && this.solucionesPorFase.has(2)) {
      this.historialFases += this.solucionesPorFase.get(2) + '\n\n';
    }
    
    this.plantillaActiva = `${this.faseActual.evento}\n  // Inserta tu codigo aqui\n}`;
    
    this.renderizarConsolaTexto();

    if (this.faseActual.numero <= 3) {
      this.pasoAndamiaje = 0;
      this.actualizarTarjetasDisponibles();
    }
  }

  private renderizarConsolaTexto(): void {
    if (!this.layoutJuego) return;
    
    const lineasBase: any[] = [];
    
    if (this.historialFases) {
      this.historialFases.trim().split('\n').forEach(linea => {
        lineasBase.push({ texto: linea, color: '#5c6370', tieneError: false, fija: true });
      });
      lineasBase.push({ texto: '', color: '#5c6370', tieneError: false, fija: true });
    }
    
    if (this.plantillaActiva) {
      this.plantillaActiva.split('\n').forEach((linea, index, array) => {
        const esPlaceholder = linea.includes('// Inserta tu codigo aqui');
        let color = '#DCDCAA';
        if (linea.startsWith('evento') || linea === '}') color = '#C586C0';
        if (esPlaceholder) color = '#6b7280';
        
        lineasBase.push({
          texto: linea,
          color: color,
          tieneError: false,
          esPlaceholder: esPlaceholder,
          fija: index === 0 || index === array.length - 1 || esPlaceholder
        });
      });
    }

    this.layoutJuego.lineasCodigo = lineasBase;
    if (this.layoutJuego.consola) {
      this.layoutJuego.consola.lineas = lineasBase;
      this.layoutJuego.consola.lineaActivaIndex = lineasBase.findIndex(l => l.esPlaceholder);
    }
  }

  restaurarPlantilla(): void {
    if (this.ejecutando || this.faseCompletada || this.falloFase) return;
    this.inicializarConsolaTexto();
    this.errores = [];
  }

  borrarUltimaLineaPlantilla(): void {
    // Disabled logic since undo stack is the primary driver
  }

  estrategias: BanderasEstrategiaTaladro = this.banderasVacias();
  eventosResueltos: Record<TipoEventoTaladro, boolean> = {
    temperatura: false,
    peso: false,
    agua: false
  };

  private tiempoInicioMs = 0;
  private temporizador?: ReturnType<typeof setInterval>;
  private gameLoop?: ReturnType<typeof setInterval>;
  private loopCosmetico?: ReturnType<typeof setInterval>;
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
    private aulasService: AulasService,
    private cdr: ChangeDetectorRef
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
    return Math.min(100, (this.temperatura / 300) * 100);
  }

  get pesoPorcentaje(): number {
    return Math.min(100, this.pesoCristales);
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
      estable: 'SISTEMA ESTABLE',
      ahogo: 'MOTOR AHOGADO',
      descompuesto: 'ENGRANAJES ROTOS',
      desestabilizado: 'SISTEMA INESTABLE'
    }[this.estadoTaladro] as string;
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


  ejecutarNivel(codigoDesdeConsola: string): void {
    if (this.ejecutando || this.faseCompletada || this.falloFase || this.gameOver) return;

    this.codigoUsuario = codigoDesdeConsola;

    this.iniciarTemporizador();
    this.detenerGameLoop();
    this.detenerLoopCosmetico(); // Detener el loop cosmético mientras corre el real
    this.intentosEjecucion++;
    this.ejecutando = true;
    this.reiniciarMedidores();
    this.errores = [];
    this.estadoTaladro = 'perforando';
    this.bitacora = `Fase ${this.faseActual.numero}: los sensores comenzaron a enviar datos...`;

    this.falloFase1AndamiajeConfig = { operador: '', valor: 0, accion: '', tipoFallo: '' };
    this.falloFase2AndamiajeConfig = { operador: '', valor: 0, accion: '', tipoFallo: '' };
    this.falloFase3AndamiajeConfig = { operador: '', valor: 0, accion: '', booleano: false, tipoFallo: '' };

    if (this.faseActual.numero === 1) {
      const res = this.motor.evaluarAndamiajeFase1(codigoDesdeConsola);
      if (res.valido) {
        this.estrategias.estrategiaVaporCorrecta = true;
      } else {
        this.estrategias.estrategiaVaporCorrecta = false;
        this.falloFase1AndamiajeConfig = res;
      }
    } else if (this.faseActual.numero === 2) {
      const res = this.motor.evaluarAndamiajeFase2(codigoDesdeConsola);
      if (res.valido) {
        this.estrategias.estrategiaPesoCorrecta = true;
      } else {
        this.estrategias.estrategiaPesoCorrecta = false;
        this.falloFase2AndamiajeConfig = res;
      }
    } else if (this.faseActual.numero === 3) {
      const res = this.motor.evaluarAndamiajeFase3(codigoDesdeConsola);
      if (res.valido) {
        this.estrategias.estrategiaAguaCorrecta = true;
      } else {
        this.estrategias.estrategiaAguaCorrecta = false;
        this.falloFase3AndamiajeConfig = res;
      }
    } else {
      const resultado = this.motor.evaluarTaladro(codigoDesdeConsola, this.faseActual.numero as FaseTaladro);
      this.estrategias = resultado.banderas;
      this.erroresPendientes = resultado.errores.map(error => error.mensaje);
    }

    this.gameLoop = setInterval(() => this.actualizarSimulacion(), 240);
  }

  transicionando = false;

  avanzarFase(): void {
    if (!this.faseCompletada || this.faseActualIndice >= this.fases.length - 1) return;
    
    this.transicionando = true;
    setTimeout(() => {
      this.faseActualIndice++;
      this.prepararFaseActual();
      this.transicionando = false;
    }, 500);
  }

  reintentarFase(): void {
    if (!this.falloFase || this.gameOver) return;
    this.falloFase = false;
    this.prepararFaseActual();
  }

  reiniciarNivel(): void {
    if (this.modalFalloTimeout) clearTimeout(this.modalFalloTimeout);
    this.detenerTemporizador();
    this.detenerGameLoop();
    this.detenerLoopCosmetico();
    this.faseActualIndice = 0;
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
    this.detenerLoopCosmetico();
    if (this.modalFalloTimeout) clearTimeout(this.modalFalloTimeout);
  }

  private actualizarSimulacion(): void {
    const fase = this.faseActual.numero;
    this.estadoTaladro = 'perforando';
    // El valor debe superar el umbral para que el código enseñado (> 100)
    // también sea verdadero en la simulación, no solo en el evaluador.
    this.temperatura = Math.min(300, this.temperatura + 10);

    if (fase >= 2) {
      this.pesoCristales = Math.min(55, this.pesoCristales + 5);
    }
    if (fase >= 3) {
      this.combustible = Math.max(0, this.combustible - 10);
    }

    if (fase === 1) {
      if (this.estrategias.estrategiaVaporCorrecta) {
        if (this.temperatura > 100) this.resolverEvento('temperatura');
        return;
      }

      const conf = this.falloFase1AndamiajeConfig;
      let condicionCumplida = false;
      if (conf.operador === '>') condicionCumplida = this.temperatura > conf.valor;
      if (conf.operador === '<') condicionCumplida = this.temperatura < conf.valor;

      if (condicionCumplida && conf.tipoFallo) {
        this.fallarFase1Andamiaje(conf.tipoFallo);
        return;
      }

      if (this.temperatura > 100) {
        this.fallarFase1Andamiaje('SOBRECALENTAMIENTO');
      }
      return;
    }

    if (fase === 2) {
      // Evitar que la temperatura estalle durante la ejecución real de Fase 2
      if (this.temperatura > 100) this.temperatura = 0;

      if (this.estrategias.estrategiaPesoCorrecta) {
        if (this.pesoCristales >= 50) this.resolverEvento('peso');
      } else {
        const conf = this.falloFase2AndamiajeConfig;
        let condicionCumplida = false;
        if (conf.operador === '==') condicionCumplida = this.pesoCristales === conf.valor;
        if (conf.operador === '!=') condicionCumplida = this.pesoCristales !== conf.valor;

        if (condicionCumplida && conf.tipoFallo) {
          this.fallarFase2Andamiaje(conf.tipoFallo);
          return;
        }

        if (this.pesoCristales >= 55) {
          this.fallarFase2Andamiaje('DESESTABILIZACION');
        }
      }
      return;
    }

    if (fase === 3) {
      if (this.temperatura > 100) this.temperatura = 0;
      if (this.pesoCristales > 50) this.pesoCristales = 0;
      
      const conf = this.falloFase3AndamiajeConfig;
      let targetDepth = this.profundidadMaxima;
      
      if (conf.valor && conf.valor > 0) {
        targetDepth = Math.min(conf.valor, this.profundidadMaxima);
      } else if (this.estrategias.estrategiaAguaCorrecta) {
        targetDepth = 500;
      }
      
      if (this.profundidadActual < targetDepth) {
        this.profundidadActual = Math.min(targetDepth, this.profundidadActual + 20);
      }

      if (this.profundidadActual >= targetDepth) {
        if (this.estrategias.estrategiaAguaCorrecta) {
          this.resolverEvento('agua');
        } else {
          this.fallarFase3Andamiaje(conf.tipoFallo || 'SINTAXIS');
        }
      }
      return;
    }
  }

  private fallarFase3Andamiaje(tipoFallo: string) {
    this.detenerGameLoop();
    this.ejecutando = false;
    this.erroresAcumulados++;
    this.errores = ['Configuración incorrecta del andamiaje.'];

    let msg = '¡El taladro pasó de largo y se estrelló contra el fondo! Faltó extraer el agua a la profundidad correcta.';
    
    if (tipoFallo === 'ANTES_DE_AGUA') {
      this.estadoTaladro = 'detenido';
      msg = 'Te detuviste antes de llegar al agua.';
    } else if (tipoFallo === 'PROFUNDIDAD_INCORRECTA') {
      this.estadoTaladro = 'explosion';
      this.aguaContaminada = true;
      msg = '¡El taladro perforó la reserva, rompió la piedra base y ensució el agua pura! Has arruinado la misión.';
    } else if (tipoFallo === 'APAGADO') {
      this.estadoTaladro = 'descompuesto' as any;
      msg = 'Apagaste el motor. Ahora la máquina no tiene energía para extraer el agua.';
    } else if (tipoFallo === 'CONTAMINACION') {
      this.estadoTaladro = 'explosion';
      this.aguaContaminada = true;
      msg = '¡El taladro perforó la reserva, rompió la piedra base y ensució el agua pura! Has arruinado la misión.';
    } else if (tipoFallo === 'NO_EXTRAER') {
      this.estadoTaladro = 'detenido';
      msg = 'Llegaste al agua, pero le dijiste a la máquina que NO la extraiga (false).';
    } else {
      this.estadoTaladro = 'explosion';
      this.aguaContaminada = true;
    }

    this.dispararModalGameOver(msg);
  }

  private resolverEvento(tipo: TipoEventoTaladro): void {
    const estrategiaCorrecta = {
      temperatura: this.estrategias.estrategiaVaporCorrecta,
      peso: this.estrategias.estrategiaPesoCorrecta,
      agua: this.estrategias.estrategiaAguaCorrecta
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
    if (tipo === 'agua') {
      this.estadoTaladro = 'estable';
      this.extrayendoAgua = true;
      this.bitacora = 'El taladro se detuvo a la profundidad exacta y extrajo el agua.';
    }

    this.detenerGameLoop();
    setTimeout(() => this.completarFase(), 900);
  }

  private completarFase(): void {
    if (this.falloFase || this.gameOver) return;
    
    // Reconstruir el historial exacto inyectado al inicio de la fase
    let codigoHistorial = '';
    if (this.faseActual.numero > 1 && this.solucionesPorFase.has(1)) {
      codigoHistorial += this.solucionesPorFase.get(1) + '\n\n';
    }
    if (this.faseActual.numero > 2 && this.solucionesPorFase.has(2)) {
      codigoHistorial += this.solucionesPorFase.get(2) + '\n\n';
    }
    
    let codigoFase = this.codigoUsuario;
    if (codigoHistorial && codigoFase.startsWith(codigoHistorial.trim())) {
      codigoFase = codigoFase.substring(codigoHistorial.trim().length);
    }
    
    this.solucionesPorFase.set(this.faseActual.numero, codigoFase.trim());
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

  private dispararModalGameOver(bitacoraMsg: string): void {
    this.bitacora = bitacoraMsg;
    if (this.modalFalloTimeout) clearTimeout(this.modalFalloTimeout);
    this.modalFalloTimeout = setTimeout(() => {
      this.falloFase = true;
      this.cdr.detectChanges();
    }, 2500);
  }

  fallarFase1Andamiaje(tipoFallo: string): void {
    this.detenerGameLoop();
    this.ejecutando = false;
    this.erroresAcumulados++;
    this.errores = ['Configuración incorrecta del andamiaje.'];

    let msg = '';
    if (tipoFallo === 'AHOGO') {
      this.estadoTaladro = 'ahogo' as any;
      msg = 'El motor se ahogó por liberar vapor antes de tiempo.';
    } else if (tipoFallo === 'SOBRECALENTAMIENTO') {
      this.estadoTaladro = 'explosion';
      msg = 'El taladro se sobrecalentó.';
    } else if (tipoFallo === 'DESCOMPUESTO') {
      this.estadoTaladro = 'descompuesto' as any;
      msg = 'Apagar el motor de golpe dañó los engranajes.';
    } else {
      this.estadoTaladro = 'explosion';
      msg = 'El taladro explotó por configuración incorrecta.';
    }
    this.dispararModalGameOver(msg);
  }

  fallarFase2Andamiaje(tipoFallo: string): void {
    this.detenerGameLoop();
    this.ejecutando = false;
    this.erroresAcumulados++;
    this.errores = ['La presion debe ser exactamente 50 para no desestabilizar la maquina.'];

    let msg = '';
    if (tipoFallo === 'DESCOMPUESTO') {
      this.estadoTaladro = 'descompuesto' as any;
      msg = 'Apagar el motor de golpe desestabilizo la maquina.';
    } else {
      this.estadoTaladro = 'desestabilizado';
      msg = 'La presion no se estabilizo y la maquina se sacudio bruscamente.';
    }
    this.dispararModalGameOver(msg);
  }

  private fallarFase(tipo: TipoEventoTaladro): void {
    this.detenerGameLoop();
    this.ejecutando = false;
    this.erroresAcumulados++;
    this.errores = this.erroresPendientes.length > 0
      ? this.erroresPendientes
      : ['El evento no tenía una estrategia válida.'];

    let msg = '';
    if (tipo === 'temperatura') {
      this.estadoTaladro = 'explosion';
      msg = 'La temperatura llegó al límite y el taladro explotó.';
    } else if (tipo === 'peso') {
      this.estadoTaladro = 'banda-rota';
      msg = 'La carga superó el límite y rompió la banda transportadora.';
    } else if (tipo === 'agua') {
      this.estadoTaladro = 'explosion';
      msg = '¡El taladro pasó de largo y se estrelló contra el fondo! Faltó extraer el agua a la profundidad correcta.';
    }
    this.dispararModalGameOver(msg);
  }

  private prepararFaseActual(): void {
    if (this.modalFalloTimeout) clearTimeout(this.modalFalloTimeout);
    this.detenerGameLoop();
    this.codigoUsuario = '';
    if (this.layoutJuego && this.layoutJuego.consola) {
      this.layoutJuego.consola.historialPlantilla = [];
    }
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
    
    // Forzar recarga de UI para la nueva fase
    this.inicializarConsolaTexto();
    if (this.layoutJuego && this.layoutJuego.baraja) {
      // Angular reevaluará configTarjetasTaladro por binding, pero por si acaso limpiamos estado
      this.layoutJuego.baraja.animandoOla = false;
    }

    if (this.faseActual.numero >= 2) {
      this.iniciarLoopCosmeticoFase1();
    } else {
      this.detenerLoopCosmetico();
    }
  }

  private reiniciarMedidores(): void {
    this.temperatura = 0;
    this.pesoCristales = 0;
    this.combustible = 100;
    this.profundidadActual = 0;
    this.extrayendoAgua = false;
    this.aguaContaminada = false;
    this.eventosResueltos = { temperatura: false, peso: false, agua: false };
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
      const rawFases = nivel2Data.fases as unknown as FaseNivelDos[];
      this.fases = rawFases.filter(fase => seleccion.has(fase.numero));
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
      estrategiaAguaCorrecta: false
    };
  }

  private detenerTemporizador(): void {
    if (this.temporizador) clearInterval(this.temporizador);
    this.temporizador = undefined;
  }

  iniciarLoopCosmeticoFase1() {
    this.detenerLoopCosmetico();
  
    this.loopCosmetico = setInterval(() => {
      this.temperatura += 10; 
  
      if (this.temperatura >= 100) {
        this.estadoTaladro = 'liberando-vapor';
  
        setTimeout(() => {
          this.estadoTaladro = 'perforando';
          this.temperatura = 0;
        }, 1000);
      }

      if (this.faseActual.numero >= 3) {
        // Genera un número aleatorio entre -2 y +2
        const fluctuacion = Math.floor(Math.random() * 5) - 2; 
        this.pesoCristales = 50 + fluctuacion; // Oscilará visualmente entre 48 y 52
      }
    }, 500);
  }

  private detenerLoopCosmetico(): void {
    if (this.loopCosmetico) clearInterval(this.loopCosmetico);
    this.loopCosmetico = undefined;
  }

  private detenerGameLoop(): void {
    if (this.gameLoop) clearInterval(this.gameLoop);
    this.gameLoop = undefined;
  }

}
