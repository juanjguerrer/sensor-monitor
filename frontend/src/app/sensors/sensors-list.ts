import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SensorListItem, SensorsApi } from './sensors-api';
import {toSignal} from '@angular/core/rxjs-interop';
import { JsonPipe } from '@angular/common';

@Component({
  imports: [
    JsonPipe
  ],
  selector: 'app-sensors-list',
  styleUrl: './sensors-list.scss',
  templateUrl: './sensors-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SensorsList {
  private readonly sensorsApi = inject(SensorsApi);
  sensors = toSignal(this.sensorsApi.getSensors(), { initialValue: [] as SensorListItem[] });
}
