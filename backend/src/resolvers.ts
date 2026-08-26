import { GraphQLError } from 'graphql';
import { detectAnomalies, maxZScore } from './analytics/detectAnomalies';
import { addReading, createSensor, deleteSensor, findUserByUsername, getLocationById, getSensorById, listReadings, listSensors, updateSensor } from './db/repository';
import type { Resolvers } from './generated/types';
import { sign } from './auth/token';
import { comparePassword } from './auth/password';
import { InvalidCredentialsError } from './auth/errors';
import { requireUser } from './graphql/guards';
import { NotFoundError } from './db/errors';

// A real bcrypt hash. Used when the username doesn't exist, so a failed login
// takes the same ~70ms either way. bcrypt only needs the salt (first 29 chars)
// to do the work, so which password this belongs to is irrelevant.
const DUMMY_PASSWORD_HASH = '$2b$10$CwTycUXWue0Thq9StjUM0uJ8Q1P5h6Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1Z1';

export const resolvers = {
  Query: {
    sensors: async (_, _2, context) => {
      requireUser(context);
      return await listSensors();
    },
    sensor: async (_, { id }, context) => {
      requireUser(context);
      return await getSensorById(id);
    },
    readings: async (_, { sensorId, limit }, context) => {
      requireUser(context);
      const readings = await listReadings(sensorId, limit ?? 10
      );
      return readings.map(reading => ({
        ...reading,
        recordedAt: reading.recordedAt.toISOString()
      }));
    },
    anomalies: async (_, { sensorId, limit, threshold }, context) => {
      requireUser(context);
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
    },
  },
  Mutation: {
    createSensor: async (_, {name, locationId, unit, type}, context) => {
      const userId = requireUser(context);
      return await createSensor({ name, locationId, unit, type }, userId);
    },
    updateSensor: async (_, {id, name, locationId, unit, type}, context) => {
      const userId = requireUser(context);
      return await updateSensor({ id, name, locationId, unit, type }, userId);
    },
    deleteSensor: async (_, {id}, context) => {
      requireUser(context);
      return await deleteSensor(id);
    },
    addReading: async (_, {sensorId, value}, context) => {
      requireUser(context);
      const newReading = await addReading(sensorId, value);
      return { ...newReading, recordedAt: newReading.recordedAt.toISOString() };
    },
    login: async (_, { username, password }) => {
      const user = await findUserByUsername(username);
      const hash = user ? user.passwordHash : DUMMY_PASSWORD_HASH;
      const valid = await comparePassword(password, hash);
      if (!user || !valid) {
        throw new InvalidCredentialsError();
      }
      const token = sign(user.id);
      return { token };
    }
  },
  Sensor:  {
    location: async (sensor, _args, context) => {
      return await context.loaders.location.load(sensor.locationId);
    }
  },
} satisfies Resolvers;