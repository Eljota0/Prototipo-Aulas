import { calcularEstrellas } from './estrellas';

describe('Vista previa de estrellas RF-07', () => {
  for (const [vidas, ayudas, esperado] of [
    [3, false, 3], [3, true, 2], [2, false, 2], [2, true, 1], [1, false, 1], [1, true, 1]
  ] as const) {
    it(`${vidas} vidas, ayudas ${ayudas}: ${esperado} estrellas`, () => {
      expect(calcularEstrellas(vidas, ayudas)).toBe(esperado);
    });
  }
});
