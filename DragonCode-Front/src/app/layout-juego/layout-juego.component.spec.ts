import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LayoutJuegoComponent } from './layout-juego.component';
import { BarajaTarjetasComponent } from '../baraja-tarjetas/baraja-tarjetas.component';
import { GameHeaderComponent } from '../game-header/game-header.component';

describe('LayoutJuegoComponent', () => {
  let component: LayoutJuegoComponent;
  let fixture: ComponentFixture<LayoutJuegoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LayoutJuegoComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LayoutJuegoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('oculta objetos y la ayuda de Draco en modo aula', () => {
    component.modoJuego = 'aula';
    fixture.detectChanges();

    const baraja = fixture.debugElement.query(
      debugElement => debugElement.componentInstance instanceof BarajaTarjetasComponent
    ).componentInstance as BarajaTarjetasComponent;
    const encabezado = fixture.debugElement.query(
      debugElement => debugElement.componentInstance instanceof GameHeaderComponent
    ).componentInstance as GameHeaderComponent;

    expect(baraja.modoJuego).toBe('aula');
    expect(encabezado.mostrarAyudaDraco).toBeFalse();
    expect(fixture.nativeElement.querySelector('.objects-section')).toBeNull();
  });

  it('separa el modo edición de los controles usados para probar el nivel', () => {
    component.modoEdicion = true;
    component.mostrarAjustes = false;
    fixture.detectChanges();

    const layout = fixture.nativeElement.querySelector('.game-layout-wrapper');
    const controles = fixture.nativeElement.querySelector('.game-controls');
    const encabezado = fixture.debugElement.query(
      debugElement => debugElement.componentInstance instanceof GameHeaderComponent
    ).componentInstance as GameHeaderComponent;

    expect(layout.classList).toContain('editor-activo');
    expect(controles.getAttribute('aria-hidden')).toBe('true');
    expect(controles.hasAttribute('inert')).toBeTrue();
    expect(encabezado.mostrarAjustes).toBeFalse();
  });

  it('mantiene pergamino e inventario alcanzables mediante un único scroll móvil', () => {
    const anchoOriginal = window.innerWidth;
    const altoOriginal = window.innerHeight;

    try {
      window.resizeTo(400, 504);
      window.dispatchEvent(new Event('resize'));
      fixture.detectChanges();

      const contenido = fixture.nativeElement.querySelector('.game-content-wrapper') as HTMLElement;
      const controles = fixture.nativeElement.querySelector('.game-controls') as HTMLElement;
      const inventario = fixture.nativeElement.querySelector('.cards-section') as HTMLElement;

      expect(getComputedStyle(contenido).overflowY).toBe('auto');
      expect(getComputedStyle(controles).overflowY).toBe('visible');
      expect(parseFloat(getComputedStyle(inventario).minHeight)).toBeGreaterThanOrEqual(320);
      expect(contenido.scrollHeight).toBeGreaterThan(contenido.clientHeight);

      contenido.scrollTop = contenido.scrollHeight;
      expect(contenido.scrollTop).toBeGreaterThan(0);
    } finally {
      window.resizeTo(anchoOriginal, altoOriginal);
      window.dispatchEvent(new Event('resize'));
    }
  });
});
