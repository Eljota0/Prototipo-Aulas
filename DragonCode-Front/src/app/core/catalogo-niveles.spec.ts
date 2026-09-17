import nivel3 from '../../assets/data/aventuraniveles/nivel-3.json';
import nivel4 from '../../assets/data/aventuraniveles/nivel-4.json';
import nivel5 from '../../assets/data/aventuraniveles/nivel-5.json';
import { NIVELES_DRAGONCODE, TOTAL_NIVELES, obtenerNivel } from './catalogo-niveles';

describe('Catálogo general de DragonCode', () => {
  it('mantiene cinco identificadores únicos y el nivel 2 con tres fases', () => {
    expect(TOTAL_NIVELES).toBe(5);
    expect(new Set(NIVELES_DRAGONCODE.map(nivel => nivel.id)).size).toBe(TOTAL_NIVELES);
    expect(obtenerNivel(2)?.fases).toBe(3);
  });
});

describe('Catálogos editables de los niveles 3, 4 y 5', () => {
  for (const catalogo of [nivel3, nivel4, nivel5]) {
    it(`mantiene cuatro fases completas y ordenadas en el nivel ${catalogo.nivel}`, () => {
      expect(catalogo.plantilla.placeholder.trim()).toBeTruthy();
      expect(catalogo.fases.map(fase => fase.numero)).toEqual([1, 2, 3, 4]);
      for (const fase of catalogo.fases) {
        expect(fase.titulo.trim()).toBeTruthy();
        expect(fase.objetivo.trim()).toBeTruthy();
        expect(fase.pista.trim()).toBeTruthy();
        expect(fase.tarjetas.length).toBeGreaterThan(0);
        expect(fase.tarjetas.every(tarjeta => !!tarjeta.codigo && !!tarjeta.etiqueta)).toBeTrue();
      }
    });
  }
});
