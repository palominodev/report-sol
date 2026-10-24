import type { Account, AccountRole } from '@/core/domain/auth/Account';

export interface RequireAccountDeps {
  readToken: () => Promise<string | undefined>;
  validate: (token: string | undefined) => Promise<Account | null>;
  /** Next's `redirect`: it never returns, it throws. */
  redirect: (to: string) => never;
}

export interface RequireAccountOptions {
  role?: AccountRole;
}

/**
 * Guard for server pages. Returns the signed-in account or redirects away.
 * It deliberately has no try/catch: if the session cannot be checked the error
 * propagates and the protected page is never rendered (fail closed).
 */
export function createRequireAccount({ readToken, validate, redirect }: RequireAccountDeps) {
  return async function requireAccount(options: RequireAccountOptions = {}): Promise<Account> {
    const token = await readToken();
    const account = token ? await validate(token) : null;
    if (!account) return redirect('/login');

    if (options.role && account.rol !== options.role) return redirect('/dashboard');

    return account;
  };
}
