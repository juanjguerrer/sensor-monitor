import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ApolloTestingController, ApolloTestingModule } from 'apollo-angular/testing';
import { SensorsList } from './sensors-list';

describe('SensorsList', () => {
  let fixture: ComponentFixture<SensorsList>;
  let controller: ApolloTestingController;

  const names = () =>
    Array.from(fixture.nativeElement.querySelectorAll('.sensor__name')).map((el) =>
      (el as HTMLElement).textContent?.trim(),
    );

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SensorsList, ApolloTestingModule],
      providers: [provideRouter([])],
    }).compileComponents();

    controller = TestBed.inject(ApolloTestingController);
    fixture = TestBed.createComponent(SensorsList);
    await fixture.whenStable();
  });

  afterEach(() => {
    controller.verify();
  });

  it('shows skeletons until the query answers', () => {
    expect(fixture.nativeElement.querySelector('.sensor--skeleton')).not.toBeNull();

    controller.expectOne('GetSensors');
  });

  it('renders the sensors once they arrive', async () => {
    controller.expectOne('GetSensors').flushData({
      sensors: [
        {
          __typename: 'Sensor',
          id: 1,
          name: 'Boiler temp',
          location: { __typename: 'Location', id: 2, name: 'Boiler room' },
        },
      ],
    });

    await fixture.whenStable();

    expect(names()).toEqual(['Boiler temp']);
    expect(fixture.nativeElement.querySelector('.sensor--skeleton')).toBeNull();
  });

  it('shows an error panel when the query fails', async () => {
    controller.expectOne('GetSensors').graphqlErrors([{ message: 'boom' }]);

    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    expect(names()).toEqual([]);
  });

  it('shows the empty state when there are no sensors', async () => {
    controller.expectOne('GetSensors').flushData({ sensors: [] });

    await fixture.whenStable();

    expect(fixture.nativeElement.textContent).toContain('No sensors yet');
  });
});