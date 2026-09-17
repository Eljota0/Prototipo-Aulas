import { Injectable } from '@angular/core';
import {
  AccionFabrica,
  EvaluadorNivel,
  FaseControlCalidad,
  ResultadoEvaluacionControlCalidad,
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
export class EvaluadorControlCalidadService implements EvaluadorNivel<
  FaseControlCalidad,
  ResultadoEvaluacionControlCalidad
> {
  private readonly eventoInicio = /^evento\(fabrica\.nuevoMaterial\)\{/;
  private readonly estructuras: Record<FaseControlCalidad, RamaCondicional[]> = {
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

  evaluar(codigo: string, fase: FaseControlCalidad): ResultadoEvaluacionControlCalidad {
    const codigoSanitizado = normalizarCodigoControl(codigo);
    const bloque = extraerBloqueRaiz(codigoSanitizado, this.eventoInicio);
    const cadena = bloque.cierreValido
      ? analizarCadenaCondicional(bloque.interior)
      : { valida: false, ramas: [] as RamaCondicional[] };
    const acciones = mapearAcciones(cadena.ramas);
    const errores: Array<{ mensaje: string }> = [];

    if (!bloque.aperturaValida || !bloque.cierreValido) {
      errores.push({ mensaje: 'La lógica debe permanecer dentro del evento fijo de la fábrica.' });
    } else if (!cadena.valida || !coincideEstructura(cadena.ramas, this.estructuras[fase])) {
      errores.push({
        mensaje: this.explicarError(codigoSanitizado, fase, acciones)
      });
    }

    return {
      valido: errores.length === 0,
      codigoSanitizado,
      acciones,
      errores
    };
  }

  private explicarError(
    codigo: string,
    fase: FaseControlCalidad,
    acciones: Partial<Record<TipoMaterialFabrica, AccionFabrica>>
  ): string {
    if (fase === 1) {
      if (acciones.Diamante !== 'guardar') {
        return 'Cuando el material sea Diamante, la fábrica debe ejecutar guardar().';
      }
      return 'La fase necesita únicamente la decisión para guardar el diamante.';
    }

    if (fase === 2) {
      if (acciones.Explosivo !== 'destruir') {
        return 'El explosivo debe enviarse a destruir() antes de llegar al horno.';
      }
      if (acciones.Carbon !== 'quemar') {
        return 'La rama sino debe enviar el carbón a quemar().';
      }
      return 'Conserva el orden si Explosivo, seguido por sino para el carbón.';
    }

    if (fase === 3) {
      if (!codigo.includes('sinosi(')) {
        return 'La segunda decisión debe comenzar con sino si.';
      }
      if (acciones.Diamante !== 'guardar' || acciones.Explosivo !== 'destruir') {
        return 'Relaciona Diamante con guardar() y Explosivo con destruir().';
      }
      return 'La cadena debe comenzar con si y continuar con sino si.';
    }

    if (acciones.Diamante !== 'guardar') {
      return 'La rama del Diamante debe ejecutar guardar().';
    }
    if (acciones.Explosivo !== 'destruir') {
      return 'La rama del Explosivo debe ejecutar destruir().';
    }
    if (acciones.Carbon !== 'quemar') {
      return 'La rama final sino debe ejecutar quemar() para el carbón.';
    }
    if (!codigo.includes('sinosi(')) {
      return 'Falta conectar la segunda condición mediante sino si.';
    }
    return 'Ordena la cadena como si, sino si y sino, sin instrucciones fuera de las ramas.';
  }
}
