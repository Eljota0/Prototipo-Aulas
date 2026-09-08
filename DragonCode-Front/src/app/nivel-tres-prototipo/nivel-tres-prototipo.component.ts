import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GameHeaderComponent } from '../game-header/game-header.component';
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

@Component({
  selector: 'app-nivel-tres-prototipo',
  standalone: true,
  imports: [CommonModule, FormsModule, GameHeaderComponent],
  templateUrl: './nivel-tres-prototipo.component.html',
  styleUrls: [
    '../nivel-dos-prototipo/nivel-dos-prototipo.component.scss',
    './nivel-tres-prototipo.component.scss'
  ]
})
export class NivelTresPrototipoComponent implements OnInit, OnDestroy {
  readonly fasesBase: FaseNivelTres[] = [
    {
      numero: 1,
      titulo: 'Revelar la cueva',
      concepto: 'Booleano · verdadero o falso',
      objetivo: 'Guarda el estado verdadero en luz para que Drako pueda descubrir a sus enemigos.',
      pista: 'true es un booleano. No lleva comillas y representa un estado activado.',
      instruccionFija: 'drako.revelarCueva(luz);',
      reglas: { variablesEsperadas: { luz: true }, asignacionesMinimas: 1 },
      tarjetas: [
        { codigo: 'luz = "true"', etiqueta: 'Texto "true"', tipo: 'TEXTO', tono: 'dorado' },
        { codigo: 'luz = false', etiqueta: 'Estado apagado', tipo: 'BOOLEANO', tono: 'violeta' },
        { codigo: 'luz = true', etiqueta: 'Estado encendido', tipo: 'BOOLEANO', tono: 'verde' },
        { codigo: 'luz = 1', etiqueta: 'Número 1', tipo: 'ENTERO', tono: 'azul' }
      ]
    },
    {
      numero: 2,
      titulo: 'Preparar el elemento',
      concepto: 'String · información entre comillas',
      objetivo: 'Guarda el texto "Fuego" en elemento para preparar el hechizo correcto.',
      pista: 'Los textos necesitan comillas. Sin ellas, Fuego sería interpretado como una variable inexistente.',
      instruccionFija: 'drako.prepararHechizo(elemento);',
      reglas: { variablesEsperadas: { elemento: 'Fuego' }, asignacionesMinimas: 1 },
      tarjetas: [
        { codigo: 'elemento = 3', etiqueta: 'Número 3', tipo: 'ENTERO', tono: 'azul' },
        { codigo: 'elemento = "Fuego"', etiqueta: 'Texto "Fuego"', tipo: 'TEXTO', tono: 'dorado' },
        { codigo: 'elemento = true', etiqueta: 'Valor activado', tipo: 'BOOLEANO', tono: 'verde' },
        { codigo: 'elemento = Fuego', etiqueta: 'Nombre sin comillas', tipo: 'SIN COMILLAS', tono: 'violeta' }
      ]
    },
    {
      numero: 3,
      titulo: 'Calcular los ataques',
      concepto: 'Entero · cantidad exacta',
      objetivo: 'Guarda el número 3 en cantidad: debe existir un proyectil por cada murciélago.',
      pista: '3 es un entero. Si escribes "3" con comillas, estarás almacenando texto.',
      instruccionFija: 'drako.invocarAtaques(cantidad);',
      reglas: { variablesEsperadas: { cantidad: 3 }, asignacionesMinimas: 1 },
      tarjetas: [
        { codigo: 'cantidad = 5', etiqueta: 'Cinco ataques', tipo: 'ENTERO', tono: 'violeta' },
        { codigo: 'cantidad = "3"', etiqueta: 'Texto "3"', tipo: 'TEXTO', tono: 'dorado' },
        { codigo: 'cantidad = true', etiqueta: 'Valor activado', tipo: 'BOOLEANO', tono: 'verde' },
        { codigo: 'cantidad = 3', etiqueta: 'Tres ataques', tipo: 'ENTERO', tono: 'azul' }
      ]
    },
    {
      numero: 4,
      titulo: 'El murciélago alfa',
      concepto: 'Integración de tipos de datos',
      objetivo: 'El jefe de la cueva apareció. Repite las tres variables correctas para que Drako ejecute el combate completo.',
      pista: 'El jefe exige combinar todo: luz como booleano, elemento como texto y cantidad como entero.',
      instruccionFija: 'drako.iniciarCombate(luz, elemento, cantidad);',
      reglas: {
        variablesEsperadas: { luz: true, elemento: 'Fuego', cantidad: 3 },
        asignacionesMinimas: 3
      },
      tarjetas: [
        { codigo: 'cantidad = 3', etiqueta: 'Tres ataques', tipo: 'ENTERO', tono: 'azul' },
        { codigo: 'elemento = true', etiqueta: 'Valor activado', tipo: 'BOOLEANO', tono: 'verde' },
        { codigo: 'luz = "true"', etiqueta: 'Texto "true"', tipo: 'TEXTO', tono: 'dorado' },
        { codigo: 'elemento = "Fuego"', etiqueta: 'Texto "Fuego"', tipo: 'TEXTO', tono: 'violeta' },
        { codigo: 'cantidad = "3"', etiqueta: 'Texto "3"', tipo: 'TEXTO', tono: 'dorado' },
        { codigo: 'luz = true', etiqueta: 'Estado encendido', tipo: 'BOOLEANO', tono: 'verde' },
        { codigo: 'cantidad = 5', etiqueta: 'Cinco ataques', tipo: 'ENTERO', tono: 'violeta' },
        { codigo: 'elemento = 3', etiqueta: 'Número 3', tipo: 'ENTERO', tono: 'azul' }
      ]
    }
  ];

  fases: FaseNivelTres[] = [...this.fasesBase];

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
  pistaVisible = false;
  ayudaVisible = false;
  pestanaInventario: 'acciones' | 'objetos' = 'acciones';
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
  private tiempoTresEstrellas = 60;
  private tiempoDosEstrellas = 120;
  private maxIntentosSinPenalidad = 3;

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

  insertarTarjeta(tarjeta: TarjetaVariable): void {
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

  ejecutarCodigo(): void {
    if (this.ejecutando || this.falloFase || this.gameOver || this.nivelCompletado) return;

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
    this.prepararFaseActual();
  }

  salir(): void {
    this.router.navigate(['/aventura']);
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

    // Misma recompensa que el Nivel 2: tiempo para las estrellas e intentos
    // reales para la calificación.
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
    this.tiempoTresEstrellas = parametros?.tiempo_3_estrellas ?? 60;
    this.tiempoDosEstrellas = parametros?.tiempo_2_estrellas ?? 120;
    this.maxIntentosSinPenalidad = parametros?.intentos_max_sin_penalidad ?? 3;
    const fasesSeleccionadas = parametros?.fases_seleccionadas
      ?.map(Number)
      .filter(numero => Number.isInteger(numero) && numero >= 1 && numero <= 4);

    if (fasesSeleccionadas?.length) {
      const seleccion = new Set(fasesSeleccionadas);
      this.fases = this.fasesBase.filter(fase => seleccion.has(fase.numero));
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
      reto_nivel_id: 3,
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

  private prepararFaseActual(): void {
    this.limpiarTareasPendientes();
    this.codigoUsuario = '';
    this.memoria = {};
    this.ejecutando = false;
    this.falloFase = false;
    this.pistaVisible = false;
    this.ayudaVisible = false;
    this.errores = [];
    this.estadoEscena = 'espera';
    this.luzActiva = this.faseActual.numero === 2 || this.faseActual.numero === 3;
    this.elementoActivo = this.faseActual.numero === 3 ? 'Fuego' : '';
    this.cantidadAtaques = 0;
    this.murcielagosDerrotados = 0;
    this.pestanaInventario = 'acciones';
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
