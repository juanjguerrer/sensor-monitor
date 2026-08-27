import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ApolloTestingModule } from 'apollo-angular/testing';
import { SensorAnomalies } from './sensor-anomalies';

describe('SensorAnomalies', () => {
  let component: SensorAnomalies;
  let fixture: ComponentFixture<SensorAnomalies>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SensorAnomalies, ApolloTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(SensorAnomalies);
    fixture.componentRef.setInput('id', 1);
    fixture.componentRef.setInput('unit', '°C');
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
