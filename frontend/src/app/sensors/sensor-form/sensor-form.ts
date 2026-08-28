import { ChangeDetectionStrategy, Component, computed, effect, inject, input, numberAttribute, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { form, FormField, required, submit } from '@angular/forms/signals';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom, of, switchMap } from 'rxjs';
import { SensorsApi } from '../sensors-api';
import { Toaster } from '../../core/toast/toaster';

interface SensorFormData {
  name: string;
  locationId: string;
  type: string;
  unit: string;
}

@Component({
  imports: [FormField, RouterLink],
  selector: 'app-sensor-form',
  styleUrl: './sensor-form.scss',
  templateUrl: './sensor-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SensorForm {
  private readonly sensorsApi = inject(SensorsApi);
  private readonly router = inject(Router);
  private readonly toaster = inject(Toaster);
  constructor() {
    effect(() => {
      // fill the form model with the sensor data when it is loaded
      const sensor = this.sensorResult();
      if (sensor?.data && sensor.data.sensor) {
        const s = sensor.data.sensor;
        this.model.set({
          name: s.name,
          locationId: String(s.location.id),
          type: s.type,
          unit: s.unit,
        });
      }
    });
  }

  readonly id = input<number | undefined>(undefined, { transform: (v) => (v == null ? undefined : numberAttribute(v))
  });

  private readonly sensorResult = toSignal(
    toObservable(this.id).pipe(
      switchMap((id) => (id == null ? of(null) : this.sensorsApi.getSensor(id))
      ),
    ),
  );

  private readonly locationsResult = toSignal(this.sensorsApi.watchLocations().valueChanges);

  private readonly model = signal<SensorFormData>({
    name: '',
    locationId: '',
    type: '',
    unit: '',
  });

  protected readonly sensorForm = form(this.model, (p) => {
    required(p.name, { message: 'Name is required' });
    required(p.type, { message: 'Type is required' });
    required(p.unit, { message: 'Unit is required' });
    required(p.locationId, { message: 'Location is required' });
  });

  protected readonly submitError = signal<string | null>(null);
  // ── yours ──
  // isEdit
  protected readonly isEdit = computed(() => this.id() !== undefined);
  // loading
  protected readonly loading = computed(() => {
    const error = this.loadError();
    // if not null, check if dataState !== 'complete'
    const sensor = this.sensorResult();
    const locations = this.locationsResult();

    const sensorLoading = sensor === undefined;
    const locationsLoading = locations?.dataState !== 'complete';
    return !error && (sensorLoading || locationsLoading);
  });
  // loadError
  protected readonly loadError = computed(
    () => this.sensorResult()?.error ?? this.locationsResult()?.error,
  );
  // locations
  protected readonly locations = computed(() => {
    const locations = this.locationsResult();
    return locations?.dataState === 'complete' ? locations.data.locations : [];
  });
  // ──────────

  protected async onSubmit(event: SubmitEvent) {
    event.preventDefault();
    this.submitError.set(null);
    await submit(this.sensorForm, async () => {
      const data = this.model();
      try {
        const id = this.id();
        if (id !== undefined) {
          await firstValueFrom(this.sensorsApi.updateSensor({
            id,
            name: data.name,
            locationId: Number(data.locationId),
            type: data.type,
            unit: data.unit,
          }));
          this.toaster.success('Sensor updated successfully');
        } else {
          await firstValueFrom(this.sensorsApi.createSensor({
            name: data.name,
            locationId: Number(data.locationId),
            type: data.type,
            unit: data.unit,
          }));
        }
        this.toaster.success('Sensor saved successfully');
        await this.router.navigate(['/sensors']);
      } catch (error) {
        console.error(error);
        this.submitError.set('An error occurred while saving the sensor.');
        this.toaster.error('An error occurred while saving the sensor.' + `${error}`);
      }
    });
  }
}