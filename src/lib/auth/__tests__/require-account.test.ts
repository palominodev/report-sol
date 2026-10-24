import { describe, it, expect, vi } from 'vitest';
import { createRequireAccount } from '../require-account';
import type { Account } from '@/core/domain/auth/Account';

const admin: Account = { id: 1, username: 'ana', rol: 'administrador', activa: true };
const normal: Account = { id: 2, username: 'beto', rol: 'normal', activa: true };

/** Mimics Next's redirect(): it never returns, it throws. */
class Redirected extends Error {
  constructor(public readonly to: string) {
    super(`redirect:${to}`);
  }
}
const redirect = (to: string): never => {
  throw new Redirected(to);
};

describe('requireAccount (server pages)', () => {
  it('returns the account of a live session', async () => {
    const requireAccount = createRequireAccount({
      readToken: async () => 'abc',
      validate: async () => admin,
      redirect,
    });

    expect(await requireAccount()).toEqual(admin);
  });

  it('sends a visitor without a session cookie to /login', async () => {
    const validate = vi.fn();
    const requireAccount = createRequireAccount({ readToken: async () => undefined, validate, redirect });

    await expect(requireAccount()).rejects.toMatchObject({ to: '/login' });
    expect(validate).not.toHaveBeenCalled();
  });

  it('sends a visitor with a forged or expired cookie to /login', async () => {
    const requireAccount = createRequireAccount({
      readToken: async () => 'forged',
      validate: async () => null,
      redirect,
    });

    await expect(requireAccount()).rejects.toMatchObject({ to: '/login' });
  });

  it('fails closed: a check that errors shows an error page, never the protected page', async () => {
    const requireAccount = createRequireAccount({
      readToken: async () => 'abc',
      validate: async () => {
        throw new Error('database down');
      },
      redirect,
    });

    await expect(requireAccount()).rejects.toThrow('database down');
  });

  it('sends an account without the required role back to the dashboard', async () => {
    const requireAccount = createRequireAccount({
      readToken: async () => 'abc',
      validate: async () => normal,
      redirect,
    });

    await expect(requireAccount({ role: 'administrador' })).rejects.toMatchObject({ to: '/dashboard' });
  });

  it('lets an administrator into a role-restricted page', async () => {
    const requireAccount = createRequireAccount({
      readToken: async () => 'abc',
      validate: async () => admin,
      redirect,
    });

    expect(await requireAccount({ role: 'administrador' })).toEqual(admin);
  });
});
