import { describe, it, expect } from 'vitest';
import { ScryptPasswordHasher } from '../scrypt-password-hasher';

describe('ScryptPasswordHasher', () => {
  const hasher = new ScryptPasswordHasher();

  it('never stores the password in plain text', async () => {
    const hash = await hasher.hash('correct horse battery');
    expect(hash).not.toContain('correct horse battery');
  });

  it('verifies the right password', async () => {
    const hash = await hasher.hash('correct horse battery');
    expect(await hasher.verify('correct horse battery', hash)).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hasher.hash('correct horse battery');
    expect(await hasher.verify('wrong password', hash)).toBe(false);
  });

  it('produces a different hash each time for the same password (random salt)', async () => {
    const a = await hasher.hash('same-password');
    const b = await hasher.hash('same-password');
    expect(a).not.toBe(b);
  });

  it('rejects a malformed stored hash instead of throwing', async () => {
    expect(await hasher.verify('anything', 'not-a-valid-hash')).toBe(false);
    expect(await hasher.verify('anything', '')).toBe(false);
  });
});
