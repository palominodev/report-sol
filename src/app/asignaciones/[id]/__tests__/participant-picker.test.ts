import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import ParticipantPicker, { ParticipantOptions } from '../ParticipantPicker';
import { nextActiveIndex } from '../listbox-navigation';

const users = [
  { id_usuario: 2, nombre: 'Beto', apellido: 'Gómez', participationLabel: 'Nunca participó' },
  { id_usuario: 1, nombre: 'Ana', apellido: 'Pérez', participationLabel: 'Hace 3 meses y 12 días que no participa' },
  { id_usuario: 3, nombre: 'Carlos', apellido: 'Díaz', participationLabel: 'Hace 16 días que no participa' },
];

function renderOptions(overrides: Partial<React.ComponentProps<typeof ParticipantOptions>> = {}) {
  return renderToStaticMarkup(
    React.createElement(ParticipantOptions, {
      listId: 'list-1',
      users,
      selectedId: '',
      currentId: null,
      activeIndex: -1,
      onSelect: vi.fn(),
      onActivate: vi.fn(),
      ...overrides,
    }),
  );
}

describe('ParticipantOptions', () => {
  it('shows every person as its own option with name, wait time and position', () => {
    const html = renderOptions();
    expect(html.match(/role="option"/g)).toHaveLength(3);
    for (const text of ['Beto Gómez', 'Ana Pérez', 'Carlos Díaz', 'Nunca participó', 'Hace 3 meses y 12 días que no participa', 'Hace 16 días que no participa']) {
      expect(html).toContain(text);
    }
    expect(html.indexOf('Beto Gómez')).toBeLessThan(html.indexOf('Ana Pérez'));
    expect(html.indexOf('Ana Pérez')).toBeLessThan(html.indexOf('Carlos Díaz'));
    expect(html).toMatch(/>1<\/span>/);
    expect(html).toMatch(/>3<\/span>/);
  });

  it('is a listbox whose options expose their selected state and a stable id', () => {
    const html = renderOptions({ selectedId: '1' });
    expect(html).toContain('role="listbox"');
    expect(html).toContain('id="list-1"');
    expect(html).toContain('id="list-1-option-0"');
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
    expect(html.match(/aria-selected="false"/g)).toHaveLength(2);
  });

  it('marks the person already assigned without relying on color alone', () => {
    const html = renderOptions({ currentId: 3 });
    expect(html.match(/Asignado/g)).toHaveLength(1);
    expect(html.indexOf('Asignado')).toBeGreaterThan(html.indexOf('Carlos Díaz'));
  });

  it('highlights only the keyboard-active option', () => {
    const html = renderOptions({ activeIndex: 1 });
    expect(html.match(/data-active="true"/g)).toHaveLength(1);
    expect(html.indexOf('data-active="true"')).toBeGreaterThan(html.indexOf('Beto Gómez'));
    expect(html.indexOf('data-active="true"')).toBeLessThan(html.indexOf('Carlos Díaz'));
  });

  it('keeps the project flat design: no radius, shadow, slate or white backgrounds', () => {
    const html = renderOptions({ selectedId: '1', currentId: 3, activeIndex: 0 });
    expect(html).toContain('border-line');
    expect(html).toContain('text-ink');
    expect(html).toContain('text-ink-muted');
    for (const banned of ['rounded-', 'shadow-', 'slate-', 'bg-white']) expect(html).not.toContain(banned);
  });
});

describe('ParticipantPicker (closed)', () => {
  const render = (value: string) =>
    renderToStaticMarkup(
      React.createElement(ParticipantPicker, {
        id: 'picker-1',
        users,
        value,
        currentId: null,
        disabled: false,
        onChange: vi.fn(),
      }),
    );

  it('is an accessible combobox and does not render the list until opened', () => {
    const html = render('');
    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-haspopup="listbox"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('role="listbox"');
  });

  it('shows a placeholder when nobody is chosen', () => {
    expect(render('')).toContain('Seleccionar');
  });

  it('shows the chosen person with their wait time', () => {
    const html = render('1');
    expect(html).toContain('Ana Pérez');
    expect(html).toContain('Hace 3 meses y 12 días que no participa');
    expect(html).not.toContain('Seleccionar');
  });

  it('keeps focus visible and a comfortable touch target', () => {
    const html = render('');
    expect(html).toContain('min-h-11');
    expect(html).toContain('focus-visible:ring-2');
  });
});

describe('nextActiveIndex', () => {
  it('moves down and up within bounds', () => {
    expect(nextActiveIndex('ArrowDown', 0, 3)).toBe(1);
    expect(nextActiveIndex('ArrowDown', 2, 3)).toBe(2);
    expect(nextActiveIndex('ArrowUp', 2, 3)).toBe(1);
    expect(nextActiveIndex('ArrowUp', 0, 3)).toBe(0);
  });

  it('starts at the first option going down and at the last going up when nothing is active', () => {
    expect(nextActiveIndex('ArrowDown', -1, 3)).toBe(0);
    expect(nextActiveIndex('ArrowUp', -1, 3)).toBe(2);
  });

  it('jumps to the ends with Home and End', () => {
    expect(nextActiveIndex('Home', 2, 3)).toBe(0);
    expect(nextActiveIndex('End', 0, 3)).toBe(2);
  });

  it('returns -1 when there are no options', () => {
    for (const key of ['ArrowDown', 'ArrowUp', 'Home', 'End'] as const) {
      expect(nextActiveIndex(key, -1, 0)).toBe(-1);
    }
  });
});
