import { ChangeDetectionStrategy, Component, computed, inject, input, numberAttribute, signal } from '@angular/core';
import { SensorsApi } from '../sensors-api';
import { DatePipe } from '@angular/common';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { Router, RouterLink } from '@angular/router';
import { SensorAnomalies } from '../sensor-anomalies/sensor-anomalies';
import { Toaster } from '../../core/toast/toaster';

@Component({
  imports: [
    DatePipe,
    RouterLink,
    SensorAnomalies
  ],
  selector: 'app-sensor-detail',
  styleUrl: './sensor-detail.scss',
  templateUrl: './sensor-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SensorDetail {
  private readonly sensorApi = inject(SensorsApi);
  private readonly router = inject(Router);
  private readonly toaster = inject(Toaster);
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

  protected readonly deleting = signal(false);
  protected readonly deleteError = signal<string | null>(null);

  protected async onDelete (id: number, name: string) {
    this.deleteError.set(null);
    if (confirm(`Are you sure you want to delete sensor "${name}"?`)) {
      this.deleting.set(true);
      this.sensorApi.deleteSensor(id).subscribe({
        next: async () => {
          this.deleting.set(false);
          this.toaster.success(`Sensor "${name}" deleted successfully.`);
          await this.router.navigate(['/sensors']);
        },
        error: () => {
          this.deleting.set(false);
          this.deleteError.set('Failed to delete sensor. Please try again.');
        },
      });
    }
  }
}
