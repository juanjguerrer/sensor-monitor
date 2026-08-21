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