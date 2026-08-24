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
});
