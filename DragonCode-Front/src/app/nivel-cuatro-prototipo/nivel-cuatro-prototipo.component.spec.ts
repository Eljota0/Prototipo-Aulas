import { discardPeriodicTasks, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { AulasService } from '../services/aulas.service';
import { ProgresoService } from '../services/progreso.service';
import { NivelCuatroPrototipoComponent } from './nivel-cuatro-prototipo.component';

describe('NivelCuatroPrototipoComponent', () => {
  let routerDoble: { navigate: jasmine.Spy; url: string };
  let progresoDoble: jasmine.SpyObj<ProgresoService>;
  let aulasDoble: jasmine.SpyObj<AulasService>;

  beforeEach(async () => {
    localStorage.removeItem('aulaActiva');
    localStorage.removeItem('retoActivo');
    routerDoble = { navigate: jasmine.createSpy('navigate'), url: '/prototipo/nivel-4' };
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
      imports: [NivelCuatroPrototipoComponent],
      providers: [
        { provide: Router, useValue: routerDoble },
        { provide: ProgresoService, useValue: progresoDoble },
        { provide: AulasService, useValue: aulasDoble }
      ]
    }).compileComponents();
  });

  it('mantiene el evento como plantilla fija fuera del texto del usuario', async () => {
    const fixture = TestBed.createComponent(NivelCuatroPrototipoComponent);
    const componente = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(componente.codigoUsuario).toBe('');
    expect(componente.codigoCompleto).toContain('evento(fabrica.nuevoMaterial)');
    expect(fixture.nativeElement.textContent).toContain('evento(fabrica.nuevoMaterial)');
    componente.ngOnDestroy();
  });

  it('avanza automáticamente tras guardar el diamante de la fase 1', fakeAsync(() => {
    const fixture = TestBed.createComponent(NivelCuatroPrototipoComponent);
    const componente = fixture.componentInstance;
    fixture.detectChanges();

    componente.codigoUsuario = 'si (fabrica.materialActual == "Diamante") { fabrica.guardar(); }';
    componente.ejecutarCodigo();
    tick(3000);

    expect(componente.faseActual.numero).toBe(2);
    expect(componente.falloFase).toBeFalse();
    componente.ngOnDestroy();
    discardPeriodicTasks();
  }));

  it('varía la posición de las respuestas correctas entre fases', () => {
    const fixture = TestBed.createComponent(NivelCuatroPrototipoComponent);
    const componente = fixture.componentInstance;

    expect(componente.fases[0].tarjetas[2].etiqueta).toBe('SI es Diamante → guardar');
    expect(componente.fases[1].tarjetas[1].etiqueta).toBe('SI es Explosivo → destruir');
    expect(componente.fases[1].tarjetas[3].etiqueta).toBe('SINO → quemar lo restante');
    expect(componente.fases[3].tarjetas[0].tipo).toBe('DISTRACTOR');
    componente.ngOnDestroy();
  });

  it('no revela cuáles tarjetas son distractores en la interfaz', () => {
    const fixture = TestBed.createComponent(NivelCuatroPrototipoComponent);
    fixture.detectChanges();

    const textoVisible = fixture.nativeElement.textContent as string;
    const tarjetas = fixture.nativeElement.querySelectorAll('.action-card');

    expect(textoVisible).not.toContain('DISTRACTOR');
    expect(fixture.nativeElement.querySelector('.tipo-control')).toBeNull();
    expect(tarjetas.length).toBe(4);
    fixture.componentInstance.ngOnDestroy();
  });

  it('concentra las indicaciones en una sola placa y elimina la ayuda redundante', () => {
    const fixture = TestBed.createComponent(NivelCuatroPrototipoComponent);
    fixture.detectChanges();

    const textoVisible = fixture.nativeElement.textContent as string;

    expect(fixture.nativeElement.querySelector('.panel-logica-fabrica')).toBeNull();
    expect(fixture.nativeElement.querySelector('.mision-flotante')).not.toBeNull();
    expect(textoVisible).not.toContain('NECESITO AYUDA');
    expect(textoVisible).not.toContain('MOSTRAR PISTA');
    fixture.componentInstance.ngOnDestroy();
  });

  it('reutiliza el layout, el pergamino y el inventario de los niveles anteriores', () => {
    const fixture = TestBed.createComponent(NivelCuatroPrototipoComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-layout-juego')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-consola-codigo')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-baraja-tarjetas')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.panel-derecho')).toBeNull();
    expect(fixture.nativeElement.querySelector('.objetos-fabrica')).toBeNull();
    fixture.componentInstance.ngOnDestroy();
  });

  it('muestra una sola vez el diagnóstico principal en el modal', fakeAsync(() => {
    routerDoble.url = '/prototipo/nivel-5';
    const fixture = TestBed.createComponent(NivelCuatroPrototipoComponent);
    const componente = fixture.componentInstance;
    fixture.detectChanges();

    componente.codigoUsuario = 'si (fabrica.materialActual == "Diamante") { fabrica.guardar(); }';
    componente.ejecutarCodigo();
    tick(700);
    fixture.detectChanges();

    const mensaje = componente.errores[0];
    const repeticiones = (fixture.nativeElement.textContent.match(
      new RegExp(mensaje.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
    ) ?? []).length;
    expect(repeticiones).toBe(1);
    componente.ngOnDestroy();
    flush();
    discardPeriodicTasks();
  }));

  it('usa el grimorio y la clarividencia como ayudas del inventario', () => {
    const fixture = TestBed.createComponent(NivelCuatroPrototipoComponent);
    const componente = fixture.componentInstance;
    fixture.detectChanges();

    componente.usarObjeto('libro');
    expect(componente.ayudaVisible).toBeTrue();

    componente.usarObjeto('clarividencia');
    expect(componente.estadoObjetos.clarividencia).toBeTrue();
    expect(componente.mensajeObjeto).toContain(componente.faseActual.pista);
    componente.ngOnDestroy();
  });

  it('aplica una sola vez las pociones de vida y tiempo', () => {
    const fixture = TestBed.createComponent(NivelCuatroPrototipoComponent);
    const componente = fixture.componentInstance;
    fixture.detectChanges();
    componente.vidas = 2;
    componente.tiempoSegundos = 45;

    componente.usarObjeto('vida');
    componente.usarObjeto('tiempo');

    expect(componente.vidas).toBe(3);
    expect(componente.tiempoSegundos).toBe(15);
    expect(componente.estadoObjetos.vida).toBeTrue();
    expect(componente.estadoObjetos.tiempo).toBeTrue();

    componente.usarObjeto('vida');
    componente.usarObjeto('tiempo');
    expect(componente.vidas).toBe(3);
    expect(componente.tiempoSegundos).toBe(15);
    componente.ngOnDestroy();
  });

  it('usa el pergamino guiado del layout compartido en modo anti-copia', () => {
    const fixture = TestBed.createComponent(NivelCuatroPrototipoComponent);
    const componente = fixture.componentInstance;
    fixture.detectChanges();
    componente.antiCopiaActivo = true;
    fixture.detectChanges();

    const evento = { preventDefault: jasmine.createSpy('preventDefault') } as unknown as ClipboardEvent;
    componente.bloquearTransferencia(evento);

    expect(fixture.nativeElement.querySelector('app-layout-juego')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.plantilla-display')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('textarea')).toBeNull();
    expect(evento.preventDefault).toHaveBeenCalled();
    expect(componente.errores[0]).toContain('escribe el código');
    componente.ngOnDestroy();
  });

  it('completa el lote final con las tres ramas correctas', fakeAsync(() => {
    const fixture = TestBed.createComponent(NivelCuatroPrototipoComponent);
    const componente = fixture.componentInstance;
    fixture.detectChanges();
    componente.faseActualIndice = 3;
    (componente as unknown as { prepararFaseActual: () => void }).prepararFaseActual();

    componente.codigoUsuario = [
      'si (fabrica.materialActual == "Diamante") { fabrica.guardar(); }',
      'sino si (fabrica.materialActual == "Explosivo") { fabrica.destruir(); }',
      'sino { fabrica.quemar(); }'
    ].join('\n');
    componente.ejecutarCodigo();
    tick(8000);
    fixture.detectChanges();

    expect(componente.nivelCompletado).toBeTrue();
    expect(componente.diamantesGuardados).toBe(2);
    expect(componente.explosivosDestruidos).toBe(1);
    expect(componente.carbonQuemado).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('¡MISIÓN COMPLETADA!');
    componente.ngOnDestroy();
    flush();
  }));

  it('activa la emergencia si el explosivo se envía al horno', fakeAsync(() => {
    const fixture = TestBed.createComponent(NivelCuatroPrototipoComponent);
    const componente = fixture.componentInstance;
    fixture.detectChanges();
    componente.faseActualIndice = 3;
    (componente as unknown as { prepararFaseActual: () => void }).prepararFaseActual();

    componente.codigoUsuario = [
      'si (fabrica.materialActual == "Diamante") { fabrica.guardar(); }',
      'sino si (fabrica.materialActual == "Explosivo") { fabrica.quemar(); }',
      'sino { fabrica.quemar(); }'
    ].join('\n');
    componente.ejecutarCodigo();
    tick(700);

    expect(componente.falloFase).toBeTrue();
    expect(componente.estadoEscena).toBe('explosion');
    expect(componente.vidas).toBe(2);
    componente.ngOnDestroy();
    flush();
    discardPeriodicTasks();
  }));

  it('envía al backend el progreso y las soluciones del Nivel 4', fakeAsync(() => {
    routerDoble.url = '/aventura/nivel/4';
    const fixture = TestBed.createComponent(NivelCuatroPrototipoComponent);
    const componente = fixture.componentInstance;
    fixture.detectChanges();
    componente.faseActualIndice = 3;
    (componente as unknown as { prepararFaseActual: () => void }).prepararFaseActual();

    componente.codigoUsuario = [
      'si (fabrica.materialActual == "Diamante") { fabrica.guardar(); }',
      'sino si (fabrica.materialActual == "Explosivo") { fabrica.destruir(); }',
      'sino { fabrica.quemar(); }'
    ].join('\n');
    componente.ejecutarCodigo();
    tick(8000);

    expect(progresoDoble.guardarProgreso).toHaveBeenCalledTimes(1);
    const solicitud = progresoDoble.guardarProgreso.calls.mostRecent().args[0];
    expect(solicitud.reto_nivel_id).toBe(4);
    expect(solicitud.vidas_restantes).toBe(3);
    expect(solicitud.ayudas_usadas).toBeFalse();
    expect(solicitud.codigo_solucion).toContain('// Fase 4');
    expect(componente.progresoGuardado).toBeTrue();
    componente.ngOnDestroy();
  }));

  it('reutiliza la fábrica para el Nivel 5 y guarda su progreso oficial', fakeAsync(() => {
    routerDoble.url = '/aventura/nivel/5';
    const fixture = TestBed.createComponent(NivelCuatroPrototipoComponent);
    const componente = fixture.componentInstance;
    fixture.detectChanges();
    componente.faseActualIndice = 3;
    (componente as unknown as { prepararFaseActual: () => void }).prepararFaseActual();

    componente.codigoUsuario = [
      'mientras (fabrica.tieneMateriales == verdadero) {',
      'si (fabrica.materialActual == "Diamante") { fabrica.guardar(); }',
      'sino si (fabrica.materialActual == "Explosivo") { fabrica.destruir(); }',
      'sino { fabrica.quemar(); }',
      '}'
    ].join('\n');
    componente.ejecutarCodigo();
    tick(15000);

    expect(componente.esNivelCinco).toBeTrue();
    expect(componente.nivelCompletado).toBeTrue();
    expect(componente.diamantesGuardados).toBe(3);
    expect(componente.explosivosDestruidos).toBe(3);
    expect(componente.carbonQuemado).toBe(4);
    const solicitud = progresoDoble.guardarProgreso.calls.mostRecent().args[0];
    expect(solicitud.reto_nivel_id).toBe(5);
    expect(solicitud.vidas_restantes).toBe(3);
    expect(solicitud.ayudas_usadas).toBeFalse();
    componente.ngOnDestroy();
  }));

  it('aplica al Nivel 5 únicamente las fases de producción seleccionadas por el aula', () => {
    routerDoble.url = '/aventura/nivel/5';
    localStorage.setItem('aulaActiva', 'aula-1');
    localStorage.setItem('retoActivo', 'reto-nivel-5');
    aulasDoble.retosDelAula.and.returnValue(of([{
      id: 'reto-nivel-5',
      aula_id: 'aula-1',
      reto_nivel_id: 5,
      titulo: 'Práctica de bucles',
      estado: 'publicado',
      tipo_reto: 'bucles',
      recompensa_estrellas: 5,
      parametros_evaluacion: {
        tiempo_3_estrellas: 100,
        tiempo_2_estrellas: 200,
        intentos_max_sin_penalidad: 3,
        anti_copia: true,
        fases_seleccionadas: [2, 4]
      },
      fecha_creacion: '2026-09-03T00:00:00Z',
      completado: false
    }]));

    const fixture = TestBed.createComponent(NivelCuatroPrototipoComponent);
    const componente = fixture.componentInstance;
    fixture.detectChanges();

    expect(componente.fases.map(fase => fase.numero)).toEqual([2, 4]);
    expect(componente.fases.map(fase => fase.titulo)).toEqual([
      'Mantener el horno seguro',
      'Avalancha de producción'
    ]);
    expect(componente.antiCopiaActivo).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('1 — 2');
    expect(fixture.nativeElement.querySelector('.contador-fase').textContent.trim()).toBe('1 — 2');
    componente.ngOnDestroy();
  });

  it('usa en la simulación la secuencia de materiales publicada por el profesor', () => {
    routerDoble.url = '/aventura/nivel/4';
    const componente = TestBed.createComponent(NivelCuatroPrototipoComponent).componentInstance;

    (componente as any).aplicarConfiguracionAula({
      parametros_evaluacion: {
        fases_seleccionadas: [1],
        configuracion_nivel: {
          version: 1,
          nivel_id: 4,
          tipo: 'materiales_fabrica',
          materiales_por_fase: {
            '1': ['Diamante', 'Carbon', 'Explosivo'],
            '2': ['Carbon'], '3': ['Diamante'], '4': ['Explosivo']
          }
        }
      }
    });

    expect(componente.fases.length).toBe(1);
    expect(componente.fases[0].materiales).toEqual(['Diamante', 'Carbon', 'Explosivo']);
    componente.ngOnDestroy();
  });
  for (const nivel of [4, 5]) {
    it(`nivel ${nivel}: puntúa ayudas consumidas y conserva su uso entre fases`, () => {
      routerDoble.url = `/prototipo/nivel-${nivel}`;
      const componente = TestBed.createComponent(NivelCuatroPrototipoComponent).componentInstance;
      componente.ngOnInit();
      componente.usarObjeto('libro');
      componente.insertarTarjeta(componente.fases[0].tarjetas[0]);
      componente.usarObjeto('vida');
      componente.usarObjeto('tiempo');
      expect(componente.ayudasUsadas).toBeFalse();
      componente.usarObjeto('clarividencia');
      (componente as any).prepararFaseActual();
      expect(componente.ayudasUsadas).toBeTrue();
      componente.tiempoSegundos = 900;
      (componente as any).finalizarNivel();
      expect(componente.estrellas).toBe(2);
      expect(componente.calificacion).toBe(10);
      componente.reiniciarNivel();
      expect(componente.ayudasUsadas).toBeFalse();
      componente.ngOnDestroy();
    });
  }

  it('desactiva todos los objetos de ayuda en cualquier actividad de aula', () => {
    const componente = TestBed.createComponent(NivelCuatroPrototipoComponent).componentInstance;

    (componente as any).aplicarConfiguracionAula({
      parametros_evaluacion: { ayudas_habilitadas: true }
    });

    expect(Object.values(componente.inventarioNivel).every(objeto => !objeto.activo)).toBeTrue();
    componente.ngOnDestroy();
  });

  it('adapta la salida y la pantalla final al contexto del aula en los niveles 4 y 5', () => {
    for (const nivel of [4, 5]) {
      routerDoble.url = `/aventura/nivel/${nivel}`;
      const fixture = TestBed.createComponent(NivelCuatroPrototipoComponent);
      const componente = fixture.componentInstance;
      (componente as any).esActividadAula = true;
      componente.nivelCompletado = true;
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('¡ACTIVIDAD COMPLETADA!');
      expect(fixture.nativeElement.textContent).toContain('VOLVER AL AULA');

      componente.salir();
      expect(routerDoble.navigate).toHaveBeenCalledWith(['/pantalla-principal']);
      componente.ngOnDestroy();
      routerDoble.navigate.calls.reset();
    }
  });
});
