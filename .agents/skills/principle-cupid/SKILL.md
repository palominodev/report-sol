---
name: principle-cupid
description: "Trigger: CUPID, composability, predictable behavior, idiomatic design, domain alignment. Assess design properties that make changes easier to understand and use."
---

## Activation Contract
- Activate when comparing designs or investigating why a component is difficult to combine, understand, or change.
- Skip unrelated edits without a design tradeoff; treat properties as guidance, not a rigid checklist or universal skill bundle.

## Hard Rules
- Connect each concern to a user outcome or a concrete cost of changing behavior.
- Seek Composable parts with clear boundaries that work together without hidden dependencies.
- Apply Unix philosophy: give each part a focused purpose and make collaboration straightforward; do not require processes or microservices.
- Seek Predictable behavior through consistent contracts, visible effects, and understandable failures.
- Prefer Idiomatic conventions of the existing language and project unless a demonstrated need justifies deviation.
- Keep design Domain-based: express the product's real concepts and language, not arbitrary technical categories.

## Decision Gates
| Situation | Action |
| --- | --- |
| A property addresses an observed usability or maintenance problem | Propose the smallest evidenced improvement. |
| Improving one property harms another or adds ceremony | Compare practical consequences; state the tradeoff rather than chasing a score. |
| Design already meets the current need clearly | Retain it instead of redesigning for theoretical purity. |

## Execution Steps
1. Describe the user's task and the concrete design friction in plain language.
2. Inspect relevant boundaries, effects, conventions, and domain terms; select useful properties.
3. Compare bounded options and preserve established behavior; verify composition and failures when implementing.
- Positive: expose a predictable report-export contract using existing product terminology and conventions.
- Negative: do not split a coherent report flow into services just to claim Unix philosophy compliance.

## Output Contract
- Return the product benefit, selected properties, tradeoffs, affected files, checks, and remaining risks. Add technical details only where they are necessary to choose.

## References
- [Project constraints](../../../AGENTS.md) and [hexagonal guidance](../clean-ddd-hexagonal/SKILL.md) — preserve local conventions and domain boundaries.
