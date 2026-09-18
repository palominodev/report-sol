import { MatchingRule, ScoringContext } from '../types';
import { PART_TYPE_POLICIES } from '../policies';

export const PAIR_POLICY_RULE_ID = 'pair_policy';

/**
 * Hard rule (R2) evaluated at companion time against the already-committed
 * presenter, per the pair policy in `PART_TYPE_POLICIES[tipo].pair`:
 * - `mixed_iff_same_familia` (empiece_conversaciones, explique_sus_creencias): a
 *   masculino+femenino pair is allowed only when both share the same non-null
 *   familia_id (NULL familia = "not family" = blocked).
 * - `never_mixed` (haga_revisitas, haga_discipulos): a mixed-gender pair is
 *   never allowed, regardless of familia.
 * - Same-gender pairs are always allowed. One-person parts are a no-op.
 */
export class PairPolicyRule implements MatchingRule {
  readonly id = PAIR_POLICY_RULE_ID;

  isAllowed(ctx: ScoringContext): boolean {
    const policy = PART_TYPE_POLICIES[ctx.part.tipo];
    if (policy.pair === 'none') return true;

    const committed = ctx.weekState.byPart.get(ctx.part.id_part) ?? [];
    const presenterId = committed.find((id) => id !== ctx.person.id_usuario);
    if (presenterId === undefined) return true; // presenter slot / single-person part

    const other = ctx.personsById.get(presenterId);
    if (!other) return true; // uncommitted or unresolvable co-person: nothing to police

    if (ctx.person.genero === other.genero) return true; // same-gender pair unaffected
    if (policy.pair === 'never_mixed') return false;

    const ourFamilia = ctx.person.familia_id;
    return ourFamilia !== null && ourFamilia === other.familia_id; // mixed_iff_same_familia
  }

  score(_ctx: ScoringContext): number {
    return 0;
  }
}