import { GraphQLError } from 'graphql';
import { resolvers } from './resolvers';
import { UnauthenticatedError, InvalidCredentialsError } from './auth/errors';
import { hashPassword } from './auth/password';
import { verify } from './auth/token';
import * as repository from './db/repository';
import type { Context } from './graphql/context';

// The repository is the boundary these tests stop at: no pool, no Postgres.
// That is only possible because db/ takes plain values rather than a Context.
jest.mock('./db/repository');

const repo = jest.mocked(repository);

const signedIn: Context = { userId: 42 };
const anonymous: Context = { userId: null };

/**
 * Resolvers are declared with three parameters, so parent and info are never
 * touched. `{}` stands in for parent; info is simply not passed.
 */
const parent = {};

afterEach(() => {
  jest.clearAllMocks();
});

describe('every guarded field refuses an anonymous caller', () => {
  it('rejects Query.sensors', async () => {
    await expect(resolvers.Query.sensors(parent, {}, anonymous)).rejects.toThrow(UnauthenticatedError);
  });

  it('rejects Mutation.deleteSensor', async () => {
    await expect(resolvers.Mutation.deleteSensor(parent, { id: 1 }, anonymous)).rejects.toThrow(
      UnauthenticatedError,
    );
  });

  it('refuses before touching the database', async () => {
    // The important half: a rejected request must not reach the data layer at
    // all, rather than being filtered after the query has already run.
    await expect(resolvers.Query.sensors(parent, {}, anonymous)).rejects.toThrow(UnauthenticatedError);
    expect(repo.listSensors).not.toHaveBeenCalled();
  });
});

// Schema defaults (limit: Int = 10) are applied by GraphQL before a resolver
// runs, which is why the generated args type marks limit as required rather
// than optional. Calling the resolver directly means supplying it.
describe('Query.readings', () => {
  it('converts recordedAt to an ISO string for the wire', async () => {
    const recordedAt = new Date('2026-08-23T10:00:00.000Z');
    repo.listReadings.mockResolvedValue([{ id: 1, sensorId: 1, value: 50, recordedAt }]);

    const result = await resolvers.Query.readings(parent, { sensorId: 1, limit: 10 }, signedIn);

    expect(result[0]?.recordedAt).toBe('2026-08-23T10:00:00.000Z');
  });

  it('passes the limit through to the repository', async () => {
    repo.listReadings.mockResolvedValue([]);

    await resolvers.Query.readings(parent, { sensorId: 1, limit: 25 }, signedIn);

    expect(repo.listReadings).toHaveBeenCalledWith(1, 25);
  });
});

describe('Query.anomalies', () => {
  it('rejects a threshold outside the usable range', async () => {
    await expect(
      resolvers.Query.anomalies(parent, { sensorId: 1, limit: 50, threshold: 0 }, signedIn),
    ).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });

    expect(repo.listReadings).not.toHaveBeenCalled();
  });

  it('refuses a batch too small for the threshold to be reachable', async () => {
    // Max possible z-score for n samples is (n-1)/sqrt(n), so threshold 3 is
    // unreachable below 11 readings. Returning [] would imply "no anomalies".
    repo.listReadings.mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => ({ id: i, sensorId: 1, value: 50, recordedAt: new Date() })),
    );

    await expect(
      resolvers.Query.anomalies(parent, { sensorId: 1, limit: 50, threshold: 3 }, signedIn),
    ).rejects.toBeInstanceOf(GraphQLError);
  });
});

describe('Mutation.createSensor', () => {
  it('passes the authenticated user id down to the repository', async () => {
    repo.createSensor.mockResolvedValue({ id: 1, name: 'S', locationId: 1, unit: 'C', type: 'temp' });

    await resolvers.Mutation.createSensor(
      parent,
      { name: 'S', locationId: 1, unit: 'C', type: 'temp' },
      signedIn,
    );

    expect(repo.createSensor).toHaveBeenCalledWith(
      { name: 'S', locationId: 1, unit: 'C', type: 'temp' },
      42,
    );
  });
});

describe('Mutation.login', () => {
  it('returns a token that verifies back to the user id', async () => {
    repo.findUserByUsername.mockResolvedValue({ id: 7, passwordHash: await hashPassword('correct') });

    const result = await resolvers.Mutation.login(parent, { username: 'admin', password: 'correct' });

    expect(verify(result.token)).toEqual({ userId: 7 });
  });

  it('rejects a wrong password', async () => {
    repo.findUserByUsername.mockResolvedValue({ id: 7, passwordHash: await hashPassword('correct') });

    await expect(
      resolvers.Mutation.login(parent, { username: 'admin', password: 'wrong' }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('rejects an unknown username with the same error as a wrong password', async () => {
    repo.findUserByUsername.mockResolvedValue(null);

    await expect(
      resolvers.Mutation.login(parent, { username: 'nobody', password: 'whatever' }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('is reachable without a token', async () => {
    // login is the one field that must work anonymously — otherwise nobody
    // could ever obtain a token in the first place.
    repo.findUserByUsername.mockResolvedValue({ id: 7, passwordHash: await hashPassword('correct') });

    const result = await resolvers.Mutation.login(parent, { username: 'admin', password: 'correct' });

    expect(result.token).toBeTruthy();
  });
});
