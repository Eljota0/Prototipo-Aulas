import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NivelAventuraComponent } from './nivel-aventura.component';

describe('NivelAventuraComponent', () => {
  let component: NivelAventuraComponent;
  let fixture: ComponentFixture<NivelAventuraComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NivelAventuraComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(NivelAventuraComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
