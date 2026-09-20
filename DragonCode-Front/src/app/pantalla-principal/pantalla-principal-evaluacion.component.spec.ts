import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Router } from '@angular/router';
import { NEVER, of } from 'rxjs';
import { UserService } from '../services/user.service';
import { PantallaPrincipalComponent } from './pantalla-principal.component';
import { AulasService } from '../services/aulas.service';
import { NotificationService } from '../services/notification.service';

describe('Configuración de evaluación según la tesis', () => {
  let fixture: ComponentFixture<PantallaPrincipalComponent>;
  let component: PantallaPrincipalComponent;

  beforeEach(async () => {
    spyOn(PantallaPrincipalComponent.prototype, 'ngOnInit');
    await TestBed.configureTestingModule({
      imports: [PantallaPrincipalComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();
    fixture = TestBed.createComponent(PantallaPrincipalComponent);
    component = fixture.componentInstance;
    component.isCrearAulaOpen = true;
    component.creandoNuevaAula = true;
    component.pasoCrearAula = 3;
  });

  for (const nivel of [1, 2, 3, 4, 5]) {
    it(`nivel ${nivel}: explica la calificación sin configurar estrellas`, () => {
      component.nivelSeleccionado = nivel;
      fixture.detectChanges();
      const texto = fixture.nativeElement.textContent;
      expect(texto).toContain('10/10 al primer intento');
      expect(texto).not.toContain('Tiempo para 3 estrellas');
      expect(texto).not.toContain('Intentos sin penalidad de estrella');
      expect(fixture.nativeElement.querySelector('#plazo-nueva-actividad')).not.toBeNull();
    });
  }

  it('muestra solo los tres parámetros pedagógicos del nivel 2', () => {
    component.nivelSeleccionado = 2;
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Tiempo para 3 estrellas');
    expect(fixture.nativeElement.querySelectorAll('input[type="number"]').length).toBe(3);
  });

  it('muestra automáticamente los parámetros editables del nivel seleccionado', () => {
    component.seleccionarNivel(3);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-configurador-nivel-aula')).not.toBeNull();
  });

  it('exige editar el recorrido antes de continuar con el nivel 1', () => {
    const router = TestBed.inject(Router);
    const navegar = spyOn(router, 'navigate');
    component.pasoCrearAula = 2;
    component.nivelSeleccionado = 1;
    component.parametrosReto.configuracion_nivel = undefined;

    component.siguientePaso2();

    expect(navegar).toHaveBeenCalledWith(['/crear-aula/ogro']);
    expect(component.pasoCrearAula).toBe(2);
  });

  it('permite seleccionar los cinco niveles y muestra solo sus fases implementadas', () => {
    component.pasoCrearAula = 2;
    component.seleccionarNivel(5);
    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent;
    for (const nivel of component.nivelesDisponibles) {
      expect(texto).toContain(nivel.nombre);
    }
    for (const fase of [1, 2, 3, 4]) {
      expect(texto).toContain(`FASE ${fase}`);
    }
    expect(component.resumenFasesSeleccionadas).toBe('F1, F2, F3, F4');

    component.seleccionarNivel(2);
    fixture.detectChanges();
    expect(component.fasesDisponiblesNivel).toEqual([1, 2, 3]);
    expect(component.parametrosReto.fases_seleccionadas).toEqual([1, 2, 3]);
    expect(fixture.nativeElement.textContent).not.toContain('FASE 4');
    expect(Array.from(fixture.nativeElement.querySelectorAll('.activity-level-option'))
      .every((element: any) => element.tagName === 'BUTTON')).toBeTrue();
    expect(Array.from(fixture.nativeElement.querySelectorAll('.activity-phase-option'))
      .every((element: any) => element.tagName === 'BUTTON')).toBeTrue();
  });

  it('usa controles nativos y áreas táctiles suficientes en la pantalla principal', () => {
    component.isCrearAulaOpen = false;
    component.creandoNuevaAula = false;
    fixture.detectChanges();

    const tarjetas = Array.from(
      fixture.nativeElement.querySelectorAll('.mode-card') as NodeListOf<HTMLElement>
    );
    expect(tarjetas.map(tarjeta => tarjeta.tagName)).toEqual(['A', 'BUTTON', 'BUTTON']);

    const botonHud = fixture.nativeElement.querySelector('.hud-btn') as HTMLElement;
    expect(parseFloat(getComputedStyle(botonHud).width)).toBeGreaterThanOrEqual(44);
    expect(getComputedStyle(tarjetas[0]).touchAction).toBe('manipulation');
  });

  it('ofrece plazos simples y muestra la zona horaria local antes de publicar', () => {
    fixture.detectChanges();
    const opciones = Array.from(
      fixture.nativeElement.querySelectorAll('#plazo-nueva-actividad option') as NodeListOf<HTMLOptionElement>
    ).map(opcion => opcion.textContent?.trim());
    expect(opciones).toEqual([
      'Sin fecha límite', '30 minutos', '1 hora', '24 horas', '7 días', 'Elegir fecha y hora'
    ]);

    const inicio = Date.now();
    component.seleccionarPlazo('1_hora');
    const diferencia = new Date(component.fechaLimiteActividad).getTime() - inicio;
    expect(diferencia).toBeGreaterThan(59 * 60 * 1000);
    expect(diferencia).toBeLessThanOrEqual(60 * 60 * 1000);
    expect(component.resumenFechaLimite).not.toBe('Sin fecha límite');
    expect(fixture.nativeElement.textContent).toContain(component.zonaHorariaUsuario);
  });

  it('no muestra ayudas en la configuración y siempre las desactiva al publicar', () => {
    const aulas = TestBed.inject(AulasService);
    const guardar = spyOn(aulas, 'crearRetoEnAula').and.returnValue(NEVER);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Ayudas y pociones');
    expect(fixture.nativeElement.textContent).not.toContain('AYUDAS');
    component.aulaParaActividad = {
      id: 'aula-1', nombre_aula: 'Aula de prueba', codigo_acceso: 'ABC123',
      estado: 'activa', fecha_creacion: new Date().toISOString(), anfitrion_id: 'usuario-1'
    };
    component.parametrosReto.ayudas_habilitadas = true;
    component.plazoSeleccionado = 'sin_limite';

    component.confirmarAgregarActividad();

    expect(guardar).toHaveBeenCalled();
    expect(guardar.calls.mostRecent().args[1].parametros.ayudas_habilitadas).toBeFalse();
  });

  it('añade una actividad al aula existente sin crear otra aula', () => {
    const aulas = TestBed.inject(AulasService);
    const crearAula = spyOn(aulas, 'crearAula').and.returnValue(NEVER);
    const crearActividad = spyOn(aulas, 'crearRetoEnAula').and.returnValue(NEVER);
    component.creandoNuevaAula = false;
    component.mostrarAgregarActividad = true;
    component.aulaParaActividad = {
      id: 'aula-existente', nombre_aula: 'Programación A', codigo_acceso: 'ABC123',
      estado: 'activa', fecha_creacion: new Date().toISOString(), anfitrion_id: 'docente-1'
    };
    component.pasoCrearAula = 3;
    component.parametrosReto.fases_seleccionadas = [1];
    fixture.detectChanges();

    const boton = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>
    ).find(elemento => elemento.textContent?.includes('AÑADIR ACTIVIDAD'));
    expect(boton).toBeDefined();
    boton!.click();

    expect(crearAula).not.toHaveBeenCalled();
    expect(crearActividad).toHaveBeenCalledOnceWith(
      'aula-existente',
      jasmine.objectContaining({ reto_nivel_id: 1 })
    );
  });

  it('protege también la lógica de creación ante un modo de actividad existente', () => {
    const aulas = TestBed.inject(AulasService);
    const crearAula = spyOn(aulas, 'crearAula').and.returnValue(NEVER);
    const crearActividad = spyOn(aulas, 'crearRetoEnAula').and.returnValue(NEVER);
    component.mostrarAgregarActividad = true;
    component.aulaParaActividad = {
      id: 'aula-segura', nombre_aula: 'Programación B', codigo_acceso: 'XYZ789',
      estado: 'activa', fecha_creacion: new Date().toISOString(), anfitrion_id: 'docente-1'
    };
    component.parametrosReto.fases_seleccionadas = [1];

    component.confirmarCrearAula();

    expect(crearAula).not.toHaveBeenCalled();
    expect(crearActividad).toHaveBeenCalled();
  });

  it('solo valida umbrales antiguos cuando se selecciona el nivel 2', () => {
    const crear = spyOn(TestBed.inject(AulasService), 'crearAula').and.returnValue(NEVER);
    const avisar = spyOn(TestBed.inject(NotificationService), 'show');
    component.parametrosReto.tiempo_3_estrellas = 200;
    component.parametrosReto.tiempo_2_estrellas = 100;
    component.nuevoNombreAula = 'Aula de prueba';
    component.nivelSeleccionado = 1;
    component.confirmarCrearAula();
    expect(crear).toHaveBeenCalledTimes(1);
    component.nivelSeleccionado = 2;
    component.confirmarCrearAula();
    expect(crear).toHaveBeenCalledTimes(1);
    expect(avisar).toHaveBeenCalledWith('El tiempo para 3⭐ debe ser menor al de 2⭐.', 'error');
  });

  it('recupera el avatar equipado al volver a cargar la pantalla principal', () => {
    const usuarios = TestBed.inject(UserService);
    spyOn(usuarios, 'fetchProfile').and.returnValue(of({
      nombre: 'Jugador', apellido: '', email: 'test@example.com', estrellas_totales: 1, avatar_actual_id: 81
    }));
    spyOn(usuarios, 'getAvatares').and.returnValue(of([
      { id: 81, url_imagen: 'assets/images/tienda/avatares/drakoaprendiz.png' }
    ]));
    (PantallaPrincipalComponent.prototype.ngOnInit as jasmine.Spy).and.callThrough();
    component.ngOnInit();
    expect(component.selectedAvatar).toBe('assets/images/tienda/avatares/drakoaprendiz.png');
  });
});
