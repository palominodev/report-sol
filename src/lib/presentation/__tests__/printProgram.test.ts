import { describe, it, expect } from 'vitest';
import { buildPrintSections, formatFuente, UserNameResolver } from '../printProgram';
import { salaLabel } from '../status';
import { PresentationPart } from '@/domain/entities/presentation/PresentationPart';
import { Assignment } from '@/domain/entities/presentation/Assignment';
import { SourceRef } from '@/domain/entities/presentation/SourceRef';
import { PresentationType, Sala } from '@/domain/entities/presentation/enums';

function part(
  id: number,
  orden: number,
  seccion: 'TESOROS_DE_LA_BIBLIA' | 'SEAMOS_MEJORES_MAESTROS',
  tipo: PresentationType = 'lectura_biblia',
  sala: Sala | null = null
): PresentationPart {
  return new PresentationPart(id, 1, orden, tipo, seccion, 4, null, new SourceRef('lmd', 5), sala);
}

function assignment(id: number, idPart: number, idUsuario: number, rol: 'presentador' | 'companero', estado: 'draft' | 'confirmed' | 'manual'): Assignment {
  return new Assignment(id, idPart, 1, idUsuario, rol, estado);
}

const usersById = new Map<number, string>([
  [10, 'Ana Pérez'],
  [20, 'Luis Gómez'],
  [30, 'Clara Ruiz'],
]);

const resolve: UserNameResolver = (idUsuario) => usersById.get(idUsuario) ?? `usuario ${idUsuario}`;

describe('formatFuente', () => {
  it('renders fuente, lesson and point', () => {
    expect(formatFuente(new SourceRef('lmd', 12, '3'))).toBe('lmd lección 12 punto 3');
  });

  it('renders only lesson when point missing', () => {
    expect(formatFuente(new SourceRef('th', 4))).toBe('th lección 4');
  });

  it('renders plain fuente when no lesson', () => {
    expect(formatFuente(new SourceRef('bib'))).toBe('bib');
  });
});

describe('buildPrintSections', () => {
  it('renders only confirmed and manual assignments, ordered by part orden', () => {
    const sections = buildPrintSections(
      [
        part(1, 1, 'TESOROS_DE_LA_BIBLIA'),
        part(2, 2, 'SEAMOS_MEJORES_MAESTROS', 'empiece_conversaciones'),
      ],
      [
        assignment(1, 1, 10, 'presentador', 'confirmed'),
        assignment(2, 1, 99, 'companero', 'draft'), // draft excluded
        assignment(3, 2, 20, 'presentador', 'manual'),
        assignment(4, 2, 30, 'companero', 'manual'),
      ],
      resolve
    );

    expect(sections.length).toBe(2);
    expect(sections[0].seccion).toBe('TESOROS_DE_LA_BIBLIA');
    expect(sections[1].seccion).toBe('SEAMOS_MEJORES_MAESTROS');

    const tesorosPart = sections[0].parts[0];
    expect(tesorosPart.presentador?.nombre).toBe('Ana Pérez');
    // draft companion is not in a printable state → rendered as unassigned (null)
    expect(tesorosPart.companero).toBeNull();

    expect(tesorosPart.fuente).toBe('lmd lección 5');
    expect(tesorosPart.duracionMin).toBe(4);
  });

  it('omits sections where every part has no confirmed/manual assignment', () => {
    const sections = buildPrintSections(
      [part(1, 1, 'TESOROS_DE_LA_BIBLIA'), part(2, 2, 'SEAMOS_MEJORES_MAESTROS')],
      [assignment(1, 1, 10, 'presentador', 'confirmed')],
      resolve
    );
    expect(sections.length).toBe(1);
    expect(sections[0].seccion).toBe('TESOROS_DE_LA_BIBLIA');
  });

  it('renders both roles for a companion part', () => {
    const sections = buildPrintSections(
      [part(5, 1, 'SEAMOS_MEJORES_MAESTROS', 'empiece_conversaciones')],
      [
        assignment(1, 5, 20, 'presentador', 'manual'),
        assignment(2, 5, 30, 'companero', 'manual'),
      ],
      resolve
    );
    expect(sections[0].parts[0].presentador?.nombre).toBe('Luis Gómez');
    expect(sections[0].parts[0].companero?.nombre).toBe('Clara Ruiz');
  });

  it('carries sala per part and passes NULL through as null (badge-per-part display)', () => {
    const sections = buildPrintSections(
      [
        part(1, 1, 'TESOROS_DE_LA_BIBLIA', 'lectura_biblia', 'A'),
        part(2, 2, 'SEAMOS_MEJORES_MAESTROS', 'empiece_conversaciones', 'B'),
        part(3, 3, 'SEAMOS_MEJORES_MAESTROS', 'haga_revisitas', null),
      ],
      [
        assignment(1, 1, 10, 'presentador', 'confirmed'),
        assignment(2, 2, 20, 'presentador', 'confirmed'),
        assignment(3, 3, 30, 'presentador', 'confirmed'),
      ],
      resolve
    );
    // orden interleaves rooms; sala travels on each part without regrouping
    expect(sections[0].parts[0].sala).toBe('A');
    expect(sections[1].parts[0].sala).toBe('B');
    // graceful rendering: NULL-sala part renders without a room label
    expect(sections[1].parts[1].sala).toBeNull();
  });
});

describe('per-room print (caller-side sala filter)', () => {
  // Mirrored fixture: A originals + B clones sharing each orden, all printable.
  const mirrored = [
    part(1, 1, 'TESOROS_DE_LA_BIBLIA', 'lectura_biblia', 'A'),
    part(2, 1, 'TESOROS_DE_LA_BIBLIA', 'lectura_biblia', 'B'),
    part(3, 2, 'SEAMOS_MEJORES_MAESTROS', 'empiece_conversaciones', 'A'),
    part(4, 2, 'SEAMOS_MEJORES_MAESTROS', 'empiece_conversaciones', 'B'),
  ];
  const mirroredAssignments = [
    assignment(1, 1, 10, 'presentador', 'confirmed'),
    assignment(2, 2, 20, 'presentador', 'confirmed'),
    assignment(3, 3, 30, 'presentador', 'confirmed'),
    assignment(4, 3, 10, 'companero', 'confirmed'),
    assignment(5, 4, 20, 'companero', 'confirmed'),
  ];

  it('a sala-B filtered input prints only the B clones, each keeping its own room', () => {
    // Exactly the filter imprimir/page.tsx applies before calling.
    const room: Sala = 'B';
    const visible = mirrored.filter((p) => p.sala === room);
    const sections = buildPrintSections(visible, mirroredAssignments, resolve);

    const printed = sections.flatMap((s) => s.parts);
    expect(printed.map((p) => p.id_part)).toEqual([2, 4]);
    expect(printed.every((p) => p.sala === 'B')).toBe(true);
    // The room header source resolves for the filtered room (page renders it).
    expect(salaLabel(room)).toBe('Sala B (Auxiliar)');
  });

  it('combined view is unchanged: unfiltered input keeps both rooms interleaved by orden', () => {
    const sections = buildPrintSections(mirrored, mirroredAssignments, resolve);

    const printed = sections.flatMap((s) => s.parts);
    expect(printed.map((p) => p.id_part)).toEqual([1, 2, 3, 4]);
    expect(printed.map((p) => p.sala)).toEqual(['A', 'B', 'A', 'B']);
  });
});