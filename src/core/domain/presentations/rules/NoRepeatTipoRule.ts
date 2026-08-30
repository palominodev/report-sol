import { MatchingRule, ScoringContext } from '../types';

export const NO_REPEAT_TIPO_RULE_ID = 'no_repeat_tipo';

/**
 * Hard rule (R4): a person must not be assigned the same part tipo they held
 * within the last 6 months. The history view is already scoped to the window
 * by the repository query, so anything present in `tipoHistoryWithin6mo` is
 * recent; anything absent (held 7+ months ago, or never) is allowed.
 */
export class NoRepeatTipoRule implements MatchingRule {
  readonly id = NO_REPEAT_TIPO_RULE_ID;

  isAllowed(ctx: ScoringContext): boolean {
    return !ctx.history.tipoHistoryWithin6mo(ctx.person.id_usuario).has(ctx.part.tipo);
  }

  score(_ctx: ScoringContext): number {
    return 0;
  }
}