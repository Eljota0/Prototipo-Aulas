import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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
  fases_seleccionadas?: number[];
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
   * El profesor configura solo los parámetros de evaluación (tiempos, intentos).
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

  /**
   * Elimina un aula (solo el anfitrión dueño puede hacerlo).
   */
  eliminarAula(aulaId: string): Observable<any> {
    return this.http.delete(`/aulas/${aulaId}`);
  }
}
