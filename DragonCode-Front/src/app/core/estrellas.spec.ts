import { calcularEstrellas, calcularEstrellasAventura } from './estrellas';

describe('Vista previa de estrellas RF-07', () => {
  for (const [vidas, ayudas, esperado] of [
    [3, false, 3], [3, true, 2], [2, false, 2], [2, true, 1], [1, false, 1], [1, true, 1]
  ] as const) {
    it(`${vidas} vidas, ayudas ${ayudas}: ${esperado} estrellas`, () => {
      expect(calcularEstrellas(vidas, ayudas)).toBe(esperado);
    });
  }
});

describe('Logros independientes de aventura', () => {
  it('nivel 1 premia consola y ausencia de objetos, independientemente de las vidas', () => {
    expect(calcularEstrellasAventura(1, false, false, 2, 5)).toBe(3);
    expect(calcularEstrellasAventura(1, false, true, 0, 1)).toBe(2);
    expect(calcularEstrellasAventura(1, true, false, 0, 1)).toBe(2);
    expect(calcularEstrellasAventura(1, true, true, 0, 1)).toBe(1);
  });
  it('nivel 2 premia cero fallos, sin penalizar las tarjetas', () => {
    expect(calcularEstrellasAventura(2, false, true, 0, 1)).toBe(3);
    expect(calcularEstrellasAventura(2, false, false, 1, 2)).toBe(2);
    expect(calcularEstrellasAventura(2, true, false, 0, 1)).toBe(2);
    expect(calcularEstrellasAventura(2, true, false, 1, 2)).toBe(1);
  });
  for (const nivel of [3, 4, 5]) {
    it(`nivel ${nivel}: curarse no borra la vida perdida`, () => {
      expect(calcularEstrellasAventura(nivel, false, true, 0, 1)).toBe(3);
      expect(calcularEstrellasAventura(nivel, false, false, 2, 3)).toBe(2);
      expect(calcularEstrellasAventura(nivel, true, false, 0, 1)).toBe(2);
      expect(calcularEstrellasAventura(nivel, true, false, 1, 2)).toBe(1);
    });
  }
});
