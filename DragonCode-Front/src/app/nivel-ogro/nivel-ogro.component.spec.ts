import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NivelOgroComponent } from './nivel-ogro.component';

describe('NivelOgroComponent', () => {
  let component: NivelOgroComponent;
  let fixture: ComponentFixture<NivelOgroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NivelOgroComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(NivelOgroComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
