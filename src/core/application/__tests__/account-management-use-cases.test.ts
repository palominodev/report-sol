import { describe, it, expect } from 'vitest';
import { CreateAccountUseCase } from '../use-cases/auth/CreateAccountUseCase';
import { ResetPasswordUseCase } from '../use-cases/auth/ResetPasswordUseCase';
import { ValidationError } from '@/core/domain/errors/ValidationError';
import { NotFoundError } from '@/core/domain/errors/NotFoundError';
import { ConflictError } from '@/core/domain/errors/ConflictError';
import type { Account, AccountWithHash, NewAccount } from '@/core/domain/auth/Account';
import type { IAccountRepository } from '@/core/domain/auth/IAccountRepository';
import type { ISessionRepository } from '@/core/domain/auth/ISessionRepository';
import type { IPasswordHasher } from '@/core/domain/auth/IPasswordHasher';

const hasher: IPasswordHasher = {
  async hash(p) {
    return `hashed:${p}`;
  },
  async verify(p, h) {
    return h === `hashed:${p}`;
  },
};

function setup(initial: AccountWithHash[] = []) {
  const accounts = [...initial];
  const closedFor: number[] = [];

  const accountRepo = {
    async create(a: NewAccount): Promise<Account> {
      if (accounts.some((x) => x.username.toLowerCase() === a.username.toLowerCase())) {
        throw new ConflictError('Ya existe una cuenta con ese usuario.');
      }
      const created: AccountWithHash = {
        id: accounts.length + 1,
        username: a.username,
        rol: a.rol,
        activa: true,
        passwordHash: a.passwordHash,
      };
      accounts.push(created);
      const { passwordHash: _omit, ...publicAccount } = created;
      return publicAccount;
    },
    async findWithHashByUsername(username: string) {
      return accounts.find((x) => x.username.toLowerCase() === username.toLowerCase()) ?? null;
    },
    async setPasswordHash(id: number, passwordHash: string) {
      const found = accounts.find((x) => x.id === id);
      if (found) found.passwordHash = passwordHash;
    },
  } as unknown as IAccountRepository;

  const sessionRepo = {
    async deleteByAccount(id: number) {
      closedFor.push(id);
    },
  } as unknown as ISessionRepository;

  return {
    accounts,
    closedFor,
    create: new CreateAccountUseCase(accountRepo, hasher),
    reset: new ResetPasswordUseCase(accountRepo, sessionRepo, hasher),
  };
}

const VALID_PASSWORD = 'una-clave-larga-123';

describe('CreateAccountUseCase', () => {
  it('creates an active account and stores only the hash of the password', async () => {
    const { create, accounts } = setup();

    const account = await create.execute({ username: 'maria', password: VALID_PASSWORD, rol: 'normal' });

    expect(account).toEqual({ id: 1, username: 'maria', rol: 'normal', activa: true });
    expect(accounts[0].passwordHash).toBe(`hashed:${VALID_PASSWORD}`);
    expect(JSON.stringify(account)).not.toContain(VALID_PASSWORD);
  });

  it('trims the username', async () => {
    const { create } = setup();

    const account = await create.execute({ username: '  maria ', password: VALID_PASSWORD, rol: 'normal' });

    expect(account.username).toBe('maria');
  });

  it.each([
    ['too short', 'ab'],
    ['too long', 'a'.repeat(33)],
    ['with spaces inside', 'maria lopez'],
    ['with accents or symbols', 'maría!'],
    ['empty', '   '],
  ])('rejects a username %s and creates nothing', async (_label, username) => {
    const { create, accounts } = setup();

    await expect(create.execute({ username, password: VALID_PASSWORD, rol: 'normal' })).rejects.toBeInstanceOf(
      ValidationError
    );
    expect(accounts).toHaveLength(0);
  });

  it('rejects a password shorter than 10 characters and creates nothing', async () => {
    const { create, accounts } = setup();

    await expect(create.execute({ username: 'maria', password: '123456789', rol: 'normal' })).rejects.toThrow(
      'La contraseña debe tener al menos 10 caracteres.'
    );
    expect(accounts).toHaveLength(0);
  });

  it('accepts a password of exactly 10 characters', async () => {
    const { create } = setup();

    await expect(create.execute({ username: 'maria', password: '1234567890', rol: 'normal' })).resolves.toBeTruthy();
  });

  it('rejects an unknown role', async () => {
    const { create, accounts } = setup();

    await expect(
      create.execute({ username: 'maria', password: VALID_PASSWORD, rol: 'superuser' as never })
    ).rejects.toBeInstanceOf(ValidationError);
    expect(accounts).toHaveLength(0);
  });

  it('lets a duplicate username surface as a conflict and keeps the original account', async () => {
    const { create, accounts } = setup();
    await create.execute({ username: 'Maria', password: VALID_PASSWORD, rol: 'normal' });

    await expect(
      create.execute({ username: 'maria', password: 'otra-clave-larga', rol: 'administrador' })
    ).rejects.toBeInstanceOf(ConflictError);
    expect(accounts).toHaveLength(1);
    expect(accounts[0].passwordHash).toBe(`hashed:${VALID_PASSWORD}`);
  });
});

describe('ResetPasswordUseCase', () => {
  const existing: AccountWithHash = {
    id: 7,
    username: 'ana',
    rol: 'normal',
    activa: true,
    passwordHash: 'hashed:vieja-clave-123',
  };

  it('replaces the password and closes every open session of that account', async () => {
    const { reset, accounts, closedFor } = setup([{ ...existing }]);

    await reset.execute({ username: 'ANA', newPassword: 'nueva-clave-segura' });

    expect(accounts[0].passwordHash).toBe('hashed:nueva-clave-segura');
    expect(closedFor).toEqual([7]);
  });

  it('rejects a short new password and changes nothing', async () => {
    const { reset, accounts, closedFor } = setup([{ ...existing }]);

    await expect(reset.execute({ username: 'ana', newPassword: 'corta' })).rejects.toBeInstanceOf(ValidationError);
    expect(accounts[0].passwordHash).toBe('hashed:vieja-clave-123');
    expect(closedFor).toEqual([]);
  });

  it('reports an unknown account and changes nothing', async () => {
    const { reset, closedFor } = setup([{ ...existing }]);

    await expect(reset.execute({ username: 'nadie', newPassword: 'nueva-clave-segura' })).rejects.toBeInstanceOf(
      NotFoundError
    );
    expect(closedFor).toEqual([]);
  });
});
