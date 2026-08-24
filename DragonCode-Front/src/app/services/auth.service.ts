import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'dragoncode_token';

  constructor(private http: HttpClient, private router: Router) {}

  /**
   * Inicia sesión con email y contraseña. Guarda el JWT automáticamente.
   */
  login(payload: LoginPayload): Observable<TokenResponse> {
    return this.http.post<TokenResponse>('/auth/login', payload).pipe(
      tap(response => {
        localStorage.setItem(this.TOKEN_KEY, response.access_token);
      })
    );
  }

  /**
   * Registra un nuevo usuario en el backend.
   */
  register(payload: RegisterPayload): Observable<any> {
    return this.http.post<any>('/auth/register', payload);
  }

  /**
   * Cierra la sesión del usuario eliminando el token y redirigiendo al login.
   */
  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this.router.navigate(['/login']);
  }

  /**
   * Obtiene el token JWT guardado.
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Verifica si hay una sesión activa (token presente).
   */
  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  /**
   * Decodifica el payload del JWT para obtener el rol y el email del usuario.
   */
  getPayload(): { sub: string; id: number; rol: string } | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      const base64Payload = token.split('.')[1];
      return JSON.parse(atob(base64Payload));
    } catch {
      return null;
    }
  }

  getRol(): string | null {
    return this.getPayload()?.rol ?? null;
  }
}
