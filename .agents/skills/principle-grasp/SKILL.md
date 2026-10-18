---
name: principle-grasp
description: "Trigger: GRASP, responsibility assignment, misplaced logic, coupling, cohesion. Assign responsibilities to protect understandable and consistent user outcomes."
---

## Activation Contract
- Activate when deciding where behavior belongs or when tangled responsibilities obstruct a requested change.
- Skip cosmetic edits without ownership decisions; select relevant patterns, not all skills or mandatory classes.

## Hard Rules
- Begin with the affected user outcome; explain patterns technically only when necessary for a decision.
- Respect existing hexagonal boundaries; apply these responsibility heuristics to functions and modules as well as objects.
- Use Information Expert: place behavior with the knowledge needed; Creator: assign creation to a containing, recording, closely using, or initializing collaborator.
- Use Controller: receive system operations through a suitable non-UI coordinator; High Cohesion: keep responsibilities focused; Low Coupling: limit unnecessary dependencies.
- Use Polymorphism: dispatch genuinely varying behavior through a common contract; Pure Fabrication: introduce a non-domain collaborator when it improves cohesion or coupling.
- Use Indirection: mediate dependencies when beneficial; Protected Variations: isolate evidenced instability behind stable boundaries, not speculative layers.

## Decision Gates
| Situation | Action |
| --- | --- |
| Existing owner has the knowledge and a coherent responsibility | Keep behavior there within layer boundaries. |
| Responsibility would mix unrelated concerns or leak infrastructure | Evaluate a focused collaborator or boundary. |
| Proposed abstraction has no demonstrated variation or coupling benefit | Keep the simpler assignment. |

## Execution Steps
1. Identify the user-visible rule, necessary knowledge, and existing owners.
2. Compare ownership options using only relevant patterns and current architectural constraints.
3. Choose the smallest coherent assignment; verify behavior and boundaries when implementing.
- Positive: keep report eligibility with the domain knowledge and coordinate persistence through a use case.
- Negative: do not introduce a class for every pattern or put database access in a domain entity because it knows report rules.

## Output Contract
- Return the user benefit, chosen owner, relevant reasoning, affected files, checks, and unresolved boundary risks.

## References
- [Project constraints](../../../AGENTS.md) and [hexagonal guidance](../clean-ddd-hexagonal/SKILL.md) — consult for responsibility boundaries.
