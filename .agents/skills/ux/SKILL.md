---
name: ux
description: "Trigger: UX, product decisions, usability, user journeys, flows, friction, forms, navigation, empty states, errores, usabilidad, decisiones de producto. Define the user outcome before interface or implementation choices."
---

## Activation Contract
Use for product choices, user flows and usability reviews in report-sol. Skip for a purely mechanical change with no user-facing decision. Load visual design or architecture guidance only when the task needs it.

## Hard Rules
- Start with the person, their task and the outcome; do not start with components or database design.
- Discuss recommendations in everyday Spanish matching the user's language. Use technical language only when strictly necessary to explain a material constraint, risk or cost; explain its user impact first.
- Separate observed behavior from assumptions. Do not invent research, user roles, permissions, assignment rules or success metrics.
- Preserve accessibility, user control and safety when simplifying. Fewer clicks are not automatically a better experience.
- Ask one focused question only when an unresolved product choice materially changes the outcome; otherwise use available evidence and recommend a proportionate solution.

## Decision Gates
| Situation | Action |
| --- | --- |
| User goal or consequence is unclear | Clarify before designing the flow. |
| Visual polish competes with task completion | Prioritize clarity and completion; then visual consistency. |
| Action overwrites or removes work | Explain scope, preservation and recovery; load reversibility. |
| Only styling is changing | Reuse the existing visual language and Pro Max skill; avoid inventing a new product flow. |

## Execution Steps
1. State the user task, current friction and desired outcome in one short paragraph.
2. Trace the happy path plus relevant loading, empty, error, success and recovery states. Reuse existing evidence; do not run a broad audit for a narrow request.
3. Compare only meaningful alternatives by comprehension, effort, error risk and accessibility. Recommend one with its tradeoff.
4. Before implementation, describe observable acceptance criteria. Afterwards verify the relevant journey; label untested assumptions honestly.
5. Example: for “regenerar asignaciones”, explain what will change and what is preserved before proposing buttons. Do not silently change eligibility rules to reduce warnings.

## Output Contract
Return a concise recommendation, why it helps the person, its tradeoff and any real decision needed. Keep implementation details out unless necessary or explicitly requested. Do not force a report template onto ordinary conversation.

## References
- [Project instructions](../../../AGENTS.md)
- [Reversibility](../principle-reversibility/SKILL.md)
- [Visual design and implementation](../../../.opencode/skills/ui-ux-pro-max/SKILL.md)
- [Interface audit](../web-design-guidelines/SKILL.md)
