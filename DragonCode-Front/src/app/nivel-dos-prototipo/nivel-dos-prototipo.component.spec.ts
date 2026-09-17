import { fakeAsync, tick } from '@angular/core/testing';
import { of } from 'rxjs';

import nivel2Data from '../../assets/data/aventuraniveles/nivel-2.json';
import { NivelDosPrototipoComponent } from './nivel-dos-prototipo.component';

describe('NivelDosPrototipoComponent', () => {
  let component: NivelDosPrototipoComponent;
  let progreso: jasmine.SpyObj<any>;
  let baraja: any;

  beforeEach(() => {
    progreso = jasmine.createSpyObj('ProgresoService', ['guardarProgreso']);
    progreso.guardarProgreso.and.returnValue(of({
      mensaje: 'guardado',
      estrellas_obtenidas: 2,
      estrellas_totales_usuario: 5,
      es_primera_vez: true
    }));
    baraja = {
      estadoObjetos: {
        libro: { activo: true },
        clarividencia: { activo: false, consumida: false },
        vida: { activo: true, consumida: false },
        tiempo: { activo: false, consumida: false }
      },
      agitarPocion: jasmine.createSpy('agitarPocion')
    };

    component = new NivelDosPrototipoComponent(
      {} as any,
      { mostrar: () => undefined, ocultar: () => undefined } as any,
      { url: '/aventura/nivel/2', navigate: () => Promise.resolve(true) } as any,
      progreso,
      {} as any,
      { detectChanges: () => undefined } as any
    );
    component.layoutJuego = { baraja } as any;
  });

  it('carga sus fases desde el catálogo editable del nivel', () => {
    expect(component.fases.length).toBe(nivel2Data.fases.length);
    expect(component.fases.map(fase => fase.titulo)).toEqual(
      nivel2Data.fases.map(fase => fase.titulo)
    );
  });

  it('resta una vida al fallar y muestra game over al agotar las tres', fakeAsync(() => {
    for (let intento = 0; intento < 3; intento++) {
      (component as any).dispararModalGameOver('fallo');
      tick(2500);
      if (intento < 2) component.falloFase = false;
    }

    expect(component.vidas).toBe(0);
    expect(component.gameOver).toBeTrue();
    expect(component.falloFase).toBeFalse();
  }));

  it('la poción roja recupera una vida una sola vez y cuenta como ayuda', () => {
    component.vidas = 2;

    component.manejarUsoPocion('roja');
    component.manejarUsoPocion('roja');

    expect(component.vidas).toBe(3);
    expect(component.ayudaUsada).toBeTrue();
    expect(baraja.estadoObjetos.vida.consumida).toBeTrue();
  });

  it('envía vidas y ayudas al guardar el nivel completado', () => {
    component.vidas = 2;
    component.ayudaUsada = true;
    (component as any).solucionesPorFase.set(1, 'evento(taladro.temperatura) {}');

    (component as any).finalizarNivel();

    expect(progreso.guardarProgreso).toHaveBeenCalledOnceWith(jasmine.objectContaining({
      reto_nivel_id: 2,
      vidas_restantes: 2,
      ayudas_usadas: true
    }));
  });

  it('desactiva los objetos de ayuda en cualquier actividad de aula', () => {
    (component as any).aplicarConfiguracionAula({
      parametros_evaluacion: { ayudas_habilitadas: true },
      fases_seleccionadas: [1, 2, 3]
    });

    expect(component.inventarioNivel.libro.activo).toBeFalse();
    expect(component.inventarioNivel.vida.activo).toBeFalse();
  });

  it('aplica al taladro los objetivos configurados por el profesor', () => {
    const configurarTaladro = jasmine.createSpy('configurarTaladro');
    (component as any).motor = { configurarTaladro };

    (component as any).aplicarConfiguracionAula({
      parametros_evaluacion: {
        fases_seleccionadas: [1, 2, 3],
        configuracion_nivel: {
          version: 1,
          nivel_id: 2,
          tipo: 'sensores_taladro',
          umbral_temperatura: 120,
          presion_objetivo: 60,
          profundidad_objetivo: 400
        }
      }
    });

    expect(component.umbralTemperatura).toBe(120);
    expect(component.presionObjetivo).toBe(60);
    expect(component.profundidadAgua).toBe(400);
    expect(component.fases[0].objetivo).toContain('120');
    expect(configurarTaladro).toHaveBeenCalledWith({
      umbralTemperatura: 120,
      presionObjetivo: 60,
      profundidadObjetivo: 400
    });
  });

  it('regresa al aula al terminar una actividad y al mapa en Aventura', () => {
    const navegar = spyOn((component as any).router, 'navigate').and.resolveTo(true);

    (component as any).esActividadAula = true;
    component.salir();
    expect(navegar).toHaveBeenCalledWith(['/pantalla-principal']);

    (component as any).esActividadAula = false;
    component.salir();
    expect(navegar).toHaveBeenCalledWith(['/aventura']);
  });
});
