import { NextResponse } from 'next/server';
import type { Account, AccountRole } from '@/core/domain/auth/Account';
import { readSessionToken } from './session-cookie';

type ValidateSession = (token: string | undefined) => Promise<Account | null>;

export interface WithAuthOptions {
  /** Restrict the handler to one account type. Without it, any active account may use it. */
  role?: AccountRole;
}

// Refusals must never be stored by a browser or proxy.
const NO_STORE = { 'Cache-Control': 'no-store' };

function refuse(error: string, status: number): Response {
  return NextResponse.json({ error }, { status, headers: NO_STORE });
}

/**
 * Builds the route guard around a session check. A handler wrapped by it runs only for a
 * live session of an active account; every other outcome, including a failing check,
 * is a refusal (fail closed).
 */
export function createWithAuth(validate: ValidateSession) {
  return function withAuth<Req extends Request, Ctx>(
    handler: (request: Req, context: Ctx, account: Account) => Promise<Response> | Response,
    options: WithAuthOptions = {}
  ) {
    return async (request: Req, context: Ctx): Promise<Response> => {
      const token = readSessionToken(request.headers.get('cookie'));
      if (!token) return refuse('Necesitás iniciar sesión.', 401);

      let account: Account | null;
      try {
        account = await validate(token);
      } catch (error) {
        console.error('Session check failed', error);
        return refuse('No se pudo verificar tu sesión. Intentá de nuevo.', 500);
      }
      if (!account) return refuse('Necesitás iniciar sesión.', 401);

      if (options.role && account.rol !== options.role) {
        return refuse('No tenés permiso para hacer esto.', 403);
      }

      return handler(request, context, account);
    };
  };
}
