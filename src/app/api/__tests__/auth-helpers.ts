import { SESSION_DURATION_MS } from '@/core/application/use-cases/auth/LoginUseCase';
import { CryptoSessionTokenService } from '@/infrastructure/auth/crypto-session-token-service';
import { TursoAccountRepository } from '@/infrastructure/persistence/turso-account.repository';
import { TursoSessionRepository } from '@/infrastructure/persistence/turso-session.repository';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';

export interface SignedInAccount {
  accountId: number;
  token: string;
  /** Value for the `cookie` request header. */
  cookie: string;
}

/**
 * Creates an account and a live session in the current database client
 * (see setDatabaseClient) and returns the cookie that proves it.
 */
export async function signIn(username = 'tester', rol: 'administrador' | 'normal' = 'normal'): Promise<SignedInAccount> {
  const account = await new TursoAccountRepository().create({ username, passwordHash: 'not-used', rol });
  const tokens = new CryptoSessionTokenService();
  const token = tokens.generate();
  await new TursoSessionRepository().create({
    tokenHash: tokens.hash(token),
    idCuenta: account.id,
    expiraEn: new Date(Date.now() + SESSION_DURATION_MS),
  });
  return { accountId: account.id, token, cookie: `${SESSION_COOKIE_NAME}=${token}` };
}
