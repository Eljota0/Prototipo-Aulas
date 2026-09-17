import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// ── Interfaces que reflejan exactamente los schemas de FastAPI ─────

export interface GuardarProgresoRequest {
  reto_nivel_id: number;     // ID del nivel en la BD
  tiempo_segundos: number;   // Segundos totales del intento
  intentos: number;          // Número de intentos que tomó completarlo
  codigo_solucion: string;   // El código que escribió el jugador
  vidas_restantes: number;
  ayudas_usadas: boolean;
  aula_id?: string;          // Opcional: si el jugador está en un aula
  reto_personalizado_id?: string; // UUID del reto específico completado en el aula
}

export interface ProgresoResponse {
  mensaje: string;
  estrellas_obtenidas: number;
  estrellas_totales_usuario: number;
  es_primera_vez: boolean;
}

export interface ProgresoNivel {
  reto_nivel_id: number;
  nivel_orden?: number;
  completado: boolean;
  estrellas_obtenidas: number;
  intentos: number;
  tiempo_segundos: number;
  fecha_completado: string | null;
}

/**
 * Obtiene el número público del nivel. El ID queda reservado para relacionar
 * registros internos y puede no coincidir con el orden después de una migración.
 */
export function obtenerOrdenProgreso(progreso: ProgresoNivel): number {
  return progreso.nivel_orden ?? progreso.reto_nivel_id;
}

// ─────────────────────────────────────────────────────────────────

@Injectable({
  providedIn: 'root'
})
export class ProgresoService {

  constructor(private http: HttpClient) {}

  /**
   * Envía el resultado de un nivel completado al backend.
   * El servidor calculará las estrellas, actualizará el perfil y retornará el nuevo saldo.
   */
  guardarProgreso(datos: GuardarProgresoRequest): Observable<ProgresoResponse> {
    return this.http.post<ProgresoResponse>('/progreso/guardar', datos);
  }

  /**
   * Obtiene el historial de progreso del usuario en todos los niveles.
   * Útil para mostrar estrellas reales en el modal de la pantalla principal.
   */
  miProgreso(): Observable<ProgresoNivel[]> {
    return this.http.get<ProgresoNivel[]>('/progreso/mis-niveles');
  }
}
