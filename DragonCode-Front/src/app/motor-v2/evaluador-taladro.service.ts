import { Injectable } from '@angular/core';
import {
  BanderasEstrategiaTaladro,
  ErrorEjecucion,
  FaseTaladro,
  ResultadoEvaluacionTaladro
} from './evaluador-nivel';

export interface ObjetivosTaladro {
  umbralTemperatura: number;
  presionObjetivo: number;
  profundidadObjetivo: number;
}

@Injectable({ providedIn: 'root' })
export class EvaluadorTaladroService {
  private objetivos: ObjetivosTaladro = {
    umbralTemperatura: 100,
    presionObjetivo: 50,
    profundidadObjetivo: 500
  };

  configurarObjetivos(objetivos?: Partial<ObjetivosTaladro>): void {
    this.objetivos = {
      umbralTemperatura: objetivos?.umbralTemperatura ?? 100,
      presionObjetivo: objetivos?.presionObjetivo ?? 50,
      profundidadObjetivo: objetivos?.profundidadObjetivo ?? 500
    };
  }

  evaluarAndamiajeFase1(codigo: string): { valido: boolean, tipoFallo: string, operador: string, valor: number, accion: string } {
    const defaultRes = { valido: false, tipoFallo: 'SOBRECALENTAMIENTO', operador: '', valor: 0, accion: '' };
    const andamiajeRegex = /si\s*\(\s*taladro\.temperatura\s*([><])\s*(\d+)\s*\)\s*\{\s*taladro\.(liberarVapor|apagarMotor|extraerCarbon)\(\);?\s*\}/i;
    const match = codigo.match(andamiajeRegex);
    
    if (!match) return defaultRes;

    const operador = match[1];
    const valor = parseInt(match[2], 10);
    const accion = match[3];

    const baseRes = { operador, valor, accion };

    if (operador === '>' && valor === this.objetivos.umbralTemperatura && accion === 'liberarVapor') {
      return { valido: true, tipoFallo: '', ...baseRes };
    }

    if (accion === 'liberarVapor') {
      if (valor <= this.objetivos.umbralTemperatura || operador === '<') return { valido: false, tipoFallo: 'AHOGO', ...baseRes };
    }

    if (accion === 'apagarMotor') {
      return { valido: false, tipoFallo: 'DESCOMPUESTO', ...baseRes };
    }

    // Default Fallback absoluto: cualquier otra combinación, sintaxis rota o caso no contemplado colapsa la máquina
    return { valido: false, tipoFallo: 'SOBRECALENTAMIENTO', ...baseRes };
  }

  evaluarAndamiajeFase2(codigo: string): { valido: boolean, tipoFallo: string, operador: string, valor: number, accion: string } {
    const defaultRes = { valido: false, tipoFallo: 'DESESTABILIZACION', operador: '', valor: 0, accion: '' };
    const andamiajeRegex = /si\s*\(\s*taladro\.presion\s*(==|!=)\s*(\d+)\s*\)\s*\{\s*taladro\.(mantenerFuerza|apagarMotor|aumentarFuerza|liberarVapor)\(\);?\s*\}/i;
    const match = codigo.match(andamiajeRegex);

    if (!match) return defaultRes;

    const operador = match[1];
    const valor = parseInt(match[2], 10);
    const accion = match[3];

    const baseRes = { operador, valor, accion };

    if (operador === '==' && valor === this.objetivos.presionObjetivo && accion === 'mantenerFuerza') {
      return { valido: true, tipoFallo: '', ...baseRes };
    }

    if (accion === 'apagarMotor') {
      return { valido: false, tipoFallo: 'DESCOMPUESTO', ...baseRes };
    }

    if (accion === 'aumentarFuerza') {
      return { valido: false, tipoFallo: 'SOBRECALENTAMIENTO', ...baseRes };
    }

    if (accion === 'liberarVapor') {
      return { valido: false, tipoFallo: 'AHOGO', ...baseRes };
    }

    return { valido: false, tipoFallo: 'DESESTABILIZACION', ...baseRes };
  }
  evaluarAndamiajeFase3(codigo: string): { valido: boolean, tipoFallo: string, operador: string, valor: number, accion: string, booleano: boolean } {
    const defaultRes = { valido: false, tipoFallo: 'SINTAXIS', operador: '', valor: 0, accion: '', booleano: false };
    const andamiajeRegex = /si\s*\(\s*taladro\.profundidad\s*(==|>|<)\s*(\d+)\s*\)\s*\{\s*taladro\.(detenerse|apagarMotor|lanzarGasolina)\(\);?\s*taladro\.extraerAgua\s*=\s*(true|false);?\s*\}/i;
    const match = codigo.match(andamiajeRegex);

    if (!match) return defaultRes;

    const operador = match[1];
    const valor = parseInt(match[2], 10);
    const accion = match[3];
    const booleano = match[4].toLowerCase() === 'true';

    const baseRes = { operador, valor, accion, booleano };

    if (operador === '==' && valor === this.objetivos.profundidadObjetivo && accion === 'detenerse' && booleano === true) {
      return { valido: true, tipoFallo: '', ...baseRes };
    }
    
    // Matrix de errores
    if (operador === '<') {
      return { valido: false, tipoFallo: 'ANTES_DE_AGUA', ...baseRes };
    }
    
    if (valor !== this.objetivos.profundidadObjetivo) {
      return { valido: false, tipoFallo: 'CONTAMINACION', ...baseRes };
    }

    if (accion === 'apagarMotor') {
      return { valido: false, tipoFallo: 'APAGADO', ...baseRes };
    }

    if (accion === 'lanzarGasolina') {
      return { valido: false, tipoFallo: 'CONTAMINACION', ...baseRes };
    }

    if (booleano === false) {
      return { valido: false, tipoFallo: 'NO_EXTRAER', ...baseRes };
    }

    return { valido: false, tipoFallo: 'DESCONOCIDO', ...baseRes };
  }


  evaluar(codigo: string, fase: FaseTaladro = 1): ResultadoEvaluacionTaladro {
    const errores: ErrorEjecucion[] = [];
    const banderas: BanderasEstrategiaTaladro = {
      estrategiaVaporCorrecta: false,
      estrategiaPesoCorrecta: false,
      estrategiaAguaCorrecta: false
    };

    if (fase === 1) {
      const fase1Regex = new RegExp(
        `evento\\s*\\(\\s*taladro\\.sobrecalentamiento\\s*\\)\\s*\\{\\s*si\\s*\\(\\s*taladro\\.temperatura\\s*>\\s*${this.objetivos.umbralTemperatura}\\s*\\)\\s*\\{\\s*taladro\\.liberarVapor\\(\\);?\\s*\\}\\s*\\}`,
        'i'
      );
      banderas.estrategiaVaporCorrecta = fase1Regex.test(codigo);
      if (!banderas.estrategiaVaporCorrecta) {
        errores.push({ mensaje: this.explicarErrorTemperatura(codigo, fase) });
      }
    }

    if (fase === 2) {
      const fase2Regex = new RegExp(
        `evento\\s*\\(\\s*taladro\\.estabilizarPresion\\s*\\)\\s*\\{\\s*si\\s*\\(\\s*taladro\\.presion\\s*==\\s*${this.objetivos.presionObjetivo}\\s*\\)\\s*\\{\\s*taladro\\.mantenerFuerza\\(\\);?\\s*\\}\\s*\\}`,
        'i'
      );
      banderas.estrategiaPesoCorrecta = fase2Regex.test(codigo);
      if (!banderas.estrategiaPesoCorrecta) {
        errores.push({ mensaje: this.explicarErrorPresion(codigo, fase) });
      }
    }

    if (fase === 3) {
      const fase3Regex = new RegExp(
        `evento\\s*\\(\\s*taladro\\.recolectarAgua\\s*\\)\\s*\\{\\s*si\\s*\\(\\s*taladro\\.profundidad\\s*==\\s*${this.objetivos.profundidadObjetivo}\\s*\\)\\s*\\{\\s*taladro\\.extraerAgua\\s*=\\s*true;?\\s*\\}\\s*\\}`,
        'i'
      );
      banderas.estrategiaAguaCorrecta = fase3Regex.test(codigo);
      if (!banderas.estrategiaAguaCorrecta) {
        errores.push({ mensaje: this.explicarErrorAgua(codigo, fase) });
      }
    }

    return {
      valido: errores.length === 0,
      codigoSanitizado: codigo.replace(/\s+/g, ''), // Mantenemos sanitizado solo para debug interno o logs
      banderas,
      errores
    };
  }

  private explicarErrorAgua(codigo: string, fase: FaseTaladro): string {
    const eventoRegex = new RegExp(`evento\\s*\\(\\s*taladro\\.recolectarAgua\\s*\\)\\s*\\{`, 'i');
    
    if (!eventoRegex.test(codigo)) {
      return 'La plantilla fija del evento de agua fue alterada.';
    }
    const condicion = new RegExp(`si\\s*\\(\\s*taladro\\.profundidad\\s*==\\s*${this.objetivos.profundidadObjetivo}\\s*\\)`, 'i');
    if (!condicion.test(codigo)) {
      return `Falta comprobar si la profundidad es exactamente ${this.objetivos.profundidadObjetivo}.`;
    }
    if (!/taladro\.extraerAgua\s*=\s*true/i.test(codigo)) {
      return 'La condicion de agua necesita taladro.extraerAgua = true;.';
    }
    return 'La accion de agua debe estar dentro de su condicion.';
  }

  private explicarErrorTemperatura(codigo: string, fase: FaseTaladro): string {
    const evento = 'sobrecalentamiento';
    const eventoRegex = new RegExp(`evento\\s*\\(\\s*taladro\\.${evento}\\s*\\)\\s*\\{`, 'i');
    
    if (!eventoRegex.test(codigo)) {
      return 'La plantilla fija del evento de temperatura fue alterada.';
    }
    const condicion = new RegExp(`si\\s*\\(\\s*taladro\\.temperatura\\s*>\\s*${this.objetivos.umbralTemperatura}\\s*\\)`, 'i');
    if (!condicion.test(codigo)) {
      return `Falta comprobar si la temperatura supera ${this.objetivos.umbralTemperatura}.`;
    }
    if (!/taladro\.liberarVapor\(\);?/i.test(codigo)) {
      return 'La condicion de temperatura necesita taladro.liberarVapor();.';
    }
    return 'La accion de vapor debe estar dentro de su condicion.';
  }

  private explicarErrorPresion(codigo: string, fase: FaseTaladro): string {
    const evento = 'estabilizarPresion';
    const eventoRegex = new RegExp(`evento\\s*\\(\\s*taladro\\.${evento}\\s*\\)\\s*\\{`, 'i');
    
    if (!eventoRegex.test(codigo)) {
      return 'La plantilla fija del evento de presion fue alterada.';
    }
    const condicion = new RegExp(`si\\s*\\(\\s*taladro\\.presion\\s*==\\s*${this.objetivos.presionObjetivo}\\s*\\)`, 'i');
    if (!condicion.test(codigo)) {
      return `La presion debe ser exactamente ${this.objetivos.presionObjetivo} para no desestabilizar la maquina.`;
    }
    if (!/taladro\.mantenerFuerza\(\);?/i.test(codigo)) {
      return 'La condicion de presion necesita taladro.mantenerFuerza();.';
    }
    return 'La accion de mantener fuerza debe estar dentro de su condicion.';
  }

}
