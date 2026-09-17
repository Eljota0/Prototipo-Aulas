import { EvaluadorTaladroService } from './evaluador-taladro.service';

describe('EvaluadorTaladroService', () => {
  const evaluador = new EvaluadorTaladroService();

  beforeEach(() => evaluador.configurarObjetivos());

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
      evento(taladro.estabilizarPresion) {
        si(taladro.presion == 50) {
          taladro.mantenerFuerza();
        }
      }
    `, 2);

    expect(resultado.valido).toBeTrue();
    expect(resultado.banderas.estrategiaPesoCorrecta).toBeTrue();
  });

  it('activa la estrategia de agua en la fase 3', () => {
    const resultado = evaluador.evaluar(`
      evento(taladro.recolectarAgua) {
        si(taladro.profundidad == 500) {
          taladro.extraerAgua = true;
        }
      }
    `, 3);

    expect(resultado.valido).toBeTrue();
    expect(resultado.banderas.estrategiaAguaCorrecta).toBeTrue();
  });

  it('rechaza extraer agua en una profundidad incorrecta', () => {
    const resultado = evaluador.evaluar(`
      evento(taladro.recolectarAgua) {
        si(taladro.profundidad == 300) {
          taladro.extraerAgua = true;
        }
      }
    `, 3);

    expect(resultado.valido).toBeFalse();
    expect(resultado.banderas.estrategiaAguaCorrecta).toBeFalse();
    expect(resultado.errores[0].mensaje).toContain('500');
  });

  it('evalúa los objetivos personalizados de una actividad de aula', () => {
    evaluador.configurarObjetivos({
      umbralTemperatura: 120,
      presionObjetivo: 60,
      profundidadObjetivo: 400
    });

    expect(evaluador.evaluarAndamiajeFase1(
      'si(taladro.temperatura > 120) { taladro.liberarVapor(); }'
    ).valido).toBeTrue();
    expect(evaluador.evaluarAndamiajeFase2(
      'si(taladro.presion == 60) { taladro.mantenerFuerza(); }'
    ).valido).toBeTrue();
    expect(evaluador.evaluarAndamiajeFase3(
      'si(taladro.profundidad == 400) { taladro.detenerse(); taladro.extraerAgua = true; }'
    ).valido).toBeTrue();
  });

});
