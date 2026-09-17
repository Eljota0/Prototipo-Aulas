import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PerfilComponent } from './perfil.component';
import { apiInterceptor } from '../core/interceptors/api.interceptor';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { UserProfile, UserService } from '../services/user.service';
import { environment } from '../../environments/environment';

describe('Perfil: guardado real de nombres', () => {
  let fixture: ComponentFixture<PerfilComponent>;
  let component: PerfilComponent;
  let http: HttpTestingController;
  let user: UserService;
  let avisos: jasmine.SpyObj<NotificationService>;
  const url = `${environment.apiUrl.replace(/\/$/, '')}/usuarios/me`;
  const perfil: UserProfile = {
    id: 'jugador-de-prueba', nombre: 'José', apellido: 'Quinatoa',
    email: 'jugador@dragoncode.test', rol: 'jugador', estrellas_totales: 7
  };

  beforeEach(async () => {
    avisos = jasmine.createSpyObj<NotificationService>('NotificationService', ['show']);
    await TestBed.configureTestingModule({
      imports: [PerfilComponent],
      providers: [
        provideHttpClient(withInterceptors([apiInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { getToken: () => 'token-local-de-prueba' } },
        { provide: NotificationService, useValue: avisos }
      ]
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    user = TestBed.inject(UserService);
    user.updateProfileState(perfil);
    fixture = TestBed.createComponent(PerfilComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  async function editar(campo: 'nombre' | 'apellido', valor: string): Promise<void> {
    const title = campo === 'nombre' ? 'Editar Nombre' : 'Editar Apellido';
    fixture.nativeElement.querySelector(`[title="${title}"]`).click();
    fixture.detectChanges();
    await fixture.whenStable();
    const input: HTMLInputElement = fixture.nativeElement.querySelector(`[name="${campo}"]`);
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  it('envía solo el campo editado con sesión y muestra el resultado confirmado', async () => {
    await editar('nombre', '  José Andrés  ');
    fixture.nativeElement.querySelector('[title="Guardar"]').click();
    fixture.detectChanges();

    const request = http.expectOne(url);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ nombre: 'José Andrés' });
    expect(request.request.headers.get('Authorization')).toBe('Bearer token-local-de-prueba');
    expect(user.getCurrentProfile().nombre).toBe('José');
    expect(avisos.show).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain('Guardando');

    request.flush({ ...perfil, nombre: 'José Andrés' });
    fixture.detectChanges();
    expect(user.getCurrentProfile()).toEqual({ ...perfil, nombre: 'José Andrés' });
    expect(component.editingField).toBeNull();
    expect(component.guardandoPerfil).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('José Andrés');
    expect(avisos.show).toHaveBeenCalledOnceWith('Información actualizada exitosamente', 'success');
  });

  it('permite guardar el apellido con Enter sin enviar el resto del perfil', async () => {
    await editar('apellido', 'de la Peña');
    fixture.nativeElement.querySelector('.profile-form').dispatchEvent(new Event('submit', { cancelable: true }));
    const request = http.expectOne(url);
    expect(request.request.body).toEqual({ apellido: 'de la Peña' });
    request.flush({ ...perfil, apellido: 'de la Peña' });
    expect(user.getCurrentProfile().nombre).toBe('José');
    expect(user.getCurrentProfile().apellido).toBe('de la Peña');
  });

  it('bloquea envíos repetidos y cambios de campo o cierre mientras está guardando', async () => {
    const cerrar = spyOn(component.closeModal, 'emit');
    await editar('nombre', 'Nuevo nombre');
    component.saveField('nombre');
    fixture.detectChanges();
    const request = http.expectOne(url);
    expect(fixture.nativeElement.querySelector('[title="Guardar"]').disabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('[title="Editar Apellido"]').disabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('.close-btn').disabled).toBeTrue();
    component.saveField('nombre');
    component.toggleEdit('apellido');
    component.cancelEdit();
    component.onClose();
    component.goToPasswordView();
    http.expectNone(url);
    expect(component.editingField).toBe('nombre');
    expect(component.currentView).toBe('perfil');
    expect(cerrar).not.toHaveBeenCalled();
    request.flush({ ...perfil, nombre: 'Nuevo nombre' });
  });

  it('conserva el texto y el dato guardado si falla la red y permite reintentar', async () => {
    await editar('nombre', 'Mi nombre corregido');
    component.saveField('nombre');
    http.expectOne(url).error(new ProgressEvent('error'));
    fixture.detectChanges();
    expect(user.getCurrentProfile().nombre).toBe('José');
    expect(component.editingValue).toBe('Mi nombre corregido');
    expect(component.editingField).toBe('nombre');
    expect(component.guardandoPerfil).toBeFalse();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('conectar');
    expect(avisos.show).not.toHaveBeenCalled();

    component.saveField('nombre');
    http.expectOne(url).flush({ ...perfil, nombre: 'Mi nombre corregido' });
    expect(component.errorPerfil).toBe('');
    expect(user.getCurrentProfile().nombre).toBe('Mi nombre corregido');
  });

  for (const status of [401, 422, 500]) {
    it(`explica el error ${status} sin anunciar éxito ni mostrar avisos duplicados`, async () => {
      await editar('apellido', 'Corrección');
      component.saveField('apellido');
      http.expectOne(url).flush({ detail: [{ msg: 'Detalle técnico' }] }, { status, statusText: 'Error' });
      fixture.detectChanges();
      expect(component.errorPerfil).toBeTruthy();
      if (status === 401) expect(component.errorPerfil).toContain('sesión');
      expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
      expect(component.errorPerfil).not.toContain('[object Object]');
      expect(component.guardandoPerfil).toBeFalse();
      expect(component.editingValue).toBe('Corrección');
      expect(user.getCurrentProfile()).toEqual(perfil);
      expect(avisos.show).not.toHaveBeenCalled();
    });
  }

  it('rechaza datos vacíos o demasiado largos y permite corregirlos', () => {
    component.toggleEdit('nombre');
    for (const valor of ['   ', 'a'.repeat(101), 'Ana\nMaría']) {
      component.editingValue = valor;
      component.saveField('nombre');
      http.expectNone(url);
      expect(component.errorPerfil).toContain('entre 1 y 100');
    }
    component.editingValue = 'Nombre válido';
    component.saveField('nombre');
    http.expectOne(url).flush({ ...perfil, nombre: 'Nombre válido' });
    expect(component.errorPerfil).toBe('');
  });

  it('cancelar o guardar sin cambios no escribe en el servidor', async () => {
    await editar('apellido', 'No guardar');
    fixture.nativeElement.querySelector('[title="Cancelar"]').click();
    expect(component.editingField).toBeNull();
    expect(user.getCurrentProfile()).toEqual(perfil);
    component.toggleEdit('nombre');
    component.editingValue = '  José  ';
    component.saveField('nombre');
    http.expectNone(url);
    expect(component.editingField).toBeNull();
    expect(avisos.show).not.toHaveBeenCalled();
  });

  it('muestra el correo como identificador de cuenta sin una edición simulada', () => {
    fixture.detectChanges();
    http.expectNone(url);
    expect(fixture.nativeElement.querySelector('[title="Editar Correo"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain(perfil.email);
    expect(user.getCurrentProfile().email).toBe(perfil.email);
  });

  it('mantiene los avisos globales para las peticiones existentes', () => {
    user.fetchProfile().subscribe({ error: () => {} });
    http.expectOne(url).flush({ detail: 'Sesión inválida' }, { status: 401, statusText: 'Unauthorized' });
    expect(avisos.show).toHaveBeenCalledOnceWith('Sesión inválida', 'error');
  });

  it('cancela la escucha al destruirse el componente y no cambia el perfil en memoria', () => {
    component.toggleEdit('nombre');
    component.editingValue = 'Pendiente';
    component.saveField('nombre');
    const request = http.expectOne(url);
    fixture.destroy();
    expect(request.cancelled).toBeTrue();
    expect(user.getCurrentProfile()).toEqual(perfil);
    expect(avisos.show).not.toHaveBeenCalled();
  });
});
