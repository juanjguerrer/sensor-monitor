import { inject, Service } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { CreateSensorDocument, DeleteSensorDocument, GetAnomaliesDocument, GetLocationsDocument, GetSensorDetailDocument, GetSensorForEditDocument, GetSensorsDocument, GetSensorsQuery, UpdateSensorDocument } from '../generated/graphql';
export type SensorListItem = GetSensorsQuery['sensors'][number];

export interface SensorInput {
  id: number;
  name: string;
  locationId: number;
  type: string;
  unit: string;
}
@Service()
export class SensorsApi {
  private readonly apollo = inject(Apollo);

  watchSensors() {
    return this.apollo.watchQuery({
      query: GetSensorsDocument,
      errorPolicy: 'all',
    });
  }

  watchSensorDetail(id: number, pollInterval: number, limit?: number) {
    return this.apollo.watchQuery({
      query: GetSensorDetailDocument,
      variables: { id, limit },
      errorPolicy: 'all',
      pollInterval,
      fetchPolicy: 'cache-and-network'
    });
  }

  watchSensorAnomalies(sensorId: number, pollInterval: number, limit?: number, threshold?: number) {
    return this.apollo.watchQuery({
      query: GetAnomaliesDocument,
      variables: { sensorId, limit, threshold },
      errorPolicy: 'all',
      pollInterval,
      fetchPolicy: 'cache-and-network'
    });
  }

  watchLocations() {
    return this.apollo.watchQuery({
      query: GetLocationsDocument,
      errorPolicy: 'all',
    });
  }

  getSensor(id: number) {
    return this.apollo.query({
      query: GetSensorForEditDocument,
      variables: { id },
      errorPolicy: 'all',
    });
  }

  createSensor(input: Omit<SensorInput, 'id'>) {
    return this.apollo.mutate({
      mutation: CreateSensorDocument,
      variables: input,
      refetchQueries: [{ query: GetSensorsDocument }],
    });
  }

  updateSensor(input: SensorInput) {
    return this.apollo.mutate({
      mutation: UpdateSensorDocument,
      variables: input,
    });
  }

  deleteSensor(id: number) {
    return this.apollo.mutate({
      mutation: DeleteSensorDocument,
      variables: { id },
      update: (cache) => {
        cache.evict({ id: cache.identify({ __typename: 'Sensor', id }) });
        cache.gc();
      },
    });
  }
}