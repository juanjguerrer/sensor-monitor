import { inject, Service } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { GetAnomaliesDocument, GetSensorDetailDocument, GetSensorsDocument, GetSensorsQuery } from '../generated/graphql';
export type SensorListItem = GetSensorsQuery['sensors'][number];
const LIVE_INTERVAL = 5000;
@Service()
export class SensorsApi {
  private readonly apollo = inject(Apollo);

  watchSensors() {
    return this.apollo.watchQuery({
      query: GetSensorsDocument,
      errorPolicy: 'all',
    });
  }

  watchSensorDetail(id: number, limit?: number) {
    return this.apollo.watchQuery({
      query: GetSensorDetailDocument,
      variables: { id, limit },
      errorPolicy: 'all',
      pollInterval: LIVE_INTERVAL,
    });
  }

  watchSensorAnomalies(sensorId: number, limit?: number, threshold?: number) {
    return this.apollo.watchQuery({
      query: GetAnomaliesDocument,
      variables: { sensorId, limit, threshold },
      errorPolicy: 'all',
      pollInterval: LIVE_INTERVAL,
    });
  }
}