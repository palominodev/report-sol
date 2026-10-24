import type { Account } from '@/core/domain/auth/Account';

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type LoginFailureKind = 'credentials' | 'session-not-kept' | 'network' | 'server';
export type LoginResult =
  | { ok: true; account: Account }
  | { ok: false; kind: LoginFailureKind; message: string };

export const NETWORK_MESSAGE = 'No hay conexión con el servidor. Revisá tu conexión e intentá de nuevo.';
export const GENERIC_MESSAGE = 'No se pudo iniciar sesión. Intentá de nuevo.';
export const SESSION_NOT_KEPT_MESSAGE =
  'Tus datos son correctos, pero el navegador no guardó la sesión. ' +
  'Probá entrando por una dirección https o por localhost, o avisale a quien administra el sistema.';

async function readJson(response: Response): Promise<Record<string, unknown> | null> {
  try {
    const body = await response.json();
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * Posts the credentials and then asks the server who the browser is. If the login worked but the
 * browser dropped the cookie (for example a `Secure` cookie over plain http), the second request
 * arrives without it and the person gets an explanation instead of a silent bounce to /login.
 *
 * The confirmation never blocks a good login: if it cannot be made (network or server problem),
 * the login is reported as successful, because the server already accepted it.
 */
export async function signInWithPassword(
  username: string,
  password: string,
  fetchFn: FetchLike = (input, init) => fetch(input, init)
): Promise<LoginResult> {
  let response: Response;
  try {
    response = await fetchFn('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
  } catch {
    return { ok: false, kind: 'network', message: NETWORK_MESSAGE };
  }

  const body = await readJson(response);
  if (!response.ok) {
    const message = typeof body?.error === 'string' && body.error ? body.error : GENERIC_MESSAGE;
    return { ok: false, kind: response.status === 401 ? 'credentials' : 'server', message };
  }

  const account = body?.account as Account | undefined;
  if (!account || typeof account !== 'object') {
    return { ok: false, kind: 'server', message: GENERIC_MESSAGE };
  }

  try {
    const check = await fetchFn('/api/auth/session', { cache: 'no-store' });
    if (check.status === 401) {
      return { ok: false, kind: 'session-not-kept', message: SESSION_NOT_KEPT_MESSAGE };
    }
  } catch {
    // The server accepted the login; do not turn a failed confirmation into a failed login.
  }
  return { ok: true, account };
}
