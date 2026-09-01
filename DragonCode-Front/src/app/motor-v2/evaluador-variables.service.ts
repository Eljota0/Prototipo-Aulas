import { Injectable } from '@angular/core';
import {
  ErrorEjecucion,
  EstadoEjecucion,
  EvaluadorNivel,
  EventoEjecucion,
  ReglasFaseVariables,
  ResultadoEvaluacion,
  ValorVariable
} from './evaluador-nivel';

@Injectable({ providedIn: 'root' })
export class EvaluadorVariablesService implements EvaluadorNivel<ReglasFaseVariables> {
  evaluar(codigo: string, reglas: ReglasFaseVariables): ResultadoEvaluacion {
    const estado: EstadoEjecucion = { variables: {}, salidas: [] };
    const eventos: EventoEjecucion[] = [];
    const errores: ErrorEjecucion[] = [];
    const operadoresUsados = new Set<string>();

    const lineas = codigo
      .split('\n')
      .map((texto, indice) => ({ texto: texto.trim(), numero: indice + 1 }))
      .filter(linea => linea.texto.length > 0);

    if (lineas.length === 0) {
      return this.resultadoFallido('El pergamino está vacío.', estado, eventos);
    }

    for (const linea of lineas) {
      const coincidenciaPrint = linea.texto.match(/^print\s*\((.+)\)$/);
      if (coincidenciaPrint) {
        const valor = this.evaluarExpresion(
          coincidenciaPrint[1],
          estado,
          linea.numero,
          operadoresUsados,
          errores
        );
        if (valor === undefined) break;

        estado.salidas.push(String(valor));
        eventos.push({ tipo: 'MOSTRAR', linea: linea.numero, valor });
        continue;
      }

      const coincidenciaAsignacion = linea.texto.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/);
      if (!coincidenciaAsignacion) {
        errores.push({
          linea: linea.numero,
          mensaje: 'Usa una asignación como vida = 100 o una salida como print(vida).'
        });
        break;
      }

      const nombreVariable = coincidenciaAsignacion[1];
      const expresion = coincidenciaAsignacion[2];
      const valor = this.evaluarExpresion(
        expresion,
        estado,
        linea.numero,
        operadoresUsados,
        errores
      );
      if (valor === undefined) break;

      const valorAnterior = estado.variables[nombreVariable];
      estado.variables[nombreVariable] = valor;
      eventos.push({
        tipo: 'ASIGNAR',
        linea: linea.numero,
        variable: nombreVariable,
        valor,
        ...(valorAnterior !== undefined ? { valorAnterior } : {})
      });
    }

    if (errores.length === 0) {
      this.validarObjetivo(reglas, estado, eventos, operadoresUsados, errores);
    }

    return {
      valido: errores.length === 0,
      errores,
      eventos,
      estadoFinal: estado
    };
  }

  private evaluarExpresion(
    expresionCruda: string,
    estado: EstadoEjecucion,
    linea: number,
    operadoresUsados: Set<string>,
    errores: ErrorEjecucion[]
  ): ValorVariable | undefined {
    const expresion = expresionCruda.trim();
    const operacion = expresion.match(/^(.+?)\s*([+\-*/])\s*(.+)$/);

    if (!operacion) {
      return this.resolverOperando(expresion, estado, linea, errores);
    }

    const izquierda = this.resolverOperando(operacion[1].trim(), estado, linea, errores);
    const derecha = this.resolverOperando(operacion[3].trim(), estado, linea, errores);
    if (izquierda === undefined || derecha === undefined) return undefined;

    const operador = operacion[2] as '+' | '-' | '*' | '/';
    operadoresUsados.add(operador);

    if (operador === '+' && (typeof izquierda === 'string' || typeof derecha === 'string')) {
      return String(izquierda) + String(derecha);
    }

    if (typeof izquierda !== 'number' || typeof derecha !== 'number') {
      errores.push({ linea, mensaje: `El operador ${operador} necesita valores numéricos.` });
      return undefined;
    }

    if (operador === '/' && derecha === 0) {
      errores.push({ linea, mensaje: 'No se puede dividir para cero.' });
      return undefined;
    }

    switch (operador) {
      case '+': return izquierda + derecha;
      case '-': return izquierda - derecha;
      case '*': return izquierda * derecha;
      case '/': return izquierda / derecha;
    }
  }

  private resolverOperando(
    operando: string,
    estado: EstadoEjecucion,
    linea: number,
    errores: ErrorEjecucion[]
  ): ValorVariable | undefined {
    if (/^-?\d+(\.\d+)?$/.test(operando)) return Number(operando);

    const texto = operando.match(/^(["'])(.*)\1$/);
    if (texto) return texto[2];

    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(operando)) {
      if (!(operando in estado.variables)) {
        errores.push({ linea, mensaje: `La variable "${operando}" todavía no existe.` });
        return undefined;
      }
      return estado.variables[operando];
    }

    errores.push({ linea, mensaje: `No se reconoce la expresión "${operando}".` });
    return undefined;
  }

  private validarObjetivo(
    reglas: ReglasFaseVariables,
    estado: EstadoEjecucion,
    eventos: EventoEjecucion[],
    operadoresUsados: Set<string>,
    errores: ErrorEjecucion[]
  ): void {
    for (const [nombre, valorEsperado] of Object.entries(reglas.variablesEsperadas)) {
      if (!(nombre in estado.variables)) {
        errores.push({ mensaje: `Falta crear la variable "${nombre}".` });
      } else if (estado.variables[nombre] !== valorEsperado) {
        errores.push({
          mensaje: `La variable "${nombre}" debe terminar con el valor ${JSON.stringify(valorEsperado)}.`
        });
      }
    }

    for (const salida of reglas.salidasEsperadas ?? []) {
      if (!estado.salidas.includes(salida)) {
        errores.push({ mensaje: `Debes mostrar ${JSON.stringify(salida)} usando print().` });
      }
    }

    for (const operador of reglas.operadoresRequeridos ?? []) {
      if (!operadoresUsados.has(operador)) {
        errores.push({ mensaje: `Resuelve el reto utilizando el operador ${operador}.` });
      }
    }

    const asignaciones = eventos.filter(evento => evento.tipo === 'ASIGNAR').length;
    if (asignaciones < (reglas.asignacionesMinimas ?? 0)) {
      errores.push({ mensaje: `El reto necesita al menos ${reglas.asignacionesMinimas} asignaciones.` });
    }
  }

  private resultadoFallido(
    mensaje: string,
    estado: EstadoEjecucion,
    eventos: EventoEjecucion[]
  ): ResultadoEvaluacion {
    return {
      valido: false,
      errores: [{ mensaje }],
      eventos,
      estadoFinal: estado
    };
  }
}
