import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { NivelOgroComponent } from './nivel-ogro.component';

describe('NivelOgroComponent', () => {
  let component: NivelOgroComponent;
  let fixture: ComponentFixture<NivelOgroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NivelOgroComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
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
