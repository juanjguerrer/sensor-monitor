import { ChangeDetectionStrategy, Component, computed, inject, input, numberAttribute } from '@angular/core';
import { SensorsApi } from '../sensors-api';
import { DatePipe } from '@angular/common';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { RouterLink } from '@angular/router';

@Component({
  imports: [
    DatePipe,
    RouterLink
  ],
  selector: 'app-sensor-detail',
  styleUrl: './sensor-detail.scss',
  templateUrl: './sensor-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SensorDetail {
  private readonly sensorApi = inject(SensorsApi);
  readonly id = input.required({ transform: numberAttribute });

  private readonly result = toSignal(
    toObservable(this.id).pipe(
      switchMap((id) => this.sensorApi.watchSensorDetail(id).valueChanges)
    )
  )

  protected readonly error = computed(() => this.result()?.error);
  protected readonly loading = computed(() => !this.error() && this.result()?.dataState !== 'complete',);
  protected readonly notFound = computed(
    () => !this.loading() && !this.error() && this.sensor() === null,
  );
  protected readonly sensor = computed(() => {
    const result = this.result();
    return result?.dataState === 'complete' ? result.data.sensor : null;
  });

  protected readonly readings = computed(() => {
    const sensor = this.result();
    return sensor?.dataState === 'complete' ? sensor.data.readings : [];
  });
}
