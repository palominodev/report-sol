import type { Account, AccountRole } from '@/core/domain/auth/Account';

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type FailureKind = 'unauthorized' | 'forbidden' | 'network' | 'server';
export type Failure = { ok: false; kind: FailureKind; message: string };
export type Result<T> = ({ ok: true } & T) | Failure;

export const NETWORK_MESSAGE = 'No hay conexión con el servidor. Revisá tu conexión e intentá de nuevo.';
export const FORBIDDEN_MESSAGE = 'No tenés permiso para hacer esto.';
export const GENERIC_MESSAGE = 'No se pudo completar la operación. Intentá de nuevo.';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

async function readJson(response: Response): Promise<Record<string, unknown> | null> {
  try {
    const body = await response.json();
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

async function send(fetchFn: FetchLike, url: string, init: RequestInit): Promise<{ response: Response } | Failure> {
  try {
    return { response: await fetchFn(url, init) };
  } catch {
    return { ok: false, kind: 'network', message: NETWORK_MESSAGE };
  }
}

async function failureOf(response: Response): Promise<Failure> {
  if (response.status === 401) return { ok: false, kind: 'unauthorized', message: 'Tu sesión venció. Iniciá sesión de nuevo.' };
  if (response.status === 403) return { ok: false, kind: 'forbidden', message: FORBIDDEN_MESSAGE };
  const body = await readJson(response);
  const message = typeof body?.error === 'string' && body.error ? body.error : GENERIC_MESSAGE;
  return { ok: false, kind: 'server', message };
}

async function accountResult(response: Response): Promise<Result<{ cuenta: Account }>> {
  if (!response.ok) return failureOf(response);
  const body = await readJson(response);
  const cuenta = body?.cuenta as Account | undefined;
  if (!cuenta || typeof cuenta.id !== 'number') return { ok: false, kind: 'server', message: GENERIC_MESSAGE };
  return { ok: true, cuenta };
}

export async function createAccount(
  input: { username: string; password: string; rol: AccountRole },
  fetchFn: FetchLike = (url, init) => fetch(url, init)
): Promise<Result<{ cuenta: Account }>> {
  const sent = await send(fetchFn, '/api/cuentas', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ username: input.username, password: input.password, rol: input.rol }),
  });
  return 'response' in sent ? accountResult(sent.response) : sent;
}

export async function setAccountActive(
  id: number,
  activa: boolean,
  fetchFn: FetchLike = (url, init) => fetch(url, init)
): Promise<Result<{ cuenta: Account }>> {
  const sent = await send(fetchFn, `/api/cuentas/${id}`, {
    method: 'PATCH',
    headers: JSON_HEADERS,
    body: JSON.stringify({ activa }),
  });
  return 'response' in sent ? accountResult(sent.response) : sent;
}

export async function logout(fetchFn: FetchLike = (url, init) => fetch(url, init)): Promise<Result<object>> {
  const sent = await send(fetchFn, '/api/auth/logout', { method: 'POST', headers: JSON_HEADERS });
  if (!('response' in sent)) return sent;
  return sent.response.ok ? { ok: true } : failureOf(sent.response);
}
