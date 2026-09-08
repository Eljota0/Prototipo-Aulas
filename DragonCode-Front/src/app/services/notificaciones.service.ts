import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface NotificacionInterna {
  id: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  fecha_creacion: string;
}

@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  constructor(private http: HttpClient) {}

  misNotificaciones(): Observable<NotificacionInterna[]> {
    return this.http.get<NotificacionInterna[]>('/notificaciones/');
  }

  marcarTodasComoLeidas(): Observable<{ notificaciones_actualizadas: number }> {
    return this.http.patch<{ notificaciones_actualizadas: number }>(
      '/notificaciones/leer-todas',
      {}
    );
  }

  marcarComoLeida(id: string): Observable<NotificacionInterna> {
    return this.http.patch<NotificacionInterna>(`/notificaciones/${id}/leer`, {});
  }
}
