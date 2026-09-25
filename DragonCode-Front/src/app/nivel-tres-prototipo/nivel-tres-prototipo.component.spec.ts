import { discardPeriodicTasks, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { AulasService } from '../services/aulas.service';
import { ProgresoService } from '../services/progreso.service';
import { NivelTresPrototipoComponent } from './nivel-tres-prototipo.component';

describe('NivelTresPrototipoComponent', () => {
  let routerDoble: { navigate: jasmine.Spy; url: string };
  let progresoDoble: jasmine.SpyObj<ProgresoService>;
  let aulasDoble: jasmine.SpyObj<AulasService>;

  beforeEach(async () => {
    localStorage.removeItem('aulaActiva');
    localStorage.removeItem('retoActivo');
    routerDoble = { navigate: jasmine.createSpy('navigate'), url: '/prototipo/nivel-3' };
    progresoDoble = jasmine.createSpyObj<ProgresoService>('ProgresoService', ['guardarProgreso']);
    progresoDoble.guardarProgreso.and.returnValue(of({
      mensaje: '¡Nivel completado! Obtuviste 3 estrella(s).',
      estrellas_obtenidas: 3,
      estrellas_totales_usuario: 3,
      es_primera_vez: true
    }));
    aulasDoble = jasmine.createSpyObj<AulasService>('AulasService', ['retosDelAula']);
    aulasDoble.retosDelAula.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [NivelTresPrototipoComponent],
      providers: [
        {
          provide: Router,
          useValue: routerDoble
        },
        { provide: ProgresoService, useValue: progresoDoble },
        { provide: AulasService, useValue: aulasDoble }
      ]
    }).compileComponents();
  });

  it('distingue el booleano true del texto "true"', fakeAsync(() => {
    const fixture = TestBed.createComponent(NivelTresPrototipoComponent);
    const componente = fixture.componentInstance;
    fixture.detectChanges();

    componente.codigoUsuario = 'luz = "true"';
    componente.ejecutarCodigo();
    tick(750);

    expect(componente.falloFase).toBeTrue();
    expect(componente.memoria['luz']).toBe('true');
    expect(componente.errores[0]).toContain('booleano');
    componente.ngOnDestroy();
    tick(1000);
    discardPeriodicTasks();
  }));

  it('describe cada distractor con el tipo de valor que realmente inserta', () => {
    const fixture = TestBed.createComponent(NivelTresPrototipoComponent);
    const componente = fixture.componentInstance;

    const textoTrue = componente.fases[0].tarjetas.find(tarjeta => tarjeta.codigo === 'luz = "true"');
    const fuegoSinComillas = componente.fases[1].tarjetas.find(tarjeta => tarjeta.codigo === 'elemento = Fuego');
    const booleanoComoElemento = componente.fases[1].tarjetas.find(tarjeta => tarjeta.codigo === 'elemento = true');

    expect(textoTrue?.tipo).toBe('TEXTO');
    expect(textoTrue?.etiqueta).toBe('Texto "true"');
    expect(fuegoSinComillas?.tipo).toBe('SIN COMILLAS');
    expect(booleanoComoElemento?.tipo).toBe('BOOLEANO');
    componente.ngOnDestroy();
  });

  it('avanza automáticamente al completar una fase', fakeAsync(() => {
    const fixture = TestBed.createComponent(NivelTresPrototipoComponent);
    const componente = fixture.componentInstance;
    fixture.detectChanges();

    componente.codigoUsuario = 'luz = true';
    componente.ejecutarCodigo();
    tick(1900);

    expect(componente.faseActual.numero).toBe(2);
    expect(componente.falloFase).toBeFalse();
    componente.ngOnDestroy();
    discardPeriodicTasks();
  }));

  it('completa las cuatro fases usando valores de tipos diferentes', fakeAsync(() => {
    const fixture = TestBed.createComponent(NivelTresPrototipoComponent);
    const componente = fixture.componentInstance;
    fixture.detectChanges();

    componente.codigoUsuario = 'luz = true';
    componente.ejecutarCodigo();
    tick(1900);

    componente.codigoUsuario = 'elemento = "Fuego"';
    componente.ejecutarCodigo();
    tick(1900);

    componente.codigoUsuario = 'cantidad = 3';
    componente.ejecutarCodigo();
    tick(2300);

    componente.codigoUsuario = ['cantidad = 3', 'elemento = "Fuego"', 'luz = true'].join('\n');
    componente.ejecutarCodigo();
    tick(3100);
    fixture.detectChanges();

    expect(componente.nivelCompletado).toBeTrue();
    expect(componente.murcielagosDerrotados).toBe(3);
    expect(componente.estrellas).toBe(3);
    expect(componente.calificacion).toBe(10);
    expect(fixture.nativeElement.textContent).toContain('¡MISIÓN COMPLETADA!');
    componente.ngOnDestroy();
    tick(1000);
  }));

  it('reemplaza la horda por el murciélago alfa en la fase final', () => {
    const fixture = TestBed.createComponent(NivelTresPrototipoComponent);
    const componente = fixture.componentInstance;
    fixture.detectChanges();

    componente.faseActualIndice = 3;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.murcielago-jefe')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.murcielago:not(.murcielago-jefe)').length).toBe(0);
    componente.ngOnDestroy();
  });

  it('envía al backend el progreso y las soluciones del Nivel 3', fakeAsync(() => {
    routerDoble.url = '/aventura/nivel/3';
    const fixture = TestBed.createComponent(NivelTresPrototipoComponent);
    const componente = fixture.componentInstance;
    fixture.detectChanges();

    componente.codigoUsuario = 'luz = true';
    componente.ejecutarCodigo();
    tick(1900);
    componente.codigoUsuario = 'elemento = "Fuego"';
    componente.ejecutarCodigo();
    tick(1900);
    componente.codigoUsuario = 'cantidad = 3';
    componente.ejecutarCodigo();
    tick(2300);
    componente.codigoUsuario = ['luz = true', 'elemento = "Fuego"', 'cantidad = 3'].join('\n');
    componente.ejecutarCodigo();
    tick(3100);

    expect(progresoDoble.guardarProgreso).toHaveBeenCalledTimes(1);
    const solicitud = progresoDoble.guardarProgreso.calls.mostRecent().args[0];
    expect(solicitud.reto_nivel_id).toBe(3);
    expect(solicitud.intentos).toBe(1);
    expect(solicitud.vidas_restantes).toBe(3);
    expect(solicitud.ayudas_usadas).toBeFalse();
    expect(solicitud.codigo_solucion).toContain('// Fase 1');
    expect(solicitud.codigo_solucion).toContain('// Fase 4');
    expect(componente.progresoGuardado).toBeTrue();
    componente.ngOnDestroy();
  }));
  it('conserva la pista usada entre fases y la limpia solo al reiniciar el nivel', () => {
    const componente = TestBed.createComponent(NivelTresPrototipoComponent).componentInstance;
    componente.insertarTarjeta(componente.fases[0].tarjetas[0]);
    expect(componente.ayudasUsadas).toBeFalse();
    componente.alternarPista();
    componente.alternarPista();
    expect(componente.ayudasUsadas).toBeTrue();
    (componente as any).prepararFaseActual();
    expect(componente.ayudasUsadas).toBeTrue();
    componente.reiniciarNivel();
    expect(componente.ayudasUsadas).toBeFalse();
    componente.ngOnDestroy();
  });

  it('curarse no recupera la estrella de cero pérdidas ni altera la nota por intentos', () => {
    const componente = TestBed.createComponent(NivelTresPrototipoComponent).componentInstance;
    componente.vidas = 3;
    componente.ayudasUsadas = true;
    componente.tiempoSegundos = 900;
    componente.erroresAcumulados = 3;
    (componente as any).finalizarNivel();
    expect(componente.estrellas).toBe(1);
    expect(componente.calificacion).toBe(6);
    expect(progresoDoble.guardarProgreso).not.toHaveBeenCalled();
    componente.ngOnDestroy();
  });

  it('oculta los objetos de ayuda en cualquier actividad de aula', () => {
    const componente = TestBed.createComponent(NivelTresPrototipoComponent).componentInstance;
    componente.ayudaVisible = true;

    (componente as any).aplicarConfiguracionAula({
      parametros_evaluacion: { ayudas_habilitadas: true }
    });

    expect(componente.ayudasHabilitadas).toBeFalse();
    expect(componente.ayudaVisible).toBeFalse();
    expect(componente.inventarioNivel.libro.activo).toBeFalse();
    expect(componente.inventarioNivel.clarividencia.activo).toBeFalse();
    componente.ngOnDestroy();
  });

  it('conserva las respuestas correctas al reducir los distractores del aula', () => {
    const componente = TestBed.createComponent(NivelTresPrototipoComponent).componentInstance;

    (componente as any).aplicarConfiguracionAula({
      parametros_evaluacion: {
        fases_seleccionadas: [1, 4],
        configuracion_nivel: {
          version: 1,
          nivel_id: 3,
          tipo: 'variables_cueva',
          distractores_por_fase: 0
        }
      }
    });

    expect(componente.fases[0].tarjetas.map(tarjeta => tarjeta.codigo)).toEqual(['luz = true']);
    expect(componente.fases[1].tarjetas.map(tarjeta => tarjeta.codigo)).toEqual([
      'cantidad = 3', 'elemento = "Fuego"', 'luz = true'
    ]);
    componente.ngOnDestroy();
  });

  it('reutiliza el layout compartido y no duplica consola ni inventario', () => {
    const fixture = TestBed.createComponent(NivelTresPrototipoComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-layout-juego')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-consola-codigo')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-baraja-tarjetas')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.panel-derecho').length).toBe(0);
    fixture.componentInstance.ngOnDestroy();
  });

  it('adapta la salida y la pantalla final al contexto del aula', () => {
    const fixture = TestBed.createComponent(NivelTresPrototipoComponent);
    const componente = fixture.componentInstance;
    (componente as any).esActividadAula = true;
    componente.nivelCompletado = true;
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('¡ACTIVIDAD COMPLETADA!');
    expect(fixture.nativeElement.textContent).toContain('VOLVER AL AULA');

    componente.salir();
    expect(routerDoble.navigate).toHaveBeenCalledWith(['/pantalla-principal']);
    componente.ngOnDestroy();
  });
});
