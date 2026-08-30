import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateMeetingWeekUseCase } from '../use-cases/presentation/CreateMeetingWeekUseCase';
import { GenerateWeekAssignmentsUseCase } from '../use-cases/presentation/GenerateWeekAssignmentsUseCase';
import { GetWeekAssignmentsUseCase } from '../use-cases/presentation/GetWeekAssignmentsUseCase';
import { OverrideAssignmentUseCase } from '../use-cases/presentation/OverrideAssignmentUseCase';
import { ConfirmWeekAssignmentsUseCase } from '../use-cases/presentation/ConfirmWeekAssignmentsUseCase';
import { IAssignmentsRepository } from '@/core/domain/presentations/IAssignmentsRepository';
import { IUserRepository } from '@/core/domain/repositories/IUserRepository';
import { RuleRegistry } from '@/core/domain/presentations/RuleRegistry';
import { NoRepeatPairWithin6MonthsRule } from '@/core/domain/presentations/NoRepeatPairWithin6MonthsRule';
import { NotFoundError } from '@/core/domain/errors/NotFoundError';
import { ConflictError } from '@/core/domain/errors/ConflictError';
import { UnprocessableError } from '@/core/domain/errors/UnprocessableError';
import { ValidationError } from '@/core/domain/errors/ValidationError';
import { MeetingWeek } from '@/domain/entities/presentation/MeetingWeek';
import { PresentationPart } from '@/domain/entities/presentation/PresentationPart';
import { Assignment } from '@/domain/entities/presentation/Assignment';
import { AssignablePerson } from '@/domain/entities/presentation/AssignablePerson';
import { SourceRef } from '@/domain/entities/presentation/SourceRef';
import { Genero } from '@/domain/entities/presentation/enums';

const today = new Date().toISOString();
const SIX_MONTHS_AGO = new Date();
SIX_MONTHS_AGO.setMonth(SIX_MONTHS_AGO.getMonth() - 6);

/** Mirrors pre-2.8 use-case wiring: R5 only, as the tests were written. */
function defaultRegistry(): RuleRegistry {
  const registry = new RuleRegistry();
  registry.register(new NoRepeatPairWithin6MonthsRule());
  return registry;
}

function person(id: number, genero: Genero | null = 'masculino'): AssignablePerson {
  return new AssignablePerson(id, `Nombre${id}`, `Apellido${id}`, genero, null, null);
}

function part(id: number, idWeek: number, orden: number, requiresCompanero = true): PresentationPart {
  const tipo = requiresCompanero ? 'empiece_conversaciones' : 'lectura_biblia';
  return new PresentationPart(id, idWeek, orden, tipo, 'TESOROS_DE_LA_BIBLIA', 4, null, new SourceRef('lmd', 1));
}

function week(id: number, estado = 'no_generada' as const): MeetingWeek {
  return new MeetingWeek(id, 'TEST 1-7 de enero', 'TEST-1', '2026-01-01', '2026-01-07', estado);
}

function assignment(
  id: number,
  idPart: number,
  idWeek: number,
  idUsuario: number,
  rol: 'presentador' | 'companero',
  estado: 'draft' | 'confirmed' | 'manual'
): Assignment {
  return new Assignment(id, idPart, idWeek, idUsuario, rol, estado);
}

describe('Presentation Assignments — Use Cases (Slice 2)', () => {
  let assignRepo: IAssignmentsRepository;
  let userRepo: IUserRepository;

  beforeEach(() => {
    assignRepo = {
      upsertWeek: vi.fn().mockResolvedValue(1),
      findWeekById: vi.fn().mockResolvedValue(null),
      listWeeks: vi.fn().mockResolvedValue([]),
      findPartsByWeek: vi.fn().mockResolvedValue([]),
      findPartById: vi.fn().mockResolvedValue(null),
      findAssignmentsByWeek: vi.fn().mockResolvedValue([]),
      findRecentAssignments: vi.fn().mockResolvedValue([]),
      upsertAssignment: vi.fn(),
      deleteNonManualByWeek: vi.fn().mockResolvedValue(0),
      confirmWeek: vi.fn().mockResolvedValue(0),
    } as IAssignmentsRepository;

    userRepo = {
      findAllAssignable: vi.fn().mockResolvedValue([]),
    } as unknown as IUserRepository;
  });

  describe('CreateMeetingWeekUseCase', () => {
    function uc() { return new CreateMeetingWeekUseCase(assignRepo); }

    it('creates a week and its parts, returning the generated id', async () => {
      const result = await uc().execute({
        semana: 'TEST 1-7 de enero',
        issue: 'TEST-1',
        fecha_inicio: '2026-01-01',
        fecha_fin: '2026-01-07',
        parts: [
          { orden: 1, tipo: 'lectura_biblia', seccion: 'TESOROS_DE_LA_BIBLIA', duracion_min: 4, escenario: null, fuente: { fuente: 'bib', leccion: 3 } },
        ],
      });

      expect(result).toEqual({ id_week: 1 });
      expect(assignRepo.upsertWeek).toHaveBeenCalledTimes(1);
      const [w, parts] = (assignRepo.upsertWeek as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(w.semana).toBe('TEST 1-7 de enero');
      expect(parts).toHaveLength(1);
      expect(parts[0].tipo).toBe('lectura_biblia');
    });

    it('rejects an invalid date with ValidationError', async () => {
      await expect(
        uc().execute({
          semana: 'bad',
          issue: 'X',
          fecha_inicio: 'not-a-date',
          fecha_fin: '2026-01-07',
          parts: [],
        })
      ).rejects.toThrow(ValidationError);
      expect(assignRepo.upsertWeek).not.toHaveBeenCalled();
    });
  });

  describe('GenerateWeekAssignmentsUseCase', () => {
    const build = (parts: PresentationPart[], persons: AssignablePerson[], manual: Assignment[] = []) => {
      (assignRepo.findWeekById as ReturnType<typeof vi.fn>).mockResolvedValue(week(1));
      (assignRepo.findPartsByWeek as ReturnType<typeof vi.fn>).mockResolvedValue(parts);
      (assignRepo.findAssignmentsByWeek as ReturnType<typeof vi.fn>).mockResolvedValue(manual);
      (assignRepo.findRecentAssignments as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (userRepo.findAllAssignable as ReturnType<typeof vi.fn>).mockResolvedValue(persons);
      return new GenerateWeekAssignmentsUseCase(userRepo, assignRepo, defaultRegistry());
    };

    it('404 when the week does not exist', async () => {
      (assignRepo.findWeekById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const uc = new GenerateWeekAssignmentsUseCase(userRepo, assignRepo, defaultRegistry());
      await expect(uc.execute({ id_week: 999 })).rejects.toThrow(NotFoundError);
    });

    it('422 when there are no eligible (non NULL genero) persons', async () => {
      const uc = build(
        [part(10, 1, 1, true)],
        [person(1, 'masculino'), person(2, null), person(3, null)]
      );
      // Only one eligible candidate but the test re-groups below; force all-ineligible.
      (userRepo.findAllAssignable as ReturnType<typeof vi.fn>).mockResolvedValue([
        person(1, null),
        person(2, null),
      ]);
      await expect(uc.execute({ id_week: 1 })).rejects.toThrow(UnprocessableError);
    });

    it('generates draft assignments deterministically and wipes only non-manual rows', async () => {
      const parts = [part(10, 1, 1, true), part(11, 1, 2, false)];
      const persons = [person(1), person(2), person(3), person(4)];
      // One pre-existing manual row on part 10 (companion) that must survive.
      const manual = [assignment(50, 10, 1, 4, 'companero', 'manual')];
      const uc = build(parts, persons, manual);
      (assignRepo.findAssignmentsByWeek as ReturnType<typeof vi.fn>).mockResolvedValue(manual);
      (assignRepo.upsertAssignment as ReturnType<typeof vi.fn>).mockImplementation((a) =>
        Promise.resolve(new Assignment(100 + a.id_part, a.id_part, a.id_week, a.id_usuario, a.rol, a.estado))
      );

      const first = await uc.execute({ id_week: 1 });
      const second = await uc.execute({ id_week: 1 });

      // Deterministic: identical output across runs.
      expect(first.assignments).toEqual(second.assignments);

      // deleteNonManualByWeek called so manual rows are not removed.
      expect(assignRepo.deleteNonManualByWeek).toHaveBeenCalledWith(1);

      // The manual slot is never overwritten (no upsert targeting part 10 companion).
      const upserts = (assignRepo.upsertAssignment as unknown as ReturnType<typeof vi.fn>).mock.calls.map(
        (c) => c[0]
      );
      expect(upserts.some((u) => u.id_part === 10 && u.rol === 'companero')).toBe(false);

      // The manually-booked person (4) is never double-booked elsewhere in the week.
      expect(upserts.some((u) => u.id_usuario === 4)).toBe(false);

      // Generated assignments are drafts.
      expect(first.assignments.every((a) => a.estado === 'draft')).toBe(true);
    });

    it('surfaces unassigned slots when there are not enough candidates', async () => {
      const parts = [part(10, 1, 1, true), part(11, 1, 2, true)];
      const persons = [person(1), person(2)]; // 4 slots, only 2 people
      const uc = build(parts, persons);
      const result = await uc.execute({ id_week: 1 });
      expect(result.unassigned.length).toBeGreaterThan(0);
    });
  });

  describe('GetWeekAssignmentsUseCase', () => {
    function uc() { return new GetWeekAssignmentsUseCase(assignRepo); }

    it('returns week, parts, and assignments', async () => {
      (assignRepo.findWeekById as ReturnType<typeof vi.fn>).mockResolvedValue(week(1));
      (assignRepo.findPartsByWeek as ReturnType<typeof vi.fn>).mockResolvedValue([part(10, 1, 1)]);
      (assignRepo.findAssignmentsByWeek as ReturnType<typeof vi.fn>).mockResolvedValue([
        assignment(1, 10, 1, 2, 'presentador', 'draft'),
      ]);

      const result = await uc().execute({ id_week: 1 });
      expect(result.week.id_week).toBe(1);
      expect(result.parts).toHaveLength(1);
      expect(result.assignments).toHaveLength(1);
    });

    it('404 when the week does not exist', async () => {
      (assignRepo.findWeekById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      await expect(uc().execute({ id_week: 999 })).rejects.toThrow(NotFoundError);
    });
  });

  describe('OverrideAssignmentUseCase', () => {
    function uc() { return new OverrideAssignmentUseCase(assignRepo); }

    it('applies a manual override and returns an empty warning array when no pair rule is hit', async () => {
      (assignRepo.findPartById as ReturnType<typeof vi.fn>).mockResolvedValue(part(10, 1, 1, true));
      (assignRepo.findAssignmentsByWeek as ReturnType<typeof vi.fn>).mockResolvedValue([
        assignment(1, 10, 1, 2, 'presentador', 'draft'),
        assignment(2, 10, 1, 3, 'companero', 'draft'),
      ]);
      (assignRepo.findRecentAssignments as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (assignRepo.upsertAssignment as ReturnType<typeof vi.fn>).mockResolvedValue(
        assignment(9, 10, 1, 3, 'companero', 'manual')
      );

      const result = await uc().execute({ id_part: 10, rol: 'companero', id_usuario: 3 });
      expect(result.warnings).toEqual([]);
      expect(result.assignment.estado).toBe('manual');
    });

    it('404 when the part does not exist', async () => {
      (assignRepo.findPartById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      await expect(uc().execute({ id_part: 999, rol: 'presentador', id_usuario: 1 })).rejects.toThrow(
        NotFoundError
      );
    });

    it('blocks the same-week double-book hard invariant with ValidationError', async () => {
      (assignRepo.findPartById as ReturnType<typeof vi.fn>).mockResolvedValue(part(11, 1, 2, true));
      (assignRepo.findAssignmentsByWeek as ReturnType<typeof vi.fn>).mockResolvedValue([
        assignment(1, 10, 1, 3, 'presentador', 'draft'), // user 3 already booked on part 10 this week
        assignment(2, 10, 1, 4, 'companero', 'draft'),
      ]);
      await expect(
        uc().execute({ id_part: 11, rol: 'companero', id_usuario: 3 })
      ).rejects.toThrow(ValidationError);
    });

    it('blocks presenter == companion on the same part with ValidationError', async () => {
      (assignRepo.findPartById as ReturnType<typeof vi.fn>).mockResolvedValue(part(10, 1, 1, true));
      (assignRepo.findAssignmentsByWeek as ReturnType<typeof vi.fn>).mockResolvedValue([
        assignment(1, 10, 1, 2, 'presentador', 'draft'), // user 2 is the presenter of part 10
      ]);
      await expect(
        uc().execute({ id_part: 10, rol: 'companero', id_usuario: 2 })
      ).rejects.toThrow(ValidationError);
    });

    it('allows a manual override that violates the pair rule but surfaces a warning', async () => {
      const thisPart = part(10, 1, 1, true);
      (assignRepo.findPartById as ReturnType<typeof vi.fn>).mockResolvedValue(thisPart);
      (assignRepo.findAssignmentsByWeek as ReturnType<typeof vi.fn>).mockResolvedValue([
        assignment(1, 10, 1, 2, 'presentador', 'draft'), // user 2 is the presenter
      ]);
      // History: users 2 and 3 were paired recently on another part.
      (assignRepo.findRecentAssignments as ReturnType<typeof vi.fn>).mockResolvedValue([
        assignment(70, 60, 5, 2, 'presentador', 'confirmed'),
        assignment(71, 60, 5, 3, 'companero', 'confirmed'),
      ]);
      (assignRepo.upsertAssignment as ReturnType<typeof vi.fn>).mockResolvedValue(
        assignment(8, 10, 1, 3, 'companero', 'manual')
      );

      const result = await uc().execute({ id_part: 10, rol: 'companero', id_usuario: 3 });
      expect(result.assignment.estado).toBe('manual');
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('REPEAT_PAIR_6M');
    });
  });

  describe('ConfirmWeekAssignmentsUseCase', () => {
    function uc() { return new ConfirmWeekAssignmentsUseCase(assignRepo); }

    it('confirms a week with all slots filled', async () => {
      (assignRepo.findWeekById as ReturnType<typeof vi.fn>).mockResolvedValue(week(1));
      (assignRepo.findPartsByWeek as ReturnType<typeof vi.fn>).mockResolvedValue([
        part(10, 1, 1, true),
        part(11, 1, 2, false),
      ]);
      (assignRepo.findAssignmentsByWeek as ReturnType<typeof vi.fn>).mockResolvedValue([
        assignment(1, 10, 1, 2, 'presentador', 'draft'),
        assignment(2, 10, 1, 3, 'companero', 'draft'),
        assignment(3, 11, 1, 4, 'presentador', 'draft'),
      ]);
      (assignRepo.confirmWeek as ReturnType<typeof vi.fn>).mockResolvedValue(3);

      const result = await uc().execute({ id_week: 1 });
      expect(result.confirmed).toBe(3);
      expect(assignRepo.confirmWeek).toHaveBeenCalledWith(1);
    });

    it('404 when the week does not exist', async () => {
      (assignRepo.findWeekById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      await expect(uc().execute({ id_week: 999 })).rejects.toThrow(NotFoundError);
    });

    it('409 Conflict when unassigned slots remain', async () => {
      (assignRepo.findWeekById as ReturnType<typeof vi.fn>).mockResolvedValue(week(1));
      (assignRepo.findPartsByWeek as ReturnType<typeof vi.fn>).mockResolvedValue([
        part(10, 1, 1, true),
        part(11, 1, 2, false),
      ]);
      (assignRepo.findAssignmentsByWeek as ReturnType<typeof vi.fn>).mockResolvedValue([
        assignment(1, 10, 1, 2, 'presentador', 'draft'), // companion slot on 10 missing
      ]);
      await expect(uc().execute({ id_week: 1 })).rejects.toThrow(ConflictError);
      expect(assignRepo.confirmWeek).not.toHaveBeenCalled();
    });
  });
});