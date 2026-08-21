import { GraphQLError } from 'graphql';
import { detectAnomalies, maxZScore } from './analytics/detectAnomalies';
import { addReading, createSensor, deleteSensor, getSensorById, listReadings, listSensors, updateSensor } from './db/repository';
import type { Resolvers } from './generated/types';

export const resolvers = {
  Query: {
    sensors: async () => await listSensors(),
    sensor: async (_, { id }) => await getSensorById(id),
    readings: async (_, { sensorId, limit }) => {
      const readings = await listReadings(sensorId, limit ?? 10
      );
      return readings.map(reading => ({
        ...reading,
        recordedAt: reading.recordedAt.toISOString()
      }));
    },
    anomalies: async (_, { sensorId, limit, threshold }) => {
      const t = threshold ?? 3;
      if (t <= 0 || t > 10) {
        throw new GraphQLError(`Threshold must be a positive number greater than 0 and less than or equal to 10.`, {
          extensions: {
            code: 'BAD_USER_INPUT'
          }
        });
      }
      const readings = await listReadings(sensorId, limit ?? 50);
      const maxZ = maxZScore(readings.length);
      if (maxZ <= t) {
        throw new GraphQLError(`Not enough readings to detect anomalies with the given threshold. Maximum possible z-score is ${maxZ.toFixed(2)}.`, {
          extensions: {
            code: 'BAD_USER_INPUT',
            maxZScore: maxZ
          }
        });
      }
      const anomalies = detectAnomalies(readings, t);
      return anomalies.map(anomaly => ({
        ...anomaly,
        timestamp: anomaly.timestamp.toISOString()
      }));
    }
  },
  Mutation: {
    createSensor: async (_, {name, locationId, unit, type}) => {
      return await createSensor({ name, locationId, unit, type });
    },
    updateSensor: async (_, {id, name, locationId, unit, type}) => {
      return await updateSensor({ id, name, locationId, unit, type });
    },
    deleteSensor: async (_, {id}) => {
      return await deleteSensor(id);
    },
    addReading: async (_, {sensorId, value}) => {
      const newReading = await addReading(sensorId, value);
      return { ...newReading, recordedAt: newReading.recordedAt.toISOString() };
    }
  },
} satisfies Resolvers;