import { describe, it, expect } from 'vitest';
import { DeactivateAccountUseCase } from '../use-cases/auth/DeactivateAccountUseCase';
import { ReactivateAccountUseCase } from '../use-cases/auth/ReactivateAccountUseCase';
import { NotFoundError } from '@/core/domain/errors/NotFoundError';
import { UnprocessableError } from '@/core/domain/errors/UnprocessableError';
import type { Account } from '@/core/domain/auth/Account';
import type { IAccountRepository } from '@/core/domain/auth/IAccountRepository';
import type { ISessionRepository } from '@/core/domain/auth/ISessionRepository';

function setup(initial: Account[]) {
  const accounts = initial.map((a) => ({ ...a }));
  const closedFor: number[] = [];

  const accountRepo = {
    async findById(id: number) {
      const found = accounts.find((a) => a.id === id);
      return found ? { ...found } : null;
    },
    async setActive(id: number, active: boolean) {
      const found = accounts.find((a) => a.id === id);
      if (found) found.activa = active;
    },
    async countActiveAdmins() {
      return accounts.filter((a) => a.rol === 'administrador' && a.activa).length;
    },
    // Same rule as the real repository: refuse only the last ACTIVE administrator.
    async deactivateUnlessLastAdmin(id: number) {
      const found = accounts.find((a) => a.id === id);
      if (!found) return false;
      const activeAdmins = accounts.filter((a) => a.rol === 'administrador' && a.activa).length;
      if (found.rol === 'administrador' && found.activa && activeAdmins <= 1) return false;
      found.activa = false;
      return true;
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
    deactivate: new DeactivateAccountUseCase(accountRepo, sessionRepo),
    reactivate: new ReactivateAccountUseCase(accountRepo),
  };
}

const ana: Account = { id: 1, username: 'ana', rol: 'administrador', activa: true };
const carla: Account = { id: 2, username: 'carla', rol: 'administrador', activa: true };
const beto: Account = { id: 3, username: 'beto', rol: 'normal', activa: true };

describe('DeactivateAccountUseCase', () => {
  it('deactivates the account and closes all of its open sessions', async () => {
    const { deactivate, accounts, closedFor } = setup([ana, beto]);

    await deactivate.execute(3);

    expect(accounts.find((a) => a.id === 3)?.activa).toBe(false);
    expect(closedFor).toEqual([3]);
  });

  it('lets an administrator be deactivated while another active administrator remains', async () => {
    const { deactivate, accounts } = setup([ana, carla]);

    await deactivate.execute(1);

    expect(accounts.find((a) => a.id === 1)?.activa).toBe(false);
  });

  it('refuses to deactivate the last active administrator and changes nothing', async () => {
    const { deactivate, accounts, closedFor } = setup([ana, beto]);

    await expect(deactivate.execute(1)).rejects.toBeInstanceOf(UnprocessableError);
    await expect(deactivate.execute(1)).rejects.toThrow(
      'No se puede desactivar al último administrador activo: nadie podría administrar las cuentas.'
    );
    expect(accounts.find((a) => a.id === 1)?.activa).toBe(true);
    expect(closedFor).toEqual([]);
  });

  it('counts only ACTIVE administrators: an inactive one does not protect the last active one', async () => {
    const inactiveCarla = { ...carla, activa: false };
    const { deactivate, accounts } = setup([ana, inactiveCarla]);

    await expect(deactivate.execute(1)).rejects.toBeInstanceOf(UnprocessableError);
    expect(accounts.find((a) => a.id === 1)?.activa).toBe(true);
  });

  it('reports an unknown account and changes nothing', async () => {
    const { deactivate, closedFor } = setup([ana, beto]);

    await expect(deactivate.execute(99)).rejects.toBeInstanceOf(NotFoundError);
    expect(closedFor).toEqual([]);
  });

  it('is harmless on an account that is already inactive', async () => {
    const inactive = { ...beto, activa: false };
    const { deactivate, accounts } = setup([ana, inactive]);

    await expect(deactivate.execute(3)).resolves.toBeUndefined();
    expect(accounts.find((a) => a.id === 3)?.activa).toBe(false);
  });
});

describe('ReactivateAccountUseCase', () => {
  it('turns an inactive account back on', async () => {
    const { reactivate, accounts } = setup([ana, { ...beto, activa: false }]);

    await reactivate.execute(3);

    expect(accounts.find((a) => a.id === 3)?.activa).toBe(true);
  });

  it('reports an unknown account', async () => {
    const { reactivate } = setup([ana]);

    await expect(reactivate.execute(99)).rejects.toBeInstanceOf(NotFoundError);
  });
});
