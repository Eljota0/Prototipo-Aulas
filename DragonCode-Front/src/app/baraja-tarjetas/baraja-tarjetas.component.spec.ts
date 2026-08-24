import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BarajaTarjetasComponent } from './baraja-tarjetas.component';

describe('BarajaTarjetasComponent', () => {
  let component: BarajaTarjetasComponent;
  let fixture: ComponentFixture<BarajaTarjetasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BarajaTarjetasComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BarajaTarjetasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
