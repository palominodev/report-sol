import { NextRequest, NextResponse } from 'next/server';
import { getLoginUseCase } from '@/infrastructure/config/di';
import { AuthenticationError } from '@/core/domain/errors/AuthenticationError';
import { SESSION_COOKIE_NAME, sessionCookieOptions } from '@/lib/auth/session-cookie';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'La solicitud no es válida.' }, { status: 400 });
  }

  const { username, password } = (body ?? {}) as Record<string, unknown>;
  if (typeof username !== 'string' || typeof password !== 'string') {
    return NextResponse.json({ error: 'La solicitud no es válida.' }, { status: 400 });
  }

  try {
    const { token, account, expiresAt } = await getLoginUseCase().execute(username, password);
    const response = NextResponse.json({ account });
    response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions(expiresAt));
    return response;
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Login failed', error);
    return NextResponse.json({ error: 'No se pudo iniciar sesión. Intentá de nuevo.' }, { status: 500 });
  }
}
