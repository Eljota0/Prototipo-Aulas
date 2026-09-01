import { EvaluadorTaladroService } from './evaluador-taladro.service';

describe('EvaluadorTaladroService', () => {
  const evaluador = new EvaluadorTaladroService();

  it('activa la estrategia de vapor aunque el código tenga espacios y saltos de línea', () => {
    const resultado = evaluador.evaluar(`
      evento(taladro.sobrecalentamiento) {
        si(taladro.temperatura > 100) {
          taladro.liberarVapor();
        }
      }
    `, 1);

    expect(resultado.valido).toBeTrue();
    expect(resultado.banderas.estrategiaVaporCorrecta).toBeTrue();
  });

  it('rechaza liberar vapor sin el condicional esperado', () => {
    const resultado = evaluador.evaluar(
      'evento(taladro.sobrecalentamiento){taladro.liberarVapor();}',
      1
    );

    expect(resultado.valido).toBeFalse();
    expect(resultado.banderas.estrategiaVaporCorrecta).toBeFalse();
    expect(resultado.errores[0].mensaje).toContain('temperatura');
  });

  it('rechaza una condición con el umbral incorrecto', () => {
    const resultado = evaluador.evaluar(`
      evento(taladro.sobrecalentamiento) {
        si(taladro.temperatura < 100) {
          taladro.liberarVapor();
        }
      }
    `, 1);

    expect(resultado.valido).toBeFalse();
  });

  it('activa la estrategia de peso en la fase 2', () => {
    const resultado = evaluador.evaluar(`
      evento(taladro.sobrecarga) {
        si(taladro.pesoCarga > 50) {
          taladro.empacarCristales();
        }
      }
    `, 2);

    expect(resultado.valido).toBeTrue();
    expect(resultado.banderas.estrategiaPesoCorrecta).toBeTrue();
  });

  it('activa la estrategia de carbón en la fase 3', () => {
    const resultado = evaluador.evaluar(`
      evento(taladro.tanqueVacio) {
        si(taladro.carbon == 0) {
          taladro.recargarCarbon();
        }
      }
    `, 3);

    expect(resultado.valido).toBeTrue();
    expect(resultado.banderas.estrategiaCarbonCorrecta).toBeTrue();
  });

  it('exige los tres protocolos en orden durante la fase final', () => {
    const resultado = evaluador.evaluar(`
      evento(taladro.operacionCompleta) {
        si(taladro.temperatura > 100) { taladro.liberarVapor(); }
        si(taladro.pesoCarga > 50) { taladro.empacarCristales(); }
        si(taladro.carbon == 0) { taladro.recargarCarbon(); }
      }
    `, 4);

    expect(resultado.valido).toBeTrue();
    expect(resultado.banderas.estrategiaVaporCorrecta).toBeTrue();
    expect(resultado.banderas.estrategiaPesoCorrecta).toBeTrue();
    expect(resultado.banderas.estrategiaCarbonCorrecta).toBeTrue();
  });
});
