import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GameHeaderComponent } from './game-header.component';

describe('GameHeaderComponent', () => {
  let component: GameHeaderComponent;
  let fixture: ComponentFixture<GameHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GameHeaderComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GameHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('no muestra la ayuda de Draco cuando las ayudas están fuera del modo actual', () => {
    component.mostrarAyudaDraco = false;
    component.mostrarModalAjustes = true;
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Ayuda de Draco');
    expect(fixture.nativeElement.textContent).toContain('Sonido');
  });

  it('permite ocultar los ajustes en pantallas que no los necesitan', () => {
    component.mostrarAjustes = false;
    component.mostrarModalAjustes = true;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.btn-ajustes')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('AJUSTES');
  });
});
