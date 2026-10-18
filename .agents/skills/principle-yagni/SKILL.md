---
name: principle-yagni
description: "Trigger: YAGNI, speculative features, future-proofing, scope creep. Separate current user needs from unsupported future capabilities."
---

## Activation Contract
- Activate when a proposal adds optional capability or flexibility for an unconfirmed future need.
- Skip required current behavior and unrelated maintenance; do not apply all principles to every task.

## Hard Rules
- Anchor scope in the requested user outcome and acceptance criteria, not imagined growth.
- Preserve required safety, security, accessibility, data integrity, and recovery even when rarely exercised.
- Do not delete existing features or change commitments under the banner of YAGNI; seek separate authorization.

## Decision Gates
| Situation | Action |
| --- | --- |
| Capability satisfies a confirmed current requirement | Include the smallest complete version. |
| Capability only anticipates hypothetical demand | Defer it and record what evidence would justify reconsideration. |
| Proposed omission threatens a required protection | Retain the protection; simplify its implementation if appropriate. |

## Execution Steps
1. State the user problem and distinguish required outcomes from optional ideas.
2. Ask what present evidence requires each addition; inspect relevant constraints before recommending omission.
3. Propose a bounded solution and explicit deferrals without inventing roadmap promises.
4. Verify current acceptance criteria and retained protections when implementation follows; surface uncertain obligations.
- Positive: deliver the requested report export without adding an unrequested plugin marketplace.
- Negative: do not omit keyboard access because no current complaint mentions it, or remove an existing export format as cleanup.

## Output Contract
- Return what is included, what is deferred and why, reconsideration evidence, affected files, checks, and open risks. Explain in product terms unless technical constraints affect the choice.

## References
- [Project constraints](../../../AGENTS.md) — preserve authorized boundaries and existing behavior.
- [Product-first intent](../../../odd/tasks/product-first-skills.md) — keep work aligned with current outcomes.
