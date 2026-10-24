import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type AuthedFetch = typeof import('../authed-fetch').authedFetch;

async function load(): Promise<AuthedFetch> {
  // Fresh module per test: the "navigate once" guard is module-level.
  vi.resetModules();
  return (await import('../authed-fetch')).authedFetch;
}

function res(status: number): Response {
  return new Response(status === 401 ? '{"error":"Necesitás iniciar sesión."}' : '{}', { status });
}

async function settlesWithin(p: Promise<unknown>): Promise<boolean> {
  const sentinel = Symbol('sentinel');
  const winner = await Promise.race([
    p,
    (async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve();
      return sentinel;
    })(),
  ]);
  return winner !== sentinel;
}

describe('authedFetch', () => {
  let authedFetch: AuthedFetch;
  beforeEach(async () => {
    authedFetch = await load();
  });

  it('on 401 navigates once to /login?next=<path+query> and never settles', async () => {
    const navigate = vi.fn();
    const p = authedFetch('/api/grupos', undefined, {
      fetchFn: vi.fn().mockResolvedValue(res(401)),
      navigate,
      currentLocation: () => '/dashboard/publicadores?q=ana&x=1',
    });
    expect(await settlesWithin(p)).toBe(false);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(
      '/login?next=%2Fdashboard%2Fpublicadores%3Fq%3Dana%26x%3D1',
    );
  });

  it('navigates only once for parallel 401 responses', async () => {
    const navigate = vi.fn();
    const deps = {
      fetchFn: vi.fn().mockImplementation(async () => res(401)),
      navigate,
      currentLocation: () => '/dashboard',
    };
    void authedFetch('/api/a', undefined, deps);
    void authedFetch('/api/b', undefined, deps);
    await settlesWithin(authedFetch('/api/c', undefined, deps));
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it.each([200, 403, 404, 500])('returns status %i untouched without navigating', async (status) => {
    const navigate = vi.fn();
    const response = res(status);
    const out = await authedFetch('/api/x', undefined, {
      fetchFn: vi.fn().mockResolvedValue(response),
      navigate,
      currentLocation: () => '/dashboard',
    });
    expect(out).toBe(response);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('propagates network errors without navigating', async () => {
    const navigate = vi.fn();
    const err = new TypeError('Failed to fetch');
    await expect(
      authedFetch('/api/x', undefined, {
        fetchFn: vi.fn().mockRejectedValue(err),
        navigate,
        currentLocation: () => '/dashboard',
      }),
    ).rejects.toBe(err);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('keeps next path-only even when the input URL is absolute', async () => {
    const navigate = vi.fn();
    void authedFetch('http://localhost:3002/api/grupos', undefined, {
      fetchFn: vi.fn().mockResolvedValue(res(401)),
      navigate,
      currentLocation: () => '/dashboard?a=1',
    });
    await settlesWithin(new Promise(() => {}));
    expect(navigate).toHaveBeenCalledTimes(1);
    const url = navigate.mock.calls[0][0] as string;
    expect(url).toBe('/login?next=%2Fdashboard%3Fa%3D1');
    expect(decodeURIComponent(url.split('next=')[1])).toMatch(/^\/(?!\/)/);
    expect(url).not.toContain('localhost');
  });

  it('passes input and init to the underlying fetch by reference', async () => {
    const fetchFn = vi.fn().mockResolvedValue(res(200));
    const input = new URL('http://localhost/api/x');
    const init = { method: 'POST', body: '{"a":1}' };
    await authedFetch(input, init, {
      fetchFn,
      navigate: vi.fn(),
      currentLocation: () => '/dashboard',
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn.mock.calls[0][0]).toBe(input);
    expect(fetchFn.mock.calls[0][1]).toBe(init);
  });
});

describe('client screens use authedFetch', () => {
  const files = [
    'src/components/ListaIntegrantes.tsx',
    'src/components/InformeCard.tsx',
    'src/components/TablaInformes.tsx',
    'src/components/ListaInformes.tsx',
    'src/app/components/FormularioUsuario.tsx',
    'src/app/dashboard/page.tsx',
    'src/app/dashboard/publicadores/page.tsx',
    'src/app/dashboard/publicadores/GestionGruposModal.tsx',
    'src/app/dashboard/publicadores/Filtro.tsx',
  ];
  const bareFetch = /(?<![\w$.])fetch\s*\(/;

  it.each(files)('%s has no bare fetch( call', (file) => {
    const source = readFileSync(join(process.cwd(), file), 'utf8');
    expect(bareFetch.test(source)).toBe(false);
  });
});
