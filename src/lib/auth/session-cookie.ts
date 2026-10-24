export const SESSION_COOKIE_NAME = 'report_sol_session';

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
