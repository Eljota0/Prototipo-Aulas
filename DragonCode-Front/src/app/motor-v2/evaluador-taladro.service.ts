import { Injectable } from '@angular/core';
import {
  BanderasEstrategiaTaladro,
  ErrorEjecucion,
  FaseTaladro,
  ResultadoEvaluacionTaladro
} from './evaluador-nivel';

@Injectable({ providedIn: 'root' })
export class EvaluadorTaladroService {
  private readonly estrategiaTemperatura =
    'si(taladro.temperatura>100){taladro.liberarVapor();}';
  private readonly estrategiaPeso =
    'si(taladro.pesoCarga>50){taladro.empacarCristales();}';
  private readonly estrategiaCarbon =
    'si(taladro.carbon==0){taladro.recargarCarbon();}';

  private readonly patrones: Record<FaseTaladro, string> = {
    1: `evento(taladro.sobrecalentamiento){${this.estrategiaTemperatura}}`,
    2: `evento(taladro.sobrecarga){${this.estrategiaPeso}}`,
    3: `evento(taladro.tanqueVacio){${this.estrategiaCarbon}}`,
    4: `evento(taladro.operacionCompleta){${this.estrategiaTemperatura}${this.estrategiaPeso}${this.estrategiaCarbon}}`
  };

  evaluar(codigo: string, fase: FaseTaladro = 1): ResultadoEvaluacionTaladro {
    const codigoSanitizado = codigo.replace(/\s+/g, '');
    const errores: ErrorEjecucion[] = [];
    const banderas: BanderasEstrategiaTaladro = {
      estrategiaVaporCorrecta: false,
      estrategiaPesoCorrecta: false,
      estrategiaCarbonCorrecta: false
    };

    if (fase === 1) {
      banderas.estrategiaVaporCorrecta = codigoSanitizado === this.patrones[1];
      if (!banderas.estrategiaVaporCorrecta) {
        errores.push({ mensaje: this.explicarErrorTemperatura(codigoSanitizado, fase) });
      }
    }

    if (fase === 2) {
      banderas.estrategiaPesoCorrecta = codigoSanitizado === this.patrones[2];
      if (!banderas.estrategiaPesoCorrecta) {
        errores.push({ mensaje: this.explicarErrorPeso(codigoSanitizado, fase) });
      }
    }

    if (fase === 3) {
      banderas.estrategiaCarbonCorrecta = codigoSanitizado === this.patrones[3];
      if (!banderas.estrategiaCarbonCorrecta) {
        errores.push({ mensaje: this.explicarErrorCarbon(codigoSanitizado, fase) });
      }
    }

    if (fase === 4) {
      const plantillaCorrecta = codigoSanitizado.startsWith('evento(taladro.operacionCompleta){');
      banderas.estrategiaVaporCorrecta = plantillaCorrecta && codigoSanitizado.includes(this.estrategiaTemperatura);
      banderas.estrategiaPesoCorrecta = plantillaCorrecta && codigoSanitizado.includes(this.estrategiaPeso);
      banderas.estrategiaCarbonCorrecta = plantillaCorrecta && codigoSanitizado.includes(this.estrategiaCarbon);

      if (!banderas.estrategiaVaporCorrecta) {
        errores.push({ mensaje: this.explicarErrorTemperatura(codigoSanitizado, fase) });
      }
      if (!banderas.estrategiaPesoCorrecta) {
        errores.push({ mensaje: this.explicarErrorPeso(codigoSanitizado, fase) });
      }
      if (!banderas.estrategiaCarbonCorrecta) {
        errores.push({ mensaje: this.explicarErrorCarbon(codigoSanitizado, fase) });
      }
      if (codigoSanitizado !== this.patrones[4]) {
        if (errores.length === 0) {
          errores.push({ mensaje: 'Los tres protocolos deben conservar el orden: temperatura, peso y carbón.' });
        }
        banderas.estrategiaVaporCorrecta = false;
        banderas.estrategiaPesoCorrecta = false;
        banderas.estrategiaCarbonCorrecta = false;
      }
    }

    return {
      valido: errores.length === 0,
      codigoSanitizado,
      banderas,
      errores
    };
  }

  private explicarErrorTemperatura(codigo: string, fase: FaseTaladro): string {
    if (!codigo.startsWith(`evento(taladro.${fase === 4 ? 'operacionCompleta' : 'sobrecalentamiento'}){`)) {
      return 'La plantilla fija del evento de temperatura fue alterada.';
    }
    if (!codigo.includes('si(taladro.temperatura>100){')) {
      return 'Falta comprobar si la temperatura supera 100.';
    }
    if (!codigo.includes('taladro.liberarVapor();')) {
      return 'La condición de temperatura necesita taladro.liberarVapor();.';
    }
    return 'La acción de vapor debe estar dentro de su condición.';
  }

  private explicarErrorPeso(codigo: string, fase: FaseTaladro): string {
    if (!codigo.startsWith(`evento(taladro.${fase === 4 ? 'operacionCompleta' : 'sobrecarga'}){`)) {
      return 'La plantilla fija del evento de peso fue alterada.';
    }
    if (!codigo.includes('si(taladro.pesoCarga>50){')) {
      return 'Falta comprobar si el peso de cristales supera 50.';
    }
    if (!codigo.includes('taladro.empacarCristales();')) {
      return 'La condición de peso necesita taladro.empacarCristales();.';
    }
    return 'La acción de empaquetado debe estar dentro de su condición.';
  }

  private explicarErrorCarbon(codigo: string, fase: FaseTaladro): string {
    if (!codigo.startsWith(`evento(taladro.${fase === 4 ? 'operacionCompleta' : 'tanqueVacio'}){`)) {
      return 'La plantilla fija del evento de combustible fue alterada.';
    }
    if (!codigo.includes('si(taladro.carbon==0){')) {
      return 'Falta comprobar si el carbón llegó a 0.';
    }
    if (!codigo.includes('taladro.recargarCarbon();')) {
      return 'La condición de combustible necesita taladro.recargarCarbon();.';
    }
    return 'La recarga de carbón debe estar dentro de su condición.';
  }
}
