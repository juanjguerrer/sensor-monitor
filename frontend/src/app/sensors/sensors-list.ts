import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { SensorsApi } from './sensors-api';
import {toSignal} from '@angular/core/rxjs-interop';

@Component({
  imports: [],
  selector: 'app-sensors-list',
  styleUrl: './sensors-list.scss',
  templateUrl: './sensors-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SensorsList {
  private readonly sensorsApi = inject(SensorsApi);
  private readonly query = this.sensorsApi.watchSensors();
  private readonly result = toSignal(this.query.valueChanges);

  protected readonly sensors = computed(() => {
    const result = this.result();
    return result?.dataState === 'complete' ? result.data.sensors : [];
  });
  protected readonly loading = computed(() => this.result()?.loading ?? true);
  protected readonly error = computed(() => this.result()?.error);

  protected retry() {
    this.query.refetch().catch(() => {
      // el error ya llega por valueChanges; aquí solo evitamos un rejection sin manejar
    });
  }
}
