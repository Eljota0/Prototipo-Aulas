import { Route } from '@angular/router';

import { routes } from './app.routes';

describe('Rutas del modo Aventura', () => {
  const rutasNivel = routes.filter(ruta => /^aventura\/nivel\/[1-5]$/.test(ruta.path ?? ''));

  it('declara exactamente los cinco niveles con su identificador correcto', () => {
    expect(rutasNivel.map(ruta => ruta.path)).toEqual([
      'aventura/nivel/1',
      'aventura/nivel/2',
      'aventura/nivel/3',
      'aventura/nivel/4',
      'aventura/nivel/5'
    ]);
    expect(rutasNivel.map(ruta => ruta.data?.['nivelId'])).toEqual([1, 2, 3, 4, 5]);
  });

  for (const ruta of rutasNivel) {
    it(`puede cargar el componente de ${ruta.path}`, async () => {
      const cargar = ruta.loadComponent as Exclude<Route['loadComponent'], undefined>;
      const componente = await cargar();
      expect(componente).toBeTruthy();
    });
  }
});
