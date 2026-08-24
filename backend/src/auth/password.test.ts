import { comparePassword, hashPassword } from './password';

// bcrypt at cost 10 takes ~70ms per call by design, so this file keeps the
// number of hash/compare operations deliberately small.
describe('hashPassword', () => {
  it('does not return the password itself', async () => {
    const hashed = await hashPassword('mySecretPassword');
    expect(hashed).not.toBe('mySecretPassword');
  });

  it('produces a 60-character bcrypt hash', async () => {
    const hashed = await hashPassword('mySecretPassword');
    expect(hashed).toHaveLength(60);
    expect(hashed.startsWith('$2')).toBe(true);
  });

  it('produces a different hash each time, because the salt is random', async () => {
    const [a, b] = await Promise.all([hashPassword('same'), hashPassword('same')]);
    expect(a).not.toBe(b);
  });
});

describe('comparePassword', () => {
  it('accepts the correct password', async () => {
    const hashed = await hashPassword('mySecretPassword');
    await expect(comparePassword('mySecretPassword', hashed)).resolves.toBe(true);
  });

  it('rejects the wrong password', async () => {
    const hashed = await hashPassword('mySecretPassword');
    await expect(comparePassword('notThePassword', hashed)).resolves.toBe(false);
  });

  it('is case sensitive', async () => {
    const hashed = await hashPassword('mySecretPassword');
    await expect(comparePassword('mysecretpassword', hashed)).resolves.toBe(false);
  });

  it('accepts a hash produced by a separate call for the same password', async () => {
    // Two different salts, same password — this is what makes the random salt
    // safe rather than merely unpredictable.
    const hashed = await hashPassword('mySecretPassword');
    const other = await hashPassword('mySecretPassword');
    expect(hashed).not.toBe(other);
    await expect(comparePassword('mySecretPassword', other)).resolves.toBe(true);
  });

  it('returns false rather than throwing when the stored hash is unusable', async () => {
    // Matters because a legacy row could hold a plain string. login must treat
    // that as a failed comparison, not as a crash.
    await expect(comparePassword('anything', 'hashed_password')).resolves.toBe(false);
  });
});
