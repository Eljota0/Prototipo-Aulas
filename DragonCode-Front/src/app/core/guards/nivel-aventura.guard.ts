import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Observable, catchError, map, of } from 'rxjs';

import { AulasService, RetoPersonalizadoResponse } from '../../services/aulas.service';
import { obtenerOrdenProgreso, ProgresoService } from '../../services/progreso.service';
import { TOTAL_NIVELES } from '../catalogo-niveles';

type ResultadoAcceso = boolean | UrlTree;

/**
 * Separa los dos caminos que comparten la pantalla de un nivel:
 * - Aventura exige haber completado el nivel anterior.
 * - Aula exige una actividad real, vigente y accesible para el usuario.
 */
export const nivelAventuraGuard: CanActivateFn = (route): ResultadoAcceso | Observable<ResultadoAcceso> => {
  const router = inject(Router);
  const progresoService = inject(ProgresoService);
  const aulasService = inject(AulasService);
  const nivelId = Number(route.data['nivelId']);
  const aulaId = route.queryParamMap.get('aula');
  const actividadId = route.queryParamMap.get('actividad');

  const limpiarContextoAula = (): void => {
    localStorage.removeItem('aulaActiva');
    localStorage.removeItem('retoActivo');
  };

  if (!Number.isInteger(nivelId) || nivelId < 1 || nivelId > TOTAL_NIVELES) {
    limpiarContextoAula();
    return router.createUrlTree(['/aventura']);
  }

  // La presencia de ambos parámetros identifica un acceso desde Aulas. No se
  // confía únicamente en localStorage: la API comprueba inscripción/propiedad.
  if (aulaId || actividadId) {
    if (!aulaId || !actividadId) {
      limpiarContextoAula();
      return router.createUrlTree(['/pantalla-principal']);
    }

    return aulasService.retosDelAula(aulaId).pipe(
      map(retos => {
        const actividad = retos.find(reto => reto.id === actividadId);
        if (!actividadValida(actividad, nivelId)) {
          limpiarContextoAula();
          return router.createUrlTree(['/pantalla-principal']);
        }

        localStorage.setItem('aulaActiva', aulaId);
        localStorage.setItem('retoActivo', actividadId);
        return true;
      }),
      catchError(() => {
        limpiarContextoAula();
        return of(router.createUrlTree(['/pantalla-principal']));
      })
    );
  }

  limpiarContextoAula();
  if (nivelId === 1) return true;

  return progresoService.miProgreso().pipe(
    map(progresos => {
      const completados = new Set(
        progresos
          .filter(progreso => progreso.completado)
          .map(obtenerOrdenProgreso)
      );
      const disponible = completados.has(nivelId) || completados.has(nivelId - 1);
      return disponible ? true : router.createUrlTree(['/aventura']);
    }),
    catchError(() => of(router.createUrlTree(['/aventura'])))
  );
};

function actividadValida(
  actividad: RetoPersonalizadoResponse | undefined,
  nivelId: number
): actividad is RetoPersonalizadoResponse {
  if (!actividad || actividad.reto_nivel_id !== nivelId) return false;
  if (actividad.estado !== 'publicado' || actividad.fecha_cierre) return false;
  if (!actividad.fecha_limite) return true;
  const limite = new Date(actividad.fecha_limite).getTime();
  return Number.isFinite(limite) && limite > Date.now();
}
