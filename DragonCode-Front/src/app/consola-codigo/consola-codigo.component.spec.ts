import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConsolaCodigoComponent } from './consola-codigo.component';

describe('ConsolaCodigoComponent', () => {
  let component: ConsolaCodigoComponent;
  let fixture: ComponentFixture<ConsolaCodigoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConsolaCodigoComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ConsolaCodigoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('muestra el código configurable sin crear HTML ejecutable', () => {
    component.modoPlantilla = true;
    component.lineas = [{
      texto: '<img src=x onerror="alert(1)"> si (fabrica.tieneMateriales)',
      color: '#fff',
      tieneError: false
    }];

    fixture.detectChanges();

    const editor: HTMLElement = fixture.nativeElement;
    expect(editor.querySelector('img')).toBeNull();
    expect(editor.querySelector('.syntax-keyword')?.textContent).toBe('si');
    expect(editor.textContent).toContain('<img src=x onerror="alert(1)">');
  });
});
