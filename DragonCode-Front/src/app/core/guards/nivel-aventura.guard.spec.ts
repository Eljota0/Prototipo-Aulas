import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  GuardResult,
  MaybeAsync,
  Router,
  RouterStateSnapshot,
  UrlTree,
  convertToParamMap,
  provideRouter
} from '@angular/router';
import { isObservable, firstValueFrom, of, throwError } from 'rxjs';

import { nivelAventuraGuard } from './nivel-aventura.guard';
import { AulasService, RetoPersonalizadoResponse } from '../../services/aulas.service';
import { ProgresoService } from '../../services/progreso.service';

describe('nivelAventuraGuard', () => {
  let progresoService: jasmine.SpyObj<ProgresoService>;
  let aulasService: jasmine.SpyObj<AulasService>;
  let router: Router;

  beforeEach(() => {
    progresoService = jasmine.createSpyObj<ProgresoService>('ProgresoService', ['miProgreso']);
    aulasService = jasmine.createSpyObj<AulasService>('AulasService', ['retosDelAula']);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ProgresoService, useValue: progresoService },
        { provide: AulasService, useValue: aulasService }
      ]
    });
    router = TestBed.inject(Router);
    localStorage.clear();
  });

  afterEach(() => localStorage.clear());

  it('permite comenzar el Nivel 1 sin consultar progreso', async () => {
    expect(await ejecutarGuard(1)).toBeTrue();
    expect(progresoService.miProgreso).not.toHaveBeenCalled();
  });

  it('permite el siguiente nivel y bloquea saltarse niveles por URL', async () => {
    progresoService.miProgreso.and.returnValue(of([{
      reto_nivel_id: 42,
      nivel_orden: 2,
      completado: true,
      estrellas_obtenidas: 2,
      intentos: 2,
      tiempo_segundos: 80,
      fecha_completado: '2026-09-09T20:00:00Z'
    }]));
    expect(await ejecutarGuard(3)).toBeTrue();

    progresoService.miProgreso.and.returnValue(of([]));
    const bloqueado = await ejecutarGuard(4);
    expect(bloqueado instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(bloqueado as UrlTree)).toBe('/aventura');
  });

  it('permite repetir cada nivel completado y abrir inmediatamente el siguiente', async () => {
    for (const nivelCompletado of [1, 2, 3, 4]) {
      progresoService.miProgreso.and.returnValue(of([{
        reto_nivel_id: 100 + nivelCompletado,
        nivel_orden: nivelCompletado,
        completado: true,
        estrellas_obtenidas: 3,
        intentos: 1,
        tiempo_segundos: 60,
        fecha_completado: '2026-09-17T20:00:00Z'
      }]));

      expect(await ejecutarGuard(nivelCompletado)).toBeTrue();
      expect(await ejecutarGuard(nivelCompletado + 1)).toBeTrue();
    }
  });

  it('permite una actividad válida del Nivel 5 sin consultar Aventura', async () => {
    const actividad = actividadAula({ reto_nivel_id: 5 });
    aulasService.retosDelAula.and.returnValue(of([actividad]));

    expect(await ejecutarGuard(5, { aula: actividad.aula_id, actividad: actividad.id })).toBeTrue();
    expect(progresoService.miProgreso).not.toHaveBeenCalled();
    expect(localStorage.getItem('aulaActiva')).toBe(actividad.aula_id);
    expect(localStorage.getItem('retoActivo')).toBe(actividad.id);
  });

  it('rechaza un contexto de aula manipulado o inaccesible', async () => {
    localStorage.setItem('aulaActiva', 'anterior');
    localStorage.setItem('retoActivo', 'anterior');
    aulasService.retosDelAula.and.returnValue(throwError(() => new Error('sin acceso')));

    const resultado = await ejecutarGuard(5, { aula: 'aula-ajena', actividad: 'reto-ajeno' });
    expect(resultado instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(resultado as UrlTree)).toBe('/pantalla-principal');
    expect(localStorage.getItem('aulaActiva')).toBeNull();
    expect(localStorage.getItem('retoActivo')).toBeNull();
  });

  function ejecutarGuard(
    nivelId: number,
    query: Record<string, string> = {}
  ): Promise<GuardResult> {
    const route = {
      data: { nivelId },
      queryParamMap: convertToParamMap(query)
    } as unknown as ActivatedRouteSnapshot;
    const resultado = TestBed.runInInjectionContext(() =>
      (nivelAventuraGuard as CanActivateFn)(route, {} as RouterStateSnapshot)
    );
    return resolver(resultado);
  }
});

function resolver(resultado: MaybeAsync<GuardResult>): Promise<GuardResult> {
  if (isObservable(resultado)) return firstValueFrom(resultado);
  if (resultado instanceof Promise) return resultado;
  return Promise.resolve(resultado);
}

function actividadAula(
  cambios: Partial<RetoPersonalizadoResponse> = {}
): RetoPersonalizadoResponse {
  return {
    id: 'actividad-5',
    aula_id: 'aula-1',
    reto_nivel_id: 5,
    titulo: 'Producción en masa',
    estado: 'publicado',
    tipo_reto: 'bucles',
    recompensa_estrellas: 3,
    parametros_evaluacion: {
      tiempo_3_estrellas: 60,
      tiempo_2_estrellas: 120,
      intentos_max_sin_penalidad: 2,
      fases_seleccionadas: [1, 2, 3, 4]
    },
    fecha_creacion: '2026-09-09T20:00:00Z',
    fecha_limite: null,
    fecha_cierre: null,
    completado: false,
    ...cambios
  };
}
