import { HttpInterceptorFn, HttpErrorResponse, HttpContextToken } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NotificationService } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';

// Los formularios con error propio pueden evitar un segundo aviso global.
export const ERROR_GESTIONADO_EN_FORMULARIO = new HttpContextToken<boolean>(() => false);

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const notificationService = inject(NotificationService);
  const authService = inject(AuthService);
  
  // BYPASS: Las peticiones a assets locales NO deben pasar por el prefijo de la API
  const isLocalAsset = req.url.startsWith('/assets/') || req.url.startsWith('assets/');
  const isAbsoluteUrl = req.url.startsWith('http');
  
  let apiReq = req;
  if (!isAbsoluteUrl && !isLocalAsset) {
    const baseUrl = environment.apiUrl.endsWith('/') ? environment.apiUrl.slice(0, -1) : environment.apiUrl;
    const path = req.url.startsWith('/') ? req.url : `/${req.url}`;
    
    // Inyectar el JWT en la cabecera Authorization si existe
    const token = authService.getToken();
    const headers = token
      ? req.headers.set('Authorization', `Bearer ${token}`)
      : req.headers;
    
    apiReq = req.clone({ url: `${baseUrl}${path}`, headers });
  }

  return next(apiReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (req.context.get(ERROR_GESTIONADO_EN_FORMULARIO)) {
        return throwError(() => error);
      }
      let errorMsg = 'No se pudo completar la solicitud. Inténtalo nuevamente.';
      
      if (error.error && typeof error.error === 'object' && error.error.detail) {
        // En FastAPI el formato por defecto de error es { "detail": "Mensaje" }
        errorMsg = error.error.detail;
      } else if (error.status === 0) {
        errorMsg = 'No se pudo conectar con el servidor. Verifica tu conexión e inténtalo nuevamente.';
      } else if (error.status >= 500) {
        errorMsg = 'El servidor no pudo completar la solicitud. Inténtalo nuevamente en unos momentos.';
      }

      notificationService.show(errorMsg, 'error');
      
      return throwError(() => error);
    })
  );
};
