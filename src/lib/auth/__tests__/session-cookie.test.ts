import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SESSION_COOKIE_NAME, readSessionToken } from '../session-cookie';

describe('readSessionToken', () => {
  it('reads the token from a cookie header with other cookies around it', () => {
    expect(readSessionToken(`a=1; ${SESSION_COOKIE_NAME}=tok; b=2`)).toBe('tok');
  });

  it('returns undefined when the header is missing, empty or has no session cookie', () => {
    expect(readSessionToken(null)).toBeUndefined();
    expect(readSessionToken('')).toBeUndefined();
    expect(readSessionToken('a=1; b=2')).toBeUndefined();
    expect(readSessionToken(`${SESSION_COOKIE_NAME}=`)).toBeUndefined();
  });

  it('keeps "=" characters that belong to the value', () => {
    expect(readSessionToken(`${SESSION_COOKIE_NAME}=abc==`)).toBe('abc==');
  });

  it('does not take a cookie whose name only ends like the session cookie', () => {
    expect(readSessionToken(`x${SESSION_COOKIE_NAME}=evil`)).toBeUndefined();
  });

  it('with the cookie repeated, always picks the first one', () => {
    expect(readSessionToken(`${SESSION_COOKIE_NAME}=first; ${SESSION_COOKIE_NAME}=second`)).toBe('first');
  });
});

describe('one single way to read the session cookie', () => {
  const SRC = join(process.cwd(), 'src');
  const ALLOWED = new Set(['lib/auth/session-cookie.ts']);

  function walk(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) return entry === '__tests__' ? [] : walk(full);
      return /\.(ts|tsx)$/.test(entry) ? [full] : [];
    });
  }

  it('no source file reads the session cookie through the framework cookie jar', () => {
    // request.cookies.get(...), (await cookies()).get(...) and the like pick a different
    // duplicate than readSessionToken, so the same request could be judged by two tokens.
    const offenders = walk(SRC)
      .map((file) => ({ file: relative(SRC, file), source: readFileSync(file, 'utf8') }))
      .filter(({ file }) => !ALLOWED.has(file))
      .filter(({ source }) => /\.cookies\.get\(\s*SESSION_COOKIE_NAME|cookies\(\)\)?\.get\(\s*SESSION_COOKIE_NAME/.test(source))
      .map(({ file }) => file);
    expect(offenders).toEqual([]);
  });
});
