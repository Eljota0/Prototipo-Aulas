import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LayoutJuegoComponent } from './layout-juego.component';

describe('LayoutJuegoComponent', () => {
  let component: LayoutJuegoComponent;
  let fixture: ComponentFixture<LayoutJuegoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LayoutJuegoComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LayoutJuegoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
