import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
    React.createElement('a', props, children),
}));
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('Not found'); } }));
vi.mock('@/lib/presentation/weeks', () => ({
  getWeekDetail: async () => ({
    week: { id_week: 1, semana: 'Test week', estado: 'borrador' },
    parts: [
      { id_part: 1, sala: 'A', tipo: 'lectura_biblia', seccion: 'TESOROS_DE_LA_BIBLIA', duracion_min: 11, orden: 1, requiresCompanero: () => false },
      { id_part: 2, sala: 'B', tipo: 'lectura_biblia', seccion: 'TESOROS_DE_LA_BIBLIA', duracion_min: 22, orden: 2, requiresCompanero: () => false },
      { id_part: 3, sala: null, tipo: 'lectura_biblia', seccion: 'TESOROS_DE_LA_BIBLIA', duracion_min: 33, orden: 3, requiresCompanero: () => false },
    ],
    assignments: [{ id_part: 1, id_usuario: 1, rol: 'presentador', estado: 'draft' }],
  }),
  getAssignmentHistory: async () => [
    { id_asignacion: 4, id_usuario: 1, id_week: 3, fecha_inicio: '2026-09-21', fecha_fin: '2026-09-27' },
    { id_asignacion: 2, id_usuario: 1, id_week: 2, fecha_inicio: '2026-09-07', fecha_fin: '2026-09-13' },
  ],
  getAssignableUsers: async () => [{ id_usuario: 1, nombre: 'Assigned', apellido: 'Person', genero: 'masculino' }],
}));
vi.mock('../WeekActions', () => ({ default: () => null }));
vi.mock('../OverrideControl', () => ({ default: () => null }));
vi.mock('../SalaControl', () => ({ default: () => null }));

import Page from '../page';

async function render(sala?: string | string[]) {
  return renderToStaticMarkup(await Page({
    params: Promise.resolve({ id: '1' }),
    searchParams: Promise.resolve(sala === undefined ? {} : { sala }),
  }));
}

describe('weekly room navigation', () => {
  it('uses the home design across the entire weekly page, not only the history', async () => {
    const html = await render('A');
    expect(html).toContain('min-h-screen bg-page');
    expect(html).toContain('text-ink');
    expect(html).toContain('border-line bg-surface');
    expect(html).toContain('border-brand-light');
    expect(html).not.toContain('slate-');
    expect(html).not.toContain('rounded-');
    expect(html).not.toContain('bg-white');
    expect(html).not.toContain('shadow-');
  });

  it('places the complete collapsed history below the assigned name', async () => {
    const html = await render('A');
    expect(html).toContain('Assigned Person');
    expect(html).toContain('Historial de asignaciones');
    expect(html).toContain('21/09/2026');
    expect(html).toContain('07/09/2026');
    expect(html).not.toContain('Discurso');
    expect(html).not.toContain('Compañero');
  });

  it('shows only the two room tabs and opens room A by default', async () => {
    const html = await render();
    expect(html).not.toContain('Todas');
    expect(html).toContain('Sala A (Principal)');
    expect(html).toContain('Sala B (Auxiliar)');
    expect(html).toContain('11 min');
    expect(html).not.toContain('22 min');
    expect(html).not.toContain('33 min');
    expect(html).toContain('href="/asignaciones/1?sala=A" aria-current="page"');
  });

  it.each([{ sala: 'invalid' }, { sala: ['A', 'B'] }])('defaults to room A for an invalid query $sala', async ({ sala }) => {
    const html = await render(sala);
    expect(html).toContain('11 min');
    expect(html).not.toContain('22 min');
    expect(html).not.toContain('33 min');
  });

  it.each(['A', 'B'])('preserves explicit room %s filtering and excludes unassigned parts', async (sala) => {
    const html = await render(sala);
    expect(html).toContain(sala === 'A' ? '11 min' : '22 min');
    expect(html).not.toContain(sala === 'A' ? '22 min' : '11 min');
    expect(html).not.toContain('33 min');
    expect(html).toContain(`href="/asignaciones/1?sala=${sala}" aria-current="page"`);
  });
});
