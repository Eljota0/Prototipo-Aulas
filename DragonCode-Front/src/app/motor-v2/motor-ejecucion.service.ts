import { Injectable } from '@angular/core';
import { EvaluadorVariablesService } from './evaluador-variables.service';
import {
  FaseControlCalidad,
  FaseProduccionMasiva,
  FaseTaladro,
  ReglasFaseVariables,
  ResultadoEvaluacion,
  ResultadoEvaluacionControlCalidad,
  ResultadoEvaluacionProduccionMasiva,
  ResultadoEvaluacionTaladro
} from './evaluador-nivel';
import { EvaluadorControlCalidadService } from './evaluador-control-calidad.service';
import { EvaluadorProduccionMasivaService } from './evaluador-produccion-masiva.service';
import { EvaluadorTaladroService, ObjetivosTaladro } from './evaluador-taladro.service';

export type TipoMotor = 'variables';

@Injectable({ providedIn: 'root' })
export class MotorEjecucionService {
  constructor(
    private evaluadorVariables: EvaluadorVariablesService,
    private evaluadorTaladro: EvaluadorTaladroService,
    private evaluadorControlCalidad: EvaluadorControlCalidadService,
    private evaluadorProduccionMasiva: EvaluadorProduccionMasivaService
  ) {}

  ejecutar(tipo: TipoMotor, codigo: string, reglas: ReglasFaseVariables): ResultadoEvaluacion {
    switch (tipo) {
      case 'variables':
        return this.evaluadorVariables.evaluar(codigo, reglas);
    }
  }

  evaluarTaladro(codigo: string, fase: FaseTaladro = 1): ResultadoEvaluacionTaladro {
    return this.evaluadorTaladro.evaluar(codigo, fase);
  }

  configurarTaladro(objetivos?: Partial<ObjetivosTaladro>): void {
    this.evaluadorTaladro.configurarObjetivos(objetivos);
  }

  evaluarAndamiajeFase1(codigo: string): { valido: boolean; tipoFallo: string; operador: string; valor: number; accion: string } {
    return this.evaluadorTaladro.evaluarAndamiajeFase1(codigo);
  }

  evaluarAndamiajeFase2(codigo: string): { valido: boolean; tipoFallo: string; operador: string; valor: number; accion: string } {
    return this.evaluadorTaladro.evaluarAndamiajeFase2(codigo);
  }

  evaluarAndamiajeFase3(codigo: string): { valido: boolean; tipoFallo: string; operador: string; valor: number; accion: string; booleano: boolean } {
    return this.evaluadorTaladro.evaluarAndamiajeFase3(codigo);
  }

  evaluarControlCalidad(
    codigo: string,
    fase: FaseControlCalidad
  ): ResultadoEvaluacionControlCalidad {
    return this.evaluadorControlCalidad.evaluar(codigo, fase);
  }

  evaluarProduccionMasiva(
    codigo: string,
    fase: FaseProduccionMasiva
  ): ResultadoEvaluacionProduccionMasiva {
    return this.evaluadorProduccionMasiva.evaluar(codigo, fase);
  }
}
