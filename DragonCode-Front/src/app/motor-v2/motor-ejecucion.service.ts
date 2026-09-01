import { Injectable } from '@angular/core';
import { EvaluadorVariablesService } from './evaluador-variables.service';
import {
  FaseTaladro,
  ReglasFaseVariables,
  ResultadoEvaluacion,
  ResultadoEvaluacionTaladro
} from './evaluador-nivel';
import { EvaluadorTaladroService } from './evaluador-taladro.service';

export type TipoMotor = 'variables';

@Injectable({ providedIn: 'root' })
export class MotorEjecucionService {
  constructor(
    private evaluadorVariables: EvaluadorVariablesService,
    private evaluadorTaladro: EvaluadorTaladroService
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
}
