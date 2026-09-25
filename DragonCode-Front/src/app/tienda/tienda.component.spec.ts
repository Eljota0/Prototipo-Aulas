import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';

import { TiendaComponent } from './tienda.component';
import { NotificationService } from '../services/notification.service';
import { UserService } from '../services/user.service';

describe('TiendaComponent', () => {
  let component: TiendaComponent;
  let fixture: ComponentFixture<TiendaComponent>;
  let userService: jasmine.SpyObj<UserService>;

  beforeEach(async () => {
    userService = jasmine.createSpyObj<UserService>(
      'UserService',
      ['getProfile', 'getAvatares', 'comprarAvatar', 'equiparAvatar', 'updateProfileState']
    );
    userService.getProfile.and.returnValue(of({
      nombre: 'Jugador',
      apellido: '',
      email: 'jugador@dragoncode.local',
      estrellas_totales: 0
    }));
    userService.getAvatares.and.returnValue(of([
      { id: 42, nombre_skin: 'Drako Base', url_imagen: 'assets/images/tienda/avatares/drakobase.png', precio_estrellas: 0, activo: true, desbloqueado: true },
      { id: 81, nombre_skin: 'Drako Aprendiz', url_imagen: 'assets/images/tienda/avatares/drakoaprendiz.png', precio_estrellas: 3, activo: true, desbloqueado: false }
    ]));
    userService.comprarAvatar.and.returnValue(of({ estrellas_restantes: 1 }));
    userService.equiparAvatar.and.returnValue(of({ avatar_id: 81 }));

    await TestBed.configureTestingModule({
      imports: [TiendaComponent],
      providers: [
        { provide: UserService, useValue: userService },
        {
          provide: NotificationService,
          useValue: { show: jasmine.createSpy('show') }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TiendaComponent);
    component = fixture.componentInstance;
    component.avatarActual = 'assets/images/tienda/avatares/drakobase.png';
    fixture.detectChanges();
  });

  it('muestra precios, propiedad e identificadores del servidor conservando el arte', () => {
    const tarjetas = fixture.nativeElement.querySelectorAll('.avatar-card');

    expect(component.avatars.map(a => a.id)).toEqual([42, 81]);
    expect(tarjetas.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Draco Base');
    expect(component.avatars[1].descripcion).toContain('conocimientos');
    expect(fixture.nativeElement.textContent).not.toContain('/ 30');
    expect(userService.getAvatares).toHaveBeenCalledTimes(1);
  });

  it('no compra hasta confirmar y espera al servidor para anunciar equipamiento', () => {
    const equipo = new Subject<any>();
    userService.equiparAvatar.and.returnValue(equipo);
    const cambio = spyOn(component.avatarChanged, 'emit');
    component.selectAvatar(component.avatars[1]);

    expect(userService.comprarAvatar).not.toHaveBeenCalled();
    expect(userService.equiparAvatar).not.toHaveBeenCalled();
    component.confirmPurchase();
    expect(userService.comprarAvatar).toHaveBeenCalledOnceWith(81);
    expect(userService.updateProfileState).toHaveBeenCalledOnceWith({ estrellas_totales: 1 });
    expect(userService.equiparAvatar).toHaveBeenCalledOnceWith(81);
    expect(cambio).not.toHaveBeenCalled();
    equipo.next({ avatar_id: 81 });
    equipo.complete();
    expect(userService.updateProfileState).toHaveBeenCalledWith({ avatar_actual_id: 81 });
    expect(cambio).toHaveBeenCalledOnceWith(component.avatars[1].url_imagen);
  });

  it('describe las siete skins nuevas y conserva el precio e ID del servidor', () => {
    const archivos = ['graduado', 'karate', 'payaso', 'sacerdote', 'samurai', 'superheroe', 'vaquero'];
    userService.getAvatares.and.returnValue(of(archivos.map((archivo, i) => ({
      id: 100 + i, nombre_skin: 'Drako ' + archivo,
      url_imagen: `assets/images/tienda/avatares/nuevas_skins/drako${archivo}.png`,
      precio_estrellas: 3, activo: true, desbloqueado: false
    }))));
    component.cargarCatalogo();
    expect(component.avatars.length).toBe(7);
    component.avatars.forEach((avatar, i) => {
      expect(avatar.id).toBe(100 + i);
      expect(avatar.nombre_skin.startsWith('Draco ')).toBeTrue();
      expect(avatar.precio_estrellas).toBe(3);
      expect(avatar.descripcion!.length).toBeGreaterThan(20);
    });
  });

  it('doble clic o cerrar durante compra no duplica ni pierde la operación', () => {
    const compra = new Subject<any>();
    userService.comprarAvatar.and.returnValue(compra);
    const cerrar = spyOn(component.closeModal, 'emit');
    component.selectAvatar(component.avatars[1]);
    component.confirmPurchase();
    component.confirmPurchase();
    component.cancelPurchase();
    component.onClose();
    expect(userService.comprarAvatar).toHaveBeenCalledTimes(1);
    expect(component.avatarToBuy?.id).toBe(81);
    expect(cerrar).not.toHaveBeenCalled();
    compra.complete();
  });

  it('saldo insuficiente no cambia el perfil ni equipa el avatar', () => {
    userService.comprarAvatar.and.returnValue(throwError(() => ({ error: { detail: 'Estrellas insuficientes' } })));
    component.selectAvatar(component.avatars[1]);
    component.confirmPurchase();
    expect(userService.equiparAvatar).not.toHaveBeenCalled();
    expect(userService.updateProfileState).not.toHaveBeenCalled();
    expect(component.avatars[1].desbloqueado).toBeFalse();
    expect(component.cargandoCompra).toBeFalse();
  });

  it('si falla equipar conserva la compra y reintenta sin volver a cobrar', () => {
    userService.equiparAvatar.and.returnValue(throwError(() => new Error('sin conexión')));
    const cambio = spyOn(component.avatarChanged, 'emit');
    component.selectAvatar(component.avatars[1]);
    component.confirmPurchase();
    expect(component.avatars[1].desbloqueado).toBeTrue();
    expect(cambio).not.toHaveBeenCalled();
    userService.equiparAvatar.and.returnValue(of({ avatar_id: 81 }));
    component.selectAvatar(component.avatars[1]);
    expect(userService.comprarAvatar).toHaveBeenCalledTimes(1);
    expect(cambio).toHaveBeenCalledOnceWith(component.avatars[1].url_imagen);
  });

  it('equipa el avatar gratuito sin compra', () => {
    component.avatarActual = component.avatars[1].url_imagen;
    component.selectAvatar(component.avatars[0]);
    expect(userService.equiparAvatar).toHaveBeenCalledOnceWith(42);
    expect(userService.comprarAvatar).not.toHaveBeenCalled();
  });

  it('permite reintentar el catálogo sin presentar compras ficticias', () => {
    const catalogo = component.avatars;
    userService.getAvatares.and.returnValue(throwError(() => new Error('sin conexión')));
    component.avatars = [];
    component.cargarCatalogo();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Reintentar');
    expect(fixture.nativeElement.querySelectorAll('.avatar-card').length).toBe(0);
    userService.getAvatares.and.returnValue(of(catalogo));
    component.cargarCatalogo();
    expect(component.errorCatalogo).toBeFalse();
    expect(component.avatars.length).toBe(2);
  });
});
