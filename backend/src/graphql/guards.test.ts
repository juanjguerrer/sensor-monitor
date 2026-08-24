import { requireUser } from './guards';
import { UnauthenticatedError } from '../auth/errors';

describe('requireUser', () => {
  it('returns the userId when one is present', () => {
    expect(requireUser({ userId: 42 })).toBe(42);
  });

  it('returns a userId of 1 rather than treating it as absent', () => {
    // Guards against reintroducing a falsy check (`!context.userId`), which
    // would reject a legitimate user whose id happened to be 0.
    expect(requireUser({ userId: 1 })).toBe(1);
  });

  it('throws UnauthenticatedError when there is no user', () => {
    expect(() => requireUser({ userId: null })).toThrow(UnauthenticatedError);
  });
});
