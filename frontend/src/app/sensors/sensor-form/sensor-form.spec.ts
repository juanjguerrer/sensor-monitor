import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ApolloTestingModule } from 'apollo-angular/testing';
import { SensorForm } from './sensor-form';

describe('SensorForm', () => {
  let component: SensorForm;
  let fixture: ComponentFixture<SensorForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SensorForm, ApolloTestingModule],
      providers: [provideRouter([])],
    }).compileComponents();

    // No id set: this is the create case, where the input stays undefined.
    fixture = TestBed.createComponent(SensorForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
