import type { ReactElement, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Node-only runtime harness: exercise component props/handlers and rerenders without a DOM.
const hooks = vi.hoisted(() => ({ values: [] as unknown[], cursor: 0 }));
vi.mock('react', async (original) => ({
  ...await original<typeof import('react')>(),
  useState: (initial: unknown) => {
    const index = hooks.cursor++;
    const values = hooks.values;
    if (!(index in values)) values[index] = typeof initial === 'function' ? initial() : initial;
    return [values[index], (value: unknown) => {
      values[index] = typeof value === 'function' ? value(values[index]) : value;
    }];
  },
}));
vi.mock('@/lib/auth/authed-fetch', () => ({ authedFetch: vi.fn() }));
import { authedFetch } from '@/lib/auth/authed-fetch';
import FormularioInforme from '../FormularioInforme';
import ListaIntegrantes from '../ListaIntegrantes';

type Node = ReactElement<Record<string, any>>; // Runtime element props, including event handlers.
function nodes(tree: ReactNode): Node[] {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== 'object' || !('props' in tree)) return [];
  const node = tree as Node;
  return [node, ...nodes(node.props.children)];
}
function harness<P>(Component: (props: P) => ReactNode, props: P) {
  const values: unknown[] = [];
  return () => {
    hooks.values = values;
    hooks.cursor = 0;
    return Component(props);
  };
}
function form(onSubmit = vi.fn(async () => {}), roles = ['publicador']) {
  const onClose = vi.fn();
  const render = harness(FormularioInforme, {
    id_usuario: 7, nombre: 'Ana', apellido: 'Sol', roles, onClose, onSubmit,
  });
  return { render, onClose, onSubmit };
}
function field(render: () => ReactNode, id: string) {
  return nodes(render()).find((node) => node.props.id === id)!;
}
function button(render: () => ReactNode, name: 'Cerrar' | 'Cancelar') {
  return nodes(render()).find((node) => node.type === 'button' &&
    (node.props['aria-label'] === name || node.props.children === name))!;
}
function change(render: () => ReactNode, id: string, value: string | boolean) {
  field(render, id).props.onChange({ target: { value, checked: value } });
}
function submit(render: () => ReactNode): Promise<void> {
  return nodes(render()).find((node) => node.type === 'form')!.props.onSubmit({ preventDefault: vi.fn() });
}
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 0, 15));
  vi.stubGlobal('window', { confirm: vi.fn(() => false), location: { reload: vi.fn() } });
  vi.stubGlobal('alert', vi.fn());
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('informe draft close protection', () => {
  it.each(['Cerrar', 'Cancelar'] as const)('closes untouched via %s without confirmation', (action) => {
    const { render, onClose } = form();
    button(render, action).props.onClick();
    expect(onClose).toHaveBeenCalledOnce();
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it.each(['Cerrar', 'Cancelar'] as const)('requires explicit discard via %s and preserves edits when declined', (action) => {
    const { render, onClose } = form();
    change(render, 'informe-notas', 'Conservar esta nota');
    button(render, action).props.onClick();
    expect(window.confirm).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
    expect(field(render, 'informe-notas').props.value).toBe('Conservar esta nota');
    vi.mocked(window.confirm).mockReturnValue(true);
    button(render, action).props.onClick();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('treats reverted values and empty notes as unchanged', () => {
    const { render, onClose } = form();
    change(render, 'informe-notas', 'temporal');
    change(render, 'informe-notas', '');
    change(render, 'informe-cursos', '4');
    change(render, 'informe-cursos', '0');
    change(render, 'participacion', false);
    change(render, 'participacion', true);
    change(render, 'trabajo_como_auxiliar', true);
    change(render, 'trabajo_como_auxiliar', false);
    button(render, 'Cancelar').props.onClick();
    expect(onClose).toHaveBeenCalledOnce();
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it.each(['informe-cursos', 'participacion', 'trabajo_como_auxiliar', 'informe-horas'])('guards actual changes to %s', (id) => {
    const { render, onClose } = form(vi.fn(async () => {}), id === 'informe-horas' ? ['regular'] : ['publicador']);
    change(render, id, id === 'participacion' ? false : id === 'trabajo_como_auxiliar' ? true : '3');
    button(render, 'Cancelar').props.onClick();
    expect(window.confirm).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('disables and guards every close action while pending, then closes on success without confirmation', async () => {
    const pending = deferred();
    const { render, onClose } = form(vi.fn(() => pending.promise));
    change(render, 'informe-cursos', '2');
    const saving = submit(render);
    for (const action of ['Cerrar', 'Cancelar'] as const) {
      expect(button(render, action).props.disabled).toBe(true);
      button(render, action).props.onClick();
    }
    expect(onClose).not.toHaveBeenCalled();
    expect(window.confirm).not.toHaveBeenCalled();
    pending.resolve();
    await saving;
    expect(onClose).toHaveBeenCalledOnce();
    expect(window.confirm).not.toHaveBeenCalled();
  });
});

describe('informe submission through ListaIntegrantes', () => {
  it.each(['http', 'network', 'json'] as const)('keeps every value after %s failure and retries the identical payload successfully', async (failure) => {
    const fetch = vi.mocked(authedFetch);
    if (failure === 'http') fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Servicio no disponible' }) } as Response);
    if (failure === 'network') fetch.mockRejectedValueOnce(new Error('Sin conexión'));
    if (failure === 'json') fetch.mockResolvedValueOnce({ ok: false, json: async () => { throw new Error('Respuesta inválida'); } } as unknown as Response);
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response);
    const renderList = harness(ListaIntegrantes, {
      integrantes: [{ id_usuario: 7, nombre: 'Ana', apellido: 'Sol', rol_en_grupo: 'miembro', roles: 'publicador', informe_enviado: false }],
      nombreGrupo: 'Grupo', mes: 'DIC', año: 2025, informeInicialId: 7,
    });
    const initialForm = nodes(renderList()).find((node) => node.type === FormularioInforme)!;
    const render = harness(FormularioInforme, initialForm.props as unknown as Parameters<typeof FormularioInforme>[0]);
    change(render, 'trabajo_como_auxiliar', true);
    change(render, 'informe-horas', '25');
    change(render, 'informe-cursos', '3');
    change(render, 'informe-notas', 'Visitas pendientes');
    change(render, 'participacion', false);
    // Capture rejection on the broken base to avoid an unrelated unhandled-rejection failure.
    await submit(render).catch(() => {});
    expect(nodes(renderList()).some((node) => node.type === FormularioInforme)).toBe(true);
    const error = nodes(render()).find((node) => node.props.role === 'alert');
    expect(error).toBeDefined();
    expect(JSON.stringify(error!.props.children)).toMatch(/Guardar Informe/);
    expect(field(render, 'informe-horas').props.value).toBe(25);
    expect(field(render, 'informe-cursos').props.value).toBe(3);
    expect(field(render, 'informe-notas').props.value).toBe('Visitas pendientes');
    expect(field(render, 'participacion').props.checked).toBe(false);
    expect(field(render, 'trabajo_como_auxiliar').props.checked).toBe(true);
    expect(button(render, 'Cerrar').props.disabled).toBe(false);
    expect(window.location.reload).not.toHaveBeenCalled();
    await submit(render);
    const expected = { horas: 25, cursos: 3, año: 2025, mes: 'DIC', participacion: false, trabajo_como_auxiliar: true, notas: 'Visitas pendientes', id_usuario: 7 };
    expect(fetch).toHaveBeenCalledTimes(2);
    for (const [url, options] of fetch.mock.calls) {
      expect(url).toBe('/api/informe');
      expect(options?.method).toBe('POST');
      expect(options?.headers).toEqual({ 'Content-Type': 'application/json' });
      expect(JSON.parse(options!.body as string)).toEqual(expected);
    }
    expect(window.location.reload).toHaveBeenCalledOnce();
    expect(nodes(renderList()).some((node) => node.type === FormularioInforme)).toBe(false);
    expect(nodes(render()).some((node) => node.props.role === 'alert')).toBe(false);
    expect(alert).not.toHaveBeenCalled();
    expect(window.confirm).not.toHaveBeenCalled();
  });
});

describe('unchanged period, defaults and roles', () => {
  it.each([[2026, 0, 2025, 'DIC'], [2026, 6, 2026, 'JUN']] as const)('uses the previous month for %s/%s', (year, month, expectedYear, expectedMonth) => {
    vi.setSystemTime(new Date(year, month, 15));
    const { render } = form();
    expect(field(render, 'informe-año').props).toMatchObject({ value: expectedYear, disabled: true });
    expect(field(render, 'informe-mes').props).toMatchObject({ value: expectedMonth, disabled: true });
    expect(field(render, 'informe-cursos').props.value).toBe(0);
    expect(field(render, 'informe-notas').props.value).toBe('');
    expect(field(render, 'participacion').props.checked).toBe(true);
    expect(field(render, 'trabajo_como_auxiliar').props.checked).toBe(false);
    expect(field(render, 'informe-horas')).toBeUndefined();
    change(render, 'trabajo_como_auxiliar', true);
    expect(field(render, 'informe-horas').props.value).toBe(0);
  });

  it.each([['regular'], ['auxiliar'], []])('preserves non-publicador hours for %j', (...roles) => {
    const { render } = form(vi.fn(async () => {}), roles as string[]);
    expect(field(render, 'informe-horas').props.value).toBe(0);
    expect(field(render, 'trabajo_como_auxiliar')).toBeUndefined();
  });
});
