import { ComponentFixture, TestBed } from '@angular/core/testing';
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

  it('desbloquea el Nivel 2 cuando el Nivel 1 está completado', () => {
    expect(component.niveles[0].completado).toBeTrue();
    expect(component.niveles[1].bloqueado).toBeFalse();
    expect(component.niveles[2].bloqueado).toBeTrue();
  });
});
