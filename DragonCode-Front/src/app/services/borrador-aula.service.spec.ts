import { TestBed } from '@angular/core/testing';
import { BorradorAulaService } from './borrador-aula.service';
import { ConfiguracionNivelUno } from '../core/configuracion-niveles-aula';

describe('BorradorAulaService', () => {
  let servicio: BorradorAulaService;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({});
    servicio = TestBed.inject(BorradorAulaService);
    servicio.guardar({
      modo: 'crear-aula',
      nuevoNombreAula: 'Algoritmos',
      nivelSeleccionado: 1,
      parametrosReto: {
        tiempo_3_estrellas: 60,
        tiempo_2_estrellas: 120,
        intentos_max_sin_penalidad: 3,
        fases_seleccionadas: [1]
      },
      plazoSeleccionado: 'sin_limite',
      fechaLimiteActividad: '',
      aulaParaActividad: null
    });
  });

  afterEach(() => sessionStorage.clear());

  it('guarda el mapa y actualiza las fases del borrador', () => {
    const configuracion = {
      version: 1,
      nivel_id: 1,
      tipo: 'mapa_ogro',
      max_vidas: 3,
      campana: {
        totalNiveles: 2,
        niveles: []
      }
    } as unknown as ConfiguracionNivelUno;

    expect(servicio.guardarMapa(configuracion)).toBeTrue();
    expect(servicio.obtener()?.parametrosReto.fases_seleccionadas).toEqual([1, 2]);
    expect(servicio.obtener()?.parametrosReto.configuracion_nivel?.tipo).toBe('mapa_ogro');
  });

  it('consume el borrador una sola vez', () => {
    expect(servicio.consumir()?.nuevoNombreAula).toBe('Algoritmos');
    expect(servicio.consumir()).toBeNull();
  });
});
