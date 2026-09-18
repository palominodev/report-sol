import { describe, it, expect } from 'vitest';
import { getMatchingRules, getSetPartSalaUseCase } from '../di';
import { SetPartSalaUseCase } from '@/core/application/use-cases/presentation/SetPartSalaUseCase';
import { TursoAssignmentsRepository } from '@/infrastructure/persistence/turso-assignments.repository';
import { NO_REPEAT_PAIR_6MO_RULE_ID } from '@/core/domain/presentations/NoRepeatPairWithin6MonthsRule';
import { PRESENTER_ELIGIBILITY_RULE_ID } from '@/core/domain/presentations/rules/PresenterEligibilityRule';
import { PAIR_POLICY_RULE_ID } from '@/core/domain/presentations/rules/PairPolicyRule';
import { NO_REPEAT_TIPO_RULE_ID } from '@/core/domain/presentations/rules/NoRepeatTipoRule';
import { ROL_ROTATION_RULE_ID } from '@/core/domain/presentations/rules/RoleRotationRule';
import { NO_REPEAT_SALA_PARTNER_26W_RULE_ID } from '@/core/domain/presentations/rules/SalaRotationRule';

describe('getMatchingRules (di.ts seam)', () => {
  it.each([...PARTICIPATING_IDS])('registers %s with the engine registry', (id) => {
    expect(ids().has(id)).toBe(true);
  });

  it('registers exactly the six production rules (add/remove = one factory line)', () => {
    expect(ids()).toEqual(PARTICIPATING_IDS);
  });
});

const PARTICIPATING_IDS = new Set([
  NO_REPEAT_PAIR_6MO_RULE_ID,
  PRESENTER_ELIGIBILITY_RULE_ID,
  PAIR_POLICY_RULE_ID,
  NO_REPEAT_TIPO_RULE_ID,
  ROL_ROTATION_RULE_ID,
  NO_REPEAT_SALA_PARTNER_26W_RULE_ID,
]);

describe('getSetPartSalaUseCase (di.ts seam)', () => {
  it('returns a SetPartSalaUseCase wired with the Turso assignments repository', () => {
    const uc = getSetPartSalaUseCase();

    expect(uc).toBeInstanceOf(SetPartSalaUseCase);
    // The private port is compile-time-only privacy; assert the adapter class
    // so a factory rewired to the wrong repository fails here, not in prod.
    expect((uc as unknown as { assignmentsRepository: unknown }).assignmentsRepository).toBeInstanceOf(
      TursoAssignmentsRepository
    );
  });
});

function ids(): Set<string> {
  return new Set(getMatchingRules().all().map((rule) => rule.id));
}