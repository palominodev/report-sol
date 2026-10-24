import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isPublicRequest } from '@/lib/auth/access-policy';
import { analyzePage, analyzeRoute, classifyAppFile, HTTP_METHODS, stripComments } from './guard-analysis';

/**
 * Structural safety net: a route or page added later without a guard fails here,
 * instead of silently shipping open to the world. The detection rules live in
 * ./guard-analysis (tested apart with good and bad sources).
 */
const SRC_DIR = join(process.cwd(), 'src');
const APP_DIR = join(SRC_DIR, 'app');
const API_DIR = join(APP_DIR, 'api');

/**
 * Whether the access policy lets an anonymous visitor reach a route or page is decided by
 * `isPublicRequest` (src/lib/auth/access-policy.ts). This test reads that same function, so a
 * route or page is public only if it is listed there AND does not call the guard, and private
 * only if it calls it: the policy and the code cannot drift apart.
 */
const routePath = (route: string) => `/api/${route.replace(/\/?route\.ts$/, '')}`;
/** Pages with a dynamic segment get a plausible value, e.g. /grupo/[id_grupo] -> /grupo/1. */
const pagePath = (page: string) => `/${page.replace(/\/?page\.tsx$/, '').replace(/\[[^\]]+\]/g, '1')}`.replace(/^\/\/$/, '/');

/** Methods the policy makes public AND the route file actually exports. */
const publicMethodsOf = (route: string) => {
  const source = stripComments(readFileSync(join(API_DIR, route), 'utf8'));
  return HTTP_METHODS.filter(
    (m) =>
      isPublicRequest(m, routePath(route)) &&
      new RegExp(`export\\s+(?:async\\s+)?function\\s+${m}\\b|export\\s+(?:const|let|var)\\s+${m}\\b`).test(source)
  );
};
const isPublicPage = (page: string) => isPublicRequest('GET', pagePath(page));

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

  it.each(routes)('%s: every handler matches the access policy', (route) => {
    // Methods the policy makes public are left unwrapped; every other one must be wrapped in withAuth.
    expect(analyzeRoute(readFileSync(join(API_DIR, route), 'utf8'), publicMethodsOf(route))).toEqual([]);
  });

  it('makes public only the sign-in routes and the report submission, nothing else', () => {
    const publicCalls = routes.flatMap((route) => publicMethodsOf(route).map((m) => `${m} ${routePath(route)}`));
    expect(publicCalls.sort()).toEqual(
      ['POST /api/auth/login', 'POST /api/auth/logout', 'POST /api/informe'].sort()
    );
  });

  it('keeps every other method of the public report route private', () => {
    const informe = routes.find((r) => r === 'informe/route.ts');
    expect(informe).toBeDefined();
    expect(publicMethodsOf(informe as string)).toEqual(['POST']);
  });
});

describe('every page is guarded', () => {
  it('scans the pages (an empty scan would prove nothing)', () => {
    expect(pages.length).toBeGreaterThanOrEqual(12);
  });

  it.each(pages.filter((p) => !isPublicPage(p)))('%s is private and checks the session', (page) => {
    const file = join(APP_DIR, page);
    const analysis = analyzePage(readFileSync(file, 'utf8'));
    if (analysis.selfGuarded) return;

    // Layouts and pages render in parallel, so a page that reads data on the server must
    // guard itself. Only client pages (data comes through the guarded /api) may rely on a layout.
    expect(
      analysis.isClient,
      `${page} is a server page and must call \`await requireAccount()\` itself (imported from '@/lib/auth/server')`
    ).toBe(true);

    // Walk up to (not including) the root layout, which also wraps the public pages.
    let dir = dirname(file);
    let guardedByLayout = false;
    while (dir !== APP_DIR) {
      const layout = join(dir, 'layout.tsx');
      if (existsSync(layout) && analyzePage(readFileSync(layout, 'utf8')).selfGuarded) guardedByLayout = true;
      dir = dirname(dir);
    }
    expect(guardedByLayout, `${page} is a client page without a guarded layout above it`).toBe(true);
  });

  it.each(pages.filter((p) => isPublicPage(p)))('%s is public, so it must NOT call the guard', (page) => {
    const analysis = analyzePage(readFileSync(join(APP_DIR, page), 'utf8'));
    expect(analysis.selfGuarded, `${page} is public in the access policy but calls requireAccount()`).toBe(false);
  });

  it('makes public only the sign-in page and the data-entry pages, nothing else', () => {
    const publicPages = pages.filter((p) => isPublicPage(p)).map(pagePath);
    expect(publicPages.sort()).toEqual(['/', '/grupo', '/grupo/1', '/login'].sort());
  });

  it('keeps the root layout free of the guard, because the public pages live under it', () => {
    expect(analyzePage(readFileSync(join(APP_DIR, 'layout.tsx'), 'utf8')).selfGuarded).toBe(false);
  });

  it('does not let a public page read data that belongs to the private screens', () => {
    for (const page of pages.filter((p) => isPublicPage(p) && p !== 'login/page.tsx')) {
      const source = readFileSync(join(APP_DIR, page), 'utf8');
      expect(source, `${page} must not import the stats or accounts code`).not.toMatch(
        /getDashboardStats|getAccount|CreateAccount|dashboard\/cuentas|PublisherStats/
      );
    }
  });
});
