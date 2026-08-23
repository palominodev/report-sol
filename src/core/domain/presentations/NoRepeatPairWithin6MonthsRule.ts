import { MatchingRule, ScoringContext } from './types';

/** Penalty subtracted from a candidate who repeats a recent pair. */
export const REPEAT_PAIR_PENALTY = 1000;
export const NO_REPEAT_PAIR_6MO_RULE_ID = 'no_repeat_pair_6mo';

/**
 * Soft rule: deprioritizes a candidate who would pair with an already-chosen
 * person on the same part within the last 6 months. The pair is checked in
 * both directions because either party's history may record it.
 */
export class NoRepeatPairWithin6MonthsRule implements MatchingRule {
  readonly id = NO_REPEAT_PAIR_6MO_RULE_ID;

  score(ctx: ScoringContext): number {
    const chosen = ctx.weekState.byPart.get(ctx.part.id_part) ?? [];
    const companions = chosen.filter((id) => id !== ctx.person.id_usuario);
    if (companions.length === 0) return 0;

    const repeats = companions.some((companionId) => this.isRecentPair(ctx, companionId));
    return repeats ? -REPEAT_PAIR_PENALTY : 0;
  }

  private isRecentPair(ctx: ScoringContext, otherId: number): boolean {
    const candidatePairs = ctx.history.pairedWithWithin6mo(ctx.person.id_usuario);
    const otherPairs = ctx.history.pairedWithWithin6mo(otherId);
    return candidatePairs.has(otherId) || otherPairs.has(ctx.person.id_usuario);
  }
}