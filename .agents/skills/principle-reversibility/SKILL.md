---
name: principle-reversibility
description: "Trigger: reversibility, undo, rollback, deletion, irreversible actions. Evaluate user control and actual recovery before recommending consequential changes."
---

## Activation Contract
- Activate when a decision changes stored information, creates external effects, or promises undo or recovery.
- Skip harmless presentation choices without lasting consequences; do not invoke every principle automatically.

## Hard Rules
- Describe what users can lose, who is affected, and what can actually be restored.
- Distinguish dismissing or undoing a UI action from restoring persisted data and reversing external effects.
- Never promise recovery without evidence; a confirmation dialog is not a backup or authorization to destroy data.

## Decision Gates
| Situation | Action |
| --- | --- |
| Effect is demonstrably reversible | Prefer a clear recovery path and communicate its limits. |
| Action is irreversible or recovery is unverified | Pause execution; explain consequences and obtain explicit authorization before proceeding. |
| Data can be restored but external effects cannot | Gate those effects separately; do not label the whole operation reversible. |

## Execution Steps
1. Map the user's intent, affected information, external effects, and failure consequences.
2. Verify the available recovery mechanism, retention window, permissions, and recovery limitations.
3. Prefer a proportionate reversible alternative where it meets the need; gate irreversible execution with informed consent.
4. When authorized implementation follows, check recovery and failure paths without destructive experiments on real data.
- Positive: offer recoverable archiving when it meets the user's removal need and restoration is verified.
- Negative: do not call deletion reversible because a toast has an Undo button if records cannot be restored.

## Output Contract
- Return the user consequence, reversible alternative, recovery evidence and limits, authorization needed, affected files, and safe checks. Include technical detail only to explain material risk.

## References
- [Project constraints](../../../AGENTS.md) — respect operational scope and safety.
- [Product-first intent](../../../odd/tasks/product-first-skills.md) — preserve user control.
