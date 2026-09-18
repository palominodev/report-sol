import { MatchingRule, ScoringContext } from '../types';

/** Penalty subtracted from a candidate who jointly repeats sala + companion. */
export const REPEAT_SALA_PARTNER_PENALTY = 1000;
export const NO_REPEAT_SALA_PARTNER_26W_RULE_ID = 'no_repeat_sala_partner_26w';

/**
 * Soft rule: deprioritizes a candidate who would repeat, within the 26-week
 * history window, the JOINT combination of a sala and an acompañante — i.e.
 * the candidate already participated in this same room together with an
 * already-committed companion, regardless of tipo or rol on either side.
 *
 * Score-only by design (no isAllowed): it never blocks generation and never
 * affects manual overrides. Sala alone or companion alone repeats score 0;
 * parts with unknown sala (NULL) are skipped entirely.
 */
export class SalaRotationRule implements MatchingRule {
  readonly id = NO_REPEAT_SALA_PARTNER_26W_RULE_ID;

  score(ctx: ScoringContext): number {
    const { sala } = ctx.part;
    if (sala === null) return 0;

    // Mirror NoRepeatPairWithin6MonthsRule's companion discovery: the
    // already-committed others on this part (empty for single-person tipos).
    const chosen = ctx.weekState.byPart.get(ctx.part.id_part) ?? [];
    const companions = chosen.filter((id) => id !== ctx.person.id_usuario);
    if (companions.length === 0) return 0;

    const combos = ctx.history.salaPartnerCombos(ctx.person.id_usuario);
    const repeats = companions.some((companionId) => combos.has(`${sala}#${companionId}`));
    return repeats ? -REPEAT_SALA_PARTNER_PENALTY : 0;
  }
}
