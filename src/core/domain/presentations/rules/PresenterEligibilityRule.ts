import { MatchingRule, ScoringContext } from '../types';
import { PART_TYPE_POLICIES } from '../policies';

export const PRESENTER_ELIGIBILITY_RULE_ID = 'presenter_eligibility';

/**
 * Hard rule (R1 cargo + R3 gender, collapsed into one generic gate over the
 * `PART_TYPE_POLICIES` matrix):
 * - que_diria: cargo must be anciano or siervo (NULL cargo = publicador, blocked).
 * - lectura_biblia and discurso: masculino only, no cargo restriction.
 * The gate is role-agnostic: it applies to whoever candidatizes for the tipo
 * (one-person parts only ever evaluate the presenter).
 */
export class PresenterEligibilityRule implements MatchingRule {
  readonly id = PRESENTER_ELIGIBILITY_RULE_ID;

  isAllowed(ctx: ScoringContext): boolean {
    const policy = PART_TYPE_POLICIES[ctx.part.tipo];
    if (policy.presenterGender === 'masculino_only' && ctx.person.genero !== 'masculino') {
      return false;
    }
    if (
      policy.presenterCargo === 'only_anciano_siervo' &&
      ctx.person.cargo !== 'anciano' &&
      ctx.person.cargo !== 'siervo'
    ) {
      return false;
    }
    return true;
  }

  score(): number {
    return 0;
  }
}