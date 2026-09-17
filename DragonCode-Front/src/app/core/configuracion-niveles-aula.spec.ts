import {
  ConfiguracionNivelFabrica,
  copiarConfiguracionNivel,
  crearConfiguracionNivelPredeterminada
} from './configuracion-niveles-aula';

describe('configuración de niveles para aulas', () => {
  it('crea parámetros seguros para los niveles configurables', () => {
    expect(crearConfiguracionNivelPredeterminada(1)).toBeUndefined();
    expect(crearConfiguracionNivelPredeterminada(2)?.tipo).toBe('sensores_taladro');
    expect(crearConfiguracionNivelPredeterminada(3)?.tipo).toBe('variables_cueva');
    expect(crearConfiguracionNivelPredeterminada(4)?.tipo).toBe('materiales_fabrica');
    expect(crearConfiguracionNivelPredeterminada(5)?.nivel_id).toBe(5);
  });

  it('entrega copias independientes de las secuencias de materiales', () => {
    const original = crearConfiguracionNivelPredeterminada(4) as ConfiguracionNivelFabrica;
    const copia = copiarConfiguracionNivel(original) as ConfiguracionNivelFabrica;

    copia.materiales_por_fase['1'].push('Carbon');

    expect(original.materiales_por_fase['1']).toEqual(['Diamante']);
    expect(copia.materiales_por_fase['1']).toEqual(['Diamante', 'Carbon']);
  });
});
