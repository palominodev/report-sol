import { NextRequest, NextResponse } from 'next/server';
import { getLogoutUseCase } from '@/infrastructure/config/di';
import { SESSION_COOKIE_NAME, clearedSessionCookieOptions } from '@/lib/auth/session-cookie';

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  try {
    await getLogoutUseCase().execute(token);
  } catch (error) {
    // The browser must be signed out even if the server could not close the session record.
    console.error('Logout could not close the session record', error);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, '', clearedSessionCookieOptions());
  return response;
}
