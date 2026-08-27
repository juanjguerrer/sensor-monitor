import { inject, Service } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { map } from 'rxjs';
import { GetSensorsDocument, GetSensorsQuery } from '../generated/graphql';
export type SensorListItem = GetSensorsQuery['sensors'][number];
@Service()
export class SensorsApi {
  private readonly apollo = inject(Apollo);

  watchSensors() {
    return this.apollo.watchQuery({
      query: GetSensorsDocument,
      errorPolicy: 'all',
    });
  }
}