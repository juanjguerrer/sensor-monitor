import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { SensorListItem, SensorsService } from './sensors.service';
import {toSignal} from '@angular/core/rxjs-interop';
import { JsonPipe } from '@angular/common';

@Component({
  imports: [
    JsonPipe
  ],
  selector: 'app-sensors',
  styleUrl: './sensors.scss',
  templateUrl: './sensors.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Sensors {
  private readonly sensorsService = inject(SensorsService);
  sensors = toSignal(this.sensorsService.getSensors(), { initialValue: [] as SensorListItem[] });
}
