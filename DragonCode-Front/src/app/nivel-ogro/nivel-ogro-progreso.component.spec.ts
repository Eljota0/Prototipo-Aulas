import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { NivelOgroComponent } from './nivel-ogro.component';
import { ProgresoResponse, ProgresoService } from '../services/progreso.service';
import { NotificationService } from '../services/notification.service';

describe('NivelOgroComponent: confirmación de entrega', () => {
  let component: NivelOgroComponent;
  let progreso: jasmine.SpyObj<ProgresoService>;
  let notificaciones: jasmine.SpyObj<NotificationService>;
  let aulaAnterior: string | null;
  const respuesta: ProgresoResponse = {
    mensaje: 'Progreso guardado', estrellas_obtenidas: 3,
    estrellas_totales_usuario: 3, es_primera_vez: true
  };
  const aulaId = '57937d02-4d50-48c8-9f02-e83422c40a5a';
  const retoId = 'e9056ee9-9099-43d0-a719-432e78044e65';

  beforeEach(async () => {
    aulaAnterior = localStorage.getItem('aulaActiva');
    localStorage.setItem('aulaActiva', aulaId);
    progreso = jasmine.createSpyObj<ProgresoService>('ProgresoService', ['guardarProgreso']);
    notificaciones = jasmine.createSpyObj<NotificationService>('NotificationService', ['show']);
    progreso.guardarProgreso.and.returnValue(of(respuesta));
    await TestBed.configureTestingModule({
      imports: [NivelOgroComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: ProgresoService, useValue: progreso },
        { provide: NotificationService, useValue: notificaciones }]
    }).compileComponents();
    component = TestBed.createComponent(NivelOgroComponent).componentInstance;
    // Aislar la llegada a la meta: no ejecutar tutoriales, cargar assets ni cambiar el escenario.
    spyOn((component as any).cdr, 'detectChanges');
    spyOn(component, 'moverOgroUnPaso').and.resolveTo(false);
    component.ogro = { x: 0, y: 0, direccion: 'abajo', estado: 'idle', frameActual: 1 };
    component.tablero = [[{
      x: 0, y: 0, zona: 'inferior', terreno: 'meta-ogro', objeto: 'ninguno',
      rotacionTerreno: 0, estadoAnimacion: 'normal'
    }]];
    component.colaComandos = ['abajo'];
    component.esModoProfesor = false;
    (component as any).retoActualId = retoId;
  });

  afterEach(() => {
    if (aulaAnterior === null) localStorage.removeItem('aulaActiva');
    else localStorage.setItem('aulaActiva', aulaAnterior);
  });

  it('envía la actividad y solo confirma el guardado al recibir la respuesta', async () => {
    const pendiente = new Subject<ProgresoResponse>();
    progreso.guardarProgreso.and.returnValue(pendiente);
    component.ayudasUsadas = true;
    await component.procesarColaComandos();
    expect(progreso.guardarProgreso).toHaveBeenCalledOnceWith(jasmine.objectContaining({
      aula_id: aulaId, reto_personalizado_id: retoId, reto_nivel_id: 1,
      vidas_restantes: 3, ayudas_usadas: false
    }));
    expect(component.pantallaNivelCompletado).toBeFalse();
    expect(localStorage.getItem('aulaActiva')).toBe(aulaId);
    pendiente.next(respuesta);
    pendiente.complete();
    expect(component.pantallaNivelCompletado).toBeTrue();
    expect(component.mensajePuntaje).toContain('3 estrellas');
    expect(component.estrellasObtenidasEmoji).toBe('⭐⭐⭐');
    expect(component.arrayEstrellas.length).toBe(3);
    expect(localStorage.getItem('aulaActiva')).toBeNull();
  });

  for (const status of [0, 409]) {
    it(`no anuncia un guardado exitoso ni pierde el aula ante un error ${status}`, async () => {
      progreso.guardarProgreso.and.returnValue(throwError(() => ({ status })));
      await component.procesarColaComandos();
      expect(component.mensajePuntaje).toContain('no se confirmó el guardado');
      expect(notificaciones.show).toHaveBeenCalledOnceWith(component.mensajePuntaje, 'error');
      expect(component.estrellasObtenidasEmoji).toBe('');
      expect(localStorage.getItem('aulaActiva')).toBe(aulaId);
      // Se conserva el final visual del recorrido sin afirmar que la entrega se guardó.
      expect(component.pantallaNivelCompletado).toBeTrue();
      expect(component.estrellasFinales).toBe(0);
      expect(component.arrayEstrellas).toEqual([]);
    });
  }

  for (const estrellas of [1, 2, 3]) {
    it(`muestra ${estrellas} estrellas confirmadas sin recalcular por cofres ni ayudas`, async () => {
      component.ayudasUsadas = true;
      component.cofresRecolectados = 0;
      progreso.guardarProgreso.and.returnValue(of({
        ...respuesta, estrellas_obtenidas: estrellas, estrellas_totales_usuario: 9,
        es_primera_vez: false
      }));
      await component.procesarColaComandos();
      expect(component.estrellasFinales).toBe(estrellas);
      expect(component.arrayEstrellas.length).toBe(estrellas);
      expect(component.estrellasObtenidasEmoji).toBe('⭐'.repeat(estrellas));
      expect(component.mensajePuntaje).toBe(
        `Este intento: ${estrellas} ${estrellas === 1 ? 'estrella' : 'estrellas'} de 3. La actividad no añade saldo a la tienda.`
      );
      expect(component.mensajePuntaje).not.toContain('Mejor puntaje actualizado');
    });
  }

  it('no confunde una estrella del intento con tres acumuladas previamente', async () => {
    component.cofresRecolectados = component.totalCofresNivel;
    component.ayudasUsadas = false;
    progreso.guardarProgreso.and.returnValue(of({
      ...respuesta, estrellas_obtenidas: 1, es_primera_vez: false
    }));
    await component.procesarColaComandos();
    expect(component.arrayEstrellas.length).toBe(1);
    expect(component.mensajePuntaje).toBe('Este intento: 1 estrella de 3. La actividad no añade saldo a la tienda.');
  });

  it('no adjunta un identificador de actividad antiguo en modo aventura', async () => {
    localStorage.removeItem('aulaActiva');
    await component.procesarColaComandos();
    expect(progreso.guardarProgreso.calls.mostRecent().args[0].aula_id).toBeUndefined();
    expect(progreso.guardarProgreso.calls.mostRecent().args[0].reto_personalizado_id).toBeUndefined();
    expect(component.mensajePuntaje).toContain('Saldo para la tienda: 3 estrellas.');
  });

  it('envía vidas y ayudas reales', async () => {
    localStorage.removeItem('aulaActiva');
    component.vidasActuales = 2;
    component.ayudasUsadas = true;
    component.tarjetasUsadas = true;
    await component.procesarColaComandos();
    expect(progreso.guardarProgreso).toHaveBeenCalledWith(jasmine.objectContaining({
      vidas_restantes: 2, ayudas_usadas: true, tarjetas_usadas: true, vidas_perdidas: 0
    }));
  });

  it('solo marca una ayuda cuando realmente consume una poción', () => {
    component.jugando = true;
    const inventario = {
      vida: { activo: true, consumida: false }, tiempo: { activo: true, consumida: true },
      clarividencia: { activo: false, consumida: false }
    };
    component.layoutJuego = {
      baraja: { estadoObjetos: inventario, agitarPocion: jasmine.createSpy('agitar') }
    } as any;
    component.manejarUsoPocion('roja');
    component.manejarUsoPocion('verde');
    component.manejarUsoPocion('amarilla');
    expect(component.ayudasUsadas).toBeFalse();
    component.vidasActuales = 2;
    component.manejarUsoPocion('roja');
    expect(component.vidasActuales).toBe(3);
    expect(component.ayudasUsadas).toBeTrue();
  });

  it('restablece el uso de ayudas al comenzar una partida nueva', () => {
    component.ayudasUsadas = true;
    component.restaurarEstadoOriginal();
    expect(component.ayudasUsadas).toBeFalse();
  });

  it('mantiene la prueba del editor sin guardar una entrega', async () => {
    component.esModoProfesor = true;
    await component.procesarColaComandos();
    expect(progreso.guardarProgreso).not.toHaveBeenCalled();
    expect(localStorage.getItem('aulaActiva')).toBe(aulaId);
  });
});
