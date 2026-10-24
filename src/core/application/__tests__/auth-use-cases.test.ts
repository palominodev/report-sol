import { describe, it, expect } from 'vitest';
import { LoginUseCase } from '../use-cases/auth/LoginUseCase';
import { LogoutUseCase } from '../use-cases/auth/LogoutUseCase';
import { ValidateSessionUseCase } from '../use-cases/auth/ValidateSessionUseCase';
import { AuthenticationError } from '@/core/domain/errors/AuthenticationError';
import type { Account, AccountWithHash } from '@/core/domain/auth/Account';
import type { IAccountRepository } from '@/core/domain/auth/IAccountRepository';
import type { ISessionRepository, NewSession } from '@/core/domain/auth/ISessionRepository';
import type { IPasswordHasher } from '@/core/domain/auth/IPasswordHasher';
import type { ISessionTokenService } from '@/core/domain/auth/ISessionTokenService';

const NOW = new Date('2026-10-24T12:00:00.000Z');
const GENERIC_MESSAGE = 'Usuario o contraseña incorrectos.';

class FakeHasher implements IPasswordHasher {
  async hash(password: string) {
    return `hashed:${password}`;
  }
  async verify(password: string, storedHash: string) {
    return storedHash === `hashed:${password}`;
  }
}

class FakeTokens implements ISessionTokenService {
  private counter = 0;
  generate() {
    this.counter += 1;
    return `raw-token-${this.counter}`;
  }
  // Reversed on purpose: a real digest never contains the token, and neither may this fake.
  hash(token: string) {
    return `digest:${[...token].reverse().join('')}`;
  }
}

function setup(accounts: AccountWithHash[]) {
  const sessions = new Map<string, NewSession>();

  const accountRepo = {
    async findWithHashByUsername(username: string) {
      return accounts.find((a) => a.username.toLowerCase() === username.toLowerCase()) ?? null;
    },
  } as unknown as IAccountRepository;

  const sessionRepo: ISessionRepository = {
    async create(session) {
      sessions.set(session.tokenHash, session);
    },
    async findAccountByTokenHash(tokenHash, now): Promise<Account | null> {
      const s = sessions.get(tokenHash);
      if (!s || s.expiraEn <= now) return null;
      const acc = accounts.find((a) => a.id === s.idCuenta);
      if (!acc || !acc.activa) return null;
      const { passwordHash: _omit, ...publicAccount } = acc;
      return publicAccount;
    },
    async deleteByTokenHash(tokenHash) {
      sessions.delete(tokenHash);
    },
    async deleteByAccount(idCuenta) {
      for (const [k, v] of sessions) if (v.idCuenta === idCuenta) sessions.delete(k);
    },
  };

  const tokens = new FakeTokens();
  const hasher = new FakeHasher();
  const clock = () => NOW;

  return {
    sessions,
    login: new LoginUseCase(accountRepo, sessionRepo, hasher, tokens, clock),
    validate: new ValidateSessionUseCase(sessionRepo, tokens, clock),
    logout: new LogoutUseCase(sessionRepo, tokens),
  };
}

const ana: AccountWithHash = {
  id: 1,
  username: 'ana',
  rol: 'administrador',
  activa: true,
  passwordHash: 'hashed:secreto-ana',
};
const beto: AccountWithHash = {
  id: 2,
  username: 'beto',
  rol: 'normal',
  activa: false,
  passwordHash: 'hashed:secreto-beto',
};

describe('LoginUseCase', () => {
  it('opens a session valid for 7 days and returns the raw token once', async () => {
    const { login } = setup([ana]);

    const result = await login.execute('ana', 'secreto-ana');

    expect(result.token).toBe('raw-token-1');
    expect(result.account).toEqual({ id: 1, username: 'ana', rol: 'administrador', activa: true });
    expect(result.expiresAt).toEqual(new Date('2026-10-31T12:00:00.000Z'));
  });

  it('stores only the hash of the token, never the raw token or the password', async () => {
    const { login, sessions } = setup([ana]);

    await login.execute('ana', 'secreto-ana');

    expect([...sessions.keys()]).toEqual(['digest:1-nekot-war']);
    expect(JSON.stringify([...sessions.values()])).not.toContain('raw-token-1');
  });

  it('accepts the username in any letter case and with surrounding spaces', async () => {
    const { login } = setup([ana]);

    const result = await login.execute('  ANA ', 'secreto-ana');

    expect(result.account.username).toBe('ana');
  });

  it('rejects a wrong password with a generic message and opens no session', async () => {
    const { login, sessions } = setup([ana]);

    await expect(login.execute('ana', 'otra')).rejects.toThrow(GENERIC_MESSAGE);
    await expect(login.execute('ana', 'otra')).rejects.toBeInstanceOf(AuthenticationError);
    expect(sessions.size).toBe(0);
  });

  it('gives the same answer for an unknown user as for a wrong password', async () => {
    const { login, sessions } = setup([ana]);

    await expect(login.execute('nadie', 'secreto-ana')).rejects.toThrow(GENERIC_MESSAGE);
    expect(sessions.size).toBe(0);
  });

  it('rejects a deactivated account even with the right password, with the same generic message', async () => {
    const { login, sessions } = setup([beto]);

    await expect(login.execute('beto', 'secreto-beto')).rejects.toThrow(GENERIC_MESSAGE);
    expect(sessions.size).toBe(0);
  });

  it('rejects empty username or password with the same generic message', async () => {
    const { login, sessions } = setup([ana]);

    await expect(login.execute('', 'secreto-ana')).rejects.toThrow(GENERIC_MESSAGE);
    await expect(login.execute('ana', '')).rejects.toThrow(GENERIC_MESSAGE);
    expect(sessions.size).toBe(0);
  });
});

describe('ValidateSessionUseCase', () => {
  it('returns the account for a live session token', async () => {
    const { login, validate } = setup([ana]);
    const { token } = await login.execute('ana', 'secreto-ana');

    expect(await validate.execute(token)).toEqual({
      id: 1,
      username: 'ana',
      rol: 'administrador',
      activa: true,
    });
  });

  it('returns null for a missing, empty, or unknown token', async () => {
    const { validate } = setup([ana]);

    expect(await validate.execute(undefined)).toBeNull();
    expect(await validate.execute('')).toBeNull();
    expect(await validate.execute('inventado')).toBeNull();
  });
});

describe('LogoutUseCase', () => {
  it('closes the session so the token stops working', async () => {
    const { login, validate, logout, sessions } = setup([ana]);
    const { token } = await login.execute('ana', 'secreto-ana');

    await logout.execute(token);

    expect(await validate.execute(token)).toBeNull();
    expect(sessions.size).toBe(0);
  });

  it('does not fail when there is no token to close', async () => {
    const { logout } = setup([ana]);

    await expect(logout.execute(undefined)).resolves.toBeUndefined();
    await expect(logout.execute('inventado')).resolves.toBeUndefined();
  });
});
