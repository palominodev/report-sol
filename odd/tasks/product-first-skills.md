# Product-first project skills
Objective: provide the requested project-local decision guides, reusing existing skills. Branch: docs/product-first-skills.
Delivery: ask-on-risk, one coherent documentation unit forecast ~340 authored lines; checks: skill validator, links, routing scenarios, pnpm lint.

## Specs
S1. "Vamos a crear un skill para:" "DRY" "KISS" "YAGNI" "REVERSIBILIDAD" "GRASG" "CUPID" "ARQUITECTURA HEXAGONAL" "UX" "UX-UI-PROMAX". Correction: "si, GRASP" "SI, UX UI PRO MAX".
S2. "solo cuando sea estrictametne necesario, vas a hablar en modo técnico."
S3. "La gran parte del tiempo tenemos que tomas decisiones de Producto y Usabilidad. La mayor cantidad de decisiones serán en base al producto y a la UX"
S4. "utiliza subagetnes"
S5. "Workspace already contains complete .opencode/skills/ui-ux-pro-max (SKILL.md, data catalogs, scripts/search.py, validation/tests). No need external paths; upstream attribution/license can be verified via github result if useful. Registry also lists principle-dry/kiss/yagni/reversibility/cupid/grasp, but they are user-scope entries outside project and explicitly barred from reading."
Integration choice: reuse hexagonal and Pro Max unchanged; create six principle skills and UX locally. No application, database or dependency changes. Checks validate structure and scenario guidance, not proven improvements in model behavior.

## Tasks
T1 | S1,S4,S5 | delegated read-only exploration | done | commit: pending closing unit; existing project skills confirmed, external personal skill paths not read.
T2 | S1,S2,S3,S4 | delegated writer, explicit user request for subagents; six independent principle guides | done | commit: closing documentation unit; six skills read back and structurally checked, all requested principle distinctions covered.
T3 | S1,S2,S3,S5 | inline UX skill and discovery integration | done | commit: closing documentation unit; UX and AGENTS written; hexagonal/Pro Max unchanged; 45-entry registry refreshed, project skills override cached personal entries without external reads.
T4 | S1-S5 | inline checks and closure | in_progress | commit: pending; structural/link checks and nine-skill coverage passed, lint passed; native assessment and documentation commit pending.

## Log
L1. Original request verbatim:
> Antes de continuar, vamos a crear algunas skills para este proyecto.
> Vamos a crear un skill para:
> - DRY
> - KISS
> - YAGNI
> - REVERSIBILIDAD
> - GRASG
> - CUPID
> - ARQUITECTURA HEXAGONAL
> - UX
> - UX-UI-PROMAX
> ---
> Ahora, la idea es la siguiente, solo cuando sea estrictametne necesario, vas a hablar en modo técnico.
> La gran parte del tiempo tenemos que tomas decisiones de Producto y Usabilidad. La mayor cantidad de decisiones serán en base al producto y a la UX
> ---
> utiliza subagetnes
L2. Confirmation verbatim: "si, GRASP\nSI, UX UI PRO MAX".
L3. Local Pro Max complete per S5 and exploration. Six personal principle entries are not project-local and were not read. Keep existing architecture and Pro Max skill content unchanged.
L4. Passive instruction/documentation authoring: no meaningful deterministic RED for model judgment; use structural validation and explicit scenario readback, without claiming behavioral benchmark results. No application code is modified.
L5. pnpm lint passed (exit 0); existing StatsCharts.tsx unused eslint-disable warning remains. quick_validate.py UX check unavailable (exit 1): ModuleNotFoundError: No module named 'yaml'. No dependency installed and no retry; worker notified. Use dependency-free structural checks, explicitly not a replacement claim for full YAML validation. git diff --check passed.
L6. Parent read all six worker outputs. Scenario readback: similar forms do not force DRY; KISS/YAGNI retain protections; irreversible deletion needs informed authorization; GRASP covers all nine patterns without forcing classes; CUPID covers five contextual properties; UX regeneration example preserves eligibility rules. These are instruction checks, not model behavior benchmarks.
L7. Dependency-free structural check exit 0: seven frontmatter/section sets, all local references, existing hexagonal/Pro Max entrypoints, AGENTS coverage for nine requested skills, and project registry rows passed. Existing application behavior and datasets are unchanged; no application tests/build needed for passive docs.
