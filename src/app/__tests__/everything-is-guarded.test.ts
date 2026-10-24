import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { analyzePage, analyzeRoute, classifyAppFile, stripComments } from './guard-analysis';

/**
 * Structural safety net: a route or page added later without a guard fails here,
 * instead of silently shipping open to the world. The detection rules live in
 * ./guard-analysis (tested apart with good and bad sources).
 */
const SRC_DIR = join(process.cwd(), 'src');
const APP_DIR = join(SRC_DIR, 'app');
const API_DIR = join(APP_DIR, 'api');

const PUBLIC_ROUTES = new Set(['auth/login/route.ts', 'auth/logout/route.ts']);
const PUBLIC_PAGES = new Set(['login/page.tsx']);

function walkAll(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walkAll(full) : [full];
  });
}

const appFiles = walkAll(APP_DIR).map((f) => relative(APP_DIR, f));
const routes = appFiles.filter((f) => classifyAppFile(f) === 'route' && f.startsWith('api/')).map((f) => f.slice('api/'.length));
const pages = appFiles.filter((f) => classifyAppFile(f) === 'page');
const unsupported = appFiles.filter((f) => classifyAppFile(f) === 'unsupported');

describe('the scan itself is complete', () => {
  it('finds no file the scan does not understand (route.tsx, page.jsx, opengraph-image, sitemap...)', () => {
    expect(unsupported, 'These files may serve content but the guard scan cannot check them').toEqual([]);
  });

  it('finds no route.ts outside src/app/api', () => {
    const outside = appFiles.filter((f) => classifyAppFile(f) === 'route' && !f.startsWith('api/'));
    expect(outside).toEqual([]);
  });

  it('has no Pages Router and no Server Actions, which would bypass the route and page guards', () => {
    expect(existsSync(join(SRC_DIR, 'pages')), 'src/pages exists').toBe(false);
    expect(existsSync(join(process.cwd(), 'pages')), 'pages/ exists').toBe(false);

    const withServerActions = walkAll(SRC_DIR)
      .filter((f) => /\.(tsx?|jsx?)$/.test(f) && !f.includes('__tests__'))
      .filter((f) => /^\s*(['"])use server\1/m.test(stripComments(readFileSync(f, 'utf8'))))
      .map((f) => relative(SRC_DIR, f));
    expect(withServerActions, "'use server' files are not guarded by this scan").toEqual([]);
  });

  it('has exactly one edge middleware', () => {
    expect(existsSync(join(SRC_DIR, 'middleware.ts'))).toBe(true);
    expect(existsSync(join(process.cwd(), 'middleware.ts'))).toBe(false);
  });
});

describe('every API route is guarded', () => {
  it('scans the routes (an empty scan would prove nothing)', () => {
    expect(routes.length).toBeGreaterThanOrEqual(20);
  });

  it.each(routes.filter((r) => !PUBLIC_ROUTES.has(r)))('%s has every handler wrapped in withAuth', (route) => {
    expect(analyzeRoute(readFileSync(join(API_DIR, route), 'utf8'))).toEqual([]);
  });

  it('keeps the public allow-list to the login and logout routes only', () => {
    expect([...PUBLIC_ROUTES].sort()).toEqual(['auth/login/route.ts', 'auth/logout/route.ts']);
    for (const route of PUBLIC_ROUTES) expect(routes).toContain(route);
  });
});

describe('every page is guarded', () => {
  it('scans the pages (an empty scan would prove nothing)', () => {
    expect(pages.length).toBeGreaterThanOrEqual(12);
  });

  it.each(pages.filter((p) => !PUBLIC_PAGES.has(p)))('%s checks the session', (page) => {
    const file = join(APP_DIR, page);
    const analysis = analyzePage(readFileSync(file, 'utf8'));
    if (analysis.selfGuarded) return;

    // Layouts and pages render in parallel, so a page that reads data on the server must
    // guard itself. Only client pages (data comes through the guarded /api) may rely on a layout.
    expect(
      analysis.isClient,
      `${page} is a server page and must call \`await requireAccount()\` itself (imported from '@/lib/auth/server')`
    ).toBe(true);

    // Walk up to (not including) the root layout, which also wraps the public /login page.
    let dir = dirname(file);
    let guardedByLayout = false;
    while (dir !== APP_DIR) {
      const layout = join(dir, 'layout.tsx');
      if (existsSync(layout) && analyzePage(readFileSync(layout, 'utf8')).selfGuarded) guardedByLayout = true;
      dir = dirname(dir);
    }
    expect(guardedByLayout, `${page} is a client page without a guarded layout above it`).toBe(true);
  });

  it('keeps the root layout free of the guard, because /login lives under it', () => {
    expect(analyzePage(readFileSync(join(APP_DIR, 'layout.tsx'), 'utf8')).selfGuarded).toBe(false);
  });
});
