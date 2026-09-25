import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { LayoutJuegoComponent } from '../layout-juego/layout-juego.component';
import { NivelOgroComponent } from './nivel-ogro.component';

describe('NivelOgroComponent: pantalla de victoria', () => {
  let fixture: ComponentFixture<NivelOgroComponent>;
  let component: NivelOgroComponent;

  beforeEach(async () => {
    // Angular registra estos hooks desde el prototipo al crear la vista.
    spyOn(NivelOgroComponent.prototype, 'ngOnInit');
    spyOn(NivelOgroComponent.prototype, 'ngAfterViewInit');
    await TestBed.configureTestingModule({
      imports: [NivelOgroComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();
    fixture = TestBed.createComponent(NivelOgroComponent);
    component = fixture.componentInstance;
    // Revisar solo el final: sin tutorial, partida, guardados ni peticiones al servidor.
    component.mostrarTutorial = false;
    component.pantallaNivelCompletado = true;
    component.esAulaActiva = true;
    component.mensajePuntaje = 'La entrega se guardó correctamente.';
    component.arrayEstrellas = [1, 2, 3];
    fixture.detectChanges();
  });

  it('abre un diálogo modal fuera del tablero y enfoca el título para leer desde el inicio', () => {
    const dialogo: HTMLDialogElement = fixture.nativeElement.querySelector('.modal-victoria');
    expect(dialogo.open).toBeTrue();
    expect(dialogo.matches(':modal')).toBeTrue();
    expect(dialogo.closest('app-layout-juego')).toBeNull();
    expect(document.activeElement).toBe(dialogo.querySelector('h1'));
    expect(dialogo.getAttribute('aria-labelledby')).toBe('titulo-victoria');
    expect(dialogo.textContent).toContain('¡ACTIVIDAD COMPLETADA!');
    expect(dialogo.classList.contains('victoria-aventura')).toBeFalse();
    expect(dialogo.querySelector('.victoria-felicitacion')).toBeNull();
  });

  it('conserva las estrellas, el mensaje y la acción del aula', () => {
    const volver = spyOn(component, 'volverAlAula');
    const dialogo: HTMLDialogElement = fixture.nativeElement.querySelector('.modal-victoria');
    expect(dialogo.querySelectorAll('.victoria-estrella').length).toBe(3);
    expect(dialogo.querySelector('#mensaje-victoria')?.textContent).toBe(component.mensajePuntaje);
    const boton = dialogo.querySelector('button')!;
    expect(boton.textContent).toContain('VOLVER AL AULA');
    boton.click();
    expect(volver).toHaveBeenCalledTimes(1);
  });

  it('registra el uso de tarjetas del nivel 1 aunque después se borre la consola', () => {
    component.esAulaActiva = false;
    component.pantallaNivelCompletado = false;
    fixture.detectChanges();
    const layout = fixture.debugElement.query(By.directive(LayoutJuegoComponent)).componentInstance as LayoutJuegoComponent;
    expect(component.tarjetasUsadas).toBeFalse();
    layout.onUsarTarjeta.emit({ accion: 'ogro.caminarAbajo();' } as any);
    component.codigoUsuario = '';
    expect(component.tarjetasUsadas).toBeTrue();
  });

  it('mantiene el título y la salida propios de una misión de aventura', () => {
    const salir = spyOn(component, 'salirMenuPrincipal');
    component.esAulaActiva = false;
    fixture.detectChanges();
    const dialogo: HTMLDialogElement = fixture.nativeElement.querySelector('.modal-victoria');
    expect(dialogo.textContent).toContain('¡MISIÓN COMPLETADA!');
    expect(dialogo.classList.contains('victoria-aventura')).toBeTrue();
    expect(dialogo.textContent).toContain('¡Felicidades! ¡Has completado la aventura!');
    const limites = dialogo.getBoundingClientRect();
    expect(limites.width).toBeCloseTo(window.innerWidth, 0);
    expect(limites.height).toBeCloseTo(window.innerHeight, 0);
    expect(getComputedStyle(dialogo).borderTopWidth).toBe('0px');
    expect(dialogo.querySelectorAll('.victoria-estrella').length).toBe(3);
    const boton = dialogo.querySelector('button')!;
    expect(boton.textContent).toContain('SALIR DE LA MISIÓN');
    boton.click();
    expect(salir).toHaveBeenCalledTimes(1);
  });

  it('no aplica la presentación de aventura al editor de mapas personalizados', () => {
    component.esAulaActiva = false;
    component.esModoProfesor = true;
    fixture.detectChanges();
    const dialogo: HTMLDialogElement = fixture.nativeElement.querySelector('.modal-victoria');
    expect(dialogo.classList.contains('victoria-aventura')).toBeFalse();
    expect(dialogo.querySelector('.victoria-felicitacion')).toBeNull();
    expect(getComputedStyle(dialogo).borderTopWidth).toBe('4px');
  });

  it('conserva el aviso de guardado fallido en aventura sin anunciar una recompensa', () => {
    component.esAulaActiva = false;
    component.arrayEstrellas = [];
    component.mensajePuntaje = 'Completaste el recorrido, pero no se confirmó el guardado.';
    fixture.detectChanges();
    const dialogo: HTMLDialogElement = fixture.nativeElement.querySelector('.modal-victoria');
    expect(dialogo.querySelector('#mensaje-victoria')?.textContent).toBe(component.mensajePuntaje);
    expect(dialogo.querySelector('.victoria-felicitacion')).toBeNull();
    expect(dialogo.querySelector('.victoria-estrellas')).toBeNull();
    expect(getComputedStyle(dialogo).overflowY).toBe('auto');
  });

  for (const movil of [false, true]) {
    it(`el manual explica la estrella exclusiva de consola (móvil: ${movil})`, () => {
      component.pantallaNivelCompletado = false;
      component.mostrarManual = true;
      component.esMovil = movil;
      component.paginaActual = movil ? 5 : 4;
      fixture.detectChanges();
      const texto = fixture.nativeElement.querySelector('.manual-overlay').textContent;
      expect(texto).toContain('sin usar Tarjetas de Acción');
      expect(texto).toContain('Perder vidas no quita esta estrella');
      expect(texto).not.toContain('tipear cada línea a mano');
    });
  }

  it('no oculta el resultado con Escape ni deja un diálogo al desmontar la vista', () => {
    const dialogo: HTMLDialogElement = fixture.nativeElement.querySelector('.modal-victoria');
    const cancelar = new Event('cancel', { cancelable: true });
    dialogo.dispatchEvent(cancelar);
    expect(cancelar.defaultPrevented).toBeTrue();
    expect(dialogo.open).toBeTrue();
    fixture.destroy();
    expect(dialogo.open).toBeFalse();
    expect(dialogo.matches(':modal')).toBeFalse();
  });

  it('muestra íntegro el aviso si el guardado no pudo confirmarse', () => {
    component.mensajePuntaje = 'Completaste el recorrido, pero no se confirmó el guardado. Revisa tu conexión y consulta tu progreso.';
    component.arrayEstrellas = [];
    fixture.detectChanges();
    const dialogo: HTMLDialogElement = fixture.nativeElement.querySelector('.modal-victoria');
    expect(dialogo.querySelector('#mensaje-victoria')?.textContent).toBe(component.mensajePuntaje);
    expect(getComputedStyle(dialogo).overflowY).toBe('auto');
    expect(dialogo.querySelector('button')!.getBoundingClientRect().height).toBeGreaterThanOrEqual(48);
    expect(dialogo.querySelector('.victoria-estrellas')).toBeNull();
  });

  for (const estrellas of [1, 2, 3]) {
    it(`renderiza ${estrellas} iconos y su descripción accesible correspondiente`, () => {
      component.arrayEstrellas = Array(estrellas).fill(0);
      fixture.detectChanges();
      const fila: HTMLElement = fixture.nativeElement.querySelector('.victoria-estrellas');
      expect(fila.querySelectorAll('.victoria-estrella').length).toBe(estrellas);
      expect(fila.getAttribute('aria-label')).toBe(
        `${estrellas} ${estrellas === 1 ? 'estrella' : 'estrellas'} de 3 en este intento`
      );
    });
  }
});
