import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Structural safety net: a route or page added later without a guard fails here,
 * instead of silently shipping open to the world.
 */
const APP_DIR = join(process.cwd(), 'src', 'app');
const API_DIR = join(APP_DIR, 'api');

const PUBLIC_ROUTES = new Set(['auth/login/route.ts', 'auth/logout/route.ts']);
const PUBLIC_PAGES = new Set(['login/page.tsx']);
const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

function walk(dir: string, fileName: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return entry === '__tests__' ? [] : walk(full, fileName);
    return entry === fileName ? [full] : [];
  });
}

const routes = walk(API_DIR, 'route.ts').map((f) => relative(API_DIR, f));
const pages = walk(APP_DIR, 'page.tsx')
  .map((f) => relative(APP_DIR, f))
  .filter((f) => !f.startsWith('api/'));

describe('every API route is guarded', () => {
  it('scans the routes (an empty scan would prove nothing)', () => {
    expect(routes.length).toBeGreaterThanOrEqual(20);
  });

  it.each(routes.filter((r) => !PUBLIC_ROUTES.has(r)))('%s exports only handlers wrapped in withAuth', (route) => {
    const source = readFileSync(join(API_DIR, route), 'utf8');
    const exported = METHODS.filter((m) =>
      new RegExp(`export\\s+(async\\s+)?function\\s+${m}\\b|export\\s+const\\s+${m}\\b`).test(source)
    );

    expect(exported.length, `${route} exports no HTTP handler`).toBeGreaterThan(0);
    for (const method of exported) {
      expect(source, `${method} in ${route} is not wrapped in withAuth`).toMatch(
        new RegExp(`export\\s+const\\s+${method}\\s*=\\s*withAuth\\(`)
      );
    }
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
    const source = readFileSync(file, 'utf8');
    const selfGuarded = /requireAccount\(/.test(source);
    if (selfGuarded) return;

    // Layouts and pages render in parallel, so a page that reads data on the server must
    // guard itself. Only client pages (data comes through the guarded /api) may rely on a layout.
    const isClientPage = /^\s*(['"])use client\1/.test(source);
    expect(isClientPage, `${page} is a server page and must call requireAccount() itself`).toBe(true);

    // Walk up to (not including) the root layout, which also wraps the public /login page.
    let dir = dirname(file);
    let guardedByLayout = false;
    while (dir !== APP_DIR) {
      const layout = join(dir, 'layout.tsx');
      if (existsSync(layout) && /requireAccount\(/.test(readFileSync(layout, 'utf8'))) guardedByLayout = true;
      dir = dirname(dir);
    }
    expect(guardedByLayout, `${page} is a client page without a guarded layout above it`).toBe(true);
  });

  it('keeps the root layout free of the guard, because /login lives under it', () => {
    const rootLayout = readFileSync(join(APP_DIR, 'layout.tsx'), 'utf8');
    expect(rootLayout).not.toMatch(/requireAccount\(/);
  });
});
