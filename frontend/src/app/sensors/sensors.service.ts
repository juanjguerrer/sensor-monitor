import { inject, Service } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { map } from 'rxjs';
import { GetSensorsDocument, GetSensorsQuery } from '../generated/graphql';
export type SensorListItem = GetSensorsQuery['sensors'][number];
@Service()
export class SensorsService {
  private readonly apollo = inject(Apollo);

  getSensors() {
    return this.apollo
      .watchQuery({ query: GetSensorsDocument })
      .valueChanges.pipe(map((result) => result.data?.sensors ?? []));
  }
}