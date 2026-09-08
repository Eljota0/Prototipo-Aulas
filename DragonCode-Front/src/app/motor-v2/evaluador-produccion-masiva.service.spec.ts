import { TestBed } from '@angular/core/testing';
import { EvaluadorProduccionMasivaService } from './evaluador-produccion-masiva.service';

describe('EvaluadorProduccionMasivaService', () => {
  let servicio: EvaluadorProduccionMasivaService;

  beforeEach(() => {
    servicio = TestBed.inject(EvaluadorProduccionMasivaService);
  });

  it('valida el bucle completo con las tres rutas anidadas', () => {
    const resultado = servicio.evaluar(`
      mientras (fabrica.tieneMateriales == verdadero) {
        si (fabrica.materialActual == "Diamante") { fabrica.guardar(); }
        sino si (fabrica.materialActual == "Explosivo") { fabrica.destruir(); }
        sino { fabrica.quemar(); }
      }
    `, 4);

    expect(resultado.valido).toBeTrue();
    expect(resultado.bucleValido).toBeTrue();
    expect(resultado.acciones).toEqual({
      Diamante: 'guardar',
      Explosivo: 'destruir',
      Carbon: 'quemar'
    });
  });

  it('rechaza decisiones que no estén encerradas en mientras', () => {
    const resultado = servicio.evaluar(
      'si (fabrica.materialActual == "Diamante") { fabrica.guardar(); }',
      1
    );

    expect(resultado.valido).toBeFalse();
    expect(resultado.bucleValido).toBeFalse();
    expect(resultado.errores[0].mensaje).toContain('mientras');
  });

  it('rechaza un bucle cuya condición nunca llega a falso', () => {
    const resultado = servicio.evaluar(`
      mientras (verdadero) {
        si (fabrica.materialActual == "Diamante") { fabrica.guardar(); }
      }
    `, 1);

    expect(resultado.valido).toBeFalse();
    expect(resultado.errores[0].mensaje).toContain('tieneMateriales');
  });
});
