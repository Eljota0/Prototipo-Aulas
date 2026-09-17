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
    expect(resultado.errores[0].mensaje).toContain('MIENTRAS queden materiales');
  });

  it('rechaza un bucle cuya condición nunca llega a falso', () => {
    const resultado = servicio.evaluar(`
      mientras (verdadero) {
        si (fabrica.materialActual == "Diamante") { fabrica.guardar(); }
      }
    `, 1);

    expect(resultado.valido).toBeFalse();
    expect(resultado.errores[0].mensaje).toContain('MIENTRAS queden materiales');
  });

  it('explica con los nombres visibles de las tarjetas cuando falta cerrar el bucle', () => {
    const resultado = servicio.evaluar(`
      mientras (fabrica.tieneMateriales == verdadero) {
        si (fabrica.materialActual == "Diamante") { fabrica.guardar(); }
    `, 1);

    expect(resultado.valido).toBeFalse();
    expect(resultado.errores).toHaveSize(1);
    expect(resultado.errores[0].mensaje).toContain('FIN de MIENTRAS');
  });

  it('acepta espacios, comillas simples, operador estricto y true como equivalentes', () => {
    const resultado = servicio.evaluar(`
      mientras (fabrica.tieneMateriales === true) {
        si (fabrica.materialActual === 'Diamante') {
          fabrica.guardar()
        }
      }
    `, 1);

    expect(resultado.valido).toBeTrue();
    expect(resultado.acciones.Diamante).toBe('guardar');
  });

  it('indica el orden completo si las tarjetas correctas están desordenadas', () => {
    const resultado = servicio.evaluar(`
      mientras (fabrica.tieneMateriales == verdadero) {
        sino si (fabrica.materialActual == "Explosivo") { fabrica.destruir(); }
        si (fabrica.materialActual == "Diamante") { fabrica.guardar(); }
      }
    `, 3);

    expect(resultado.valido).toBeFalse();
    expect(resultado.errores).toHaveSize(1);
    expect(resultado.errores[0].mensaje).toContain('fuera de orden');
    expect(resultado.errores[0].mensaje).toContain('SINO SI es Explosivo');
  });
});
