import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConfiguracionNivelAula } from '../core/configuracion-niveles-aula';

// ── Interfaces que reflejan exactamente los schemas de FastAPI ─────

export interface AulaCreateRequest {
  nombre_aula: string;
}

export interface AulaResponse {
  id: string;
  nombre_aula: string;
  codigo_acceso: string;
  estado: 'activa' | 'archivada';
  fecha_creacion: string;
  anfitrion_id: string;
  total_jugadores?: number;
  actividades_pendientes?: boolean;
}

export interface UnirseAulaRequest {
  codigo_acceso: string;
}

export interface UnirseAulaResponse {
  mensaje: string;
  aula_id: string;
  nombre_aula: string;
}

export interface ParametrosEvaluacion {
  tiempo_3_estrellas: number;       // Segundos para 3 estrellas
  tiempo_2_estrellas: number;       // Segundos para 2 estrellas
  intentos_max_sin_penalidad: number; // Intentos sin penalidad
  anti_copia?: boolean;
  ayudas_habilitadas?: boolean;
  fases_seleccionadas?: number[];
  configuracion_nivel?: ConfiguracionNivelAula;
}

export interface RetoPersonalizadoCreate {
  reto_nivel_id: number;            // ID del nivel oficial reutilizado
  titulo: string;                   // Ej: "Evaluación Semana 3"
  recompensa_estrellas: number;
  parametros: ParametrosEvaluacion;
  fecha_limite?: string | null;
}

export interface RetoPersonalizadoResponse {
  id: string;
  aula_id: string;
  reto_nivel_id: number;
  titulo: string;
  estado: 'borrador' | 'publicado';
  tipo_reto: string;
  recompensa_estrellas: number;
  parametros_evaluacion: ParametrosEvaluacion;
  fecha_creacion: string;
  fecha_limite?: string | null;
  fecha_cierre?: string | null;
  completado: boolean;
}

export interface SeguimientoJugador {
  jugador_id: string;
  nombre: string;
  apellido: string;
  email: string;
  completado: boolean;
  estrellas_obtenidas: number;
  calificacion_numerica: number;
  intentos: number;
  tiempo_segundos: number;
  codigo_solucion?: string | null;
  fecha_completado?: string | null;
}

export interface SeguimientoActividad {
  reto_id: string;
  reto_nivel_id: number;
  titulo: string;
  estado: 'borrador' | 'publicado' | 'vencido' | 'cerrado';
  fecha_limite?: string | null;
  fecha_cierre?: string | null;
  total_jugadores: number;
  completados: number;
  pendientes: number;
  promedio_calificacion: number;
  jugadores: SeguimientoJugador[];
}

export interface ReporteAula {
  aula_id: string;
  nombre_aula: string;
  generado_en: string;
  actividades: SeguimientoActividad[];
}

// ─────────────────────────────────────────────────────────────────

@Injectable({
  providedIn: 'root'
})
export class AulasService {

  constructor(private http: HttpClient) {}

  /**
   * Crea un aula nueva (solo disponible para Anfitriones).
   * Retorna la respuesta completa incluyendo el código de acceso generado.
   */
  crearAula(datos: AulaCreateRequest): Observable<AulaResponse> {
    return this.http.post<AulaResponse>('/aulas/', datos);
  }

  /**
   * Une al jugador actual a un aula usando su código de acceso.
   */
  unirseAula(codigo: string): Observable<UnirseAulaResponse> {
    const body: UnirseAulaRequest = { codigo_acceso: codigo.toUpperCase().trim() };
    return this.http.post<UnirseAulaResponse>('/aulas/unirse', body);
  }

  /**
   * Obtiene las aulas del usuario actual.
   * - Si es Anfitrión: retorna las que creó.
   * - Si es Jugador: retorna las en las que está inscrito.
   */
  misAulas(): Observable<AulaResponse[]> {
    return this.http.get<AulaResponse[]>('/aulas/mis-aulas');
  }

  /**
   * Obtiene la lista de jugadores inscritos en un aula (solo para el Anfitrión dueño).
   */
  jugadoresDelAula(aulaId: string): Observable<any[]> {
    return this.http.get<any[]>(`/aulas/${aulaId}/jugadores`);
  }

  /**
   * Crea un reto personalizado en un aula reutilizando un nivel oficial.
   * El profesor configura la evaluación y los parámetros seguros del nivel.
   */
  crearRetoEnAula(aulaId: string, datos: RetoPersonalizadoCreate): Observable<RetoPersonalizadoResponse> {
    return this.http.post<RetoPersonalizadoResponse>(`/aulas/${aulaId}/retos`, datos);
  }

  /**
   * Obtiene los retos personalizados de un aula.
   */
  retosDelAula(aulaId: string): Observable<RetoPersonalizadoResponse[]> {
    return this.http.get<RetoPersonalizadoResponse[]>(`/aulas/${aulaId}/retos`);
  }

  seguimientoDelAula(aulaId: string): Observable<ReporteAula> {
    return this.http.get<ReporteAula>(`/aulas/${aulaId}/seguimiento`);
  }

  programarActividad(
    aulaId: string,
    retoId: string,
    fechaLimite: string | null
  ): Observable<RetoPersonalizadoResponse> {
    return this.http.patch<RetoPersonalizadoResponse>(
      `/aulas/${aulaId}/retos/${retoId}/programacion`,
      { fecha_limite: fechaLimite }
    );
  }

  cerrarActividad(aulaId: string, retoId: string): Observable<RetoPersonalizadoResponse> {
    return this.http.post<RetoPersonalizadoResponse>(
      `/aulas/${aulaId}/retos/${retoId}/cerrar`,
      {}
    );
  }

  /**
   * Elimina un aula (solo el anfitrión dueño puede hacerlo).
   */
  eliminarAula(aulaId: string): Observable<any> {
    return this.http.delete(`/aulas/${aulaId}`);
  }
}
