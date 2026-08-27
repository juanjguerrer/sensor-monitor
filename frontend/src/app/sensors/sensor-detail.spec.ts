import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SensorDetail } from './sensor-detail';
import { ApolloTestingModule } from 'apollo-angular/testing';
import { provideRouter } from '@angular/router';

describe('SensorDetail', () => {
  let component: SensorDetail;
  let fixture: ComponentFixture<SensorDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SensorDetail, ApolloTestingModule],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(SensorDetail);
    fixture.componentRef.setInput('id', 1);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
