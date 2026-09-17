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
                reto_nivel_id: 42,
                nivel_orden: 2,
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

  it('desbloquea solo el nivel siguiente al último completado', () => {
    expect(component.niveles.length).toBe(5);
    expect(component.niveles[0].completado).toBeTrue();
    expect(component.niveles[1].completado).toBeTrue();
    expect(component.niveles[1].bloqueado).toBeFalse();
    expect(component.niveles[2].bloqueado).toBeFalse();
    expect(component.niveles[2].titulo).toBe('La Cueva de las Variables');
    expect(component.niveles[2].tema).toBe('Variables y tipos de datos');
    expect(component.niveles[2].bloqueado).toBeFalse();
    expect(component.niveles[3].bloqueado).toBeTrue();
    expect(component.niveles[4].bloqueado).toBeTrue();
    expect(component.nivelesCompletados).toBe(2);
    expect(component.porcentajeProgreso).toBe(40);
  });

  it('deja únicamente el Nivel 1 disponible cuando no hay progreso', () => {
    (component as unknown as {
      construirMapa: (completados: Set<number>) => void;
    }).construirMapa(new Set());

    expect(component.niveles.map(nivel => nivel.bloqueado)).toEqual([
      false, true, true, true, true
    ]);
  });

  it('desbloquea Producción en Masa al completar el Nivel 4', () => {
    (component as unknown as {
      construirMapa: (completados: Set<number>) => void;
    }).construirMapa(new Set([1, 2, 3, 4]));

    expect(component.niveles[4].titulo).toBe('Producción en Masa');
    expect(component.niveles[4].bloqueado).toBeFalse();
  });

  it('explica el aprendizaje y las fases de los cinco niveles incluso si están bloqueados', () => {
    (component as unknown as {
      construirMapa: (completados: Set<number>) => void;
    }).construirMapa(new Set());
    fixture.detectChanges();

    expect(component.niveles.map(nivel => nivel.fases)).toEqual([4, 3, 4, 4, 4]);
    expect(component.niveles.map(nivel => nivel.tema)).toEqual([
      'Algoritmos y secuencias',
      'Eventos y condicionales',
      'Variables y tipos de datos',
      'Condicionales múltiples',
      'Bucles y decisiones'
    ]);

    const tarjetas = fixture.nativeElement.querySelectorAll('.level-card');
    expect(tarjetas.length).toBe(5);
    expect(fixture.nativeElement.textContent).toContain('Taladro a Vapor');
    expect(fixture.nativeElement.textContent).toContain('Producción en Masa');
    expect(fixture.nativeElement.textContent).not.toContain('POR DESCUBRIR');
  });

  it('mantiene disponibles controles grandes y una guía visual de Drako', () => {
    const volver = fixture.nativeElement.querySelector('.btn-back') as HTMLElement;
    const drako = fixture.nativeElement.querySelector('.mentor-portrait img') as HTMLImageElement;

    expect(drako.getAttribute('src')).toContain('dracobase1.png');
    expect(getComputedStyle(volver).minHeight).toBe('48px');
    expect(getComputedStyle(fixture.nativeElement.querySelector('.level-card')).touchAction).toBe('manipulation');
  });
});
