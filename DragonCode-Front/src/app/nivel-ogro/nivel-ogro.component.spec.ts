import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';

import { Casilla, NivelOgroComponent } from './nivel-ogro.component';

describe('NivelOgroComponent', () => {
  let component: NivelOgroComponent;
  let fixture: ComponentFixture<NivelOgroComponent>;

  beforeEach(async () => {
    localStorage.removeItem('aulaActiva');

    await TestBed.configureTestingModule({
      imports: [NivelOgroComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(NivelOgroComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('no muestra la introducción de Drako durante una actividad de aula', () => {
    component.esAulaActiva = true;
    component.esModoProfesor = false;
    component.mostrarTutorial = false;

    component.manejarToggleDraco(true);

    expect(component.mostrarTutorial).toBeFalse();
  });

  it('no muestra la introducción de Drako en el constructor del nivel', () => {
    component.esAulaActiva = false;
    component.esModoProfesor = true;
    component.mostrarTutorial = false;

    component.manejarToggleDraco(true);

    expect(component.mostrarTutorial).toBeFalse();
  });

  it('mantiene disponible la introducción de Drako en Aventura', () => {
    component.esAulaActiva = false;
    component.esModoProfesor = false;
    component.nivelActual = 1;
    component.pantallaNivelCompletado = false;
    component.mostrarTutorial = false;
    spyOn(component, 'iniciarDialogo');

    component.manejarToggleDraco(true);

    expect(component.mostrarTutorial).toBeTrue();
    expect(component.iniciarDialogo).toHaveBeenCalled();
  });

  it('permite construir terreno en la fila inferior del editor', () => {
    const celdaInferior: Casilla = {
      x: 0,
      y: 6,
      zona: 'inferior',
      terreno: 'vacio',
      objeto: 'ninguno',
      tieneFilo: false,
      rotacionTerreno: 0,
      estadoAnimacion: 'normal'
    };

    component.modoEditor = true;
    component.seleccionarPincel('sueloroto', 'terreno');
    component.pintarCelda(celdaInferior);

    expect(celdaInferior.terreno).toBe('sueloroto');
  });

  it('sale al aula o al mapa según el contexto del intento', () => {
    const router = TestBed.inject(Router);
    const navegar = spyOn(router, 'navigate').and.resolveTo(true);

    component.esAulaActiva = true;
    component.salirMenuPrincipal();
    expect(navegar).toHaveBeenCalledWith(['/pantalla-principal']);

    component.esAulaActiva = false;
    component.salirMenuPrincipal();
    expect(navegar).toHaveBeenCalledWith(['/aventura']);
  });
});
