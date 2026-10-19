import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AssignmentHistory from '../AssignmentHistory';
import type { AssignmentHistoryEntry } from '@/core/domain/presentations/AssignmentHistory';

const history: AssignmentHistoryEntry[] = [
  { id_asignacion: 4, id_usuario: 1, id_week: 3, fecha_inicio: '2026-09-21', fecha_fin: '2026-09-27' },
  { id_asignacion: 2, id_usuario: 1, id_week: 2, fecha_inicio: '2026-09-07', fecha_fin: '2026-09-13' },
];

afterEach(() => vi.unstubAllGlobals());

describe('expandable assignment history', () => {
  it('lists every historical week newest first without preloading details or fetching on initial render', () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const html = renderToStaticMarkup(React.createElement(AssignmentHistory, { history, idWeek: 5 }));
    expect(html).toContain('Historial de asignaciones');
    expect(html).toContain('21/09/2026');
    expect(html).toContain('27/09/2026');
    expect(html).toContain('07/09/2026');
    expect(html).toContain('13/09/2026');
    expect(html.indexOf('21/09/2026')).toBeLessThan(html.indexOf('07/09/2026'));
    expect(html.match(/<summary/g)).toHaveLength(2);
    expect(html).not.toContain(' open=');
    expect(html).not.toContain('Empiece conversaciones');
    expect(html).not.toContain('Compañero');
    expect(html).not.toContain('Sala B');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('lays entries out in one horizontal scrollable row without shrinking them', () => {
    const html = renderToStaticMarkup(React.createElement(AssignmentHistory, { history, idWeek: 5 }));
    expect(html).toContain('flex items-start gap-2 overflow-x-auto');
    expect(html.match(/group w-56 shrink-0/g)).toHaveLength(2);
    expect(html.match(/max-w-full/g)).toHaveLength(2);
    expect(html).toContain('scheme-dark');
    expect(html).not.toContain('max-h-64');
    expect(html).not.toContain('overflow-y-auto');
  });

  it('reuses the main page dark theme tokens and flat panels', () => {
    const html = renderToStaticMarkup(React.createElement(AssignmentHistory, { history, idWeek: 5 }));
    expect(html).toContain('bg-page');
    expect(html).toContain('border-line bg-surface');
    expect(html).toContain('text-brand-light');
    expect(html).toContain('text-ink');
    expect(html).toContain('focus-visible:outline-brand-light');
    expect(html).not.toContain('slate-');
    expect(html).not.toContain('rounded-');
    expect(html).not.toContain('bg-white');
  });

  it('preserves the explicit empty-history message without adding entries', () => {
    const html = renderToStaticMarkup(React.createElement(AssignmentHistory, { history: [], idWeek: 5 }));
    expect(html).toContain('Sin antecedentes registrados');
    expect(html).not.toContain('<summary');
  });
});
