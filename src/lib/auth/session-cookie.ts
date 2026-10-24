export const SESSION_COOKIE_NAME = 'report_sol_session';

/** Extracts the session token from a raw `Cookie` request header. */
export function readSessionToken(cookieHeader: string | null): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === SESSION_COOKIE_NAME) return rest.join('=') || undefined;
  }
  return undefined;
}

/**
 * The browser can never read this cookie from scripts (HttpOnly), it is not sent
 * from other sites (SameSite=lax) and, in production, only travels over HTTPS.
 */
function baseOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  };
}

export function sessionCookieOptions(expires: Date) {
  return { ...baseOptions(), expires };
}

export function clearedSessionCookieOptions() {
  return { ...baseOptions(), maxAge: 0, expires: new Date(0) };
}
