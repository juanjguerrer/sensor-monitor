import { unwrapResolverError } from '@apollo/server/errors';
import { DatabaseError } from 'pg';
import type { GraphQLFormattedError } from 'graphql';
import { mapDbError } from './errors';
import { NotFoundError } from '../db/errors';
import { InvalidCredentialsError, UnauthenticatedError } from '../auth/errors';

export function formatError(
  formattedError: GraphQLFormattedError,
  error: unknown
): GraphQLFormattedError {
  const original = unwrapResolverError(error);
  const mappedDbError = mapDbError(original);
  if (mappedDbError) {
    return {
      ...formattedError,
      message: mappedDbError.message,
      extensions: {
        ...formattedError.extensions,
        code: mappedDbError.code,
      },
    };
  }
  if (original instanceof DatabaseError) {
    console.error('Unhandled database error:', {
      path: formattedError.path,
      code: original.code,
      constraint: original.constraint,
      detail: original.detail,
      message: original.message,
      stack: original.stack,
    });
    return {
      ...formattedError,
      message: 'Internal server error',
      extensions: {
        ...formattedError.extensions,
        code: 'INTERNAL_SERVER_ERROR',
      },
    };
  }
  if (original instanceof NotFoundError) {
    const code = `${original.entity.toUpperCase()}_NOT_FOUND`;
    return {
      ...formattedError,
      message: original.message,
      extensions: {
        ...formattedError.extensions,
        code,
      },
    };
  }
  if (original instanceof InvalidCredentialsError) {
    return {
      ...formattedError,
      message: 'Invalid username or password',
      extensions: {
        ...formattedError.extensions,
        code: 'UNAUTHENTICATED',
      },
    };
  }
  if (original instanceof UnauthenticatedError) {
    return {
      ...formattedError,
      message: 'Unauthenticated',
      extensions: {
        ...formattedError.extensions,
        code: 'UNAUTHENTICATED',
      },
    };
  }
  if (formattedError.extensions?.code === 'INTERNAL_SERVER_ERROR') {
    console.error('Unhandled error:', original);
  }
  return formattedError;
}