export type ValorVariable = string | number | boolean;

export interface EstadoEjecucion {
  variables: Record<string, ValorVariable>;
  salidas: string[];
}

export type EventoEjecucion =
  | {
      tipo: 'ASIGNAR';
      linea: number;
      variable: string;
      valor: ValorVariable;
      valorAnterior?: ValorVariable;
    }
  | {
      tipo: 'MOSTRAR';
      linea: number;
      valor: ValorVariable;
    };

export interface ErrorEjecucion {
  linea?: number;
  mensaje: string;
}

export interface ReglasFaseVariables {
  variablesEsperadas: Record<string, ValorVariable>;
  salidasEsperadas?: string[];
  operadoresRequeridos?: Array<'+' | '-' | '*' | '/'>;
  asignacionesMinimas?: number;
}

export interface ResultadoEvaluacion {
  valido: boolean;
  errores: ErrorEjecucion[];
  eventos: EventoEjecucion[];
  estadoFinal: EstadoEjecucion;
}

export interface EvaluadorNivel<TReglas, TResult = ResultadoEvaluacion> {
  evaluar(codigo: string, reglas: TReglas): TResult;
}

export type FaseControlCalidad = 1 | 2 | 3 | 4;

export type TipoMaterialFabrica = 'Diamante' | 'Explosivo' | 'Carbon';

export type AccionFabrica = 'guardar' | 'destruir' | 'quemar';

export interface ResultadoEvaluacionControlCalidad {
  valido: boolean;
  codigoSanitizado: string;
  acciones: Partial<Record<TipoMaterialFabrica, AccionFabrica>>;
  errores: ErrorEjecucion[];
}

export type FaseProduccionMasiva = 1 | 2 | 3 | 4;

export interface ResultadoEvaluacionProduccionMasiva
  extends ResultadoEvaluacionControlCalidad {
  bucleValido: boolean;
}

export type FaseTaladro = 1 | 2 | 3;

export interface BanderasEstrategiaTaladro {
  estrategiaVaporCorrecta: boolean;
  estrategiaPesoCorrecta: boolean;
  estrategiaAguaCorrecta: boolean;
}

export interface ResultadoEvaluacionTaladro {
  valido: boolean;
  codigoSanitizado: string;
  banderas: BanderasEstrategiaTaladro;
  errores: ErrorEjecucion[];
}
