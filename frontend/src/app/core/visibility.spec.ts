import { TestBed } from '@angular/core/testing';
import { Visibility } from './visibility';

describe('Visibility', () => {
  let service: Visibility;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Visibility);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
