import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { SensorsApi } from '../sensors-api';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { DatePipe, DecimalPipe } from '@angular/common';
import { CombinedGraphQLErrors } from '@apollo/client/errors';

@Component({
  imports: [
    DatePipe,
    DecimalPipe
  ],
  selector: 'app-sensor-anomalies',
  styleUrl: './sensor-anomalies.scss',
  templateUrl: './sensor-anomalies.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SensorAnomalies {
  private readonly sensorApi = inject(SensorsApi);
  readonly unit = input.required<string>();
  readonly id = input.required<number>();
  private readonly result = toSignal(
    toObservable(this.id).pipe(
      switchMap((sensorId) => this.sensorApi.watchSensorAnomalies(sensorId).valueChanges
    )
  ))
  protected readonly error = computed(() => this.result()?.error);
  protected readonly notEnoughReadings = computed(() => {
    const error = this.result()?.error;
    return CombinedGraphQLErrors.is(error) && error.errors.some((e) => e.extensions?.['maxZScore'] !== undefined);
  });
  protected readonly loading = computed(() => !this.error() && this.result()?.dataState !== 'complete',);

  protected readonly anomalies = computed(() => {
    const result = this.result();
    return result?.dataState === 'complete' ? result.data.anomalies : [];
  });

}
