import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => React.createElement('a', props, children),
}));

import WeekActions from '../WeekActions';
import OverrideControl from '../OverrideControl';
import SalaControl from '../SalaControl';
import SalaPolicyModal from '../SalaPolicyModal';

const controls = [
  ['weekly actions and discard dialog', React.createElement(WeekActions, { idWeek: 1, weekLabel: 'Test week', hasAssignments: true, isConfirmed: false, nullSalaParts: 1 })],
  ['person selector', React.createElement(OverrideControl, { idWeek: 1, idPart: 1, rol: 'presentador', currentIdUsuario: null, users: [] })],
  ['room selector', React.createElement(SalaControl, { idPart: 1, current: 'A' })],
  ['room policy dialog', React.createElement(SalaPolicyModal, { nullSalaParts: 1, isSubmitting: false, error: 'Test error', onCancel: vi.fn(), onConfirm: vi.fn() })],
] as const;

describe('weekly page theme', () => {
  it.each(controls)('keeps %s consistent with the home design', (_name, element) => {
    const html = renderToStaticMarkup(element);
    expect(html).toContain('border-line');
    expect(html).toContain('text-ink');
    expect(html).not.toContain('slate-');
    expect(html).not.toContain('rounded-');
    expect(html).not.toContain('bg-white');
    expect(html).not.toContain('shadow-');
  });

  it('keeps policy selection, visible errors and pending protection', () => {
    const html = renderToStaticMarkup(React.createElement(SalaPolicyModal, {
      nullSalaParts: 2, isSubmitting: true, error: 'Test error', onCancel: vi.fn(), onConfirm: vi.fn(),
    }));
    expect(html).toContain('role="dialog"');
    expect(html).toContain('role="radiogroup"');
    expect(html).toMatch(/<input[^>]*checked=""[^>]*value="adopt_and_clone"/);
    expect(html).toContain('value="rebuild"');
    expect(html).toContain('role="alert"');
    expect(html).toContain('text-danger-light');
    expect(html).toContain('Test error');
    expect(html.match(/disabled=""/g)).toHaveLength(4);
  });
});
