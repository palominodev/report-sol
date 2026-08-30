import { MatchingRule, ScoringContext } from '../types';

/** Penalty for a candidate repeating a rol they held within 6 months (softer than pair repeat). */
export const ROL_ROTATION_PENALTY = 500;
export const ROL_ROTATION_RULE_ID = 'rol_rotation';

/**
 * Soft rule (R6): deprioritizes a candidate who would hold the same rol
 * (presentador/companero) they already held within the last 6 months. A
 * penalty alone — never a hard block — so an unavoidable repeat still fills
 * the slot while fresh candidates rank higher.
 */
export class RoleRotationRule implements MatchingRule {
  readonly id = ROL_ROTATION_RULE_ID;

  score(ctx: ScoringContext): number {
    return ctx.history.rolHistoryWithin6mo(ctx.person.id_usuario).has(ctx.role)
      ? -ROL_ROTATION_PENALTY
      : 0;
  }
}