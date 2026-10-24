import { describe, expect, it } from 'vitest';
import {
  analyzePage,
  analyzeRoute,
  classifyAppFile,
  stripComments,
} from './guard-analysis';

const GOOD_IMPORT = "import { withAuth } from '@/lib/auth/server';\n";

describe('stripComments', () => {
  it('removes line and block comments so a guard mentioned in a comment does not count', () => {
    const source = "// await requireAccount();\n/* export const GET = withAuth( */\nconst x = 1;";
    expect(stripComments(source)).not.toMatch(/requireAccount|withAuth/);
    expect(stripComments(source)).toContain('const x = 1;');
  });

  it('keeps a // inside a string (a URL) intact', () => {
    expect(stripComments("const u = 'http://localhost';")).toContain('http://localhost');
  });
});

describe('analyzeRoute', () => {
  it('accepts every handler wrapped in withAuth imported from the shared module', () => {
    const source = `${GOOD_IMPORT}export const GET = withAuth(async () => new Response('ok'));\nexport const POST = withAuth(async () => new Response('ok'), { role: 'administrador' });`;
    expect(analyzeRoute(source)).toEqual([]);
  });

  it('flags a plain exported handler function', () => {
    expect(analyzeRoute(`${GOOD_IMPORT}export async function GET() { return new Response('x'); }`).join(' ')).toMatch(
      /GET.*withAuth/
    );
  });

  it('flags a handler declared separately and re-exported with `export { }`', () => {
    const source = `${GOOD_IMPORT}export const GET = withAuth(async () => new Response('ok'));\nasync function POST() { return new Response('x'); }\nexport { POST };`;
    expect(analyzeRoute(source).join(' ')).toMatch(/re-export|export \{/i);
  });

  it('flags `export * from` and `export { x } from`', () => {
    expect(analyzeRoute("export * from './other';").join(' ')).toMatch(/re-export/i);
    expect(analyzeRoute("export { GET } from './other';").join(' ')).toMatch(/re-export/i);
  });

  it('flags a handler wrapped by something other than withAuth', () => {
    const source = `${GOOD_IMPORT}export const GET = someOtherWrapper(async () => new Response('x'));`;
    expect(analyzeRoute(source).join(' ')).toMatch(/GET.*withAuth/);
  });

  it('flags a route whose withAuth does not come from @/lib/auth/server', () => {
    const source = "import { withAuth } from './fake-auth';\nexport const GET = withAuth(async () => new Response('x'));";
    expect(analyzeRoute(source).join(' ')).toMatch(/@\/lib\/auth\/server/);
  });

  it('flags a route with no exported handler at all', () => {
    expect(analyzeRoute(`${GOOD_IMPORT}export const dynamic = 'force-dynamic';`).join(' ')).toMatch(/no HTTP handler/i);
  });

  it('does not let a guard written in a comment satisfy the check', () => {
    const source = `${GOOD_IMPORT}// export const GET = withAuth(\nexport async function GET() { return new Response('x'); }`;
    expect(analyzeRoute(source).join(' ')).toMatch(/GET.*withAuth/);
  });

  it('flags a default export, which has no meaning in a route file', () => {
    const source = `${GOOD_IMPORT}export const GET = withAuth(async () => new Response('ok'));\nexport default function X() {}`;
    expect(analyzeRoute(source).join(' ')).toMatch(/default export/i);
  });
});

describe('analyzeRoute with a public method (S7)', () => {
  const MIXED =
    `${GOOD_IMPORT}export const GET = withAuth(async () => new Response('ok'));\n` +
    "export async function POST() { return new Response('ok'); }";

  it('accepts a method the policy makes public when it is NOT wrapped, and still requires the rest wrapped', () => {
    expect(analyzeRoute(MIXED, ['POST'])).toEqual([]);
  });

  it('flags a public method that is wrapped in withAuth: the policy and the server would disagree', () => {
    const source = `${GOOD_IMPORT}export const POST = withAuth(async () => new Response('ok'));`;
    expect(analyzeRoute(source, ['POST']).join(' ')).toMatch(/POST.*public.*withAuth/i);
  });

  it('still flags a private method left unwrapped next to a public one', () => {
    const source = `${GOOD_IMPORT}export async function GET() { return new Response('x'); }\nexport async function POST() { return new Response('x'); }`;
    expect(analyzeRoute(source, ['POST']).join(' ')).toMatch(/GET is not wrapped/);
  });

  it('does not accept an unwrapped method just because it is named like a public one', () => {
    expect(analyzeRoute(MIXED).join(' ')).toMatch(/POST is not wrapped/);
  });

  it('still needs an exported handler at all', () => {
    expect(analyzeRoute("export const dynamic = 'force-dynamic';", ['POST']).join(' ')).toMatch(/no HTTP handler/i);
  });
});

describe('analyzePage', () => {
  const IMPORT = "import { requireAccount } from '@/lib/auth/server';\n";

  it('recognises a server page that awaits requireAccount imported from the shared module', () => {
    const page = analyzePage(`${IMPORT}export default async function P() { await requireAccount(); return null; }`);
    expect(page.selfGuarded).toBe(true);
    expect(page.isClient).toBe(false);
  });

  it('does not count a requireAccount call that is not awaited', () => {
    const page = analyzePage(`${IMPORT}export default async function P() { requireAccount(); return null; }`);
    expect(page.selfGuarded).toBe(false);
  });

  it('does not count requireAccount that only appears in a comment', () => {
    const page = analyzePage("// await requireAccount();\nexport default async function P() { return null; }");
    expect(page.selfGuarded).toBe(false);
  });

  it('does not count a requireAccount that comes from somewhere else', () => {
    const page = analyzePage(
      "import { requireAccount } from './fake';\nexport default async function P() { await requireAccount(); return null; }"
    );
    expect(page.selfGuarded).toBe(false);
  });

  it('detects a client page', () => {
    expect(analyzePage("'use client';\nexport default function P() { return null; }").isClient).toBe(true);
    expect(analyzePage('"use client"\nexport default function P() { return null; }').isClient).toBe(true);
  });

  it('does not take a use-client mention inside a comment for the directive', () => {
    expect(analyzePage("// 'use client'\nexport default function P() { return null; }").isClient).toBe(false);
  });
});

describe('classifyAppFile', () => {
  it('knows the supported route and page files', () => {
    expect(classifyAppFile('api/informe/route.ts')).toBe('route');
    expect(classifyAppFile('dashboard/page.tsx')).toBe('page');
    expect(classifyAppFile('dashboard/layout.tsx')).toBe('ignored');
    expect(classifyAppFile('components/Foo.tsx')).toBe('ignored');
    expect(classifyAppFile('icon.png')).toBe('ignored');
  });

  it('refuses route and page variants the scan does not understand', () => {
    for (const file of ['api/x/route.tsx', 'api/x/route.js', 'api/x/route.mjs', 'x/page.jsx', 'x/page.js', 'x/page.mdx']) {
      expect(classifyAppFile(file), file).toBe('unsupported');
    }
  });

  it('refuses special files that serve content outside the page and route scan', () => {
    for (const file of [
      'opengraph-image.tsx',
      'dashboard/twitter-image.tsx',
      'sitemap.ts',
      'robots.ts',
      'manifest.ts',
      'api/x/opengraph-image.js',
    ]) {
      expect(classifyAppFile(file), file).toBe('unsupported');
    }
  });

  it('treats test folders as ignored', () => {
    expect(classifyAppFile('api/__tests__/route.test.ts')).toBe('ignored');
  });
});
