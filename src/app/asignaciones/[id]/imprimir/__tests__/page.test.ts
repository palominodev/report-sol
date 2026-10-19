import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PresentationPart } from '@/domain/entities/presentation/PresentationPart';
import { Assignment } from '@/domain/entities/presentation/Assignment';
import { SourceRef } from '@/domain/entities/presentation/SourceRef';

const state = vi.hoisted(() => ({ empty: false }));
vi.mock('next/link', () => ({ default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => React.createElement('a', props, children) }));
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('Not found'); } }));
vi.mock('@/lib/presentation/weeks', () => ({
  getWeekDetail: async () => ({
    week: { id_week: 1, semana: 'Test week' },
    parts: [
      new PresentationPart(1, 1, 1, 'lectura_biblia', 'TESOROS_DE_LA_BIBLIA', 4, null, new SourceRef('bib'), 'A'),
      new PresentationPart(2, 1, 2, 'empiece_conversaciones', 'SEAMOS_MEJORES_MAESTROS', 3, null, new SourceRef('lmd', 5), 'B'),
      new PresentationPart(3, 1, 3, 'discurso', 'SEAMOS_MEJORES_MAESTROS', 5, null, new SourceRef('th'), 'A'),
    ],
    assignments: state.empty ? [] : [
      new Assignment(1, 1, 1, 10, 'presentador', 'confirmed'),
      new Assignment(2, 2, 1, 20, 'presentador', 'manual'),
      new Assignment(3, 2, 1, 30, 'companero', 'confirmed'),
      new Assignment(4, 3, 1, 99, 'presentador', 'draft'),
    ],
  }),
  getAssignableUsers: async () => [
    { id_usuario: 10, nombre: 'A', apellido: 'Person' },
    { id_usuario: 20, nombre: 'B', apellido: 'Person' },
    { id_usuario: 30, nombre: 'C', apellido: 'Person' },
    { id_usuario: 99, nombre: 'Draft', apellido: 'Person' },
  ],
}));
import Page from '../page';

async function render(sala?: string) {
  return renderToStaticMarkup(await Page({ params: Promise.resolve({ id: '1' }), searchParams: Promise.resolve(sala === undefined ? {} : { sala }) }));
}
afterEach(() => { state.empty = false; });

describe('printable program design', () => {
  it('uses home styling on screen and explicitly restores readable white paper output', async () => {
    const html = await render();
    expect(html).toContain('min-h-screen bg-page');
    expect(html).toContain('border-line bg-surface');
    expect(html).toContain('text-brand-light');
    expect(html).not.toContain('rounded-');
    expect(html).not.toContain('slate-');
    expect(html).toContain('print:bg-white');
    expect(html).toContain('print:text-ink-on-light');
    expect(html).toContain('print:text-ink-muted-on-light');
    expect(html).toContain('print:scheme-light');
    expect(html).toContain('data-print-program');
    expect(html).toContain('body:has([data-print-program])');
    expect(html).toContain('background-color: var(--color-surface-light)');
    expect(html).toContain('print:border-black');
    expect(html.match(/print:hidden/g)).toHaveLength(2);
  });

  it.each([undefined, 'invalid'])('preserves the combined program for sala=%s and excludes drafts', async sala => {
    const html = await render(sala);
    expect(html).toContain('A Person');
    expect(html).toContain('B Person');
    expect(html).toContain('C Person');
    expect(html).not.toContain('Draft Person');
    expect(html).not.toContain('Discurso');
    expect(html).toContain('lmd lección 5');
    expect(html).toContain('(3 min)');
    expect(html.indexOf('Lectura de la Biblia')).toBeLessThan(html.indexOf('Empiece conversaciones'));
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('href="/asignaciones/1"');
  });

  it.each(['A', 'B'])('preserves the room %s header and filters participants', async sala => {
    const html = await render(sala);
    expect(html).toContain(`href="/asignaciones/1/imprimir?sala=${sala}" aria-current="page"`);
    expect(html).toContain(sala === 'A' ? 'A Person' : 'B Person');
    expect(html).not.toContain(sala === 'A' ? 'B Person' : 'A Person');
    expect(html).not.toContain('Draft Person');
    expect(html).toContain(sala === 'A' ? 'Sala A (Principal)</p>' : 'Sala B (Auxiliar)</p>');
  });

  it('keeps the empty program message', async () => {
    state.empty = true;
    expect(await render()).toContain('Esta semana no tiene asignaciones confirmadas para imprimir.');
  });
});
