import { Injectable } from '@angular/core';
import {
  AccionFabrica,
  EvaluadorNivel,
  FaseControlCalidad,
  ResultadoEvaluacionControlCalidad,
  TipoMaterialFabrica
} from './evaluador-nivel';

@Injectable({ providedIn: 'root' })
export class EvaluadorControlCalidadService implements EvaluadorNivel<
  FaseControlCalidad,
  ResultadoEvaluacionControlCalidad
> {
  private readonly eventoInicio = 'evento(fabrica.nuevoMaterial){';
  private readonly diamante =
    'si(fabrica.materialActual=="Diamante"){fabrica.guardar();}';
  private readonly explosivo =
    'si(fabrica.materialActual=="Explosivo"){fabrica.destruir();}';
  private readonly explosivoAlternativo =
    'sinosi(fabrica.materialActual=="Explosivo"){fabrica.destruir();}';
  private readonly carbon = 'sino{fabrica.quemar();}';

  private readonly soluciones: Record<FaseControlCalidad, string> = {
    1: `${this.eventoInicio}${this.diamante}}`,
    2: `${this.eventoInicio}${this.explosivo}${this.carbon}}`,
    3: `${this.eventoInicio}${this.diamante}${this.explosivoAlternativo}}`,
    4: `${this.eventoInicio}${this.diamante}${this.explosivoAlternativo}${this.carbon}}`
  };

  evaluar(codigo: string, fase: FaseControlCalidad): ResultadoEvaluacionControlCalidad {
    const codigoSanitizado = this.sanitizar(codigo);
    const acciones = this.extraerAcciones(codigoSanitizado);
    const errores: Array<{ mensaje: string }> = [];

    if (!codigoSanitizado.startsWith(this.eventoInicio) || !codigoSanitizado.endsWith('}')) {
      errores.push({ mensaje: 'La lógica debe permanecer dentro del evento fijo de la fábrica.' });
    } else if (codigoSanitizado !== this.soluciones[fase]) {
      errores.push({ mensaje: this.explicarError(codigoSanitizado, fase, acciones) });
    }

    return {
      valido: errores.length === 0,
      codigoSanitizado,
      acciones,
      errores
    };
  }

  private sanitizar(codigo: string): string {
    return codigo
      .replace(/\s+/g, '')
      .replace(/'([^']*)'/g, '"$1"');
  }

  private extraerAcciones(
    codigo: string
  ): Partial<Record<TipoMaterialFabrica, AccionFabrica>> {
    const acciones: Partial<Record<TipoMaterialFabrica, AccionFabrica>> = {};
    const condicion = /(?:si|sinosi)\(fabrica\.materialActual=="(Diamante|Explosivo|Carbon)"\)\{fabrica\.(guardar|destruir|quemar)\(\);\}/g;
    let coincidencia: RegExpExecArray | null;

    while ((coincidencia = condicion.exec(codigo)) !== null) {
      acciones[coincidencia[1] as TipoMaterialFabrica] = coincidencia[2] as AccionFabrica;
    }

    if (/sino\{fabrica\.quemar\(\);\}/.test(codigo)) {
      acciones.Carbon = 'quemar';
    }

    return acciones;
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
