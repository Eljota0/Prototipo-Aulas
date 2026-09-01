import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

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

  it('muestra los seis personajes desde el catálogo local', () => {
    const tarjetas = fixture.nativeElement.querySelectorAll('.avatar-card');

    expect(component.catalogoSoloVisual).toBeTrue();
    expect(component.avatars.length).toBe(6);
    expect(component.totalEstrellasCatalogo).toBe(30);
    expect(tarjetas.length).toBe(6);
    expect(fixture.nativeElement.textContent).toContain('Drako Base');
    expect(fixture.nativeElement.textContent).toContain('Drako Mbappé');
    expect(userService.getAvatares).not.toHaveBeenCalled();
  });

  it('no intenta comprar ni equipar mientras la tienda sea solo visual', () => {
    component.selectAvatar(component.avatars[1]);

    expect(userService.comprarAvatar).not.toHaveBeenCalled();
    expect(userService.equiparAvatar).not.toHaveBeenCalled();
  });
});
