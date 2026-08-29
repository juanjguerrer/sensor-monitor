import { ApolloServer } from '@apollo/server';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';
import { formatError } from './graphql/errorHandling';
import { hashPassword } from './auth/password';
import * as repository from './db/repository';
import { createLoaders } from './graphql/loaders';
import type { Context } from './graphql/context';

jest.mock('./db/repository');

const repo = jest.mocked(repository);

/**
 * Runs an operation through Apollo in-process — no HTTP, no listening socket.
 * Anonymous requests are refused by requireUser before any resolver reaches
 * the repository, so no database is involved either.
 */
async function run(query: string, userId: number | null = null) {
  // Fresh loaders per call, mirroring how createContext builds them per
  // request — a shared cache across operations would not model reality.
  const contextValue: Context = { userId, loaders: createLoaders() };
  const server = new ApolloServer<Context>({ typeDefs, resolvers, formatError });
  const response = await server.executeOperation({ query }, { contextValue });
  await server.stop();

  if (response.body.kind !== 'single') {
    throw new Error('expected a single result');
  }
  return response.body.singleResult;
}

/**
 * Every field in the schema except login. Adding a field to schema.ts without
 * adding it here — or without a guard — is what this file exists to catch.
 */
const guardedFields: [string, string][] = [
  ['Query.sensors', '{ sensors { id } }'],
  ['Query.sensor', '{ sensor(id: 1) { id } }'],
  ['Query.locations', '{ locations { id } }'],
  ['Query.readings', '{ readings(sensorId: 1) { id } }'],
  ['Query.anomalies', '{ anomalies(sensorId: 1) { readingId } }'],
  ['Mutation.createSensor', 'mutation { createSensor(name: "a", locationId: 1, unit: "C", type: "t") { id } }'],
  ['Mutation.updateSensor', 'mutation { updateSensor(id: 1, name: "a", locationId: 1, unit: "C", type: "t") { id } }'],
  ['Mutation.deleteSensor', 'mutation { deleteSensor(id: 1) }'],
  ['Mutation.addReading', 'mutation { addReading(sensorId: 1, value: 1) { id } }'],
  ['Query.me', '{ me { id } }'],
];

describe('anonymous access to the schema', () => {
  it.each(guardedFields)('%s is refused with UNAUTHENTICATED', async (_label, query) => {
    const result = await run(query);

    expect(result.errors?.[0]?.extensions?.code).toBe('UNAUTHENTICATED');
  });

  it.each(guardedFields)('%s returns no data to an anonymous caller', async (_label, query) => {
    const result = await run(query);

    // A non-null field collapses `data` to null entirely; a nullable one like
    // `sensor` yields { sensor: null }. Either way nothing may carry a value.
    const values = Object.values(result.data ?? {});
    expect(values.every((value) => value === null)).toBe(true);
  });

  it('never reaches the data layer for any of them', async () => {
    for (const [, query] of guardedFields) {
      await run(query);
    }

    expect(repo.listSensors).not.toHaveBeenCalled();
    expect(repo.getSensorById).not.toHaveBeenCalled();
    expect(repo.listReadings).not.toHaveBeenCalled();
    expect(repo.createSensor).not.toHaveBeenCalled();
    expect(repo.updateSensor).not.toHaveBeenCalled();
    expect(repo.deleteSensor).not.toHaveBeenCalled();
    expect(repo.addReading).not.toHaveBeenCalled();
    expect(repo.findUserById).not.toHaveBeenCalled();
  });
});

describe('login is the one exception', () => {
  it('succeeds without a token', async () => {
    repo.findUserByUsername.mockResolvedValue({
      id: 7,
      username: 'admin',
      email: 'admin@example.com',
      passwordHash: await hashPassword('correct'),
    });

    const result = await run('mutation { login(username: "admin", password: "correct") { token } }');

    expect(result.errors).toBeUndefined();
    expect((result.data?.login as { token: string }).token).toBeTruthy();
  });

  it('returns the user through the schema without leaking the hash', async () => {
    repo.findUserByUsername.mockResolvedValue({
      id: 7,
      username: 'admin',
      email: 'admin@example.com',
      passwordHash: await hashPassword('correct'),
    });

    const result = await run(
      'mutation { login(username: "admin", password: "correct") { token user { id username email } } }',
    );

    expect(result.errors).toBeUndefined();
    expect((result.data?.login as { user: unknown }).user).toEqual({
      id: 7,
      username: 'admin',
      email: 'admin@example.com',
    });
  });

  it('reports bad credentials rather than a missing token', async () => {
    repo.findUserByUsername.mockResolvedValue(null);

    const result = await run('mutation { login(username: "nobody", password: "whatever") { token } }');

    // Its own code, distinct from an unauthenticated request — which is how a
    // client tells "your password was wrong" from "your session expired".
    expect(result.errors?.[0]?.extensions?.code).toBe('INVALID_CREDENTIALS');
    expect(result.errors?.[0]?.message).toBe('Invalid username or password');
  });
});