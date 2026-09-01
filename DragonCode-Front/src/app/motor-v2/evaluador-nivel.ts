export type ValorVariable = string | number;

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

export interface EvaluadorNivel<TReglas> {
  evaluar(codigo: string, reglas: TReglas): ResultadoEvaluacion;
}

export type FaseTaladro = 1 | 2 | 3 | 4;

export interface BanderasEstrategiaTaladro {
  estrategiaVaporCorrecta: boolean;
  estrategiaPesoCorrecta: boolean;
  estrategiaCarbonCorrecta: boolean;
}

export interface ResultadoEvaluacionTaladro {
  valido: boolean;
  codigoSanitizado: string;
  banderas: BanderasEstrategiaTaladro;
  errores: ErrorEjecucion[];
}
