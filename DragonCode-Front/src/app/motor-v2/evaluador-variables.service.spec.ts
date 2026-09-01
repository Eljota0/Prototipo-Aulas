import { EvaluadorVariablesService } from './evaluador-variables.service';

describe('EvaluadorVariablesService', () => {
  const evaluador = new EvaluadorVariablesService();

  it('evalúa una asignación numérica válida', () => {
    const resultado = evaluador.evaluar('vida = 100', {
      variablesEsperadas: { vida: 100 },
      asignacionesMinimas: 1
    });

    expect(resultado.valido).toBeTrue();
    expect(resultado.estadoFinal.variables['vida']).toBe(100);
  });

  it('evalúa actualizaciones y print sin usar eval', () => {
    const resultado = evaluador.evaluar(
      ['pociones = 3', 'pociones = pociones - 1', 'print(pociones)'].join('\n'),
      {
        variablesEsperadas: { pociones: 2 },
        salidasEsperadas: ['2'],
        operadoresRequeridos: ['-'],
        asignacionesMinimas: 2
      }
    );

    expect(resultado.valido).toBeTrue();
    expect(resultado.eventos.length).toBe(3);
  });

  it('rechaza el uso de una variable inexistente', () => {
    const resultado = evaluador.evaluar('vida = mana + 10', {
      variablesEsperadas: { vida: 10 }
    });

    expect(resultado.valido).toBeFalse();
    expect(resultado.errores[0].mensaje).toContain('mana');
  });
});
