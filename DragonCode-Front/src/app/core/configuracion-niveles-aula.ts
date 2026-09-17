export type MaterialFabrica = 'Carbon' | 'Diamante' | 'Explosivo';

export type TerrenoNivelUno = 'vacio' | 'suelo' | 'sueloroto' | 'suelo-ogro' | 'salida' | 'meta-ogro';
export type ObjetoNivelUno = 'ninguno' | 'roca' | 'cofre';

export interface CasillaNivelUno {
  x: number;
  y: number;
  zona: 'superior' | 'editable' | 'inferior';
  terreno: TerrenoNivelUno;
  objeto: ObjetoNivelUno;
  tieneFilo?: boolean;
  rotacionTerreno: number;
  estadoAnimacion: 'normal' | 'colapsando' | 'colision' | 'temblando';
}

export interface MapaNivelUno {
  idNivel: number;
  filasEditables: number;
  columnas: number;
  matriz: CasillaNivelUno[][];
}

export interface ConfiguracionNivelUno extends ConfiguracionNivelBase {
  nivel_id: 1;
  tipo: 'mapa_ogro';
  max_vidas: number;
  campana: {
    totalNiveles: number;
    niveles: MapaNivelUno[];
  };
}

interface ConfiguracionNivelBase {
  version: 1;
  nivel_id: number;
}

export interface ConfiguracionNivelDos extends ConfiguracionNivelBase {
  nivel_id: 2;
  tipo: 'sensores_taladro';
  umbral_temperatura: number;
  presion_objetivo: number;
  profundidad_objetivo: number;
}

export interface ConfiguracionNivelTres extends ConfiguracionNivelBase {
  nivel_id: 3;
  tipo: 'variables_cueva';
  distractores_por_fase: number;
}

export interface ConfiguracionNivelFabrica extends ConfiguracionNivelBase {
  nivel_id: 4 | 5;
  tipo: 'materiales_fabrica';
  materiales_por_fase: Record<string, MaterialFabrica[]>;
}

export type ConfiguracionNivelAula =
  | ConfiguracionNivelUno
  | ConfiguracionNivelDos
  | ConfiguracionNivelTres
  | ConfiguracionNivelFabrica;

const MATERIALES_NIVEL_4: Record<string, MaterialFabrica[]> = {
  '1': ['Diamante'],
  '2': ['Carbon', 'Explosivo'],
  '3': ['Explosivo', 'Diamante'],
  '4': ['Carbon', 'Diamante', 'Explosivo', 'Diamante', 'Carbon']
};

const MATERIALES_NIVEL_5: Record<string, MaterialFabrica[]> = {
  '1': ['Diamante', 'Diamante', 'Diamante'],
  '2': ['Carbon', 'Explosivo', 'Carbon', 'Explosivo', 'Carbon'],
  '3': ['Explosivo', 'Diamante', 'Explosivo', 'Diamante', 'Diamante', 'Explosivo'],
  '4': ['Carbon', 'Diamante', 'Explosivo', 'Diamante', 'Carbon', 'Explosivo', 'Carbon', 'Diamante', 'Explosivo', 'Carbon']
};

function copiarMateriales(origen: Record<string, MaterialFabrica[]>): Record<string, MaterialFabrica[]> {
  return Object.fromEntries(
    Object.entries(origen).map(([fase, materiales]) => [fase, [...materiales]])
  );
}

/**
 * Crea una configuración independiente para una actividad de aula.
 * Los niveles no configurables todavía devuelven undefined y conservan su JSON oficial.
 */
export function crearConfiguracionNivelPredeterminada(
  nivelId: number
): ConfiguracionNivelAula | undefined {
  if (nivelId === 2) {
    return {
      version: 1,
      nivel_id: 2,
      tipo: 'sensores_taladro',
      umbral_temperatura: 100,
      presion_objetivo: 50,
      profundidad_objetivo: 500
    };
  }

  if (nivelId === 3) {
    return {
      version: 1,
      nivel_id: 3,
      tipo: 'variables_cueva',
      distractores_por_fase: 3
    };
  }

  if (nivelId === 4 || nivelId === 5) {
    return {
      version: 1,
      nivel_id: nivelId,
      tipo: 'materiales_fabrica',
      materiales_por_fase: copiarMateriales(
        nivelId === 4 ? MATERIALES_NIVEL_4 : MATERIALES_NIVEL_5
      )
    };
  }

  return undefined;
}

export function copiarConfiguracionNivel(
  configuracion: ConfiguracionNivelAula | undefined
): ConfiguracionNivelAula | undefined {
  if (!configuracion) return undefined;
  return JSON.parse(JSON.stringify(configuracion)) as ConfiguracionNivelAula;
}
