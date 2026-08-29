import { StandaloneServerContextFunctionArgument } from "@apollo/server/standalone";
import { verify } from "../auth/token";
import { GraphQLError } from "graphql";
import { InvalidTokenError } from "../auth/errors";
import { createLoaders } from "./loaders";

export interface Context {
  userId: number | null;
  loaders: ReturnType<typeof createLoaders>;
}
// eslint-disable-next-line @typescript-eslint/require-await -- Apollo's context function is typed to return a Promise
export async function createContext({ req }: StandaloneServerContextFunctionArgument): Promise<Context> {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token || token.trim() === '') {
    return { userId: null, loaders: createLoaders() };
  }
  try {
    const { userId } = verify(token);
    return { userId, loaders: createLoaders() };
  } catch (error) {
    if (error instanceof InvalidTokenError) {
      throw new GraphQLError('Invalid token', {
        extensions: {
          code: 'UNAUTHENTICATED',
          http: { status: 401 },
        }
      });
    }
    throw error;
  }
}