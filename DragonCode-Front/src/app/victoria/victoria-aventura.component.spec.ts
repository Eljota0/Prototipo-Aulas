import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { VictoriaAventuraComponent } from './victoria-aventura.component';
import { NivelDosPrototipoComponent } from '../nivel-dos-prototipo/nivel-dos-prototipo.component';
import { NivelTresPrototipoComponent } from '../nivel-tres-prototipo/nivel-tres-prototipo.component';
import { NivelCuatroPrototipoComponent } from '../nivel-cuatro-prototipo/nivel-cuatro-prototipo.component';

describe('Victoria de aventura compartida', () => {
  it('distingue el resultado provisional del confirmado y emite la salida', async () => {
    await TestBed.configureTestingModule({ imports: [VictoriaAventuraComponent] }).compileComponents();
    const fixture = TestBed.createComponent(VictoriaAventuraComponent);
    fixture.componentRef.setInput('estrellas', 2);
    fixture.componentRef.setInput('mensaje', 'Guardando progreso y recompensa...');
    fixture.detectChanges();
    const dialogo: HTMLDialogElement = fixture.nativeElement.querySelector('dialog');
    expect(dialogo.matches(':modal')).toBeTrue();
    expect(dialogo.textContent).toContain('Resultado provisional');
    expect(dialogo.querySelectorAll('.victoria-estrella').length).toBe(2);
    fixture.componentRef.setInput('confirmado', true);
    fixture.componentRef.setInput('estrellas', 3);
    fixture.componentRef.setInput('mensaje', 'Progreso guardado');
    fixture.detectChanges();
    expect(dialogo.textContent).toContain('Este intento');
    expect(dialogo.textContent).not.toContain('Resultado provisional');
    expect(dialogo.querySelectorAll('.victoria-estrella').length).toBe(3);
    const salir = spyOn(fixture.componentInstance.salir, 'emit');
    dialogo.querySelector('button')!.click();
    expect(salir).toHaveBeenCalledTimes(1);
    fixture.destroy();
    expect(dialogo.open).toBeFalse();
  });
});

for (const [nivel, tipo] of [
  [2, NivelDosPrototipoComponent], [3, NivelTresPrototipoComponent],
  [4, NivelCuatroPrototipoComponent], [5, NivelCuatroPrototipoComponent]
] as const) {
  describe(`Final del nivel ${nivel}`, () => {
    beforeEach(async () => {
      spyOn(tipo.prototype, 'ngOnInit');
      spyOn(tipo.prototype, 'ngAfterViewInit');
      await TestBed.configureTestingModule({
        imports: [tipo],
        providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
      }).compileComponents();
    });
    for (const aula of [false, true]) {
      it(`usa exclusivamente la pantalla de ${aula ? 'aula' : 'aventura'}`, () => {
        const fixture = TestBed.createComponent<any>(tipo);
        const componente = fixture.componentInstance;
        spyOnProperty(componente, 'modoJuegoActual', 'get').and.returnValue(aula ? 'aula' : 'aventura');
        componente.esNivelCinco = nivel === 5;
        componente.nivelCompletado = true;
        componente.estrellas = 3;
        componente.progresoGuardado = true;
        fixture.detectChanges();
        expect(!!fixture.nativeElement.querySelector('app-victoria-aventura')).toBe(!aula);
        expect(!!fixture.nativeElement.querySelector('.celebracion-overlay')).toBe(aula);
        if (aula) expect(fixture.nativeElement.querySelector('.celebracion-overlay').textContent).toContain('VOLVER AL AULA');
        fixture.destroy();
      });
    }
  });
}
