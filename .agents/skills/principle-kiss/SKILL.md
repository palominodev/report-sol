---
name: principle-kiss
description: "Trigger: KISS, unnecessary complexity, confusing flow, simpler alternatives. Choose the clearest complete solution for the current user need."
---

## Activation Contract
- Activate when competing approaches add steps, concepts, dependencies, or maintenance burden.
- Skip unrelated edits and decisions without a complexity tradeoff; do not load every principle automatically.

## Hard Rules
- Judge simplicity by task completion, clarity, and reliable operation, not fewer lines or screens.
- Keep required safety, accessibility, validation, and recovery; simple must not mean simplistic.
- Prefer existing understandable conventions; avoid both speculative frameworks and compressed cleverness.

## Decision Gates
| Situation | Action |
| --- | --- |
| Two approaches satisfy the same confirmed needs | Prefer the one users and maintainers can understand with fewer assumptions. |
| Shorter flow hides consequences or recovery | Keep the necessary explanation or step. |
| Requirements are unclear | Clarify the user outcome before removing complexity. |

## Execution Steps
1. Describe the user's job, success condition, and essential protections in everyday language.
2. Compare the smallest complete options against errors, cognitive effort, and ongoing upkeep.
3. Remove unnecessary concepts without changing approved behavior or exceeding the task scope.
4. Check the main path, failure path, and accessibility when implementation follows; report tradeoffs honestly.
- Positive: use a clear single report filter when it meets the confirmed selection need.
- Negative: do not replace labeled controls with cryptic icons just to shorten the screen.

## Output Contract
- Return the recommended option, practical benefit, protections retained, affected files, checks, and residual risks. Use technical detail only when it changes the decision.

## References
- [Project constraints](../../../AGENTS.md) — follow local conventions and scope.
- [Product-first intent](../../../odd/tasks/product-first-skills.md) — prioritize usability over technical neatness.
