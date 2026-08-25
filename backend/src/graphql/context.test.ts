import jwt from 'jsonwebtoken';
import { GraphQLError } from 'graphql';
import type { StandaloneServerContextFunctionArgument } from '@apollo/server/standalone';
import { createContext } from './context';
import { sign } from '../auth/token';
import * as token from '../auth/token';
import { InvalidTokenError } from '../auth/errors';

// Set by jest.setup.ts, which runs before these imports are evaluated.
const SECRET = process.env.JWT_SECRET as string;

/**
 * createContext only reads req.headers.authorization, so a plain object is
 * enough — no HTTP server, no socket. The cast is the price of faking a
 * Node IncomingMessage we only use one field of.
 */
function argsWith(authorization?: string): StandaloneServerContextFunctionArgument {
  const headers: Record<string, string> = {};
  if (authorization !== undefined) {
    headers.authorization = authorization;
  }
  return { req: { headers }, res: {} } as unknown as StandaloneServerContextFunctionArgument;
}

describe('createContext — anonymous requests', () => {
  it('returns a null userId when there is no Authorization header', async () => {
    await expect(createContext(argsWith())).resolves.toMatchObject({ userId: null });
  });

  it('returns a null userId when the header has no Bearer prefix', async () => {
    const raw = sign(1);
    await expect(createContext(argsWith(raw))).resolves.toMatchObject({ userId: null });
  });

  it('returns a null userId for a Bearer prefix with nothing after it', async () => {
    await expect(createContext(argsWith('Bearer '))).resolves.toMatchObject({ userId: null });
  });

  it('returns a null userId when the token is only whitespace', async () => {
    await expect(createContext(argsWith('Bearer    '))).resolves.toMatchObject({ userId: null });
  });
});

describe('createContext — valid token', () => {
  it('extracts the userId', async () => {
    await expect(createContext(argsWith(`Bearer ${sign(42)}`))).resolves.toMatchObject({ userId: 42 });
  });
});

describe('createContext — loaders', () => {
  it('attaches loaders even to an anonymous context', async () => {
    const context = await createContext(argsWith());
    expect(context.loaders.location).toBeDefined();
  });

  it('builds a fresh set for every request', async () => {
    // The cache must not outlive one request. A loader created at module scope
    // would serve one user's rows to the next and never notice an update.
    const first = await createContext(argsWith());
    const second = await createContext(argsWith());

    expect(first.loaders).not.toBe(second.loaders);
    expect(first.loaders.location).not.toBe(second.loaders.location);
  });
});

describe('createContext — rejected tokens', () => {
  // Every case here must produce a 401, not a 500. The status is read from
  // extensions.http on the thrown error, so only a GraphQLError can carry it.
  const rejected: [string, string][] = [
    ['a string that is not a JWT', 'not-a-real-token'],
    ['a token signed with a different secret', jwt.sign({ userId: 1 }, 'some-other-secret')],
    ['an expired token', jwt.sign({ userId: 1 }, SECRET, { expiresIn: '-1h' })],
    ['a correctly signed token with no userId claim', jwt.sign({ sub: 1 }, SECRET)],
    ['a correctly signed token whose userId is not a number', jwt.sign({ userId: 'abc' }, SECRET)],
  ];

  it.each(rejected)('rejects %s', async (_label, value) => {
    await expect(createContext(argsWith(`Bearer ${value}`))).rejects.toBeInstanceOf(GraphQLError);
  });

  it.each(rejected)('reports %s as UNAUTHENTICATED with HTTP 401', async (_label, value) => {
    await expect(createContext(argsWith(`Bearer ${value}`))).rejects.toMatchObject({
      message: 'Invalid token',
      extensions: { code: 'UNAUTHENTICATED', http: { status: 401 } },
    });
  });
});

describe('createContext — unexpected failures', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('lets a non-auth error through instead of disguising it as a 401', async () => {
    // A bug inside verify must not reach the client as "Invalid token" — that
    // would hide a server fault behind a status that looks like normal traffic.
    const bug = new TypeError('something in verify is broken');
    jest.spyOn(token, 'verify').mockImplementation(() => {
      throw bug;
    });

    await expect(createContext(argsWith(`Bearer ${sign(1)}`))).rejects.toBe(bug);
  });

  it('still converts InvalidTokenError into a GraphQLError', async () => {
    jest.spyOn(token, 'verify').mockImplementation(() => {
      throw new InvalidTokenError();
    });

    await expect(createContext(argsWith(`Bearer ${sign(1)}`))).rejects.toBeInstanceOf(GraphQLError);
  });
});
