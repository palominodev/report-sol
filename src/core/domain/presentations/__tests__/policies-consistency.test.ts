import { describe, it, expect } from 'vitest';
import {
  PRESENTATION_TYPES,
  PresentationType,
  TWO_PERSON_PART_TYPES,
} from '@/domain/entities/presentation/enums';

/**
 * Pins arity consistency between the two authoritative sources:
 * 1. `TWO_PERSON_PART_TYPES` (domain enums) — drives `requiresCompanero()` and
 *    the matcher's role ordering.
 * 2. `PART_TYPE_POLICIES` (engine matrix, PR2) — drives the hard eligibility
 *    rules. Adding a tipo to one side without the other must fail here.
 *
 * PR1 scope: the enums half is GREEN (new tipos land with 1.4). The matrix
 * half is EXPECTED RED until `policies.ts` lands in PR2 2.1 ("matrix absent");
 * the import is deferred so the enums half keeps running. Tracked exception:
 * excluded from the PR1 done-gate, must be green in the PR2 gate.
 */

describe('Part-type arity consistency', () => {
  it('que_diria is a one-person part (absent from TWO_PERSON_PART_TYPES)', () => {
    expect((TWO_PERSON_PART_TYPES as readonly string[]).includes('que_diria')).toBe(false);
  });

  it('escenificacion is a two-person part (present in TWO_PERSON_PART_TYPES)', () => {
    expect(TWO_PERSON_PART_TYPES.includes('escenificacion')).toBe(true);
  });

  it('PART_TYPE_POLICIES arity agrees with TWO_PERSON_PART_TYPES (bidirectional)', async () => {
    // Deferred so the enums half above passes while policies.ts is absent (PR1).
    const { PART_TYPE_POLICIES } = await import('@/core/domain/presentations/policies');
    const twoPerson = new Set<string>(TWO_PERSON_PART_TYPES);

    // Every presentation tipo carries the arity implied by the enums.
    for (const tipo of PRESENTATION_TYPES) {
      const expected: 1 | 2 = twoPerson.has(tipo) ? 2 : 1;
      expect(PART_TYPE_POLICIES[tipo].arity, `arity mismatch for ${tipo}`).toBe(expected);
    }

    // Every two-person tipo is registered as arity 2 in the matrix.
    for (const tipo of TWO_PERSON_PART_TYPES) {
      expect(PART_TYPE_POLICIES[tipo as PresentationType].arity).toBe(2);
    }

    // And every one-person tipo is registered as arity 1.
    for (const tipo of PRESENTATION_TYPES) {
      if (twoPerson.has(tipo)) continue;
      expect(PART_TYPE_POLICIES[tipo].arity).toBe(1);
    }
  });
});