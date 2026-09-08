import { Injectable } from '@angular/core';
import {
  AccionFabrica,
  EvaluadorNivel,
  FaseProduccionMasiva,
  ResultadoEvaluacionProduccionMasiva,
  TipoMaterialFabrica
} from './evaluador-nivel';

@Injectable({ providedIn: 'root' })
export class EvaluadorProduccionMasivaService implements EvaluadorNivel<
  FaseProduccionMasiva,
  ResultadoEvaluacionProduccionMasiva
> {
  private readonly abrirBucle =
    'mientras(fabrica.tieneMateriales==verdadero){';
  private readonly diamante =
    'si(fabrica.materialActual=="Diamante"){fabrica.guardar();}';
  private readonly explosivo =
    'si(fabrica.materialActual=="Explosivo"){fabrica.destruir();}';
  private readonly explosivoAlternativo =
    'sinosi(fabrica.materialActual=="Explosivo"){fabrica.destruir();}';
  private readonly carbon = 'sino{fabrica.quemar();}';

  private readonly soluciones: Record<FaseProduccionMasiva, string> = {
    1: `${this.abrirBucle}${this.diamante}}`,
    2: `${this.abrirBucle}${this.explosivo}${this.carbon}}`,
    3: `${this.abrirBucle}${this.diamante}${this.explosivoAlternativo}}`,
    4: `${this.abrirBucle}${this.diamante}${this.explosivoAlternativo}${this.carbon}}`
  };

  evaluar(
    codigo: string,
    fase: FaseProduccionMasiva
  ): ResultadoEvaluacionProduccionMasiva {
    const codigoSanitizado = this.sanitizar(codigo);
    const acciones = this.extraerAcciones(codigoSanitizado);
    const bucleValido = codigoSanitizado.startsWith(this.abrirBucle)
      && this.llavesBalanceadas(codigoSanitizado);
    const errores: Array<{ mensaje: string }> = [];

    if (!bucleValido) {
      errores.push({
        mensaje: 'Encierra las decisiones en mientras (fabrica.tieneMateriales == verdadero) y cierra el bloque.'
      });
    } else if (codigoSanitizado !== this.soluciones[fase]) {
      errores.push({ mensaje: this.explicarError(codigoSanitizado, fase, acciones) });
    }

    return {
      valido: errores.length === 0,
      bucleValido,
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

  private llavesBalanceadas(codigo: string): boolean {
    let profundidad = 0;
    for (const caracter of codigo) {
      if (caracter === '{') profundidad++;
      if (caracter === '}') profundidad--;
      if (profundidad < 0) return false;
    }
    return profundidad === 0;
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
    if (/sino\{fabrica\.quemar\(\);\}/.test(codigo)) acciones.Carbon = 'quemar';
    return acciones;
  }

  private explicarError(
    codigo: string,
    fase: FaseProduccionMasiva,
    acciones: Partial<Record<TipoMaterialFabrica, AccionFabrica>>
  ): string {
    if (!codigo.endsWith('}')) return 'El bucle mientras necesita una llave de cierre.';
    if (fase === 1 && acciones.Diamante !== 'guardar') {
      return 'Dentro del bucle, cada diamante debe enviarse a guardar().';
    }
    if (fase === 2) {
      if (acciones.Explosivo !== 'destruir') return 'El explosivo debe ejecutar destruir() dentro del bucle.';
      if (acciones.Carbon !== 'quemar') return 'La rama sino debe quemar el carbón dentro del bucle.';
    }
    if (fase === 3) {
      if (!codigo.includes('sinosi(')) return 'Conecta la segunda decisión mediante sino si.';
      if (acciones.Diamante !== 'guardar' || acciones.Explosivo !== 'destruir') {
        return 'Relaciona Diamante con guardar() y Explosivo con destruir(), dentro del mismo bucle.';
      }
    }
    if (fase === 4) {
      if (acciones.Diamante !== 'guardar') return 'Falta guardar los diamantes.';
      if (acciones.Explosivo !== 'destruir') return 'Falta destruir los explosivos.';
      if (acciones.Carbon !== 'quemar') return 'Falta quemar el carbón con la rama sino.';
    }
    return 'El orden debe ser: mientras, si, sino si, sino y la llave final del bucle.';
  }
}
