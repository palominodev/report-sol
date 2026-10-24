export const DEFAULT_AFTER_LOGIN_PATH = '/dashboard';

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

/**
 * Where to send the person after signing in. Only same-site paths are accepted,
 * so a crafted link can never use the login screen to bounce someone to another site.
 */
export function safeRedirectPath(candidate: string | null | undefined): string {
  if (!candidate) return DEFAULT_AFTER_LOGIN_PATH;
  if (CONTROL_CHARACTERS.test(candidate)) return DEFAULT_AFTER_LOGIN_PATH;
  if (!candidate.startsWith('/')) return DEFAULT_AFTER_LOGIN_PATH;
  // "//host" and "/\host" are read by browsers as another site.
  if (candidate.startsWith('//') || candidate.startsWith('/\\')) return DEFAULT_AFTER_LOGIN_PATH;
  if (candidate === '/login' || candidate.startsWith('/login?') || candidate.startsWith('/login/')) {
    return DEFAULT_AFTER_LOGIN_PATH;
  }
  return candidate;
}
