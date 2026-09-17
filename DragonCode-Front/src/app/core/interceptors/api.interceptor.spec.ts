import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { NotificationService } from '../../services/notification.service';
import { apiInterceptor } from './api.interceptor';

describe('apiInterceptor', () => {
  let httpClient: HttpClient;
  let httpTesting: HttpTestingController;
  let avisos: jasmine.SpyObj<NotificationService>;
  const apiUrl = environment.apiUrl.replace(/\/$/, '');

  beforeEach(() => {
    avisos = jasmine.createSpyObj<NotificationService>('NotificationService', ['show']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: NotificationService, useValue: avisos }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
    localStorage.removeItem('dragoncode_token');
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.removeItem('dragoncode_token');
  });

  it('muestra un mensaje comprensible cuando no puede conectarse con la API', () => {
    httpClient.get('/comprobacion').subscribe({ error: () => undefined });

    const request = httpTesting.expectOne(`${apiUrl}/comprobacion`);
    request.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });

    expect(avisos.show).toHaveBeenCalledOnceWith(
      'No se pudo conectar con el servidor. Verifica tu conexión e inténtalo nuevamente.',
      'error'
    );
    expect(avisos.show.calls.mostRecent().args[0]).not.toContain('Http failure response');
  });

  it('no expone el mensaje técnico de Angular cuando el servidor responde con error 500', () => {
    httpClient.post('/auth/login', {}).subscribe({ error: () => undefined });

    const request = httpTesting.expectOne(`${apiUrl}/auth/login`);
    request.flush('Proxy connection failed', { status: 500, statusText: 'Internal Server Error' });

    expect(avisos.show).toHaveBeenCalledOnceWith(
      'El servidor no pudo completar la solicitud. Inténtalo nuevamente en unos momentos.',
      'error'
    );
    expect(avisos.show.calls.mostRecent().args[0]).not.toContain('Http failure response');
  });

  it('conserva los mensajes funcionales enviados por el backend', () => {
    httpClient.post('/auth/login', {}).subscribe({ error: () => undefined });

    const request = httpTesting.expectOne(`${apiUrl}/auth/login`);
    request.flush(
      { detail: 'Correo electrónico o contraseña incorrectos' },
      { status: 401, statusText: 'Unauthorized' }
    );

    expect(avisos.show).toHaveBeenCalledOnceWith(
      'Correo electrónico o contraseña incorrectos',
      'error'
    );
  });
});
