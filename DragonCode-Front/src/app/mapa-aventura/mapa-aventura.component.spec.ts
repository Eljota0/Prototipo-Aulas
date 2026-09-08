import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { MapaAventuraComponent } from './mapa-aventura.component';
import { ProgresoService } from '../services/progreso.service';

describe('MapaAventuraComponent', () => {
  let component: MapaAventuraComponent;
  let fixture: ComponentFixture<MapaAventuraComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapaAventuraComponent],
      providers: [
        provideRouter([]),
        {
          provide: ProgresoService,
          useValue: {
            miProgreso: () => of([
              {
                reto_nivel_id: 1,
                completado: true,
                estrellas_obtenidas: 3,
                intentos: 1,
                tiempo_segundos: 40,
                fecha_completado: '2026-08-31T00:00:00'
              },
              {
                reto_nivel_id: 2,
                completado: true,
                estrellas_obtenidas: 3,
                intentos: 1,
                tiempo_segundos: 55,
                fecha_completado: '2026-09-01T00:00:00'
              }
            ])
          }
        }
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MapaAventuraComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('mantiene disponibles los cinco niveles durante el modo temporal de pruebas', () => {
    expect(component.niveles.length).toBe(5);
    expect(component.niveles[0].completado).toBeTrue();
    expect(component.niveles[1].completado).toBeTrue();
    expect(component.niveles[1].bloqueado).toBeFalse();
    expect(component.niveles[2].bloqueado).toBeFalse();
    expect(component.niveles[2].titulo).toBe('La Cueva de las Variables');
    expect(component.niveles[3].bloqueado).toBeFalse();
    expect(component.niveles[4].bloqueado).toBeFalse();
    expect(component.nivelesCompletados).toBe(2);
    expect(component.porcentajeProgreso).toBe(40);
  });

  it('desbloquea Producción en Masa al completar el Nivel 4', () => {
    (component as unknown as {
      construirMapa: (completados: Set<number>) => void;
    }).construirMapa(new Set([1, 2, 3, 4]));

    expect(component.niveles[4].titulo).toBe('Producción en Masa');
    expect(component.niveles[4].bloqueado).toBeFalse();
  });
});
