import { describe, it, expect } from 'vitest';
import { TWO_PERSON_PART_TYPES } from '@/domain/entities/presentation/enums';

/**
 * Pins arity consistency between the two authoritative sources:
 * 1. `TWO_PERSON_PART_TYPES` (domain enums) — drives `requiresCompanero()` and
 *    the matcher's role ordering.
 * 2. `PART_TYPE_POLICIES` (engine matrix, PR2) — drives the hard eligibility
 *    rules. Adding a tipo to one side without the other must fail here.
 *
 * PR1 scope: only the enums half lives here (GREEN since 1.4). The matrix
 * half lives in the PR2 lineage, where `policies.ts` exists — a deferred
 * `await import()` still fails project-wide typechecking (TS2307) while the
 * module is absent, and every branch must typecheck for Vercel previews.
 */

describe('Part-type arity consistency', () => {
  it('que_diria is a one-person part (absent from TWO_PERSON_PART_TYPES)', () => {
    expect((TWO_PERSON_PART_TYPES as readonly string[]).includes('que_diria')).toBe(false);
  });

  it('escenificacion is a two-person part (present in TWO_PERSON_PART_TYPES)', () => {
    expect(TWO_PERSON_PART_TYPES.includes('escenificacion')).toBe(true);
  });

  // The PART_TYPE_POLICIES arity assertions (bidirectional) live in the PR2
  // lineage next to `policies.ts` — see file header.
});