---
name: principle-dry
description: "Trigger: DRY, duplicated rules, divergent behavior, repeated knowledge. Decide whether sharing a rule protects a consistent user experience."
---

## Activation Contract
- Activate when repeated knowledge risks inconsistent outcomes or costly corrections.
- Skip isolated resemblance, unrelated changes, and cosmetic repetition without shared meaning; do not activate every principle by default.

## Hard Rules
- Start with the user outcome and the rule that must stay consistent, not matching lines.
- Distinguish the same knowledge from similar-looking implementations that may evolve independently.
- Preserve domain boundaries and existing behavior; do not build a shared abstraction merely to reduce duplication counts.

## Decision Gates
| Situation | Action |
| --- | --- |
| One confirmed rule has multiple sources that can drift | Propose one authoritative definition at the appropriate boundary. |
| Similar screens express different policies | Keep them independent; reconsider only with evidence of shared knowledge. |
| Ownership or meaning is uncertain | Ask a focused question before coupling the decisions. |

## Execution Steps
1. Identify who experiences the inconsistency and describe its practical cost.
2. Compare meanings, owners, and reasons to change; inspect only relevant local paths.
3. Choose the smallest consolidation that preserves needed differences, or explicitly retain duplication.
4. Verify shared outcomes and legitimate differences with focused checks when implementation follows.
- Positive: reuse one confirmed report-date eligibility rule across entry and export.
- Negative: do not merge two similarly styled forms whose validation policies differ.

## Output Contract
- Return the user benefit, share-or-separate decision, evidence, affected files, checks, and remaining uncertainty. Explain implementation details only when needed to choose safely.

## References
- [Project constraints](../../../AGENTS.md) — preserve scope and architectural boundaries.
- [Product-first intent](../../../odd/tasks/product-first-skills.md) — use product and usability priorities.
