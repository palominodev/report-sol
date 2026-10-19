import { describe, expect, it } from 'vitest';
import { participationLabel, sortByParticipation } from '../participationOrder';
import type { AssignmentHistoryEntry } from '@/core/domain/presentations/AssignmentHistory';

const entry = (id_usuario: number, fecha_inicio: string, fecha_fin: string, id = 1): AssignmentHistoryEntry => ({
  id_asignacion: id,
  id_usuario,
  id_week: id,
  fecha_inicio,
  fecha_fin,
});

describe('participationLabel', () => {
  it('describes months and days since the last participation', () => {
    expect(participationLabel('2026-07-01', '2026-10-13')).toBe('Hace 3 meses y 12 días que no participa');
  });

  it('uses singular and omits the zero unit', () => {
    expect(participationLabel('2026-09-12', '2026-10-13')).toBe('Hace 1 mes y 1 día que no participa');
    expect(participationLabel('2026-08-13', '2026-10-13')).toBe('Hace 2 meses que no participa');
    expect(participationLabel('2026-10-01', '2026-10-13')).toBe('Hace 12 días que no participa');
    expect(participationLabel('2026-10-12', '2026-10-13')).toBe('Hace 1 día que no participa');
  });

  it('does not overflow when the last day of a longer month has no equivalent', () => {
    expect(participationLabel('2026-01-31', '2026-03-01')).toBe('Hace 1 mes y 1 día que no participa');
  });

  it('says so when the person never participated', () => {
    expect(participationLabel(null, '2026-10-13')).toBe('Nunca participó');
  });

  it('handles a same-day or future last participation without negative numbers', () => {
    expect(participationLabel('2026-10-13', '2026-10-13')).toBe('Participó esta semana');
    expect(participationLabel('2026-10-20', '2026-10-13')).toBe('Participó esta semana');
  });
});

describe('sortByParticipation', () => {
  const people = [
    { id_usuario: 1, nombre: 'Ana', apellido: 'Pérez', assignmentHistory: [entry(1, '2026-06-22', '2026-06-28')] },
    { id_usuario: 2, nombre: 'Beto', apellido: 'Gómez', assignmentHistory: [] },
    { id_usuario: 3, nombre: 'Carlos', apellido: 'Díaz', assignmentHistory: [entry(3, '2026-09-21', '2026-09-27')] },
    { id_usuario: 4, nombre: 'Dora', apellido: 'Ruiz' },
  ];

  it('puts people who never participated first, then the longest wait to the shortest', () => {
    const sorted = sortByParticipation(people, '2026-10-13');
    expect(sorted.map((p) => p.id_usuario)).toEqual([2, 4, 1, 3]);
  });

  it('attaches the label shown in the selector', () => {
    const sorted = sortByParticipation(people, '2026-10-13');
    expect(sorted[0].participationLabel).toBe('Nunca participó');
    expect(sorted[1].participationLabel).toBe('Nunca participó');
    expect(sorted[2].participationLabel).toBe('Hace 3 meses y 15 días que no participa');
    expect(sorted[3].participationLabel).toBe('Hace 16 días que no participa');
  });

  it('uses the most recent entry regardless of the order of the history', () => {
    const [only] = sortByParticipation(
      [{
        id_usuario: 1,
        nombre: 'Ana',
        apellido: 'Pérez',
        assignmentHistory: [entry(1, '2026-03-02', '2026-03-08', 1), entry(1, '2026-09-21', '2026-09-27', 2), entry(1, '2026-05-04', '2026-05-10', 3)],
      }],
      '2026-10-13',
    );
    expect(only.participationLabel).toBe('Hace 16 días que no participa');
  });

  it('breaks ties alphabetically by apellido then nombre', () => {
    const tied = [
      { id_usuario: 1, nombre: 'Luis', apellido: 'Zapata' },
      { id_usuario: 2, nombre: 'Ana', apellido: 'Álvarez' },
      { id_usuario: 3, nombre: 'Berta', apellido: 'Álvarez' },
    ];
    expect(sortByParticipation(tied, '2026-10-13').map((p) => p.id_usuario)).toEqual([2, 3, 1]);
  });

  it('does not mutate the input array', () => {
    const input = [...people];
    sortByParticipation(input, '2026-10-13');
    expect(input.map((p) => p.id_usuario)).toEqual([1, 2, 3, 4]);
  });
});
