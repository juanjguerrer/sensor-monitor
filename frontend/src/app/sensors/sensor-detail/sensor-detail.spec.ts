import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ApolloTestingController, ApolloTestingModule } from 'apollo-angular/testing';
import { SensorDetail } from './sensor-detail';

describe('SensorDetail', () => {
  let fixture: ComponentFixture<SensorDetail>;
  let controller: ApolloTestingController;

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const find = (selector: string) => (fixture.nativeElement as HTMLElement).querySelector(selector);

  const sensor = {
    __typename: 'Sensor',
    id: 1,
    name: 'Boiler temp',
    unit: '°C',
    type: 'temperature',
    location: { __typename: 'Location', id: 2, name: 'Boiler room' },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SensorDetail, ApolloTestingModule],
      providers: [provideRouter([])],
    }).compileComponents();

    controller = TestBed.inject(ApolloTestingController);
    fixture = TestBed.createComponent(SensorDetail);
    fixture.componentRef.setInput('id', 1);
    await fixture.whenStable();
  });

  afterEach(() => {
    controller.verify();
  });

  it('shows skeletons until the query answers', () => {
    expect(find('.reading--skeleton')).not.toBeNull();

    controller.expectOne('GetSensorDetail');
  });

  it('renders the sensor and its readings', async () => {
    controller.expectOne('GetSensorDetail').flushData({
      sensor,
      readings: [
        { __typename: 'Reading', id: 10, value: 72.4, recordedAt: '2026-08-27T10:00:00.000Z' },
      ],
    });
    await fixture.whenStable();

    // The anomalies child only mounts once a sensor exists, so its query
    // appears at this point and not before.
    controller.expectOne('GetAnomalies').flushData({ anomalies: [] });
    await fixture.whenStable();

    expect(find('.detail__name')?.textContent?.trim()).toBe('Boiler temp');
    expect(text()).toContain('Boiler room');
    expect(find('.reading__value')?.textContent).toContain('72.4');
    expect(find('.reading--skeleton')).toBeNull();
  });

  it('shows the not-found state when the sensor is null', async () => {
    controller.expectOne('GetSensorDetail').flushData({ sensor: null, readings: [] });
    await fixture.whenStable();

    expect(text()).toContain('Sensor not found');
    // Not found is a normal outcome, not a failure: no alert may be rendered.
    expect(find('[role="alert"]')).toBeNull();
  });

  it('shows the error state when the query fails', async () => {
    controller.expectOne('GetSensorDetail').graphqlErrors([{ message: 'boom' }]);
    await fixture.whenStable();

    expect(find('[role="alert"]')).not.toBeNull();
    expect(text()).toContain("Couldn't load this sensor");
    expect(text()).not.toContain('Sensor not found');
  });
});
