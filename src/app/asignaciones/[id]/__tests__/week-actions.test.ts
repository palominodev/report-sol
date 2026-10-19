import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
    React.createElement('a', props, children),
}));

import WeekActions from '../WeekActions';

function render(hasAssignments: boolean, isConfirmed = false) {
  return renderToStaticMarkup(React.createElement(WeekActions, {
    idWeek: 1, weekLabel: '19-25 de octubre', hasAssignments, isConfirmed, nullSalaParts: 0,
  }));
}

describe('weekly actions', () => {
  it('groups generation, discard, print and confirm below the title with a separate status area', () => {
    const html = render(true);
    expect(html).toContain('aria-label="Acciones de la semana"');
    expect(html).toContain('Regenerar');
    expect(html).toContain('Descartar generación');
    expect(html).toContain('Ver programa imprimible');
    expect(html).toContain('Confirmar semana');
    expect(html).toContain('role="status"');
  });

  it('provides an in-page deletion dialog with explicit scope, warning and cancellation', () => {
    const html = render(true);
    expect(html).toContain('<dialog');
    expect(html).toContain('aria-labelledby="discard-title"');
    expect(html).toContain('aria-describedby="discard-description discard-warning"');
    expect(html).toContain('19-25 de octubre');
    expect(html).toContain('manuales y confirmadas');
    expect(html).toContain('ambas salas');
    expect(html).toContain('Las partes y las salas se conservarán');
    expect(html).toContain('Esta acción no se puede deshacer');
    expect(html).toContain('Cancelar');
    expect(html).toContain('Eliminar asignaciones');
  });

  it('offers generation but no discard when the week has no assignments', () => {
    const html = render(false);
    expect(html).toContain('Generar');
    expect(html).not.toContain('Descartar generación');
  });

  it('preserves the confirmed-week generation restriction while allowing discard', () => {
    const html = render(true, true);
    expect(html).not.toContain('Regenerar');
    expect(html).toContain('Descartar generación');
  });
});
