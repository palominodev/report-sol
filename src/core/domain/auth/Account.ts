export type AccountRole = 'administrador' | 'normal';

/** Public view of an account. It never carries the password hash. */
export interface Account {
  id: number;
  username: string;
  rol: AccountRole;
  activa: boolean;
}

/** Only for credential checks; must never leave the server. */
export interface AccountWithHash extends Account {
  passwordHash: string;
}

export interface NewAccount {
  username: string;
  passwordHash: string;
  rol: AccountRole;
}
