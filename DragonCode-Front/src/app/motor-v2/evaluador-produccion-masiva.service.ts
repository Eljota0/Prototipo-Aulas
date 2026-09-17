import { Injectable } from '@angular/core';
import {
  AccionFabrica,
  EvaluadorNivel,
  FaseProduccionMasiva,
  ResultadoEvaluacionProduccionMasiva,
  TipoMaterialFabrica
} from './evaluador-nivel';
import {
  analizarCadenaCondicional,
  coincideEstructura,
  extraerBloqueRaiz,
  mapearAcciones,
  normalizarCodigoControl,
  RamaCondicional
} from './parser-control-flujo';

@Injectable({ providedIn: 'root' })
export class EvaluadorProduccionMasivaService implements EvaluadorNivel<
  FaseProduccionMasiva,
  ResultadoEvaluacionProduccionMasiva
> {
  private readonly aperturaMientras =
    /^mientras\(+fabrica\.tieneMateriales(?:===|==)(?:verdadero|true)\)+\{/;

  private readonly estructuras: Record<FaseProduccionMasiva, RamaCondicional[]> = {
    1: [{ tipo: 'si', material: 'Diamante', accion: 'guardar' }],
    2: [
      { tipo: 'si', material: 'Explosivo', accion: 'destruir' },
      { tipo: 'sino', accion: 'quemar' }
    ],
    3: [
      { tipo: 'si', material: 'Diamante', accion: 'guardar' },
      { tipo: 'sino-si', material: 'Explosivo', accion: 'destruir' }
    ],
    4: [
      { tipo: 'si', material: 'Diamante', accion: 'guardar' },
      { tipo: 'sino-si', material: 'Explosivo', accion: 'destruir' },
      { tipo: 'sino', accion: 'quemar' }
    ]
  };

  private readonly ordenTarjetas: Record<FaseProduccionMasiva, string> = {
    1: 'MIENTRAS queden materiales → SI es Diamante → guardar → FIN de MIENTRAS.',
    2: 'MIENTRAS queden materiales → SI es Explosivo → destruir → SINO → quemar → FIN de MIENTRAS.',
    3: 'MIENTRAS queden materiales → SI es Diamante → guardar → SINO SI es Explosivo → destruir → FIN de MIENTRAS.',
    4: 'MIENTRAS queden materiales → SI es Diamante → guardar → SINO SI es Explosivo → destruir → SINO → quemar → FIN de MIENTRAS.'
  };

  evaluar(
    codigo: string,
    fase: FaseProduccionMasiva
  ): ResultadoEvaluacionProduccionMasiva {
    const codigoSanitizado = normalizarCodigoControl(codigo);
    const bloque = extraerBloqueRaiz(codigoSanitizado, this.aperturaMientras);
    const bucleValido = bloque.aperturaValida && bloque.cierreValido;
    const cadena = bucleValido
      ? analizarCadenaCondicional(bloque.interior)
      : { valida: false, ramas: [] as RamaCondicional[] };
    const acciones = mapearAcciones(cadena.ramas);
    const errores: Array<{ mensaje: string }> = [];

    if (!codigoSanitizado) {
      errores.push({
        mensaje: `Aún no hay instrucciones. Coloca las tarjetas así: ${this.ordenTarjetas[fase]}`
      });
    } else if (!bloque.aperturaValida) {
      errores.push({
        mensaje: `Te falta abrir la repetición. Coloca primero “MIENTRAS queden materiales”. Usa estas tarjetas en orden: ${this.ordenTarjetas[fase]}`
      });
    } else if (!bloque.cierreValido) {
      errores.push({
        mensaje: `Falta cerrar el bucle. Coloca “FIN de MIENTRAS” como última tarjeta. Orden completo: ${this.ordenTarjetas[fase]}`
      });
    } else {
      if (!cadena.valida || !coincideEstructura(cadena.ramas, this.estructuras[fase])) {
        errores.push({
          mensaje: cadena.valida
            ? this.explicarError(bloque.interior, fase, acciones)
            : `Las tarjetas están fuera de orden. Usa: ${this.ordenTarjetas[fase]}`
        });
      }
    }

    return {
      valido: errores.length === 0,
      bucleValido,
      codigoSanitizado,
      acciones,
      errores
    };
  }

  private explicarError(
    interior: string,
    fase: FaseProduccionMasiva,
    acciones: Partial<Record<TipoMaterialFabrica, AccionFabrica>>
  ): string {
    if (fase === 1 && acciones.Diamante !== 'guardar') {
      return 'Dentro de MIENTRAS coloca “SI es Diamante → guardar”. Después termina con “FIN de MIENTRAS”.';
    }
    if (fase === 2) {
      if (acciones.Explosivo !== 'destruir') return 'Después de MIENTRAS coloca “SI es Explosivo → destruir”.';
      if (acciones.Carbon !== 'quemar') return 'Después de destruir el explosivo coloca “SINO → quemar” y termina con “FIN de MIENTRAS”.';
    }
    if (fase === 3) {
      if (acciones.Diamante !== 'guardar') return 'Después de MIENTRAS coloca “SI es Diamante → guardar”.';
      if (!interior.includes('sinosi(') || acciones.Explosivo !== 'destruir') {
        return 'Después del diamante coloca “SINO SI es Explosivo → destruir”; no uses otro SI separado.';
      }
    }
    if (fase === 4) {
      if (acciones.Diamante !== 'guardar') return 'Primero, dentro de MIENTRAS, coloca “SI es Diamante → guardar”.';
      if (!interior.includes('sinosi(') || acciones.Explosivo !== 'destruir') return 'Luego coloca “SINO SI es Explosivo → destruir”.';
      if (acciones.Carbon !== 'quemar') return 'Después coloca “SINO → quemar” para el carbón restante.';
    }
    return `Las tarjetas están fuera de orden. Usa: ${this.ordenTarjetas[fase]}`;
  }
}
