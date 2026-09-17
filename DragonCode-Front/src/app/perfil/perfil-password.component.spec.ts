import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { PerfilComponent } from './perfil.component';
import { apiInterceptor } from '../core/interceptors/api.interceptor';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { UserService } from '../services/user.service';
import { environment } from '../../environments/environment';

describe('Perfil: cambio real de contraseña', () => {
  let fixture: ComponentFixture<PerfilComponent>;
  let component: PerfilComponent;
  let http: HttpTestingController;
  let user: UserService;
  let auth: AuthService;
  let avisos: jasmine.SpyObj<NotificationService>;
  let navegar: jasmine.Spy;
  const url = `${environment.apiUrl.replace(/\/$/, '')}/auth/password`;
  const anterior = 'AnteriorPrueba1!';
  const nueva = 'NuevaPrueba2026!';
  const perfil = { nombre: 'José', apellido: 'Peña', email: 'jugador@example.com', estrellas_totales: 7 };

  beforeEach(async () => {
    avisos = jasmine.createSpyObj<NotificationService>('NotificationService', ['show']);
    await TestBed.configureTestingModule({
      imports: [PerfilComponent],
      providers: [
        provideHttpClient(withInterceptors([apiInterceptor])), provideHttpClientTesting(), provideRouter([]),
        { provide: NotificationService, useValue: avisos }
      ]
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    user = TestBed.inject(UserService);
    auth = TestBed.inject(AuthService);
    navegar = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    localStorage.setItem('dragoncode_token', 'token-de-prueba');
    user.updateProfileState(perfil);
    fixture = TestBed.createComponent(PerfilComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem('dragoncode_token');
  });

  function preparar(): void {
    component.goToPasswordView();
    component.passwordData = { oldPass: anterior, newPass: nueva, confirmPass: nueva };
  }

  it('envía las claves por PATCH y solo cierra sesión tras la confirmación del servidor', async () => {
    fixture.nativeElement.querySelector('.change-password-btn').click();
    fixture.detectChanges();
    await fixture.whenStable();
    for (const [name, value] of Object.entries({ oldPass: anterior, newPass: nueva, confirmPass: nueva })) {
      const input: HTMLInputElement = fixture.nativeElement.querySelector(`[name="${name}"]`);
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.password-form').dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();
    const request = http.expectOne(url);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ password_actual: anterior, password_nueva: nueva });
    expect(request.request.headers.get('Authorization')).toBe('Bearer token-de-prueba');
    expect(auth.getToken()).toBe('token-de-prueba');
    expect(navegar).not.toHaveBeenCalled();
    expect(avisos.show).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain('Guardando contraseña');

    request.flush(null, { status: 204, statusText: 'No Content' });
    expect(auth.getToken()).toBeNull();
    expect(navegar).toHaveBeenCalledOnceWith(['/login']);
    expect(user.getCurrentProfile().email).toBe('cargando...');
    expect(component.passwordData).toEqual({ oldPass: '', newPass: '', confirmPass: '' });
    expect(component.guardandoPassword).toBeFalse();
    expect(avisos.show).toHaveBeenCalledOnceWith('Contraseña actualizada. Inicia sesión con tu nueva contraseña.', 'success');
  });

  it('bloquea botones, cierre y envíos duplicados durante el guardado', async () => {
    preparar();
    const cerrar = spyOn(component.closeModal, 'emit');
    component.confirmPasswordChange();
    const request = http.expectOne(url);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    for (const selector of ['.close-btn', '.save-btn', '.forgot-pass-btn', '[name="oldPass"]', '[name="newPass"]', '[name="confirmPass"]']) {
      expect(fixture.nativeElement.querySelector(selector).disabled).withContext(selector).toBeTrue();
    }
    component.confirmPasswordChange();
    component.onClose();
    component.goToProfileView();
    component.goToPasswordView();
    component.toggleEdit('nombre');
    component.sendRecoveryEmail();
    expect(component.currentView).toBe('password');
    expect(component.passwordData.newPass).toBe(nueva);
    expect(cerrar).not.toHaveBeenCalled();
    http.expectNone(url);
    request.flush(null, { status: 204, statusText: 'No Content' });
  });

  for (const status of [400, 401, 409, 422, 500]) {
    it(`muestra un error legible ${status} sin éxito ni cierre de sesión`, () => {
      preparar();
      component.confirmPasswordChange();
      http.expectOne(url).flush({ detail: [{ input: 'No mostrar información técnica' }] }, { status, statusText: 'Error' });
      fixture.detectChanges();
      expect(component.guardandoPassword).toBeFalse();
      expect(component.passwordData.oldPass).toBe('');
      expect(component.passwordData.newPass).toBe(nueva);
      expect(component.errorPasswordDetalle).toBeTruthy();
      expect(component.errorPasswordDetalle).not.toContain('[object Object]');
      expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
      expect(auth.getToken()).toBe('token-de-prueba');
      expect(user.getCurrentProfile()).toEqual(perfil);
      expect(navegar).not.toHaveBeenCalled();
      expect(avisos.show).not.toHaveBeenCalled();
    });
  }

  it('permite corregir la contraseña actual y reintentar', () => {
    preparar();
    component.confirmPasswordChange();
    http.expectOne(url).flush({}, { status: 400, statusText: 'Bad Request' });
    component.passwordData.oldPass = 'ActualCorregida1!';
    component.confirmPasswordChange();
    const request = http.expectOne(url);
    expect(request.request.body.password_actual).toBe('ActualCorregida1!');
    expect(component.errorPasswordDetalle).toBe('');
    request.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('informa del resultado incierto si falla la conexión y desbloquea el formulario', () => {
    preparar();
    component.confirmPasswordChange();
    http.expectOne(url).error(new ProgressEvent('error'));
    expect(component.guardandoPassword).toBeFalse();
    expect(component.errorPasswordDetalle).toContain('No se pudo confirmar');
    expect(component.errorPasswordDetalle).toContain('nueva contraseña');
    expect(avisos.show).not.toHaveBeenCalled();
    expect(navegar).not.toHaveBeenCalled();
  });

  it('limita la espera sin reintentar automáticamente una operación sensible', fakeAsync(() => {
    preparar();
    component.confirmPasswordChange();
    const request = http.expectOne(url);
    tick(20001);
    expect(request.cancelled).toBeTrue();
    expect(component.guardandoPassword).toBeFalse();
    expect(component.errorPasswordDetalle).toContain('No se pudo confirmar');
    http.expectNone(url);
    expect(navegar).not.toHaveBeenCalled();
  }));

  it('valida campos, requisitos, coincidencia y límites antes de enviar', () => {
    preparar();
    for (const [oldPass, newPass, confirmPass] of [
      ['', nueva, nueva], [anterior, '', ''], [anterior, 'Ab1!', 'Ab1!'],
      [anterior, 'abcdef1!', 'abcdef1!'], [anterior, 'Abcdef!!', 'Abcdef!!'],
      [anterior, 'Abcdef12', 'Abcdef12'], [anterior, nueva, 'distinta'],
      [anterior, anterior, anterior], [anterior, 'A1!' + 'a'.repeat(70), 'A1!' + 'a'.repeat(70)],
      [anterior, 'Á'.repeat(35) + 'A1!', 'Á'.repeat(35) + 'A1!'],
      [anterior, 'Nueva1!\n', 'Nueva1!\n']
    ]) {
      component.passwordData = { oldPass, newPass, confirmPass };
      component.confirmPasswordChange();
      http.expectNone(url);
      expect(component.guardandoPassword).toBeFalse();
    }
    expect(auth.getToken()).toBe('token-de-prueba');
    expect(navegar).not.toHaveBeenCalled();
  });

  it('no recorta espacios y admite Unicode dentro de los 72 bytes', () => {
    preparar();
    const clave = ' ' + 'Á'.repeat(33) + 'A1!' + '  ';
    component.passwordData.newPass = component.passwordData.confirmPass = clave;
    component.confirmPasswordChange();
    const request = http.expectOne(url);
    expect(request.request.body.password_nueva).toBe(clave);
    request.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('no conserva claves al cerrar o destruir el formulario', () => {
    preparar();
    component.mostrarNueva = true;
    component.onClose();
    expect(component.passwordData.newPass).toBe('');
    expect(component.mostrarNueva).toBeFalse();
    preparar();
    component.confirmPasswordChange();
    const request = http.expectOne(url);
    fixture.destroy();
    expect(request.cancelled).toBeTrue();
    expect(component.passwordData.oldPass).toBe('');
    expect(component.passwordData.newPass).toBe('');
    expect(avisos.show).not.toHaveBeenCalled();
    expect(navegar).not.toHaveBeenCalled();
  });

  it('indica que recuperación está pendiente y no anuncia un correo inexistente', () => {
    preparar();
    component.sendRecoveryEmail();
    expect(component.recoverySent).toBeFalse();
    expect(component.currentView).toBe('password');
    expect(component.errorPasswordDetalle).toContain('todavía no está disponible');
    expect(avisos.show).not.toHaveBeenCalled();
    http.expectNone(url);
  });
});
