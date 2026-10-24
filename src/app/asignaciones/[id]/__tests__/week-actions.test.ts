import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
    React.createElement('a', props, children),
}));

import WeekActions from '../WeekActions';

function render(hasAssignments: boolean, isConfirmed = false, missingLabels: string[] = []) {
  return renderToStaticMarkup(React.createElement(WeekActions, {
    idWeek: 1, weekLabel: '19-25 de octubre', hasAssignments, isConfirmed, nullSalaParts: 0, missingLabels,
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

  it('replaces the confirm button with a clear state on confirmed weeks', () => {
    const html = render(true, true);
    expect(html).not.toContain('Confirmar semana');
    expect(html).toContain('Semana confirmada. Lista para imprimir.');
    expect(html).toContain('text-emerald-300');
    expect(html).toContain('Ver programa imprimible');
    expect(html).toContain('Descartar generación');
  });

  it('enables confirm and shows no blocking explanation when nothing is missing', () => {
    const html = render(true);
    expect(html).toContain('Confirmar semana');
    expect(html).not.toMatch(/<button[^>]*disabled=""[^>]*>\s*Confirmar semana/);
    expect(html).not.toContain('aria-describedby="confirm-blocked-reason"');
    expect(html).not.toContain('Faltan');
  });

  it('blocks confirm and explains why when there are no assignments', () => {
    const html = render(false);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>\s*Confirmar semana/);
    expect(html).toContain('aria-describedby="confirm-blocked-reason"');
    expect(html).toContain('id="confirm-blocked-reason"');
    expect(html).toContain('Primero generá las asignaciones.');
  });

  it('blocks confirm and lists readable missing slots linked via aria-describedby', () => {
    const html = render(true, false, ['Falta presentador en «Haga revisitas»', 'Falta compañero en «Haga revisitas»']);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>\s*Confirmar semana/);
    expect(html).toContain('aria-describedby="confirm-blocked-reason"');
    expect(html).toContain('Faltan 2 lugares:');
    expect(html).toContain('Falta presentador en «Haga revisitas»');
    expect(html).not.toContain('y 0 más');
  });

  it('caps the explanation at 5 labels and summarises the rest', () => {
    const labels = Array.from({ length: 8 }, (_, i) => `Falta presentador en «Parte ${i + 1}»`);
    const html = render(true, false, labels);
    expect(html).toContain('Faltan 8 lugares:');
    expect(html).toContain('Parte 5');
    expect(html).not.toContain('Parte 6');
    expect(html).toContain('y 3 más');
  });

  it('uses singular wording for a single missing slot', () => {
    const html = render(true, false, ['Falta presentador en «Discurso»']);
    expect(html).toContain('Falta 1 lugar:');
  });
});

describe('week detail page header', () => {
  const source = readFileSync(join(__dirname, '..', 'page.tsx'), 'utf8');

  it('gives the back link a 44px touch height', () => {
    expect(source).toMatch(/href="\/asignaciones" className="[^"]*inline-flex[^"]*min-h-11[^"]*items-center/);
  });

  it('shows progress and passes only primitives to WeekActions', () => {
    expect(source).toContain('lugares asignados');
    expect(source).toContain('Todavía no hay asignaciones: generá la semana para empezar.');
    expect(source).toContain('missingLabels={missingLabels}');
  });
});
