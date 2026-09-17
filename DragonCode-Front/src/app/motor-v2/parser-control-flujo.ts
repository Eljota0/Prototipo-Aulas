import { AccionFabrica, TipoMaterialFabrica } from './evaluador-nivel';

export type TipoRamaCondicional = 'si' | 'sino-si' | 'sino';

export interface RamaCondicional {
  tipo: TipoRamaCondicional;
  material?: TipoMaterialFabrica;
  accion: AccionFabrica;
}

export interface BloqueRaiz {
  aperturaValida: boolean;
  cierreValido: boolean;
  interior: string;
}

export interface CadenaCondicional {
  valida: boolean;
  ramas: RamaCondicional[];
  error?: string;
}

/**
 * Normaliza únicamente diferencias de escritura que no cambian la lógica.
 * El análisis posterior sigue comprobando el orden, la anidación y las acciones.
 */
export function normalizarCodigoControl(codigo: string): string {
  return codigo
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"')
    .replace(/\s+/g, '')
    .replace(/;/g, '');
}

export function extraerBloqueRaiz(codigo: string, apertura: RegExp): BloqueRaiz {
  const coincidencia = codigo.match(apertura);
  if (!coincidencia || coincidencia.index !== 0) {
    return { aperturaValida: false, cierreValido: false, interior: '' };
  }

  const indiceApertura = coincidencia[0].length - 1;
  const indiceCierre = buscarCierre(codigo, indiceApertura);
  if (indiceCierre < 0 || indiceCierre !== codigo.length - 1) {
    return { aperturaValida: true, cierreValido: false, interior: '' };
  }

  return {
    aperturaValida: true,
    cierreValido: true,
    interior: codigo.slice(indiceApertura + 1, indiceCierre)
  };
}

/**
 * Construye un AST mínimo para la cadena SI / SINO SI / SINO.
 * No compara el texto completo: extrae el material y la acción de cada rama.
 */
export function analizarCadenaCondicional(codigo: string): CadenaCondicional {
  const ramas: RamaCondicional[] = [];
  let restante = codigo;
  let primeraRama = true;
  let encontroSino = false;

  while (restante.length > 0) {
    if (encontroSino) {
      return { valida: false, ramas, error: 'No puede haber instrucciones después de SINO.' };
    }

    const condicion = restante.match(
      primeraRama
        ? /^si\(+fabrica\.materialActual(?:===|==)"(Diamante|Explosivo|Carbon)"\)+\{/
        : /^sinosi\(+fabrica\.materialActual(?:===|==)"(Diamante|Explosivo|Carbon)"\)+\{/
    );
    const alternativa = primeraRama ? null : restante.match(/^sino\{/);

    if (!condicion && !alternativa) {
      return {
        valida: false,
        ramas,
        error: primeraRama
          ? 'La cadena debe comenzar con una condición SI válida.'
          : 'Las decisiones siguientes deben conectarse con SINO SI o SINO.'
      };
    }

    const cabecera = (condicion ?? alternativa)![0];
    const indiceApertura = cabecera.length - 1;
    const indiceCierre = buscarCierre(restante, indiceApertura);
    if (indiceCierre < 0) {
      return { valida: false, ramas, error: 'Falta cerrar una rama de decisión.' };
    }

    const cuerpo = restante.slice(indiceApertura + 1, indiceCierre);
    const accion = cuerpo.match(/^fabrica\.(guardar|destruir|quemar)\(\)$/);
    if (!accion) {
      return {
        valida: false,
        ramas,
        error: 'Cada rama debe contener exactamente una acción de la fábrica.'
      };
    }

    if (condicion) {
      ramas.push({
        tipo: primeraRama ? 'si' : 'sino-si',
        material: condicion[1] as TipoMaterialFabrica,
        accion: accion[1] as AccionFabrica
      });
    } else {
      ramas.push({ tipo: 'sino', accion: accion[1] as AccionFabrica });
      encontroSino = true;
    }

    restante = restante.slice(indiceCierre + 1);
    primeraRama = false;
  }

  return ramas.length > 0
    ? { valida: true, ramas }
    : { valida: false, ramas, error: 'No se encontró ninguna decisión.' };
}

export function mapearAcciones(
  ramas: RamaCondicional[]
): Partial<Record<TipoMaterialFabrica, AccionFabrica>> {
  const acciones: Partial<Record<TipoMaterialFabrica, AccionFabrica>> = {};
  for (const rama of ramas) {
    if (rama.material) acciones[rama.material] = rama.accion;
    if (rama.tipo === 'sino') acciones.Carbon = rama.accion;
  }
  return acciones;
}

export function coincideEstructura(
  ramas: RamaCondicional[],
  esperadas: RamaCondicional[]
): boolean {
  return ramas.length === esperadas.length && ramas.every((rama, indice) => {
    const esperada = esperadas[indice];
    return rama.tipo === esperada.tipo
      && rama.material === esperada.material
      && rama.accion === esperada.accion;
  });
}

function buscarCierre(codigo: string, indiceApertura: number): number {
  let profundidad = 0;
  for (let indice = indiceApertura; indice < codigo.length; indice++) {
    if (codigo[indice] === '{') profundidad++;
    if (codigo[indice] === '}') {
      profundidad--;
      if (profundidad === 0) return indice;
      if (profundidad < 0) return -1;
    }
  }
  return -1;
}
