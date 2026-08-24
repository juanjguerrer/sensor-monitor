import { DatabaseError } from 'pg';
import type { GraphQLFormattedError } from 'graphql';
import { formatError } from './errorHandling';
import { NotFoundError } from '../db/errors';
import { InvalidCredentialsError, UnauthenticatedError } from '../auth/errors';

/** The shape Apollo hands formatError before it has been classified. */
function incoming(message: string, code?: string): GraphQLFormattedError {
  return { message, extensions: code === undefined ? {} : { code } };
}

/** A foreign key violation as pg would raise it. */
function fkViolation(constraint: string): DatabaseError {
  const error = new DatabaseError('insert or update violates foreign key constraint', 100, 'error');
  error.code = '23503';
  error.constraint = constraint;
  error.detail = 'Key (location_id)=(999) is not present in table "locations".';
  return error;
}

let consoleError: jest.SpyInstance;

beforeEach(() => {
  consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('client mistakes', () => {
  it('maps a known foreign key constraint to its own code', () => {
    const error = fkViolation('sensors_location_id_fkey');
    const result = formatError(incoming(error.message), error);

    expect(result.extensions?.code).toBe('LOCATION_NOT_FOUND');
    expect(result.message).toBe('Location not found');
  });

  it('does not log a client mistake', () => {
    const error = fkViolation('readings_sensor_id_fkey');
    formatError(incoming(error.message), error);

    expect(consoleError).not.toHaveBeenCalled();
  });

  it('never leaks the Postgres detail to the client', () => {
    const error = fkViolation('sensors_location_id_fkey');
    const result = formatError(incoming(error.message), error);

    expect(JSON.stringify(result)).not.toContain('locations');
    expect(JSON.stringify(result)).not.toContain('999');
  });

  it('maps NotFoundError using the entity name', () => {
    const error = new NotFoundError('Sensor', 7);
    const result = formatError(incoming(error.message), error);

    expect(result.extensions?.code).toBe('SENSOR_NOT_FOUND');
    expect(result.message).toBe('Sensor with id 7 not found');
    expect(consoleError).not.toHaveBeenCalled();
  });
});

describe('authentication failures', () => {
  it('reports bad credentials without revealing which half was wrong', () => {
    const result = formatError(incoming('anything'), new InvalidCredentialsError());

    expect(result.extensions?.code).toBe('UNAUTHENTICATED');
    expect(result.message).toBe('Invalid username or password');
  });

  it('distinguishes a missing token from bad credentials by message only', () => {
    const missing = formatError(incoming('anything'), new UnauthenticatedError());
    const bad = formatError(incoming('anything'), new InvalidCredentialsError());

    expect(missing.extensions?.code).toBe(bad.extensions?.code);
    expect(missing.message).not.toBe(bad.message);
  });

  it('does not log authentication failures', () => {
    formatError(incoming('anything'), new UnauthenticatedError());
    formatError(incoming('anything'), new InvalidCredentialsError());

    expect(consoleError).not.toHaveBeenCalled();
  });
});

describe('server problems', () => {
  it('returns a generic message for an unrecognised database error', () => {
    const error = fkViolation('some_constraint_nobody_mapped');
    const result = formatError(incoming(error.message), error);

    expect(result.extensions?.code).toBe('INTERNAL_SERVER_ERROR');
    expect(result.message).toBe('Internal server error');
  });

  it('logs the full Postgres detail server-side', () => {
    const error = fkViolation('some_constraint_nobody_mapped');
    formatError(incoming(error.message), error);

    expect(consoleError).toHaveBeenCalledWith(
      'Unhandled database error:',
      expect.objectContaining({
        code: '23503',
        constraint: 'some_constraint_nobody_mapped',
        detail: expect.stringContaining('locations'),
      }),
    );
  });

  it('logs an unrecognised non-database error', () => {
    const error = new TypeError('undefined is not a function');
    formatError(incoming(error.message, 'INTERNAL_SERVER_ERROR'), error);

    expect(consoleError).toHaveBeenCalledWith('Unhandled error:', error);
  });

  it('passes through an error it has no opinion about', () => {
    const formatted = incoming('some validation message', 'BAD_USER_INPUT');
    const result = formatError(formatted, new Error('some validation message'));

    expect(result).toEqual(formatted);
    expect(consoleError).not.toHaveBeenCalled();
  });
});
