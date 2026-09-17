import { Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { ERROR_GESTIONADO_EN_FORMULARIO } from '../core/interceptors/api.interceptor';

export interface ActualizarPerfilRequest {
  nombre?: string;
  apellido?: string;
}

export interface CambiarPasswordRequest {
  password_actual: string;
  password_nueva: string;
}

export interface UserProfile {
  id?: string;
  nombre: string;
  apellido: string;
  email: string; // Coincide con PerfilResponse de FastAPI
  rol?: string;
  estrellas_totales: number;
  avatar_actual_id?: number;
  fecha_registro?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  // Estado inicial por defecto (se sobreescribirá cuando llegue la data del server)
  private readonly initialState: UserProfile = {
    nombre: 'Jugador',
    apellido: '',
    email: 'cargando...',
    estrellas_totales: 0
  };

  // BehaviorSubject almacena el estado actual y lo emite a los nuevos suscriptores
  private userProfileSubject = new BehaviorSubject<UserProfile>(this.initialState);

  constructor(private http: HttpClient) {}

  /**
   * Obtiene el Observable del perfil del usuario para consumirlo reactivamente
   */
  getProfile(): Observable<UserProfile> {
    return this.userProfileSubject.asObservable();
  }

  /**
   * Obtiene el valor actual síncrono del perfil
   */
  getCurrentProfile(): UserProfile {
    return this.userProfileSubject.getValue();
  }

  /**
   * Llama al backend para obtener el perfil real del usuario y actualiza el estado.
   * Debes llamar a este método cuando inicias sesión o entras a la pantalla principal.
   */
  fetchProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>('/usuarios/me').pipe(
      tap((perfilServer) => {
        // Actualizamos la fuente de verdad con los datos reales de la BD
        this.userProfileSubject.next(perfilServer);
      })
    );
  }

  /** Guarda los nombres y publica el perfil confirmado por el servidor. */
  actualizarPerfil(datos: ActualizarPerfilRequest): Observable<UserProfile> {
    return this.http.patch<UserProfile>('/usuarios/me', datos, {
      context: new HttpContext().set(ERROR_GESTIONADO_EN_FORMULARIO, true)
    }).pipe(
      tap(perfil => this.userProfileSubject.next(perfil))
    );
  }

  cambiarPassword(datos: CambiarPasswordRequest): Observable<void> {
    return this.http.patch<void>('/auth/password', datos, {
      context: new HttpContext().set(ERROR_GESTIONADO_EN_FORMULARIO, true)
    });
  }

  limpiarPerfil(): void {
    this.userProfileSubject.next(this.initialState);
  }

  /** Actualiza solo la copia en memoria; no persiste cambios en el servidor. */
  updateProfileState(newData: Partial<UserProfile>): void {
    const currentData = this.userProfileSubject.getValue();
    const updatedData = { ...currentData, ...newData };
    this.userProfileSubject.next(updatedData);
  }

  // ── RUTAS DE LA TIENDA DE AVATARES ────────────────────────────────
  
  getAvatares(): Observable<any[]> {
    return this.http.get<any[]>('/usuarios/avatares');
  }

  comprarAvatar(avatarId: number): Observable<any> {
    return this.http.post<any>(`/usuarios/avatares/${avatarId}/comprar`, {});
  }

  equiparAvatar(avatarId: number): Observable<any> {
    return this.http.patch<any>('/usuarios/avatares/equipar', { avatar_id: avatarId });
  }
}
