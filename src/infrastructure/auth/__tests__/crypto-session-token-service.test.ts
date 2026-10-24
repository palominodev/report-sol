import { describe, it, expect } from 'vitest';
import { CryptoSessionTokenService } from '../crypto-session-token-service';

describe('CryptoSessionTokenService', () => {
  const service = new CryptoSessionTokenService();

  it('generates unguessable, unique, URL-safe tokens', () => {
    const a = service.generate();
    const b = service.generate();

    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]{43,}$/);
  });

  it('hashes deterministically and the hash does not reveal the token', () => {
    const token = service.generate();

    expect(service.hash(token)).toBe(service.hash(token));
    expect(service.hash(token)).not.toContain(token);
    expect(service.hash(token)).not.toBe(service.hash(service.generate()));
  });
});
