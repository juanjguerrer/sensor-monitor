import { TestBed } from '@angular/core/testing';
import { ApolloTestingModule } from 'apollo-angular/testing';
import { SensorsApi } from './sensors-api';

describe('SensorsApi', () => {
  let service: SensorsApi;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ApolloTestingModule],
    });
    service = TestBed.inject(SensorsApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
