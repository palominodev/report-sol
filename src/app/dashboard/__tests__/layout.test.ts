import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireAccount = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth/server', () => ({ requireAccount }));
import Layout from '../layout';

type Node = React.ReactNode;

/** Walks props recursively, expanding function components (the layout's own tree only). */
function collect(node: Node, out: { hrefs: string[]; texts: string[]; types: unknown[]; elements: React.ReactElement[] }) {
  if (node == null || typeof node === 'boolean') return out;
  if (typeof node === 'string' || typeof node === 'number') { out.texts.push(String(node)); return out; }
  if (Array.isArray(node)) { node.forEach((n) => collect(n, out)); return out; }
  const el = node as React.ReactElement<Record<string, unknown>>;
  out.elements.push(el);
  out.types.push(el.type);
  if (typeof el.props?.href === 'string') out.hrefs.push(el.props.href);
  for (const value of Object.values(el.props ?? {})) {
    if (typeof value === 'object' && value !== null) collect(value as Node, out);
    else if (typeof value === 'string') out.texts.push(value);
  }
  return out;
}

async function render(rol: 'administrador' | 'normal') {
  requireAccount.mockResolvedValue({ id: 1, username: 'maria', rol, activa: true });
  const child = React.createElement('main', { id: 'child' }, 'contenido');
  const tree = await Layout({ children: child });
  return { tree, child, found: collect(tree as Node, { hrefs: [], texts: [], types: [], elements: [] }) };
}

beforeEach(() => { requireAccount.mockReset(); });

describe('dashboard layout', () => {
  it('calls requireAccount first and includes the children', async () => {
    const { found, child } = await render('normal');
    expect(requireAccount).toHaveBeenCalledTimes(1);
    expect(found.elements).toContain(child);
  });

  it('shows the Cuentas link only to administrators', async () => {
    expect((await render('administrador')).found.hrefs).toContain('/dashboard/cuentas');
    expect((await render('normal')).found.hrefs).not.toContain('/dashboard/cuentas');
  });

  it('shows who is signed in', async () => {
    const { found } = await render('normal');
    expect(found.texts.join(' ')).toContain('maria');
  });

  it('does not render anything when the guard rejects', async () => {
    requireAccount.mockImplementation(async () => { throw new Error('NEXT_REDIRECT'); });
    await expect(Layout({ children: null })).rejects.toThrow('NEXT_REDIRECT');
  });
});
