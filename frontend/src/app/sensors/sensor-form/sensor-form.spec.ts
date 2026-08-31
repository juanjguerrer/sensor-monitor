import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ApolloTestingController, ApolloTestingModule } from 'apollo-angular/testing';
import { SensorForm } from './sensor-form';

describe('SensorForm', () => {
  let fixture: ComponentFixture<SensorForm>;
  let controller: ApolloTestingController;

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const find = <T extends HTMLElement>(selector: string) =>
    (fixture.nativeElement as HTMLElement).querySelector<T>(selector);

  const locations = {
    locations: [
      { __typename: 'Location', id: 2, name: 'Boiler room' },
      { __typename: 'Location', id: 5, name: 'Cold store' },
    ],
  };

  const sensor = {
    sensor: {
      __typename: 'Sensor',
      id: 3,
      name: 'Boiler temp',
      unit: '°C',
      type: 'temperature',
      location: { __typename: 'Location', id: 5 },
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SensorForm, ApolloTestingModule],
      providers: [provideRouter([])],
    }).compileComponents();

    controller = TestBed.inject(ApolloTestingController);
    fixture = TestBed.createComponent(SensorForm);
  });

  afterEach(() => {
    controller.verify();
  });

  describe('create mode', () => {
    beforeEach(async () => {
      // No id input: the router never sets it on /sensors/new.
      await fixture.whenStable();
    });

    it('never asks for a sensor', async () => {
      // The guard in the switchMap must short-circuit to of(null) rather than
      // querying with undefined — which previously became NaN on the wire.
      controller.expectNone('GetSensorForEdit');

      controller.expectOne('GetLocations').flushData(locations);
      await fixture.whenStable();
    });

    it('waits for locations before showing the form', async () => {
      expect(find('.sensor-form__bar')).not.toBeNull();
      expect(find('form')).toBeNull();

      controller.expectOne('GetLocations').flushData(locations);
      await fixture.whenStable();

      expect(find('form')).not.toBeNull();
      expect(find('.sensor-form__bar')).toBeNull();
      expect(text()).toContain('New sensor');
    });

    it('offers every location, with nothing preselected', async () => {
      controller.expectOne('GetLocations').flushData(locations);
      await fixture.whenStable();

      const select = find<HTMLSelectElement>('#locationId');
      expect(Array.from(select!.options).map((option) => option.textContent?.trim())).toEqual([
        'Select a location…',
        'Boiler room',
        'Cold store',
      ]);
      expect(select!.value).toBe('');
    });
  });

  describe('edit mode', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('id', 3);
    });

    it('waits for both sources before showing the form', async () => {
      await fixture.whenStable();
      expect(find('form')).toBeNull();

      // Only one of the two answers: the form must still not render, which is
      // what the `||` in the loading derivation is for.
      controller.expectOne('GetSensorForEdit').flushData(sensor);
      await fixture.whenStable();
      expect(find('form')).toBeNull();

      controller.expectOne('GetLocations').flushData(locations);
      await fixture.whenStable();
      expect(find('form')).not.toBeNull();
    });

    it('populates the fields from the loaded sensor', async () => {
      await fixture.whenStable();
      controller.expectOne('GetLocations').flushData(locations);
      controller.expectOne('GetSensorForEdit').flushData(sensor);
      await fixture.whenStable();

      expect(find<HTMLInputElement>('#name')!.value).toBe('Boiler temp');
      expect(find<HTMLInputElement>('#type')!.value).toBe('temperature');
      expect(find<HTMLInputElement>('#unit')!.value).toBe('°C');
      expect(text()).toContain('Edit sensor');
    });

    it('selects the sensor’s own location', async () => {
      await fixture.whenStable();
      controller.expectOne('GetLocations').flushData(locations);
      controller.expectOne('GetSensorForEdit').flushData(sensor);
      await fixture.whenStable();

      // The select is string-valued and location.id is a number, so the effect
      // has to convert. Without String(), nothing matches and the field silently
      // falls back to the placeholder.
      expect(find<HTMLSelectElement>('#locationId')!.value).toBe('5');
    });

    it('shows the error panel, not the form, when the sensor fails to load', async () => {
      await fixture.whenStable();
      controller.expectOne('GetLocations').flushData(locations);
      controller.expectOne('GetSensorForEdit').graphqlErrors([{ message: 'boom' }]);
      await fixture.whenStable();

      expect(find('[role="alert"]')).not.toBeNull();
      expect(find('form')).toBeNull();
      // Loading must stop on failure; otherwise the skeleton spins forever.
      expect(find('.sensor-form__bar')).toBeNull();
    });
  });
});
