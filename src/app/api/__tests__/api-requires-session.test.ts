import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@libsql/client';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setDatabaseClient } from '@/infrastructure/persistence/database.client';
import { TursoAccountRepository } from '@/infrastructure/persistence/turso-account.repository';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { signIn } from './auth-helpers';

type Handler = (request: NextRequest, context: { params: Promise<Record<string, string>> }) => Promise<Response>;

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
const API_DIR = join(process.cwd(), 'src', 'app', 'api');
const PUBLIC_ROUTES = ['auth/login/route.ts', 'auth/logout/route.ts'];

function walk(dir: string, prefix = ''): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return entry === '__tests__' ? [] : walk(full, `${prefix}${entry}/`);
    return entry === 'route.ts' ? [`${prefix}${entry}`] : [];
  });
}

const protectedRoutes = walk(API_DIR).filter((route) => !PUBLIC_ROUTES.includes(route));
const modules = await Promise.all(
  protectedRoutes.map(async (route) => [route, (await import(/* @vite-ignore */ join(API_DIR, route))) as Record<string, unknown>] as const)
);

const cases = modules.flatMap(([route, mod]) =>
  METHODS.filter((method) => typeof mod[method] === 'function').map((method) => ({
    label: `${method} /api/${route.replace(/\/?route\.ts$/, '')}`,
    route,
    method,
    handler: mod[method] as Handler,
  }))
);

const COUNTED_TABLES = [
  'usuario',
  'grupo',
  'informe',
  'presentation_week',
  'presentation_part',
  'presentation_assignment',
  'cuenta',
  'sesion',
];

let client: ReturnType<typeof createClient>;

async function counts() {
  const result: Record<string, number> = {};
  for (const table of COUNTED_TABLES) {
    result[table] = Number((await client.execute(`SELECT COUNT(*) AS n FROM ${table}`)).rows[0].n);
  }
  return result;
}

function call({ method, route, handler }: (typeof cases)[number], cookie?: string) {
  const url = `http://localhost/api/${route.replace(/\/?route\.ts$/, '').replace(/\[\w+\]/g, '1')}`;
  const request = new NextRequest(url, { method, headers: cookie ? { cookie } : {} });
  return handler(request, { params: Promise.resolve({ id: '1', assignmentId: '1' }) });
}

beforeEach(async () => {
  client = createClient({ url: ':memory:' });
  await client.executeMultiple(readFileSync('src/db.sql', 'utf8'));
  setDatabaseClient(client);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  await client.execute("INSERT INTO usuario (nombre, apellido, genero) VALUES ('Test', 'Person', 'masculino')");
  await client.execute("INSERT INTO grupo (nombre) VALUES ('Grupo 1')");
  await client.execute(
    "INSERT INTO informe (horas, cursos, año, participacion, mes, id_usuario) VALUES (5, 1, 2026, 1, 'OCT', 1)"
  );
  await client.execute(
    `INSERT INTO presentation_week (id_week, semana, issue, fecha_inicio, fecha_fin, estado)
     VALUES (1, 'Week 1', 'test', '2026-10-19', '2026-10-25', 'confirmada')`
  );
  await client.execute(
    `INSERT INTO presentation_part (id_week, orden, tipo, seccion, duracion_min, fuente, sala)
     VALUES (1, 1, 'lectura_biblia', 'TESOROS_DE_LA_BIBLIA', 4, 'bib', 'A')`
  );
  await client.execute(
    `INSERT INTO presentation_assignment (id_part, id_week, id_usuario, rol, estado)
     VALUES (1, 1, 1, 'presentador', 'draft')`
  );
});

afterEach(() => {
  setDatabaseClient(null);
  client.close();
  vi.restoreAllMocks();
});

describe('every protected API route requires a live session', () => {
  it('scans the routes (an empty scan would prove nothing)', () => {
    expect(protectedRoutes.length).toBeGreaterThanOrEqual(18);
    expect(cases.length).toBeGreaterThanOrEqual(protectedRoutes.length);
  });

  describe.each([
    ['no cookie', undefined],
    ['a forged cookie', `${SESSION_COOKIE_NAME}=forged`],
  ])('with %s', (_name, cookie) => {
    it.each(cases)('$label answers 401 and does not cache', async (route) => {
      const response = await call(route, cookie);

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: 'Necesitás iniciar sesión.' });
      expect(response.headers.get('cache-control')).toBe('no-store');
    });
  });

  it('leaves stored data unchanged after every refused call', async () => {
    const before = await counts();

    for (const route of cases) {
      await call(route);
      await call(route, `${SESSION_COOKIE_NAME}=forged`);
    }

    expect(await counts()).toEqual(before);
  });

  it('refuses the session of a deactivated account', async () => {
    const { accountId, cookie } = await signIn('ana');
    await new TursoAccountRepository().setActive(accountId, false);

    const route = cases.find((c) => c.label === 'GET /api/grupos')!;
    const response = await call(route, cookie);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Necesitás iniciar sesión.' });
  });

  it('lets a valid session reach the handler (GET /api/grupos answers 200)', async () => {
    const { cookie } = await signIn('ana');

    const route = cases.find((c) => c.label === 'GET /api/grupos')!;
    const response = await call(route, cookie);

    expect(response.status).toBe(200);
  });
});
