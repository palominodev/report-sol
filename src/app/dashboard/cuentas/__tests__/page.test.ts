import { beforeEach, describe, expect, it, vi } from 'vitest';

const calls = vi.hoisted(() => ({ order: [] as string[], reject: false }));
const requireAccount = vi.hoisted(() => vi.fn());
const findAll = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth/server', () => ({ requireAccount, withAuth: (h: unknown) => h }));
vi.mock('@/infrastructure/config/di', () => ({ getAccountRepository: () => ({ findAll }) }));
import Page from '../page';

const me = { id: 1, username: 'admin', rol: 'administrador', activa: true };
const list = [me, { id: 2, username: 'ana', rol: 'normal', activa: false }];

beforeEach(() => {
  calls.order.length = 0;
  requireAccount.mockReset();
  findAll.mockReset();
  requireAccount.mockImplementation(async () => { calls.order.push('requireAccount'); if (calls.reject) throw new Error('NEXT_REDIRECT'); return me; });
  findAll.mockImplementation(async () => { calls.order.push('findAll'); return list; });
  calls.reject = false;
});

describe('/dashboard/cuentas page', () => {
  it('requires an administrator before reading accounts, and passes them as props', async () => {
    const element = (await Page()) as { props: { accounts: unknown; currentAccountId: number } };
    expect(requireAccount).toHaveBeenCalledWith({ role: 'administrador' });
    expect(calls.order).toEqual(['requireAccount', 'findAll']);
    expect(JSON.stringify(element)).toContain('ana');
    expect(findAll).toHaveBeenCalledTimes(1);
  });

  it('rejects and never reads accounts when the guard redirects', async () => {
    calls.reject = true;
    await expect(Page()).rejects.toThrow('NEXT_REDIRECT');
    expect(findAll).not.toHaveBeenCalled();
  });
});
