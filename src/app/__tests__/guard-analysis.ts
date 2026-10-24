/**
 * Pure analysis behind the structural "everything is guarded" test. It lives apart from the
 * file walk so the detection itself can be tested with good and bad sources.
 */

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;

const GUARD_MODULE = '@/lib/auth/server';

/** Removes // and /* *\/ comments without touching `//` inside string literals. */
export function stripComments(source: string): string {
  let out = '';
  let i = 0;
  let quote: string | null = null;
  while (i < source.length) {
    const c = source[i];
    const next = source[i + 1];
    if (quote) {
      out += c;
      if (c === '\\') {
        out += next ?? '';
        i += 2;
        continue;
      }
      if (c === quote) quote = null;
      i += 1;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      quote = c;
      out += c;
      i += 1;
      continue;
    }
    if (c === '/' && next === '/') {
      while (i < source.length && source[i] !== '\n') i += 1;
      continue;
    }
    if (c === '/' && next === '*') {
      i += 2;
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) i += 1;
      i += 2;
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}

function importsFromGuardModule(code: string, name: string): boolean {
  const pattern = new RegExp(
    `import\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*['"]${GUARD_MODULE.replace(/[/@]/g, '\\$&')}['"]`
  );
  return pattern.test(code);
}

/** Problems found in a route.ts source; an empty list means every handler is guarded. */
export function analyzeRoute(source: string): string[] {
  const code = stripComments(source);
  const problems: string[] = [];

  if (/export\s*\*\s*from|export\s*\{[^}]*\}\s*from/.test(code)) {
    problems.push('re-export from another module: the handlers it brings in cannot be checked');
  }
  if (/export\s*\{[^}]*\}\s*;?/.test(code.replace(/export\s*\{[^}]*\}\s*from/g, ''))) {
    problems.push('re-export with `export { ... }`: a handler declared elsewhere in the file is exported unwrapped');
  }
  if (/export\s+default\b/.test(code)) {
    problems.push('default export in a route file');
  }

  const exported = HTTP_METHODS.filter((method) =>
    new RegExp(`export\\s+(?:async\\s+)?function\\s+${method}\\b|export\\s+(?:const|let|var)\\s+${method}\\b`).test(code)
  );
  if (exported.length === 0) problems.push('no HTTP handler exported');

  for (const method of exported) {
    if (!new RegExp(`export\\s+const\\s+${method}\\s*=\\s*withAuth\\(`).test(code)) {
      problems.push(`${method} is not wrapped in withAuth`);
    }
  }

  if (exported.length > 0 && !importsFromGuardModule(code, 'withAuth')) {
    problems.push(`withAuth must be imported from '${GUARD_MODULE}'`);
  }
  return problems;
}

export interface PageAnalysis {
  isClient: boolean;
  selfGuarded: boolean;
}

export function analyzePage(source: string): PageAnalysis {
  const code = stripComments(source);
  return {
    isClient: /^\s*(['"])use client\1/.test(code),
    selfGuarded: /\bawait\s+requireAccount\(/.test(code) && importsFromGuardModule(code, 'requireAccount'),
  };
}

export type AppFileKind = 'route' | 'page' | 'ignored' | 'unsupported';

const SPECIAL_CONTENT_FILE = /(^|\/)(opengraph-image|twitter-image|icon|apple-icon|sitemap|robots|manifest)\.(tsx?|jsx?|mjs)$/;

/**
 * Decides what the scan does with a file under src/app. Anything that could serve content but is
 * not understood by the scan is `unsupported`, so the test fails instead of silently skipping it.
 */
export function classifyAppFile(relativePath: string): AppFileKind {
  if (relativePath.split('/').includes('__tests__')) return 'ignored';
  const name = relativePath.split('/').pop() ?? '';

  if (name === 'route.ts') return 'route';
  if (name === 'page.tsx') return 'page';
  if (/^(route|page)\.(tsx|jsx|js|mjs|mdx|ts)$/.test(name)) return 'unsupported';
  if (SPECIAL_CONTENT_FILE.test(relativePath)) return 'unsupported';
  return 'ignored';
}
