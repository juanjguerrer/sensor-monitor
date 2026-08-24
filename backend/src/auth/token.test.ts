import jwt from 'jsonwebtoken';
import { sign, verify } from './token';
import { InvalidTokenError } from './errors';

// Set by jest.setup.ts, which runs before these imports are evaluated.
const SECRET = process.env.JWT_SECRET as string;

describe('sign', () => {
  it('produces a JWT with three segments', () => {
    expect(sign(123).split('.')).toHaveLength(3);
  });

  it('sets an expiry claim', () => {
    const decoded = jwt.decode(sign(123));
    expect(decoded).toMatchObject({ userId: 123 });
    expect((decoded as jwt.JwtPayload).exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });
});

describe('verify — accepts', () => {
  it('round-trips a token it signed itself', () => {
    expect(verify(sign(123))).toEqual({ userId: 123 });
  });

  it('preserves a userId of 1, which is falsy-adjacent but valid', () => {
    expect(verify(sign(1))).toEqual({ userId: 1 });
  });
});

describe('verify — rejects', () => {
  // Every rejection collapses to InvalidTokenError. Asserted by class, not by
  // message: context.ts branches on `instanceof`, so the class is the contract.
  const cases: [string, string][] = [
    ['a string that is not a JWT at all', 'invalid.token'],
    ['an empty string', ''],
    ['a token signed with a different secret', jwt.sign({ userId: 1 }, 'some-other-secret')],
    ['an expired token', jwt.sign({ userId: 1 }, SECRET, { expiresIn: '-1h' })],
    ['a token with no userId claim', jwt.sign({ sub: 1 }, SECRET)],
    ['a token whose userId is a string', jwt.sign({ userId: '1' }, SECRET)],
    ['a token whose userId is null', jwt.sign({ userId: null }, SECRET)],
  ];

  it.each(cases)('rejects %s', (_label, value) => {
    expect(() => verify(value)).toThrow(InvalidTokenError);
  });

  // The last three cases are the ones a signature check alone would let past:
  // they are genuinely signed by this server, just not shaped the way the
  // current code expects. That is what the runtime payload guard is for.
  it('rejects a correctly signed token whose payload is not an object', () => {
    const token = jwt.sign('a bare string', SECRET);
    expect(() => verify(token)).toThrow(InvalidTokenError);
  });
});
