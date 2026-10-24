import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { config, middleware } from '../middleware';

const BASE = 'http://localhost:3000';
const withCookie = { cookie: 'report_sol_session=abc' };

const run = (path: string, headers: Record<string, string> = {}) =>
  middleware(new NextRequest(`${BASE}${path}`, { headers }));

describe('middleware: anonymous visitors', () => {
  it('redirects a page to /login remembering path and query', () => {
    const res = run('/asignaciones/3?sala=B&x=a b');
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(
      `${BASE}/login?next=${encodeURIComponent('/asignaciones/3?sala=B&x=a%20b')}`
    );
  });

  it('redirects /dashboard', () => {
    const res = run('/dashboard');
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(`${BASE}/login?next=%2Fdashboard`);
  });

  it('answers 401 to the API with no-store', async () => {
    const res = run('/api/informe');
    expect(res.status).toBe(401);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(await res.json()).toEqual({ error: 'Necesitás iniciar sesión.' });
  });

  it.each(['/login', '/api/auth/login', '/api/auth/logout'])('lets %s through', (path) => {
    const res = run(path);
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });
});

describe('middleware: with a session cookie', () => {
  it.each(['/dashboard', '/api/informe', '/'])('lets %s through', (path) => {
    const res = run(path, withCookie);
    expect(res.headers.get('x-middleware-next')).toBe('1');
  });
});

describe('middleware matcher', () => {
  // Next compiles each matcher with path-to-regexp and anchors it; the single entry here is a
  // negative-lookahead pattern, so a plain anchored RegExp has the same semantics.
  const regexes = config.matcher.map((m) => new RegExp(`^${m}$`));
  const matches = (path: string) => regexes.some((r) => r.test(path));

  it.each([
    '/_next/static/chunks/main.js',
    '/_next/image',
    '/favicon.ico',
    '/icon.png',
    '/images/home-banner.jpg',
    '/opengraph-report-sol.jpg',
    '/file.svg',
    '/globe.svg',
    '/next.svg',
    '/window.svg',
  ])('does not run on public asset %s', (path) => {
    expect(matches(path)).toBe(false);
  });

  it.each(['/', '/dashboard', '/login', '/api/informe', '/asignaciones/3', '/images', '/opengraph-report-sol.json'])(
    'runs on %s',
    (path) => {
      expect(matches(path)).toBe(true);
    }
  );
});
