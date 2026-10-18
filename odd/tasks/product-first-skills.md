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
T1 | S1,S4,S5 | delegated read-only exploration | done | commit: c0c943c; existing project skills confirmed, external personal skill paths not read.
T2 | S1,S2,S3,S4 | delegated writer, explicit user request for subagents; six independent principle guides | done | commit: c0c943c; six skills read back and structurally checked, all requested principle distinctions covered.
T3 | S1,S2,S3,S5 | inline UX skill and discovery integration | done | commit: c0c943c; UX and AGENTS written; hexagonal/Pro Max unchanged; 45-entry ignored registry refreshed locally without external reads.
T4 | S1-S5 | inline checks and closure | done | commit: c0c943c plus closing tracking commit; structural/link checks, nine-skill coverage, lint and staged whitespace check passed. YAML validator unavailable (PyYAML missing); no model behavior benchmark claimed.

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
L8. Commit c0c943c contains 319 authored additions, no application code. First native assessment could not assess undeclared untracked paths; after committing the complete candidate, committed-range assessment against 0c981f60aada6a94472f2e895bf310abb801694f returned medium, reviewDue=false (under_budget), self-verification required, independentVerifier=false. No native review started. Closing tracking commit records this evidence; nothing pushed.
L9. Risk: none. Added scoped instructions and passive docs; existing hexagonal/Pro Max content and application contracts unchanged. Validation limitations above remain explicit, not claims of model effectiveness.
