import { TestBed } from '@angular/core/testing';
import { EvaluadorControlCalidadService } from './evaluador-control-calidad.service';

describe('EvaluadorControlCalidadService', () => {
  let evaluador: EvaluadorControlCalidadService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    evaluador = TestBed.inject(EvaluadorControlCalidadService);
  });

  it('acepta el condicional simple de la fase 1 aunque cambien los espacios', () => {
    const resultado = evaluador.evaluar(`
      evento ( fabrica.nuevoMaterial ) {
        si ( fabrica.materialActual == "Diamante" ) {
          fabrica.guardar();
        }
      }
    `, 1);

    expect(resultado.valido).toBeTrue();
    expect(resultado.acciones.Diamante).toBe('guardar');
  });

  it('extrae las tres rutas de la cadena completa', () => {
    const resultado = evaluador.evaluar(`
      evento(fabrica.nuevoMaterial) {
        si (fabrica.materialActual == 'Diamante') { fabrica.guardar(); }
        sino si (fabrica.materialActual == 'Explosivo') { fabrica.destruir(); }
        sino { fabrica.quemar(); }
      }
    `, 4);

    expect(resultado.valido).toBeTrue();
    expect(resultado.acciones).toEqual({
      Diamante: 'guardar',
      Explosivo: 'destruir',
      Carbon: 'quemar'
    });
  });

  it('rechaza un explosivo enviado al horno e informa el peligro', () => {
    const resultado = evaluador.evaluar(`
      evento(fabrica.nuevoMaterial) {
        si (fabrica.materialActual == "Diamante") { fabrica.guardar(); }
        sino si (fabrica.materialActual == "Explosivo") { fabrica.quemar(); }
        sino { fabrica.quemar(); }
      }
    `, 4);

    expect(resultado.valido).toBeFalse();
    expect(resultado.acciones.Explosivo).toBe('quemar');
    expect(resultado.errores[0].mensaje).toContain('destruir()');
  });

  it('no acepta dos condicionales si separados en la fase 3', () => {
    const resultado = evaluador.evaluar(`
      evento(fabrica.nuevoMaterial) {
        si (fabrica.materialActual == "Diamante") { fabrica.guardar(); }
        si (fabrica.materialActual == "Explosivo") { fabrica.destruir(); }
      }
    `, 3);

    expect(resultado.valido).toBeFalse();
    expect(resultado.errores[0].mensaje).toContain('sino si');
  });
});
