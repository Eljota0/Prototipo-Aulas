import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapaAventuraComponent } from './mapa-aventura.component';

describe('MapaAventuraComponent', () => {
  let component: MapaAventuraComponent;
  let fixture: ComponentFixture<MapaAventuraComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapaAventuraComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MapaAventuraComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
