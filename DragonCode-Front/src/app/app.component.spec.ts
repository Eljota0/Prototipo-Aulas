import { esErrorCargaDiferida } from './app.component';

describe('AppComponent', () => {
  it('reconoce errores de módulos diferidos para recuperar una sesión desactualizada', () => {
    expect(esErrorCargaDiferida(new Error('Failed to fetch dynamically imported module'))).toBeTrue();
    expect(esErrorCargaDiferida(new Error('Loading chunk 17 failed'))).toBeTrue();
    expect(esErrorCargaDiferida(new Error('Error de validación del formulario'))).toBeFalse();
  });
});
