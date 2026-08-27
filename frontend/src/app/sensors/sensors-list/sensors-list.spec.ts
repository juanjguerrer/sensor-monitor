import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ApolloTestingModule } from 'apollo-angular/testing';
import { SensorsList } from './sensors-list';

describe('SensorsList', () => {
  let component: SensorsList;
  let fixture: ComponentFixture<SensorsList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SensorsList, ApolloTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(SensorsList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
